import type { CSSProperties } from "react";
import markBlack from "../../assets/brand/logo-mark.png";
import markWhite from "../../assets/brand/logo-mark-white.png";
import wordmarkBlack from "../../assets/brand/logo-horizontal-black.png";
import wordmarkWhite from "../../assets/brand/logo-horizontal-white.png";

/** Ảnh logo nền tảng; dùng trực tiếp khi cần `src` (vd. logo dự phòng khi chuỗi chưa tải logo). */
export const PLATFORM_LOGO = {
  mark: { dark: markBlack, light: markWhite },
  wordmark: { dark: wordmarkBlack, light: wordmarkWhite },
} as const;

/**
 * Logo Smart F&B (bộ nhận diện mới, giống app thu ngân/pha chế).
 * - `mark`: biểu tượng tròn nĩa–thìa, dùng ở ô vuông nhỏ.
 * - `wordmark`: biểu tượng + chữ "Smart F&B Platform".
 * `tone="dark"` = logo đen cho nền sáng; `tone="light"` = logo trắng cho nền tối.
 */
export default function PlatformLogo({
  variant = "wordmark",
  tone = "dark",
  height,
  style,
  className,
}: {
  variant?: "mark" | "wordmark";
  tone?: "dark" | "light";
  height: number | string;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <img
      src={PLATFORM_LOGO[variant][tone]}
      alt="Smart F&B Platform"
      className={className}
      style={{ height, width: "auto", objectFit: "contain", display: "block", ...style }}
    />
  );
}
