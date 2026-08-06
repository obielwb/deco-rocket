import { z } from "zod";

/** A single point in an interest-over-time series (0-100, Google Trends style). */
export const TrendPointSchema = z.object({
	date: z.string(),
	value: z.number(),
});

export const TrendSignalSchema = z.object({
	keyword: z.string(),
	/** Normalized interest over time (0-100). */
	timeline: z.array(TrendPointSchema).default([]),
	/** Average interest across the window. */
	avgInterest: z.number().default(0),
	/** Slope of demand: positive = growing. Percentage change recent vs earlier. */
	momentum: z.number().default(0),
	/** Rising/breakout related queries — the emerging-demand signal. */
	risingQueries: z
		.array(z.object({ query: z.string(), growth: z.string() }))
		.default([]),
	isBreakout: z.boolean().default(false),
	source: z.string().default("google_trends"),
});
export type TrendSignal = z.infer<typeof TrendSignalSchema>;

export const KeywordVolumeSchema = z.object({
	keyword: z.string(),
	searchVolume: z.number().nullable().default(null),
	competition: z.number().nullable().default(null),
	cpc: z.number().nullable().default(null),
	trendMonthly: z.array(z.number()).default([]),
});
export type KeywordVolume = z.infer<typeof KeywordVolumeSchema>;

export const MarketOfferSchema = z.object({
	title: z.string(),
	price: z.number().nullable().default(null),
	currency: z.string().default("BRL"),
	rating: z.number().nullable().default(null),
	reviews: z.number().nullable().default(null),
	source: z.string().default(""),
	link: z.string().optional(),
	thumbnail: z.string().optional(),
});
export type MarketOffer = z.infer<typeof MarketOfferSchema>;

export const MarketSnapshotSchema = z.object({
	keyword: z.string(),
	offers: z.array(MarketOfferSchema).default([]),
	priceMin: z.number().nullable().default(null),
	priceMax: z.number().nullable().default(null),
	priceMedian: z.number().nullable().default(null),
	competitorCount: z.number().default(0),
	avgRating: z.number().nullable().default(null),
	totalReviews: z.number().default(0),
});
export type MarketSnapshot = z.infer<typeof MarketSnapshotSchema>;

export const CatalogGapSchema = z.object({
	keyword: z.string(),
	inCatalog: z.boolean(),
	catalogMatches: z.number().default(0),
	sampleMatch: z.string().optional(),
});
export type CatalogGap = z.infer<typeof CatalogGapSchema>;

export const ScoreBreakdownSchema = z.object({
	demand: z.number(),
	momentum: z.number(),
	competition: z.number(),
	margin: z.number(),
	fit: z.number(),
});

export const OpportunitySchema = z.object({
	keyword: z.string(),
	score: z.number(),
	breakdown: ScoreBreakdownSchema,
	rationale: z.string().default(""),
	trend: TrendSignalSchema.nullable().default(null),
	volume: KeywordVolumeSchema.nullable().default(null),
	market: MarketSnapshotSchema.nullable().default(null),
	gap: CatalogGapSchema.nullable().default(null),
});
export type Opportunity = z.infer<typeof OpportunitySchema>;

export const SupplierOfferSchema = z.object({
	title: z.string(),
	priceCost: z.number().nullable().default(null),
	currency: z.string().default("BRL"),
	sellerName: z.string().optional(),
	link: z.string().optional(),
	thumbnail: z.string().optional(),
});
export type SupplierOffer = z.infer<typeof SupplierOfferSchema>;

export const SourcingSchema = z.object({
	keyword: z.string(),
	offers: z.array(SupplierOfferSchema).default([]),
	estimatedUnitCost: z.number().nullable().default(null),
	suggestedRetailPrice: z.number().nullable().default(null),
	estimatedMarginPct: z.number().nullable().default(null),
	rfqDraft: z.string().optional(),
	note: z.string().optional(),
});
export type Sourcing = z.infer<typeof SourcingSchema>;

export const ProductConceptSchema = z.object({
	name: z.string(),
	tagline: z.string(),
	positioning: z.string(),
	targetAudience: z.string(),
	keySpecs: z.array(z.string()).default([]),
	differentiators: z.array(z.string()).default([]),
	suggestedPrice: z.number().nullable().default(null),
});
export type ProductConcept = z.infer<typeof ProductConceptSchema>;

export const CopySchema = z.object({
	productTitle: z.string(),
	seoTitle: z.string(),
	metaDescription: z.string(),
	pdpDescription: z.string(),
	adCopies: z.array(z.string()).default([]),
});
export type Copy = z.infer<typeof CopySchema>;

export const ProductBriefSchema = z.object({
	opportunity: OpportunitySchema,
	concept: ProductConceptSchema.nullable().default(null),
	copy: CopySchema.nullable().default(null),
	sourcing: SourcingSchema.nullable().default(null),
	imageUrl: z.string().nullable().default(null),
	imagePrompt: z.string().nullable().default(null),
});
export type ProductBrief = z.infer<typeof ProductBriefSchema>;

export const ReportSchema = z.object({
	seed: z.string(),
	generatedAt: z.string(),
	geo: z.string(),
	store: z.string().nullable().default(null),
	summary: z.string().default(""),
	briefs: z.array(ProductBriefSchema).default([]),
	degraded: z.array(z.string()).default([]),
});
export type Report = z.infer<typeof ReportSchema>;
