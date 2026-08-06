import type {
	CatalogGap,
	KeywordVolume,
	MarketSnapshot,
	Opportunity,
	TrendSignal,
} from "./types.ts";

/** Explicit, auditable weights. They sum to 1.0. */
export const WEIGHTS = {
	demand: 0.3,
	momentum: 0.25,
	competition: 0.2,
	margin: 0.15,
	fit: 0.1,
} as const;

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/** Map monthly search volume to 0-100 via a log curve (10k+ ≈ full score). */
function demandScore(
	vol: KeywordVolume | null,
	trend: TrendSignal | null,
): number {
	if (vol?.searchVolume != null && vol.searchVolume > 0) {
		return clamp((Math.log10(vol.searchVolume) / 4) * 100); // 1→0, 10^4→100
	}
	// Fallback to Google Trends average interest (already 0-100).
	if (trend) return clamp(trend.avgInterest);
	return 0;
}

/** Growth momentum: positive slope + breakout bonus. */
function momentumScore(trend: TrendSignal | null): number {
	if (!trend) return 40; // neutral when unknown
	// momentum is a % change; map -50%..+100% onto 0..100.
	const base = clamp(50 + trend.momentum / 2);
	return clamp(trend.isBreakout ? base + 20 : base);
}

/** Fewer/weaker competitors → higher score. */
function competitionScore(
	market: MarketSnapshot | null,
	vol: KeywordVolume | null,
): number {
	let score = 50;
	if (market) {
		// 0 competitors → 100, 20+ → ~20
		score = clamp(100 - market.competitorCount * 4);
	}
	if (vol?.competition != null) {
		// competition index 0-100 (higher = more competition)
		score = (score + (100 - vol.competition)) / 2;
	}
	return clamp(score);
}

/** Higher absolute price → more margin headroom. */
function marginScore(market: MarketSnapshot | null): number {
	const price = market?.priceMedian ?? market?.priceMin ?? null;
	if (price == null) return 50;
	// R$0→0, R$500+→100 (log-ish linear cap)
	return clamp((price / 500) * 100);
}

/** Whitespace fit: not in catalog = opportunity; already stocked = lower. */
function fitScore(gap: CatalogGap | null): number {
	if (!gap) return 60; // unknown store fit
	return gap.inCatalog ? 30 : 90;
}

export interface ScoreInputs {
	keyword: string;
	trend: TrendSignal | null;
	volume: KeywordVolume | null;
	market: MarketSnapshot | null;
	gap: CatalogGap | null;
}

export function scoreOpportunity(input: ScoreInputs): Opportunity {
	const demand = demandScore(input.volume, input.trend);
	const momentum = momentumScore(input.trend);
	const competition = competitionScore(input.market, input.volume);
	const margin = marginScore(input.market);
	const fit = fitScore(input.gap);

	const score = Math.round(
		demand * WEIGHTS.demand +
			momentum * WEIGHTS.momentum +
			competition * WEIGHTS.competition +
			margin * WEIGHTS.margin +
			fit * WEIGHTS.fit,
	);

	const rationale = buildRationale(
		{ demand, momentum, competition, margin, fit },
		input,
	);

	return {
		keyword: input.keyword,
		score,
		breakdown: {
			demand: Math.round(demand),
			momentum: Math.round(momentum),
			competition: Math.round(competition),
			margin: Math.round(margin),
			fit: Math.round(fit),
		},
		rationale,
		trend: input.trend,
		volume: input.volume,
		market: input.market,
		gap: input.gap,
	};
}

function buildRationale(
	b: {
		demand: number;
		momentum: number;
		competition: number;
		margin: number;
		fit: number;
	},
	input: ScoreInputs,
): string {
	const parts: string[] = [];
	if (input.volume?.searchVolume)
		parts.push(
			`${input.volume.searchVolume.toLocaleString("pt-BR")} buscas/mês`,
		);
	if (input.trend && input.trend.momentum > 10)
		parts.push(`demanda subindo ${input.trend.momentum}%`);
	if (input.trend?.isBreakout) parts.push("sinal de breakout");
	if (input.market?.priceMedian)
		parts.push(`preço mediano R$${input.market.priceMedian}`);
	if (input.gap && !input.gap.inCatalog)
		parts.push("ausente no catálogo (whitespace)");
	if (b.competition > 65) parts.push("baixa concorrência");
	return parts.join(" · ") || "Sinais limitados de mercado";
}

/** Rank opportunities descending by score. */
export function rankOpportunities(opps: Opportunity[]): Opportunity[] {
	return [...opps].sort((a, b) => b.score - a.score);
}
