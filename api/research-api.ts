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
import {
	type ResearchProgressReporter,
	type ResearchProgressState,
	ResearchRunInputSchema,
	runResearchPipeline,
} from "./tools/research.ts";
import type { Env } from "./types/env.ts";

const ResearchRequestSchema = ResearchRunInputSchema.extend({
	mode: z.enum(["manual", "automatic"]).optional(),
});

const STOREFRONT_REFERENCE_IMAGES = [
	"https://decoims.com/demo-storefront/2026/07/57440993-8c68-4943-9084-1c947c1d0fd5-banner1.png?quality=original",
	"https://decoims.com/demo-storefront/2026/07/ba0261c3-bee6-40bd-b7a4-ce12083c7be5-banner2.png",
	"https://decoims.com/demo-storefront/2026/07/543e04d2-011d-4cc2-8875-46a1a08bef3d-accessories.png",
];

const STOREFRONT_VISUAL_DIRECTION =
	"Pop editorial urbano da storefront: fundos chapados verde-lima ou lilas, modulos geometricos tonais, produto preto em recorte grande, luz frontal de estudio, contraste alto e espaco negativo para copy.";

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

export type ResearchJobStatus = "queued" | "running" | "succeeded" | "failed";
export type ResearchJobStep =
	| ResearchProgressState["step"]
	| "queued"
	| "failed";

export interface StoredResearchJob {
	id: string;
	mode: "manual" | "automatic";
	status: ResearchJobStatus;
	request: z.infer<typeof ResearchRunInputSchema>;
	progress: {
		step: ResearchJobStep;
		label: string;
		detail: string;
		percent: number;
	};
	createdAt: string;
	updatedAt: string;
	startedAt: string | null;
	finishedAt: string | null;
	reportId: string | null;
	error: string | null;
}

const distDir = join(import.meta.dir, "../dist");
const legacyReportFile = join(distDir, "report.json");
const reportsDir = join(distDir, "reports");
const jobsDir = join(distDir, "jobs");
const reports = new Map<string, StoredReport>();
const jobs = new Map<string, StoredResearchJob>();
let loaded = false;
let loadPromise: Promise<void> | null = null;
let automaticTimer: ReturnType<typeof setTimeout> | null = null;
let nextAutomaticRunAt: string | null = null;

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify(data), {
		status,
		headers: {
			"content-type": "application/json; charset=utf-8",
			"access-control-allow-origin": "*",
			"access-control-allow-headers": "content-type",
			"access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
		},
	});

function nowIso(): string {
	return new Date().toISOString();
}

function seedSlug(seed: string): string {
	return seed
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "")
		.slice(0, 32);
}

function makeId(report: Report): string {
	const stamp = report.generatedAt.replace(/\D/g, "").slice(0, 14);
	return `${stamp}-${seedSlug(report.seed) || "research"}`;
}

function makeJobId(seed: string): string {
	const stamp = nowIso().replace(/\D/g, "").slice(0, 14);
	const suffix = crypto.randomUUID().slice(0, 8);
	return `${stamp}-${seedSlug(seed) || "research"}-${suffix}`;
}

async function hydrateState(): Promise<void> {
	await mkdir(reportsDir, { recursive: true });
	await mkdir(jobsDir, { recursive: true });

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
		if (normalized.changed) await persistReport(normalized.stored);
	} catch {
		// No legacy report yet.
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
				if (normalized.changed) await persistReport(normalized.stored);
			}
		} catch {
			// Ignore partial or corrupt files and keep serving healthy reports.
		}
	}

	for (const filename of await readdir(jobsDir)) {
		if (!filename.endsWith(".json")) continue;
		try {
			const raw = JSON.parse(
				await readFile(join(jobsDir, filename), "utf8"),
			) as StoredResearchJob;
			if (!raw.id || !raw.request) continue;
			const restored = repairLoadedJob(raw);
			jobs.set(restored.id, restored);
			if (restored !== raw) await persistJob(restored);
		} catch {
			// Ignore partial or corrupt job files.
		}
	}
}

