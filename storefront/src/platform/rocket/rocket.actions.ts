import { createServerFn } from "@tanstack/react-start";
import type {
  DeleteLaunchedProductResult,
  DeleteReportResult,
  LaunchedProduct,
  LaunchProductRequest,
  ProviderHealth,
  RefreshReportsResult,
  ResearchRequest,
  StoredReport,
} from "./rocket.types";

const DEFAULT_RESEARCH_URL = "http://127.0.0.1:3001";

function researchUrl(): string {
  const configured =
    typeof process !== "undefined" ? process.env.DECO_RESEARCH_URL?.trim() : undefined;
  return (configured || DEFAULT_RESEARCH_URL).replace(/\/$/, "");
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${researchUrl()}${path}`, init);
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || `Research API respondeu ${response.status}.`);
  return payload;
}

export const getRocketHealthServerFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<ProviderHealth> => {
    try {
      const health = await fetchJson<Omit<ProviderHealth, "connected">>("/api/research/health");
      return { ...health, connected: true };
    } catch (error) {
      return {
        ok: false,
        connected: false,
        providers: {},
        reportCount: 0,
        error: error instanceof Error ? error.message : "Research API indisponível.",
      };
    }
  },
);

export const getRocketReportsServerFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ reports: StoredReport[]; connected: boolean }> => {
    try {
      const result = await fetchJson<{ reports: StoredReport[] }>("/api/research/reports");
      return { reports: result.reports, connected: true };
    } catch {
      return { reports: [], connected: false };
    }
  },
);

export const refreshRocketReportsServerFn = createServerFn({ method: "POST" }).handler(
  async (): Promise<RefreshReportsResult> => {
    return fetchJson<RefreshReportsResult>("/api/research/reports/refresh", { method: "POST" });
  },
);

export const runRocketResearchServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: ResearchRequest) => input)
  .handler(async ({ data }): Promise<StoredReport> => {
    return fetchJson<StoredReport>("/api/research/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
  });

export const getRocketLaunchesServerFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ products: LaunchedProduct[] }> => {
    return fetchJson<{ products: LaunchedProduct[] }>("/api/research/launches");
  },
);

export const launchRocketProductServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: LaunchProductRequest) => input)
  .handler(async ({ data }): Promise<LaunchedProduct> => {
    return fetchJson<LaunchedProduct>("/api/research/launches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
  });

export const deleteRocketReportServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: { reportId: string }) => input)
  .handler(async ({ data }): Promise<DeleteReportResult> => {
    return fetchJson<DeleteReportResult>(
      `/api/research/reports/${encodeURIComponent(data.reportId)}`,
      { method: "DELETE" },
    );
  });

export const deleteRocketProductServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: { productId: string }) => input)
  .handler(async ({ data }): Promise<DeleteLaunchedProductResult> => {
    return fetchJson<DeleteLaunchedProductResult>(
      `/api/research/launches/${encodeURIComponent(data.productId)}`,
      { method: "DELETE" },
    );
  });
