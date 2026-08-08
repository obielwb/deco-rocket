import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMerchant, useMerchantSignOut } from "../../platform/merchant";
import {
  type CreativeType,
  deleteRocketProductServerFn,
  deleteRocketReportServerFn,
  getRocketHealthServerFn,
  getRocketLaunchesServerFn,
  getRocketReportsServerFn,
  getRocketResearchJobsServerFn,
  type LaunchedProduct,
  type LaunchProductRequest,
  launchRocketProductServerFn,
  type ProductBrief,
  type ResearchJob,
  type ResearchRequest,
  type ResearchSource,
  refreshRocketReportsServerFn,
  type SourcePreview,
  type StoredReport,
  startRocketResearchJobServerFn,
} from "../../platform/rocket";
import { DEMO_REPORTS, STORE_COLLECTIONS } from "./demo-data";
import RocketImage from "./RocketImage";

type View = "overview" | "reports" | "research" | "suppliers";
type GlyphName =
  View | "store" | "logout" | "arrow" | "check" | "spark" | "clock" | "upload" | "trash";

const NAV_ITEMS: { id: View; label: string }[] = [
  { id: "overview", label: "Visão geral" },
  { id: "reports", label: "Reports" },
  { id: "research", label: "Nova pesquisa" },
  { id: "suppliers", label: "Fornecedores" },
];

const SOURCE_OPTIONS: {
  id: ResearchSource;
  name: string;
  detail: string;
  provider: string;
}[] = [
  {
    id: "google_trends",
    name: "Google Trends",
    detail: "Interesse e momentum",
    provider: "googleTrends",
  },
  {
    id: "social_viral",
    name: "TikTok Shop radar (estimado)",
    detail: "Preview de hooks e sinais sociais",
    provider: "socialRadar",
  },
  {
    id: "google_shopping",
    name: "Google Shopping",
    detail: "Preço e concorrência",
    provider: "googleShopping",
  },
  {
    id: "keyword_volume",
    name: "Volume de busca",
    detail: "Demanda, CPC e competição",
    provider: "keywordVolume",
  },
  {
    id: "catalog",
    name: "Catálogo da loja",
    detail: "Fit e whitespace",
    provider: "catalog",
  },
];

const PROFILES = [
  {
    id: "Teen / social media",
    title: "Teen / social media",
    detail: "Cultura, linguagem e consumo de 14 a 24 anos",
  },
  {
    id: "Fashion radar",
    title: "Fashion radar",
    detail: "Silhuetas, materiais e sinais de moda",
  },
  {
    id: "Performance",
    title: "Performance",
    detail: "Dor funcional, inovação e comparativos",
  },
  {
    id: "Evergreen",
    title: "Evergreen",
    detail: "Demanda estável e menor risco operacional",
  },
];

const CREATIVE_OPTIONS: { id: CreativeType; name: string; format: string }[] = [
  { id: "product_hero", name: "Hero de produto", format: "1:1 · PDP" },
  { id: "social_ad", name: "Social ad", format: "4:5 · Feed" },
  { id: "collection_banner", name: "Banner de coleção", format: "16:9 · Home" },
];

const STORE_VISUAL_REFERENCES = [
  {
    name: "Campanha lime",
    detail: "Cor, contraste e espaço negativo",
    url: "https://decoims.com/demo-storefront/2026/07/57440993-8c68-4943-9084-1c947c1d0fd5-banner1.png?quality=original",
  },
  {
    name: "Campanha lilás",
    detail: "Enquadramento e padrão modular",
    url: "https://decoims.com/demo-storefront/2026/07/ba0261c3-bee6-40bd-b7a4-ce12083c7be5-banner2.png",
  },
  {
    name: "Foto de catálogo",
    detail: "Luz, textura e escala do produto",
    url: "https://decoims.com/demo-storefront/2026/07/543e04d2-011d-4cc2-8875-46a1a08bef3d-accessories.png",
  },
] as const;

const DEFAULT_STORE_STYLE =
  "Pop editorial urbano da storefront: fundos chapados verde-lima ou lilás, módulos geométricos tonais, produto preto em recorte grande, luz frontal de estúdio, contraste alto e espaço negativo para copy.";

const ACTIVE_RESEARCH_JOB_KEY = "rocket-active-research-job";

type CatalogDraft = Omit<LaunchProductRequest, "reportId" | "briefIndex" | "tags">;

function briefCreativeImage(brief: ProductBrief | undefined): string {
  if (!brief) return "";
  return (
    brief.creatives?.find((creative) => creative.type === "product_hero")?.imageUrl ??
    brief.creatives?.find((creative) => creative.imageUrl)?.imageUrl ??
    brief.imageUrl ??
    ""
  );
}

function catalogDraftFromBrief(brief: ProductBrief | undefined, collection: string): CatalogDraft {
  const concept = brief?.concept;
  return {
    name: brief?.copy?.productTitle ?? concept?.name ?? brief?.opportunity.keyword ?? "",
    tagline: concept?.tagline ?? brief?.opportunity.keyword ?? "",
    description: brief?.copy?.pdpDescription ?? concept?.positioning ?? "",
    price: concept?.suggestedPrice ?? brief?.sourcing?.suggestedRetailPrice ?? 0,
    collection,
    imageUrl: briefCreativeImage(brief),
  };
}

function catalogDraftFromProduct(product: LaunchProductRequest): CatalogDraft {
  return {
    name: product.name,
    tagline: product.tagline,
    description: product.description,
    price: product.price,
    collection: product.collection,
    imageUrl: product.imageUrl,
  };
}

function catalogDraftsMatch(left: CatalogDraft, right: CatalogDraft): boolean {
  return (Object.keys(left) as Array<keyof CatalogDraft>).every((key) => left[key] === right[key]);
}

function readActiveResearchJobId() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_RESEARCH_JOB_KEY);
  } catch {
    return null;
  }
}

function writeActiveResearchJobId(jobId: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (jobId) window.localStorage.setItem(ACTIVE_RESEARCH_JOB_KEY, jobId);
    else window.localStorage.removeItem(ACTIVE_RESEARCH_JOB_KEY);
  } catch {
    // Ignore local storage errors and keep the in-memory state working.
  }
}

function isActiveResearchJob(job: ResearchJob | null | undefined) {
  return job?.status === "queued" || job?.status === "running";
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function Glyph({ name, size = 18 }: { name: GlyphName; size?: number }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const paths: Record<GlyphName, React.ReactNode> = {
    overview: (
      <>
        <path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z" />
      </>
    ),
    reports: (
      <>
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M15 3v5h4M9 13h6M9 17h6" />
      </>
    ),
    research: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="m16 16 4 4M11 8v6M8 11h6" />
      </>
    ),
    suppliers: (
      <>
        <path d="M3 9h18v11H3zM6 9V5h12v4M7 13h3M14 13h3" />
      </>
    ),
    store: (
      <>
        <path d="M4 9h16l-2-5H6zM5 9v11h14V9M9 20v-6h6v6" />
      </>
    ),
    logout: (
      <>
        <path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" />
      </>
    ),
    arrow: (
      <>
        <path d="m9 18 6-6-6-6" />
      </>
    ),
    check: (
      <>
        <path d="m5 12 4 4L19 6" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5zM18 16l.7 2.3L21 19l-2.3.7L18 22l-.7-2.3L15 19l2.3-.7z" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
      </>
    ),
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...common}>
      {paths[name]}
    </svg>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function brl(value: number | null | undefined) {
  return value == null
    ? "—"
    : value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      });
}

function dedupeReports(reports: StoredReport[]) {
  return [...new Map(reports.map((item) => [item.id, item])).values()].sort((a, b) =>
    b.report.generatedAt.localeCompare(a.report.generatedAt),
  );
}

