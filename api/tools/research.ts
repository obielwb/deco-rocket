import { createTool } from "@decocms/runtime/tools";
import { z } from "zod";
import { complete } from "../clients/anthropic.ts";
import { keywordVolume } from "../clients/dataforseo.ts";
import { googleShopping, googleTrends } from "../clients/serpapi.ts";
import { searchCatalog, storeName } from "../clients/vtex.ts";
import { rankOpportunities, scoreOpportunity } from "../lib/scoring.ts";
import { buildSourcePreviews } from "../lib/source-previews.ts";
import type {
	CatalogGap,
	CreativeType,
	KeywordVolume,
	MarketSnapshot,
	ProductBrief,
	Report,
	ResearchSource,
	TrendSignal,
} from "../lib/types.ts";
import {
	CreativeTypeSchema,
	ReportSchema,
	ResearchSourceSchema,
} from "../lib/types.ts";
import type { Env } from "../types/env.ts";
import { generateConcept, generateCopy } from "./concept.ts";
import { buildCreativePrompt, generateConceptImage } from "./creative.ts";
import { sourceSupplier } from "./sourcing.ts";

export const REPORT_RESOURCE_URI = "ui://deco-rocket/report";

const DEFAULT_SOURCES: ResearchSource[] = [
	"google_trends",
	"google_shopping",
	"keyword_volume",
	"social_viral",
	"catalog",
];
const DEFAULT_CREATIVES: CreativeType[] = ["product_hero"];
const RESEARCH_PROGRESS_TOTAL = 5;

export const ResearchRunInputSchema = z.object({
	seed: z
		.string()
		.describe("Seed niche or product term (e.g. 'garrafa termica')"),
	extraSeeds: z.array(z.string()).optional().describe("Additional seed terms"),
	maxCandidates: z.number().min(1).max(20).optional().describe("Default 8"),
	topN: z
		.number()
		.min(1)
		.max(10)
		.optional()
		.describe("Concepts to fully develop. Default 3"),
	profile: z
		.string()
		.optional()
		.describe("Research profile, e.g. teen/social media"),
	audience: z.string().optional().describe("Target audience constraints"),
	sources: z.array(ResearchSourceSchema).min(1).optional(),
	collections: z.array(z.string()).optional(),
	creativeTypes: z.array(CreativeTypeSchema).min(1).max(3).optional(),
	storeStyle: z
		.string()
		.optional()
		.describe("Store visual language for generated creatives"),
	referenceImages: z
		.array(z.string().url())
		.max(3)
		.optional()
		.describe("Store images used only as visual style references"),
});

export type ResearchRunInput = z.infer<typeof ResearchRunInputSchema>;

export type ResearchProgressStep =
	| "expanding"
	| "signals"
	| "ranking"
	| "briefs"
	| "summary"
	| "completed";

export interface ResearchProgressState {
	step: ResearchProgressStep;
	label: string;
	detail: string;
	completed: number;
	total: number;
	percent: number;
}

export type ResearchProgressReporter =
	| ((progress: ResearchProgressState) => void | Promise<void>)
	| undefined;

async function reportProgress(
	notify: ResearchProgressReporter,
	progress: Omit<ResearchProgressState, "percent"> & { percent?: number },
): Promise<void> {
	if (!notify) return;
	await notify({
		...progress,
		percent:
			progress.percent ??
			Math.max(
				0,
				Math.min(
					100,
					Math.round((progress.completed / Math.max(progress.total, 1)) * 100),
				),
			),
	});
}

/**
 * Swallow a provider failure so one bad source cannot sink the run — but never
 * silently. Every degraded source is logged and recorded, so a report always
 * says which providers actually answered.
 */
function resilient<T>(
	provider: string,
	context: string,
	degraded: Set<string>,
): (error: unknown) => T | null {
	return (error: unknown) => {
		const message = error instanceof Error ? error.message : String(error);
		console.warn(`[research] ${provider} falhou em "${context}": ${message}`);
		degraded.add(provider);
		return null;
	};
}

/** Expand seed terms with breakout related queries from Google Trends. */
async function expandCandidates(
	env: unknown,
	seeds: string[],
	max: number,
	degraded: Set<string>,
): Promise<{ candidates: string[]; seedTrends: Map<string, TrendSignal> }> {
	const seedTrends = new Map<string, TrendSignal>();
	const candidates = new Set(seeds.map((seed) => seed.trim()).filter(Boolean));

	const trends = await Promise.all(
		seeds.map((seed) =>
			googleTrends(env, seed).catch(
				resilient<TrendSignal>("serpapi_trends", seed, degraded),
			),
		),
	);
	for (const trend of trends) {
		if (!trend) continue;
		seedTrends.set(trend.keyword, trend);
		for (const rising of trend.risingQueries) {
			if (candidates.size >= max) break;
			candidates.add(rising.query);
		}
	}

	return { candidates: [...candidates].slice(0, max), seedTrends };
}

