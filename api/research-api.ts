import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { dataForSeoStatus } from "./clients/dataforseo.ts";
import { serpApiStatus } from "./clients/serpapi.ts";
import { getConfig } from "./config.ts";
import {
	materializeReportImages,
	readCreativeAsset,
} from "./creative-assets.ts";
import {
	deleteLaunchedProduct,
	deleteLaunchedProductsByReport,
	LaunchProductRequestSchema,
	launchProduct,
	listLaunchedProducts,
} from "./launched-products.ts";
import { buildSourcePreviews } from "./lib/source-previews.ts";
import type { Report, ResearchSource } from "./lib/types.ts";
import { CreativeTypeSchema, ResearchSourceSchema } from "./lib/types.ts";
import { researchRun } from "./tools/research.ts";
import type { Env } from "./types/env.ts";

const ResearchRequestSchema = z.object({
	seed: z.string().trim().min(2),
	extraSeeds: z.array(z.string()).optional(),
	maxCandidates: z.number().min(1).max(20).optional(),
	topN: z.number().min(1).max(5).optional(),
	profile: z.string().optional(),
	audience: z.string().optional(),
	sources: z.array(ResearchSourceSchema).min(1).optional(),
	collections: z.array(z.string()).optional(),
	creativeTypes: z.array(CreativeTypeSchema).min(1).max(3).optional(),
	storeStyle: z.string().optional(),
	referenceImages: z.array(z.string().url()).max(3).optional(),
	mode: z.enum(["manual", "automatic"]).optional(),
});

const STOREFRONT_REFERENCE_IMAGES = [
	"https://decoims.com/demo-storefront/2026/07/57440993-8c68-4943-9084-1c947c1d0fd5-banner1.png?quality=original",
	"https://decoims.com/demo-storefront/2026/07/ba0261c3-bee6-40bd-b7a4-ce12083c7be5-banner2.png",
	"https://decoims.com/demo-storefront/2026/07/543e04d2-011d-4cc2-8875-46a1a08bef3d-accessories.png",
];

const STOREFRONT_VISUAL_DIRECTION =
	"Pop editorial urbano da storefront: fundos chapados verde-lima ou lilás, módulos geométricos tonais, produto preto em recorte grande, luz frontal de estúdio, contraste alto e espaço negativo para copy.";

const DEFAULT_REPORT_SOURCES: ResearchSource[] = [
	"google_trends",
	"google_shopping",
	"keyword_volume",
	"social_viral",
	"catalog",
];

export interface StoredReport {
	id: string;
	mode: "manual" | "automatic";
	status: "ready";
	report: Report;
}

const distDir = join(import.meta.dir, "../dist");
const legacyReportFile = join(distDir, "report.json");
const reportsDir = join(distDir, "reports");
const reports = new Map<string, StoredReport>();
let loaded = false;
let automaticTimer: ReturnType<typeof setTimeout> | null = null;
let nextAutomaticRunAt: string | null = null;

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify(data), {
		status,
		headers: {
			"content-type": "application/json; charset=utf-8",
			"access-control-allow-origin": "*",
			"access-control-allow-headers": "content-type",
			"access-control-allow-methods": "GET,POST,OPTIONS",
		},
	});

function makeId(report: Report): string {
	const stamp = report.generatedAt.replace(/\D/g, "").slice(0, 14);
	const slug = report.seed
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "")
		.slice(0, 32);
	return `${stamp}-${slug || "research"}`;
}

async function loadReports(): Promise<void> {
	if (loaded) return;
	loaded = true;
	await mkdir(reportsDir, { recursive: true });

	try {
		const legacy = JSON.parse(
			await readFile(legacyReportFile, "utf8"),
		) as Report;
		const id = makeId(legacy);
		const normalized = await normalizeStoredReport({
			id,
			mode: "automatic",
			status: "ready",
			report: legacy,
		});
		reports.set(id, normalized.stored);
		if (normalized.changed) await persist(normalized.stored);
	} catch {
		// The first run legitimately has no persisted report yet.
	}

	for (const filename of await readdir(reportsDir)) {
		if (!filename.endsWith(".json")) continue;
		try {
			const stored = JSON.parse(
				await readFile(join(reportsDir, filename), "utf8"),
			) as StoredReport;
			if (stored.id && stored.report) {
				const normalized = await normalizeStoredReport(stored);
				reports.set(stored.id, normalized.stored);
				if (normalized.changed) await persist(normalized.stored);
			}
		} catch {
			// Ignore a partial/corrupt local file and keep serving healthy reports.
		}
	}
}

