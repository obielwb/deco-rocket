import { getConfig } from "../config.ts";
import { httpJson } from "../lib/http.ts";
import type { MarketOffer, MarketSnapshot, TrendSignal } from "../lib/types.ts";

const BASE = "https://serpapi.com/search.json";

function keyOf(env: unknown): string | undefined {
	return getConfig(env).SERPAPI_KEY;
}

interface TimelinePoint {
	date: string;
	values?: { extracted_value?: number; value?: string }[];
}

function computeMomentum(values: number[]): number {
	if (values.length < 4) return 0;
	const third = Math.max(1, Math.floor(values.length / 3));
	const early = values.slice(0, third);
	const late = values.slice(-third);
	const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
	const earlyAvg = avg(early) || 0.0001;
	const lateAvg = avg(late);
	return Math.round(((lateAvg - earlyAvg) / earlyAvg) * 100);
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

	const common = new URLSearchParams({
		engine: "google_trends",
		q: query,
		geo,
		hl,
		api_key,
	});

	const timeUrl = `${BASE}?${new URLSearchParams({ ...Object.fromEntries(common), data_type: "TIMESERIES" })}`;
	const relUrl = `${BASE}?${new URLSearchParams({ ...Object.fromEntries(common), data_type: "RELATED_QUERIES" })}`;

	const [timeRes, relRes] = await Promise.allSettled([
		httpJson<{ interest_over_time?: { timeline_data?: TimelinePoint[] } }>(
			timeUrl,
		),
		httpJson<{
			related_queries?: {
				rising?: { query: string; value?: string; extracted_value?: number }[];
			};
		}>(relUrl),
	]);

	const timeline: { date: string; value: number }[] = [];
	if (timeRes.status === "fulfilled") {
		for (const p of timeRes.value.interest_over_time?.timeline_data ?? []) {
			const v = p.values?.[0]?.extracted_value ?? 0;
			timeline.push({ date: p.date, value: v });
		}
	}

	const values = timeline.map((t) => t.value);
	const avgInterest = values.length
		? Math.round(values.reduce((s, v) => s + v, 0) / values.length)
		: 0;
	const momentum = computeMomentum(values);

	const risingQueries =
		relRes.status === "fulfilled"
			? (relRes.value.related_queries?.rising ?? []).slice(0, 8).map((r) => ({
					query: r.query,
					growth: r.value ?? `${r.extracted_value ?? ""}`,
				}))
			: [];
	const isBreakout = risingQueries.some((r) =>
		/breakout|\+\s*\d{3,}/i.test(r.growth),
	);

	return {
		keyword: query,
		timeline,
		avgInterest,
		momentum,
		risingQueries,
		isBreakout,
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

	const url = `${BASE}?${new URLSearchParams({ engine: "google_shopping", q: query, gl, hl, api_key })}`;
	const data = await httpJson<{ shopping_results?: ShoppingResult[] }>(url);
	const results = (data.shopping_results ?? []).slice(0, 20);

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
