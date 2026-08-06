// Local view types mirroring api/lib/types.ts Report shape (kept independent so
// the web bundle carries no server/zod code).

export interface TrendPoint {
	date: string;
	value: number;
}
export interface TrendSignal {
	keyword: string;
	timeline: TrendPoint[];
	avgInterest: number;
	momentum: number;
	risingQueries: { query: string; growth: string }[];
	isBreakout: boolean;
	source: string;
}
export interface KeywordVolume {
	keyword: string;
	searchVolume: number | null;
	competition: number | null;
	cpc: number | null;
	trendMonthly: number[];
}
export interface MarketSnapshot {
	keyword: string;
	priceMin: number | null;
	priceMax: number | null;
	priceMedian: number | null;
	competitorCount: number;
	avgRating: number | null;
	totalReviews: number;
}
export interface CatalogGap {
	keyword: string;
	inCatalog: boolean;
	catalogMatches: number;
	sampleMatch?: string;
}
export interface ScoreBreakdown {
	demand: number;
	momentum: number;
	competition: number;
	margin: number;
	fit: number;
}
export interface Opportunity {
	keyword: string;
	score: number;
	breakdown: ScoreBreakdown;
	rationale: string;
	trend: TrendSignal | null;
	volume: KeywordVolume | null;
	market: MarketSnapshot | null;
	gap: CatalogGap | null;
}
export interface ProductConcept {
	name: string;
	tagline: string;
	positioning: string;
	targetAudience: string;
	keySpecs: string[];
	differentiators: string[];
	suggestedPrice: number | null;
}
export interface Copy {
	productTitle: string;
	seoTitle: string;
	metaDescription: string;
	pdpDescription: string;
	adCopies: string[];
}
export interface SupplierOffer {
	title: string;
	priceCost: number | null;
	currency: string;
	sellerName?: string;
	link?: string;
	thumbnail?: string;
}
export interface Sourcing {
	keyword: string;
	offers: SupplierOffer[];
	estimatedUnitCost: number | null;
	suggestedRetailPrice: number | null;
	estimatedMarginPct: number | null;
	rfqDraft?: string;
	note?: string;
}
export interface ProductBrief {
	opportunity: Opportunity;
	concept: ProductConcept | null;
	copy: Copy | null;
	sourcing: Sourcing | null;
	imageUrl: string | null;
	imagePrompt: string | null;
}
export interface Report {
	seed: string;
	generatedAt: string;
	geo: string;
	store: string | null;
	summary: string;
	briefs: ProductBrief[];
	degraded: string[];
}
