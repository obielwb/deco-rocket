import { describe, expect, test } from "bun:test";
import { LaunchProductRequestSchema } from "../api/launched-products.ts";
import { buildSourcePreviews } from "../api/lib/source-previews.ts";
import type { Opportunity } from "../api/lib/types.ts";

const opportunity: Opportunity = {
	keyword: "shoulder bag modular",
	score: 86,
	rationale: "Demanda em aceleração.",
	breakdown: { demand: 91, momentum: 88, competition: 74, margin: 82, fit: 94 },
	trend: {
		keyword: "shoulder bag modular",
		timeline: [{ date: "2026-08-01", value: 82 }],
		avgInterest: 74,
		momentum: 41,
		risingQueries: [{ query: "bolsa techwear", growth: "+180%" }],
		isBreakout: true,
		source: "google_trends",
	},
	volume: {
		keyword: "shoulder bag modular",
		searchVolume: 8200,
		competition: 0.37,
		cpc: 1.84,
		trendMonthly: [],
	},
	market: {
		keyword: "shoulder bag modular",
		offers: [],
		priceMin: 199,
		priceMax: 249,
		priceMedian: 219,
		competitorCount: 18,
		avgRating: 4.6,
		totalReviews: 2840,
	},
	gap: { keyword: "shoulder bag modular", inCatalog: false, catalogMatches: 0 },
};

describe("source previews", () => {
	test("keeps TikTok Shop explicitly estimated while marking real sources collected", () => {
		const previews = buildSourcePreviews(opportunity, [
			"google_trends",
			"social_viral",
			"google_shopping",
			"keyword_volume",
			"catalog",
		]);

		expect(previews).toHaveLength(5);
		expect(
			previews.find((item) => item.source === "google_trends")?.status,
		).toBe("collected");
		expect(
			previews.find((item) => item.source === "social_viral")?.status,
		).toBe("estimated");
		expect(
			previews.find((item) => item.source === "social_viral")?.note,
		).toContain("não consulta dados nativos");
	});

	test("validates a launch payload", () => {
		const parsed = LaunchProductRequestSchema.parse({
			reportId: "report-1",
			briefIndex: 0,
			name: "Shift Modular Bag",
			tagline: "Mude o formato.",
			description: "Bolsa modular para a rotina urbana.",
			price: 229,
			collection: "Accessories",
			imageUrl: "https://decoims.com/example.png",
			tags: ["nylon", "modular"],
		});
		expect(parsed.collection).toBe("Accessories");
	});
});
