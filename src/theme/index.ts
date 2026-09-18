import type { ThemeConfig } from "antd";
import type { Branding } from "../types";

/**
 * Token gốc của nền tảng — khôi phục nguyên bản từ `src/theme.ts` trước khi
 * có khái niệm nhận diện theo tenant. Platform Admin và MỌI tenant chưa tự
 * cấu hình nhận diện (BR-28/BR-32) đều dùng đúng các giá trị này.
 */
export const ink = "#0a0a0a";
export const paper = "#f4f4f5";
export const line = "#e4e4e7";

/**
 * Nhận diện mặc định của nền tảng — dùng cho mọi tenant chưa tự cấu hình
 * (`isCustom: false`). Không có logo riêng (`logoUrl` để trống = dùng logo
 * nền tảng "Smart F&B" hiển thị sẵn trong `RoleShell`).
 */
export function createDefaultBranding(tenantId: string, displayName: string): Branding {
  return {
    tenantId,
    displayName,
    logoUrl: undefined,
    primaryColor: ink,
    accentColor: "#71717a",
    isCustom: false,
  };
}

/**
 * Theme nền tảng — Platform Admin và mọi tenant KHÔNG tự cấu hình nhận diện
 * đều dùng đúng object này (BR-32: Admin luôn giữ nhận diện nền tảng).
 * Đây là bản khôi phục chính xác từ `src/theme.ts` gốc — không "làm đẹp" thêm.
 */
export const monoTheme: ThemeConfig = {
  cssVar: { key: "fnb" },
  token: {
    colorPrimary: ink,
    colorInfo: ink,
    colorLink: ink,
    colorTextBase: ink,
    colorBgBase: "#ffffff",
    borderRadius: 8,
    fontFamily:
      "'HarmonyOS Sans', system-ui, -apple-system, 'Segoe UI', sans-serif",
    fontSize: 14,
    colorBorder: line,
    colorBorderSecondary: "#f0f0f1",
    controlHeight: 38,
    wireframe: false,
  },
  components: {
    Layout: {
      headerBg: "#ffffff",
      bodyBg: paper,
      siderBg: ink,
    },
    Menu: {
      darkItemBg: ink,
      darkItemSelectedBg: "rgba(255,255,255,0.14)",
      darkItemHoverBg: "rgba(255,255,255,0.07)",
      darkItemColor: "rgba(255,255,255,0.62)",
      darkItemSelectedColor: "#ffffff",
      itemHeight: 44,
      iconSize: 18,
    },
    Card: {
      borderRadiusLG: 14,
      colorBorderSecondary: line,
    },
    Button: {
      primaryShadow: "none",
      defaultShadow: "none",
      fontWeight: 500,
    },
    Table: {
      headerBg: "#fafafa",
      headerColor: "#71717a",
      rowHoverBg: "#fafafa",
      borderColor: line,
    },
    Statistic: {
      titleFontSize: 13,
    },
    Segmented: {
      itemSelectedBg: ink,
      itemSelectedColor: "#ffffff",
      trackBg: paper,
    },
    Tag: {
      defaultBg: "#fafafa",
      defaultColor: ink,
    },
  },
};

/** Bộ 8 màu chủ đạo dựng sẵn cho Owner chọn nhanh (mục 10). */
export const BRAND_COLOR_PRESETS = [
  "#0a0a0a", // đen (mặc định)
  "#DC2626", // đỏ
  "#EA580C", // cam
  "#D97706", // vàng đất
  "#16A34A", // xanh lá
  "#0891B2", // xanh ngọc
  "#2563EB", // xanh dương
  "#7C3AED", // tím
] as const;

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

/**
 * BR-31: kiểm tra tương phản khi lưu. Nếu chữ trắng trên nền `bgHex` không
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

/**
 * Theme hiệu lực cho một tenant.
 *
 * - `branding` null hoặc `isCustom === false` → trả về ĐÚNG `monoTheme`
 *   (cùng một object dùng chung với Admin) — nền trắng/xám, sider đen, border,
 *   radius, font, layout giống hệt bản gốc.
 * - `isCustom === true` → lấy `monoTheme` làm gốc, đổi màu chủ đạo xuyên suốt
 *   TOÀN BỘ giao diện — nút chính, link, tab/menu đang chọn, VÀ CẢ sider/menu
 *   tối (`Layout.siderBg`, `Menu.darkItemBg`) đều nhuộm theo `primaryColor`
 *   (Owner nói rõ: muốn cả thanh bên đổi màu, không chỉ nút). Nền trang
 *   (`bodyBg`/`headerBg`), border, radius, font vẫn giữ nguyên như `monoTheme`
 *   — chỉ đổi màu thương hiệu, không đổi bố cục. Chữ trên sider tự chọn
 *   trắng/đen theo tương phản với `primaryColor` (BR-31), không hardcode trắng.
 */
export function buildTenantTheme(branding: Branding | null): ThemeConfig {
  if (!branding || !branding.isCustom) return monoTheme;

  // BR-31: chữ trên nút chính/control/sider tô màu chủ đạo phải luôn đọc được.
  const textOnPrimary = pickReadableTextColor(branding.primaryColor);
  const lightText = textOnPrimary === "#ffffff";
  const overlay = lightText ? "255,255,255" : "0,0,0";

  return {
    ...monoTheme,
    cssVar: { key: "fnb-tenant" },
    token: {
      ...monoTheme.token,
      colorPrimary: branding.primaryColor,
      colorInfo: branding.primaryColor,
      colorLink: branding.primaryColor,
      colorTextLightSolid: textOnPrimary,
    },
    components: {
      ...monoTheme.components,
      Layout: {
        headerBg: "#ffffff",
        bodyBg: paper,
        siderBg: branding.primaryColor,
      },
      Menu: {
        darkItemBg: branding.primaryColor,
        darkItemSelectedBg: `rgba(${overlay},0.18)`,
        darkItemHoverBg: `rgba(${overlay},0.09)`,
        darkItemColor: lightText ? "rgba(255,255,255,0.68)" : "rgba(0,0,0,0.6)",
        darkItemSelectedColor: textOnPrimary,
        itemHeight: 44,
        iconSize: 18,
      },
      Segmented: {
        itemSelectedBg: branding.primaryColor,
        itemSelectedColor: textOnPrimary,
        trackBg: paper,
      },
    },
  };
}

// AccentContext is imported directly from "./accentContext" by components that need it.
