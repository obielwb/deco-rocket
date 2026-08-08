import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { SiteNavigationElement } from "@decocms/apps-commerce/types";
import type { ImageWidget } from "~/types/widgets";
import { clx } from "~/sdk/clx";
import Icon from "../ui/Icon";
import Image from "../ui/Image";

export interface HeaderLogo {
  src: ImageWidget;
  alt: string;
  width?: number;
  height?: number;
}

export interface Props {
  navItems: SiteNavigationElement[];
  logo?: HeaderLogo;
  /** @description Small shipping/promo note shown at the foot of the mega menu */
  shippingNote?: string;
}

/**
 * A single nav item's dropdown — the Figma "List menu big" pattern: one
 * "Shopping"-style label over a stacked list of its children. (Figma's own
 * reference frame shows this list repeated per top-level item, one at a
 * time — not a multi-column grid.)
 */
function MegaMenuList({ item }: { item: SiteNavigationElement }) {
  const children = item.children?.filter((c) => c.name) ?? [];

  return (
    <div className="flex w-full flex-col items-start gap-5 px-3">
      <span className="text-xs font-medium text-muted-soft">Shopping</span>
      <ul className="flex flex-col items-start gap-2">
        {children.map((link) => (
          <li key={link.url ?? link.name}>
            <Link
              to={link.url ?? "#"}
              preload="intent"
              className="text-lg font-medium text-muted-soft capitalize transition-colors duration-(--duration-fast) hover:text-ink"
            >
              {link.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Floating glass pill nav + hover mega menu — the Figma "Navigation"
 * component. A single shared panel (not one per item) so only one column
 * set is ever open, expanded via a grid-rows transition for a smooth,
 * layout-safe reveal.
 */
const MAX_VISIBLE_ITEMS = 3;

export default function HeaderNav({ navItems, logo, shippingNote }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const overflowItems = navItems.slice(MAX_VISIBLE_ITEMS);
  const items: SiteNavigationElement[] =
    overflowItems.length > 0
      ? [
          ...navItems.slice(0, MAX_VISIBLE_ITEMS),
          { "@type": "SiteNavigationElement", name: "More", children: overflowItems },
        ]
      : navItems;

  const open = (i: number) => {
    clearTimeout(closeTimer.current);
    setOpenIndex(i);
  };
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setOpenIndex(null), 150);
  };
  const cancelClose = () => clearTimeout(closeTimer.current);

  const active = openIndex != null ? items[openIndex] : null;
  const isOpen = Boolean(active?.children?.length);

  return (
    <div
      className="relative"
      onMouseLeave={scheduleClose}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setOpenIndex(null);
        }
      }}
    >
      <nav
        className={clx(
          "frost relative z-10 flex h-10 shrink-0 items-center gap-1.5 py-[5px] pr-1.5 pl-2.5 transition-[border-radius] duration-(--duration-slow)",
          isOpen ? "rounded-t-sm" : "rounded-sm",
        )}
      >
        {logo && (
          <Link to="/" aria-label="Home" className="mr-2 flex shrink-0 items-center">
            <Image
              src={logo.src}
              alt={logo.alt}
              width={logo.width ?? 88}
              height={logo.height ?? 24}
              className="h-6 w-auto object-contain"
              loading="eager"
            />
          </Link>
        )}
        {items.map((item, i) => (
          <Link
            key={item.url ?? item.name}
            to={item.url ?? "#"}
            preload="intent"
            onMouseEnter={() => open(i)}
            onFocus={() => open(i)}
            className={clx(
              "tap-scale flex h-[27px] items-center justify-center rounded-full px-2.5 text-sm font-normal capitalize transition-colors duration-(--duration-fast)",
              openIndex === i ? "bg-white text-ink" : "text-ink hover:bg-white/70",
            )}
          >
            {item.name}
          </Link>
        ))}

        <Link
          to="/collections/rocket-launches"
          preload="intent"
          className="tap-scale flex h-[27px] items-center rounded-full px-2.5 text-sm text-ink transition-colors hover:bg-white/70"
        >
          Drops
        </Link>

        <Link
          to="/rocket"
          preload="intent"
          className="tap-scale flex h-[27px] items-center gap-1.5 rounded-full bg-ink px-3 text-sm font-medium text-white transition-opacity hover:opacity-80"
        >
          <span className="size-1.5 rounded-full bg-[#b7f34a]" aria-hidden="true" />
          Rocket
        </Link>

        {/*
          Absolutely positioned so opening it never reflows page content
          below the header — it floats over whatever's underneath, same as
          the row. Kept INSIDE <nav> (rather than as a sibling after it) so
          the mega menu's links and copy remain part of the navigation
          landmark instead of being loose content outside any landmark.
        */}
        <div
          onMouseEnter={cancelClose}
          className={clx(
            "frost absolute inset-x-0 top-full z-0 grid overflow-hidden rounded-b-sm transition-[grid-template-rows] duration-(--duration-slow) ease-(--ease-out-soft)",
            !isOpen && "pointer-events-none",
          )}
          style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <div
              className={clx(
                "flex flex-col items-center gap-10 pt-8 pb-5 transition-opacity duration-(--duration-base)",
                isOpen ? "opacity-100 delay-75" : "opacity-0",
              )}
            >
              {active && <MegaMenuList item={active} />}

              {shippingNote && (
                <div className="flex w-full items-center justify-between px-3 py-3.5">
                  <div className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-ink" aria-hidden="true" />
                    <span className="text-2xs font-medium tracking-[-0.1px] text-muted-soft">
                      {shippingNote}
                    </span>
                  </div>
                  {active?.url && (
                    <Link
                      to={active.url}
                      preload="intent"
                      className="flex items-center gap-1 text-2xs capitalize text-ink"
                    >
                      See all
                      <Icon id="chevron-right" size={10} />
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
