import type { ThemeConfig } from "antd";
import type { Branding } from "../types";
import {
  CSS_VAR,
  PLATFORM_BRAND_TOKENS,
  NEUTRAL,
  PLATFORM_BRAND,
  SEMANTIC,
  STATUS,
  type BrandTokens,
  type SemanticKey,
} from "./tokens";

export * from "./tokens";
export * from "./semantic";
export * from "./BrandContext";

/** Ngưỡng WCAG AA cho chữ thường. */
export const WCAG_AA_RATIO = 4.5;

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rl, gl, bl] = [r, g, b].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

/** Tỷ lệ tương phản WCAG 2.0 giữa hai màu hex. */
export function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexToRgb(hexA));
  const lB = relativeLuminance(hexToRgb(hexB));
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

/** true nếu hai màu đạt tối thiểu 4.5:1 (WCAG AA, chữ thường). */
export function meetsWcagAA(hexA: string, hexB: string): boolean {
  return contrastRatio(hexA, hexB) >= WCAG_AA_RATIO;
}

/**
 * BR-43: kiểm tra tương phản khi lưu. Nếu chữ trắng trên nền `bgHex` không
 * đạt tối thiểu 4.5:1 (ngưỡng WCAG AA cho chữ thường), tự chuyển sang chữ
 * đen. Không từ chối màu Owner chọn — chỉ tự sửa màu chữ.
 */
export function pickReadableTextColor(bgHex: string): "#ffffff" | "#000000" {
  return contrastRatio(bgHex, "#ffffff") >= 4.5 ? "#ffffff" : "#000000";
}

/** true nếu nên dùng chữ TRẮNG trên nền `bgHex` (đủ tương phản). */
export function isDarkEnoughForWhiteText(bgHex: string): boolean {
  return pickReadableTextColor(bgHex) === "#ffffff";
}

/** Nhận diện mặc định cho một doanh nghiệp chưa tự cấu hình (dùng làm dữ liệu mock). */
export function createDefaultBranding(tenantId: string, displayName: string): Branding {
  return {
    tenantId,
    displayName,
    logoUrl: undefined,
    primaryColor: PLATFORM_BRAND.primary,
    accentColor: PLATFORM_BRAND.accent,
    isCustom: false,
  };
}

export interface ResolveBrandInput {
  /** Nhận diện doanh nghiệp đã nạp (null nếu chưa có). */
  branding: Branding | null;
  /**
   * true cho Admin, trang đăng nhập, landing — luôn nhận diện nền tảng
   * (BR-44, CC-04), bất kể có branding nào đang nằm trong store.
   */
  platformOnly: boolean;
  /** Gói của doanh nghiệp có tính năng nhận diện không (Tiêu chuẩn trở lên — BR-41). */
  brandingEnabled: boolean;
}

/**
 * Chọn bộ token thương hiệu hiệu lực. Mọi nhánh "không áp nhận diện riêng" đều trả về
 * nhận diện nền tảng; màu chữ trên nền thương hiệu luôn được tính lại cho đạt WCAG (BR-43).
 */
export function resolveBrand({ branding, platformOnly, brandingEnabled }: ResolveBrandInput): BrandTokens {
  if (platformOnly || !brandingEnabled || !branding || !branding.isCustom) return PLATFORM_BRAND_TOKENS;
  // Chỉ đổi tên hiển thị (quyết định 28): áp tên, màu/logo vẫn là của nền tảng.
  if (branding.lookCustom === false) return { ...PLATFORM_BRAND_TOKENS, displayName: branding.displayName.trim() || PLATFORM_BRAND.displayName };
  return {
    primary: branding.primaryColor,
    primaryContrast: pickReadableTextColor(branding.primaryColor),
    accent: branding.accentColor,
    displayName: branding.displayName || PLATFORM_BRAND.displayName,
    logo: branding.logoUrl,
    custom: true,
  };
}

/**
 * Theme AntD cho một bộ token thương hiệu. Chỉ màu thương hiệu thay đổi: nền trang, border,
 * radius, font, bố cục giữ nguyên (đặc tả 10.2 — "đổi được nhận diện, không đổi bố cục").
 */
