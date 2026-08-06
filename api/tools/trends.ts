import { createTool } from "@decocms/runtime/tools";
import { z } from "zod";
import { keywordVolume } from "../clients/dataforseo.ts";
import { googleShopping, googleTrends } from "../clients/serpapi.ts";
import {
	KeywordVolumeSchema,
	MarketSnapshotSchema,
	TrendSignalSchema,
} from "../lib/types.ts";
import type { Env } from "../types/env.ts";

const keywordsInput = z.object({
	keywords: z
		.array(z.string())
		.min(1)
		.describe("Seed keywords / niche terms to research"),
});

const readOnly = {
	readOnlyHint: true,
	destructiveHint: false,
	idempotentHint: true,
	openWorldHint: true,
};

/** Pilar 1 — Google Trends interest-over-time + rising queries (SerpApi). */
export const trendGoogleFetch = (env: Env) =>
	createTool({
		id: "TREND_GOOGLE_FETCH",
		description:
			"Fetch Google Trends interest-over-time and rising related queries for seed keywords. Reveals demand momentum and emerging (breakout) sub-trends. Requires SERPAPI_KEY.",
		inputSchema: keywordsInput,
		outputSchema: z.object({
			signals: z.array(TrendSignalSchema),
			degraded: z.boolean(),
		}),
		annotations: readOnly,
		execute: async ({ context }) => {
			const results = await Promise.all(
				context.keywords.map((k) => googleTrends(env, k).catch(() => null)),
			);
			const signals = results.filter(
				(s): s is NonNullable<typeof s> => s != null,
			);
			return { signals, degraded: signals.length < context.keywords.length };
		},
	});

/** Pilar 1 — Keyword search volume, competition and CPC (DataForSEO). */
export const keywordVolumeTool = (env: Env) =>
	createTool({
		id: "KEYWORD_VOLUME",
		description:
			"Get monthly search volume, competition index and CPC for keywords via DataForSEO. Quantifies real demand. Requires DATAFORSEO_LOGIN/PASSWORD.",
		inputSchema: keywordsInput,
		outputSchema: z.object({
			volumes: z.array(KeywordVolumeSchema),
			degraded: z.boolean(),
		}),
		annotations: readOnly,
		execute: async ({ context }) => {
			const volumes = await keywordVolume(env, context.keywords).catch(
				() => null,
			);
			if (!volumes) {
				return {
					volumes: context.keywords.map((keyword) => ({
						keyword,
						searchVolume: null,
						competition: null,
						cpc: null,
						trendMonthly: [],
					})),
					degraded: true,
				};
			}
			return { volumes, degraded: false };
		},
	});

/** Pilar 1 — Competitive market snapshot from Google Shopping (SerpApi). */
export const shoppingScan = (env: Env) =>
	createTool({
		id: "SHOPPING_SCAN",
		description:
			"Scan Google Shopping for a keyword: price band (min/median/max), competitor count, ratings and review volume. Proxy for competition and margin headroom. Requires SERPAPI_KEY.",
		inputSchema: keywordsInput,
		outputSchema: z.object({
			snapshots: z.array(MarketSnapshotSchema),
			degraded: z.boolean(),
		}),
		annotations: readOnly,
		execute: async ({ context }) => {
			const results = await Promise.all(
				context.keywords.map((k) => googleShopping(env, k).catch(() => null)),
			);
			const snapshots = results.filter(
				(s): s is NonNullable<typeof s> => s != null,
			);
			return {
				snapshots,
				degraded: snapshots.length < context.keywords.length,
			};
		},
	});

/** Pilar 1 — Emerging/viral demand signal from breakout related queries. */
export const socialViralScan = (env: Env) =>
	createTool({
		id: "SOCIAL_VIRAL_SCAN",
		description:
			"Detect emerging/viral demand around seed keywords using breakout related-query signals (real emerging-demand proxy). Surfaces sub-trends spiking now. Requires SERPAPI_KEY.",
		inputSchema: keywordsInput,
		outputSchema: z.object({
			signals: z.array(
				z.object({
					keyword: z.string(),
					isBreakout: z.boolean(),
					risingQueries: z.array(
						z.object({ query: z.string(), growth: z.string() }),
					),
				}),
			),
			note: z.string(),
			degraded: z.boolean(),
		}),
		annotations: readOnly,
		execute: async ({ context }) => {
			const results = await Promise.all(
				context.keywords.map((k) => googleTrends(env, k).catch(() => null)),
			);
			const signals = results
				.filter((s): s is NonNullable<typeof s> => s != null)
				.map((s) => ({
					keyword: s.keyword,
					isBreakout: s.isBreakout,
					risingQueries: s.risingQueries,
				}));
			return {
				signals,
				note: "Emerging-demand signal derived from Google Trends breakout related queries. Swap in TikTok Creative Center / Meta Ad Library for platform-native virality.",
				degraded: signals.length < context.keywords.length,
			};
		},
	});
