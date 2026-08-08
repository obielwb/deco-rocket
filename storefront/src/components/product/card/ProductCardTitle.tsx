export interface Props {
  title: string;
}

export default function ProductCardTitle({ title }: Props) {
  return (
    // h3: product cards sit inside shelves whose title is an h2, so h3 keeps the
    // document outline going h1 -> h2 -> h3 with no skipped level.
    <h3 className="line-clamp-1 text-sm font-medium text-ink-soft tracking-[-0.14px]">
      {title}
    </h3>
  );
}
