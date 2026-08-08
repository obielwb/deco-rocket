import { relative } from "../../../sdk/url";
import { ColorSwatchList } from "../ColorSwatch";
import { clx } from "~/sdk/clx";

const isColorAttr = (name: string) => /color|cor(es)?/i.test(name);

export interface Props {
  attrName: string;
  variants: Array<readonly [value: string, link: string]>;
  selectedHref: string;
  onSelect: (href: string) => void;
  className?: string;
}

/**
 * Hover/tap variant preview shown on the product card's glass info bar —
 * color dots for color attributes (matches Figma's "Color list"), small
 * text pills for anything else.
 */
export default function ProductCardVariants({
  attrName,
  variants,
  selectedHref,
  onSelect,
  className,
}: Props) {
  const entries = variants.map(([value, link]) => [value, relative(link) as string] as const);

  if (isColorAttr(attrName)) {
    return (
      <ColorSwatchList
        variants={entries}
        selectedHref={selectedHref}
        onSelect={onSelect}
        size={10}
        max={5}
        className={className}
      />
    );
  }

  return (
    <ul className={clx("flex items-center gap-1", className)}>
      {entries.map(([value, href]) => {
        const checked = href === selectedHref;
        return (
          <li key={href}>
            <button
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={`${attrName}: ${value}`}
              onClick={() => onSelect(href)}
              onMouseEnter={() => onSelect(href)}
              className={clx(
                "tap-scale rounded-xs px-1.5 py-0.5 text-2xs capitalize transition-colors duration-(--duration-fast)",
                checked ? "bg-ink text-white" : "frost text-muted-soft",
              )}
            >
              {value}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
