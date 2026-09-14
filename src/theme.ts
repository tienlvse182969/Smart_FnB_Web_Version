import type { ThemeConfig } from "antd";

/**
 * Monochrome (black & white) design tokens for the whole platform.
 * Primary interactive color is near-black ink; surfaces are white / paper grey.
 */
export const ink = "#0a0a0a";
export const paper = "#f4f4f5";
export const line = "#e4e4e7";

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
