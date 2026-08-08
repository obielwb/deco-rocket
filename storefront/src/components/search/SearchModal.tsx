/**
 * Header search — a visible trigger (pill on desktop, icon on mobile) that
 * opens a modal with an input and live product suggestions.
 *
 * Suggestions come from `site/loaders/searchSuggestions`, invoked client-side
 * on a debounced keystroke. Submitting navigates to /s?q=<term>, same contract
 * as the searchbar inside the side menu.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Product } from "@decocms/apps-commerce/types";
import { formatPrice } from "@decocms/apps-commerce/sdk/formatPrice";
import { useOffer } from "@decocms/apps-commerce/sdk/useOffer";
import { clx } from "~/sdk/clx";
import { relative } from "~/sdk/url";
import Icon from "../ui/Icon";
import Image from "../ui/Image";
import { invoke } from "../../runtime";

// Where the form navigates on submit, and the querystring param it uses.
export const ACTION = "/s";
export const NAME = "q";

const SUGGESTION_COUNT = 4;
const DEBOUNCE_MS = 300;
// Mirrors the selector in src/styles/app.css that locks background scroll.
const SCROLL_LOCK_CLASS = "search-modal-open";

/**
 * Copy shown inside the modal. Grouped so the whole set is editable from the
 * CMS alongside the searchbar placeholder.
 */
export interface SearchModalLabels {
  /**
   * @title Loading
   * @default Buscando…
   */
  loading?: string;
  /**
   * @title Suggestions title
   * @default Produtos sugeridos
   */
  suggestionsTitle?: string;
  /**
   * @title See all results
   * @default Ver todos os resultados
   */
  seeAll?: string;
  /**
   * @title Empty state
   * @description `{term}` is replaced with what the shopper typed
   * @default Nenhum produto encontrado para “{term}”.
   */
  empty?: string;
  /**
   * @title Search accessible name
   * @description Accessible name of the search trigger, input and dialog
   * @default Buscar
   */
  searchAriaLabel?: string;
  /**
   * @title Close accessible name
   * @description Accessible name of the close button and the backdrop
   * @default Fechar busca
   */
  closeAriaLabel?: string;
}

export const DEFAULT_LABELS: Required<SearchModalLabels> = {
  loading: "Buscando…",
  suggestionsTitle: "Produtos sugeridos",
  seeAll: "Ver todos os resultados",
  empty: "Nenhum produto encontrado para “{term}”.",
  searchAriaLabel: "Buscar",
  closeAriaLabel: "Fechar busca",
};

export interface Props {
  /**
   * @title Placeholder
   * @description Message shown in the trigger and in the search input
   * @default O que você está procurando?
   */
  placeholder?: string;
  /** @title Modal labels */
  labels?: SearchModalLabels;
  variant?: "desktop" | "mobile";
}

function SuggestionItem({ product, onNavigate }: { product: Product; onNavigate: () => void }) {
  const { listPrice, price } = useOffer(product.offers);
  const image = product.image?.[0];
  const title = product.isVariantOf?.name ?? product.name ?? "";
  const currencyCode = product.offers?.priceCurrency;

  return (
    <li>
      <a
        href={relative(product.url) ?? "#"}
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-sm px-2 py-2 transition-colors duration-(--duration-fast) hover:bg-ink/5"
      >
        {image?.url && (
          <Image
            src={image.url}
            alt={image.alternateName ?? title}
            width={48}
            height={48}
            loading="lazy"
            className="size-12 shrink-0 rounded-xs object-cover"
          />
        )}
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-sm text-ink">{title}</span>
          <span className="flex items-baseline gap-2 tabular-nums">
            {listPrice != null && price != null && listPrice > price && (
              <span className="text-2xs text-muted line-through">
                {formatPrice(listPrice, currencyCode)}
              </span>
            )}
            <span className="text-xs font-medium text-ink-soft">
              {formatPrice(price, currencyCode)}
            </span>
          </span>
        </span>
      </a>
    </li>
  );
}

