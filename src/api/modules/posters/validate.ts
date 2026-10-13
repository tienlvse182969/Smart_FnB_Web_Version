/**
 * Kiểm poster trước khi gửi, theo BE (`display-posters.service.ts`, `dto/display-poster.dto.ts`): ảnh PNG/JPG/WebP ≤ 5 MB, tối đa 10 poster
 * mỗi chuỗi (kể cả poster đang tắt), tên 1–120 ký tự, thời lượng 3–60 giây, `sortOrder` 0–10000. BE còn kiểm chữ ký tệp.
 */
export const MAX_POSTER_MB = 5;
export const MAX_POSTER_BYTES = MAX_POSTER_MB * 1024 * 1024;
export const ACCEPTED_POSTER_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const MAX_POSTERS = 10;
export const MAX_POSTER_TITLE_LENGTH = 120;
export const MIN_POSTER_DURATION = 3;
export const MAX_POSTER_DURATION = 60;
export const DEFAULT_POSTER_DURATION = 8;
export const MAX_POSTER_SORT_ORDER = 10000;
export const DEFAULT_POSTER_TITLE = "Poster";

/** Lỗi của tệp poster, hoặc `null` nếu hợp lệ. */
export function validatePosterFile(file: { type: string; size: number }): string | null {
  if (!ACCEPTED_POSTER_TYPES.includes(file.type)) return "Poster chỉ nhận PNG, JPG hoặc WebP";
  if (file.size > MAX_POSTER_BYTES) return `Poster vượt quá ${MAX_POSTER_MB} MB`;
  if (file.size === 0) return "Tệp poster rỗng";
  return null;
}

/** Lỗi tên poster (đã cắt khoảng trắng đầu cuối, 1–120 ký tự), hoặc `null` nếu hợp lệ. Bỏ trống tham số = không đổi tên. */
export function validatePosterTitle(title: string | undefined): string | null {
  if (title === undefined) return null;
  const length = title.trim().length;
  if (length === 0) return "Tên poster không được để trống";
  if (length > MAX_POSTER_TITLE_LENGTH) return `Tên poster tối đa ${MAX_POSTER_TITLE_LENGTH} ký tự`;
  return null;
}

/** Lỗi thời lượng (số nguyên 3–60 giây), hoặc `null` nếu hợp lệ. Bỏ trống tham số = không đổi. */
export function validatePosterDuration(seconds: number | undefined): string | null {
  if (seconds === undefined) return null;
  if (!Number.isInteger(seconds) || seconds < MIN_POSTER_DURATION || seconds > MAX_POSTER_DURATION) {
    return `Thời lượng phải là số nguyên từ ${MIN_POSTER_DURATION} đến ${MAX_POSTER_DURATION} giây`;
  }
  return null;
}

/** Lỗi thứ tự (số nguyên 0–10000), hoặc `null` nếu hợp lệ. Bỏ trống tham số = không đổi. */
export function validatePosterSortOrder(sortOrder: number | undefined): string | null {
  if (sortOrder === undefined) return null;
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > MAX_POSTER_SORT_ORDER) return `Thứ tự phải là số nguyên từ 0 đến ${MAX_POSTER_SORT_ORDER}`;
  return null;
}

/** Lỗi đầu tiên của một lần sửa poster (PATCH), hoặc `null`. Sửa rỗng cũng là lỗi (BE trả 400). */
export function validatePosterPatch(patch: { title?: string; enabled?: boolean; sortOrder?: number; durationSeconds?: number }): string | null {
  if (patch.title === undefined && patch.enabled === undefined && patch.sortOrder === undefined && patch.durationSeconds === undefined) {
    return "Cần ít nhất một trường để cập nhật poster";
  }
  return validatePosterTitle(patch.title) ?? validatePosterSortOrder(patch.sortOrder) ?? validatePosterDuration(patch.durationSeconds);
}

/** Sắp theo thứ tự xoay vòng của BE: `sortOrder`, rồi thời điểm tạo, rồi `id`. */
export function comparePosters(a: { sortOrder: number; createdAt: string; id: string }, b: { sortOrder: number; createdAt: string; id: string }): number {
  return a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}
