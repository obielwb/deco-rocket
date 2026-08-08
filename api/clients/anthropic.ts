import { defaults, getConfig, MissingCredentialError } from "../config.ts";
import { httpJson } from "../lib/http.ts";

const BASE = "https://api.anthropic.com/v1/messages";
const OPENAI_BASE = "https://api.openai.com/v1/chat/completions";

interface AnthropicResponse {
	content?: { type: string; text?: string }[];
}

interface OpenAIResponse {
	choices?: { message?: { content?: string | null } }[];
}

/** True when any text-LLM credential is usable, whichever provider it is. */
export function hasLlmCredential(env: unknown): boolean {
	const c = getConfig(env);
	return Boolean(c.OPENAI_API_KEY || c.ANTHROPIC_API_KEY);
}

/**
 * Resolve which provider actually serves a completion.
 *
 * `LLM_PROVIDER` decides (default `openai`), but a preference for a provider
 * with no key falls through to the one that has a key — asking for Anthropic
 * without an Anthropic key should degrade to the working provider rather than
 * fail the whole report.
 */
function resolveProvider(
	c: ReturnType<typeof getConfig>,
): "openai" | "anthropic" {
	const preferred = defaults.llmProvider(c);
	if (preferred === "anthropic" && c.ANTHROPIC_API_KEY) return "anthropic";
	if (c.OPENAI_API_KEY) return "openai";
	if (c.ANTHROPIC_API_KEY) return "anthropic";
	throw new MissingCredentialError("openai_or_anthropic");
}

/** Low-level text completion, routed to the configured provider. */
export async function complete(
	env: unknown,
	opts: { system?: string; prompt: string; maxTokens?: number },
): Promise<string> {
	const c = getConfig(env);

	if (resolveProvider(c) === "openai") {
		const data = await httpJson<OpenAIResponse>(OPENAI_BASE, {
			method: "POST",
			headers: {
				authorization: `Bearer ${c.OPENAI_API_KEY}`,
				"content-type": "application/json",
			},
			timeoutMs: 60000,
			body: JSON.stringify({
				model: defaults.openaiTextModel(c),
				max_completion_tokens: opts.maxTokens ?? 1500,
				messages: [
					...(opts.system ? [{ role: "system", content: opts.system }] : []),
					{ role: "user", content: opts.prompt },
				],
			}),
		});
		return data.choices?.[0]?.message?.content ?? "";
	}

	const data = await httpJson<AnthropicResponse>(BASE, {
		method: "POST",
		headers: {
			"x-api-key": c.ANTHROPIC_API_KEY as string,
			"anthropic-version": "2023-06-01",
			"content-type": "application/json",
		},
		timeoutMs: 60000,
		body: JSON.stringify({
			model: defaults.anthropicModel(c),
			max_tokens: opts.maxTokens ?? 1500,
			system: opts.system,
			messages: [{ role: "user", content: opts.prompt }],
		}),
	});

	return data.content?.map((b) => b.text ?? "").join("") ?? "";
}

/**
 * Completion constrained to return a single JSON object matching `T`.
 * Strips markdown fences and parses. Throws on unparseable output.
 */
export async function completeJson<T>(
	env: unknown,
	opts: { system?: string; prompt: string; maxTokens?: number },
): Promise<T> {
	const raw = await complete(env, {
		...opts,
		system: `${opts.system ?? ""}\n\nRespond with ONLY a single valid JSON object. No prose, no markdown fences.`,
	});
	const cleaned = raw
		.trim()
		.replace(/^```(?:json)?/i, "")
		.replace(/```$/i, "")
		.trim();
	const start = cleaned.indexOf("{");
	const end = cleaned.lastIndexOf("}");
	const slice =
		start >= 0 && end >= 0 ? cleaned.slice(start, end + 1) : cleaned;
	return JSON.parse(slice) as T;
}
