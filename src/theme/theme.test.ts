import { describe, expect, it } from "vitest";
import type { Branding } from "../types";
import {
  BRAND_COLOR_PRESETS,
  PLATFORM_BRAND_TOKENS,
  STATUS,
  WCAG_AA_RATIO,
  buildTheme,
  contrastRatio,
  isDarkEnoughForWhiteText,
  meetsWcagAA,
  pickReadableTextColor,
  resolveBrand,
} from "./index";

describe("contrastRatio (WCAG 2.0)", () => {
  it("đen/trắng = 21:1, cùng màu = 1:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
  });

  it("đối xứng và nhận mã hex 3 ký tự", () => {
    expect(contrastRatio("#0a0a0a", "#ffffff")).toBeCloseTo(contrastRatio("#ffffff", "#0a0a0a"), 10);
    expect(contrastRatio("#fff", "#000")).toBeCloseTo(21, 5);
  });

  it("giá trị tham chiếu đã biết: #767676 trên trắng ≈ 4.54 (ngưỡng AA)", () => {
    expect(contrastRatio("#767676", "#ffffff")).toBeGreaterThan(4.5);
    expect(contrastRatio("#777777", "#ffffff")).toBeLessThan(4.5);
  });
});

describe("meetsWcagAA — tối thiểu 4.5:1", () => {
  it("ngưỡng là 4.5", () => {
    expect(WCAG_AA_RATIO).toBe(4.5);
  });

  it("đạt/không đạt đúng ngưỡng", () => {
    expect(meetsWcagAA("#767676", "#ffffff")).toBe(true);
    expect(meetsWcagAA("#777777", "#ffffff")).toBe(false);
    expect(meetsWcagAA("#0a0a0a", "#ffffff")).toBe(true);
  });
});

describe("pickReadableTextColor (BR-43 — tự chọn màu chữ tương phản)", () => {
  it("nền tối → chữ trắng, nền sáng → chữ đen", () => {
    expect(pickReadableTextColor("#0a0a0a")).toBe("#ffffff");
    expect(pickReadableTextColor("#FFEB3B")).toBe("#000000"); // vàng nhạt: chữ trắng sẽ biến mất
    expect(isDarkEnoughForWhiteText("#0a0a0a")).toBe(true);
    expect(isDarkEnoughForWhiteText("#FFEB3B")).toBe(false);
  });

  it("với MỌI màu dựng sẵn, chữ được chọn luôn đạt 4.5:1 hoặc là chữ đen", () => {
    for (const color of BRAND_COLOR_PRESETS) {
      const text = pickReadableTextColor(color);
      expect(text === "#000000" || meetsWcagAA(color, text)).toBe(true);
    }
  });
});

describe("resolveBrand — hai họ màu tách biệt", () => {
  const custom: Branding = {
    tenantId: "t",
    displayName: "Quán Mộc",
    logoUrl: "data:image/png;base64,xx",
    primaryColor: BRAND_COLOR_PRESETS[2],
    accentColor: BRAND_COLOR_PRESETS[5],
    isCustom: true,
  };

  it("doanh nghiệp có nhận diện và gói cho phép → áp màu, primaryContrast đạt tương phản", () => {
    const brand = resolveBrand({ branding: custom, platformOnly: false, brandingEnabled: true });
    expect(brand.custom).toBe(true);
    expect(brand.primary).toBe(custom.primaryColor);
    expect(brand.displayName).toBe("Quán Mộc");
    expect(brand.logo).toBe(custom.logoUrl);
    expect(brand.primaryContrast).toBe(pickReadableTextColor(custom.primaryColor));
  });

  it("Admin / trang đăng nhập (platformOnly) luôn nhận diện nền tảng (BR-44, CC-04)", () => {
    expect(resolveBrand({ branding: custom, platformOnly: true, brandingEnabled: true })).toBe(PLATFORM_BRAND_TOKENS);
  });

  it("gói không có tính năng nhận diện → nhận diện nền tảng (BR-41)", () => {
    expect(resolveBrand({ branding: custom, platformOnly: false, brandingEnabled: false })).toBe(PLATFORM_BRAND_TOKENS);
  });

  it("chưa cấu hình (isCustom=false) hoặc chưa có branding → nhận diện nền tảng", () => {
    expect(resolveBrand({ branding: { ...custom, isCustom: false }, platformOnly: false, brandingEnabled: true })).toBe(
      PLATFORM_BRAND_TOKENS,
    );
    expect(resolveBrand({ branding: null, platformOnly: false, brandingEnabled: true })).toBe(PLATFORM_BRAND_TOKENS);
  });

  it("CHỈ đổi tên (isCustom, lookCustom=false, quyết định 28) → áp tên hiển thị, màu và logo vẫn của nền tảng", () => {
    const brand = resolveBrand({ branding: { ...custom, displayName: "  Quán Mới  ", logoUrl: undefined, lookCustom: false }, platformOnly: false, brandingEnabled: true });
    expect(brand.displayName).toBe("Quán Mới");
    expect(brand.primary).toBe(PLATFORM_BRAND_TOKENS.primary);
    expect(brand.accent).toBe(PLATFORM_BRAND_TOKENS.accent);
    expect(brand.logo).toBeUndefined();
    expect(brand.custom).toBe(false);
    // Admin / trang công khai vẫn không bị áp cả tên
    expect(resolveBrand({ branding: { ...custom, lookCustom: false }, platformOnly: true, brandingEnabled: true })).toBe(PLATFORM_BRAND_TOKENS);
    // lookCustom true hoặc không có → áp cả màu như trước
    expect(resolveBrand({ branding: { ...custom, lookCustom: true }, platformOnly: false, brandingEnabled: true }).primary).toBe(custom.primaryColor);
  });

  it("nhận diện nền tảng: primary đạt tương phản với primaryContrast", () => {
    expect(meetsWcagAA(PLATFORM_BRAND_TOKENS.primary, PLATFORM_BRAND_TOKENS.primaryContrast)).toBe(true);
  });
});

describe("buildTheme — màu ngữ nghĩa không phụ thuộc thương hiệu (BR-42)", () => {
  it("đổi primary chỉ đổi màu thương hiệu, không đụng token trạng thái", () => {
    const red = resolveBrand({
      branding: {
        tenantId: "t",
        displayName: "X",
        primaryColor: BRAND_COLOR_PRESETS[1], // đỏ — màu dễ lẫn với "trễ"
        accentColor: BRAND_COLOR_PRESETS[1],
        isCustom: true,
      },
      platformOnly: false,
      brandingEnabled: true,
    });
    const theme = buildTheme(red);
    expect(theme.token?.colorPrimary).toBe(BRAND_COLOR_PRESETS[1]);
    // màu trạng thái là hằng số, không có chỗ nào trong theme lấy từ primary
    expect(STATUS.late).not.toBe(red.primary);
    expect(theme.token?.colorError).toBeUndefined();
    expect(theme.token?.colorSuccess).toBeUndefined();
    expect(theme.token?.colorWarning).toBeUndefined();
  });
});
