import { useEffect } from "react";
import {
  createRootRouteWithContext,
  HeadContent,
  ScriptOnce,
  Scripts,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { NavigationProgress, StableOutlet } from "@decocms/tanstack";
import { LiveControls } from "@decocms/blocks/hooks";
import { ANALYTICS_SCRIPT } from "@decocms/blocks/sdk/analytics";
import { CART_QUERY_KEY, getCartServerFn } from "../platform/cart";
import { getUserServerFn, USER_QUERY_KEY } from "../platform/user";
import MinicartDrawer from "../components/minicart/MinicartDrawer";
// @ts-ignore Vite ?url import
import appCss from "../styles/app.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async ({ context }) => {
    const tasks: Promise<unknown>[] = [];
    if (!context.queryClient.getQueryData(CART_QUERY_KEY)) {
      tasks.push(
        getCartServerFn()
          .then((cart) => context.queryClient.setQueryData(CART_QUERY_KEY, cart))
          .catch(() => {}),
      );
    }
    if (!context.queryClient.getQueryData(USER_QUERY_KEY)) {
      tasks.push(
        getUserServerFn()
          .then((user) => context.queryClient.setQueryData(USER_QUERY_KEY, user))
          .catch(() => {}),
      );
    }
    await Promise.all(tasks);
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Storefront-tanstack" },
      {
        name: "description",
        content:
          "Shop the new season at Storefront-tanstack — apparel, accessories and more, with up to 60% off.",
      },
      // Open Graph / Twitter defaults so shared links render a preview card.
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Storefront-tanstack" },
      { property: "og:title", content: "Storefront-tanstack" },
      {
        property: "og:description",
        content:
          "Shop the new season at Storefront-tanstack — apparel, accessories and more, with up to 60% off.",
      },
      {
        property: "og:image",
        content:
          "https://decoims.com/demo-storefront/2026/07/57440993-8c68-4943-9084-1c947c1d0fd5-banner1.png",
      },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://api.fontshare.com" },
      {
        rel: "stylesheet",
        href: "https://api.fontshare.com/v2/css?f[]=switzer@400,500,600,700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico" },
    ],
  }),
  component: RootLayout,
});

// Mirrors `DecoRootLayout`'s bootstrap: sets up `DECO.events` before hydration
// so sections can dispatch analytics events during their first render.
// Copied from `buildDecoEventsBootstrap` in @decocms/tanstack@7.20.7
// (src/hooks/DecoRootLayout.tsx), as is the 500ms `deco:ready` timeout in
// `RootLayout` below — keep both in sync when bumping that package.
const DECO_EVENTS_BOOTSTRAP = `
window.__RUNTIME__ = window.__RUNTIME__ || { account: "" };
window.DECO = window.DECO || {};
window.DECO.events = window.DECO.events || {
  _q: [],
  _subs: [],
  dispatch: function(e) {
    this._q.push(e);
    for (var i = 0; i < this._subs.length; i++) {
      try { this._subs[i](e); } catch(err) { console.error('[DECO.events]', err); }
    }
  },
  subscribe: function(fn) {
    this._subs.push(fn);
    for (var i = 0; i < this._q.length; i++) {
      try { fn(this._q[i]); } catch(err) {}
    }
  }
};
window.dataLayer = window.dataLayer || [];
`;

/**
 * Composed from the individual pieces `DecoRootLayout` documents as its escape
 * hatch, instead of using `DecoRootLayout` itself: that component wraps the
 * outlet in a bare `<main>`, which would both nest the Header/Footer landmarks
 * inside `main` and collide with the `<main id="main-content">` that
 * `PageSections` emits around the CMS page content (two `main` landmarks is an
 * axe `landmark-unique` violation). Here the outlet is a plain `<div>`, so the
 * page's own `<main>` is the only one.
 */
function RootLayout() {
  useEffect(() => {
    const id = setTimeout(() => {
      (window as unknown as { __deco_ready?: boolean }).__deco_ready = true;
      document.dispatchEvent(new Event("deco:ready"));
    }, 500);
    return () => clearTimeout(id);
  }, []);

  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-base-200 text-base-content" suppressHydrationWarning>
        <ScriptOnce children={DECO_EVENTS_BOOTSTRAP} />
        <NavigationProgress />
        <div>
          <StableOutlet />
        </div>
        <MinicartDrawer />
        <LiveControls site="demo-storefront" />
        <ScriptOnce children={ANALYTICS_SCRIPT} />
        <Scripts />
      </body>
    </html>
  );
}
