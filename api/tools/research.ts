import { createTool } from "@decocms/runtime/tools";
import { z } from "zod";
import { complete } from "../clients/anthropic.ts";
import { keywordVolume } from "../clients/dataforseo.ts";
import { googleShopping, googleTrends } from "../clients/serpapi.ts";
import { searchCatalog, storeName } from "../clients/vtex.ts";
import { rankOpportunities, scoreOpportunity } from "../lib/scoring.ts";
import type {
	CatalogGap,
	KeywordVolume,
	MarketSnapshot,
	ProductBrief,
	Report,
	TrendSignal,
} from "../lib/types.ts";
import { ReportSchema } from "../lib/types.ts";
import type { Env } from "../types/env.ts";
import { generateConcept, generateCopy } from "./concept.ts";
import { generateConceptImage } from "./creative.ts";
import { sourceSupplier } from "./sourcing.ts";

export const REPORT_RESOURCE_URI = "ui://deco-research/report";

/** Expand seed terms with breakout related queries from Google Trends. */
async function expandCandidates(
	env: unknown,
	seeds: string[],
	max: number,
): Promise<{ candidates: string[]; seedTrends: Map<string, TrendSignal> }> {
	const seedTrends = new Map<string, TrendSignal>();
	const candidates = new Set(seeds.map((s) => s.trim()).filter(Boolean));

	const trends = await Promise.all(
		seeds.map((s) => googleTrends(env, s).catch(() => null)),
	);
	for (const t of trends) {
		if (!t) continue;
		seedTrends.set(t.keyword, t);
		for (const r of t.risingQueries) {
			if (candidates.size >= max) break;
			candidates.add(r.query);
		}
	}
	return { candidates: [...candidates].slice(0, max), seedTrends };
}

export const researchRun = (env: Env) =>
	createTool({
		id: "RESEARCH_RUN",
		description:
			"End-to-end product research: expand a seed niche into candidates, gather trend/keyword/market/catalog signals, score & rank opportunities, then generate product concepts, supplier cost, hero images and copy — producing a full Product Opportunity Report. Orchestrates all other tools.",
		inputSchema: z.object({
			seed: z
				.string()
				.describe("Seed niche or product term (e.g. 'garrafa térmica')"),
			extraSeeds: z
				.array(z.string())
				.optional()
				.describe("Additional seed terms"),
			maxCandidates: z.number().min(1).max(20).optional().describe("Default 8"),
			topN: z
				.number()
				.min(1)
				.max(10)
				.optional()
				.describe("Concepts to fully develop. Default 3"),
		}),
		outputSchema: ReportSchema,
		_meta: { ui: { resourceUri: REPORT_RESOURCE_URI } },
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: true,
		},
		execute: async ({ context }): Promise<Report> => {
			const degraded = new Set<string>();
			const seeds = [context.seed, ...(context.extraSeeds ?? [])];
			const maxCandidates = context.maxCandidates ?? 8;
			const topN = context.topN ?? 3;
			const store = storeName(env);

			// 1. Expand candidates from seeds + breakout queries.
			const { candidates, seedTrends } = await expandCandidates(
				env,
				seeds,
				maxCandidates,
			);
			if (seedTrends.size === 0) degraded.add("google_trends");

			// 2. Gather signals (trend + market per candidate, volume in one batch).
			const volumesArr = await keywordVolume(env, candidates).catch(() => null);
			if (!volumesArr) degraded.add("dataforseo");
			const volumes = new Map<string, KeywordVolume>(
				(volumesArr ?? []).map((v) => [v.keyword, v]),
			);

			const perCandidate = await Promise.all(
				candidates.map(async (keyword) => {
					const [trend, market, catalog] = await Promise.all([
						seedTrends.get(keyword)
							? Promise.resolve(seedTrends.get(keyword) ?? null)
							: googleTrends(env, keyword).catch(() => null),
						googleShopping(env, keyword).catch(() => null),
						searchCatalog(env, keyword).catch(() => null),
					]);
					if (!market) degraded.add("serpapi_shopping");
					if (catalog === null) degraded.add("vtex");
					const gap: CatalogGap | null = catalog
						? {
								keyword,
								inCatalog: catalog.count > 0,
								catalogMatches: catalog.count,
								sampleMatch: catalog.sample,
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

			// 3. Score + rank.
			const opportunities = rankOpportunities(
				perCandidate.map(scoreOpportunity),
			);

			// 4. Develop top-N into full briefs.
			const top = opportunities.slice(0, topN);
			const briefs: ProductBrief[] = await Promise.all(
				top.map(async (opportunity): Promise<ProductBrief> => {
					let concept = null;
					try {
						concept = await generateConcept(env, opportunity, store);
					} catch {
						degraded.add("anthropic");
					}

					const [copy, sourcing, image] = await Promise.all([
						concept
							? generateCopy(env, concept, opportunity.keyword).catch(
									() => null,
								)
							: Promise.resolve(null),
						sourceSupplier(env, {
							keyword: opportunity.keyword,
							concept,
							suggestedRetailPrice: concept?.suggestedPrice ?? null,
							fallbackPrices: (opportunity.market?.offers ?? [])
								.map((o) => o.price)
								.filter((p): p is number => p != null),
						}).catch(() => null),
						concept
							? generateConceptImage(env, concept).catch(() => ({
									imageUrl: null,
									prompt: "",
								}))
							: Promise.resolve({ imageUrl: null, prompt: "" }),
					]);
					if (concept && !image.imageUrl) degraded.add("image");

					return {
						opportunity,
						concept,
						copy,
						sourcing,
						imageUrl: image.imageUrl,
						imagePrompt: image.prompt || null,
					};
				}),
			);

			// 5. Executive summary.
			const summary = await buildSummary(
				env,
				context.seed,
				store,
				briefs,
			).catch(() => heuristicSummary(context.seed, briefs));

			return {
				seed: context.seed,
				generatedAt: new Date().toISOString(),
				geo: (env.MESH_REQUEST_CONTEXT?.state?.GEO as string) || "BR",
				store,
				summary,
				briefs,
				degraded: [...degraded],
			};
		},
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
			(b) =>
				`- ${b.concept?.name ?? b.opportunity.keyword} (score ${b.opportunity.score}): ${b.opportunity.rationale}`,
		)
		.join("\n");
	return complete(env, {
		system:
			"You are a product strategist. Write a crisp executive summary in Brazilian Portuguese.",
		maxTokens: 400,
		prompt: `Nicho pesquisado: ${seed}. Loja: ${store ?? "e-commerce"}.
Oportunidades desenvolvidas:
${bullets}

Escreva 2-3 frases de sumário executivo recomendando por onde começar e por quê.`,
	});
}

function heuristicSummary(seed: string, briefs: ProductBrief[]): string {
	if (!briefs.length) return `Nenhuma oportunidade encontrada para "${seed}".`;
	const topName = briefs[0].concept?.name ?? briefs[0].opportunity.keyword;
	return `${briefs.length} oportunidades priorizadas para "${seed}". Destaque: ${topName} (score ${briefs[0].opportunity.score}/100) — ${briefs[0].opportunity.rationale}.`;
}
