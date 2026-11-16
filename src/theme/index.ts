import type { ThemeConfig } from "antd";
import type { Branding } from "../types";
import { contrast, deriveAccent, hexToRgb, hoverSurface, deriveBrandSurface, rgbToHex } from "./brandColor";
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
export * from "./brandColor";
export * from "./semantic";
export * from "./BrandContext";

/** Ngưỡng WCAG AA cho chữ thường. */
export const WCAG_AA_RATIO = 4.5;

/** Tỷ lệ tương phản WCAG 2.0 giữa hai màu hex. */
export const contrastRatio = contrast;

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
    ...brandTokensFromColors(branding.primaryColor, branding.accentColor),
    displayName: branding.displayName || PLATFORM_BRAND.displayName,
    logo: branding.logoUrl,
    custom: true,
  };
}

/** Bộ token thương hiệu từ màu chủ đạo + màu nhấn (dùng cả cho khung xem trước ở màn Nhận diện). */
export function brandTokensFromColors(
  primary: string,
  accent: string,
): Pick<BrandTokens, "primary" | "primaryContrast" | "surface" | "surfaceHover" | "activeInk" | "rule" | "accent" | "accentInk" | "accentStrong" | "accentSoft" | "accentChart"> {
  const d = deriveBrandSurface(primary);
  const a = deriveAccent(accent);
  return {
    primary,
    primaryContrast: d.ink,
    surface: d.surface,
    surfaceHover: hoverSurface(d.surface),
    activeInk: d.activeInk,
    rule: d.rule,
    accent,
    accentInk: a.accentInk,
    accentStrong: a.accentStrong,
    accentSoft: a.accentSoft,
    accentChart: a.accentChart,
  };
}

/**
 * Theme AntD cho một bộ token thương hiệu. Chỉ màu thương hiệu thay đổi: nền trang, border,
 * radius, font, bố cục giữ nguyên (đặc tả 10.2 — "đổi được nhận diện, không đổi bố cục").
 */
export function buildTheme(brand: BrandTokens): ThemeConfig {
  // Màu ngữ nghĩa (thông tin/thành công/cảnh báo/lỗi) cố định, KHÔNG theo màu chuỗi (BR-42):
  // khối thông báo luôn nền nhạt, chữ đậm, đạt 4.5:1 dù chuỗi chọn màu nào.
  return {
    cssVar: { key: "fnb" },
    token: {
      colorPrimary: brand.surface,
      colorPrimaryHover: brand.surfaceHover,
      colorPrimaryActive: brand.surfaceHover,
      // Điểm nhấn phụ theo màu nhấn: viền focus, link (bản đủ đậm trên nền trắng).
      controlOutline: `${rgbToHex(hexToRgb(brand.accent))}59`,
      colorLink: brand.accentStrong,
      colorLinkHover: brand.accentStrong,
      colorInfo: SEMANTIC.info.text,
      colorInfoBg: SEMANTIC.info.bg,
      colorInfoBorder: SEMANTIC.info.border,
      colorSuccess: SEMANTIC.success.text,
      colorSuccessBg: SEMANTIC.success.bg,
      colorSuccessBorder: SEMANTIC.success.border,
      colorWarning: SEMANTIC.warning.text,
      colorWarningBg: SEMANTIC.warning.bg,
      colorWarningBorder: SEMANTIC.warning.border,
      colorError: SEMANTIC.error.text,
      colorErrorBg: SEMANTIC.error.bg,
      colorErrorBorder: SEMANTIC.error.border,
      colorTextSecondary: NEUTRAL.textMuted,
      colorTextTertiary: NEUTRAL.textMuted,
      colorTextDescription: NEUTRAL.textMuted,
      colorTextBase: NEUTRAL.ink,
      colorBgBase: NEUTRAL.surface,
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
        siderBg: brand.surface,
      },
      Card: {
        borderRadiusLG: 14,
        colorBorderSecondary: NEUTRAL.line,
      },
      Button: {
        // Chữ trên nút chính theo ink của nền thương hiệu; nút nguy hiểm vẫn chữ trắng trên đỏ.
        primaryColor: brand.primaryContrast,
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
        itemSelectedBg: brand.surface,
        itemSelectedColor: brand.primaryContrast,
        trackBg: NEUTRAL.paper,
      },
      Tabs: {
        inkBarColor: brand.accentStrong,
        itemSelectedColor: brand.accentStrong,
        itemHoverColor: brand.accentStrong,
        itemActiveColor: brand.accentStrong,
      },
      Progress: {
        defaultColor: brand.accent,
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
  // --brand-primary là NỀN thương hiệu (surface đã làm sẫm), --brand-primary-contrast là chữ (ink) trên nền đó.
  set(CSS_VAR.brandPrimary, brand.surface);
  set(CSS_VAR.brandPrimaryContrast, brand.primaryContrast);
  set(CSS_VAR.brandHover, brand.surfaceHover);
  set(CSS_VAR.brandActiveInk, brand.activeInk);
  set(CSS_VAR.brandRule, brand.rule);
  set(CSS_VAR.brandRaw, brand.primary);
  set(CSS_VAR.brandAccent, brand.accent);
  set(CSS_VAR.brandAccentInk, brand.accentInk);
  set(CSS_VAR.brandAccentStrong, brand.accentStrong);
  set(CSS_VAR.brandAccentSoft, brand.accentSoft);
  set(CSS_VAR.brandChart, brand.accentChart);
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
