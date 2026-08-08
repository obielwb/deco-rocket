import { describe, expect, test } from "bun:test";
import { ReportSchema } from "../api/lib/types.ts";
import { tools } from "../api/tools/index.ts";
import { researchRun } from "../api/tools/research.ts";
import type { Env } from "../api/types/env.ts";

function makeEnv(state: Record<string, string> = {}): Env {
	return {
		MESH_REQUEST_CONTEXT: { state },
		IS_LOCAL: true,
	} as unknown as Env;
}

function runtimeContext(env: Env) {
	return { env, ctx: { waitUntil: () => {} } };
}

const hasSerp = !!process.env.SERPAPI_KEY;

describe("tool registry", () => {
	test("exposes all expected tools", () => {
		const ids = tools.map((t) => t(makeEnv()).id);
		expect(ids).toContain("RESEARCH_RUN");
		expect(ids).toContain("TREND_GOOGLE_FETCH");
		expect(ids).toContain("KEYWORD_VOLUME");
		expect(ids).toContain("SHOPPING_SCAN");
		expect(ids).toContain("SOCIAL_VIRAL_SCAN");
		expect(ids).toContain("CATALOG_GAP_ANALYSIS");
		expect(ids).toContain("OPPORTUNITY_SCORE");
		expect(ids).toContain("PRODUCT_CONCEPT_GEN");
		expect(ids).toContain("SUPPLIER_SOURCE");
		expect(ids).toContain("COPY_GEN");
		expect(ids).toContain("IMAGE_CONCEPT_GEN");
	});
});

describe("RESEARCH_RUN graceful degradation", () => {
	test("returns a schema-valid Report even with no credentials", async () => {
		// Empty values intentionally shadow Bun's auto-loaded local .env.
		const env = makeEnv({
			SERPAPI_KEY: "",
			DATAFORSEO_LOGIN: "",
			DATAFORSEO_PASSWORD: "",
			ANTHROPIC_API_KEY: "",
			GEMINI_API_KEY: "",
			OPENAI_API_KEY: "",
			OPENAI_TEXT_MODEL: "",
			VTEX_ACCOUNT: "",
		});
		const tool = researchRun(env);
		const result = await tool.execute({
			context: { seed: "garrafa térmica", topN: 1, maxCandidates: 2 },
			runtimeContext: runtimeContext(env),
		});
		// Report must always validate, regardless of which providers were available.
		const parsed = ReportSchema.parse(result);
		expect(parsed.seed).toBe("garrafa térmica");
		expect(Array.isArray(parsed.briefs)).toBe(true);
		expect(Array.isArray(parsed.degraded)).toBe(true);
		// With no SerpApi/DataForSEO/VTEX/Anthropic keys, these must be flagged.
		expect(parsed.degraded).toContain("google_trends");
	}, 30000);
});

describe("RESEARCH_RUN integration (requires SERPAPI_KEY)", () => {
	test.if(hasSerp)(
		"produces at least one scored opportunity from real trends",
		async () => {
			const env = makeEnv({
				SERPAPI_KEY: process.env.SERPAPI_KEY as string,
				OPENAI_API_KEY: "",
				...(process.env.ANTHROPIC_API_KEY
					? { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY }
					: {}),
			});
			const tool = researchRun(env);
			const result = await tool.execute({
				context: { seed: "garrafa térmica", topN: 1, maxCandidates: 4 },
				runtimeContext: runtimeContext(env),
			});
			const parsed = ReportSchema.parse(result);
			expect(parsed.briefs.length).toBeGreaterThan(0);
			expect(parsed.briefs[0].opportunity.score).toBeGreaterThanOrEqual(0);
		},
		120000,
	);
});