async function persist(stored: StoredReport): Promise<void> {
	await mkdir(reportsDir, { recursive: true });
	await writeFile(
		join(reportsDir, `${stored.id}.json`),
		JSON.stringify(stored, null, 2),
	);
}

function sortedReports(): StoredReport[] {
	return [...reports.values()].sort((a, b) =>
		b.report.generatedAt.localeCompare(a.report.generatedAt),
	);
}

async function normalizeStoredReport(
	stored: StoredReport,
): Promise<{ stored: StoredReport; changed: boolean }> {
	let changed = false;
	const sources = stored.report.config?.sources ?? DEFAULT_REPORT_SOURCES;
	const briefs = stored.report.briefs.map((brief) => {
		let sourcePreviews = brief.sourcePreviews ?? [];
		if (sourcePreviews.length === 0) {
			sourcePreviews = buildSourcePreviews(brief.opportunity, sources);
			changed = true;
		}

		let creatives = brief.creatives ?? [];
		if (creatives.length === 0 && brief.imageUrl) {
			creatives = [
				{
					type: "product_hero",
					imageUrl: brief.imageUrl,
					prompt:
						brief.imagePrompt ?? "Criativo principal recuperado do report.",
				},
			];
			changed = true;
		}

		return { ...brief, sourcePreviews, creatives };
	});
	const enriched: StoredReport = {
		...stored,
		report: { ...stored.report, briefs },
	};
	const materialized = await materializeReportImages(enriched);
	return {
		stored: materialized.stored,
		changed: changed || materialized.changed,
	};
}

async function refreshStoredReports(): Promise<number> {
	let updated = 0;
	for (const current of reports.values()) {
		const normalized = await normalizeStoredReport(current);
		reports.set(current.id, normalized.stored);
		if (normalized.changed) {
			updated += 1;
			await persist(normalized.stored);
		}
	}
	return updated;
}

async function deleteStoredReport(reportId: string): Promise<{
	deletedProducts: number;
	report: StoredReport | null;
}> {
	const stored = reports.get(reportId) ?? null;
	if (!stored) return { deletedProducts: 0, report: null };

	reports.delete(reportId);
	await rm(join(reportsDir, `${reportId}.json`), { force: true });

	try {
		const legacy = JSON.parse(
			await readFile(legacyReportFile, "utf8"),
		) as Report;
		if (makeId(legacy) === reportId)
			await rm(legacyReportFile, { force: true });
	} catch {
		// No legacy file to remove.
	}

	const deletedProducts = await deleteLaunchedProductsByReport(reportId);
	return { deletedProducts, report: stored };
}

/**
 * Credentials reach this HTTP API one of two ways: `process.env` when it runs
 * as a plain Bun server, or the deco connection state carried on the platform
 * env when it runs inside the runtime. Hardcoding an empty state here meant a
 * deployed instance silently ran with no provider credentials at all — every
 * source came back empty no matter what the Studio connection was configured
 * with. The last platform env seen is remembered so the background scheduler,
 * which has no request of its own, uses the same credentials.
 */
let platformEnv: unknown = null;

function localEnv(): Env {
	const state =
		(platformEnv as { MESH_REQUEST_CONTEXT?: { state?: unknown } } | null)
			?.MESH_REQUEST_CONTEXT?.state ?? {};
	return {
		IS_LOCAL: true,
		...(platformEnv as object | null),
		MESH_REQUEST_CONTEXT: { state },
	} as unknown as Env;
}

