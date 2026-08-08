import { Link } from "@tanstack/react-router";
import { clx } from "~/sdk/clx";

/** Shared color-name → swatch-color lookup for variant dots. */
export const SWATCH_COLORS: Record<string, string | undefined> = {
  White: "#ffffff",
  Black: "#0a0a0a",
  Gray: "#a3a3a3",
  Blue: "#99ccff",
  Green: "#aad1b5",
  Yellow: "#f1e8b0",
  DarkBlue: "#4e6e95",
  LightBlue: "#bedae4",
  DarkGreen: "#446746",
  LightGreen: "#aad1b5",
  DarkYellow: "#c6b343",
  LightYellow: "#f1e8b0",
};

export interface ColorSwatchProps {
  value: string;
  checked?: boolean;
  size?: number;
  className?: string;
}

/** A single 10–16px color pill, matching the Figma "Pill color" component. */
export function ColorSwatch({ value, checked = false, size = 14, className }: ColorSwatchProps) {
  const color = SWATCH_COLORS[value] ?? "#d4d4d4";
  return (
    <span
      aria-label={value}
      style={{ width: size, height: size, backgroundColor: color }}
      className={clx(
        "block shrink-0 rounded-full ring-1 ring-black/10 transition-shadow duration-(--duration-fast)",
        checked && "ring-2 ring-ink ring-offset-2",
        className,
      )}
    />
  );
}

export interface ColorSwatchListProps {
  variants: Array<readonly [value: string, link: string]>;
  selectedHref: string;
  onSelect: (href: string) => void;
  size?: number;
  max?: number;
  className?: string;
}

/**
 * Row of color dots used both on the product card (hover preview) and the
 * PDP variant selector. Each dot is a tap target for its variant URL.
 */
export function ColorSwatchList({
  variants,
  selectedHref,
  onSelect,
  size = 14,
  max,
  className,
}: ColorSwatchListProps) {
  const visible = max ? variants.slice(0, max) : variants;
  const hidden = max ? variants.length - visible.length : 0;

  return (
    <ul className={clx("flex items-center gap-2", className)}>
      {visible.map(([value, href]) => {
        const checked = href === selectedHref;
        return (
          <li key={href}>
            <button
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={value}
              onClick={() => onSelect(href)}
              onMouseEnter={() => onSelect(href)}
              className="tap-scale block cursor-pointer p-0.5"
            >
              <ColorSwatch value={value} checked={checked} size={size} />
            </button>
          </li>
        );
      })}
      {hidden > 0 && (
        <li className="text-2xs text-muted-soft" aria-hidden="true">
          +{hidden}
        </li>
      )}
    </ul>
  );
}

export interface ColorSwatchNavListProps {
  variants: Array<readonly [value: string, href: string]>;
  selectedHref: string;
  size?: number;
  preloadStrategy?: "intent" | "viewport" | "render" | false;
}

/**
 * Color dots that navigate to the variant's own URL — used on the PDP,
 * where picking a color is a real page change (not a hover preview).
 */
export function ColorSwatchNavList({
  variants,
  selectedHref,
  size = 14,
  preloadStrategy = "intent",
}: ColorSwatchNavListProps) {
  return (
    <ul className="flex items-center gap-2">
      {variants.map(([value, href]) => {
        const checked = href === selectedHref;
        return (
          <li key={href}>
            <Link
              to={href}
              preload={preloadStrategy === false ? false : preloadStrategy}
              activeOptions={{ exact: true }}
              aria-label={`Color: ${value}`}
              aria-current={checked ? "page" : undefined}
              className="tap-scale block cursor-pointer p-0.5"
            >
              <ColorSwatch value={value} checked={checked} size={size} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
