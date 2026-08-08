import type { ProductDetailsPage } from "@decocms/apps-commerce/types";
import { useOffer } from "@decocms/apps-commerce/sdk/useOffer";
import { mapProductToAnalyticsItem } from "@decocms/apps-commerce/utils/productToAnalyticsItem";
import { useRouterState } from "@tanstack/react-router";
import { useSendEvent } from "../../../sdk/useSendEvent";
import { clx } from "~/sdk/clx";
import ProductDescription from "./ProductDescription";
import ProductGallery, { filterImagesForVariant, type GalleryConfig } from "./ProductGallery";
import ProductInfoPanel from "./ProductInfoPanel";
import ProductShipping from "./ProductShipping";
import type { ActionsCopyConfig } from "./ProductActions";
import type { VariantSelectorConfig } from "./ProductVariantSelector";

export interface HeroCopyConfig extends ActionsCopyConfig {
  /**
   * @title Description label
   * @description Heading for the collapsible description block
   * @default "Description"
   */
  descriptionLabel?: string;
}

export interface Props {
  page: ProductDetailsPage;
  galleryConfig?: GalleryConfig;
  variantSelectorConfig?: VariantSelectorConfig;
  copy?: HeroCopyConfig;
}

export default function ProductHero({ page, galleryConfig, variantSelectorConfig, copy }: Props) {
  const isLoading = useRouterState({ select: (s) => s.isLoading });

  const { breadcrumbList, product } = page;
  const { offers, isVariantOf } = product;

  const { price = 0, listPrice, availability } = useOffer(offers);
  const isInStock = availability === "https://schema.org/InStock";

  const hasValidVariants =
    isVariantOf?.hasVariant?.some(
      (v) => v?.name?.toLowerCase() !== "title" && v?.name?.toLowerCase() !== "default title",
    ) ?? false;

  const analyticsBreadcrumb = {
    ...breadcrumbList,
    itemListElement: breadcrumbList?.itemListElement?.slice(0, -1) ?? [],
    numberOfItems: Math.max(0, (breadcrumbList?.numberOfItems ?? 0) - 1),
  };

  const analyticsItem = mapProductToAnalyticsItem({
    product,
    breadcrumbList: analyticsBreadcrumb,
    price,
    listPrice,
  });

  const viewItemEvent = useSendEvent({
    on: "view",
    event: {
      name: "view_item",
      params: {
        item_list_id: "product",
        item_list_name: "Product",
        items: [analyticsItem],
      },
    },
  });

  // Filter against the variant name (e.g. "Tote Bag — Yellow"), not the
  // parent family name in `title` — otherwise no per-variant filtering happens.
  const images = filterImagesForVariant(isVariantOf?.image ?? product.image ?? [], product.name);

  return (
    <div {...viewItemEvent} className="flex flex-col gap-8">
      <div className={clx("flex h-screen flex-col gap-4", "sm:flex-row sm:items-stretch sm:gap-8")}>
        <div className="order-2 w-full shrink-0 sm:order-1 sm:h-full sm:w-[380px]">
          <div className="flex h-full items-center justify-center sm:sticky sm:top-24">
            <ProductInfoPanel
              page={page}
              price={price}
              listPrice={listPrice}
              currencyCode={offers?.priceCurrency}
              isLoading={isLoading}
              hasValidVariants={hasValidVariants}
              isInStock={isInStock}
              analyticsItem={analyticsItem}
              variantSelectorConfig={variantSelectorConfig}
              copy={copy}
            />
          </div>
        </div>

        <div className="order-1 min-h-0 w-full flex-1 sm:order-2 sm:h-full">
          <ProductGallery images={images} config={galleryConfig} />
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:w-[380px]">
        <ProductDescription
          html={product.description || isVariantOf?.description}
          label={copy?.descriptionLabel}
        />
        <ProductShipping />
      </div>
    </div>
  );
}
