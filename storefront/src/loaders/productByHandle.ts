import type { Product } from "@decocms/apps-commerce/types";
import { RequestContext } from "@decocms/blocks/sdk/requestContext";
import { getShopifyClient } from "@decocms/apps-shopify/client";
import { GetProduct } from "@decocms/apps-shopify/utils/storefront/queries";
import { toProduct, type ProductShopify } from "@decocms/apps-shopify/utils/transform";

export interface Props {
  /**
   * @title Product handle
   * @description The product's URL handle/slug (e.g. "high-top-canvas-shoes") — pins an exact product instead of relying on a search query.
   */
  handle: string;
}

/** Returns the pinned product as a single-item list, so it drops straight into any prop typed `Product[] | null`. */
export default async function productByHandleLoader({ handle }: Props): Promise<Product[] | null> {
  if (!handle) return null;

  const client = getShopifyClient();
  const data = await client.query<{ product?: ProductShopify }>(GetProduct, {
    handle,
    identifiers: [],
  });

  if (!data?.product) return null;

  const req = RequestContext.current?.request;
  const url = req ? new URL(req.url) : new URL("https://localhost");
  return [toProduct(data.product, data.product.variants.nodes[0], url)];
}
