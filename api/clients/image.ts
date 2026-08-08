import { defaults, getConfig } from "../config.ts";
import { httpFetch, httpJson } from "../lib/http.ts";

export type ImageSize = "1024x1024" | "1024x1280" | "1536x864";

export interface ImageGenerationOptions {
	referenceImages?: string[];
	size?: ImageSize;
	quality?: "low" | "medium" | "high";
}

interface ReferenceImage {
	blob: Blob;
	filename: string;
	mimeType: string;
}

const MAX_REFERENCE_IMAGES = 3;
const MAX_REFERENCE_BYTES = 12 * 1024 * 1024;
const ALLOWED_REFERENCE_HOSTS = ["decoims.com"];

/**
 * Generate a creative as an embeddable data URI. Store references are fetched
 * server-side and supplied as style inputs when the provider supports them.
 */
export async function generateImage(
	env: unknown,
	prompt: string,
	options: ImageGenerationOptions = {},
): Promise<string | null> {
	const c = getConfig(env);
	const provider = defaults.imageProvider(c);
	const references = await loadReferenceImages(options.referenceImages ?? []);

	if (provider === "openai" && c.OPENAI_API_KEY) {
		return openaiImage(
			c.OPENAI_API_KEY,
			defaults.openaiImageModel(c),
			prompt,
			options,
			references,
		);
	}
	if (c.GEMINI_API_KEY) {
		return geminiImage(c.GEMINI_API_KEY, prompt, references);
	}
	if (c.OPENAI_API_KEY) {
		return openaiImage(
			c.OPENAI_API_KEY,
			defaults.openaiImageModel(c),
			prompt,
			options,
			references,
		);
	}
	return null;
}

async function loadReferenceImages(urls: string[]): Promise<ReferenceImage[]> {
	const results = await Promise.all(
		urls.slice(0, MAX_REFERENCE_IMAGES).map(async (rawUrl, index) => {
			try {
				const url = new URL(rawUrl);
				const allowedHost = ALLOWED_REFERENCE_HOSTS.some(
					(host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
				);
				if (url.protocol !== "https:" || !allowedHost) return null;

				const response = await httpFetch(url.toString(), { timeoutMs: 20000 });
				const mimeType =
					response.headers.get("content-type")?.split(";")[0] ?? "";
				if (!/^image\/(png|jpe?g|webp)$/.test(mimeType)) return null;
				const declaredSize = Number(
					response.headers.get("content-length") ?? 0,
				);
				if (declaredSize > MAX_REFERENCE_BYTES) return null;

				const bytes = await response.arrayBuffer();
				if (bytes.byteLength > MAX_REFERENCE_BYTES) return null;
				const extension =
					mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1];
				return {
					blob: new Blob([bytes], { type: mimeType }),
					filename: `store-reference-${index + 1}.${extension}`,
					mimeType,
				};
			} catch {
				return null;
			}
		}),
	);
	return results.filter((result): result is ReferenceImage => result !== null);
}

async function geminiImage(
	apiKey: string,
	prompt: string,
	references: ReferenceImage[],
): Promise<string | null> {
	const model = "gemini-2.5-flash-image";
	const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
	const referenceParts = await Promise.all(
		references.map(async (reference) => ({
			inlineData: {
				mimeType: reference.mimeType,
				data: arrayBufferToBase64(await reference.blob.arrayBuffer()),
			},
		})),
	);
	const data = await httpJson<{
		candidates?: {
			content?: {
				parts?: { inlineData?: { mimeType?: string; data?: string } }[];
			};
		}[];
	}>(url, {
		method: "POST",
		headers: { "content-type": "application/json" },
		timeoutMs: 120000,
		body: JSON.stringify({
			contents: [{ parts: [...referenceParts, { text: prompt }] }],
			generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
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
	model: string,
	prompt: string,
	options: ImageGenerationOptions,
	references: ReferenceImage[],
): Promise<string | null> {
	const size = normalizeOpenAiSize(model, options.size ?? "1024x1024");
	const quality = options.quality ?? "high";

	if (references.length) {
		try {
			const form = new FormData();
			form.append("model", model);
			form.append("prompt", prompt);
			form.append("size", size);
			form.append("quality", quality);
			form.append("n", "1");
			if (!model.includes("gpt-image-2") && !model.includes("mini")) {
				form.append("input_fidelity", "high");
			}
			for (const reference of references) {
				form.append("image[]", reference.blob, reference.filename);
			}

			const response = await httpFetch(
				"https://api.openai.com/v1/images/edits",
				{
					method: "POST",
					headers: { authorization: `Bearer ${apiKey}` },
					timeoutMs: 180000,
					body: form,
				},
			);
			return parseOpenAiImage(await response.json());
		} catch (error) {
			console.warn(
				"Reference-based image generation failed; retrying from the visual prompt only.",
				error instanceof Error ? error.message : error,
			);
		}
	}

	const data = await httpJson<OpenAiImageResponse>(
		"https://api.openai.com/v1/images/generations",
		{
			method: "POST",
			headers: {
				authorization: `Bearer ${apiKey}`,
				"content-type": "application/json",
			},
			timeoutMs: 180000,
			body: JSON.stringify({ model, prompt, size, quality, n: 1 }),
		},
	);
	return parseOpenAiImage(data);
}

interface OpenAiImageResponse {
	data?: { b64_json?: string; url?: string }[];
}

function parseOpenAiImage(data: OpenAiImageResponse): string | null {
	const first = data.data?.[0];
	if (first?.b64_json) return `data:image/png;base64,${first.b64_json}`;
	if (first?.url) return first.url;
	return null;
}

function normalizeOpenAiSize(model: string, size: ImageSize): string {
	if (model.includes("gpt-image-2")) return size;
	if (size === "1024x1280") return "1024x1536";
	if (size === "1536x864") return "1536x1024";
	return size;
}

function arrayBufferToBase64(bytes: ArrayBuffer): string {
	return Buffer.from(bytes).toString("base64");
}
