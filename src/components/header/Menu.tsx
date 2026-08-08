import Icon from "../../components/ui/Icon";
import Searchbar, { type SearchbarProps } from "../search/Searchbar/Form";
import type { SiteNavigationElement } from "@decocms/apps-commerce/types";

export interface Props {
  navItems?: SiteNavigationElement[];
  /** @description Rendered at the top of the menu, tucked behind the hamburger trigger */
  searchbar?: SearchbarProps;
}

function MenuItem({ item }: { item: SiteNavigationElement }) {
  return (
    <div className="collapse collapse-arrow">
      <input type="checkbox" />
      <div className="collapse-title min-h-0 px-0 py-4 text-lg font-medium text-ink capitalize">
        {item.name}
      </div>
      <div className="collapse-content px-0">
        <ul className="flex flex-col gap-3 pb-3">
          <li>
            <a className="text-sm text-ink-soft underline" href={item.url}>
              Ver todos
            </a>
          </li>
          {item.children?.map((node) => (
            <li key={node.url ?? node.name}>
              <MenuItem item={node} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Menu({ navItems = [], searchbar }: Props) {
  return (
    <div className="flex h-full flex-col overflow-y-auto" style={{ minWidth: "100vw" }}>
      {searchbar && (
        <div className="border-b border-ink-soft/10">
          <Searchbar {...searchbar} />
        </div>
      )}
      <nav aria-label="Menu principal" className="contents">
        <ul className="flex grow flex-col divide-y divide-ink-soft/10 px-5">
          {navItems.map((item) => (
            <li key={item.url ?? item.name}>
              <MenuItem item={item} />
            </li>
          ))}
        </ul>

        <ul className="flex flex-col gap-1 border-t border-ink-soft/10 py-4">
          {[
            {
              href: "/collections/rocket-launches",
              icon: "sell" as const,
              label: "Rocket Drops",
            },
            { href: "/rocket", icon: "check-circle" as const, label: "Rocket — área do lojista" },
            { href: "/wishlist", icon: "favorite" as const, label: "Lista de desejos" },
            { href: "https://www.deco.cx", icon: "home_pin" as const, label: "Nossas lojas" },
            { href: "https://www.deco.cx", icon: "call" as const, label: "Fale conosco" },
            { href: "/account", icon: "account_circle" as const, label: "Minha conta" },
          ].map(({ href, icon, label }) => (
            <li key={label}>
              <a
                className="tap-scale flex items-center gap-3 px-5 py-2.5 text-sm text-ink transition-colors duration-(--duration-fast) hover:bg-white/60"
                href={href}
              >
                <Icon id={icon} size={18} />
                <span>{label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export default Menu;
