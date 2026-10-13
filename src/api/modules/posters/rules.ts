/**
 * Quy tắc áp phích (OW-11, BR-51) — MỘT nguồn cho form, mock và kiểm thử.
 *
 * Giá trị là giá trị BE `4b81e48` ĐANG ÉP (`display-posters.service.ts:17-18`, `display-poster.dto.ts`), KHÔNG phải số của đặc tả 9.2:
 * #82 "chờ nhóm chốt": tối đa 10 áp phích (đặc tả: 6), tên 1–120 ký tự (đặc tả: ≤ 50), thời lượng mỗi ảnh 3–60 giây (đặc tả: cố định 8).
 * Đổi sang số của đặc tả chỉ cần sửa hằng số ở đây.
 */
import type { Poster } from "../../../types";

export const POSTER_LIMITS = {
  /** BE `POSTER_LIMIT = 10`; đặc tả 6 (#82). */
  maxCount: 10,
  /** BE `UpdateDisplayPosterDto.title @Length(1, 120)`; đặc tả ≤ 50 (#82). */
  maxTitle: 120,
  /** BE `POSTER_MAX_BYTES` và `FileInterceptor limits.fileSize`; đặc tả 5 MB. */
  maxBytes: 5 * 1024 * 1024,
  /** BE kiểm cả MIME lẫn chữ ký tệp: PNG, JPEG, WebP. */
  types: ["image/png", "image/jpeg", "image/webp"] as readonly string[],
  /** Thời lượng mỗi ảnh (giây) khi BE không trả. */
  defaultSeconds: 8,
} as const;

export const POSTER_TYPES_LABEL = "PNG, JPG hoặc WebP";
export const POSTER_ACCEPT = POSTER_LIMITS.types.join(",");

const MB = 1024 * 1024;

/** Lỗi khi CHỌN tệp (trước khi gửi); `null` nếu hợp lệ. Câu cụ thể theo BR-51 và 6.11. */
export function validatePosterFile(file: { type: string; size: number; name?: string }, currentCount: number): string | null {
  if (currentCount >= POSTER_LIMITS.maxCount) {
    return `Đã đủ ${POSTER_LIMITS.maxCount} áp phích. Xoá bớt một áp phích rồi tải ảnh mới.`;
  }
  return validatePosterImage(file);
}

/** Kiểm riêng tệp ảnh (dùng cả khi đổi ảnh một áp phích đã có). */
export function validatePosterImage(file: { type: string; size: number; name?: string }): string | null {
  if (!POSTER_LIMITS.types.includes(file.type)) {
    return `Áp phích chỉ nhận ${POSTER_TYPES_LABEL}${file.name ? ` (tệp "${file.name}" không đúng định dạng)` : ""}.`;
  }
  if (file.size === 0) return "Tệp ảnh rỗng.";
  if (file.size > POSTER_LIMITS.maxBytes) {
    return `Ảnh nặng ${(file.size / MB).toFixed(1)} MB, vượt giới hạn ${POSTER_LIMITS.maxBytes / MB} MB.`;
  }
  return null;
}

/** Lỗi tên (rỗng chỉ được khi không đổi: BE từ chối chuỗi rỗng); `null` nếu hợp lệ. */
export function validatePosterTitle(raw: string): string | null {
  const title = raw.trim();
  if (title.length === 0) return "Nhập tên áp phích (không để trống).";
  if (title.length > POSTER_LIMITS.maxTitle) return `Tên tối đa ${POSTER_LIMITS.maxTitle} ký tự.`;
  return null;
}

/** Áp phích theo thứ tự xoay vòng của BE (sortOrder, ngày tạo, id): giữ nguyên thứ tự mảng, chỉ lọc. */
export function enabledInOrder(posters: Poster[]): Poster[] {
  return posters.filter((p) => p.enabled);
}

export interface SortPatch {
  id: string;
  sortOrder: number;
}

/**
 * Đổi thứ tự (BE không có `PUT order`, #82): chuẩn hoá `sortOrder` của mọi áp phích thành chỉ số mảng mới 0..n−1 và CHỈ gửi các áp phích
 * có `sortOrder` khác chỉ số mới (thường 2; nhiều hơn khi `sortOrder` đang trùng/lệch do xoá). `direction` -1 = lên, +1 = xuống.
 * Trả mảng rỗng nếu không dịch chuyển được (đầu/cuối danh sách hoặc id lạ).
 */
export function moveOrder(posters: Poster[], id: string, direction: -1 | 1): SortPatch[] {
  const from = posters.findIndex((p) => p.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= posters.length) return [];
  const next = [...posters];
  [next[from], next[to]] = [next[to], next[from]];
  return next.flatMap((p, index) => (p.sortOrder === index ? [] : [{ id: p.id, sortOrder: index }]));
}

/** Chỉ số ảnh kế tiếp trong vòng xoay (0 khi hết vòng, hoặc khi danh sách rỗng). */
export function nextSlideIndex(current: number, length: number): number {
  if (length <= 0) return 0;
  return (current + 1) % length;
}

/** Thời lượng mỗi ảnh theo giây, kẹp 3–60 (cùng khoảng BE), mặc định 8. */
export function slideSeconds(poster: Pick<Poster, "durationSeconds"> | undefined): number {
  const value = poster?.durationSeconds;
  if (typeof value !== "number" || !Number.isFinite(value)) return POSTER_LIMITS.defaultSeconds;
  return Math.min(60, Math.max(3, Math.round(value)));
}

/** Câu tiếng Việt cho mã lỗi BE ở thao tác áp phích (bổ sung `errors.ts`): dùng ở màn khi cần câu chuyên biệt. */
export function describePosterRejection(status: number, message: string): string | null {
  if (status === 413) return `Ảnh vượt giới hạn ${POSTER_LIMITS.maxBytes / MB} MB.`;
  if (status === 409 && /at most \d+ posters/i.test(message)) return `Đã đủ ${POSTER_LIMITS.maxCount} áp phích. Xoá bớt một áp phích rồi tải ảnh mới.`;
  if (status === 400 && /must not exceed 5 MB/i.test(message)) return `Ảnh vượt giới hạn ${POSTER_LIMITS.maxBytes / MB} MB.`;
  if (status === 400 && /JPEG, PNG, or WebP/i.test(message)) return `Áp phích chỉ nhận ${POSTER_TYPES_LABEL}, đúng định dạng thật của tệp.`;
  if (status === 400 && /file is required/i.test(message)) return "Chưa chọn tệp ảnh.";
  if (status === 404 && /poster not found/i.test(message)) return "Áp phích không còn tồn tại (có thể đã bị xoá). Đã tải lại danh sách.";
  return null;
}
