import type { ProductListingPage } from "@decocms/apps-commerce/types";
import Filters from "./Filters";
import Icon from "../ui/Icon";

export interface Props {
  id: string;
  filters: ProductListingPage["filters"];
  baseUrl: string;
}

export default function SearchFilterDrawer({ id, filters, baseUrl }: Props) {
  return (
    <>
      <input type="checkbox" id={id} className="peer/filter-drawer sr-only" aria-hidden="true" />
      <label
        htmlFor={id}
        aria-label="Close filters"
        className="fixed inset-0 z-40 bg-black/30 opacity-0 pointer-events-none transition-opacity duration-(--duration-slow) peer-checked/filter-drawer:opacity-100 peer-checked/filter-drawer:pointer-events-auto sm:hidden"
      />
      <aside
        className="glass-strong fixed top-0 left-0 bottom-0 z-50 w-full max-w-md -translate-x-full transition-transform duration-(--duration-slow) ease-(--ease-out-soft) peer-checked/filter-drawer:translate-x-0 sm:hidden"
        aria-label="Filters"
      >
        <div className="flex h-full flex-col divide-y divide-gray-200 overflow-y-hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-lg font-medium text-ink">Filters</h2>
            <label
              htmlFor={id}
              aria-label="Close"
              className="tap-scale frost flex size-9 items-center justify-center rounded-sm"
            >
              <Icon id="close" size={16} />
            </label>
          </div>
          <div className="grow overflow-auto">
            <Filters filters={filters} baseUrl={baseUrl} />
          </div>
        </div>
      </aside>
    </>
  );
}