async function executeResearch(
	context: Omit<z.infer<typeof ResearchRequestSchema>, "mode">,
	mode: "manual" | "automatic",
): Promise<StoredReport> {
	const report = (await researchRun(localEnv()).execute({
		context,
		runtimeContext: { env: localEnv(), ctx: { waitUntil: () => {} } },
	})) as Report;
	const id = makeId(report);
	const normalized = await normalizeStoredReport({
		id,
		mode,
		status: "ready",
		report,
	});
	reports.set(id, normalized.stored);
	await persist(normalized.stored);
	return normalized.stored;
}

function scheduleNextAutomaticRun(): void {
	const now = new Date();
	const next = new Date(now);
	next.setHours(6, 0, 0, 0);
	if (next <= now) next.setDate(next.getDate() + 1);
	nextAutomaticRunAt = next.toISOString();

	automaticTimer = setTimeout(async () => {
		const seeds = (
			process.env.AUTO_RESEARCH_SEEDS || "Accessories,Jackets & Outerwear"
		)
			.split(",")
			.map((seed) => seed.trim())
			.filter(Boolean);
		for (const seed of seeds) {
			try {
				await executeResearch(
					{
						seed,
						profile: "Radar automático",
						audience:
							"Clientes atuais e públicos adjacentes com demanda emergente",
						sources: [
							"google_trends",
							"google_shopping",
							"keyword_volume",
							"social_viral",
							"catalog",
						],
						collections: [seed],
						creativeTypes: ["product_hero", "social_ad"],
						storeStyle: STOREFRONT_VISUAL_DIRECTION,
						referenceImages: STOREFRONT_REFERENCE_IMAGES,
						topN: 2,
						maxCandidates: 6,
					},
					"automatic",
				);
			} catch (error) {
				console.error("Automatic research failed", error);
			}
		}
		scheduleNextAutomaticRun();
	}, next.getTime() - now.getTime());
}

/**
 * Probe the paid providers once at boot. Without this a misconfigured or
 * suspended account only shows up as a report full of empty sources, with
 * nothing in the logs and nothing in the provider's own dashboard.
 */
export async function logProviderStatus(): Promise<void> {
	const [serp, seo] = await Promise.all([
		serpApiStatus(localEnv()),
		dataForSeoStatus(localEnv()),
	]);
	const line = (name: string, s: { ok: boolean; detail?: string }) =>
		console.log(
			s.ok ? `  ✓ ${name}` : `  ✗ ${name}: ${s.detail ?? "indisponível"}`,
		);
	console.log("Provedores de pesquisa:");
	line(
		`SerpApi${serp.searchesLeft != null ? ` (${serp.searchesLeft} buscas restantes)` : ""}`,
		serp,
	);
	line(
		`DataForSEO${seo.balance != null ? ` (saldo $${seo.balance.toFixed(2)})` : ""}`,
		seo,
	);
}

export function startAutomaticResearchScheduler(): void {
	if (process.env.AUTO_RESEARCH_ENABLED === "false" || automaticTimer) return;
	void loadReports().then(scheduleNextAutomaticRun);
}

