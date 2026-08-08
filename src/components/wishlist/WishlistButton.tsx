import type { AnalyticsItem } from "@decocms/apps-commerce/types";
import { useNavigate } from "@tanstack/react-router";
import { useSendEvent } from "../../sdk/useSendEvent";
import { useToggleWishlist, useWishlist } from "../../platform/wishlist";
import { useUser } from "../../platform/user";
import IconButton from "../ui/IconButton";
import Button from "../ui/Button";

interface Props {
  variant?: "full" | "icon";
  item: AnalyticsItem;
}

function WishlistButton({ item, variant = "full" }: Props) {
  const productID = (item as { item_id: string }).item_id;
  const productGroupID = item.item_group_id ?? "";

  const { isInWishlist } = useWishlist();
  const toggle = useToggleWishlist();
  const { isAuthenticated } = useUser();
  const navigate = useNavigate();

  const inWishlist = isInWishlist(productID);
  const pending = toggle.isPending && toggle.variables?.productID === productID;

  const addToWishlistEvent = useSendEvent({
    on: "click",
    event: { name: "add_to_wishlist", params: { items: [item] } },
  });

  const handleClick = () => {
    if (!isAuthenticated) {
      navigate({ to: "/login" });
      return;
    }
    toggle.mutate({ productID, productGroupID });
  };

  const label = inWishlist ? "Remove from wishlist" : "Add to wishlist";

  if (variant === "icon") {
    return (
      <IconButton
        icon="favorite"
        label={label}
        active={inWishlist}
        filled={inWishlist}
        disabled={pending}
        onClick={handleClick}
        {...addToWishlistEvent}
      />
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="md"
      disabled={pending}
      onClick={handleClick}
      className="w-full"
      {...addToWishlistEvent}
    >
      {label}
    </Button>
  );
}

export default WishlistButton;
