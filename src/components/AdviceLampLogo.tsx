const DEFAULT_TINT = "#1a5156";

/** Lightbulb mark from `/public/advice-lamp-logo.png`, tinted via CSS mask (`tint` = mask fill color). */
export function AdviceLampLogo({
  size = 22,
  className = "",
  tint = DEFAULT_TINT,
}: {
  size?: number;
  className?: string;
  /** CSS color for the icon shape (e.g. `#1a5156` or `#ffffff`). */
  tint?: string;
}) {
  const px = `${size}px`;
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 ${className}`}
      style={{
        width: px,
        height: px,
        backgroundColor: tint,
        WebkitMaskImage: "url(/advice-lamp-logo.png)",
        maskImage: "url(/advice-lamp-logo.png)",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}