export async function handleResearchApi(
	request: Request,
	env?: unknown,
): Promise<Response | null> {
	const url = new URL(request.url);
	if (!url.pathname.startsWith("/api/research")) return null;
	if (env) platformEnv = env;
	if (request.method === "OPTIONS") return json({ ok: true });
	if (
		request.method === "GET" &&
		url.pathname.startsWith("/api/research/assets/")
	) {
		const filename = decodeURIComponent(url.pathname.split("/").pop() ?? "");
		const asset = await readCreativeAsset(filename);
		if (!asset) return json({ error: "Criativo não encontrado." }, 404);
		return new Response(Uint8Array.from(asset.bytes).buffer, {
			headers: {
				"content-type": asset.mimeType,
				"cache-control": "public, max-age=31536000, immutable",
				"access-control-allow-origin": "*",
			},
		});
	}

	await loadReports();

	if (request.method === "GET" && url.pathname === "/api/research/health") {
		const config = getConfig(localEnv());
		// A configured key is not a working key. Probing both paid providers here
		// is what turns "the report looks empty" into an actionable answer.
		const [serp, seo] = await Promise.all([
			serpApiStatus(localEnv()),
			dataForSeoStatus(localEnv()),
		]);
		return json({
			ok: true,
			automation: {
				enabled: process.env.AUTO_RESEARCH_ENABLED !== "false",
				nextRunAt: nextAutomaticRunAt,
			},
			providers: {
				googleTrends: serp.ok,
				socialRadar: serp.ok,
				googleShopping: serp.ok,
				keywordVolume: seo.ok,
				catalog: Boolean(config.VTEX_ACCOUNT),
				conceptAndCopy: Boolean(
					config.ANTHROPIC_API_KEY || config.OPENAI_API_KEY,
				),
				image: Boolean(config.GEMINI_API_KEY || config.OPENAI_API_KEY),
			},
			providerDetails: {
				serpapi: {
					configured: Boolean(config.SERPAPI_KEY),
					ok: serp.ok,
					searchesLeft: serp.searchesLeft,
					error: serp.detail,
				},
				dataforseo: {
					configured: Boolean(
						config.DATAFORSEO_LOGIN && config.DATAFORSEO_PASSWORD,
					),
					ok: seo.ok,
					balance: seo.balance,
					error: seo.detail,
				},
			},
			reportCount: reports.size,
		});
	}

	if (request.method === "GET" && url.pathname === "/api/research/reports") {
		return json({
			reports: sortedReports(),
		});
	}

	if (
		request.method === "POST" &&
		url.pathname === "/api/research/reports/refresh"
	) {
		const updated = await refreshStoredReports();
		return json({
			updated,
			reports: sortedReports(),
		});
	}

	if (
		request.method === "DELETE" &&
		url.pathname.startsWith("/api/research/reports/") &&
		url.pathname !== "/api/research/reports/refresh"
	) {
		const reportId = decodeURIComponent(url.pathname.split("/").pop() ?? "");
		if (!reportId) return json({ error: "Report inválido." }, 400);

		const deleted = await deleteStoredReport(reportId);
		if (!deleted.report) {
			return json({ error: "Report não encontrado." }, 404);
		}

		return json({
			ok: true,
			reportId,
			deletedProducts: deleted.deletedProducts,
			reports: sortedReports(),
		});
	}

	if (request.method === "GET" && url.pathname === "/api/research/launches") {
		const collection = url.searchParams.get("collection")?.trim();
		const products = await listLaunchedProducts();
		return json({
			products: collection
				? products.filter((product) => product.collection === collection)
				: products,
		});
	}

	if (request.method === "POST" && url.pathname === "/api/research/launches") {
		let body: unknown;
		try {
			body = await request.json();
		} catch {
			return json({ error: "Corpo JSON inválido." }, 400);
		}
		const parsed = LaunchProductRequestSchema.safeParse(body);
		if (!parsed.success) {
			return json(
				{ error: "Produto inválido.", details: parsed.error.issues },
				400,
			);
		}
		return json(await launchProduct(parsed.data), 201);
	}

	if (
		request.method === "DELETE" &&
		url.pathname.startsWith("/api/research/launches/")
	) {
		const productId = decodeURIComponent(url.pathname.split("/").pop() ?? "");
		if (!productId) return json({ error: "Produto inválido." }, 400);

		const deleted = await deleteLaunchedProduct(productId);
		if (!deleted) return json({ error: "Produto não encontrado." }, 404);

		return json({
			ok: true,
			productId,
			products: await listLaunchedProducts(),
		});
	}

	if (request.method === "POST" && url.pathname === "/api/research/run") {
		let body: unknown;
		try {
			body = await request.json();
		} catch {
			return json({ error: "Corpo JSON inválido." }, 400);
		}
		const parsed = ResearchRequestSchema.safeParse(body);
		if (!parsed.success) {
			return json(
				{
					error: "Configuração de pesquisa inválida.",
					details: parsed.error.issues,
				},
				400,
			);
		}

		const { mode = "manual", ...context } = parsed.data;
		try {
			const stored = await executeResearch(context, mode);
			return json(stored, 201);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Falha desconhecida";
			return json(
				{ error: `Não foi possível concluir a pesquisa: ${message}` },
				500,
			);
		}
	}

	return json({ error: "Rota não encontrada." }, 404);
}
