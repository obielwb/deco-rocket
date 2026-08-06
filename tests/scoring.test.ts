import { describe, expect, test } from "bun:test";
import type { ScoreInputs } from "../api/lib/scoring.ts";
import {
	rankOpportunities,
	scoreOpportunity,
	WEIGHTS,
} from "../api/lib/scoring.ts";

const base: ScoreInputs = {
	keyword: "test",
	trend: null,
	volume: null,
	market: null,
	gap: null,
};

describe("scoreOpportunity", () => {
	test("weights sum to 1", () => {
		const sum = Object.values(WEIGHTS).reduce((s, v) => s + v, 0);
		expect(sum).toBeCloseTo(1, 5);
	});

	test("returns a 0-100 score with full breakdown", () => {
		const o = scoreOpportunity(base);
		expect(o.score).toBeGreaterThanOrEqual(0);
		expect(o.score).toBeLessThanOrEqual(100);
		for (const k of [
			"demand",
			"momentum",
			"competition",
			"margin",
			"fit",
		] as const) {
			expect(o.breakdown[k]).toBeGreaterThanOrEqual(0);
			expect(o.breakdown[k]).toBeLessThanOrEqual(100);
		}
	});

	test("higher search volume raises demand", () => {
		const low = scoreOpportunity({
			...base,
			volume: {
				keyword: "x",
				searchVolume: 100,
				competition: null,
				cpc: null,
				trendMonthly: [],
			},
		});
		const high = scoreOpportunity({
			...base,
			volume: {
				keyword: "x",
				searchVolume: 50000,
				competition: null,
				cpc: null,
				trendMonthly: [],
			},
		});
		expect(high.breakdown.demand).toBeGreaterThan(low.breakdown.demand);
	});

	test("breakout trend boosts momentum", () => {
		const flat = scoreOpportunity({
			...base,
			trend: {
				keyword: "x",
				timeline: [],
				avgInterest: 50,
				momentum: 0,
				risingQueries: [],
				isBreakout: false,
				source: "google_trends",
			},
		});
		const breakout = scoreOpportunity({
			...base,
			trend: {
				keyword: "x",
				timeline: [],
				avgInterest: 50,
				momentum: 80,
				risingQueries: [{ query: "y", growth: "Breakout" }],
				isBreakout: true,
				source: "google_trends",
			},
		});
		expect(breakout.breakdown.momentum).toBeGreaterThan(
			flat.breakdown.momentum,
		);
	});

	test("whitespace (not in catalog) scores higher fit than stocked", () => {
		const stocked = scoreOpportunity({
			...base,
			gap: { keyword: "x", inCatalog: true, catalogMatches: 5 },
		});
		const whitespace = scoreOpportunity({
			...base,
			gap: { keyword: "x", inCatalog: false, catalogMatches: 0 },
		});
		expect(whitespace.breakdown.fit).toBeGreaterThan(stocked.breakdown.fit);
	});

	test("fewer competitors raises competition score", () => {
		const crowded = scoreOpportunity({
			...base,
			market: {
				keyword: "x",
				offers: [],
				priceMin: 10,
				priceMax: 100,
				priceMedian: 50,
				competitorCount: 20,
				avgRating: null,
				totalReviews: 0,
			},
		});
		const sparse = scoreOpportunity({
			...base,
			market: {
				keyword: "x",
				offers: [],
				priceMin: 10,
				priceMax: 100,
				priceMedian: 50,
				competitorCount: 2,
				avgRating: null,
				totalReviews: 0,
			},
		});
		expect(sparse.breakdown.competition).toBeGreaterThan(
			crowded.breakdown.competition,
		);
	});
});

describe("rankOpportunities", () => {
	test("sorts descending by score", () => {
		const ranked = rankOpportunities([
			{ ...scoreOpportunity(base), score: 30 },
			{ ...scoreOpportunity(base), score: 80 },
			{ ...scoreOpportunity(base), score: 55 },
		]);
		expect(ranked.map((o) => o.score)).toEqual([80, 55, 30]);
	});
});
