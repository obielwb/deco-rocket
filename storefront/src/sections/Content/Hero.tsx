import type { Product } from "@decocms/apps-commerce/types";
import type { ImageWidget } from "~/types/widgets";
import Image from "~/components/ui/Image";
import { Picture, Source } from "~/components/ui/Picture";
import { Link } from "@tanstack/react-router";
import { clx } from "~/sdk/clx";
import { useReveal } from "~/sdk/useReveal";
import { useOffer } from "@decocms/apps-commerce/sdk/useOffer";
import Slider from "~/components/ui/Slider";
import Icon from "~/components/ui/Icon";
import ProductCardPrice from "~/components/product/card/ProductCardPrice";
import { useId } from "react";

/** @titleBy label */
export interface HeroCategory {
  label: string;
  href: string;
  image: ImageWidget;
}

/** @titleBy headline */
export interface HeroSlide {
  /** @title Background image (desktop) */
  image: ImageWidget;
  /** @title Background image (mobile) */
  mobileImage?: ImageWidget;
  /** @title Link */
  href?: string;
  /** @title Headline (shown on mobile only) */
  headline?: string;
  /** @title Brand logo (desktop only) */
  logo?: ImageWidget;
  logoAlt?: string;
  /**
   * @title Product (desktop only)
   * @description This slide's product — shown as a nav thumbnail below the banner; clicking another slide's thumbnail jumps to that banner.
   */
  product?: Product[] | null;
}

export interface Props {
  /** @title Banner slides */
  slides: HeroSlide[];
  /** @title Category tiles */
  categories?: HeroCategory[];
  /** @title Info bullets */
  infoBullets?: string[];
  /**
   * @title Autoplay interval (seconds)
   * @description Leave empty to disable autoplay
   */
  interval?: number;
}

function CategoryTile({
  label,
  href,
  image,
  index = 0,
  disableReveal,
}: HeroCategory & { index?: number; disableReveal?: boolean }) {
  const ref = useReveal<HTMLAnchorElement>(0.15, disableReveal);
  return (
    <Link
      ref={ref}
      to={href}
      preload="intent"
      style={{ transitionDelay: `${Math.min(index, 4) * 60}ms` }}
      className={clx(
        disableReveal ? "" : "reveal",
        "group relative flex aspect-[496/498] w-64 shrink-0 items-end justify-start overflow-hidden rounded-sm p-4 sm:w-auto sm:flex-1",
      )}
    >
      <Image
        src={image}
        alt={label}
        width={496}
        height={498}
        className="absolute inset-0 size-full object-cover transition-transform duration-(--duration-slow) ease-(--ease-out-soft) group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/0 from-55% to-black/30" />
      <span className="relative text-display font-medium text-white">{label}</span>
    </Link>
  );
}

/**
 * One nav thumbnail per slide — doubles as the carousel's slide indicator
 * (built on `Slider.Dot`, so clicking it jumps the carousel to that slide,
 * it never navigates to the product page). The slide currently in view
 * renders "disabled" by the slider's IntersectionObserver, which is when it
 * expands to show the product's name and price; every other slide's
 * thumbnail collapses to just its bare image.
 */
function HeroSlideNav({ product, index }: { product: Product; index: number }) {
  const { image: images, isVariantOf, offers } = product;
  const title = isVariantOf?.name ?? product.name ?? "";
  const { price, listPrice } = useOffer(offers);
  const img = images?.[0];

  return (
    <Slider.Dot
      index={index}
      disabled={index === 0}
      aria-label={title}
      className={clx(
        "flex shrink-0 items-center overflow-hidden rounded-sm text-left",
        "transition-[background-color,padding,gap] duration-(--duration-slow) ease-(--ease-out-soft)",
        "disabled:frost disabled:gap-2 disabled:p-1.5 disabled:pr-3 sm:disabled:gap-3 sm:disabled:p-2 sm:disabled:pr-5",
      )}
    >
      <div
        className={clx(
          "size-14 shrink-0 overflow-hidden rounded-xs sm:size-24",
          "transition-[width,height,background-color] duration-(--duration-slow) ease-(--ease-out-soft)",
          "group-disabled:size-12 group-disabled:bg-white sm:group-disabled:size-20",
        )}
      >
        {img && (
          <Image
            src={img.url!}
            alt={img.alternateName ?? title}
            width={96}
            height={96}
            className="size-full object-cover"
            loading="lazy"
          />
        )}
      </div>
      <div className="grid grid-cols-[0fr] transition-[grid-template-columns] duration-(--duration-slow) ease-(--ease-out-soft) group-disabled:grid-cols-[1fr]">
        <div className="flex min-w-0 flex-col gap-1 overflow-hidden opacity-0 transition-opacity duration-(--duration-base) ease-(--ease-out-soft) group-disabled:opacity-100 group-disabled:delay-75 sm:gap-1.5">
          <span className="hidden text-2xs font-medium text-ink-soft whitespace-nowrap sm:inline">
            Produto em destaque
          </span>
          <hr className="hidden w-28 border-t border-ink-soft/20 sm:block" />
          <span className="line-clamp-1 max-w-28 text-xs font-medium text-ink whitespace-nowrap sm:max-w-40 sm:text-sm">
            {title}
          </span>
          <ProductCardPrice price={price} listPrice={listPrice} currencyCode={offers?.priceCurrency} />
        </div>
      </div>
    </Slider.Dot>
  );
}

