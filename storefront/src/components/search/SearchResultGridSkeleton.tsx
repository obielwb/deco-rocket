import { clx } from "~/sdk/clx";

export default function SearchResultGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      className={clx(
        "grid w-full",
        "grid-cols-2 gap-3",
        "sm:grid-cols-3",
      )}
      aria-busy="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton aspect-[372/498] w-full rounded-sm" />
      ))}
    </div>
  );
}
