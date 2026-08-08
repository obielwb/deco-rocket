import { getConfig } from "../config.ts";
import { httpJson, ProviderError } from "../lib/http.ts";
import type { MarketOffer, MarketSnapshot, TrendSignal } from "../lib/types.ts";

const BASE = "https://serpapi.com/search.json";

function keyOf(env: unknown): string | undefined {
	return getConfig(env).SERPAPI_KEY;
}

/**
 * SerpApi answers `200 OK` with an `error` string for two very different
 * situations: the upstream engine had nothing to show ("hasn't returned any
 * results"), and the call itself was rejected (bad key, quota exhausted, rate
 * limit). Only the first one is an empty result — the second must surface as a
 * failure, otherwise a broken key looks exactly like a niche with no demand.
 */
const EMPTY_RESULT = /hasn't returned any|no results found|didn't return any/i;

async function serpApiGet<T>(
	params: Record<string, string>,
): Promise<T | null> {
	const url = `${BASE}?${new URLSearchParams(params)}`;
	const data = await httpJson<T & { error?: string }>(url);
	if (data.error) {
		if (EMPTY_RESULT.test(data.error)) return null;
		throw new ProviderError("serpapi", data.error);
	}
	return data;
}

interface TimelinePoint {
	date: string;
	values?: { extracted_value?: number; value?: string }[];
}

interface RisingQuery {
	query: string;
	value?: string;
	extracted_value?: number;
}

/**
 * Growth is capped: a term rising off a zero baseline has no defined percentage
 * change, and dividing by an epsilon produced momentum readings in the millions.
 */
const MOMENTUM_CAP = 500;

function computeMomentum(values: number[]): number {
	if (values.length < 4) return 0;
	const third = Math.max(1, Math.floor(values.length / 3));
	const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
	const earlyAvg = avg(values.slice(0, third));
	const lateAvg = avg(values.slice(-third));
	if (earlyAvg <= 0) return lateAvg > 0 ? MOMENTUM_CAP : 0;
	const pct = Math.round(((lateAvg - earlyAvg) / earlyAvg) * 100);
	return Math.max(-100, Math.min(MOMENTUM_CAP, pct));
}

/**
 * Google Trends labels a breakout in the response language — "Breakout" on
 * `hl=en`, "Aumento repentino" on `hl=pt-BR`. Matching English only made every
 * pt-BR report read "Em alta" and quietly dropped the breakout bonus from the
 * momentum score.
 */
const BREAKOUT_LABEL = /breakout|aumento repentino|ruptura|desglose/i;

function isBreakoutQuery(r: RisingQuery): boolean {
	if (r.value && BREAKOUT_LABEL.test(r.value)) return true;
	// SerpApi reports relative growth as a percentage; +500% and above is the
	// band Google itself treats as a spike.
	return (r.extracted_value ?? 0) >= 500;
}

/** Google Trends: interest over time + rising related queries for one keyword. */
export async function googleTrends(
	env: unknown,
	query: string,
): Promise<TrendSignal | null> {
	const api_key = keyOf(env);
	if (!api_key) return null;
	const c = getConfig(env);
	const geo = c.GEO || "BR";
	const hl = c.LANG || "pt-BR";

	const common = { engine: "google_trends", q: query, geo, hl, api_key };

	// The timeseries is the signal itself — if it fails, there is no trend to
	// report and we must say so. Related queries only enrich it, so a failure
	// there degrades to an empty rising list instead of losing the whole card.
	const [timeRes, relRes] = await Promise.allSettled([
		serpApiGet<{
			interest_over_time?: { timeline_data?: TimelinePoint[] };
		}>({ ...common, data_type: "TIMESERIES" }),
		serpApiGet<{ related_queries?: { rising?: RisingQuery[] } }>({
			...common,
			data_type: "RELATED_QUERIES",
		}),
	]);

	if (timeRes.status === "rejected") throw timeRes.reason;

	const timeline: { date: string; value: number }[] = [];
	for (const p of timeRes.value?.interest_over_time?.timeline_data ?? []) {
		timeline.push({ date: p.date, value: p.values?.[0]?.extracted_value ?? 0 });
	}
	// No series means no evidence. Returning a zero-filled signal here would be
	// rendered as a collected source showing "0/100".
	if (timeline.length === 0) return null;

	if (relRes.status === "rejected") {
		console.warn(
			`[serpapi] related queries unavailable for "${query}": ${
				relRes.reason instanceof Error ? relRes.reason.message : relRes.reason
			}`,
		);
	}

	const values = timeline.map((t) => t.value);
	const avgInterest = Math.round(
		values.reduce((s, v) => s + v, 0) / values.length,
	);
	const momentum = computeMomentum(values);

	const rising =
		relRes.status === "fulfilled"
			? (relRes.value?.related_queries?.rising ?? []).slice(0, 8)
			: [];
	const risingQueries = rising.map((r) => ({
		query: r.query,
		growth: r.value ?? `${r.extracted_value ?? ""}`,
	}));

	return {
		keyword: query,
		timeline,
		avgInterest,
		momentum,
		risingQueries,
		isBreakout: rising.some(isBreakoutQuery),
		source: "google_trends",
	};
}

