import type { ImageWidget } from "~/types/widgets";
import Image from "~/components/ui/Image";
import { Link } from "@tanstack/react-router";
import Section, { type Props as SectionHeaderProps } from "../../components/ui/Section";
import Slider from "../../components/ui/Slider";
import { type LoadingFallbackProps } from "~/types/deco";
import { useReveal } from "~/sdk/useReveal";

/** @titleBy label */
export interface HighlightItem {
  image: ImageWidget;
  href: string;
  eyebrow?: string;
  label: string;
}

export interface Props extends SectionHeaderProps {
  items: HighlightItem[];
}

function Card({ image, href, eyebrow, label, index = 0 }: HighlightItem & { index?: number }) {
  const ref = useReveal<HTMLAnchorElement>(0.15, true);
  return (
    <Link
      ref={ref}
      to={href}
      preload="intent"
      style={{ transitionDelay: `${Math.min(index, 4) * 60}ms` }}
      className="glass-strong flex w-[285px] shrink-0 items-start gap-3.5 rounded-xs p-2"
    >
      <div className="relative size-[102px] shrink-0 overflow-hidden rounded-xs">
        <Image
          src={image}
          alt={label}
          width={102}
          height={102}
          className="absolute inset-0 size-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="flex min-w-0 flex-col justify-between gap-2 py-0.5">
        <div className="flex flex-col gap-1">
          {eyebrow && <span className="text-2xs font-medium text-ink">{eyebrow}</span>}
          <hr className="border-t border-ink-soft/20" />
        </div>
        <span className="line-clamp-2 text-xs font-medium text-ink">{label}</span>
      </div>
    </Link>
  );
}

/** Compact horizontal strip — the Figma "List product mini" pattern. */
export default function HighlightStrip({ title, cta, items }: Props) {
  if (!items?.length) return null;
  return (
    <Section.Container>
      <Section.Header title={title} cta={cta} />

      <Slider className="carousel carousel-center gap-1.5 w-full">
        {items.map((item, index) => (
          <Slider.Item key={item.href} index={index} className="carousel-item">
            <Card {...item} index={index} />
          </Slider.Item>
        ))}
      </Slider>
    </Section.Container>
  );
}

export const LoadingFallback = ({ title, cta }: LoadingFallbackProps<Props>) => (
  <Section.Container>
    <Section.Header title={title} cta={cta} />
    <Section.Placeholder height="118px" />
  </Section.Container>
);
