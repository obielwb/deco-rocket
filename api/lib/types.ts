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

// --- RFQ Agent ---

export const RfqTierSchema = z.object({
	qty: z.number(),
	unitPrice: z.number(),
});
export type RfqTier = z.infer<typeof RfqTierSchema>;

export const SupplierQuoteSchema = z.object({
	supplierName: z.string().nullable().default(null),
	currency: z.string().default("BRL"),
	tiers: z.array(RfqTierSchema).default([]),
	moq: z.number().nullable().default(null),
	leadTimeDays: z.number().nullable().default(null),
	paymentTerms: z.string().nullable().default(null),
	shipping: z.string().nullable().default(null),
	rawNotes: z.string().default(""),
	parsedAt: z.string(),
});
export type SupplierQuote = z.infer<typeof SupplierQuoteSchema>;

export const RfqStatusSchema = z.enum(["draft", "sent", "answered"]);

export const RfqRecordSchema = z.object({
	rfqId: z.string(),
	keyword: z.string().nullable().default(null),
	product: z.string(),
	supplierEmail: z.string(),
	supplierName: z.string().nullable().default(null),
	subject: z.string(),
	body: z.string(),
	sentAt: z.string().nullable().default(null),
	messageId: z.string().nullable().default(null),
	status: RfqStatusSchema,
	quotes: z.array(SupplierQuoteSchema).default([]),
});
export type RfqRecord = z.infer<typeof RfqRecordSchema>;

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

export const ResearchSourceSchema = z.enum([
	"google_trends",
	"google_shopping",
	"keyword_volume",
	"social_viral",
	"catalog",
]);
export type ResearchSource = z.infer<typeof ResearchSourceSchema>;

export const CreativeTypeSchema = z.enum([
	"product_hero",
	"social_ad",
	"collection_banner",
]);
export type CreativeType = z.infer<typeof CreativeTypeSchema>;

export const CreativeAssetSchema = z.object({
	type: CreativeTypeSchema,
	imageUrl: z.string().nullable().default(null),
	prompt: z.string(),
});
export type CreativeAsset = z.infer<typeof CreativeAssetSchema>;

export const SourcePreviewSchema = z.object({
	source: ResearchSourceSchema,
	label: z.string(),
	provider: z.string(),
	status: z.enum(["collected", "estimated", "unavailable"]),
	summary: z.string(),
	metrics: z
		.array(z.object({ label: z.string(), value: z.string() }))
		.default([]),
	items: z
		.array(
			z.object({
				title: z.string(),
				subtitle: z.string().optional(),
				image: z.string().optional(),
				link: z.string().optional(),
			}),
		)
		.default([]),
	note: z.string().optional(),
});
export type SourcePreview = z.infer<typeof SourcePreviewSchema>;

export const ResearchConfigSchema = z.object({
	profile: z.string().nullable().default(null),
	audience: z.string().nullable().default(null),
	sources: z.array(ResearchSourceSchema).default([]),
	collections: z.array(z.string()).default([]),
	creativeTypes: z.array(CreativeTypeSchema).default([]),
	storeStyle: z.string().nullable().default(null),
	referenceImages: z.array(z.string().url()).max(3).default([]),
});
export type ResearchConfig = z.infer<typeof ResearchConfigSchema>;

export const ProductBriefSchema = z.object({
	opportunity: OpportunitySchema,
	concept: ProductConceptSchema.nullable().default(null),
	copy: CopySchema.nullable().default(null),
	sourcing: SourcingSchema.nullable().default(null),
	imageUrl: z.string().nullable().default(null),
	imagePrompt: z.string().nullable().default(null),
	creatives: z.array(CreativeAssetSchema).default([]),
	sourcePreviews: z.array(SourcePreviewSchema).default([]),
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
	config: ResearchConfigSchema.optional(),
});
export type Report = z.infer<typeof ReportSchema>;
