import type { ProductDetailsPage } from "@decocms/apps-commerce/types";
import { BreadcrumbJsonLd, ProductJsonLd } from "@decocms/blocks/hooks";
import ProductHero, { type HeroCopyConfig } from "../../components/product/pdp/ProductHero";
import type { GalleryConfig } from "../../components/product/pdp/ProductGallery";
import type { VariantSelectorConfig } from "../../components/product/pdp/ProductVariantSelector";
import Section from "../../components/ui/Section";

export interface CopyConfig extends HeroCopyConfig {
  /**
   * @title Not-found title
   * @description Heading shown when the product loader returns no page
   * @default "Page not found"
   */
  notFoundTitle?: string;
  /**
   * @title Go-home label
   * @description Label for the button that links back to the homepage on not-found
   * @default "Go back to Home"
   */
  goHomeLabel?: string;
}

export interface Props {
  /**
   * @title Integration
   * @description Product details data returned by the commerce platform loader
   */
  page: ProductDetailsPage | null;

  /**
   * @title Gallery
   * @description Image slider appearance and loading behavior
   */
  galleryConfig?: GalleryConfig;

  /**
   * @title Variant selector
   * @description Swatches and preload strategy for sibling variants
   */
  variantSelectorConfig?: VariantSelectorConfig;

  /**
   * @title Copy
   * @description Editable labels (CTA, description heading, not-found fallback)
   */
  copy?: CopyConfig;
}

export default function ProductDetails({
  page,
  galleryConfig,
  variantSelectorConfig,
  copy,
}: Props) {
  if (!page) {
    const notFoundTitle = copy?.notFoundTitle ?? "Page not found";
    const goHomeLabel = copy?.goHomeLabel ?? "Go back to Home";
    return (
      <div className="flex w-full items-center justify-center py-28">
        <div className="flex flex-col items-center justify-center gap-6">
          <span className="text-display font-medium text-ink">{notFoundTitle}</span>
          <a
            href="/"
            className="tap-scale frost rounded-sm px-4 py-2.5 text-sm font-medium text-ink"
          >
            {goHomeLabel}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container flex w-full flex-col gap-3 px-3 pt-15 pb-4 sm:gap-4 sm:pb-6">
      {/* SEO: schema.org JSON-LD, server-rendered inline (crawlers read it anywhere in the document) */}
      <ProductJsonLd product={page.product} />
      <BreadcrumbJsonLd breadcrumb={page.breadcrumbList} />
      <ProductHero
        page={page}
        galleryConfig={galleryConfig}
        variantSelectorConfig={variantSelectorConfig}
        copy={copy}
      />
    </div>
  );
}

export const LoadingFallback = () => <Section.Placeholder height="635px" />;
