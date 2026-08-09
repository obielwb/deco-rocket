import {
	Boxes,
	Check,
	Copy as CopyIcon,
	Loader2,
	Mail,
	Send,
	Sparkles,
	Store,
	TrendingUp,
} from "lucide-react";
import { useId, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { useMcpApp, useMcpState } from "@/context.tsx";
import { cn } from "@/lib/utils.ts";
import type { ProductBrief, Report, ScoreBreakdown } from "./types.ts";

const BRL = (n: number | null | undefined) =>
	n == null
		? "—"
		: `R$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

/** Friendly labels for internal data-source keys surfaced in the report. */
const SOURCE_LABELS: Record<string, string> = {
	google_trends: "Google Trends",
	dataforseo: "volume de busca",
	serpapi_shopping: "Google Shopping",
	vtex: "catálogo VTEX",
	anthropic: "geração por IA",
	image: "geração de imagem",
};
const sourceLabel = (k: string) => SOURCE_LABELS[k] ?? k;

/** Vivid ring stroke (non-text graphic). */
function scoreColor(score: number): string {
	if (score >= 70) return "text-emerald-500";
	if (score >= 50) return "text-amber-500";
	return "text-muted-foreground";
}

/** Score/label text — AA-contrast in light and dark. */
function scoreText(score: number): string {
	if (score >= 70) return "text-emerald-700 dark:text-emerald-400";
	if (score >= 50) return "text-amber-700 dark:text-amber-400";
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
					className={cn(
						"transition-[stroke-dashoffset] duration-500 ease-out",
						scoreColor(score),
					)}
					stroke="currentColor"
					strokeWidth="6"
					fill="none"
					strokeDasharray={c}
					strokeDashoffset={off}
					strokeLinecap="round"
				/>
			</svg>
			<div className="absolute inset-0 flex items-center justify-center">
				<span
					className={cn("text-lg font-bold tabular-nums", scoreText(score))}
				>
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
							className="w-full bg-primary/70 rounded-t transition-[height] duration-500 ease-out"
							style={{ height: `${b[k]}%` }}
						/>
					</div>
					<span className="text-[10px] text-muted-foreground text-center leading-tight">
						{BREAKDOWN_LABELS[k]}
					</span>
					<span className="text-xs font-medium tabular-nums">{b[k]}</span>
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
				tone === "good" &&
					"bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
				tone === "warn" && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
				tone === "default" && "bg-muted text-muted-foreground",
			)}
		>
			{children}
		</span>
	);
}

interface RfqSendResult {
	rfqId: string;
	status: "draft" | "sent" | "answered";
	messageId: string | null;
	degraded: boolean;
}

function BriefCard({ brief, rank }: { brief: ProductBrief; rank: number }) {
	const { opportunity: o, concept, copy, sourcing } = brief;
	const app = useMcpApp();
	const emailId = useId();
	const [tab, setTab] = useState<"concept" | "copy" | "sourcing">("concept");
	const [copied, setCopied] = useState(false);
	const [supplierEmail, setSupplierEmail] = useState("");
	const [sending, setSending] = useState(false);
	const [rfqResult, setRfqResult] = useState<RfqSendResult | null>(null);
	const [rfqError, setRfqError] = useState<string | null>(null);

	const productName = concept?.name ?? o.keyword;

	const copyRfq = () => {
		if (sourcing?.rfqDraft) {
			navigator.clipboard?.writeText(sourcing.rfqDraft);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		}
	};

	const sendRfq = async () => {
		if (!app || !supplierEmail) return;
		setSending(true);
		setRfqError(null);
		setRfqResult(null);
		try {
			const res = await app.callServerTool({
				name: "RFQ_SEND",
				arguments: {
					supplierEmail,
					product: productName,
					keyword: o.keyword,
					specs: concept?.keySpecs ?? [],
					costHint: sourcing?.estimatedUnitCost ?? null,
				},
			});
			const out = res.structuredContent as RfqSendResult | undefined;
			if (out) setRfqResult(out);
			else setRfqError("Resposta inesperada do servidor.");
		} catch (e) {
			setRfqError(e instanceof Error ? e.message : "Falha ao enviar RFQ.");
		} finally {
			setSending(false);
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
						alt={`Conceito visual de ${concept?.name ?? o.keyword}`}
						className="w-28 h-28 rounded-lg object-cover shrink-0 outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
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
								"px-3 py-1.5 text-sm rounded-t-md transition-colors",
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
								Conceito não gerado — configure a geração por IA.
							</p>
						))}
					{tab === "copy" &&
						(copy ? (
							<div className="space-y-2">
								<p className="font-medium">{copy.productTitle}</p>
								<p className="text-xs text-muted-foreground">
									SEO: {copy.seoTitle} — {copy.metaDescription}
								</p>
								<p className="whitespace-pre-wrap text-pretty max-w-prose">
									{copy.pdpDescription}
								</p>
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
										Custo estimado:{" "}
										<b className="tabular-nums">
											{BRL(sourcing.estimatedUnitCost)}
										</b>
									</span>
									<span>
										Preço sugerido:{" "}
										<b className="tabular-nums">
											{BRL(sourcing.suggestedRetailPrice)}
										</b>
									</span>
									<span>
										Margem:{" "}
										<b className="tabular-nums">
											{sourcing.estimatedMarginPct ?? "—"}%
										</b>
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
											className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium transition hover:opacity-90 active:scale-[0.96]"
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
								<div className="pt-2 border-t border-border/60 space-y-2">
									<label htmlFor={emailId} className="text-xs font-medium">
										E-mail do fornecedor
									</label>
									<div className="flex flex-wrap gap-2">
										<input
											id={emailId}
											type="email"
											value={supplierEmail}
											onChange={(e) => setSupplierEmail(e.target.value)}
											placeholder="fornecedor@empresa.com"
											className="flex-1 min-w-48 rounded-md border border-border bg-background px-2.5 py-1.5 text-base sm:text-sm"
										/>
										<button
											type="button"
											onClick={sendRfq}
											disabled={!supplierEmail || sending}
											className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium transition hover:opacity-90 active:scale-[0.96] disabled:opacity-50 disabled:active:scale-100"
										>
											{sending ? (
												<Loader2 className="w-3 h-3 animate-spin" />
											) : (
												<Send className="w-3 h-3" />
											)}
											Enviar RFQ
										</button>
										<a
											href={`mailto:${supplierEmail}?subject=${encodeURIComponent(`Solicitação de cotação — ${productName}`)}&body=${encodeURIComponent(sourcing.rfqDraft ?? "")}`}
											className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted active:scale-[0.96]"
										>
											<Mail className="w-3 h-3" />
											Abrir no e-mail
										</a>
									</div>
									{rfqResult && (
										<p
											role="status"
											className="text-xs inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400"
										>
											<Check className="w-3 h-3" aria-hidden="true" />
											{rfqResult.status === "sent"
												? `RFQ enviado ao fornecedor · ref. ${rfqResult.rfqId}`
												: rfqResult.degraded
													? `RFQ pronto (ref. ${rfqResult.rfqId}). Configure o envio de e-mail para disparar.`
													: `RFQ composto · ref. ${rfqResult.rfqId}`}
										</p>
									)}
									{rfqError && (
										<p role="alert" className="text-xs text-destructive">
											{rfqError}
										</p>
									)}
								</div>
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
				<h1 className="text-lg font-semibold">Deco Rocket</h1>
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
					<p className="text-sm text-pretty bg-muted/50 border border-border rounded-lg p-3">
						{report.summary}
					</p>
				)}
				{report.degraded.length > 0 && (
					<p className="text-xs text-amber-700 dark:text-amber-400">
						Fontes indisponíveis nesta execução:{" "}
						{report.degraded.map(sourceLabel).join(", ")} (configure as
						credenciais para dados completos).
					</p>
				)}
			</header>

			<div className="space-y-4">
				{report.briefs.map((b, i) => (
					<BriefCard key={b.opportunity.keyword} brief={b} rank={i + 1} />
				))}
			</div>

			<footer className="text-center text-xs text-muted-foreground pt-2">
				Gerado por Deco Rocket · MCP App
			</footer>
		</div>
	);
}
