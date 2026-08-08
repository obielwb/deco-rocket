import { createTool } from "@decocms/runtime/tools";
import { z } from "zod";
import {
	generateImage,
	type ImageGenerationOptions,
} from "../clients/image.ts";
import type { CreativeType, ProductConcept } from "../lib/types.ts";
import { CreativeTypeSchema, ProductConceptSchema } from "../lib/types.ts";
import type { Env } from "../types/env.ts";

const DEFAULT_STORE_STYLE =
	"Pop editorial urbano: fundos chapados verde-lima ou lilás, padrões geométricos tonais modulares, produto preto em recorte grande, luz frontal de estúdio, contraste alto e espaço negativo.";

const CREATIVE_DIRECTIONS: Record<CreativeType, string> = {
	product_hero:
		"Square product-catalog image. Show one complete product at a three-quarter angle, centered, occupying about 72% of the frame, with a subtle grounded shadow.",
	social_ad:
		"Vertical 4:5 social campaign image. Use an assertive close crop, dynamic asymmetry and at least 30% clean negative space for copy that will be added later.",
	collection_banner:
		"Wide 16:9 storefront hero. Place the product or model on the right half, keep the left half intentionally open for headline and CTA overlays, and continue the tonal pattern across the background.",
};

export function creativeImageOptions(
	type: CreativeType,
	referenceImages?: string[],
): ImageGenerationOptions {
	const sizes: Record<CreativeType, ImageGenerationOptions["size"]> = {
		product_hero: "1024x1024",
		social_ad: "1024x1280",
		collection_banner: "1536x864",
	};
	return { size: sizes[type], quality: "high", referenceImages };
}

/** Deterministic hero-image prompt from a product concept. */
export function buildImagePrompt(concept: ProductConcept): string {
	return buildCreativePrompt(concept, "product_hero");
}

export function buildCreativePrompt(
	concept: ProductConcept,
	type: CreativeType,
	storeStyle?: string | null,
): string {
	return `Create a high-end e-commerce campaign photograph for this new product concept.

PRODUCT
- Name: ${concept.name}
- Promise: ${concept.tagline}
- Positioning: ${concept.positioning}
- Essential physical features: ${concept.keySpecs.join(", ")}

STORE VISUAL DNA
${storeStyle || DEFAULT_STORE_STYLE}
- Use a saturated solid lime-green OR periwinkle-lilac background, selected for the strongest contrast with the product.
- Add a restrained grid of large tonal geometric tiles in the background. Keep the pattern flat, subtle and secondary to the product.
- Favor black or charcoal product surfaces with one precise lime accent when compatible with the concept.
- Use crisp frontal studio lighting, realistic material texture, clean cutout edges, controlled highlights and a soft contact shadow.
- The result should feel playful, young and graphic, but still like premium commercial product photography.

COMPOSITION
${CREATIVE_DIRECTIONS[type]}

REFERENCE RULES
The attached storefront images are style references only. Preserve their color logic, lighting, crop, negative-space strategy and modular background rhythm. Do not reproduce their people, products, logos, letters, symbols or exact tile artwork.

HARD CONSTRAINTS
No logo, brand name, watermark, embedded copy, letters, numbers, UI, border, collage, duplicate product, random props or invented packaging. Produce one polished final photograph, not a mockup or moodboard.`;
}

export interface ConceptImageOptions {
	creativeType?: CreativeType;
	referenceImages?: string[];
}

/** Reusable step: concept -> creative data URI + the prompt used. */
export async function generateConceptImage(
	env: unknown,
	concept: ProductConcept,
	promptOverride?: string,
	options: ConceptImageOptions = {},
): Promise<{ imageUrl: string | null; prompt: string }> {
	const creativeType = options.creativeType ?? "product_hero";
	const prompt = promptOverride ?? buildCreativePrompt(concept, creativeType);
	const imageUrl = await generateImage(
		env,
		prompt,
		creativeImageOptions(creativeType, options.referenceImages),
	).catch(() => null);
	return { imageUrl, prompt };
}

/** Pilar 3: generate a store-aligned concept creative. */
export const imageConceptGen = (env: Env) =>
	createTool({
		id: "IMAGE_CONCEPT_GEN",
		description:
			"Generate a product creative using store imagery as visual references. Returns a data URI and degrades gracefully when no image provider is configured.",
		inputSchema: z.object({
			concept: ProductConceptSchema,
			promptOverride: z.string().optional(),
			creativeType: CreativeTypeSchema.optional(),
			referenceImages: z.array(z.string().url()).max(3).optional(),
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
				{
					creativeType: context.creativeType,
					referenceImages: context.referenceImages,
				},
			);
			return { imageUrl, prompt, degraded: imageUrl == null };
		},
	});
