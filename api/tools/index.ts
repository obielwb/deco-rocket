import { catalogGapAnalysis } from "./catalog.ts";
import { copyGen, productConceptGen } from "./concept.ts";
import { imageConceptGen } from "./creative.ts";
import { researchRun } from "./research.ts";
import { opportunityScore } from "./score.ts";
import { supplierSource } from "./sourcing.ts";
import {
	keywordVolumeTool,
	shoppingScan,
	socialViralScan,
	trendGoogleFetch,
} from "./trends.ts";

export const tools = [
	// Orchestrator (one-shot end-to-end)
	researchRun,
	// Pilar 1 — trend intelligence
	trendGoogleFetch,
	keywordVolumeTool,
	shoppingScan,
	socialViralScan,
	catalogGapAnalysis,
	// Pilar 2 — concept & sourcing
	opportunityScore,
	productConceptGen,
	supplierSource,
	// Pilar 3 — creative
	copyGen,
	imageConceptGen,
];