export async function runResearchPipeline(
	env: Env,
	context: ResearchRunInput,
	notify?: ResearchProgressReporter,
): Promise<Report> {
	const degraded = new Set<string>();
	const seeds = [context.seed, ...(context.extraSeeds ?? [])];
	const maxCandidates = context.maxCandidates ?? 8;
	const topN = context.topN ?? 3;
	const store = storeName(env);
	const sources = context.sources ?? DEFAULT_SOURCES;
	const enabled = new Set<ResearchSource>(sources);
	const creativeTypes = context.creativeTypes ?? DEFAULT_CREATIVES;
	const collections = context.collections ?? [];
	const usesTrendSignals =
		enabled.has("google_trends") || enabled.has("social_viral");

	await reportProgress(notify, {
		step: "expanding",
		label: "Expandindo hipoteses",
		detail: "Buscando sementes e queries relacionadas para abrir o radar.",
		completed: 1,
		total: RESEARCH_PROGRESS_TOTAL,
		percent: 12,
	});

	const { candidates, seedTrends } = usesTrendSignals
		? await expandCandidates(env, seeds, maxCandidates, degraded)
		: {
				candidates: seeds.slice(0, maxCandidates),
				seedTrends: new Map<string, TrendSignal>(),
			};
	if (usesTrendSignals && seedTrends.size === 0) degraded.add("google_trends");

	await reportProgress(notify, {
		step: "signals",
		label: "Coletando sinais",
		detail: `Analisando ${candidates.length} candidato(s) nas fontes selecionadas.`,
		completed: 2,
		total: RESEARCH_PROGRESS_TOTAL,
		percent: 34,
	});

	const volumesArr = enabled.has("keyword_volume")
		? await keywordVolume(env, candidates).catch(
				resilient<KeywordVolume[]>(
					"dataforseo",
					candidates.join(", "),
					degraded,
				),
			)
		: [];
	const volumes = new Map<string, KeywordVolume>(
		(volumesArr ?? []).map((volume) => [volume.keyword, volume]),
	);

	const perCandidate = await Promise.all(
		candidates.map(async (keyword) => {
			const [trend, market, catalog] = await Promise.all([
				!usesTrendSignals
					? Promise.resolve(null)
					: seedTrends.get(keyword)
						? Promise.resolve(seedTrends.get(keyword) ?? null)
						: googleTrends(env, keyword).catch(
								resilient<TrendSignal>("serpapi_trends", keyword, degraded),
							),
				enabled.has("google_shopping")
					? googleShopping(env, keyword).catch(
							resilient<MarketSnapshot>(
								"serpapi_shopping",
								keyword,
								degraded,
							),
						)
					: Promise.resolve(null),
				enabled.has("catalog")
					? searchCatalog(env, keyword).catch(
							resilient<{ count: number; sample?: string }>(
								"catalog",
								keyword,
								degraded,
							),
						)
					: Promise.resolve(null),
			]);

			// A source that was asked for and produced nothing is degraded,
			// whether it threw (already logged above) or returned empty.
			if (usesTrendSignals && !trend) degraded.add("serpapi_trends");
			if (enabled.has("google_shopping") && !market) {
				degraded.add("serpapi_shopping");
			}
			if (
				enabled.has("catalog") &&
				catalog === null &&
				collections.length === 0
			) {
				degraded.add("catalog");
			}

			const collectionMatch = collections.find((collection) => {
				const normalizedKeyword = keyword.toLocaleLowerCase("pt-BR");
				const normalizedCollection = collection.toLocaleLowerCase("pt-BR");
				return (
					normalizedKeyword.includes(normalizedCollection) ||
					normalizedCollection.includes(normalizedKeyword)
				);
			});

			const gap: CatalogGap | null = !enabled.has("catalog")
				? null
				: catalog
					? {
							keyword,
							inCatalog: catalog.count > 0,
							catalogMatches: catalog.count,
							sampleMatch: catalog.sample,
						}
					: collections.length > 0
						? {
								keyword,
								inCatalog: Boolean(collectionMatch),
								catalogMatches: collectionMatch ? 1 : 0,
								sampleMatch: collectionMatch,
							}
						: null;

			return {
				keyword,
				trend: (trend as TrendSignal | null) ?? null,
				volume: volumes.get(keyword) ?? null,
				market: (market as MarketSnapshot | null) ?? null,
				gap,
			};
		}),
	);

	await reportProgress(notify, {
		step: "ranking",
		label: "Priorizando oportunidades",
		detail: "Consolidando score, fit e sinais para ordenar o radar.",
		completed: 3,
		total: RESEARCH_PROGRESS_TOTAL,
		percent: 52,
	});

	const opportunities = rankOpportunities(perCandidate.map(scoreOpportunity));

	const top = opportunities.slice(0, topN);
	await reportProgress(notify, {
		step: "briefs",
		label: "Desenvolvendo conceitos",
		detail: `Montando ${top.length} brief(s) com conceito, sourcing e criativos.`,
		completed: 4,
		total: RESEARCH_PROGRESS_TOTAL,
		percent: 74,
	});

	const briefs: ProductBrief[] = await Promise.all(
		top.map(async (opportunity): Promise<ProductBrief> => {
			let concept = null;
			try {
				concept = await generateConcept(env, opportunity, store, {
					profile: context.profile,
					audience: context.audience,
					collections,
				});
			} catch {
				degraded.add("llm");
			}

			const [copy, sourcing, creatives] = await Promise.all([
				concept
					? generateCopy(env, concept, opportunity.keyword).catch(() => null)
					: Promise.resolve(null),
				sourceSupplier(env, {
					keyword: opportunity.keyword,
					concept,
					suggestedRetailPrice: concept?.suggestedPrice ?? null,
					fallbackPrices: (opportunity.market?.offers ?? [])
						.map((offer) => offer.price)
						.filter((price): price is number => price != null),
				}).catch(() => null),
				concept
					? Promise.all(
							creativeTypes.map(async (type) => {
								const prompt = buildCreativePrompt(
									concept,
									type,
									context.storeStyle,
								);
								const image = await generateConceptImage(env, concept, prompt, {
									creativeType: type,
									referenceImages: context.referenceImages,
								}).catch(() => ({
									imageUrl: null,
									prompt,
								}));
								return {
									type,
									imageUrl: image.imageUrl,
									prompt: image.prompt,
								};
							}),
						)
					: Promise.resolve([]),
			]);

			if (concept && creatives.some((creative) => !creative.imageUrl)) {
				degraded.add("image");
			}
			const primaryCreative = creatives[0];

			return {
				opportunity,
				concept,
				copy,
				sourcing,
				imageUrl: primaryCreative?.imageUrl ?? null,
				imagePrompt: primaryCreative?.prompt ?? null,
				creatives,
				sourcePreviews: buildSourcePreviews(opportunity, sources),
			};
		}),
	);

	await reportProgress(notify, {
		step: "summary",
		label: "Finalizando report",
		detail: "Fechando o resumo executivo e preparando a persistencia.",
		completed: 5,
		total: RESEARCH_PROGRESS_TOTAL,
		percent: 90,
	});

	const summary = await buildSummary(env, context.seed, store, briefs).catch(
		() => heuristicSummary(context.seed, briefs),
	);

	const report = {
		seed: context.seed,
		generatedAt: new Date().toISOString(),
		geo: (env.MESH_REQUEST_CONTEXT?.state?.GEO as string) || "BR",
		store,
		summary,
		briefs,
		degraded: [...degraded],
		config: {
			profile: context.profile ?? null,
			audience: context.audience ?? null,
			sources,
			collections,
			creativeTypes,
			storeStyle: context.storeStyle ?? null,
			referenceImages: context.referenceImages ?? [],
		},
	} satisfies Report;

	await reportProgress(notify, {
		step: "completed",
		label: "Report pronto",
		detail: "Pesquisa concluida e salva em Reports.",
		completed: RESEARCH_PROGRESS_TOTAL,
		total: RESEARCH_PROGRESS_TOTAL,
		percent: 100,
	});

	return report;
}

