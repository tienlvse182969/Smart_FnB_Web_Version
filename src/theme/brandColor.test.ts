import { describe, expect, it } from "vitest";
import { DARK_INK, LIGHT_INK, accentTooPale, contrast, deriveBrandSurface, hexToRgb, isHexColor, needsDarkInk } from "./brandColor";

/** Năm màu kiểm của lượt UX/UI 1: cam, xanh dương, xanh lá, vàng (chữ đậm), đen. */
const SAMPLES = ["#D97706", "#2563EB", "#16A34A", "#FACC15", "#111827"] as const;

describe("deriveBrandSurface", () => {
  it.each(SAMPLES)("%s: chữ trên surface luôn đạt 4.5:1", (color) => {
    const d = deriveBrandSurface(color);
    expect(contrast(d.surface, d.ink)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(SAMPLES)("%s: activeInk đạt 4.5:1 trên nền trắng", (color) => {
    expect(contrast(deriveBrandSurface(color).activeInk, "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
  });

  it("màu đủ tối giữ nguyên, chữ trắng", () => {
    const d = deriveBrandSurface("#111827");
    expect(d.surface).toBe("#111827");
    expect(d.ink).toBe(LIGHT_INK);
    expect(d.rule).toBe("rgba(255,255,255,.28)");
  });

  it("màu hơi sáng được làm sẫm từng bước, còn lại ≥ 62% độ sáng", () => {
    const d = deriveBrandSurface("#D97706");
    expect(d.ink).toBe(LIGHT_INK);
    expect(d.surface).not.toBe("#D97706");
    const [r] = hexToRgb(d.surface);
    expect(r).toBeLessThan(0xd9);
    expect(r).toBeGreaterThanOrEqual(Math.floor(0xd9 * 0.62) - 1);
  });

  it("vàng quá sáng: giữ màu gốc và dùng chữ đậm", () => {
    const d = deriveBrandSurface("#FACC15");
    expect(d.surface).toBe("#FACC15");
    expect(d.ink).toBe(DARK_INK);
    expect(d.darkInk).toBe(true);
    expect(d.rule).toBe("rgba(0,0,0,.18)");
    expect(needsDarkInk("#FACC15")).toBe(true);
    expect(needsDarkInk("#2563EB")).toBe(false);
  });

  it("activeInk: ink trắng nhân ≤ 0.7, ink đậm nhân 0.45", () => {
    const [r1] = hexToRgb(deriveBrandSurface("#2563EB").surface);
    const [r2] = hexToRgb(deriveBrandSurface("#2563EB").activeInk);
    expect(r2).toBeLessThanOrEqual(Math.round(r1 * 0.7));
    const [y1] = hexToRgb("#FACC15");
    const [y2] = hexToRgb(deriveBrandSurface("#FACC15").activeInk);
    expect(y2).toBe(Math.round(y1 * 0.45));
  });
});

describe("accentTooPale / isHexColor", () => {
  it("màu nhấn quá nhạt trên nền trắng bị gợi ý", () => {
    expect(accentTooPale("#FFFFFF")).toBe(true);
    expect(accentTooPale("#FAFAA0")).toBe(true);
    expect(accentTooPale("#2563EB")).toBe(false);
  });

  it("nhận #RGB và #RRGGBB", () => {
    expect(isHexColor("#fff")).toBe(true);
    expect(isHexColor("#FACC15")).toBe(true);
    expect(isHexColor("FACC15")).toBe(false);
  });
});