/** Full-bleed slide: responsive image (desktop/mobile crop) and optional brand logo (desktop). */
function HeroSlide({ image, mobileImage, href = "/", headline, logo, logoAlt, isLcp = false }: HeroSlide & { isLcp?: boolean }) {
  return (
    <div className="relative size-full shrink-0 overflow-hidden rounded-md">
      <Link to={href} preload="intent" className="absolute inset-0 block">
        <Picture className="block size-full">
          <Source
            media="(max-width: 767px)"
            src={mobileImage ?? image}
            width={720}
            height={900}
            fetchPriority={isLcp ? "high" : undefined}
          />
          <Source
            media="(min-width: 768px)"
            src={image}
            width={1488}
            height={794}
            fetchPriority={isLcp ? "high" : undefined}
          />
          <img
            className="size-full object-cover"
            src={image}
            alt={logoAlt ?? headline ?? ""}
            width={1488}
            height={794}
            decoding="async"
            loading={isLcp ? "eager" : "lazy"}
            {...(isLcp ? { fetchpriority: "high" } : {})}
          />
        </Picture>
      </Link>

      {logo && (
        <div className="pointer-events-none absolute top-8 left-8 hidden sm:block">
          <Image src={logo} alt={logoAlt ?? ""} width={160} height={64} className="h-10 w-auto object-contain" />
        </div>
      )}
    </div>
  );
}

export default function Hero({ slides, categories = [], infoBullets = [], interval }: Props) {
  const id = useId();
  const first = slides[0];
  const hasProductNav = slides.some((slide) => slide.product?.[0]);
  if (!first) return null;

  return (
    <div className="flex flex-col gap-2 px-3">
      {/* Page main heading — visually hidden to preserve the hero's design while
          giving the home page the H1 it needs for semantic structure/a11y. */}
      <h1 className="sr-only">{first.headline ?? "Deco Storefront"}</h1>
      <div className="flex h-screen flex-col gap-2 pt-17 pb-3 sm:pt-15">
        {/* Carousel — each slide's own background (mobile/desktop crop), logo and featured products. */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div id={id} className="relative min-h-0 flex-1">
            <Slider className="carousel carousel-center h-full w-full">
              {slides.map((slide, index) => (
                <Slider.Item key={slide.image} index={index} className="carousel-item h-full w-full">
                  <HeroSlide {...slide} isLcp={index === 0} />
                </Slider.Item>
              ))}
            </Slider>

            {slides.length > 1 && (
              <>
                <div className="absolute inset-y-0 left-3 z-10 flex items-center">
                  <Slider.PrevButton
                    disabled={false}
                    className="tap-scale frost flex size-8 items-center justify-center rounded-full text-ink sm:size-10"
                  >
                    <Icon id="chevron-right" className="rotate-180" size={18} />
                  </Slider.PrevButton>
                </div>
                <div className="absolute inset-y-0 right-3 z-10 flex items-center">
                  <Slider.NextButton
                    disabled={false}
                    className="tap-scale frost flex size-8 items-center justify-center rounded-full text-ink sm:size-10"
                  >
                    <Icon id="chevron-right" size={18} />
                  </Slider.NextButton>
                </div>
                <div className="absolute bottom-4 left-4 z-10 flex items-stretch gap-2 overflow-x-auto sm:bottom-6 sm:left-6 sm:gap-3 sm:overflow-visible">
                  {hasProductNav
                    ? slides.map(
                        (slide, index) =>
                          slide.product?.[0] && (
                            <HeroSlideNav key={slide.image} product={slide.product[0]} index={index} />
                          ),
                      )
                    : slides.map((slide, index) => (
                        <Slider.Dot
                          key={slide.image}
                          index={index}
                          disabled={index === 0}
                          className="size-2 self-center rounded-full bg-white/60 transition-[width] disabled:w-6 disabled:bg-white"
                        />
                      ))}
                </div>
              </>
            )}
          </div>
          <Slider.JS rootId={id} interval={interval ? interval * 1000 : undefined} infinite />
        </div>

        {infoBullets.length > 0 && (
          <div className="frost flex items-center gap-6 overflow-x-auto rounded-sm px-3 py-3 sm:justify-between sm:overflow-visible">
            {infoBullets.map((bullet) => (
              <span
                key={bullet}
                className="shrink-0 text-sm font-normal tracking-[-0.12px] text-ink whitespace-nowrap"
              >
                • {bullet}
              </span>
            ))}
          </div>
        )}
      </div>

      {categories.length > 0 && (
        <>
          <div className="hidden gap-3 sm:flex">
            {categories.map((category, index) => (
              <CategoryTile key={category.label} {...category} index={index} />
            ))}
          </div>

          <Slider className="carousel carousel-center gap-3 w-full sm:hidden">
            {categories.map((category, index) => (
              <Slider.Item key={category.label} index={index} className="carousel-item">
                <CategoryTile {...category} index={index} disableReveal />
              </Slider.Item>
            ))}
          </Slider>
        </>
      )}
    </div>
  );
}
