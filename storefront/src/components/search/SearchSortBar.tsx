import type { ProductListingPage } from "@decocms/apps-commerce/types";
import Sort from "./Sort";

export interface Props {
  recordPerPage: number;
  totalRecords: number;
  sortOptions: ProductListingPage["sortOptions"];
  url: string;
  filterDrawerId?: string;
}

export default function SearchSortBar({
  recordPerPage,
  totalRecords,
  sortOptions,
  url,
  filterDrawerId,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-muted">
        {recordPerPage} of {totalRecords} results
      </span>

      <div className="flex items-center gap-2">
        {sortOptions.length > 0 && <Sort sortOptions={sortOptions} url={url} />}

        {filterDrawerId && (
          <label
            htmlFor={filterDrawerId}
            className="tap-scale frost flex h-9 items-center gap-1.5 rounded-sm px-3 text-xs text-ink-soft sm:hidden"
          >
            Filters
          </label>
        )}
      </div>
    </div>
  );
}