async function loadState(): Promise<void> {
	if (loaded) return;
	if (!loadPromise) {
		loadPromise = hydrateState()
			.then(() => {
				loaded = true;
			})
			.catch((error) => {
				loadPromise = null;
				throw error;
			});
	}
	await loadPromise;
}

function repairLoadedJob(job: StoredResearchJob): StoredResearchJob {
	if (job.status !== "queued" && job.status !== "running") return job;
	const finishedAt = nowIso();
	return {
		...job,
		status: "failed",
		updatedAt: finishedAt,
		finishedAt,
		error:
			"A pesquisa foi interrompida porque o backend reiniciou durante a execucao.",
		progress: {
			step: "failed",
			label: "Execucao interrompida",
			detail: "O backend reiniciou antes de concluir a pesquisa.",
			percent: Math.max(job.progress?.percent ?? 0, 5),
		},
	};
}

async function persistReport(stored: StoredReport): Promise<void> {
	await mkdir(reportsDir, { recursive: true });
	await writeFile(
		join(reportsDir, `${stored.id}.json`),
		JSON.stringify(stored, null, 2),
	);
}

async function persistJob(job: StoredResearchJob): Promise<void> {
	await mkdir(jobsDir, { recursive: true });
	await writeFile(
		join(jobsDir, `${job.id}.json`),
		JSON.stringify(job, null, 2),
	);
}

function sortedReports(): StoredReport[] {
	return [...reports.values()].sort((a, b) =>
		b.report.generatedAt.localeCompare(a.report.generatedAt),
	);
}

