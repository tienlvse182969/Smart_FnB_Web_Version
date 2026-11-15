/**
 * Sinh bộ token từ MỘT màu chủ đạo của chuỗi — chỗ duy nhất tính màu nền/chữ thương hiệu.
 * Mọi nơi (thanh bên, nút chính, header Store Manager, khung xem trước, phiếu số) đọc kết quả
 * qua CSS variables, không tự tính lại.
 *
 *  - surface: màu chủ đạo làm sẫm từng bước 2% (nhân kênh RGB) tới khi chữ trắng đạt 4.5:1,
 *    tối đa còn 62% độ sáng. Không đạt (màu quá sáng, vd vàng) → giữ màu gốc và dùng chữ đậm.
 *  - ink: chữ/biểu tượng trên surface (trắng hoặc nâu đen).
 *  - activeInk: màu chủ đạo sẫm cho chữ trên nền trắng (mục đang chọn, badge).
 *  - rule: đường kẻ trên surface.
 */

export const LIGHT_INK = "#FFFFFF";
export const DARK_INK = "#1A1206";
const MIN_RATIO = 4.5;
/** Tối đa còn 62% độ sáng, mỗi bước 2%. */
const STEP_PERCENT = 2;
const FLOOR_PERCENT = 62;

type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const clean = hex.replace("#", "").trim();
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full.slice(0, 6), 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function rgbToHex([r, g, b]: Rgb): string {
  const part = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase();
}

function luminance([r, g, b]: Rgb): number {
  const [rl, gl, bl] = [r, g, b].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

export function contrast(a: string, b: string): number {
  const la = luminance(hexToRgb(a));
  const lb = luminance(hexToRgb(b));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export const scaleColor = (hex: string, factor: number): string => rgbToHex(hexToRgb(hex).map((c) => c * factor) as Rgb);

/** Màu hợp lệ dạng #RGB hoặc #RRGGBB. */
export const isHexColor = (value: string): boolean => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());

export interface BrandSurface {
  surface: string;
  ink: string;
  activeInk: string;
  rule: string;
  /** Màu gốc quá sáng cho chữ trắng nên surface giữ nguyên và chữ chuyển sang màu đậm. */
  darkInk: boolean;
}

export function deriveBrandSurface(primary: string): BrandSurface {
  const base = rgbToHex(hexToRgb(primary));
  for (let percent = 100; percent >= FLOOR_PERCENT; percent -= STEP_PERCENT) {
    const candidate = scaleColor(base, percent / 100);
    if (contrast(candidate, LIGHT_INK) >= MIN_RATIO) {
      return { surface: candidate, ink: LIGHT_INK, activeInk: scaleColor(candidate, 0.7), rule: "rgba(255,255,255,.28)", darkInk: false };
    }
  }
  return { surface: base, ink: DARK_INK, activeInk: scaleColor(base, 0.45), rule: "rgba(0,0,0,.18)", darkInk: true };
}

/** true khi chữ trên nút chính phải chuyển sang màu đậm vì màu chủ đạo quá sáng. */
export const needsDarkInk = (primary: string): boolean => deriveBrandSurface(primary).darkInk;

/** Màu nhấn dùng làm chữ/viền trên nền trắng cần tối thiểu 3:1 (thành phần giao diện) để còn thấy rõ. */
export const accentTooPale = (accent: string): boolean => contrast(accent, "#FFFFFF") < 3;

export interface AccentTokens {
  /** Màu nhấn gốc: dùng cho NỀN lớn (cột biểu đồ, thanh tiến độ, badge). */
  accent: string;
  /** Chữ/biểu tượng trên nền accent (trắng hoặc đậm), đạt 4.5:1. */
  accentInk: string;
  /** Bản dùng cho đường kẻ và chữ trên nền trắng: chính accent nếu đã đủ đậm, ngược lại bản sẫm đạt 4.5:1. */
  accentStrong: string;
  /** Tông nhạt của accent cho series thứ hai và nền nhẹ. */
  accentSoft: string;
}

/** Trộn `color` với trắng theo tỉ lệ `amount` (0 = giữ nguyên, 1 = trắng). */
const tint = (hex: string, amount: number): string =>
  rgbToHex(hexToRgb(hex).map((c) => c + (255 - c) * amount) as Rgb);

/**
 * Token màu nhấn (đặc tả mục 10: badge, biểu đồ, điểm nhấn phụ). Accent quá nhạt trên nền trắng
 * (< 3:1) thì đường kẻ và chữ dùng bản sẫm (`accentStrong`), nền lớn giữ bản gốc.
 */
export function deriveAccent(accent: string): AccentTokens {
  const base = rgbToHex(hexToRgb(accent));
  const accentInk = contrast(base, LIGHT_INK) >= MIN_RATIO ? LIGHT_INK : DARK_INK;
  let strong = base;
  for (let percent = 100; percent > 10 && contrast(strong, "#FFFFFF") < MIN_RATIO; percent -= STEP_PERCENT) {
    strong = scaleColor(base, percent / 100);
  }
  return { accent: base, accentInk, accentStrong: strong, accentSoft: tint(base, 0.6) };
}

/** Hover của nút chính: sẫm thêm khoảng 6%. */
export const hoverSurface = (surface: string): string => scaleColor(surface, 0.94);