interface ShoppingResult {
	title: string;
	price?: string;
	extracted_price?: number;
	rating?: number;
	reviews?: number;
	source?: string;
	link?: string;
	product_link?: string;
	thumbnail?: string;
}

function median(nums: number[]): number | null {
	if (!nums.length) return null;
	const s = [...nums].sort((a, b) => a - b);
	const mid = Math.floor(s.length / 2);
	return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

/** Google Shopping: competitive price/rating/review snapshot for a keyword. */
export async function googleShopping(
	env: unknown,
	query: string,
): Promise<MarketSnapshot | null> {
	const api_key = keyOf(env);
	if (!api_key) return null;
	const c = getConfig(env);
	const gl = (c.GEO || "BR").toLowerCase();
	const hl = (c.LANG || "pt-BR").split("-")[0];

	const data = await serpApiGet<{
		shopping_results?: ShoppingResult[];
		inline_shopping_results?: ShoppingResult[];
	}>({ engine: "google_shopping", q: query, gl, hl, api_key });

	const results = (
		data?.shopping_results ??
		data?.inline_shopping_results ??
		[]
	).slice(0, 20);
	// An empty shelf is not a competitive snapshot. Reporting one would score the
	// keyword as having zero competitors — the best possible competition score.
	if (results.length === 0) return null;

	const offers: MarketOffer[] = results.map((r) => ({
		title: r.title,
		price: r.extracted_price ?? null,
		currency: "BRL",
		rating: r.rating ?? null,
		reviews: r.reviews ?? null,
		source: r.source ?? "",
		link: r.link ?? r.product_link,
		thumbnail: r.thumbnail,
	}));

	const prices = offers
		.map((o) => o.price)
		.filter((p): p is number => p != null);
	const ratings = offers
		.map((o) => o.rating)
		.filter((r): r is number => r != null);
	const reviews = offers.map((o) => o.reviews ?? 0);

	return {
		keyword: query,
		offers,
		priceMin: prices.length ? Math.min(...prices) : null,
		priceMax: prices.length ? Math.max(...prices) : null,
		priceMedian: median(prices),
		competitorCount: offers.length,
		avgRating: ratings.length
			? Math.round((ratings.reduce((s, v) => s + v, 0) / ratings.length) * 10) /
				10
			: null,
		totalReviews: reviews.reduce((s, v) => s + v, 0),
	};
}

/** Live credential check for the health endpoint. */
export async function serpApiStatus(env: unknown): Promise<{
	ok: boolean;
	detail?: string;
	searchesLeft?: number;
}> {
	const api_key = keyOf(env);
	if (!api_key) return { ok: false, detail: "SERPAPI_KEY não configurada." };
	try {
		const account = await httpJson<{
			total_searches_left?: number;
			account_status?: string;
		}>(`https://serpapi.com/account.json?${new URLSearchParams({ api_key })}`);
		const searchesLeft = account.total_searches_left ?? 0;
		return {
			ok: searchesLeft > 0,
			searchesLeft,
			detail:
				searchesLeft > 0
					? undefined
					: "Cota de buscas do SerpApi esgotada para o período.",
		};
	} catch (error) {
		return {
			ok: false,
			detail: error instanceof Error ? error.message : "Falha desconhecida",
		};
	}
}