function dedupeJobs(jobs: ResearchJob[]) {
  return [...new Map(jobs.map((job) => [job.id, job])).values()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

function compactNumber(value: number | null | undefined) {
  return value == null
    ? "Sem dado"
    : value.toLocaleString("pt-BR", {
        notation: "compact",
        maximumFractionDigits: 1,
      });
}

type MarketPulse = {
  score: number;
  status: string;
  title: string;
  description: string;
  note: string;
  metrics: Array<{ label: string; value: string }>;
};

function buildMarketPulse(reports: StoredReport[]): MarketPulse {
  const automatic = reports
    .filter((item) => item.mode === "automatic")
    .sort(
      (a, b) =>
        (b.report.briefs[0]?.opportunity.score ?? 0) - (a.report.briefs[0]?.opportunity.score ?? 0),
    );
  const pool = automatic.length > 0 ? automatic : reports;
  const source = pool[0];
  const brief = source?.report.briefs[0];
  const score = brief?.opportunity.score ?? 0;

  if (!source || !brief) {
    return {
      score: 0,
      status: "Aguardando sinais",
      title: "Ainda não há um report forte o suficiente para resumir o radar.",
      description:
        "Quando houver um report automático ou manual pronto, este bloco passa a mostrar a oportunidade mais forte do momento e os sinais que puxaram esse score.",
      note: "Sem reports disponíveis no momento.",
      metrics: [
        { label: "Status", value: "Sem dados" },
        { label: "Fit", value: "Sem dado" },
        { label: "Buscas/mês", value: "Sem dado" },
      ],
    };
  }

  const name = brief.concept?.name ?? brief.opportunity.keyword;
  const fit = brief.opportunity.breakdown.fit;
  const momentum = brief.opportunity.trend?.momentum;
  const volume = brief.opportunity.volume?.searchVolume;

  return {
    score,
    status: score >= 80 ? "Muito quente" : score >= 65 ? "Aquecendo" : "Monitorando",
    title: `${name} é a oportunidade mais forte agora.`,
    description:
      automatic.length > 0
        ? "Este bloco resume o report automático com maior score no momento. Ele não prevê o mercado sozinho: só destaca qual oportunidade automatizada está combinando melhor demanda, momentum, concorrência, margem e fit."
        : "Ainda não existe report automático, então este bloco está usando a melhor pesquisa disponível para resumir o radar atual.",
    note: `Baseado em ${source.mode === "automatic" ? "report automático" : "pesquisa manual"} · atualizado ${formatDate(source.report.generatedAt)}.`,
    metrics: [
      {
        label: "Momentum",
        value: momentum == null ? "Sem dado" : `${momentum >= 0 ? "+" : ""}${momentum}%`,
      },
      { label: "Fit", value: `${fit}/100` },
      { label: "Buscas/mês", value: compactNumber(volume) },
    ],
  };
}

function ScoreRing({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const dimensions = size === "lg" ? "size-32" : size === "sm" ? "size-14" : "size-20";
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={score}
      className={cx("relative grid shrink-0 place-items-center rounded-full", dimensions)}
      style={{
        background: `conic-gradient(#0a0a0a ${score * 3.6}deg, #e8e8e5 0)`,
      }}
      aria-label={`Score ${score} de 100`}
    >
      <div className="absolute inset-[6px] rounded-full bg-white" />
      <span
        className={cx(
          "relative font-semibold tracking-[-.05em]",
          size === "lg" ? "text-4xl" : size === "sm" ? "text-base" : "text-2xl",
        )}
      >
        {score}
      </span>
    </div>
  );
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "good" | "warm";
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
        tone === "neutral" && "bg-gray-100 text-ink-soft",
        tone === "good" && "bg-[#e9f9c9] text-[#355500]",
        tone === "warm" && "bg-[#fff0d8] text-[#7c4900]",
      )}
    >
      {children}
    </span>
  );
}

function ReportCard({ stored, onOpen }: { stored: StoredReport; onOpen: () => void }) {
  const brief = stored.report.briefs[0];
  const score = brief?.opportunity.score ?? 0;
  const previewImage =
    brief?.creatives?.find((creative) => creative.type === "product_hero")?.imageUrl ??
    brief?.creatives?.find((creative) => creative.imageUrl)?.imageUrl ??
    brief?.imageUrl ??
    null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full flex-col rounded-md border border-black/8 bg-white p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(0,0,0,.07)]"
    >
      <div className="mb-5 overflow-hidden rounded-sm bg-[#f3f2ed]">
        {previewImage ? (
          <RocketImage
            src={previewImage}
            alt={brief?.concept?.name ?? stored.report.seed}
            className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex aspect-[4/3] items-end bg-[radial-gradient(circle_at_top_left,_#d9ff45,_transparent_38%),linear-gradient(135deg,_#efeee8,_#d7d4ca)] p-4">
            <span className="rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[.08em] text-ink">
              Sem imagem
            </span>
          </div>
        )}
      </div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Pill tone={stored.mode === "automatic" ? "good" : "neutral"}>
              {stored.mode === "automatic" ? "Automático" : "Manual"}
            </Pill>
            {score >= 80 && <Pill tone="warm">Janela quente</Pill>}
          </div>
          <h3 className="text-xl font-semibold tracking-[-.035em]">
            {brief?.concept?.name ?? stored.report.seed}
          </h3>
          <p className="mt-1 text-sm text-muted">Pesquisa: {stored.report.seed}</p>
        </div>
        <ScoreRing score={score} size="sm" />
      </div>
      <p className="mt-5 line-clamp-2 text-sm leading-relaxed text-ink-soft/75">
        {stored.report.summary}
      </p>
      <div className="mt-5 flex items-center justify-between border-t border-black/7 pt-4 text-xs text-muted">
        <span>{formatDate(stored.report.generatedAt)}</span>
        <span className="flex items-center gap-1 text-ink transition group-hover:gap-2">
          Abrir report <Glyph name="arrow" size={14} />
        </span>
      </div>
    </button>
  );
}

