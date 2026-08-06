import { defaults, getConfig } from "../config.ts";
import { httpJson } from "../lib/http.ts";

function baseUrl(env: unknown): string | null {
	const c = getConfig(env);
	if (!c.VTEX_ACCOUNT) return null;
	return `https://${c.VTEX_ACCOUNT}.${defaults.vtexEnv(c)}.com.br`;
}

function authHeaders(env: unknown): Record<string, string> {
	const c = getConfig(env);
	const h: Record<string, string> = { accept: "application/json" };
	if (c.VTEX_APP_KEY && c.VTEX_APP_TOKEN) {
		h["X-VTEX-API-AppKey"] = c.VTEX_APP_KEY;
		h["X-VTEX-API-AppToken"] = c.VTEX_APP_TOKEN;
	}
	return h;
}

interface VtexProduct {
	productName?: string;
	brand?: string;
	categories?: string[];
}

/** Full-text catalog search. Returns match count + a sample product name. */
export async function searchCatalog(
	env: unknown,
	term: string,
): Promise<{ count: number; sample?: string } | null> {
	const base = baseUrl(env);
	if (!base) return null;
	const url = `${base}/api/catalog_system/pub/products/search/?ft=${encodeURIComponent(term)}&_from=0&_to=9`;
	const products = await httpJson<VtexProduct[]>(url, {
		headers: authHeaders(env),
	});
	return {
		count: products.length,
		sample: products[0]?.productName,
	};
}

/** Store category tree (depth 3), flattened to category names. */
export async function categoryNames(env: unknown): Promise<string[] | null> {
	const base = baseUrl(env);
	if (!base) return null;
	const url = `${base}/api/catalog_system/pub/category/tree/3`;
	const tree = await httpJson<
		{
			name: string;
			children?: { name: string; children?: { name: string }[] }[];
		}[]
	>(url, { headers: authHeaders(env) });

	const names: string[] = [];
	for (const c1 of tree) {
		names.push(c1.name);
		for (const c2 of c1.children ?? []) {
			names.push(c2.name);
			for (const c3 of c2.children ?? []) names.push(c3.name);
		}
	}
	return names;
}

export function storeName(env: unknown): string | null {
	return getConfig(env).VTEX_ACCOUNT ?? null;
}
