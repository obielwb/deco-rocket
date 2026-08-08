import { formatPrice } from "@decocms/apps-commerce/sdk/formatPrice";

export interface Props {
  price?: number;
  listPrice?: number;
  currencyCode?: string;
}

export default function ProductCardPrice({ price = 0, listPrice, currencyCode }: Props) {
  const showCompare = listPrice != null && listPrice > price;
  return (
    <div className="flex items-baseline gap-2 tabular-nums">
      {showCompare ? (
        <span className="text-2xs font-normal text-muted line-through">
          {formatPrice(listPrice, currencyCode)}
        </span>
      ) : null}
      <span className="text-sm font-medium text-ink-soft tracking-[0.02em]">
        {formatPrice(price, currencyCode)}
      </span>
    </div>
  );
}
