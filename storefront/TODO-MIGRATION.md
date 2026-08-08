# Migration follow-ups

Still-open cleanup items carried over from the Fresh → TanStack Start migration
(superseding the old `MIGRATION_NEXT_STEPS.md`, which also listed items already
completed — `AddToCartButton.tsx` and the `STOREFRONT_STUB` in `__root.tsx` are
gone). Reference patterns are already established in the codebase:

| Pattern | Canonical file |
|---|---|
| Grouped `*Config` Props with JSDoc | `src/sections/Product/ProductDetails.tsx` |
| Narrow-prop leaf components | `src/components/product/pdp/ProductTitle.tsx`, `ProductPrice.tsx` |
| TanStack Query hook + `createServerFn` | `src/platform/cart/` |
| `<Link preload="intent">` | `src/components/product/pdp/ProductVariantSelector.tsx` |
| Peer-checked slide-over | `src/components/minicart/MinicartDrawer.tsx` |
| Scoped skeletons on changing parts only | `pdp/ProductTitle.tsx` (`isLoading?` + `skeleton`) |
| Section pattern guide | `src/components/product/pdp/README.md` |

## PLP → PDP should use `<Link preload="intent">`

Still plain anchors in a few spots, losing the intent-preload window:

- `src/components/product/ProductCard.tsx` (image, title, variant swatches, OOS fallback)
- `src/sections/Category/CategoryGrid.tsx`
- `src/sections/Links/LinkTree.tsx`
- `src/components/ui/Breadcrumb.tsx` — audit all segments
- `src/components/search/Sort.tsx`, `src/components/search/Filters.tsx`

## Group flat section Props into `*Config` sub-interfaces

- `src/sections/Miscellaneous/CookieConsent.tsx`
- `src/sections/Newsletter/Newsletter.tsx`
- `src/sections/Miscellaneous/CampaignTimer.tsx`
- `src/sections/Animation/Animation.tsx`
- `src/sections/Content/Faq.tsx`

## Scoped skeletons on route transitions

Only the parts that change during a transition should show a skeleton.
`useRouterState({ select: s => s.isLoading })` at the parent, `isLoading?`
passed to leaves.

- PLP pagination in `src/components/search/SearchResult.tsx` — replace
  `useSection()` partial re-fetch with TanStack Query `keepPreviousData`
- Search suggestions dropdown
- Shipping simulator form while quote is loading

## Migrate off `window.STOREFRONT.*`

Wishlist and User still use the Fresh-era global channel. Follow the
`src/platform/cart/` shape (`*.types.ts`, `*.actions.ts`, `*.hooks.ts`,
`*.shopify.ts`, `index.ts`):

- **Wishlist**: `src/components/wishlist/Provider.tsx`, `WishlistButton.tsx` →
  `useWishlist()` / `useToggleWishlist()`; delete `src/actions/wishlist/submit.ts`
  and `src/loaders/wishlist.ts` once replaced with a `platform/wishlist` server fn
- **User**: `src/components/user/Provider.tsx`, `src/components/header/SignIn.tsx`
  → `useUser()`; delete `src/loaders/user.ts` once replaced

## Decompose god-components

- `src/components/search/SearchResult.tsx` (~320 lines) → `SearchResultGrid`,
  `SearchPagination`, `SearchFilterDrawer`, composition-only top level
- `src/components/product/ProductCard.tsx` (~280 lines) → `ProductCard`,
  `ProductCardVariants`, `ProductCardActions`

## Replace HTMX-era form hydration

- `src/sections/Newsletter/Newsletter.tsx` → `createServerFn({ method: "POST" })`
- `src/components/shipping/Form.tsx` → `useMutation`
- `src/components/search/Searchbar/Form.tsx` — audit `useScript` usage, move to
  controlled input if it's just suggestion-debounce

## Drawer/Modal consolidation (optional)

`src/components/ui/Drawer.tsx` and `Modal.tsx` wrap DaisyUI; `MinicartDrawer.tsx`
shows the inline peer-checked pattern works without a wrapper. Worth inlining
and deleting the wrappers if their only callers stay small (`Header.tsx`,
`SearchResult.tsx`, `ProductImageZoom.tsx`).
