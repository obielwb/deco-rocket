import type { ImageWidget } from "~/types/widgets";
import Image from "~/components/ui/Image";
import { Link } from "@tanstack/react-router";
import { clx } from "~/sdk/clx";
import { useReveal } from "~/sdk/useReveal";
import { useState } from "react";
import { type LoadingFallbackProps } from "~/types/deco";

export interface PromoCard {
  /** @title Eyebrow label */
  label: string;
  /** @title Headline */
  headline: string;
  /** @title CTA label */
  cta?: string;
  href: string;
  image: ImageWidget;
}

/** @titleBy label */
export interface PromoTab {
  label: string;
  cards: PromoCard[];
}

export interface Props {
  /** @title Heading */
  title?: string;
  tabs: PromoTab[];
}

function Card({ label, headline, cta = "Shop Now", href, image, index = 0 }: PromoCard & { index?: number }) {
  const ref = useReveal<HTMLAnchorElement>();
  return (
    <Link
      ref={ref}
      to={href}
      preload="intent"
      style={{ transitionDelay: `${Math.min(index, 4) * 60}ms` }}
      className="reveal group relative grid aspect-square w-full shrink-0 grid-rows-[auto_1fr_auto] items-center justify-center overflow-hidden rounded-sm p-4 text-center sm:flex-1"
    >
      <Image
        src={image}
        alt={headline}
        width={640}
        height={640}
        className="absolute inset-0 size-full object-cover transition-transform duration-(--duration-slow) ease-(--ease-out-soft) group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-black/20" />

      <span className="relative text-sm font-medium text-white">{label}</span>

      {/* h3: nested under the grid's h2 heading, keeping the outline h2 -> h3. */}
      <h3 className="relative text-xl font-semibold text-white sm:text-2xl">{headline}</h3>

      <span className="relative text-sm font-medium text-white">{cta}</span>
    </Link>
  );
}

/** Centered heading + tab toggle + full-bleed 3-up promo grid — the Figma "Tech showcase" pattern. */
export default function PromoGrid({ title, tabs = [] }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!tabs.length) return null;

  const active = tabs[Math.min(activeIndex, tabs.length - 1)];

  return (
    <div className="flex flex-col items-center gap-6 px-3 py-8 sm:py-14">
      {title && (
        <h2 className="max-w-xl text-center text-display font-medium text-ink sm:text-3xl">{title}</h2>
      )}

      {tabs.length > 1 && (
        <div className="flex items-center gap-2">
          {tabs.map((tab, index) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={clx(
                "tap-scale rounded-sm px-4 py-2 text-sm font-medium transition-colors duration-(--duration-fast)",
                index === activeIndex ? "bg-ink text-white" : "frost text-ink-soft",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex w-full flex-col gap-3 sm:flex-row">
        {active.cards.map((card, index) => (
          <Card key={card.href} {...card} index={index} />
        ))}
      </div>
    </div>
  );
}

export const LoadingFallback = ({ title }: LoadingFallbackProps<Props>) => (
  <div className="flex flex-col items-center gap-6 px-3 py-8 sm:py-14">
    {title && <h2 className="text-center text-display font-medium text-ink">{title}</h2>}
  </div>
);
