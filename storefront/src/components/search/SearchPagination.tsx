import { Link } from "@tanstack/react-router";
import { clx } from "~/sdk/clx";
import { rebaseToSearch } from "~/sdk/url";
import Icon from "../ui/Icon";
import Button from "../ui/Button";

type NavTarget = { to: string; search: Record<string, string> };

export interface Props {
  currentPage: number;
  prev?: NavTarget;
  next?: NavTarget;
  variant: "show-more" | "pagination";
}

export function rebasePaginationHrefs(
  prevHref: string | undefined,
  nextHref: string | undefined,
  base: string,
) {
  return {
    prev: rebaseToSearch(prevHref, base),
    next: rebaseToSearch(nextHref, base),
  };
}

export default function SearchPagination({ currentPage, prev, next, variant }: Props) {
  if (variant === "show-more") {
    return (
      <div className="flex flex-col items-center gap-3">
        {prev ? (
          <Button href={prev.to} variant="outline" size="md">
            Show less
          </Button>
        ) : null}
        {next ? (
          <Button href={next.to} variant="glass" size="md">
            Show more
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Link
        to={prev?.to ?? "#"}
        search={prev?.search}
        preload="intent"
        rel="prev"
        aria-label="previous page"
        aria-disabled={!prev}
        className={clx(
          "tap-scale frost flex size-9 items-center justify-center rounded-sm",
          !prev && "pointer-events-none opacity-30",
        )}
      >
        <Icon id="chevron-right" className="rotate-180" size={16} />
      </Link>
      <span className="flex h-9 items-center rounded-sm px-3 text-xs text-muted">
        Page {currentPage}
      </span>
      <Link
        to={next?.to ?? "#"}
        search={next?.search}
        preload="intent"
        rel="next"
        aria-label="next page"
        aria-disabled={!next}
        className={clx(
          "tap-scale frost flex size-9 items-center justify-center rounded-sm",
          !next && "pointer-events-none opacity-30",
        )}
      >
        <Icon id="chevron-right" size={16} />
      </Link>
    </div>
  );
}
