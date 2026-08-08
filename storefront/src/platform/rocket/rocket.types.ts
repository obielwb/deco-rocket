export type ResearchSource =
  "google_trends" | "google_shopping" | "keyword_volume" | "social_viral" | "catalog";

export type CreativeType = "product_hero" | "social_ad" | "collection_banner";

export interface ResearchRequest {
  seed: string;
  profile?: string;
  audience?: string;
  sources: ResearchSource[];
  collections: string[];
  creativeTypes: CreativeType[];
  storeStyle?: string;
  referenceImages?: string[];
  topN?: number;
  maxCandidates?: number;
  mode?: "manual" | "automatic";
}

export interface CreativeAsset {
  type: CreativeType;
  imageUrl: string | null;
  prompt: string;
}

export interface SourcePreview {
  source: ResearchSource;
  label: string;
  provider: string;
  status: "collected" | "estimated" | "unavailable";
  summary: string;
  metrics: Array<{ label: string; value: string }>;
  items: Array<{
    title: string;
    subtitle?: string;
    image?: string;
    link?: string;
  }>;
  note?: string;
}

export interface ProductBrief {
  opportunity: {
    keyword: string;
    score: number;
    rationale: string;
    breakdown: {
      demand: number;
      momentum: number;
      competition: number;
      margin: number;
      fit: number;
    };
    trend?: {
      timeline?: Array<{ date: string; value: number }>;
      avgInterest?: number;
      momentum: number;
      risingQueries?: Array<{ query: string; growth: string }>;
      isBreakout: boolean;
    } | null;
    volume?: {
      searchVolume: number | null;
      competition?: number | null;
      cpc?: number | null;
      trendMonthly?: number[];
    } | null;
    market?: {
      offers: Array<{
        title: string;
        price: number | null;
        currency: string;
        rating: number | null;
        reviews: number | null;
        source: string;
        link?: string;
        thumbnail?: string;
      }>;
      priceMin: number | null;
      priceMax: number | null;
      priceMedian: number | null;
      competitorCount: number;
      avgRating: number | null;
      totalReviews: number;
    } | null;
    gap?: {
      inCatalog: boolean;
      catalogMatches: number;
      sampleMatch?: string;
    } | null;
  };
  concept?: {
    name: string;
    tagline: string;
    positioning: string;
    targetAudience: string;
    keySpecs: string[];
    differentiators: string[];
    suggestedPrice: number | null;
  } | null;
  copy?: {
    productTitle: string;
    seoTitle: string;
    metaDescription: string;
    pdpDescription: string;
    adCopies: string[];
  } | null;
  sourcing?: {
    estimatedUnitCost: number | null;
    suggestedRetailPrice: number | null;
    estimatedMarginPct: number | null;
    rfqDraft?: string;
  } | null;
  imageUrl?: string | null;
  creatives?: CreativeAsset[];
  sourcePreviews?: SourcePreview[];
}

export interface LaunchProductRequest {
  reportId: string;
  briefIndex: number;
  name: string;
  tagline: string;
  description: string;
  price: number;
  collection: string;
  imageUrl: string;
  tags: string[];
}

export interface LaunchedProduct extends LaunchProductRequest {
  id: string;
  handle: string;
  status: "active";
  inventory: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchReport {
  seed: string;
  generatedAt: string;
  geo: string;
  store: string | null;
  summary: string;
  briefs: ProductBrief[];
  degraded: string[];
  config?: Omit<ResearchRequest, "seed" | "topN" | "maxCandidates" | "mode">;
}

export interface StoredReport {
  id: string;
  mode: "manual" | "automatic";
  status: "ready";
  report: ResearchReport;
}

export type ResearchJobStatus = "queued" | "running" | "succeeded" | "failed";
export type ResearchJobStep =
  "queued" | "expanding" | "signals" | "ranking" | "briefs" | "summary" | "completed" | "failed";

export interface ResearchJobProgress {
  step: ResearchJobStep;
  label: string;
  detail: string;
  percent: number;
}

export interface ResearchJob {
  id: string;
  mode: "manual" | "automatic";
  status: ResearchJobStatus;
  request: Omit<ResearchRequest, "mode">;
  progress: ResearchJobProgress;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  reportId: string | null;
  error: string | null;
}

export interface RefreshReportsResult {
  updated: number;
  reports: StoredReport[];
}

export interface DeleteReportResult {
  ok: true;
  reportId: string;
  deletedProducts: number;
  reports: StoredReport[];
}

export interface DeleteLaunchedProductResult {
  ok: true;
  productId: string;
  products: LaunchedProduct[];
}

export interface ProviderHealth {
  ok: boolean;
  connected: boolean;
  automation?: {
    enabled: boolean;
    nextRunAt: string | null;
  };
  providers: Partial<Record<string, boolean>>;
  reportCount: number;
  activeJobs?: number;
  error?: string;
}
