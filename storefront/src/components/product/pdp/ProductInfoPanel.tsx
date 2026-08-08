import type { ProductDetailsPage } from "@decocms/apps-commerce/types";
import type { AnalyticsItem } from "@decocms/apps-commerce/types";
import ProductActions, { type ActionsCopyConfig } from "./ProductActions";
import ProductPrice from "./ProductPrice";
import ProductTitle from "./ProductTitle";
import ProductVariantSelector, { type VariantSelectorConfig } from "./ProductVariantSelector";

export interface Props {
  page: ProductDetailsPage;
  price: number;
  listPrice?: number;
  currencyCode?: string;
  isLoading: boolean;
  hasValidVariants: boolean;
  isInStock: boolean;
  analyticsItem: AnalyticsItem;
  variantSelectorConfig?: VariantSelectorConfig;
  copy?: ActionsCopyConfig & { descriptionLabel?: string };
}

/** The Figma "Box shop" — floating glass panel with product info + actions. */
export default function ProductInfoPanel({
  page,
  price,
  listPrice,
  currencyCode,
  isLoading,
  hasValidVariants,
  isInStock,
  analyticsItem,
  variantSelectorConfig,
  copy,
}: Props) {
  const { product, breadcrumbList } = page;
  const { isVariantOf } = product;
  const title = isVariantOf?.name ?? product.name ?? "";
  const description = product.description || isVariantOf?.description;
  void breadcrumbList;

  return (
    <div className="glass-white flex flex-col gap-10 rounded-lg p-6">
      <div className="flex flex-col gap-4">
        <ProductTitle name={title} isLoading={isLoading} />
        {description && (
          <p className="line-clamp-3 max-w-[226px] text-xs text-muted">{description}</p>
        )}
        <ProductPrice
          price={price}
          listPrice={listPrice}
          currencyCode={currencyCode}
          isLoading={isLoading}
        />
      </div>

      <div className="flex flex-col gap-9">
        {hasValidVariants && (
          <ProductVariantSelector product={product} config={variantSelectorConfig} />
        )}

        <ProductActions
          product={product}
          analyticsItem={analyticsItem}
          isInStock={isInStock}
          copy={copy}
        />
      </div>
    </div>
  );
}
