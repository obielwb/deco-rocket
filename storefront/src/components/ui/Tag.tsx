import { clx } from "~/sdk/clx";

export interface Props {
  children: React.ReactNode;
  className?: string;
  tone?: "dark" | "light";
}

/**
 * Small glass badge — product tags ("Lançamento"), out-of-stock labels,
 * and similar single-word callouts overlaid on imagery.
 */
export default function Tag({ children, className, tone = "dark" }: Props) {
  return (
    <span
      className={clx(
        "inline-flex items-center rounded-xs px-2 py-1.5 text-2xs font-normal capitalize backdrop-blur-[16px]",
        tone === "dark" ? "bg-glass-tag text-white" : "frost text-ink",
        className,
      )}
    >
      {children}
    </span>
  );
}
