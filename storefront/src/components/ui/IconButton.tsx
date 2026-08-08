import type { ButtonHTMLAttributes } from "react";
import { clx } from "~/sdk/clx";
import Icon, { type AvailableIcons } from "./Icon";

export interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: AvailableIcons;
  label: string;
  active?: boolean;
  size?: "sm" | "md";
  iconSize?: number;
  filled?: boolean;
}

const SIZE_CLASS = {
  sm: "size-8",
  md: "size-10",
};

/**
 * Circular glass icon button — wishlist heart, search trigger, menu
 * hamburger/close. Padding extends the tap target to 44px on touch even
 * when the visible glass surface is smaller (see web-animation-design tip).
 */
export default function IconButton({
  icon,
  label,
  active = false,
  size = "sm",
  iconSize = 16,
  filled = false,
  className,
  ...props
}: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      className={clx(
        "tap-scale relative inline-flex items-center justify-center rounded-sm transition-colors duration-(--duration-fast)",
        "before:absolute before:-inset-[6px] before:content-['']", // 44px+ hit area
        active ? "glass-strong text-ink" : "frost text-ink hover:bg-glass-strong",
        SIZE_CLASS[size],
        className,
      )}
      {...props}
    >
      <Icon
        id={icon}
        size={iconSize}
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
      />
    </button>
  );
}