export default function SearchModal({
  placeholder = "O que você está procurando?",
  labels,
  variant = "desktop",
}: Props) {
  const copy = { ...DEFAULT_LABELS, ...labels };
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Open with Cmd+K / Ctrl+K, close with Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // The input only exists once the modal is mounted, so focus after that; on
  // close, hand focus back to the trigger that opened it.
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      return () => triggerRef.current?.focus();
    }
  }, [open]);

  // The overlay is a plain div, so the `dialog[open]` / `.drawer-toggle:checked`
  // scroll-lock rule in app.css does not match it — mark the body instead (the
  // rule matches `body.search-modal-open` too).
  useEffect(() => {
    if (!open) return;
    document.body.classList.add(SCROLL_LOCK_CLASS);
    return () => document.body.classList.remove(SCROLL_LOCK_CLASS);
  }, [open]);

  // Keep Tab inside the dialog while it is open, so focus does not walk into
  // the header behind the overlay.
  useEffect(() => {
    if (!open) return;
    const onTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (!active || !root.contains(active)) {
        e.preventDefault();
        first.focus();
        return;
      }
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onTab);
    return () => document.removeEventListener("keydown", onTab);
  }, [open]);

  // Live suggestions — debounced, and stale responses are dropped.
  useEffect(() => {
    const query = term.trim();
    if (!open || !query) {
      setProducts([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const result = (await invoke.site.loaders.searchSuggestions({
          query,
          count: SUGGESTION_COUNT,
        })) as { products?: Product[] } | null;
        if (!cancelled) setProducts(result?.products ?? []);
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term, open]);

  const onSubmit = () => {
    const query = term.trim();
    if (!query) return;
    // `dispatch` exists at runtime (framework's DECO.events bootstrap) but the
    // ambient Window.DECO type only declares `subscribe`.
    const events = window.DECO?.events as unknown as
      { dispatch?: (event: unknown) => void } | undefined;
    events?.dispatch?.({ name: "search", params: { search_term: query } });
  };

  // The mobile trigger lives inside the frosted header bar, and a non-`none`
  // `backdrop-filter` makes that bar the containing block for `position: fixed`
  // descendants — the overlay would be clamped to a 56px-tall inset bar instead
  // of the viewport. Portal it to <body> so it always resolves against the
  // viewport on both variants.
  const overlay = open && (
    <div className="fixed inset-0 z-50 flex items-start justify-center">
      <button
        type="button"
        aria-label={copy.closeAriaLabel}
        onClick={() => setOpen(false)}
        className="absolute inset-0 cursor-default bg-ink/25 backdrop-blur-sm"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={copy.searchAriaLabel}
        className="relative mx-3 mt-24 flex w-full max-w-2xl flex-col gap-4 rounded-sm bg-white p-4 shadow-xl"
      >
        <form action={ACTION} method="get" onSubmit={onSubmit} className="flex items-center gap-3">
          <Icon id="search" size={20} className="shrink-0 text-ink" />
          <input
            ref={inputRef}
            name={NAME}
            value={term}
            onChange={(e) => setTerm(e.currentTarget.value)}
            placeholder={placeholder}
            autoComplete="off"
            aria-label={copy.searchAriaLabel}
            className="grow border-0 border-b border-ink/15 bg-transparent pb-2 text-base text-ink outline-none placeholder:text-muted focus:border-ink/40"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={copy.closeAriaLabel}
            className="tap-scale flex size-9 shrink-0 items-center justify-center rounded-sm text-ink transition-colors duration-(--duration-fast) hover:bg-ink/5"
          >
            <Icon id="close" size={18} />
          </button>
        </form>

        <div aria-live="polite" className={clx("flex flex-col gap-2", !term.trim() && "hidden")}>
          {loading && products.length === 0 && (
            <span className="px-2 py-3 text-sm text-muted">{copy.loading}</span>
          )}

          {products.length > 0 && (
            <>
              <span className="px-2 text-xs font-medium text-muted-soft">
                {copy.suggestionsTitle}
              </span>
              <ul className="flex flex-col">
                {products.map((product) => (
                  <SuggestionItem
                    key={product.url ?? product.productID}
                    product={product}
                    onNavigate={() => setOpen(false)}
                  />
                ))}
              </ul>
              <a
                href={`${ACTION}?${NAME}=${encodeURIComponent(term.trim())}`}
                onClick={onSubmit}
                className="flex items-center gap-1 px-2 py-2 text-sm text-ink underline"
              >
                {copy.seeAll}
                <Icon id="chevron-right" size={12} />
              </a>
            </>
          )}

          {!loading && products.length === 0 && (
            <span className="px-2 py-3 text-sm text-muted">
              {copy.empty.replace("{term}", term.trim())}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {variant === "desktop" ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          className="frost tap-scale flex h-10 min-w-56 shrink-0 items-center gap-2 rounded-sm px-3 text-sm text-muted-soft transition-colors duration-(--duration-fast) hover:bg-glass-strong"
        >
          <Icon id="search" size={18} className="shrink-0 text-ink" />
          <span className="truncate">{placeholder}</span>
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label={copy.searchAriaLabel}
          className="tap-scale flex size-10 items-center justify-center rounded-sm text-ink transition-colors duration-(--duration-fast) hover:bg-white/60"
        >
          <Icon id="search" size={18} />
        </button>
      )}

      {overlay && createPortal(overlay, document.body)}
    </>
  );
}
