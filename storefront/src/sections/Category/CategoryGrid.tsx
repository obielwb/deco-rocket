import type { ImageWidget } from "~/types/widgets";
import Image from "~/components/ui/Image";
import Section, { type Props as SectionHeaderProps } from "../../components/ui/Section";
import Slider from "../../components/ui/Slider";
import { clx } from "~/sdk/clx";
import { type LoadingFallbackProps } from "~/types/deco";
import { Link } from "@tanstack/react-router";
import { useReveal } from "~/sdk/useReveal";

/** @titleBy label */
export interface Item {
  image: ImageWidget;
  href: string;
  label: string;
}
export interface Props extends SectionHeaderProps {
  items: Item[];
}

function Card({
  image,
  href,
  label,
  index = 0,
  disableReveal,
}: Item & { index?: number; disableReveal?: boolean }) {
  const ref = useReveal<HTMLAnchorElement>(0.15, disableReveal);
  return (
    <Link
      ref={ref}
      to={href}
      preload="intent"
      style={{ transitionDelay: `${Math.min(index, 4) * 60}ms` }}
      className={clx(
        disableReveal ? "" : "reveal",
        "group relative flex aspect-[3/4] w-56 shrink-0 items-end overflow-hidden rounded-sm sm:w-full",
      )}
    >
      <Image
        src={image}
        alt={label}
        width={340}
        height={453}
        className="absolute inset-0 size-full object-cover transition-transform duration-(--duration-slow) ease-(--ease-out-soft) group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/0 from-55% to-black/30" />
      <span className="relative p-4 text-sm font-medium text-white capitalize">{label}</span>
    </Link>
  );
}

function CategoryGrid({ title, cta, items }: Props) {
  return (
    <Section.Container>
      <Section.Header title={title} cta={cta} />

      <div className="hidden gap-3 sm:grid sm:grid-cols-3 lg:grid-cols-6">
        {items.map((i, index) => (
          <Card key={i.label} {...i} index={index} />
        ))}
      </div>

      <Slider className="carousel carousel-center gap-3 w-full sm:hidden">
        {items.map((i, index) => (
          <Slider.Item key={i.label} index={index} className="carousel-item">
            <Card {...i} disableReveal />
          </Slider.Item>
        ))}
      </Slider>
    </Section.Container>
  );
}
export const LoadingFallback = ({ title, cta }: LoadingFallbackProps<Props>) => (
  <Section.Container>
    <Section.Header title={title} cta={cta} />
    <Section.Placeholder height="320px" />
  </Section.Container>
);
export default CategoryGrid;
