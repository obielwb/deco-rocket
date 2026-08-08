import type { AnalyticsItem, Product } from "@decocms/apps-commerce/types";
import { useAddToCart } from "../../../platform/cart";
import { useSendEvent } from "../../../sdk/useSendEvent";
import Button from "../../ui/Button";
import OutOfStock from "../OutOfStock";
import WishlistButton from "../../wishlist/WishlistButton";

export interface ActionsCopyConfig {
  /**
   * @title Add to cart label
   * @default "Add to cart"
   */
  addToCartLabel?: string;
  /**
   * @title Adding label
   * @description Shown while the add-to-cart request is in flight
   * @default "Adding..."
   */
  addingLabel?: string;
  /**
   * @title Added label
   * @description Shown briefly after successful add
   * @default "Added!"
   */
  addedLabel?: string;
  /**
   * @title Error label
   * @default "Try again"
   */
  errorLabel?: string;
}

export interface Props {
  product: Product;
  analyticsItem: AnalyticsItem;
  isInStock: boolean;
  copy?: ActionsCopyConfig;
}

const DEFAULT_COPY = {
  addToCartLabel: "Add to cart",
  addingLabel: "Adding...",
  addedLabel: "Added!",
  errorLabel: "Try again",
} satisfies Required<ActionsCopyConfig>;

export default function ProductActions({ product, analyticsItem, isInStock, copy }: Props) {
  const { addToCartLabel, addingLabel, addedLabel, errorLabel } = {
    ...DEFAULT_COPY,
    ...copy,
  };

  const addToCart = useAddToCart();

  const eventAttrs = useSendEvent({
    on: "click",
    event: {
      name: "add_to_cart",
      params: { items: [analyticsItem] },
    },
  });

  if (!isInStock) {
    return <OutOfStock productID={product.productID} />;
  }

  const label = addToCart.isPending
    ? addingLabel
    : addToCart.isSuccess
      ? addedLabel
      : addToCart.isError
        ? errorLabel
        : addToCartLabel;

  return (
    <div className="flex items-center justify-end gap-1">
      <WishlistButton item={analyticsItem} variant="icon" />
      <Button
        type="button"
        variant="glass"
        size="md"
        {...eventAttrs}
        onClick={() => addToCart.mutate({ merchandiseId: product.productID, quantity: 1 })}
        disabled={addToCart.isPending}
      >
        {label}
      </Button>
    </div>
  );
}
