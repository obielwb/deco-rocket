import { clx } from "~/sdk/clx";

/**
 * This component renders the filter and selectors for skus.
 * TODO: Figure out a better name for this component.
 */
interface Props {
  variant?: "active" | "disabled" | "default";
  content: string;
}

const colors: Record<string, Record<string, string>> = {
  "azul-clara": { backgroundColor: "#87CEFA" },
  "azul-marinho": { backgroundColor: "#000080" },
  branca: { backgroundColor: "#FFFFFF" },
  cinza: { backgroundColor: "#808080" },
  "cinza-escura": { backgroundColor: "#A9A9A9" },
  laranja: { backgroundColor: "#FFA500" },
  marrom: { backgroundColor: "#A52A2A" },
  preta: { backgroundColor: "#161616" },
  "verde-clara": { backgroundColor: "#90EE90" },
  vermelha: { backgroundColor: "#FF0000" },
};

const variants = {
  active: "ring-2 ring-ink",
  disabled: "line-through ring-1 ring-gray-200",
  default: "ring-1 ring-gray-200",
};

function Avatar({ content, variant = "default" }: Props) {
  return (
    <div
      className={clx(
        "tap-scale flex size-7 items-center justify-center",
        "rounded-full ring-offset-2 transition-shadow duration-(--duration-fast)",
        "bg-gray-50 text-2xs text-ink-soft",
        variants[variant],
      )}
      style={colors[content]}
    >
      <span className="uppercase">{colors[content] ? "" : content.substring(0, 2)}</span>
    </div>
  );
}

export default Avatar;
