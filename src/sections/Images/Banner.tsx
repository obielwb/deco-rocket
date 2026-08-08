import { type HTMLWidget, type ImageWidget } from "~/types/widgets";
import { Picture, Source } from "~/components/ui/Picture";
import Section from "../../components/ui/Section";
import DeviceVisible, { type VisibilityConfig } from "../../components/ui/DeviceVisible";
import Button from "../../components/ui/Button";
import { clx } from "~/sdk/clx";

export interface Props extends VisibilityConfig {
  title: string;
  description?: HTMLWidget;
  /** @title From-price prefix (e.g. "A partir de") */
  priceLabel?: string;
  /** @title Price (e.g. "R$ 79,99") */
  price?: string;

  images: {
    mobile: ImageWidget;
    desktop: ImageWidget;
  };

  cta?: {
    href: string;
    label: string;
  };
}

function Banner({ title, description, priceLabel, price, images, cta, visibility }: Props) {
  return (
    <DeviceVisible visibility={visibility}>
      <Section.Container className="py-3 sm:py-4">
        <div className="relative overflow-hidden rounded-md">
          <Picture preload>
            <Source media="(max-width: 640px)" src={images.mobile} width={686} height={480} />
            <Source media="(min-width: 640px)" src={images.desktop} width={1488} height={461} />
            <img
              src={images.desktop}
              alt={title}
              className="aspect-[686/480] w-full object-cover sm:aspect-[1488/461]"
            />
          </Picture>

          {/* Scrim protects text legibility regardless of the underlying photo */}
          <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-black/45 via-black/10 to-transparent sm:w-2/3" />

          <div
            className={clx(
              "absolute inset-0 flex flex-col justify-between p-6 sm:p-8",
              "max-w-full sm:max-w-[318px]",
            )}
          >
            {title && <h2 className="text-display font-medium text-white">{title}</h2>}

            <div className="flex flex-col items-start gap-3">
              {description && (
                <span
                  className="text-xs text-white/90"
                  dangerouslySetInnerHTML={{ __html: description }}
                />
              )}

              {price && (
                <div className="flex flex-col gap-1.5 text-white">
                  <div className="flex items-end gap-1">
                    <span className="text-lg tracking-tight">R$</span>
                    <span className="text-display font-medium tracking-tight">{price}</span>
                  </div>
                  {priceLabel && <span className="text-2xs tracking-tight">{priceLabel}</span>}
                </div>
              )}

              {cta && (
                <Button href={cta.href} variant="glass" size="md">
                  {cta.label}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Section.Container>
    </DeviceVisible>
  );
}

export const LoadingFallback = () => <Section.Placeholder height="461px" />;

export default Banner;
