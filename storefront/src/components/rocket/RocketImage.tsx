import { useEffect, useState, type ImgHTMLAttributes } from "react";

interface RocketImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src?: string | null;
}

export default function RocketImage({ src, alt = "", className, ...props }: RocketImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt || "Criativo indisponível"}
        className={`${className ?? ""} grid place-items-center bg-[linear-gradient(135deg,#d9ff45,#f4f4f1_55%,#ded8ff)] p-5 text-center`}
      >
        <span className="max-w-44 text-xs font-semibold leading-relaxed text-black/60">
          {alt || "Criativo indisponível"}
        </span>
      </div>
    );
  }

  return (
    <img {...props} src={src} alt={alt} className={className} onError={() => setFailed(true)} />
  );
}
