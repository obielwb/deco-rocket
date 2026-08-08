import type { ButtonHTMLAttributes } from "react";
import { Link } from "@tanstack/react-router";
import { clx } from "~/sdk/clx";

export type ButtonVariant = "glass" | "solid" | "outline";
export type ButtonSize = "sm" | "md";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  glass: "frost text-ink hover:bg-glass-strong",
  solid: "bg-ink text-white hover:bg-ink-soft",
  outline: "bg-transparent text-ink border border-gray-300 hover:border-ink",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-2xs gap-1.5",
  md: "h-10 px-3 text-sm gap-2",
};

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
}

type AsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    href?: undefined;
  };

type AsLink = CommonProps & {
  href: string;
  prefetch?: "intent" | false;
  disabled?: undefined;
};

export type Props = AsButton | AsLink;

/**
 * Shared pill/rectangle button used across the header, PDP and marketing
 * sections. Renders a router `<Link>` when `href` is given, a `<button>`
 * otherwise — same visual system either way.
 */
export default function Button(props: Props) {
  const { variant = "glass", size = "sm", className, children } = props;

  const classes = clx(
    "tap-scale inline-flex items-center justify-center rounded-sm font-medium capitalize whitespace-nowrap transition-colors duration-(--duration-fast)",
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    className,
  );

  if ("href" in props && props.href) {
    return (
      <Link to={props.href} preload={props.prefetch ?? "intent"} className={classes}>
        {children}
      </Link>
    );
  }

  const { type = "button", ...rest } = props as AsButton;
  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
