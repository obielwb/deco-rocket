import { useMutationState } from "@tanstack/react-query";
import { MINICART_DRAWER_ID } from "../../constants";
import { useCart } from "../../platform/cart";
import { clx } from "~/sdk/clx";
import Icon from "../ui/Icon";

/**
 * Desktop renders the Figma "Action button" — plain text pill: "Bag", with an
 * item count. Mobile has no room for a text pill, so it renders an icon-only
 * button (matching the menu/search icons) with the count as a small badge.
 */
export default function Bag({ size = "md" }: { size?: "sm" | "md" }) {
  const { cart } = useCart();
  const count = cart.items.length;
  // Global "cart busy" indicator: any in-flight cart mutation (add/update/
  // remove) from anywhere in the tree, read via useMutationState by the
  // ["cart", …] mutationKey — no prop drilling.
  const busy =
    useMutationState({
      filters: { mutationKey: ["cart"], status: "pending" },
    }).length > 0;

  if (size === "sm") {
    return (
      <label
        htmlFor={MINICART_DRAWER_ID}
        aria-label="Open cart"
        className="tap-scale relative flex size-10 cursor-pointer items-center justify-center rounded-sm text-ink transition-colors duration-(--duration-fast) hover:bg-white/60"
      >
        {busy ? (
          <span className="loading loading-spinner loading-xs" />
        ) : (
          <Icon id="shopping_bag" size={18} />
        )}
        {!busy && count > 0 && (
          <span className="absolute top-1 right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-ink px-0.5 text-[9px] leading-none font-medium tabular-nums text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </label>
    );
  }

  return (
    <label
      htmlFor={MINICART_DRAWER_ID}
      aria-label="Open cart"
      className={clx(
        "frost tap-scale inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-sm px-3 text-sm font-medium capitalize transition-colors duration-(--duration-fast) hover:bg-glass-strong",
      )}
    >
      {busy ? <span className="loading loading-spinner loading-xs" /> : "Bag"}
      {!busy && count > 0 && (
        <span className="tabular-nums text-muted">({count > 9 ? "9+" : count})</span>
      )}
    </label>
  );
}