export function buildTheme(brand: BrandTokens): ThemeConfig {
  const lightText = brand.primaryContrast === "#ffffff";
  const overlay = lightText ? "255,255,255" : "0,0,0";

  return {
    cssVar: { key: "fnb" },
    token: {
      colorPrimary: brand.primary,
      colorInfo: brand.primary,
      colorLink: brand.primary,
      colorTextBase: NEUTRAL.ink,
      colorBgBase: NEUTRAL.surface,
      colorTextLightSolid: brand.primaryContrast,
      borderRadius: 8,
      fontFamily: "'HarmonyOS Sans', system-ui, -apple-system, 'Segoe UI', sans-serif",
      fontSize: 14,
      colorBorder: NEUTRAL.line,
      colorBorderSecondary: NEUTRAL.lineSubtle,
      controlHeight: 38,
      wireframe: false,
    },
    components: {
      Layout: {
        headerBg: NEUTRAL.surface,
        bodyBg: NEUTRAL.paper,
        siderBg: brand.primary,
      },
      Menu: {
        darkItemBg: brand.primary,
        darkItemSelectedBg: `rgba(${overlay},0.18)`,
        darkItemHoverBg: `rgba(${overlay},0.09)`,
        darkItemColor: lightText ? "rgba(255,255,255,0.68)" : "rgba(0,0,0,0.6)",
        darkItemSelectedColor: brand.primaryContrast,
        itemHeight: 44,
        iconSize: 18,
      },
      Card: {
        borderRadiusLG: 14,
        colorBorderSecondary: NEUTRAL.line,
      },
      Button: {
        primaryShadow: "none",
        defaultShadow: "none",
        fontWeight: 500,
      },
      Table: {
        headerBg: NEUTRAL.paperSubtle,
        headerColor: NEUTRAL.textMuted,
        rowHoverBg: NEUTRAL.paperSubtle,
        borderColor: NEUTRAL.line,
      },
      Statistic: {
        titleFontSize: 13,
      },
      Segmented: {
        itemSelectedBg: brand.primary,
        itemSelectedColor: brand.primaryContrast,
        trackBg: NEUTRAL.paper,
      },
      Tag: {
        defaultBg: NEUTRAL.paperSubtle,
        defaultColor: NEUTRAL.ink,
      },
    },
  };
}

/**
 * Ghi toàn bộ token ra CSS variables trên `el` (mặc định `<html>`). Phần thương hiệu thay
 * đổi theo `brand`; phần trung tính và ngữ nghĩa là hằng số, ghi lại mỗi lần cho đồng nhất.
 */
export function applyThemeVars(brand: BrandTokens, el: HTMLElement = document.documentElement): void {
  const set = (name: string, value: string) => el.style.setProperty(name, value);
  set(CSS_VAR.brandPrimary, brand.primary);
  set(CSS_VAR.brandPrimaryContrast, brand.primaryContrast);
  set(CSS_VAR.brandAccent, brand.accent);
  set(CSS_VAR.ink, NEUTRAL.ink);
  set(CSS_VAR.surface, NEUTRAL.surface);
  set(CSS_VAR.paper, NEUTRAL.paper);
  set(CSS_VAR.paperSubtle, NEUTRAL.paperSubtle);
  set(CSS_VAR.line, NEUTRAL.line);
  set(CSS_VAR.lineSubtle, NEUTRAL.lineSubtle);
  set(CSS_VAR.textStrong, NEUTRAL.textStrong);
  set(CSS_VAR.textMuted, NEUTRAL.textMuted);
  set(CSS_VAR.textSubtle, NEUTRAL.textSubtle);
  set(CSS_VAR.codeBg, NEUTRAL.codeBg);
  set(CSS_VAR.codeText, NEUTRAL.codeText);
  set(CSS_VAR.statusWaiting, STATUS.waiting);
  set(CSS_VAR.statusDone, STATUS.done);
  set(CSS_VAR.statusLate, STATUS.late);
  for (const key of Object.keys(SEMANTIC) as SemanticKey[]) {
    set(`--sem-${key}-bg`, SEMANTIC[key].bg);
    set(`--sem-${key}-text`, SEMANTIC[key].text);
    set(`--sem-${key}-border`, SEMANTIC[key].border);
  }
}
