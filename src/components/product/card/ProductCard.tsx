import { useState } from "react";
import type { Product } from "@decocms/apps-commerce/types";
import { useReveal } from "~/sdk/useReveal";
import { mapProductToAnalyticsItem } from "@decocms/apps-commerce/utils/productToAnalyticsItem";
import { Link } from "@tanstack/react-router";
import { clx } from "~/sdk/clx";
import { useOffer } from "@decocms/apps-commerce/sdk/useOffer";
import { useSendEvent } from "../../../sdk/useSendEvent";
import { useVariantPossibilities } from "@decocms/apps-commerce/sdk/useVariantPossibilities";
import { relative } from "../../../sdk/url";
import WishlistButton from "../../wishlist/WishlistButton";
import Tag from "~/components/ui/Tag";
import { filterImagesForVariant } from "../pdp/ProductGallery";
import ProductCardImage from "./ProductCardImage";
import ProductCardTitle from "./ProductCardTitle";
import ProductCardPrice from "./ProductCardPrice";
import ProductCardVariants from "./ProductCardVariants";

export interface Props {
  product: Product;
  /** Preload card image */
  preload?: boolean;
  /**
   * Router preload strategy for the product link — "intent" prefetches the PDP
   * on hover/focus; false disables it. (Distinct from `preload`, the image LCP
   * flag.)
   */
  prefetch?: "intent" | false;
  /** @description used for analytics event */
  itemListName?: string;
  /** @description index of the product card in the list */
  index?: number;
  className?: string;
  /** Skip the scroll-reveal animation — for cards inside a horizontal carousel */
  disableReveal?: boolean;
}

const ASPECT_RATIO = "372 / 498";
const SHOE_SIZE_VARIANT = "shoe size";

export default function ProductCard({
  product,
  preload,
  prefetch = "intent",
  itemListName,
  index,
  className,
  disableReveal,
}: Props) {
  const { url, image: images, offers, isVariantOf } = product;
  const hasVariant = isVariantOf?.hasVariant ?? [];
  const title = isVariantOf?.name ?? product.name ?? "";

  const { listPrice, price, availability } = useOffer(offers);
  const inStock = availability === "https://schema.org/InStock";
  const possibilities = useVariantPossibilities(hasVariant, product);
  const firstSku = Object.entries(possibilities)?.[0];
  const variants = Object.entries(firstSku?.[1] ?? {});
  const relativeUrl = relative(url) ?? "/";

  const [selectedHref, setSelectedHref] = useState(relativeUrl);
  const selectedVariant = hasVariant.find((v) => relative(v.url) === selectedHref) ?? product;
  const variantImages = filterImagesForVariant(
    isVariantOf?.image ?? selectedVariant.image ?? images ?? [],
    selectedVariant.name,
  );
  const [front, back] = variantImages.length ? variantImages : (images ?? []);

  const percent = listPrice && price ? Math.round(((listPrice - price) / listPrice) * 100) : 0;

  const analyticsItem = mapProductToAnalyticsItem({
    product,
    price,
    listPrice,
    index,
  });

  const event = useSendEvent({
    on: "click",
    event: {
      name: "select_item" as const,
      params: { item_list_name: itemListName, items: [analyticsItem] },
    },
  });

  const firstAttr = firstSku?.[0];
  const showVariants = variants.length > 1 && firstAttr?.toLowerCase() !== SHOE_SIZE_VARIANT;

  const revealRef = useReveal<HTMLDivElement>(0.15, disableReveal);

  return (
    <div
      {...event}
      ref={revealRef}
      className={clx(
        disableReveal ? "" : "reveal",
        "group relative flex shrink-0 flex-col gap-2",
        className,
      )}
      style={{
        transitionDelay: `${Math.min(index ?? 0, 4) * 60}ms`,
      }}
    >
      <div
        className="relative w-full overflow-hidden rounded-sm"
        style={{ aspectRatio: ASPECT_RATIO }}
      >
        {front && (
          <ProductCardImage
            href={selectedHref}
            frontUrl={front.url!}
            frontAlt={front.alternateName}
            backUrl={back?.url}
            backAlt={back?.alternateName}
            width={372}
            height={498}
            preload={preload}
            prefetch={prefetch}
            inStock={inStock}
          />
        )}

        {(percent > 0 || !inStock) && (
          <div className="absolute top-3 left-3 z-10">
            <Tag>{!inStock ? "Esgotado" : `${percent}% off`}</Tag>
          </div>
        )}
      </div>

      <div className="frost flex flex-col rounded-sm p-3 transition-colors duration-(--duration-base) sm:p-4">
        <Link to={selectedHref} preload={prefetch} className="min-w-0">
          <ProductCardTitle title={title} />
        </Link>

        <div className="flex items-center justify-between gap-2">
          <Link to={selectedHref} preload={prefetch} className="shrink-0">
            <ProductCardPrice
              price={price}
              listPrice={listPrice}
              currencyCode={offers?.priceCurrency}
            />
          </Link>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {showVariants && firstAttr && (
              <ProductCardVariants
                attrName={firstAttr}
                variants={variants as Array<readonly [string, string]>}
                selectedHref={selectedHref}
                onSelect={setSelectedHref}
                className="hidden sm:flex"
              />
            )}
            <WishlistButton item={analyticsItem} variant="icon" />
          </div>
        </div>
      </div>
    </div>
  );
}
