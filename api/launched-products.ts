import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { persistCreativeImage } from "./creative-assets.ts";

export const LaunchProductRequestSchema = z.object({
	reportId: z.string().min(1),
	briefIndex: z.number().int().min(0),
	name: z.string().trim().min(2),
	tagline: z.string().trim().min(2),
	description: z.string().trim().min(2),
	price: z.number().positive(),
	collection: z.string().trim().min(1),
	imageUrl: z.string().min(1),
	tags: z.array(z.string()).max(12).default([]),
});

export type LaunchProductRequest = z.infer<typeof LaunchProductRequestSchema>;

export interface LaunchedProduct extends LaunchProductRequest {
	id: string;
	handle: string;
	status: "active";
	inventory: number;
	createdAt: string;
	updatedAt: string;
}

const catalogFile = join(import.meta.dir, "../dist/launched-products.json");
let loaded = false;
const products = new Map<string, LaunchedProduct>();

function slug(value: string): string {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "")
		.slice(0, 54);
}

function productId(input: LaunchProductRequest): string {
	return `rocket-${slug(input.reportId)}-${input.briefIndex}`;
}

async function load(): Promise<void> {
	if (loaded) return;
	loaded = true;
	try {
		const stored = JSON.parse(
			await readFile(catalogFile, "utf8"),
		) as LaunchedProduct[];
		let changed = false;
		for (const product of stored) {
			const imageUrl = await persistCreativeImage(product.imageUrl, product.id);
			if (imageUrl && imageUrl !== product.imageUrl) changed = true;
			products.set(product.id, {
				...product,
				imageUrl: imageUrl ?? product.imageUrl,
			});
		}
		if (changed) await persist();
	} catch {
		// The local launch catalog is created on the first product launch.
	}
}

async function persist(): Promise<void> {
	await mkdir(join(import.meta.dir, "../dist"), { recursive: true });
	await writeFile(catalogFile, JSON.stringify([...products.values()], null, 2));
}

export async function listLaunchedProducts(): Promise<LaunchedProduct[]> {
	await load();
	return [...products.values()].sort((a, b) =>
		b.updatedAt.localeCompare(a.updatedAt),
	);
}

export async function launchProduct(
	input: LaunchProductRequest,
): Promise<LaunchedProduct> {
	await load();
	const id = productId(input);
	const existing = products.get(id);
	const now = new Date().toISOString();
	const imageUrl = await persistCreativeImage(input.imageUrl, id);
	const product: LaunchedProduct = {
		...input,
		imageUrl: imageUrl ?? input.imageUrl,
		id,
		handle: slug(input.name) || id,
		status: "active",
		inventory: existing?.inventory ?? 24,
		createdAt: existing?.createdAt ?? now,
		updatedAt: now,
	};
	products.set(id, product);
	await persist();
	return product;
}
