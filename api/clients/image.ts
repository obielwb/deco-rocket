import { defaults, getConfig } from "../config.ts";
import { httpJson } from "../lib/http.ts";

/**
 * Generate a product concept image. Returns a `data:` URI (base64) so it can be
 * embedded directly in the report UI with no external asset hosting.
 * Returns null when no image provider is configured.
 */
export async function generateImage(
	env: unknown,
	prompt: string,
): Promise<string | null> {
	const c = getConfig(env);
	const provider = defaults.imageProvider(c);

	if (provider === "openai" && c.OPENAI_API_KEY) {
		return openaiImage(c.OPENAI_API_KEY, prompt);
	}
	if (c.GEMINI_API_KEY) {
		return geminiImage(c.GEMINI_API_KEY, prompt);
	}
	if (c.OPENAI_API_KEY) {
		return openaiImage(c.OPENAI_API_KEY, prompt);
	}
	return null;
}

async function geminiImage(
	apiKey: string,
	prompt: string,
): Promise<string | null> {
	const model = "gemini-2.5-flash-image";
	const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
	const data = await httpJson<{
		candidates?: {
			content?: {
				parts?: { inlineData?: { mimeType?: string; data?: string } }[];
			};
		}[];
	}>(url, {
		method: "POST",
		headers: { "content-type": "application/json" },
		timeoutMs: 90000,
		body: JSON.stringify({
			contents: [{ parts: [{ text: prompt }] }],
		}),
	});

	for (const part of data.candidates?.[0]?.content?.parts ?? []) {
		if (part.inlineData?.data) {
			const mime = part.inlineData.mimeType || "image/png";
			return `data:${mime};base64,${part.inlineData.data}`;
		}
	}
	return null;
}

async function openaiImage(
	apiKey: string,
	prompt: string,
): Promise<string | null> {
	const data = await httpJson<{ data?: { b64_json?: string; url?: string }[] }>(
		"https://api.openai.com/v1/images/generations",
		{
			method: "POST",
			headers: {
				authorization: `Bearer ${apiKey}`,
				"content-type": "application/json",
			},
			timeoutMs: 90000,
			body: JSON.stringify({
				model: "gpt-image-1",
				prompt,
				size: "1024x1024",
				n: 1,
			}),
		},
	);
	const first = data.data?.[0];
	if (first?.b64_json) return `data:image/png;base64,${first.b64_json}`;
	if (first?.url) return first.url;
	return null;
}
