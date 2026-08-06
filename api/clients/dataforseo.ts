import { getConfig } from "../config.ts";
import { httpJson } from "../lib/http.ts";
import type { KeywordVolume } from "../lib/types.ts";

const BASE = "https://api.dataforseo.com/v3";

/**
 * DataForSEO Google Ads search volume (Labs / keywords_data). Pay-as-you-go.
 * Returns one KeywordVolume per input keyword; nulls when a keyword has no data.
 */
export async function keywordVolume(
	env: unknown,
	keywords: string[],
): Promise<KeywordVolume[] | null> {
	const c = getConfig(env);
	if (!c.DATAFORSEO_LOGIN || !c.DATAFORSEO_PASSWORD) return null;
	if (!keywords.length) return [];

	const auth = btoa(`${c.DATAFORSEO_LOGIN}:${c.DATAFORSEO_PASSWORD}`);
	const geo = (c.GEO || "BR").toUpperCase();
	const locationName = geo === "BR" ? "Brazil" : geo;
	const languageName = (c.LANG || "pt-BR").startsWith("pt")
		? "Portuguese"
		: "English";

	const body = [
		{
			keywords: keywords.slice(0, 100),
			location_name: locationName,
			language_name: languageName,
		},
	];

	const data = await httpJson<{
		tasks?: {
			result?: {
				keyword: string;
				search_volume?: number | null;
				competition_index?: number | null;
				cpc?: number | null;
				monthly_searches?: { search_volume?: number }[];
			}[];
		}[];
	}>(`${BASE}/keywords_data/google_ads/search_volume/live`, {
		method: "POST",
		headers: {
			authorization: `Basic ${auth}`,
			"content-type": "application/json",
		},
		body: JSON.stringify(body),
	});

	const rows = data.tasks?.[0]?.result ?? [];
	const byKeyword = new Map(rows.map((r) => [r.keyword.toLowerCase(), r]));

	return keywords.map((kw) => {
		const r = byKeyword.get(kw.toLowerCase());
		return {
			keyword: kw,
			searchVolume: r?.search_volume ?? null,
			competition: r?.competition_index ?? null,
			cpc: r?.cpc ?? null,
			trendMonthly: (r?.monthly_searches ?? [])
				.map((m) => m.search_volume ?? 0)
				.slice(-12),
		};
	});
}
