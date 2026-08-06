import { createTool } from "@decocms/runtime/tools";
import { z } from "zod";
import { generateImage } from "../clients/image.ts";
import type { ProductConcept } from "../lib/types.ts";
import { ProductConceptSchema } from "../lib/types.ts";
import type { Env } from "../types/env.ts";

/** Deterministic hero-image prompt from a product concept. */
export function buildImagePrompt(concept: ProductConcept): string {
	return `Professional e-commerce product hero photograph of "${concept.name}": ${concept.tagline}. ${concept.positioning}. Key features: ${concept.keySpecs.join(", ")}. Clean studio lighting, soft shadows, high detail, centered product, neutral seamless background, commercial photography, 1:1, photorealistic.`;
}

/** Reusable step: concept → hero image data URI + the prompt used. */
export async function generateConceptImage(
	env: unknown,
	concept: ProductConcept,
	promptOverride?: string,
): Promise<{ imageUrl: string | null; prompt: string }> {
	const prompt = promptOverride ?? buildImagePrompt(concept);
	const imageUrl = await generateImage(env, prompt).catch(() => null);
	return { imageUrl, prompt };
}

/**
 * Pilar 3 — generate a concept hero image (Gemini nano-banana / OpenAI gpt-image).
 */
export const imageConceptGen = (env: Env) =>
	createTool({
		id: "IMAGE_CONCEPT_GEN",
		description:
			"Generate a product concept hero image from a product concept using the configured image provider (Gemini nano-banana or OpenAI gpt-image). Returns a data: URI. Requires GEMINI_API_KEY or OPENAI_API_KEY.",
		inputSchema: z.object({
			concept: ProductConceptSchema,
			promptOverride: z.string().optional(),
		}),
		outputSchema: z.object({
			imageUrl: z.string().nullable(),
			prompt: z.string(),
			degraded: z.boolean(),
		}),
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: true,
		},
		execute: async ({ context }) => {
			const { imageUrl, prompt } = await generateConceptImage(
				env,
				context.concept,
				context.promptOverride,
			);
			return { imageUrl, prompt, degraded: imageUrl == null };
		},
	});
