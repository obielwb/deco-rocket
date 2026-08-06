import { httpJson } from "../lib/http.ts";
import type { SupplierOffer } from "../lib/types.ts";

/**
 * Mercado Livre public search — used as a supplier/cost SIGNAL (analogous
 * products, sellers, and price floor) rather than a true procurement channel.
 * No credential required; degrades to null if the public endpoint is gated.
 */
export async function searchMercadoLivre(
	query: string,
	site = "MLB",
): Promise<SupplierOffer[] | null> {
	try {
		const url = `https://api.mercadolibre.com/sites/${site}/search?q=${encodeURIComponent(query)}&limit=20`;
		const data = await httpJson<{
			results?: {
				title: string;
				price?: number;
				currency_id?: string;
				seller?: { nickname?: string };
				permalink?: string;
				thumbnail?: string;
			}[];
		}>(url, { timeoutMs: 20000 });

		return (data.results ?? []).map((r) => ({
			title: r.title,
			priceCost: r.price ?? null,
			currency: r.currency_id ?? "BRL",
			sellerName: r.seller?.nickname,
			link: r.permalink,
			thumbnail: r.thumbnail,
		}));
	} catch {
		return null;
	}
}
