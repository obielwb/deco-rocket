import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createPublicResource } from "@decocms/runtime/tools";
import { REPORT_RESOURCE_URI } from "../tools/research.ts";
import type { Env } from "../types/env.ts";

const RESOURCE_MIME_TYPE = "text/html;profile=mcp-app";

function getDistPath(): string {
	const projectRoot = join(import.meta.dir, "../..");
	return join(projectRoot, "dist", "client", "index.html");
}

/** Serves the single-file report UI bundle as an MCP App resource. */
export const reportAppResource = (_env: Env) =>
	createPublicResource({
		uri: REPORT_RESOURCE_URI,
		name: "Product Opportunity Report",
		description: "Interactive Product Opportunity Report powered by MCP Apps",
		mimeType: RESOURCE_MIME_TYPE,
		read: async () => {
			const html = await readFile(getDistPath(), "utf-8");
			return {
				uri: REPORT_RESOURCE_URI,
				mimeType: RESOURCE_MIME_TYPE,
				text: html,
			};
		},
	});
