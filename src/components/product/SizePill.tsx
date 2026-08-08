import { Link } from "@tanstack/react-router";
import { clx } from "~/sdk/clx";

export interface SizePillListProps {
  entries: Array<readonly [value: string, link: string]>;
  selectedHref: string;
  preloadStrategy?: "intent" | "viewport" | "render" | false;
}

/**
 * Round size selector pills ("Tamanhos" on the PDP) — glass by default,
 * solid ink when selected.
 */
export function SizePillList({
  entries,
  selectedHref,
  preloadStrategy = "intent",
}: SizePillListProps) {
  return (
    <ul className="flex flex-wrap items-center gap-1">
      {entries.map(([value, href]) => {
        const checked = href === selectedHref;
        return (
          <li key={href}>
            <Link
              to={href}
              preload={preloadStrategy === false ? false : preloadStrategy}
              activeOptions={{ exact: true }}
              aria-label={`Size: ${value}`}
              aria-current={checked ? "page" : undefined}
              className={clx(
                "tap-scale flex size-[26px] items-center justify-center rounded-full text-2xs capitalize transition-colors duration-(--duration-fast)",
                checked ? "bg-ink text-white" : "frost text-muted-soft hover:bg-glass-strong",
              )}
            >
              {value}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
