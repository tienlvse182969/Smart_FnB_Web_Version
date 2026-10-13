/**
 * Tài sản hình ảnh của trang áp phích (OW-11). Đặt ở `src/theme/` vì quy tắc lint chỉ cho phép định nghĩa mã màu ở đây.
 * Mọi ảnh là SVG nhúng (data URI): không cần mạng, dùng cho ảnh mặc định của nền tảng (đặc tả 5.9, 20.3), ảnh mẫu của mock và khung xem trước.
 */

/** Nền khung xem trước và ô ảnh thu nhỏ: tối để ảnh sáng nổi và phần trống không bị trắng. */
export const POSTER_STAGE_BG = "#020617";

function svgImage(label: string, from: string, to: string, width: number, height: number, sub?: string): string {
  const size = Math.round(height / (sub ? 8.5 : 8));
  const text =
    `<text x="50%" y="${sub ? "48%" : "50%"}" fill="#ffffff" font-family="sans-serif" font-size="${size}" font-weight="700" text-anchor="middle" dominant-baseline="middle">${label}</text>` +
    (sub ? `<text x="50%" y="60%" fill="#cbd5e1" font-family="sans-serif" font-size="${Math.round(size / 2.3)}" text-anchor="middle">${sub}</text>` : "");
  const body =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>` +
    `<rect width="100%" height="100%" fill="url(#g)"/>${text}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(body)}`;
}

/** Ảnh mặc định của nền tảng khi không có áp phích nào đang bật. */
export const DEFAULT_POSTER_IMAGE = svgImage("Smart F&amp;B", "#0f172a", "#334155", 1280, 720, "Ảnh mặc định của nền tảng");

/** Ba ảnh mẫu của mock: hai ngang 16:9 và một dọc 9:16 (để kiểm "hiện nguyên khổ, phần trống lấp bằng ảnh mờ"). */
export const MOCK_POSTER_IMAGES = {
  promo: svgImage("Khuyến mãi tháng 10", "#0f766e", "#14b8a6", 1280, 720),
  newItem: svgImage("Món mới: Trà vải", "#7c3aed", "#db2777", 1280, 720),
  portrait: svgImage("Dọc 9:16", "#f97316", "#be123c", 720, 1280),
  uploaded: svgImage("Ảnh tải lên", "#334155", "#64748b", 1280, 720),
} as const;
