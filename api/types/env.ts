import type { DefaultEnv } from "@decocms/runtime";
import { z } from "zod";

/**
 * StateSchema doubles as the app's `configSchema` in deco Studio: each install
 * fills these in the connection settings. Everything is optional so the app can
 * be installed and partially used even before every provider is wired — each
 * tool degrades gracefully when its credentials are missing.
 */
export const StateSchema = z.object({
	// Trend intelligence
	SERPAPI_KEY: z
		.string()
		.optional()
		.describe("SerpApi API key (Google Trends + Google Shopping)"),
	DATAFORSEO_LOGIN: z
		.string()
		.optional()
		.describe("DataForSEO login (keyword search volume)"),
	DATAFORSEO_PASSWORD: z.string().optional().describe("DataForSEO password"),

	// LLM (concept + copy generation)
	ANTHROPIC_API_KEY: z
		.string()
		.optional()
		.describe("Anthropic API key for concept & copy generation"),
	ANTHROPIC_MODEL: z
		.string()
		.optional()
		.describe("Anthropic model id (default: claude-sonnet-5)"),

	// Image generation
	IMAGE_PROVIDER: z
		.enum(["gemini", "openai"])
		.optional()
		.describe("Image provider (default: gemini / nano-banana)"),
	GEMINI_API_KEY: z
		.string()
		.optional()
		.describe("Google Gemini API key (nano-banana image)"),
	OPENAI_API_KEY: z.string().optional().describe("OpenAI API key (gpt-image)"),

	// Store catalog (VTEX)
	VTEX_ACCOUNT: z.string().optional().describe("VTEX account name"),
	VTEX_APP_KEY: z.string().optional().describe("VTEX app key"),
	VTEX_APP_TOKEN: z.string().optional().describe("VTEX app token"),
	VTEX_ENVIRONMENT: z
		.string()
		.optional()
		.describe("VTEX environment (default: vtexcommercestable)"),

	// RFQ Agent (supplier quote e-mails via Resend)
	RESEND_API_KEY: z
		.string()
		.optional()
		.describe("Resend API key for sending RFQ e-mails"),
	RFQ_FROM_EMAIL: z
		.string()
		.optional()
		.describe("Verified sender e-mail for RFQs (e.g. compras@loja.com)"),
	RFQ_FROM_NAME: z
		.string()
		.optional()
		.describe("Sender display name (default: Equipe de Compras)"),
	RFQ_INBOUND_DOMAIN: z
		.string()
		.optional()
		.describe("Inbound domain for reply plus-addressing (e.g. rfq.loja.com)"),
	RFQ_WEBHOOK_SECRET: z
		.string()
		.optional()
		.describe("Shared secret to authenticate the inbound RFQ webhook"),

	// Localization defaults
	GEO: z.string().optional().describe("Geo/country code (default: BR)"),
	LANG: z.string().optional().describe("Language code (default: pt-BR)"),
});

export type State = z.infer<typeof StateSchema>;

export type Env = DefaultEnv<typeof StateSchema>;
