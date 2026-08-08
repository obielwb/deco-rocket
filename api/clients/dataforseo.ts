import { getConfig } from "../config.ts";
import { httpJson, ProviderError } from "../lib/http.ts";
import type { KeywordVolume } from "../lib/types.ts";

const BASE = "https://api.dataforseo.com/v3";

/** DataForSEO signals success with 20000 at both the envelope and task level. */
const OK = 20000;

interface Envelope<T> {
	status_code?: number;
	status_message?: string;
	tasks?: { status_code?: number; status_message?: string; result?: T }[];
}

/**
 * DataForSEO answers `200 OK` even when the account is suspended, out of
 * credits or the task was rejected — the real status lives in the body. Reading
 * only `tasks[0].result` turns any of those into "every keyword has null
 * volume", which the report then presents as a successfully collected source.
 */
function unwrap<T>(data: Envelope<T>): T | null {
	if (data.status_code !== OK) {
		throw new ProviderError(
			"dataforseo",
			`${data.status_message ?? "erro desconhecido"} (${data.status_code})`,
		);
	}
	const task = data.tasks?.[0];
	if (!task) throw new ProviderError("dataforseo", "resposta sem tarefas");
	if (task.status_code !== OK) {
		throw new ProviderError(
			"dataforseo",
			`${task.status_message ?? "tarefa rejeitada"} (${task.status_code})`,
		);
	}
	return task.result ?? null;
}

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

	const data = await httpJson<
		Envelope<
			{
				keyword: string;
				search_volume?: number | null;
				competition_index?: number | null;
				cpc?: number | null;
				monthly_searches?: { search_volume?: number }[];
			}[]
		>
	>(`${BASE}/keywords_data/google_ads/search_volume/live`, {
		method: "POST",
		headers: {
			authorization: `Basic ${auth}`,
			"content-type": "application/json",
		},
		body: JSON.stringify(body),
	});

	const rows = unwrap(data) ?? [];
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

/**
 * Live credential check for the health endpoint. Uses the free `user_data`
 * endpoint so polling costs nothing; an empty balance is the failure that most
 * often shows up as "every keyword came back without volume".
 */
export async function dataForSeoStatus(
	env: unknown,
): Promise<{ ok: boolean; detail?: string; balance?: number }> {
	const c = getConfig(env);
	if (!c.DATAFORSEO_LOGIN || !c.DATAFORSEO_PASSWORD) {
		return { ok: false, detail: "DATAFORSEO_LOGIN/PASSWORD não configurados." };
	}
	const auth = btoa(`${c.DATAFORSEO_LOGIN}:${c.DATAFORSEO_PASSWORD}`);
	try {
		const data = await httpJson<Envelope<{ money?: { balance?: number } }[]>>(
			`${BASE}/appendix/user_data`,
			{
				headers: { authorization: `Basic ${auth}` },
			},
		);
		const balance = unwrap(data)?.[0]?.money?.balance ?? 0;
		return balance > 0
			? { ok: true, balance }
			: {
					ok: false,
					balance,
					detail: "Saldo do DataForSEO zerado — as consultas não são cobradas.",
				};
	} catch (error) {
		return {
			ok: false,
			detail: error instanceof Error ? error.message : "Falha desconhecida",
		};
	}
}
