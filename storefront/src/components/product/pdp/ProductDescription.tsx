export interface Props {
  html?: string;
  label?: string;
}

export default function ProductDescription({ html, label = "Description" }: Props) {
  if (!html) return null;
  return (
    <div className="border-t border-gray-200 pt-5 text-sm text-muted">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-ink-soft">
          {label}
          <span className="transition-transform duration-(--duration-fast) group-open:rotate-45">
            +
          </span>
        </summary>
        <div className="mt-3 text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />
      </details>
    </div>
  );
}
