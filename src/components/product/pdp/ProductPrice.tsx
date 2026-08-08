import { formatPrice } from "@decocms/apps-commerce/sdk/formatPrice";

export interface Props {
  price?: number;
  listPrice?: number;
  currencyCode?: string;
  /**
   * Show skeleton placeholders while a variant navigation is pending.
   * Skeleton dimensions match the rendered price block so there is no layout shift.
   */
  isLoading?: boolean;
}

export default function ProductPrice({ price = 0, listPrice, currencyCode, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="flex gap-2" aria-hidden="true">
        <div className="skeleton h-5 w-20 rounded" />
      </div>
    );
  }

  const showCompare = listPrice != null && listPrice > price;

  return (
    <div className="flex items-baseline gap-2 tabular-nums">
      <span className="text-sm font-medium text-gray-950 capitalize">
        {formatPrice(price, currencyCode)}
      </span>
      {showCompare ? (
        <span className="text-2xs text-muted line-through">
          {formatPrice(listPrice, currencyCode)}
        </span>
      ) : null}
    </div>
  );
}
