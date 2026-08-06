import { createPublicPrompt } from "@decocms/runtime/tools";
import { z } from "zod";
import type { Env } from "../types/env.ts";

export const researchPrompt = (_env: Env) =>
	createPublicPrompt({
		name: "research_product",
		title: "Research a product opportunity",
		description:
			"Run end-to-end product research for a niche and produce a Product Opportunity Report.",
		argsSchema: {
			seed: z
				.string()
				.describe("Seed niche or product term (e.g. 'garrafa térmica')"),
		},
		execute: async ({ args }) => ({
			messages: [
				{
					role: "user" as const,
					content: {
						type: "text" as const,
						text: `Use the RESEARCH_RUN tool with seed "${args.seed ?? "produtos em alta"}" to research market trends, find catalog whitespace, and generate a Product Opportunity Report with concepts, supplier cost, images and copy.`,
					},
				},
			],
		}),
	});