export const researchRun = (env: Env) =>
	createTool({
		id: "RESEARCH_RUN",
		description:
			"End-to-end product research: expand a seed niche into candidates, gather trend/keyword/market/catalog signals, score and rank opportunities, then generate product concepts, supplier cost, hero images and copy - producing a full Product Opportunity Report. Orchestrates all other tools.",
		inputSchema: ResearchRunInputSchema,
		outputSchema: ReportSchema,
		_meta: { ui: { resourceUri: REPORT_RESOURCE_URI } },
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: true,
		},
		execute: async ({ context }): Promise<Report> =>
			runResearchPipeline(env, context),
	});

async function buildSummary(
	env: unknown,
	seed: string,
	store: string | null,
	briefs: ProductBrief[],
): Promise<string> {
	if (!briefs.length) return heuristicSummary(seed, briefs);
	const bullets = briefs
		.map(
			(brief) =>
				`- ${brief.concept?.name ?? brief.opportunity.keyword} (score ${brief.opportunity.score}): ${brief.opportunity.rationale}`,
		)
		.join("\n");
	return complete(env, {
		system:
			"You are a product strategist. Write a crisp executive summary in Brazilian Portuguese.",
		maxTokens: 400,
		prompt: `Nicho pesquisado: ${seed}. Loja: ${store ?? "e-commerce"}.
Oportunidades desenvolvidas:
${bullets}

Escreva 2-3 frases de sumario executivo recomendando por onde comecar e por que.`,
	});
}

function heuristicSummary(seed: string, briefs: ProductBrief[]): string {
	if (!briefs.length) return `Nenhuma oportunidade encontrada para "${seed}".`;
	const topName = briefs[0].concept?.name ?? briefs[0].opportunity.keyword;
	return `${briefs.length} oportunidades priorizadas para "${seed}". Destaque: ${topName} (score ${briefs[0].opportunity.score}/100) - ${briefs[0].opportunity.rationale}.`;
}
