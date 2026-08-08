import { createTool } from "@decocms/runtime/tools";
import { z } from "zod";
import { completeJson } from "../clients/anthropic.ts";
import type { Copy, Opportunity, ProductConcept } from "../lib/types.ts";
import {
	CopySchema,
	OpportunitySchema,
	ProductConceptSchema,
} from "../lib/types.ts";
import type { Env } from "../types/env.ts";

/** Reusable step: opportunity → product concept (also used by RESEARCH_RUN). */
export async function generateConcept(
	env: unknown,
	opportunity: Opportunity,
	store?: string | null,
	context?: {
		profile?: string | null;
		audience?: string | null;
		collections?: string[];
	},
): Promise<ProductConcept> {
	const o = opportunity;
	const priceHint = o.market?.priceMedian ?? o.market?.priceMin ?? null;
	return completeJson<ProductConcept>(env, {
		system:
			"You are a senior product manager for a Brazilian e-commerce operation. Design commercially viable, specific products. Write in Brazilian Portuguese. Prices in BRL.",
		prompt: `Crie um conceito de produto para a oportunidade de mercado abaixo.

Palavra-chave/nicho: ${o.keyword}
Loja: ${store ?? "loja de e-commerce brasileira"}
Perfil de pesquisa: ${context?.profile ?? "geral"}
Público desejado: ${context?.audience ?? "a definir com os sinais de mercado"}
Coleções relacionadas da loja: ${context?.collections?.join(", ") || "nenhuma selecionada"}
Score de oportunidade: ${o.score}/100 (${o.rationale})
Faixa de preço de mercado: ${priceHint ? `~R$${priceHint}` : "desconhecida"}
Concorrentes observados: ${o.market?.competitorCount ?? "?"}
Sub-tendências em alta: ${
			o.trend?.risingQueries
				?.map((r) => r.query)
				.slice(0, 5)
				.join(", ") || "—"
		}

Retorne JSON com as chaves EXATAS:
{
 "name": string,
 "tagline": string,
 "positioning": string,
 "targetAudience": string,
 "keySpecs": string[] (4-6 specs concretas),
 "differentiators": string[] (2-4),
 "suggestedPrice": number (BRL, sem símbolo)
}`,
	});
}

/** Reusable step: product concept → marketing copy. */
export async function generateCopy(
	env: unknown,
	concept: ProductConcept,
	keyword: string,
): Promise<Copy> {
	return completeJson<Copy>(env, {
		system:
			"You are an e-commerce copywriter. Persuasive, SEO-aware, honest copy in Brazilian Portuguese.",
		prompt: `Produto: ${concept.name} — ${concept.tagline}
Posicionamento: ${concept.positioning}
Público: ${concept.targetAudience}
Specs: ${concept.keySpecs.join("; ")}
Keyword principal: ${keyword}

Retorne JSON com as chaves EXATAS:
{
 "productTitle": string (título de vitrine, <= 70 chars),
 "seoTitle": string (<= 60 chars),
 "metaDescription": string (<= 155 chars),
 "pdpDescription": string (2-3 parágrafos, markdown permitido),
 "adCopies": string[] (3 variações curtas para anúncio)
}`,
	});
}

const conceptAnnotations = {
	readOnlyHint: true,
	destructiveHint: false,
	idempotentHint: false,
	openWorldHint: true,
};

/** Pilar 2 — turn a scored opportunity into a concrete product concept (LLM). */
export const productConceptGen = (env: Env) =>
	createTool({
		id: "PRODUCT_CONCEPT_GEN",
		description:
			"Generate a concrete product concept (name, positioning, specs, target audience, differentiators, suggested price) from a scored market opportunity. Requires ANTHROPIC_API_KEY.",
		inputSchema: z.object({
			opportunity: OpportunitySchema,
			store: z.string().nullable().optional(),
		}),
		outputSchema: z.object({ concept: ProductConceptSchema }),
		annotations: conceptAnnotations,
		execute: async ({ context }) => ({
			concept: await generateConcept(env, context.opportunity, context.store),
		}),
	});

/** Pilar 3 — marketing copy (title, SEO, PDP, ads) for a product concept (LLM). */
export const copyGen = (env: Env) =>
	createTool({
		id: "COPY_GEN",
		description:
			"Generate marketing copy for a product concept: product title, SEO title + meta description, PDP description and 3 ad copy variations. Requires ANTHROPIC_API_KEY.",
		inputSchema: z.object({
			concept: ProductConceptSchema,
			keyword: z.string(),
		}),
		outputSchema: z.object({ copy: CopySchema }),
		annotations: conceptAnnotations,
		execute: async ({ context }) => ({
			copy: await generateCopy(env, context.concept, context.keyword),
		}),
	});
