/**
 * CLI runner for a real end-to-end research pass.
 *
 *   bun run research "garrafa térmica"
 *   bun run research "kit café especial" --top 3 --candidates 8
 *
 * Reads credentials from the environment (Bun auto-loads `.env`). Writes the
 * full report JSON to `dist/report.json` for inspection / the demo.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Report } from "../api/lib/types.ts";
import { researchRun } from "../api/tools/research.ts";
import type { Env } from "../api/types/env.ts";

function arg(flag: string, fallback: number): number {
	const i = process.argv.indexOf(flag);
	if (i >= 0 && process.argv[i + 1]) return Number(process.argv[i + 1]);
	return fallback;
}

const seed =
	process.argv[2] && !process.argv[2].startsWith("--")
		? process.argv[2]
		: "garrafa térmica";
const topN = arg("--top", 3);
const maxCandidates = arg("--candidates", 8);

// Empty state → getConfig() falls back to process.env (the .env file).
const env = {
	IS_LOCAL: true,
	MESH_REQUEST_CONTEXT: { state: {} },
} as unknown as Env;

const line = "─".repeat(60);
console.log(
	`\n${line}\n🔎 Deco Research — "${seed}" (top ${topN}, ${maxCandidates} candidates)\n${line}`,
);

const tool = researchRun(env);
const started = Date.now();
const report = (await tool.execute({
	context: { seed, topN, maxCandidates },
	runtimeContext: { env, ctx: { waitUntil: () => {} } },
})) as Report;

const secs = ((Date.now() - started) / 1000).toFixed(1);

console.log(
	`\n📊 Loja: ${report.store ?? "—"} · Geo: ${report.geo} · ${secs}s`,
);
if (report.degraded.length)
	console.log(`⚠️  Fontes indisponíveis: ${report.degraded.join(", ")}`);
console.log(`\n💡 ${report.summary}\n`);

report.briefs.forEach((b, i) => {
	const o = b.opportunity;
	console.log(`${line}`);
	console.log(`#${i + 1}  [${o.score}/100]  ${b.concept?.name ?? o.keyword}`);
	if (b.concept) console.log(`     ${b.concept.tagline}`);
	console.log(
		`     demanda ${o.breakdown.demand} · momentum ${o.breakdown.momentum} · concorrência ${o.breakdown.competition} · margem ${o.breakdown.margin} · fit ${o.breakdown.fit}`,
	);
	console.log(`     ${o.rationale}`);
	if (b.sourcing)
		console.log(
			`     💰 custo ~R$${b.sourcing.estimatedUnitCost ?? "?"} → venda R$${b.sourcing.suggestedRetailPrice ?? "?"} (margem ${b.sourcing.estimatedMarginPct ?? "?"}%)`,
		);
	if (b.imageUrl)
		console.log(`     🖼️  imagem gerada (${b.imageUrl.slice(0, 24)}…)`);
});

await mkdir(join(import.meta.dir, "../dist"), { recursive: true });
await writeFile(
	join(import.meta.dir, "../dist/report.json"),
	JSON.stringify(report, null, 2),
);
console.log(`\n${line}\n✅ Report completo salvo em dist/report.json\n`);
