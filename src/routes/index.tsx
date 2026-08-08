import { createFileRoute } from "@tanstack/react-router";
import { cmsHomeRouteConfig, loadCmsPage } from "@decocms/tanstack";
import { deferredSectionLoader } from "@decocms/tanstack/sdk/deferredSectionLoader";
import PageSections from "../components/ui/PageSections";
import { preloadSectionComponents } from "@decocms/blocks/cms";

const isServer = typeof document === "undefined";

// Variant selection (?skuId=…) is client-side only — don't refetch the page.
const IGNORED_SEARCH_PARAMS = new Set(["skuId"]);

const baseConfig = cmsHomeRouteConfig({
  defaultTitle: "Storefront-tanstack",
  siteName: "Storefront-tanstack",
  // Keep the previous route UI visible while the loader re-runs on filter/sort
  // navigation. Without this, framework defaults (pendingMs=200) flash the
  // pending UI and the page looks like a hard reload. The deferred SearchResult
  // section still shows its own skeleton via DeferredSectionWrapper.
  pendingMs: 60_000,
  pendingMinMs: 0,
});

export const Route = createFileRoute("/")({
  ...baseConfig,
  // Ensure the home page always emits an `og:url` tag. `cmsHomeRouteConfig`
  // only adds it when the CMS page's SEO block sets an explicit canonical
  // URL, so pages without one (like the home, by default) lose the social
  // preview when shared. Fall back to the resolved absolute page URL.
  head: (ctx: Parameters<typeof baseConfig.head>[0]) => {
    const head = baseConfig.head(ctx);
    const meta = head.meta ?? [];
    const pageUrl = (ctx.loaderData as { pageUrl?: string } | null | undefined)?.pageUrl;
    const hasOgUrl = meta.some((tag: Record<string, string>) => tag.property === "og:url");
    return {
      ...head,
      meta: hasOgUrl || !pageUrl ? meta : [...meta, { property: "og:url", content: pageUrl }],
    };
  },
  // Preserve query string so filter/sort/pagination changes reach the loader.
  // Without this, TanStack Router collapses the home route to "/" and skips
  // re-fetching when the user clicks a filter or changes sort order.
  validateSearch: (search: Record<string, unknown>) => search as Record<string, string>,
  loaderDeps: ({ search }: { search: Record<string, string> }) => {
    const filtered = Object.fromEntries(
      Object.entries(search ?? {}).filter(([k]) => !IGNORED_SEARCH_PARAMS.has(k)),
    );
    return {
      search: Object.keys(filtered).length ? filtered : undefined,
    };
  },
  loader: async ({ deps }) => {
    const searchStr = deps.search ? "?" + new URLSearchParams(deps.search).toString() : "";
    const fullPath = "/" + searchStr;
    // Forward the real page URL via header. On CSR for the home route,
    // the framework's `loadCmsPageInternal` falls back to the `_serverFn`
    // URL when basePath is "/", so commerce loaders see the wrong filters.
    // Our Shopify wrapper in setup.ts reads this header to recover the URL.
    const page = await loadCmsPage({
      data: fullPath,
      headers: { "x-deco-page-url": fullPath },
    });
    if (!page) return null;

    if (!isServer && page.resolvedSections) {
      const keys = page.resolvedSections.map((s: { component: string }) => s.component);
      await preloadSectionComponents(keys);
    }
    return page;
  },
  component: HomePage,
});

function HomePage() {
  const data = Route.useLoaderData() as Record<string, any> | null;

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Boas-vindas às capivaras da demo! 🌿</h1>
          <p className="text-sm text-base-content/40 mt-2">No CMS page found for /</p>
        </div>
      </div>
    );
  }

  return (
    <PageSections
      sections={data.resolvedSections ?? []}
      deferredSections={data.deferredSections ?? []}
      deferredPromises={data.deferredPromises}
      pagePath={data.pagePath}
      pageUrl={data.pageUrl}
      device={data.device}
      loadDeferredSectionFn={deferredSectionLoader}
    />
  );
}
