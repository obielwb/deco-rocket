import { createTool } from "@decocms/runtime/tools";
import { z } from "zod";
import { searchMercadoLivre } from "../clients/mercadolivre.ts";
import type { ProductConcept, Sourcing } from "../lib/types.ts";
import { ProductConceptSchema, SourcingSchema } from "../lib/types.ts";
import type { Env } from "../types/env.ts";

function percentile(nums: number[], p: number): number | null {
	if (!nums.length) return null;
	const s = [...nums].sort((a, b) => a - b);
	const idx = Math.min(s.length - 1, Math.floor((p / 100) * s.length));
	return s[idx];
}

function buildRfq(
	product: string,
	specs: string[],
	costHint: number | null,
): string {
	return `Assunto: Solicitação de cotação (RFQ) — ${product}

Olá,

Estamos avaliando incluir o produto abaixo em nosso catálogo e gostaríamos de uma cotação:

Produto: ${product}
Especificações: ${specs.length ? specs.join("; ") : "a definir"}
Quantidade inicial (MOQ): 100 unidades (informe seu MOQ mínimo)
${costHint != null ? `Referência de custo-alvo: ~R$${costHint}/un` : ""}

Por favor, informe:
- Preço unitário por faixa de quantidade (100 / 500 / 1000)
- MOQ e prazo de produção
- Prazo e custo de entrega
- Condições de pagamento

Obrigado,
Equipe de Compras`;
}

/** Reusable step: keyword/concept → supplier cost signal + RFQ draft. */
export async function sourceSupplier(
	_env: unknown,
	args: {
		keyword: string;
		concept?: ProductConcept | null;
		suggestedRetailPrice?: number | null;
		/** Market prices (e.g. from Google Shopping) used as a cost fallback when
		 * the Mercado Livre public endpoint is gated. */
		fallbackPrices?: number[] | null;
	},
): Promise<Sourcing> {
	const offers = await searchMercadoLivre(args.keyword);
	const mlPrices = (offers ?? [])
		.map((o) => o.priceCost)
		.filter((p): p is number => p != null && p > 0);
	const prices = mlPrices.length
		? mlPrices
		: (args.fallbackPrices ?? []).filter((p) => p > 0);

	const priceFloor = percentile(prices, 25);
	const estimatedUnitCost =
		priceFloor != null ? Math.round(priceFloor * 0.6) : null;
	const retail =
		args.suggestedRetailPrice ??
		args.concept?.suggestedPrice ??
		percentile(prices, 50) ??
		null;
	const estimatedMarginPct =
		estimatedUnitCost != null && retail != null && retail > 0
			? Math.round(((retail - estimatedUnitCost) / retail) * 100)
			: null;

	const productName = args.concept?.name ?? args.keyword;
	return {
		keyword: args.keyword,
		offers: offers ?? [],
		estimatedUnitCost,
		suggestedRetailPrice: retail,
		estimatedMarginPct,
		rfqDraft: buildRfq(
			productName,
			args.concept?.keySpecs ?? [],
			estimatedUnitCost,
		),
		note: mlPrices.length
			? "Custo estimado a partir do piso de preço no Mercado Livre (proxy). Envie o RFQ ao fornecedor para custo real."
			: prices.length
				? "Mercado Livre indisponível; custo estimado a partir do piso de preço de mercado (Google Shopping). Envie o RFQ para custo real."
				: "Sem sinal de preço de mercado; RFQ gerado para cotação direta com fornecedor.",
	};
}

/**
 * Pilar 2 — supplier/cost signal via Mercado Livre + RFQ e-mail draft.
 */
export const supplierSource = (env: Env) =>
	createTool({
		id: "SUPPLIER_SOURCE",
		description:
			"Find supplier/cost signals for a product via Mercado Livre (analogous offers + price floor), estimate unit cost, suggested retail price and margin, and draft an RFQ e-mail for a supplier. No credential required.",
		inputSchema: z.object({
			keyword: z.string(),
			concept: ProductConceptSchema.nullable().optional(),
			suggestedRetailPrice: z.number().nullable().optional(),
		}),
		outputSchema: z.object({ sourcing: SourcingSchema }),
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: true,
		},
		execute: async ({ context }) => ({
			sourcing: await sourceSupplier(env, {
				keyword: context.keyword,
				concept: context.concept,
				suggestedRetailPrice: context.suggestedRetailPrice,
			}),
		}),
	});
