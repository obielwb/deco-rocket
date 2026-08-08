import { createFileRoute, notFound } from "@tanstack/react-router";
import { cmsRouteConfig } from "@decocms/tanstack";
import { deferredSectionLoader } from "@decocms/tanstack/sdk/deferredSectionLoader";
import PageSections from "../components/ui/PageSections";

const routeConfig = cmsRouteConfig({
  siteName: "Storefront-tanstack",
  defaultTitle: "Storefront-tanstack",
  ignoreSearchParams: ["skuId"],
  // Keep the previous route UI visible while the loader re-runs on filter/sort
  // navigation. Without this, framework defaults (pendingMs=200) flash the
  // pending UI. The SearchResult section refetches its own data via TanStack
  // Query (see useProductListingPage), so only the products grid swaps.
  pendingMs: 60_000,
  pendingMinMs: 0,
});

export const Route = createFileRoute("/$")({
  ...routeConfig,
  // When no CMS page matches the URL, throw `notFound()` instead of letting the
  // loader return null. The null path still rendered the 404 UI, but with HTTP
  // 200 — search engines then indexed those phantom pages. A thrown notFound
  // puts the match in `notFound` status, which makes the SSR response carry a
  // real 404 status code (router.state.statusCode).
  loader: async (ctx: Parameters<typeof routeConfig.loader>[0]) => {
    const page = await routeConfig.loader(ctx);
    if (!page) throw notFound();
    return page;
  },
  component: CmsPage,
  notFoundComponent: NotFoundPage,
});

function CmsPage() {
  const data = Route.useLoaderData() as Record<string, any> | null;
  if (!data) return <NotFoundPage />;

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

function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-base-content/20 mb-4">404</h1>
        <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
        <p className="text-base-content/60 mb-6">No CMS page block matches this URL.</p>
        <a href="/" className="btn btn-primary">
          Go Home
        </a>
      </div>
    </div>
  );
}
