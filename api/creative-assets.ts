import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";

const assetsDir = join(import.meta.dir, "../dist/assets");
const MAX_DATA_URI_LENGTH = 40 * 1024 * 1024;

const mimeByExtension: Record<string, string> = {
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".png": "image/png",
	".webp": "image/webp",
};

function slug(value: string): string {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "")
		.slice(0, 72);
}

function publicOrigin(): string {
	const configured = process.env.RESEARCH_PUBLIC_URL?.trim();
	if (configured) return configured.replace(/\/$/, "");
	return `http://127.0.0.1:${Number(process.env.PORT) || 3001}`;
}

export interface DecodedImage {
	bytes: Buffer;
	extension: "jpg" | "png" | "webp";
	mimeType: string;
}

export function decodeImageDataUri(value: string): DecodedImage | null {
	if (!value.startsWith("data:image/") || value.length > MAX_DATA_URI_LENGTH) {
		return null;
	}
	const match = /^data:image\/(png|jpe?g|webp);base64,([a-z0-9+/=\s]+)$/i.exec(
		value,
	);
	if (!match) return null;
	const format = match[1].toLowerCase();
	const extension = format === "jpeg" ? "jpg" : format;
	const bytes = Buffer.from(match[2].replace(/\s/g, ""), "base64");
	if (!bytes.length) return null;
	return {
		bytes,
		extension: extension as DecodedImage["extension"],
		mimeType: extension === "jpg" ? "image/jpeg" : `image/${extension}`,
	};
}

export async function persistCreativeImage(
	imageUrl: string | null | undefined,
	assetName: string,
): Promise<string | null> {
	if (!imageUrl) return null;
	const decoded = decodeImageDataUri(imageUrl);
	if (!decoded) return imageUrl;

	const hash = createHash("sha256")
		.update(decoded.bytes)
		.digest("hex")
		.slice(0, 12);
	const filename = `${slug(assetName) || "creative"}-${hash}.${decoded.extension}`;
	await mkdir(assetsDir, { recursive: true });
	await writeFile(join(assetsDir, filename), decoded.bytes);
	return `${publicOrigin()}/api/research/assets/${filename}`;
}

export async function readCreativeAsset(
	filename: string,
): Promise<{ bytes: Buffer; mimeType: string } | null> {
	if (filename !== basename(filename) || !/^[a-z0-9._-]+$/i.test(filename)) {
		return null;
	}
	const mimeType = mimeByExtension[extname(filename).toLowerCase()];
	if (!mimeType) return null;
	try {
		return { bytes: await readFile(join(assetsDir, filename)), mimeType };
	} catch {
		return null;
	}
}

interface ImageCreative {
	type: string;
	imageUrl?: string | null;
}

interface ImageBrief {
	imageUrl?: string | null;
	creatives?: ImageCreative[];
}

export async function materializeReportImages<
	T extends { report: { briefs: ImageBrief[] } },
>(stored: T & { id: string }): Promise<{ stored: T; changed: boolean }> {
	let changed = false;
	const briefs = await Promise.all(
		stored.report.briefs.map(async (brief, briefIndex) => {
			const originalCreatives = brief.creatives ?? [];
			const creatives = await Promise.all(
				originalCreatives.map(async (creative) => {
					const imageUrl = await persistCreativeImage(
						creative.imageUrl,
						`${stored.id}-${briefIndex}-${creative.type}`,
					);
					if (imageUrl !== (creative.imageUrl ?? null)) changed = true;
					return { ...creative, imageUrl };
				}),
			);

			const matchingCreative = originalCreatives.findIndex(
				(creative) => creative.imageUrl && creative.imageUrl === brief.imageUrl,
			);
			const imageUrl =
				matchingCreative >= 0
					? (creatives[matchingCreative]?.imageUrl ?? null)
					: await persistCreativeImage(
							brief.imageUrl,
							`${stored.id}-${briefIndex}-primary`,
						);
			if (imageUrl !== (brief.imageUrl ?? null)) changed = true;

			return { ...brief, imageUrl, creatives };
		}),
	);

	return {
		stored: {
			...stored,
			report: { ...stored.report, briefs },
		},
		changed,
	};
}
