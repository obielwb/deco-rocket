import { completeJson, hasLlmCredential } from "../clients/anthropic.ts";
import type { RfqTier, SupplierQuote } from "./types.ts";

export interface BuildRfqArgs {
	product: string;
	specs?: string[];
	costHint?: number | null;
	quantities?: number[];
	rfqId: string;
}

const DEFAULT_QTYS = [100, 500, 1000];

/** Compose a structured RFQ e-mail. The subject carries `[RFQ-<id>]` so inbound
 *  replies can be correlated back to the thread. */
export function buildRfqEmail(args: BuildRfqArgs): {
	subject: string;
	body: string;
} {
	const qtys = args.quantities?.length ? args.quantities : DEFAULT_QTYS;
	const specs = args.specs?.length ? args.specs.join("; ") : "a definir";
	const subject = `Solicitação de cotação (RFQ) — ${args.product} [RFQ-${args.rfqId}]`;
	const body = `Olá,

Estamos avaliando incluir o produto abaixo em nosso catálogo e gostaríamos de uma cotação:

Produto: ${args.product}
Especificações: ${specs}
${args.costHint != null ? `Referência de custo-alvo: ~R$${args.costHint}/un\n` : ""}
Por favor, informe:
- Preço unitário por faixa de quantidade (${qtys.join(" / ")})
- MOQ (quantidade mínima) e prazo de produção
- Prazo e custo de entrega
- Condições de pagamento

Responda a este e-mail mantendo o código ${`[RFQ-${args.rfqId}]`} no assunto.

Obrigado,
Equipe de Compras`;
	return { subject, body };
}

/** Legacy single-string draft (kept for the Sourcing.rfqDraft field). */
export function buildRfqDraft(args: BuildRfqArgs): string {
	const { subject, body } = buildRfqEmail(args);
	return `Assunto: ${subject}\n\n${body}`;
}

// --- Response parsing ---

function parseBRNumber(raw: string): number | null {
	const cleaned = raw.trim().replace(/\./g, "").replace(",", ".");
	const n = Number(cleaned);
	return Number.isFinite(n) ? n : null;
}

/** Deterministic regex fallback: extract price tiers, MOQ and lead time. */
export function heuristicParse(text: string): SupplierQuote {
	const tiers: RfqTier[] = [];
	// "100 unidades ... R$ 12,50" → tier
	const tierRe =
		/(\d{2,6})\s*(?:un(?:idades)?|pc?s|peças|pe[çc]as)[^R$]{0,40}?R\$\s?([\d.,]+)/gi;
	let m: RegExpExecArray | null;
	// biome-ignore lint/suspicious/noAssignInExpressions: standard regex exec loop
	while ((m = tierRe.exec(text)) !== null) {
		const qty = Number(m[1]);
		const unitPrice = parseBRNumber(m[2]);
		if (qty && unitPrice != null) tiers.push({ qty, unitPrice });
	}

	const moqMatch =
		text.match(/MOQ[^\d]{0,12}(\d{2,6})/i) ??
		text.match(/m[íi]nim[oa][^\d]{0,20}(\d{2,6})/i);
	const moq = moqMatch ? Number(moqMatch[1]) : null;

	const leadMatch = text.match(/(\d{1,3})\s*dias/i);
	const leadTimeDays = leadMatch ? Number(leadMatch[1]) : null;

	const payMatch = text.match(/pagamento[:\s][^\n.]{0,80}/i);
	const paymentTerms = payMatch
		? payMatch[0].replace(/pagamento[:\s]*/i, "").trim()
		: null;

	return {
		supplierName: null,
		currency: "BRL",
		tiers,
		moq,
		leadTimeDays,
		paymentTerms,
		shipping: null,
		rawNotes: text.slice(0, 2000),
		parsedAt: new Date().toISOString(),
	};
}

/**
 * Extract a structured supplier quote from a reply. Uses whichever LLM provider
 * is configured; without any credential (or on failure) falls back to the
 * deterministic heuristic so the webhook and tests work offline. Gating this on
 * ANTHROPIC_API_KEY alone silently skipped the LLM on OpenAI-only setups.
 */
export async function parseQuote(
	env: unknown,
	text: string,
): Promise<SupplierQuote> {
	if (!hasLlmCredential(env)) return heuristicParse(text);

	try {
		const parsed = await completeJson<Omit<SupplierQuote, "parsedAt">>(env, {
			system:
				"You extract structured B2B supplier quotes from e-mail replies. Prices in the reply's currency (assume BRL if unclear). Use null for anything not stated.",
			maxTokens: 800,
			prompt: `Extraia a cotação do texto abaixo. Retorne JSON com as chaves EXATAS:
{
 "supplierName": string|null,
 "currency": string,
 "tiers": [{"qty": number, "unitPrice": number}],
 "moq": number|null,
 "leadTimeDays": number|null,
 "paymentTerms": string|null,
 "shipping": string|null,
 "rawNotes": string
}

Resposta do fornecedor:
"""
${text.slice(0, 4000)}
"""`,
		});
		return { ...parsed, parsedAt: new Date().toISOString() };
	} catch {
		return heuristicParse(text);
	}
}
