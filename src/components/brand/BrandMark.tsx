import { useState, type ComponentPropsWithoutRef } from "react";
import { PLATFORM_LOGO } from "./PlatformLogo";

type Props = Omit<ComponentPropsWithoutRef<"img">, "src" | "onError"> & {
  logo?: string | null;
  tone?: "dark" | "light";
};

export default function BrandMark({ logo, tone = "dark", alt = "", ...props }: Props) {
  const [failed, setFailed] = useState<string>();
  const custom = logo && logo !== failed ? logo : undefined;
  return <img {...props} alt={alt} src={custom ?? PLATFORM_LOGO.mark[tone]}
    onError={custom ? () => setFailed(custom) : undefined} />;
}
