import { describe, expect, test } from "bun:test";
import { ResearchConfigSchema } from "../api/lib/types.ts";
import {
	buildCreativePrompt,
	creativeImageOptions,
} from "../api/tools/creative.ts";

const concept = {
	name: "FlexBag Modular",
	tagline: "Organização urbana em movimento",
	positioning: "Bolsa compacta para a rotina mobile-first.",
	targetAudience: "Jovens urbanos",
	keySpecs: ["nylon preto", "alça modular", "bolso para smartphone"],
	differentiators: ["módulos removíveis"],
	suggestedPrice: 249,
};

describe("store-aligned creative generation", () => {
	test("encodes the storefront visual DNA without copying brand assets", () => {
		const prompt = buildCreativePrompt(concept, "collection_banner");

		expect(prompt).toContain("lime-green OR periwinkle-lilac");
		expect(prompt).toContain("tonal geometric tiles");
		expect(prompt).toContain("style references only");
		expect(prompt).toContain("Do not reproduce");
		expect(prompt).toContain("Wide 16:9 storefront hero");
	});

	test("uses a native output ratio for each creative type", () => {
		expect(creativeImageOptions("product_hero").size).toBe("1024x1024");
		expect(creativeImageOptions("social_ad").size).toBe("1024x1280");
		expect(creativeImageOptions("collection_banner").size).toBe("1536x864");
	});

	test("keeps old reports compatible when references are absent", () => {
		const config = ResearchConfigSchema.parse({});
		expect(config.referenceImages).toEqual([]);
	});
});
