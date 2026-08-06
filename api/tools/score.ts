import { createTool } from "@decocms/runtime/tools";
import { z } from "zod";
import {
	rankOpportunities,
	scoreOpportunity,
	WEIGHTS,
} from "../lib/scoring.ts";
import {
	CatalogGapSchema,
	KeywordVolumeSchema,
	MarketSnapshotSchema,
	OpportunitySchema,
	TrendSignalSchema,
} from "../lib/types.ts";
import type { Env } from "../types/env.ts";

/**
 * Pilar 2 — combine every market signal into a single transparent opportunity
 * score with an auditable breakdown (demand, momentum, competition, margin, fit).
 */
export const opportunityScore = (_env: Env) =>
	createTool({
		id: "OPPORTUNITY_SCORE",
		description:
			"Combine trend, keyword-volume, market and catalog-gap signals into a ranked opportunity score (0-100) with an explicit weighted breakdown. Pure scoring — no external calls.",
		inputSchema: z.object({
			candidates: z
				.array(
					z.object({
						keyword: z.string(),
						trend: TrendSignalSchema.nullable().optional(),
						volume: KeywordVolumeSchema.nullable().optional(),
						market: MarketSnapshotSchema.nullable().optional(),
						gap: CatalogGapSchema.nullable().optional(),
					}),
				)
				.min(1),
		}),
		outputSchema: z.object({
			opportunities: z.array(OpportunitySchema),
			weights: z.record(z.string(), z.number()),
		}),
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
		execute: async ({ context }) => {
			const scored = context.candidates.map((c) =>
				scoreOpportunity({
					keyword: c.keyword,
					trend: c.trend ?? null,
					volume: c.volume ?? null,
					market: c.market ?? null,
					gap: c.gap ?? null,
				}),
			);
			return {
				opportunities: rankOpportunities(scored),
				weights: { ...WEIGHTS },
			};
		},
	});