function sortedJobs(): StoredResearchJob[] {
	return [...jobs.values()].sort((a, b) =>
		b.createdAt.localeCompare(a.createdAt),
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
			await persistReport(normalized.stored);
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
	context: z.infer<typeof ResearchRunInputSchema>,
	mode: "manual" | "automatic",
	notify?: ResearchProgressReporter,
): Promise<StoredReport> {
	const report = await runResearchPipeline(localEnv(), context, notify);
	const id = makeId(report);
	const normalized = await normalizeStoredReport({
		id,
		mode,
		status: "ready",
		report,
	});
	reports.set(id, normalized.stored);
	await persistReport(normalized.stored);
	return normalized.stored;
}

function createJob(
	request: z.infer<typeof ResearchRunInputSchema>,
	mode: "manual" | "automatic",
): StoredResearchJob {
	const createdAt = nowIso();
	return {
		id: makeJobId(request.seed),
		mode,
		status: "queued",
		request,
		progress: {
			step: "queued",
			label: "Fila iniciada",
			detail:
				"A pesquisa ficou agendada e continua rodando mesmo se voce sair da tela.",
			percent: 3,
		},
		createdAt,
		updatedAt: createdAt,
		startedAt: null,
		finishedAt: null,
		reportId: null,
		error: null,
	};
}

async function saveJob(job: StoredResearchJob): Promise<StoredResearchJob> {
	jobs.set(job.id, job);
	await persistJob(job);
	return job;
}

async function updateJob(
	jobId: string,
	updater: (current: StoredResearchJob) => StoredResearchJob,
): Promise<StoredResearchJob | null> {
	const current = jobs.get(jobId);
	if (!current) return null;
	const next = updater(current);
	jobs.set(jobId, next);
	await persistJob(next);
	return next;
}

async function runResearchJob(jobId: string): Promise<void> {
	const queued = jobs.get(jobId);
	if (!queued) return;

	await updateJob(jobId, (job) => ({
		...job,
		status: "running",
		startedAt: job.startedAt ?? nowIso(),
		updatedAt: nowIso(),
	}));

	try {
		const stored = await executeResearch(
			queued.request,
			queued.mode,
			async (progress) => {
				await updateJob(jobId, (job) => ({
					...job,
					status: "running",
					startedAt: job.startedAt ?? nowIso(),
					updatedAt: nowIso(),
					progress: {
						step: progress.step,
						label: progress.label,
						detail: progress.detail,
						percent: progress.percent,
					},
				}));
			},
		);

		await updateJob(jobId, (job) => ({
			...job,
			status: "succeeded",
			updatedAt: nowIso(),
			finishedAt: nowIso(),
			reportId: stored.id,
			error: null,
			progress: {
				step: "completed",
				label: "Report pronto",
				detail: "Pesquisa concluida e salva em Reports.",
				percent: 100,
			},
		}));
	} catch (error) {
		const message =
			error instanceof Error
				? error.message
				: "Falha desconhecida durante a pesquisa.";
		await updateJob(jobId, (job) => ({
			...job,
			status: "failed",
			updatedAt: nowIso(),
			finishedAt: nowIso(),
			error: message,
			progress: {
				step: "failed",
				label: "Pesquisa com falha",
				detail: message,
				percent: Math.max(job.progress.percent, 8),
			},
		}));
	}
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
						profile: "Radar automatico",
						audience:
							"Clientes atuais e publicos adjacentes com demanda emergente",
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
	void loadState().then(scheduleNextAutomaticRun);
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
		if (!asset) return json({ error: "Criativo nao encontrado." }, 404);
		return new Response(Uint8Array.from(asset.bytes).buffer, {
			headers: {
				"content-type": asset.mimeType,
				"cache-control": "public, max-age=31536000, immutable",
				"access-control-allow-origin": "*",
			},
		});
	}

	await loadState();

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
			activeJobs: sortedJobs().filter(
				(job) => job.status === "queued" || job.status === "running",
			).length,
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
		if (!reportId) return json({ error: "Report invalido." }, 400);

		const deleted = await deleteStoredReport(reportId);
		if (!deleted.report) {
			return json({ error: "Report nao encontrado." }, 404);
		}

		return json({
			ok: true,
			reportId,
			deletedProducts: deleted.deletedProducts,
			reports: sortedReports(),
		});
	}

	if (request.method === "GET" && url.pathname === "/api/research/jobs") {
		const mode = url.searchParams.get("mode");
		const status = url.searchParams.get("status");
		let filtered = sortedJobs();
		if (mode === "manual" || mode === "automatic") {
			filtered = filtered.filter((job) => job.mode === mode);
		}
		if (status === "active") {
			filtered = filtered.filter(
				(job) => job.status === "queued" || job.status === "running",
			);
		}
		return json({ jobs: filtered });
	}

	if (
		request.method === "GET" &&
		url.pathname.startsWith("/api/research/jobs/")
	) {
		const jobId = decodeURIComponent(url.pathname.split("/").pop() ?? "");
		if (!jobId) return json({ error: "Job invalido." }, 400);
		const job = jobs.get(jobId);
		if (!job) return json({ error: "Job nao encontrado." }, 404);
		return json(job);
	}

	if (request.method === "POST" && url.pathname === "/api/research/jobs") {
		let body: unknown;
		try {
			body = await request.json();
		} catch {
			return json({ error: "Corpo JSON invalido." }, 400);
		}

		const parsed = ResearchRequestSchema.safeParse(body);
		if (!parsed.success) {
			return json(
				{
					error: "Configuracao de pesquisa invalida.",
					details: parsed.error.issues,
				},
				400,
			);
		}

		const { mode = "manual", ...context } = parsed.data;
		const job = await saveJob(createJob(context, mode));
		void runResearchJob(job.id);
		return json(job, 202);
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
			return json({ error: "Corpo JSON invalido." }, 400);
		}
		const parsed = LaunchProductRequestSchema.safeParse(body);
		if (!parsed.success) {
			return json(
				{ error: "Produto invalido.", details: parsed.error.issues },
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
		if (!productId) return json({ error: "Produto invalido." }, 400);

		const deleted = await deleteLaunchedProduct(productId);
		if (!deleted) return json({ error: "Produto nao encontrado." }, 404);

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
			return json({ error: "Corpo JSON invalido." }, 400);
		}
		const parsed = ResearchRequestSchema.safeParse(body);
		if (!parsed.success) {
			return json(
				{
					error: "Configuracao de pesquisa invalida.",
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
				{ error: `Nao foi possivel concluir a pesquisa: ${message}` },
				500,
			);
		}
	}

	return json({ error: "Rota nao encontrada." }, 404);
}
