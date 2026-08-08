import type { Product } from "@decocms/apps-commerce/types";
import { RequestContext } from "@decocms/blocks/sdk/requestContext";
import productListLoader from "@decocms/apps-shopify/loaders/ProductList";

export interface Props {
  /** @description Term typed in the searchbar */
  query?: string;
  /** @description How many products to suggest */
  count?: number;
}

export interface SearchSuggestions {
  products: Product[];
}

const DEFAULT_COUNT = 4;
const MAX_COUNT = 10;
const MAX_QUERY_LENGTH = 64;

// The loader is reachable from the browser (`/deco/invoke`), so responses are
// memoized for a short window to keep a burst of keystrokes — or a caller
// hammering the endpoint — from turning into one upstream query each.
// The key is `count|term` only — this store is single-locale/single-currency, so
// there is no per-request context to fold in. If the site ever serves more than
// one locale, currency or customer segment, add it to the key.
const TTL_MS = 60_000;
const MAX_ENTRIES = 200;
const cache = new Map<string, { at: number; products: Product[] }>();

/**
 * Product suggestions for the header search modal. Invoked from the client
 * (`invoke.site.loaders.searchSuggestions`) on every debounced keystroke, so it
 * stays intentionally small: a term in, a handful of products out.
 *
 * `count` and `query` are attacker-controlled, so both are bounded here rather
 * than forwarded to Shopify as-is.
 */
export default async function searchSuggestionsLoader({
  query,
  count = DEFAULT_COUNT,
}: Props): Promise<SearchSuggestions> {
  const term = query?.trim().slice(0, MAX_QUERY_LENGTH);
  if (!term) return { products: [] };

  const size = Math.min(Math.max(1, Math.floor(Number(count) || DEFAULT_COUNT)), MAX_COUNT);

  const key = `${size}|${term.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return { products: hit.products };

  const req = RequestContext.current?.request;
  const url = req ? new URL(req.url) : undefined;

  const products = (await productListLoader({ props: { query: term, count: size } }, url)) ?? [];

  // Cheap bound: drop the oldest insertion once the map grows past the cap.
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  }
  cache.set(key, { at: Date.now(), products });

  return { products };
}
