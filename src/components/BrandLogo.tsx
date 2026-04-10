import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ className, priority }: BrandLogoProps) {
  return (
    <Image
      src="/laoshi-xu-logo.png"
      alt="Laoshi Xu"
      width={250}
      height={250}
      className={className}
      priority={priority}
    />
  );
}