function Thermometer({ pulse }: { pulse: MarketPulse }) {
  return (
    <section className="relative overflow-hidden rounded-lg bg-ink p-6 text-white sm:p-8">
      <div className="rocket-grid absolute inset-0 opacity-25" />
      <div className="relative flex items-stretch justify-between gap-8">
        <div className="max-w-xl">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[.16em] text-white/45">
            <span className="size-2 rounded-full bg-[#b7f34a] shadow-[0_0_16px_#b7f34a]" />
            Pulso do mercado
          </div>
          <h2 className="mt-6 max-w-lg text-3xl font-semibold leading-[1.05] tracking-[-.045em] sm:text-4xl">
            {pulse.title}
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/55">{pulse.description}</p>
          <div className="mt-7 flex flex-wrap gap-2">
            {pulse.metrics.map((metric) => (
              <span
                key={metric.label}
                className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70"
              >
                {metric.label}: {metric.value}
              </span>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-white/45">{pulse.note}</p>
        </div>
        <div className="hidden items-center gap-5 sm:flex">
          <div className="relative h-52 w-14 rounded-full border border-white/15 bg-white/5 p-1.5">
            <div
              className="absolute inset-x-1.5 bottom-1.5 rounded-full bg-[#b7f34a] transition-all duration-700"
              style={{ height: `calc(${Math.max(pulse.score, 6)}% - 12px)` }}
            />
            <div className="absolute inset-x-0 top-[22%] border-t border-dashed border-white/20" />
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-white/20" />
          </div>
          <div>
            <p className="text-6xl font-semibold tracking-[-.07em]">{pulse.score}</p>
            <p className="mt-1 text-xs uppercase tracking-[.16em] text-[#b7f34a]">{pulse.status}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Overview({
  reports,
  health,
  openReport,
  startResearch,
}: {
  reports: StoredReport[];
  health: Awaited<ReturnType<typeof getRocketHealthServerFn>> | undefined;
  openReport: (report: StoredReport) => void;
  startResearch: () => void;
}) {
  const automatic = reports
    .filter((item) => item.mode === "automatic")
    .sort(
      (a, b) =>
        (b.report.briefs[0]?.opportunity.score ?? 0) - (a.report.briefs[0]?.opportunity.score ?? 0),
    );
  const pulse = buildMarketPulse(reports);
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[.16em] text-muted">
            Sábado, 8 de agosto
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-.045em]">
            Bom dia. O mercado se moveu.
          </h1>
        </div>
        <button
          type="button"
          onClick={startResearch}
          className="tap-scale rounded-sm bg-ink px-5 py-3 text-sm font-medium text-white"
        >
          Fazer pesquisa certeira
        </button>
      </div>

      <Thermometer pulse={pulse} />

      <div className="grid gap-6 lg:grid-cols-[1.45fr_.75fr]">
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-[-.03em]">Reports prontos</h2>
              <p className="mt-1 text-sm text-muted">
                Pesquisas automáticas priorizadas para sua operação.
              </p>
            </div>
            <span className="text-xs text-muted">{automatic.length} atualizados</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {automatic.slice(0, 2).map((report) => (
              <ReportCard key={report.id} stored={report} onOpen={() => openReport(report)} />
            ))}
          </div>
        </section>

        <aside className="rounded-md border border-black/8 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Cobertura das fontes</h2>
            <Pill tone={health?.connected ? "good" : "warm"}>
              {health?.connected ? "Conectado" : "Modo demo"}
            </Pill>
          </div>
          <div className="mt-5 space-y-4">
            {SOURCE_OPTIONS.slice(0, 4).map((source) => {
              const ready = Boolean(health?.providers[source.provider]);
              return (
                <div key={source.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{source.name}</p>
                    <p className="text-xs text-muted">{source.detail}</p>
                  </div>
                  <span
                    className={cx("size-2 rounded-full", ready ? "bg-[#78b800]" : "bg-amber-400")}
                    title={ready ? "Disponível" : "Degradação graciosa"}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-6 border-t border-black/7 pt-5">
            <div className="flex items-start gap-3">
              <Glyph name="clock" />
              <div>
                <p className="text-sm font-medium">Varredura automática</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {health?.automation?.enabled
                    ? `Diariamente às 06:00${
                        health.automation.nextRunAt
                          ? ` · próxima ${formatDate(health.automation.nextRunAt)}`
                          : ""
                      }`
                    : "Desativada no ambiente"}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-6 border-t border-black/7 pt-5">
            <div className="flex items-start gap-3">
              <Glyph name="store" />
              <div>
                <p className="text-sm font-medium">PublicaÃ§Ã£o atual</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  A Rocket publica hoje no catÃ¡logo local de validaÃ§Ã£o. Ela ainda nÃ£o envia esse
                  produto para a Shopify principal.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Breakdown({ brief }: { brief: ProductBrief }) {
  const labels: Array<[keyof ProductBrief["opportunity"]["breakdown"], string]> = [
    ["demand", "Demanda"],
    ["momentum", "Momentum"],
    ["competition", "Concorrência"],
    ["margin", "Margem"],
    ["fit", "Fit com a loja"],
  ];
  return (
    <div className="space-y-3">
      {labels.map(([key, label]) => (
        <div key={key} className="grid grid-cols-[100px_1fr_30px] items-center gap-3 text-xs">
          <span className="text-muted">{label}</span>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-ink"
              style={{ width: `${brief.opportunity.breakdown[key]}%` }}
            />
          </div>
          <span className="text-right font-medium">{brief.opportunity.breakdown[key]}</span>
        </div>
      ))}
    </div>
  );
}

function fallbackSourcePreviews(
  brief: ProductBrief,
  enabledSources: ResearchSource[],
): SourcePreview[] {
  const enabled = new Set(enabledSources);
  const previews: SourcePreview[] = [];
  const { trend, volume, market, gap } = brief.opportunity;

  if (enabled.has("google_trends")) {
    previews.push({
      source: "google_trends",
      label: "Google Trends",
      provider: "SerpApi",
      status: trend ? "collected" : "unavailable",
      summary: "Interesse ao longo do tempo e termos que estão acelerando.",
      metrics: trend
        ? [
            {
              label: "Momentum",
              value: `${trend.momentum >= 0 ? "+" : ""}${trend.momentum}%`,
            },
            {
              label: "Sinal",
              value: trend.isBreakout ? "Breakout" : "Em alta",
            },
          ]
        : [],
      items: (trend?.risingQueries ?? []).slice(0, 3).map((item) => ({
        title: item.query,
        subtitle: `Crescimento ${item.growth}`,
      })),
    });
  }
  if (enabled.has("social_viral")) {
    previews.push({
      source: "social_viral",
      label: "TikTok Shop radar (estimado)",
      provider: "Preview social",
      status: trend ? "estimated" : "unavailable",
      summary: "Produtos e hooks com potencial social derivados dos sinais de breakout.",
      metrics: trend
        ? [
            {
              label: "Sinal viral",
              value: trend.isBreakout ? "Breakout" : "Em alta",
            },
            {
              label: "Força",
              value: `${Math.min(100, 50 + trend.momentum)}/100`,
            },
          ]
        : [],
      items: (market?.offers ?? []).slice(0, 3).map((offer) => ({
        title: offer.title,
        subtitle: `${brl(offer.price)} · inspiração de formato`,
        image: offer.thumbnail,
        link: offer.link,
      })),
      note: "Estimativa para compreensão da fonte. Não representa uma consulta nativa ao TikTok Shop.",
    });
  }
  if (enabled.has("google_shopping")) {
    previews.push({
      source: "google_shopping",
      label: "Google Shopping",
      provider: "SerpApi",
      status: market ? "collected" : "unavailable",
      summary: "Amostra dos concorrentes usada para preço, reviews e saturação.",
      metrics: market
        ? [
            { label: "Ofertas", value: `${market.competitorCount}` },
            { label: "Preço mediano", value: brl(market.priceMedian) },
            {
              label: "Reviews",
              value: market.totalReviews.toLocaleString("pt-BR"),
            },
          ]
        : [],
      items: (market?.offers ?? []).slice(0, 4).map((offer) => ({
        title: offer.title,
        subtitle: `${brl(offer.price)}${offer.source ? ` · ${offer.source}` : ""}`,
        image: offer.thumbnail,
        link: offer.link,
      })),
    });
  }
  if (enabled.has("keyword_volume")) {
    previews.push({
      source: "keyword_volume",
      label: "Volume de busca",
      provider: "DataForSEO",
      status: volume ? "collected" : "unavailable",
      summary: "Demanda mensal e custo de mídia para a palavra-chave.",
      metrics: volume
        ? [
            {
              label: "Buscas/mês",
              value: volume.searchVolume?.toLocaleString("pt-BR") ?? "Sem dado",
            },
            {
              label: "Competição",
              value:
                volume.competition == null
                  ? "Sem dado"
                  : `${Math.round(volume.competition * 100)}%`,
            },
            { label: "CPC", value: brl(volume.cpc) },
          ]
        : [],
      items: [],
    });
  }
  if (enabled.has("catalog")) {
    previews.push({
      source: "catalog",
      label: "Catálogo da loja",
      provider: "Store catalog",
      status: gap ? "collected" : "unavailable",
      summary: gap?.inCatalog
        ? "Há produtos próximos; o conceito precisa se diferenciar."
        : "Whitespace confirmado para a coleção analisada.",
      metrics: gap
        ? [
            { label: "Resultado", value: gap.inCatalog ? "Presente" : "Gap" },
            { label: "Matches", value: `${gap.catalogMatches}` },
            { label: "Fit", value: `${brief.opportunity.breakdown.fit}/100` },
          ]
        : [],
      items: gap?.sampleMatch
        ? [
            {
              title: gap.sampleMatch,
              subtitle: "Produto ou coleção mais próxima",
            },
          ]
        : [],
    });
  }
  return previews;
}

function SourceAttachments({ brief, sources }: { brief: ProductBrief; sources: ResearchSource[] }) {
  const previews = brief.sourcePreviews?.length
    ? brief.sourcePreviews
    : fallbackSourcePreviews(brief, sources);
  return (
    <section className="rounded-md border border-black/8 bg-white p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[.14em] text-muted">
            Detalhes anexados
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-.03em]">
            Preview das fontes pesquisadas
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Abra cada fonte para entender quais evidências sustentam o score e como elas foram
            usadas.
          </p>
        </div>
        <span className="text-xs text-muted">{previews.length} fontes no report</span>
      </div>
      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        {previews.map((preview, index) => {
          const statusLabel =
            preview.status === "collected"
              ? "Coletado"
              : preview.status === "estimated"
                ? "Estimativa"
                : "Indisponível";
          return (
            <details
              key={preview.source}
              open={index < 2}
              className="group overflow-hidden rounded-sm border border-black/9 bg-[#fafaf8]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4">
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className={cx(
                      "size-2.5 shrink-0 rounded-full",
                      preview.status === "collected"
                        ? "bg-[#78b800]"
                        : preview.status === "estimated"
                          ? "bg-[#8b80ed]"
                          : "bg-gray-300",
                    )}
                  />
                  <span>
                    <span className="block text-sm font-semibold">{preview.label}</span>
                    <span className="mt-0.5 block text-xs text-muted">{preview.provider}</span>
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-medium">
                    {statusLabel}
                  </span>
                  <span className="text-lg text-muted transition group-open:rotate-45">+</span>
                </span>
              </summary>
              <div className="border-t border-black/7 bg-white p-4">
                <p className="text-sm leading-relaxed text-ink-soft">{preview.summary}</p>
                {preview.metrics.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {preview.metrics.map((metric) => (
                      <div key={metric.label} className="rounded-xs bg-gray-50 p-3">
                        <p className="text-[10px] uppercase tracking-[.08em] text-muted">
                          {metric.label}
                        </p>
                        <p className="mt-1 text-sm font-semibold">{metric.value}</p>
                      </div>
                    ))}
                  </div>
                )}
                {preview.items.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {preview.items.map((item, itemIndex) => {
                      const content = (
                        <>
                          {item.image && (
                            <RocketImage
                              src={item.image}
                              alt=""
                              className="size-12 shrink-0 rounded-xs object-cover"
                            />
                          )}
                          <span className="min-w-0">
                            <span className="line-clamp-2 block text-xs font-medium">
                              {item.title}
                            </span>
                            {item.subtitle && (
                              <span className="mt-1 block text-[11px] text-muted">
                                {item.subtitle}
                              </span>
                            )}
                          </span>
                        </>
                      );
                      return item.link ? (
                        <a
                          key={`${item.title}-${itemIndex}`}
                          href={item.link}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-3 rounded-xs border border-black/7 p-2.5 transition hover:bg-gray-50"
                        >
                          {content}
                        </a>
                      ) : (
                        <div
                          key={`${item.title}-${itemIndex}`}
                          className="flex items-center gap-3 rounded-xs border border-black/7 p-2.5"
                        >
                          {content}
                        </div>
                      );
                    })}
                  </div>
                )}
                {preview.note && (
                  <p className="mt-4 rounded-xs bg-[#f0edff] p-3 text-[11px] leading-relaxed text-[#4c448c]">
                    {preview.note}
                  </p>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}

function ReportDetail({
  stored,
  onBack,
  onDeleted,
  canDelete,
}: {
  stored: StoredReport;
  onBack: () => void;
  onDeleted: () => void;
  canDelete: boolean;
}) {
  const [briefIndex, setBriefIndex] = useState(0);
  const defaultCollection = stored.report.config?.collections[0] ?? "Accessories";
  const [catalogDraft, setCatalogDraft] = useState<CatalogDraft>(() =>
    catalogDraftFromBrief(stored.report.briefs[0], defaultCollection),
  );
  const queryClient = useQueryClient();
  const launchesQuery = useQuery({
    queryKey: ["rocket-launches"],
    queryFn: () => getRocketLaunchesServerFn(),
    staleTime: 15_000,
  });
  const launchMutation = useMutation({
    mutationFn: (request: LaunchProductRequest) => launchRocketProductServerFn({ data: request }),
    onSuccess: (product) => {
      queryClient.setQueryData<{ products: LaunchedProduct[] }>(["rocket-launches"], (current) => ({
        products: [product, ...(current?.products ?? []).filter((item) => item.id !== product.id)],
      }));
      void queryClient.invalidateQueries({ queryKey: ["rocket-launches"] });
    },
  });
  const deleteProductMutation = useMutation({
    mutationFn: (productId: string) => deleteRocketProductServerFn({ data: { productId } }),
    onSuccess: (result) => {
      queryClient.setQueryData(["rocket-launches"], {
        products: result.products,
      });
    },
  });
  const deleteReportMutation = useMutation({
    mutationFn: () => deleteRocketReportServerFn({ data: { reportId: stored.id } }),
    onSuccess: (result) => {
      queryClient.setQueryData(["rocket-reports"], {
        reports: result.reports,
        connected: true,
      });
      queryClient.invalidateQueries({ queryKey: ["rocket-launches"] });
      onDeleted();
    },
  });
  const brief = stored.report.briefs[briefIndex];
  const concept = brief?.concept;
  const creatives = brief?.creatives?.length
    ? brief.creatives
    : brief?.imageUrl
      ? [
          {
            type: "product_hero" as const,
            imageUrl: brief.imageUrl,
            prompt: "",
          },
        ]
      : [];
  const launchedProduct = launchesQuery.data?.products.find(
    (product) => product.reportId === stored.id && product.briefIndex === briefIndex,
  );
  const collectionOptions = [
    ...new Set([
      ...(stored.report.config?.collections?.length
        ? stored.report.config.collections
        : STORE_COLLECTIONS),
      catalogDraft.collection,
      ...(launchedProduct ? [launchedProduct.collection] : []),
    ]),
  ];
  const savedCatalogDraft = launchedProduct
    ? catalogDraftFromProduct(launchedProduct)
    : catalogDraftFromBrief(brief, defaultCollection);
  const hasCatalogChanges = !catalogDraftsMatch(catalogDraft, savedCatalogDraft);
  const catalogDraftIsValid =
    catalogDraft.name.trim().length >= 2 &&
    catalogDraft.tagline.trim().length >= 2 &&
    catalogDraft.description.trim().length >= 2 &&
    catalogDraft.collection.trim().length > 0 &&
    catalogDraft.imageUrl.trim().length > 0 &&
    catalogDraft.price > 0;

  useEffect(() => {
    setCatalogDraft(
      launchedProduct
        ? catalogDraftFromProduct(launchedProduct)
        : catalogDraftFromBrief(brief, defaultCollection),
    );
  }, [brief, defaultCollection, launchedProduct]);

  if (!brief) return <p>Este report não contém oportunidades.</p>;

  const linkedLaunchCount =
    launchesQuery.data?.products.filter((product) => product.reportId === stored.id).length ?? 0;

  const launch = () => {
    if (!concept || !catalogDraftIsValid) return;
    launchMutation.mutate({
      reportId: stored.id,
      briefIndex,
      ...catalogDraft,
      tags: [...concept.keySpecs, ...concept.differentiators].slice(0, 12),
    });
  };

  const updateCatalogDraft = <Key extends keyof CatalogDraft>(key: Key, value: CatalogDraft[Key]) =>
    setCatalogDraft((current) => ({ ...current, [key]: value }));

  const removeLaunchedProduct = () => {
    if (!launchedProduct) return;
    if (!window.confirm("Excluir o produto lancado desta oportunidade?")) return;
    deleteProductMutation.mutate(launchedProduct.id);
  };

  const removeReport = () => {
    if (!canDelete) return;
    const scope =
      linkedLaunchCount > 0
        ? `Este report e ${linkedLaunchCount} produto(s) associado(s) serao removidos.`
        : "Este report sera removido.";
    if (!window.confirm(`${scope} Deseja continuar?`)) return;
    deleteReportMutation.mutate();
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted hover:text-ink"
        >
          <span className="rotate-180">
            <Glyph name="arrow" size={15} />
          </span>{" "}
          Voltar aos reports
        </button>
        <div className="flex flex-wrap gap-2">
          {launchedProduct && (
            <button
              type="button"
              onClick={removeLaunchedProduct}
              disabled={deleteProductMutation.isPending}
              className="rounded-sm border border-black/12 bg-white px-4 py-2 text-xs font-medium disabled:opacity-50"
            >
              {deleteProductMutation.isPending ? "Excluindo produto..." : "Excluir produto lancado"}
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={removeReport}
              disabled={deleteReportMutation.isPending}
              className="flex items-center gap-2 rounded-sm border border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-700 disabled:opacity-50"
            >
              <Glyph name="trash" size={14} />
              {deleteReportMutation.isPending ? "Excluindo report..." : "Excluir report"}
            </button>
          )}
        </div>
      </div>
      <header className="rounded-lg bg-ink p-6 text-white sm:p-8">
        <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-start">
          <div className="max-w-3xl">
            <div className="flex flex-wrap gap-2">
              <Pill tone="good">
                {stored.mode === "automatic" ? "Pesquisa automática" : "Pesquisa manual"}
              </Pill>
              <Pill>{stored.report.geo}</Pill>
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-[-.05em] sm:text-4xl">
              {concept?.name ?? brief.opportunity.keyword}
            </h1>
            <p className="mt-2 text-base text-white/55">
              {concept?.tagline ?? brief.opportunity.keyword}
            </p>
            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-white/70">
              {stored.report.summary}
            </p>
          </div>
          <div className="rounded-full bg-white p-1">
            <ScoreRing score={brief.opportunity.score} size="lg" />
          </div>
        </div>
      </header>

      {stored.report.briefs.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {stored.report.briefs.map((item, index) => (
            <button
              key={item.opportunity.keyword}
              type="button"
              onClick={() => setBriefIndex(index)}
              className={cx(
                "rounded-full px-4 py-2 text-sm",
                briefIndex === index ? "bg-ink text-white" : "bg-white",
              )}
            >
              {index + 1}. {item.concept?.name ?? item.opportunity.keyword}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_.85fr]">
        <section className="rounded-md border border-black/8 bg-white p-6">
          <p className="text-xs font-medium uppercase tracking-[.14em] text-muted">
            Leitura da oportunidade
          </p>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            {brief.opportunity.rationale}
          </p>
          <div className="mt-7">
            <Breakdown brief={brief} />
          </div>
          <div className="mt-7 grid grid-cols-3 gap-3 border-t border-black/7 pt-5">
            <div>
              <p className="text-xs text-muted">Buscas/mês</p>
              <p className="mt-1 text-lg font-semibold">
                {brief.opportunity.volume?.searchVolume?.toLocaleString("pt-BR") ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Momentum</p>
              <p className="mt-1 text-lg font-semibold">
                {brief.opportunity.trend ? `+${brief.opportunity.trend.momentum}%` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Catálogo</p>
              <p className="mt-1 text-lg font-semibold">
                {brief.opportunity.gap?.inCatalog ? "Presente" : "Gap"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-black/8 bg-white p-6">
          <p className="text-xs font-medium uppercase tracking-[.14em] text-muted">
            Conceito recomendado
          </p>
          {concept ? (
            <>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">{concept.positioning}</p>
              <p className="mt-4 text-xs text-muted">Público</p>
              <p className="mt-1 text-sm">{concept.targetAudience}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {concept.keySpecs.map((spec) => (
                  <Pill key={spec}>{spec}</Pill>
                ))}
              </div>
              <div className="mt-6 flex items-end justify-between border-t border-black/7 pt-5">
                <div>
                  <p className="text-xs text-muted">Preço sugerido</p>
                  <p className="mt-1 text-2xl font-semibold tracking-[-.04em]">
                    {brl(concept.suggestedPrice)}
                  </p>
                </div>
                <Pill tone="good">Fit {brief.opportunity.breakdown.fit}/100</Pill>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-muted">
              Conceito indisponível. Configure um provedor de LLM para completar esta etapa.
            </p>
          )}
        </section>
      </div>

      <SourceAttachments
        brief={brief}
        sources={
          stored.report.config?.sources ?? [
            "google_trends",
            "social_viral",
            "google_shopping",
            "keyword_volume",
            "catalog",
          ]
        }
      />

      <section className="overflow-hidden rounded-md border border-black/8 bg-[#d9ff45]">
        <div className="flex flex-col justify-between gap-5 p-6 sm:flex-row sm:items-start">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[.14em] text-black/55">
              Catálogo Rocket
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-.04em]">
              Edite e sincronize o produto
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-black/65">
              Os campos abaixo são a fonte do card em Rocket Drops. Depois de editar, salve para
              atualizar a vitrine imediatamente.
            </p>
          </div>
          <span
            className={cx(
              "w-fit rounded-full px-3 py-1.5 text-xs font-semibold",
              hasCatalogChanges ? "bg-ink text-white" : "bg-white/70 text-black/65",
            )}
          >
            {hasCatalogChanges ? "Alterações pendentes" : "Catálogo sincronizado"}
          </span>
        </div>

        <div className="grid gap-6 border-t border-black/10 bg-white/70 p-6 lg:grid-cols-[220px_1fr]">
          <div>
            <div className="aspect-square overflow-hidden rounded-sm border border-black/10 bg-white">
              <RocketImage
                src={catalogDraft.imageUrl}
                alt={catalogDraft.name || "Preview do produto"}
                className="size-full object-cover"
              />
            </div>
            {creatives.filter((creative) => creative.imageUrl).length > 1 && (
              <div className="mt-3 flex gap-2">
                {creatives
                  .filter((creative) => creative.imageUrl)
                  .map((creative) => (
                    <button
                      key={creative.type}
                      type="button"
                      onClick={() => updateCatalogDraft("imageUrl", creative.imageUrl ?? "")}
                      className={cx(
                        "size-11 overflow-hidden rounded-xs border bg-white",
                        catalogDraft.imageUrl === creative.imageUrl
                          ? "border-ink ring-1 ring-ink"
                          : "border-black/10",
                      )}
                      title={`Usar ${creative.type} no catálogo`}
                    >
                      <RocketImage
                        src={creative.imageUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    </button>
                  ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-medium text-black/60 sm:col-span-2">
              Nome do produto
              <input
                value={catalogDraft.name}
                onChange={(event) => updateCatalogDraft("name", event.target.value)}
                className="mt-1.5 h-11 w-full rounded-sm border border-black/15 bg-white px-3 text-sm text-ink outline-none focus:border-black"
              />
            </label>
            <label className="text-xs font-medium text-black/60">
              Preço
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={catalogDraft.price || ""}
                onChange={(event) => updateCatalogDraft("price", Number(event.target.value))}
                className="mt-1.5 h-11 w-full rounded-sm border border-black/15 bg-white px-3 text-sm text-ink outline-none focus:border-black"
              />
            </label>
            <label className="text-xs font-medium text-black/60">
              Coleção de destino
              <select
                value={catalogDraft.collection}
                onChange={(event) => updateCatalogDraft("collection", event.target.value)}
                className="mt-1.5 h-11 w-full rounded-sm border border-black/15 bg-white px-3 text-sm text-ink outline-none focus:border-black"
              >
                {collectionOptions.map((collection) => (
                  <option key={collection}>{collection}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-black/60 sm:col-span-2">
              Chamada curta
              <input
                value={catalogDraft.tagline}
                onChange={(event) => updateCatalogDraft("tagline", event.target.value)}
                className="mt-1.5 h-11 w-full rounded-sm border border-black/15 bg-white px-3 text-sm text-ink outline-none focus:border-black"
              />
            </label>
            <label className="text-xs font-medium text-black/60 sm:col-span-2">
              Descrição
              <textarea
                rows={4}
                value={catalogDraft.description}
                onChange={(event) => updateCatalogDraft("description", event.target.value)}
                className="mt-1.5 w-full resize-y rounded-sm border border-black/15 bg-white p-3 text-sm leading-relaxed text-ink outline-none focus:border-black"
              />
            </label>
            <label className="text-xs font-medium text-black/60 sm:col-span-2">
              URL da imagem
              <input
                value={catalogDraft.imageUrl}
                onChange={(event) => updateCatalogDraft("imageUrl", event.target.value)}
                className="mt-1.5 h-11 w-full rounded-sm border border-black/15 bg-white px-3 text-xs text-ink outline-none focus:border-black"
              />
            </label>
            <div className="flex flex-col gap-3 border-t border-black/10 pt-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-black/55">
                {launchedProduct
                  ? `Última sincronização: ${formatDate(launchedProduct.updatedAt)}`
                  : "Este produto ainda não está publicado em Rocket Drops."}
              </p>
              <button
                type="button"
                onClick={launch}
                disabled={
                  !concept ||
                  !catalogDraftIsValid ||
                  launchMutation.isPending ||
                  Boolean(launchedProduct && !hasCatalogChanges)
                }
                className="tap-scale flex h-11 items-center justify-center gap-2 rounded-sm bg-ink px-5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Glyph name="store" size={17} />
                {launchMutation.isPending
                  ? "Sincronizando..."
                  : launchedProduct
                    ? "Salvar e sincronizar"
                    : "Publicar em Rocket Drops"}
              </button>
            </div>
          </div>
        </div>

        {launchedProduct && !hasCatalogChanges && (
          <div className="flex flex-col justify-between gap-3 border-t border-black/10 bg-white/55 px-6 py-4 sm:flex-row sm:items-center">
            <p className="text-sm font-medium">
              Produto sincronizado com Rocket Drops em {launchedProduct.collection}.
            </p>
            <Link
              to="/collections/rocket-launches"
              className="flex items-center gap-2 text-sm font-semibold underline underline-offset-4"
            >
              Ver na coleção <Glyph name="arrow" size={14} />
            </Link>
          </div>
        )}
        {launchMutation.isError && (
          <p className="border-t border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
            {launchMutation.error instanceof Error
              ? launchMutation.error.message
              : "Não foi possível publicar o produto."}
          </p>
        )}
      </section>

      <section className="rounded-md border border-black/8 bg-white p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-medium uppercase tracking-[.14em] text-muted">
              Creative kit
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-.03em]">
              Peças no estilo da loja
            </h2>
          </div>
          <span className="text-xs text-muted">{creatives.length} formatos gerados</span>
        </div>
        {creatives.length ? (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {creatives.map((creative) => (
              <figure key={creative.type} className="overflow-hidden rounded-sm bg-gray-100">
                <RocketImage
                  src={creative.imageUrl}
                  alt={`Criativo ${creative.type}`}
                  className="aspect-[4/3] h-full max-h-72 w-full object-cover"
                />
                <figcaption className="flex items-center justify-between bg-gray-50 px-3 py-3 text-xs">
                  <span>{CREATIVE_OPTIONS.find((item) => item.id === creative.type)?.name}</span>
                  <span className="text-muted">
                    {CREATIVE_OPTIONS.find((item) => item.id === creative.type)?.format}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted">
            As imagens não foram geradas nesta execução. O prompt de estilo continua salvo no
            report.
          </p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-md border border-black/8 bg-white p-6">
          <p className="text-xs font-medium uppercase tracking-[.14em] text-muted">Copy pronta</p>
          {brief.copy ? (
            <>
              <h3 className="mt-4 text-lg font-semibold">{brief.copy.productTitle}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                {brief.copy.pdpDescription}
              </p>
              <div className="mt-5 space-y-2">
                {brief.copy.adCopies.map((copy) => (
                  <p key={copy} className="border-l-2 border-ink pl-3 text-sm">
                    {copy}
                  </p>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-muted">Copy não gerada nesta execução.</p>
          )}
        </section>
        <section className="rounded-md border border-black/8 bg-white p-6">
          <p className="text-xs font-medium uppercase tracking-[.14em] text-muted">
            Operação e sourcing
          </p>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-muted">Custo</p>
              <p className="mt-1 font-semibold">{brl(brief.sourcing?.estimatedUnitCost)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Venda</p>
              <p className="mt-1 font-semibold">{brl(brief.sourcing?.suggestedRetailPrice)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Margem</p>
              <p className="mt-1 font-semibold">
                {brief.sourcing?.estimatedMarginPct != null
                  ? `${brief.sourcing.estimatedMarginPct}%`
                  : "—"}
              </p>
            </div>
          </div>
          {brief.sourcing?.rfqDraft && (
            <div className="mt-5 rounded-sm bg-gray-50 p-4 text-xs leading-relaxed text-ink-soft">
              {brief.sourcing.rfqDraft}
            </div>
          )}
        </section>
      </div>

      {stored.report.degraded.length > 0 && (
        <p className="rounded-sm bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Fontes com degradação nesta execução: {stored.report.degraded.join(", ")}.
        </p>
      )}
    </div>
  );
}

function Reports({
  reports,
  selected,
  setSelected,
  persistedReportIds,
}: {
  reports: StoredReport[];
  selected: StoredReport | null;
  setSelected: (report: StoredReport | null) => void;
  persistedReportIds: Set<string>;
}) {
  const queryClient = useQueryClient();
  const refreshMutation = useMutation({
    mutationFn: () => refreshRocketReportsServerFn(),
    onSuccess: (result) =>
      queryClient.setQueryData(["rocket-reports"], {
        reports: result.reports,
        connected: true,
      }),
  });
  if (selected) {
    return (
      <ReportDetail
        stored={selected}
        onBack={() => setSelected(null)}
        onDeleted={() => setSelected(null)}
        canDelete={persistedReportIds.has(selected.id)}
      />
    );
  }
  return (
    <div>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[.16em] text-muted">
            Histórico vivo
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-.045em]">
            Reports de oportunidade
          </h1>
          <p className="mt-2 text-sm text-muted">
            Automáticos e pesquisas certeiras, ordenados pela atualização mais recente.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <button
            type="button"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            className="tap-scale flex items-center gap-2 rounded-sm border border-black/12 bg-white px-4 py-2.5 text-xs font-medium disabled:opacity-50"
          >
            <Glyph name="clock" size={15} />
            {refreshMutation.isPending ? "Sincronizando..." : "Atualizar reports"}
          </button>
          {refreshMutation.isSuccess && (
            <span className="text-[11px] text-[#4f7700]">Reports e criativos sincronizados.</span>
          )}
          {refreshMutation.isError && (
            <span className="text-[11px] text-red-700">Não foi possível sincronizar.</span>
          )}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => (
          <ReportCard key={report.id} stored={report} onOpen={() => setSelected(report)} />
        ))}
      </div>
    </div>
  );
}

function ToggleCard({
  active,
  onClick,
  title,
  detail,
  aside,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  detail: string;
  aside?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex w-full items-start justify-between gap-4 rounded-sm border p-4 text-left transition",
        active
          ? "border-ink bg-white shadow-[0_8px_22px_rgba(0,0,0,.05)]"
          : "border-black/8 bg-gray-50 hover:bg-white",
      )}
    >
      <div className="flex gap-3">
        <span
          className={cx(
            "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border",
            active ? "border-ink bg-ink text-white" : "border-black/20",
          )}
        >
          {active && <Glyph name="check" size={12} />}
        </span>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{detail}</p>
        </div>
      </div>
      {aside}
    </button>
  );
}

function ResearchWizard({
  health,
  activeJob,
  reports,
  onJobStarted,
  onJobCleared,
  openReport,
}: {
  health: Awaited<ReturnType<typeof getRocketHealthServerFn>> | undefined;
  activeJob: ResearchJob | null;
  reports: StoredReport[];
  onJobStarted: (job: ResearchJob) => void;
  onJobCleared: () => void;
  openReport: (report: StoredReport) => void;
}) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [seed, setSeed] = useState("acessórios urbanos funcionais");
  const [profile, setProfile] = useState("Teen / social media");
  const [audience, setAudience] = useState(
    "16 a 24 anos, urbano, mobile-first e influenciado por creators",
  );
  const [sources, setSources] = useState<ResearchSource[]>([
    "google_trends",
    "social_viral",
    "google_shopping",
    "keyword_volume",
    "catalog",
  ]);
  const [collections, setCollections] = useState<string[]>(["Accessories"]);
  const [creativeTypes, setCreativeTypes] = useState<CreativeType[]>(["product_hero", "social_ad"]);
  const [storeStyle, setStoreStyle] = useState(DEFAULT_STORE_STYLE);
  const [referenceImages, setReferenceImages] = useState<string[]>(
    STORE_VISUAL_REFERENCES.map((reference) => reference.url),
  );
  const completedReport = activeJob?.reportId
    ? (reports.find((report) => report.id === activeJob.reportId) ?? null)
    : null;
  useEffect(() => {
    if (activeJob?.status === "succeeded") {
      void queryClient.invalidateQueries({ queryKey: ["rocket-reports"] });
    }
  }, [activeJob?.status, queryClient]);
  const mutation = useMutation({
    mutationFn: (request: ResearchRequest) => startRocketResearchJobServerFn({ data: request }),
    onSuccess: onJobStarted,
  });
  const toggle = <T,>(value: T, list: T[], update: (next: T[]) => void) =>
    update(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  const canContinue =
    step === 0
      ? seed.trim().length > 2 && sources.length > 0
      : step === 1
        ? collections.length > 0
        : step === 2
          ? creativeTypes.length > 0
          : true;
  const run = () =>
    mutation.mutate({
      seed,
      profile,
      audience,
      sources,
      collections,
      creativeTypes,
      storeStyle,
      referenceImages,
      topN: 2,
      maxCandidates: 6,
      mode: "manual",
    });

  if (activeJob) {
    const running = isActiveResearchJob(activeJob);
    const progress = Math.max(activeJob.progress.percent, 3);
    const statusTone =
      activeJob.status === "succeeded"
        ? "good"
        : activeJob.status === "failed"
          ? "warm"
          : "neutral";
    const statusLabel =
      activeJob.status === "queued"
        ? "Na fila"
        : activeJob.status === "running"
          ? "Em andamento"
          : activeJob.status === "succeeded"
            ? "Concluida"
            : "Falhou";

    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[.16em] text-muted">
            Pesquisa certeira
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-.045em]">
            {running ? "A Rocket segue pesquisando em background" : "Acompanhe a ultima execucao"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {running
              ? "Voce pode sair desta tela e voltar depois. O backend continua executando a pesquisa e o progresso reaparece aqui."
              : "A execucao terminou e ficou salva para voce retomar daqui sem perder o contexto."}
          </p>
        </div>
        <section className="rounded-md border border-black/8 bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Pill tone={statusTone}>{statusLabel}</Pill>
            <span className="text-xs font-medium text-muted">{progress}%</span>
          </div>
          <h2 className="mt-5 text-2xl font-semibold tracking-[-.04em]">
            {activeJob.progress.label}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{activeJob.progress.detail}</p>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-ink transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ["Tema", activeJob.request.seed],
              ["Etapa", activeJob.progress.label],
              ["Atualizado", formatDate(activeJob.updatedAt)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-sm border border-black/8 bg-[#f7f6f1] p-4">
                <p className="text-xs text-muted">{label}</p>
                <p className="mt-2 text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>
          {activeJob.error && (
            <p className="mt-5 rounded-sm bg-red-50 p-4 text-sm text-red-700">{activeJob.error}</p>
          )}
          {running && (
            <p className="mt-5 text-xs leading-relaxed text-muted">
              Enquanto esta execucao estiver ativa, a Rocket continua consultando sinais, montando
              oportunidades e gerando o report no backend.
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            {completedReport ? (
              <button
                type="button"
                onClick={() => {
                  onJobCleared();
                  openReport(completedReport);
                }}
                className="tap-scale rounded-sm bg-ink px-5 py-2.5 text-sm font-medium text-white"
              >
                Abrir report
              </button>
            ) : activeJob.status === "succeeded" ? (
              <button
                type="button"
                disabled
                className="rounded-sm border border-black/12 bg-white px-5 py-2.5 text-sm text-muted"
              >
                Sincronizando report...
              </button>
            ) : null}
            {(activeJob.status === "succeeded" || activeJob.status === "failed") && (
              <button
                type="button"
                onClick={onJobCleared}
                className="rounded-sm border border-black/12 bg-white px-5 py-2.5 text-sm font-medium"
              >
                {activeJob.status === "failed" ? "Tentar novamente" : "Nova pesquisa"}
              </button>
            )}
          </div>
        </section>
      </div>
    );
  }

  if (mutation.isPending)
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <div className="rocket-loader mx-auto grid size-24 place-items-center rounded-full">
          <Glyph name="spark" size={26} />
        </div>
        <h2 className="mt-8 text-2xl font-semibold tracking-[-.04em]">
          A Rocket está conectando os sinais.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
          Buscando tendências, comparando com as coleções e desenvolvendo conceitos e criativos.
          Geração de imagens pode levar alguns minutos.
        </p>
        <div className="mx-auto mt-8 h-1.5 max-w-md overflow-hidden rounded-full bg-gray-200">
          <div className="rocket-progress h-full rounded-full bg-ink" />
        </div>
      </div>
    );

  const steps = ["Inteligência", "Coleções", "Criativos", "Revisão"];
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[.16em] text-muted">
          Pesquisa certeira
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-.045em]">
          Configure o radar da Rocket
        </h1>
      </div>
      <div className="mb-8 grid grid-cols-4 gap-2">
        {steps.map((label, index) => (
          <button
            type="button"
            key={label}
            onClick={() => index <= step && setStep(index)}
            className="text-left"
          >
            <span
              className={cx(
                "mb-2 block h-1 rounded-full",
                index <= step ? "bg-ink" : "bg-gray-200",
              )}
            />
            <span className={cx("text-xs", index === step ? "font-medium text-ink" : "text-muted")}>
              {index + 1}. {label}
            </span>
          </button>
        ))}
      </div>
      <section className="rounded-md border border-black/8 bg-white p-5 sm:p-7">
        {step === 0 && (
          <div>
            <h2 className="text-xl font-semibold tracking-[-.03em]">Onde e para quem pesquisar?</h2>
            <p className="mt-2 text-sm text-muted">
              Defina uma hipótese, escolha o perfil e controle as fontes que entram no score.
            </p>
            <label className="mt-7 block text-xs font-medium uppercase tracking-[.12em] text-muted">
              Tema ou categoria
              <input
                value={seed}
                onChange={(event) => setSeed(event.target.value)}
                className="mt-2 h-12 w-full rounded-sm border border-black/15 px-4 text-base normal-case tracking-normal text-ink outline-none focus:border-ink"
              />
            </label>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {PROFILES.map((item) => (
                <ToggleCard
                  key={item.id}
                  active={profile === item.id}
                  onClick={() => setProfile(item.id)}
                  title={item.title}
                  detail={item.detail}
                />
              ))}
            </div>
            <label className="mt-6 block text-xs font-medium uppercase tracking-[.12em] text-muted">
              Recorte de público
              <textarea
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
                rows={3}
                className="mt-2 w-full resize-none rounded-sm border border-black/15 p-4 text-sm normal-case tracking-normal text-ink outline-none focus:border-ink"
              />
            </label>
            <h3 className="mt-7 text-sm font-semibold">Fontes da pesquisa</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {SOURCE_OPTIONS.map((source) => (
                <ToggleCard
                  key={source.id}
                  active={sources.includes(source.id)}
                  onClick={() =>
                    sources.length > 1 || !sources.includes(source.id)
                      ? toggle(source.id, sources, setSources)
                      : undefined
                  }
                  title={source.name}
                  detail={source.detail}
                  aside={
                    <span
                      className={cx(
                        "mt-1 size-2 shrink-0 rounded-full",
                        health?.providers[source.provider] ? "bg-[#78b800]" : "bg-amber-400",
                      )}
                    />
                  }
                />
              ))}
            </div>
          </div>
        )}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold tracking-[-.03em]">
              Quais coleções entram no cruzamento?
            </h2>
            <p className="mt-2 text-sm text-muted">
              A Rocket usa essas escolhas para medir fit, sobreposição e whitespace.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {STORE_COLLECTIONS.map((collection) => (
                <ToggleCard
                  key={collection}
                  active={collections.includes(collection)}
                  onClick={() => toggle(collection, collections, setCollections)}
                  title={collection}
                  detail={
                    collection === "Accessories"
                      ? "18 produtos · maior afinidade com o tema"
                      : "Coleção ativa da storefront"
                  }
                />
              ))}
            </div>
            <div className="mt-6 rounded-sm bg-[#eef7de] p-4 text-sm text-[#355500]">
              <strong>Leitura inicial:</strong> Accessories é a coleção com maior proximidade
              semântica; o motor também buscará produtos que ainda não existem nela.
            </div>
          </div>
        )}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-semibold tracking-[-.03em]">
              Que kit criativo será produzido?
            </h2>
            <p className="mt-2 text-sm text-muted">
              Cada formato gera um prompt e uma imagem próprios, usando a direção visual da loja.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {CREATIVE_OPTIONS.map((creative) => (
                <ToggleCard
                  key={creative.id}
                  active={creativeTypes.includes(creative.id)}
                  onClick={() => toggle(creative.id, creativeTypes, setCreativeTypes)}
                  title={creative.name}
                  detail={creative.format}
                />
              ))}
            </div>
            <div className="mt-7 flex items-end justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold">Referências da storefront</h3>
                <p className="mt-1 text-xs text-muted">
                  A IA usa composição, cor e luz. Produtos, pessoas e logos não são copiados.
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted">
                {referenceImages.length} de {STORE_VISUAL_REFERENCES.length}
              </span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {STORE_VISUAL_REFERENCES.map((reference) => {
                const active = referenceImages.includes(reference.url);
                return (
                  <button
                    type="button"
                    key={reference.url}
                    aria-pressed={active}
                    onClick={() => toggle(reference.url, referenceImages, setReferenceImages)}
                    className={cx(
                      "group overflow-hidden rounded-sm border bg-white text-left transition",
                      active
                        ? "border-ink ring-1 ring-ink"
                        : "border-black/10 hover:border-black/30",
                    )}
                  >
                    <span className="relative block aspect-[16/10] overflow-hidden bg-gray-100">
                      <img
                        src={reference.url}
                        alt={reference.name}
                        className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                      <span
                        className={cx(
                          "absolute right-2 top-2 grid size-6 place-items-center rounded-full border backdrop-blur-sm",
                          active
                            ? "border-ink bg-ink text-white"
                            : "border-white/70 bg-white/70 text-transparent",
                        )}
                      >
                        <Glyph name="check" size={13} />
                      </span>
                    </span>
                    <span className="block p-3">
                      <span className="block text-sm font-medium">{reference.name}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted">
                        {reference.detail}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <label className="mt-7 block text-xs font-medium uppercase tracking-[.12em] text-muted">
              Direção visual
              <textarea
                value={storeStyle}
                onChange={(event) => setStoreStyle(event.target.value)}
                rows={4}
                className="mt-2 w-full resize-none rounded-sm border border-black/15 p-4 text-sm normal-case tracking-normal text-ink outline-none focus:border-ink"
              />
            </label>
            <p className="mt-2 text-xs text-muted">
              A imagem é gerada sem texto ou logo inventado; copy e aplicação final ficam separadas
              no report.
            </p>
          </div>
        )}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-semibold tracking-[-.03em]">Revisar e lançar</h2>
            <p className="mt-2 text-sm text-muted">
              A execução será salva em Reports como pesquisa manual.
            </p>
            <dl className="mt-7 divide-y divide-black/7 rounded-sm border border-black/8">
              {[
                ["Tema", seed],
                ["Perfil", profile],
                ["Público", audience],
                [
                  "Fontes",
                  SOURCE_OPTIONS.filter((item) => sources.includes(item.id))
                    .map((item) => item.name)
                    .join(", "),
                ],
                ["Coleções", collections.join(", ")],
                [
                  "Criativos",
                  CREATIVE_OPTIONS.filter((item) => creativeTypes.includes(item.id))
                    .map((item) => item.name)
                    .join(", "),
                ],
                [
                  "Referências",
                  referenceImages.length
                    ? `${referenceImages.length} imagens da storefront`
                    : "Somente direção textual",
                ],
              ].map(([label, value]) => (
                <div key={label} className="grid gap-2 p-4 sm:grid-cols-[120px_1fr]">
                  <dt className="text-xs font-medium text-muted">{label}</dt>
                  <dd className="text-sm">{value}</dd>
                </div>
              ))}
            </dl>
            {mutation.isError && (
              <p className="mt-5 rounded-sm bg-red-50 p-4 text-sm text-red-700">
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : "Não foi possível executar a pesquisa."}
              </p>
            )}
            <button
              type="button"
              onClick={run}
              className="tap-scale mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-ink text-sm font-medium text-white"
            >
              <Glyph name="spark" size={17} /> Gerar report completo
            </button>
          </div>
        )}
      </section>
      <div className="mt-5 flex justify-between">
        <button
          type="button"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="rounded-sm px-4 py-2 text-sm text-muted disabled:opacity-0"
        >
          Voltar
        </button>
        {step < 3 && (
          <button
            type="button"
            onClick={() => canContinue && setStep(step + 1)}
            disabled={!canContinue}
            className="tap-scale rounded-sm bg-ink px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            Continuar
          </button>
        )}
      </div>
    </div>
  );
}

interface SupplierRow {
  product: string;
  supplier: string;
  cost: number;
  moq: number;
  leadTime: number;
  capacity: number;
}

function parseSupplierCsv(text: string): SupplierRow[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const separator = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(separator).map((header) => header.trim().toLowerCase());
  const index = (names: string[]) => headers.findIndex((header) => names.includes(header));
  const at = {
    product: index(["produto", "product"]),
    supplier: index(["fornecedor", "supplier"]),
    cost: index(["custo", "cost", "custo_unitario"]),
    moq: index(["moq", "quantidade_minima"]),
    leadTime: index(["prazo_dias", "lead_time", "leadtime"]),
    capacity: index(["capacidade_mensal", "capacity"]),
  };
  return lines
    .slice(1)
    .map((line) => {
      const cells = line.split(separator).map((cell) => cell.trim().replace(/^"|"$/g, ""));
      const number = (position: number) =>
        Number((cells[position] ?? "0").replace("R$", "").replace(/\./g, "").replace(",", ".")) ||
        0;
      return {
        product: cells[at.product] || "Produto",
        supplier: cells[at.supplier] || "Fornecedor",
        cost: number(at.cost),
        moq: number(at.moq),
        leadTime: number(at.leadTime),
        capacity: number(at.capacity),
      };
    })
    .filter((row) => row.cost > 0);
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildMockSupplierRows(brief?: ProductBrief): SupplierRow[] {
  const product = brief?.concept?.name ?? brief?.opportunity.keyword ?? "Produto piloto";
  const retail = brief?.concept?.suggestedPrice ?? brief?.sourcing?.suggestedRetailPrice ?? 179;
  const baseCost = Math.max(28, Math.round(retail * 0.36));
  const variants = [
    {
      supplier: "Oficina Aurora",
      cost: -8,
      moq: 60,
      leadTime: 14,
      capacity: 420,
    },
    {
      supplier: "Polo Horizonte",
      cost: -3,
      moq: 120,
      leadTime: 18,
      capacity: 950,
    },
    {
      supplier: "Fabrica Prisma",
      cost: 0,
      moq: 180,
      leadTime: 21,
      capacity: 1500,
    },
    { supplier: "Studio Norte", cost: 5, moq: 90, leadTime: 12, capacity: 380 },
    {
      supplier: "Linha Modular",
      cost: 9,
      moq: 40,
      leadTime: 28,
      capacity: 260,
    },
    {
      supplier: "Atlas Supply",
      cost: 3,
      moq: 300,
      leadTime: 35,
      capacity: 2800,
    },
  ];

  return variants.map((variant, index) => ({
    product,
    supplier: variant.supplier,
    cost: Math.max(12, baseCost + variant.cost + index),
    moq: variant.moq,
    leadTime: variant.leadTime,
    capacity: variant.capacity,
  }));
}

function rowsToSupplierCsv(rows: SupplierRow[]): string {
  const header = "produto,fornecedor,custo,moq,prazo_dias,capacidade_mensal";
  const body = rows.map((row) =>
    [row.product, row.supplier, row.cost, row.moq, row.leadTime, row.capacity]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [header, ...body].join("\n");
}

function downloadSupplierCsv(rows: SupplierRow[], fileName: string) {
  const blob = new Blob([rowsToSupplierCsv(rows)], {
    type: "text/csv;charset=utf-8",
  });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(href);
}

function Suppliers({ reports }: { reports: StoredReport[] }) {
  const [rows, setRows] = useState<SupplierRow[]>([]);
  const [fileName, setFileName] = useState("");
  const opportunity = [...reports].sort(
    (a, b) =>
      (b.report.briefs[0]?.opportunity.score ?? 0) - (a.report.briefs[0]?.opportunity.score ?? 0),
  )[0]?.report.briefs[0];
  const retail =
    opportunity?.concept?.suggestedPrice ?? opportunity?.sourcing?.suggestedRetailPrice ?? 0;
  const avgCost = rows.length ? rows.reduce((total, row) => total + row.cost, 0) / rows.length : 0;
  const margin = retail && avgCost ? Math.round(((retail - avgCost) / retail) * 100) : 0;
  const load = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setRows(parseSupplierCsv(await file.text()));
  };
  const generateMockRows = () => {
    const generated = buildMockSupplierRows(opportunity);
    const productName =
      opportunity?.concept?.name ?? opportunity?.opportunity.keyword ?? "produto-piloto";
    setFileName(`fornecedores-ficticios-${slugify(productName) || "rocket"}.csv`);
    setRows(generated);
  };
  return (
    <div>
      <div className="mb-7">
        <p className="text-xs font-medium uppercase tracking-[.16em] text-muted">
          Viabilidade operacional
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-.045em]">Fornecedores</h1>
        <p className="mt-2 text-sm text-muted">
          Suba sua base para testar custo, MOQ, prazo e capacidade contra a oportunidade atual.
        </p>
      </div>
      <label className="group flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-black/20 bg-white p-8 text-center transition hover:border-ink">
        <span className="grid size-12 place-items-center rounded-full bg-gray-100">
          <Glyph name="upload" />
        </span>
        <p className="mt-4 text-sm font-medium">Arraste ou selecione um CSV</p>
        <p className="mt-2 max-w-md text-xs leading-relaxed text-muted">
          Colunas: produto, fornecedor, custo, moq, prazo_dias e capacidade_mensal.
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(event) => load(event.target.files?.[0])}
        />
      </label>
      <div className="mt-3 flex justify-between text-xs text-muted">
        <span>{fileName || "Nenhum arquivo enviado"}</span>
        <a
          href="/fornecedores-exemplo.csv"
          download="fornecedores-exemplo.csv"
          className="text-ink underline"
        >
          Baixar modelo
        </a>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={generateMockRows}
          className="rounded-sm border border-black/12 bg-white px-4 py-2 text-xs font-medium"
        >
          Gerar dados ficticios
        </button>
        {rows.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => downloadSupplierCsv(rows, fileName || "fornecedores-rocket.csv")}
              className="rounded-sm border border-black/12 bg-white px-4 py-2 text-xs font-medium"
            >
              Baixar CSV atual
            </button>
            <button
              type="button"
              onClick={() => {
                setRows([]);
                setFileName("");
              }}
              className="rounded-sm border border-black/12 bg-white px-4 py-2 text-xs font-medium"
            >
              Limpar dados
            </button>
          </>
        )}
      </div>
      {rows.length === 0 && (
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Use o modelo acima ou gere um cenario ficticio baseado na oportunidade mais forte do radar
          para testar MOQ, prazo, margem e capacidade.
        </p>
      )}
      {rows.length > 0 && (
        <div className="mt-7 space-y-6">
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              ["Fornecedores", rows.length],
              ["Custo médio", brl(avgCost)],
              ["Margem projetada", `${margin}%`],
              ["Menor MOQ", Math.min(...rows.map((row) => row.moq)).toLocaleString("pt-BR")],
            ].map(([label, value]) => (
              <div key={label} className="rounded-sm border border-black/8 bg-white p-4">
                <p className="text-xs text-muted">{label}</p>
                <p className="mt-2 text-xl font-semibold tracking-[-.04em]">{value}</p>
              </div>
            ))}
          </div>
          <div
            className={cx(
              "rounded-md p-5",
              margin >= 55 ? "bg-[#e9f9c9] text-[#355500]" : "bg-[#fff0d8] text-[#7c4900]",
            )}
          >
            <p className="font-semibold">
              {margin >= 55
                ? "Boa viabilidade com a operação atual"
                : "Viabilidade pede negociação"}
            </p>
            <p className="mt-2 text-sm leading-relaxed">
              {margin >= 55
                ? `O custo médio preserva margem de ${margin}% para ${opportunity?.concept?.name ?? "o conceito"}. Comece pelo fornecedor com menor MOQ e valide um lote piloto.`
                : `A margem estimada é ${margin}%. Negocie custo, reduza complexidade do produto ou revise o preço recomendado.`}
            </p>
          </div>
          <div className="overflow-x-auto rounded-md border border-black/8 bg-white">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-gray-50 text-xs text-muted">
                <tr>
                  <th className="p-4 font-medium">Fornecedor</th>
                  <th className="p-4 font-medium">Produto</th>
                  <th className="p-4 font-medium">Custo</th>
                  <th className="p-4 font-medium">MOQ</th>
                  <th className="p-4 font-medium">Prazo</th>
                  <th className="p-4 font-medium">Capacidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/7">
                {rows.map((row, index) => (
                  <tr key={`${row.supplier}-${index}`}>
                    <td className="p-4 font-medium">{row.supplier}</td>
                    <td className="p-4">{row.product}</td>
                    <td className="p-4">{brl(row.cost)}</td>
                    <td className="p-4">{row.moq}</td>
                    <td className="p-4">{row.leadTime} dias</td>
                    <td className="p-4">{row.capacity}/mês</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RocketApp() {
  const [view, setView] = useState<View>("overview");
  const [selectedReport, setSelectedReport] = useState<StoredReport | null>(null);
  const [activeResearchJobId, setActiveResearchJobId] = useState<string | null>(null);
  const { merchant } = useMerchant();
  const signOut = useMerchantSignOut();
  const queryClient = useQueryClient();
  useEffect(() => {
    setActiveResearchJobId(readActiveResearchJobId());
  }, []);
  const healthQuery = useQuery({
    queryKey: ["rocket-health"],
    queryFn: () => getRocketHealthServerFn(),
    refetchInterval: 60_000,
  });
  const jobsQuery = useQuery({
    queryKey: ["rocket-research-jobs"],
    queryFn: () => getRocketResearchJobsServerFn(),
    staleTime: 0,
    refetchInterval: 5_000,
    refetchIntervalInBackground: true,
  });
  const reportsQuery = useQuery({
    queryKey: ["rocket-reports"],
    queryFn: () => getRocketReportsServerFn(),
    staleTime: 30_000,
  });
  const researchJobs = dedupeJobs(jobsQuery.data?.jobs ?? []);
  const trackedResearchJob = activeResearchJobId
    ? (researchJobs.find((job) => job.id === activeResearchJobId) ?? null)
    : null;
  const activeResearchJob =
    trackedResearchJob ?? researchJobs.find((job) => isActiveResearchJob(job)) ?? null;
  const hasRunningResearch = isActiveResearchJob(activeResearchJob);
  const backendReports = reportsQuery.data?.reports ?? [];
  const reports = dedupeReports(backendReports.length > 0 ? backendReports : DEMO_REPORTS);
  const persistedReportIds = new Set(backendReports.map((report) => report.id));

  useEffect(() => {
    if (activeResearchJob?.id && activeResearchJob.id !== activeResearchJobId) {
      setActiveResearchJobId(activeResearchJob.id);
      writeActiveResearchJobId(activeResearchJob.id);
    }
  }, [activeResearchJob?.id, activeResearchJobId]);

  useEffect(() => {
    if (!jobsQuery.isFetched || !activeResearchJobId) return;
    if (!researchJobs.some((job) => job.id === activeResearchJobId)) {
      setActiveResearchJobId(null);
      writeActiveResearchJobId(null);
    }
  }, [jobsQuery.isFetched, activeResearchJobId, researchJobs]);

  const openReport = (report: StoredReport) => {
    setSelectedReport(report);
    setView("reports");
  };
  const rememberResearchJob = (job: ResearchJob) => {
    setActiveResearchJobId(job.id);
    writeActiveResearchJobId(job.id);
    queryClient.setQueryData(
      ["rocket-research-jobs"],
      (current: { jobs: ResearchJob[] } | undefined) => ({
        jobs: dedupeJobs([job, ...(current?.jobs ?? [])]),
      }),
    );
  };
  const clearResearchJob = () => {
    setActiveResearchJobId(null);
    writeActiveResearchJobId(null);
  };

  return (
    <div className="min-h-screen bg-[#f4f4f1] text-ink">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-black/8 bg-white p-4 lg:flex">
        <div className="flex items-center justify-between px-2 py-3">
          <Link to="/" className="text-sm font-semibold tracking-tight">
            deco storefront
          </Link>
          <span className="rounded-full bg-ink px-2 py-1 text-[10px] font-medium text-white">
            Rocket
          </span>
        </div>
        <nav className="mt-7 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => {
                setView(item.id);
                if (item.id !== "reports") setSelectedReport(null);
              }}
              className={cx(
                "flex w-full items-center gap-3 rounded-sm px-3 py-3 text-sm transition",
                view === item.id ? "bg-ink text-white" : "text-ink-soft hover:bg-gray-100",
              )}
            >
              <Glyph name={item.id} size={17} />
              {item.label}
              {item.id === "reports" && (
                <span
                  className={cx(
                    "ml-auto rounded-full px-2 py-0.5 text-[10px]",
                    view === item.id ? "bg-white/15" : "bg-gray-100",
                  )}
                >
                  {reports.length}
                </span>
              )}
              {item.id === "research" && hasRunningResearch && (
                <span
                  className={cx(
                    "ml-auto rounded-full px-2 py-0.5 text-[10px]",
                    view === item.id ? "bg-white/15" : "bg-[#eef7de] text-[#355500]",
                  )}
                >
                  ativo
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="mt-auto rounded-sm bg-gray-50 p-3">
          <p className="text-xs font-medium">{merchant?.name}</p>
          <p className="mt-1 truncate text-[11px] text-muted">{merchant?.email}</p>
          <button
            type="button"
            onClick={() => signOut.mutate()}
            className="mt-3 flex items-center gap-2 text-xs text-muted hover:text-ink"
          >
            <Glyph name="logout" size={14} /> Sair
          </button>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-black/8 bg-[#f4f4f1]/90 px-4 backdrop-blur-xl sm:px-7">
          <div className="flex items-center gap-3">
            <span className="size-2 rounded-full bg-[#78b800]" />
            <span className="text-xs font-medium">{merchant?.storeName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="flex items-center gap-2 rounded-sm border border-black/10 bg-white px-3 py-2 text-xs"
            >
              <Glyph name="store" size={15} /> Ver loja
            </Link>
          </div>
        </header>
        <nav className="scrollbar-none flex gap-1 overflow-x-auto border-b border-black/8 bg-white px-3 py-2 lg:hidden">
          {NAV_ITEMS.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setView(item.id)}
              className={cx(
                "shrink-0 rounded-full px-4 py-2 text-xs",
                view === item.id ? "bg-ink text-white" : "bg-gray-100",
              )}
            >
              {item.label}
              {item.id === "research" && hasRunningResearch ? " · ativo" : ""}
            </button>
          ))}
        </nav>
        <main className="mx-auto max-w-[1440px] p-4 sm:p-7 lg:p-10">
          {view === "overview" && (
            <Overview
              reports={reports}
              health={healthQuery.data}
              openReport={openReport}
              startResearch={() => setView("research")}
            />
          )}
          {view === "reports" && (
            <Reports
              reports={reports}
              selected={selectedReport}
              setSelected={setSelectedReport}
              persistedReportIds={persistedReportIds}
            />
          )}
          {view === "research" && (
            <ResearchWizard
              health={healthQuery.data}
              activeJob={activeResearchJob}
              reports={reports}
              onJobStarted={rememberResearchJob}
              onJobCleared={clearResearchJob}
              openReport={openReport}
            />
          )}
          {view === "suppliers" && <Suppliers reports={reports} />}
        </main>
      </div>
    </div>
  );
}
