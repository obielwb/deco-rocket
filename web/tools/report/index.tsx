import {
	Boxes,
	Copy as CopyIcon,
	Mail,
	Sparkles,
	Store,
	TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { useMcpState } from "@/context.tsx";
import { cn } from "@/lib/utils.ts";
import type { ProductBrief, Report, ScoreBreakdown } from "./types.ts";

const BRL = (n: number | null | undefined) =>
	n == null
		? "—"
		: `R$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

function scoreColor(score: number): string {
	if (score >= 70) return "text-emerald-500";
	if (score >= 50) return "text-amber-500";
	return "text-muted-foreground";
}

function ScoreRing({ score }: { score: number }) {
	const r = 26;
	const c = 2 * Math.PI * r;
	const off = c - (Math.min(100, score) / 100) * c;
	return (
		<div className="relative w-16 h-16 shrink-0">
			<svg
				viewBox="0 0 64 64"
				className="w-16 h-16 -rotate-90"
				role="img"
				aria-label={`Score ${score} de 100`}
			>
				<title>{`Score ${score} de 100`}</title>
				<circle
					cx="32"
					cy="32"
					r={r}
					className="stroke-muted"
					strokeWidth="6"
					fill="none"
				/>
				<circle
					cx="32"
					cy="32"
					r={r}
					className={cn("transition-all", scoreColor(score))}
					stroke="currentColor"
					strokeWidth="6"
					fill="none"
					strokeDasharray={c}
					strokeDashoffset={off}
					strokeLinecap="round"
				/>
			</svg>
			<div className="absolute inset-0 flex items-center justify-center">
				<span className={cn("text-lg font-bold", scoreColor(score))}>
					{score}
				</span>
			</div>
		</div>
	);
}

const BREAKDOWN_LABELS: Record<keyof ScoreBreakdown, string> = {
	demand: "Demanda",
	momentum: "Momentum",
	competition: "Concorrência",
	margin: "Margem",
	fit: "Fit c/ loja",
};

function BreakdownBars({ b }: { b: ScoreBreakdown }) {
	return (
		<div className="grid grid-cols-5 gap-2">
			{(Object.keys(BREAKDOWN_LABELS) as (keyof ScoreBreakdown)[]).map((k) => (
				<div key={k} className="flex flex-col items-center gap-1">
					<div className="w-full h-16 bg-muted rounded flex items-end overflow-hidden">
						<div
							className="w-full bg-primary/70 rounded-t transition-all"
							style={{ height: `${b[k]}%` }}
						/>
					</div>
					<span className="text-[10px] text-muted-foreground text-center leading-tight">
						{BREAKDOWN_LABELS[k]}
					</span>
					<span className="text-xs font-medium">{b[k]}</span>
				</div>
			))}
		</div>
	);
}

function TrendChart({ data }: { data: { date: string; value: number }[] }) {
	if (!data.length) return null;
	return (
		<div className="h-20 w-full">
			<ResponsiveContainer width="100%" height="100%">
				<LineChart
					data={data}
					margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
				>
					<YAxis hide domain={[0, 100]} />
					<Tooltip
						contentStyle={{ fontSize: 12, borderRadius: 8 }}
						labelFormatter={(l) => String(l)}
						formatter={(v) => [`${v}`, "interesse"]}
					/>
					<Line
						type="monotone"
						dataKey="value"
						stroke="currentColor"
						className="text-primary"
						strokeWidth={2}
						dot={false}
					/>
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}

function Pill({
	children,
	tone = "default",
}: {
	children: React.ReactNode;
	tone?: "default" | "good" | "warn";
}) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
				tone === "good" && "bg-emerald-500/15 text-emerald-600",
				tone === "warn" && "bg-amber-500/15 text-amber-600",
				tone === "default" && "bg-muted text-muted-foreground",
			)}
		>
			{children}
		</span>
	);
}

function BriefCard({ brief, rank }: { brief: ProductBrief; rank: number }) {
	const { opportunity: o, concept, copy, sourcing } = brief;
	const [tab, setTab] = useState<"concept" | "copy" | "sourcing">("concept");
	const [copied, setCopied] = useState(false);

	const copyRfq = () => {
		if (sourcing?.rfqDraft) {
			navigator.clipboard?.writeText(sourcing.rfqDraft);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		}
	};

	return (
		<div className="rounded-xl border border-border bg-background shadow-sm overflow-hidden">
			<div className="flex gap-4 p-4">
				<div className="flex flex-col items-center gap-2">
					<span className="text-xs font-semibold text-muted-foreground">
						#{rank}
					</span>
					<ScoreRing score={o.score} />
				</div>
				<div className="flex-1 min-w-0">
					<div className="flex items-start justify-between gap-2">
						<div className="min-w-0">
							<h3 className="font-semibold truncate">
								{concept?.name ?? o.keyword}
							</h3>
							<p className="text-sm text-muted-foreground truncate">
								{concept?.tagline ?? o.keyword}
							</p>
						</div>
					</div>
					<div className="flex flex-wrap gap-1.5 mt-2">
						{o.volume?.searchVolume != null && (
							<Pill>
								<TrendingUp className="w-3 h-3" />
								{o.volume.searchVolume.toLocaleString("pt-BR")}/mês
							</Pill>
						)}
						{o.trend && o.trend.momentum > 5 && (
							<Pill tone="good">+{o.trend.momentum}% demanda</Pill>
						)}
						{o.trend?.isBreakout && <Pill tone="good">breakout</Pill>}
						{o.gap && !o.gap.inCatalog && <Pill tone="warn">whitespace</Pill>}
						{o.market?.priceMedian != null && (
							<Pill>mediana {BRL(o.market.priceMedian)}</Pill>
						)}
						{sourcing?.estimatedMarginPct != null && (
							<Pill tone="good">margem ~{sourcing.estimatedMarginPct}%</Pill>
						)}
					</div>
					<p className="text-xs text-muted-foreground mt-2">{o.rationale}</p>
				</div>
				{brief.imageUrl && (
					// biome-ignore lint/a11y/useAltText: generated concept image
					<img
						src={brief.imageUrl}
						alt={concept?.name ?? o.keyword}
						className="w-28 h-28 rounded-lg object-cover border border-border shrink-0"
					/>
				)}
			</div>

			<div className="px-4 pb-4 grid md:grid-cols-2 gap-4">
				<div>
					<BreakdownBars b={o.breakdown} />
				</div>
				<div>{o.trend && <TrendChart data={o.trend.timeline} />}</div>
			</div>

			<div className="border-t border-border">
				<div className="flex gap-1 px-3 pt-2">
					{(["concept", "copy", "sourcing"] as const).map((t) => (
						<button
							type="button"
							key={t}
							onClick={() => setTab(t)}
							className={cn(
								"px-3 py-1.5 text-sm rounded-t-md",
								tab === t
									? "bg-muted font-medium"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							{t === "concept"
								? "Conceito"
								: t === "copy"
									? "Copy"
									: "Fornecedor"}
						</button>
					))}
				</div>
				<div className="p-4 bg-muted/40 text-sm space-y-2">
					{tab === "concept" &&
						(concept ? (
							<div className="space-y-2">
								<p>{concept.positioning}</p>
								<p className="text-muted-foreground">
									<span className="font-medium text-foreground">Público:</span>{" "}
									{concept.targetAudience}
								</p>
								<div className="flex flex-wrap gap-1.5">
									{concept.keySpecs.map((s) => (
										<Pill key={s}>{s}</Pill>
									))}
								</div>
								{concept.suggestedPrice != null && (
									<p className="font-medium">
										Preço sugerido: {BRL(concept.suggestedPrice)}
									</p>
								)}
							</div>
						) : (
							<p className="text-muted-foreground">
								Conceito não gerado (configure ANTHROPIC_API_KEY).
							</p>
						))}
					{tab === "copy" &&
						(copy ? (
							<div className="space-y-2">
								<p className="font-medium">{copy.productTitle}</p>
								<p className="text-xs text-muted-foreground">
									SEO: {copy.seoTitle} — {copy.metaDescription}
								</p>
								<p className="whitespace-pre-wrap">{copy.pdpDescription}</p>
								<div className="space-y-1">
									{copy.adCopies.map((a) => (
										<p
											key={a}
											className="text-xs border-l-2 border-primary/40 pl-2"
										>
											{a}
										</p>
									))}
								</div>
							</div>
						) : (
							<p className="text-muted-foreground">Copy não gerada.</p>
						))}
					{tab === "sourcing" &&
						(sourcing ? (
							<div className="space-y-2">
								<div className="flex flex-wrap gap-3 text-sm">
									<span>
										Custo estimado: <b>{BRL(sourcing.estimatedUnitCost)}</b>
									</span>
									<span>
										Preço sugerido: <b>{BRL(sourcing.suggestedRetailPrice)}</b>
									</span>
									<span>
										Margem: <b>{sourcing.estimatedMarginPct ?? "—"}%</b>
									</span>
								</div>
								{sourcing.offers.length > 0 && (
									<p className="text-xs text-muted-foreground">
										{sourcing.offers.length} ofertas análogas (Mercado Livre)
										analisadas.
									</p>
								)}
								{sourcing.rfqDraft && (
									<div>
										<button
											type="button"
											onClick={copyRfq}
											className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:opacity-90"
										>
											{copied ? (
												<CopyIcon className="w-3 h-3" />
											) : (
												<Mail className="w-3 h-3" />
											)}
											{copied ? "Copiado!" : "Copiar RFQ (e-mail de cotação)"}
										</button>
										<pre className="mt-2 whitespace-pre-wrap text-xs bg-background border border-border rounded-md p-3 max-h-48 overflow-auto">
											{sourcing.rfqDraft}
										</pre>
									</div>
								)}
							</div>
						) : (
							<p className="text-muted-foreground">Sem dados de fornecedor.</p>
						))}
				</div>
			</div>
		</div>
	);
}

export default function ReportPage() {
	const { toolResult, status, error } = useMcpState<unknown, Report>();

	if (status === "error") {
		return (
			<div className="max-w-2xl mx-auto p-6">
				<p className="text-destructive text-sm">
					{error ?? "Erro ao gerar o relatório."}
				</p>
			</div>
		);
	}

	const report = toolResult;
	if (!report?.briefs) {
		return (
			<div className="flex flex-col items-center justify-center min-h-dvh gap-3 p-6 text-center">
				<Sparkles className="w-8 h-8 text-primary" />
				<h1 className="text-lg font-semibold">Deco Research</h1>
				<p className="text-sm text-muted-foreground max-w-md">
					Rode a ferramenta{" "}
					<code className="px-1 bg-muted rounded">RESEARCH_RUN</code> com um
					nicho (ex.: "garrafa térmica") para gerar um Relatório de
					Oportunidades de Produto.
				</p>
			</div>
		);
	}

	return (
		<div className="max-w-3xl mx-auto p-4 md:p-6 space-y-5">
			<header className="space-y-3">
				<div className="flex items-center gap-2">
					<Sparkles className="w-5 h-5 text-primary" />
					<h1 className="text-xl font-bold">Relatório de Oportunidades</h1>
				</div>
				<div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
					<Pill>
						<Boxes className="w-3 h-3" />
						nicho: {report.seed}
					</Pill>
					{report.store && (
						<Pill>
							<Store className="w-3 h-3" />
							{report.store}
						</Pill>
					)}
					<Pill>{report.geo}</Pill>
					<span className="text-xs">
						{new Date(report.generatedAt).toLocaleString("pt-BR")}
					</span>
				</div>
				{report.summary && (
					<p className="text-sm bg-muted/50 border border-border rounded-lg p-3">
						{report.summary}
					</p>
				)}
				{report.degraded.length > 0 && (
					<p className="text-xs text-amber-600">
						Fontes indisponíveis nesta execução: {report.degraded.join(", ")}{" "}
						(configure as credenciais para dados completos).
					</p>
				)}
			</header>

			<div className="space-y-4">
				{report.briefs.map((b, i) => (
					<BriefCard key={b.opportunity.keyword} brief={b} rank={i + 1} />
				))}
			</div>

			<footer className="text-center text-xs text-muted-foreground pt-2">
				Gerado por Deco Research · MCP App
			</footer>
		</div>
	);
}
