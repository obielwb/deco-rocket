import { useId } from "react";
import type { ImageObject } from "@decocms/apps-commerce/types";
import Image from "~/components/ui/Image";
import Icon from "~/components/ui/Icon";
import Slider from "../../ui/Slider";
import ProductImageZoom from "../ProductImageZoom";

export interface GalleryConfig {
  /**
   * @title Image aspect ratio
   * @description CSS aspect-ratio value for each gallery image (e.g. "506 / 825")
   * @default "506 / 825"
   */
  aspectRatio?: string;
  /**
   * @title Enable zoom modal
   * @description Show a zoom button that opens a fullscreen viewer
   * @default true
   */
  enableZoom?: boolean;
  /**
   * @title Preload first image
   * @description Marks the LCP image with fetchpriority=high and loading=eager
   * @default true
   */
  preloadFirstImage?: boolean;
}

export interface Props {
  images: ImageObject[];
  config?: GalleryConfig;
}

const DEFAULT_WIDTH = 506;
const DEFAULT_HEIGHT = 825;

/**
 * Horizontal filmstrip — the Figma "Carroçel" pattern. Desktop shows several
 * large images side by side (scroll-snap handles any image count); mobile
 * shows one full-width image per swipe.
 */
export default function ProductGallery({ images, config }: Props) {
  const id = useId();
  const zoomId = `${id}-zoom`;

  const aspectRatio = config?.aspectRatio ?? `${DEFAULT_WIDTH} / ${DEFAULT_HEIGHT}`;
  const enableZoom = config?.enableZoom ?? true;
  const preloadFirstImage = config?.preloadFirstImage ?? true;

  if (!images.length) return null;

  return (
    <>
      <div id={id} className="relative h-full">
        <Slider className="carousel carousel-center h-full w-full gap-3">
          {images.map((img, index) => (
            <Slider.Item
              key={img.url ?? index}
              index={index}
              className="carousel-item h-full w-full shrink-0 sm:w-auto"
            >
              <Image
                className="h-full w-full rounded-md object-cover sm:w-auto"
                sizes="(max-width: 640px) 100vw, 506px"
                style={{ aspectRatio }}
                src={img.url!}
                alt={img.alternateName}
                width={DEFAULT_WIDTH}
                height={DEFAULT_HEIGHT}
                preload={preloadFirstImage && index === 0}
                loading={index === 0 ? "eager" : "lazy"}
              />
            </Slider.Item>
          ))}
        </Slider>

        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 sm:hidden">
          {images.map((img, index) => (
            <Slider.Dot
              key={img.url ?? index}
              index={index}
              className="size-1.5 rounded-full bg-white/50 transition-colors duration-(--duration-fast) disabled:bg-white"
            />
          ))}
        </div>

        {images.length > 1 && (
          <>
            <Slider.PrevButton className="tap-scale frost absolute top-1/2 left-3 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full disabled:opacity-0 sm:flex">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Slider.PrevButton>
            <Slider.NextButton className="tap-scale frost absolute top-1/2 right-3 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full disabled:opacity-0 sm:flex">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Slider.NextButton>
          </>
        )}

        {enableZoom && (
          <label
            htmlFor={zoomId}
            aria-label="Zoom image"
            className="tap-scale frost absolute top-3 right-3 hidden size-10 cursor-pointer items-center justify-center rounded-sm sm:flex"
          >
            <Icon id="pan_zoom" size={18} />
          </label>
        )}

        <Slider.JS rootId={id} />
      </div>
      {enableZoom ? (
        <ProductImageZoom
          id={zoomId}
          images={images}
          width={700}
          height={Math.trunc((700 * DEFAULT_HEIGHT) / DEFAULT_WIDTH)}
        />
      ) : null}
    </>
  );
}

/**
 * Filter images by matching the product variant name in image alt text.
 * Mirrors Shopify's convention for associating per-variant images.
 * See https://community.shopify.com/c/shopify-discussions/i-can-not-add-multiple-pictures-for-my-variants/m-p/2416533
 */
export function filterImagesForVariant(
  images: ImageObject[] | undefined,
  productName: string | undefined,
): ImageObject[] {
  if (!images?.length) return [];
  if (!productName) return images;
  const matches = images.filter((img) => productName.includes(img.alternateName || ""));
  return matches.length > 0 ? matches : images;
}
