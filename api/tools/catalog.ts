import { createTool } from "@decocms/runtime/tools";
import { z } from "zod";
import { searchCatalog, storeName } from "../clients/vtex.ts";
import { CatalogGapSchema } from "../lib/types.ts";
import type { Env } from "../types/env.ts";

/**
 * Pilar 1 → bridge to store: cross-references trending keywords against the
 * live VTEX catalog to find WHITESPACE — demand the store isn't capturing yet.
 */
export const catalogGapAnalysis = (env: Env) =>
	createTool({
		id: "CATALOG_GAP_ANALYSIS",
		description:
			"Cross-reference candidate keywords against the store's live VTEX catalog to find whitespace (trending demand the store does NOT currently sell). Requires VTEX_ACCOUNT.",
		inputSchema: z.object({
			keywords: z
				.array(z.string())
				.min(1)
				.describe("Candidate product keywords"),
		}),
		outputSchema: z.object({
			store: z.string().nullable(),
			gaps: z.array(CatalogGapSchema),
			degraded: z.boolean(),
		}),
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: true,
		},
		execute: async ({ context }) => {
			const store = storeName(env);
			const results = await Promise.all(
				context.keywords.map(async (keyword) => {
					const hit = await searchCatalog(env, keyword).catch(() => null);
					if (!hit) return { keyword, found: null as null };
					return { keyword, found: hit };
				}),
			);

			const anyResolved = results.some((r) => r.found !== null);
			const gaps = results.map((r) => ({
				keyword: r.keyword,
				inCatalog: r.found ? r.found.count > 0 : false,
				catalogMatches: r.found?.count ?? 0,
				sampleMatch: r.found?.sample,
			}));

			return { store, gaps, degraded: !anyResolved };
		},
	});
