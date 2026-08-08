import type { HTMLWidget, ImageWidget } from "~/types/widgets";
import type { SiteNavigationElement } from "@decocms/apps-commerce/types";
import Alert from "../../components/header/Alert";
import Bag from "../../components/header/Bag";
import HeaderNav from "../../components/header/HeaderNav";
import Menu from "../../components/header/Menu";
import SignIn from "../../components/header/SignIn";
import { type SearchbarProps } from "../../components/search/Searchbar/Form";
import SearchModal from "../../components/search/SearchModal";
import Drawer from "../../components/ui/Drawer";
import Icon from "../../components/ui/Icon";
import { SIDEMENU_CONTAINER_ID, SIDEMENU_DRAWER_ID } from "../../constants";
import { useDevice } from "@decocms/blocks/sdk/useDevice";
import { type LoadingFallbackProps } from "~/types/deco";

export interface Logo {
  src: ImageWidget;
  alt: string;
  width?: number;
  height?: number;
}

export interface SectionProps {
  alerts?: HTMLWidget[];
  /**
   * @title Navigation items
   * @description Navigation items used both on mobile and desktop menus
   */
  navItems?: SiteNavigationElement[] | null;
  /**
   * @title Searchbar
   * @description Searchbar configuration
   */
  searchbar: SearchbarProps;
  /** @title Logo */
  logo: Logo;
  /**
   * @title Shipping note
   * @description Small promo line shown at the bottom of the mega menu
   * @default "Frete grátis em compras acima de R$500."
   */
  shippingNote?: string;
  /**
   * @description Usefull for lazy loading hidden elements, like hamburguer menus etc
   * @hide true */
  loading?: "eager" | "lazy";
}

type Props = SectionProps;

const MOBILE_ICON_LABEL_CLASS =
  "tap-scale flex size-10 items-center justify-center rounded-sm text-ink transition-colors duration-(--duration-fast) hover:bg-white/60";

const Desktop = ({ navItems, logo, shippingNote, searchbar }: Props) => (
  <>
    <div className="flex items-center justify-between gap-3 px-3 pt-3 pb-2">
      <div className="flex shrink-0 items-center gap-1.5">
        <label
          htmlFor={SIDEMENU_DRAWER_ID}
          aria-label="Open menu"
          className="frost tap-scale flex size-10 shrink-0 items-center justify-center rounded-sm text-ink transition-colors duration-(--duration-fast) hover:bg-glass-strong"
        >
          <Icon id="menu" size={18} />
        </label>

        <SearchModal
          variant="desktop"
          placeholder={searchbar?.placeholder}
          labels={searchbar?.labels}
        />
      </div>

      <HeaderNav
        navItems={navItems ?? []}
        logo={logo}
        shippingNote={shippingNote ?? "Frete grátis em compras acima de R$500."}
      />

      <div className="flex items-center gap-1.5">
        <SignIn variant="desktop" />
        <Bag />
      </div>
    </div>
  </>
);

const Mobile = ({ logo, searchbar }: Props) => (
  <>
    <div className="frost mx-3 mt-3 flex h-14 items-center justify-between gap-2 rounded-sm px-2">
      <label
        htmlFor={SIDEMENU_DRAWER_ID}
        aria-label="Open menu"
        className={MOBILE_ICON_LABEL_CLASS}
      >
        <Icon id="menu" size={18} />
      </label>

      {logo && (
        <a href="/" aria-label="Store logo" className="flex items-center">
          <img
            src={logo.src}
            alt={logo.alt}
            width={logo.width ? Math.min(logo.width, 88) : 88}
            height={logo.height ?? 20}
            className="h-5 w-auto object-contain"
          />
        </a>
      )}

      <div className="flex items-center gap-1">
        <SearchModal
          variant="mobile"
          placeholder={searchbar?.placeholder}
          labels={searchbar?.labels}
        />
        <SignIn variant="mobile" />
        <Bag size="sm" />
      </div>
    </div>
  </>
);

function Header({
  alerts = [],
  logo = {
    src: "https://decoims.com/decocms/e8c6326e-e009-4e3c-9787-b2fe25a1b993/deco-logo.png",
    width: 67,
    height: 28,
    alt: "Logo",
  },
  navItems,
  searchbar,
  loading,
  ...props
}: Props) {
  const device = useDevice();
  return (
    <header role="banner" className="fixed top-0 inset-x-0 z-50">
      {alerts.length > 0 && (
        <div className="glass-strong flex h-8 items-center justify-center text-2xs">
          <Alert alerts={alerts} />
        </div>
      )}

      <Drawer
        id={SIDEMENU_DRAWER_ID}
        aside={
          <Drawer.Aside title="Menu" drawer={SIDEMENU_DRAWER_ID}>
            {loading === "lazy" ? (
              <div
                id={SIDEMENU_CONTAINER_ID}
                className="flex h-full items-center justify-center"
                style={{ minWidth: "100vw" }}
              >
                <span className="loading loading-spinner" />
              </div>
            ) : (
              <Menu navItems={navItems ?? []} searchbar={searchbar} />
            )}
          </Drawer.Aside>
        }
      />

      {device === "desktop" ? (
        <Desktop
          logo={logo}
          navItems={navItems}
          searchbar={searchbar}
          loading={loading}
          {...props}
        />
      ) : (
        <Mobile
          logo={logo}
          navItems={navItems}
          searchbar={searchbar}
          loading={loading}
          {...props}
        />
      )}
    </header>
  );
}

export const LoadingFallback = (props: LoadingFallbackProps<Props>) => (
  <Header {...(props as any)} loading="lazy" />
);

export default Header;

export const eager = true;
export const sync = true;
export const layout = true;
