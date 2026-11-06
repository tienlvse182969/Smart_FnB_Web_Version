/**
 * Kiểm poster trước khi gửi, theo đặc tả v14 (BR-51, BR-52): ảnh PNG/JPG/WebP ≤ 5 MB, tối đa 6 poster mỗi doanh nghiệp (kể cả poster đang tắt),
 * tên ≤ 50 ký tự, xoay vòng cố định 8 giây (không chỉnh thời lượng). BE lỏng hơn ở tên (120) và số lượng (10): web theo đặc tả.
 */
export const MAX_POSTER_MB = 5;
export const MAX_POSTER_BYTES = MAX_POSTER_MB * 1024 * 1024;
export const ACCEPTED_POSTER_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const MAX_POSTERS = 6;
export const MAX_POSTER_TITLE_LENGTH = 50;
/** BR-52: mỗi poster hiện đúng 8 giây ở màn hình phía khách; không có ô chỉnh. */
export const POSTER_ROTATION_SECONDS = 8;
export const MAX_POSTER_SORT_ORDER = 10000;
export const DEFAULT_POSTER_TITLE = "Poster";

/** Lỗi của tệp poster, hoặc `null` nếu hợp lệ. */
export function validatePosterFile(file: { type: string; size: number }): string | null {
  if (!ACCEPTED_POSTER_TYPES.includes(file.type)) return "Poster chỉ nhận PNG, JPG hoặc WebP";
  if (file.size > MAX_POSTER_BYTES) return `Poster vượt quá ${MAX_POSTER_MB} MB`;
  if (file.size === 0) return "Tệp poster rỗng";
  return null;
}

/** Lỗi tên poster (đã cắt khoảng trắng đầu cuối, 1–50 ký tự), hoặc `null` nếu hợp lệ. Bỏ trống tham số = không đổi tên. */
export function validatePosterTitle(title: string | undefined): string | null {
  if (title === undefined) return null;
  const length = title.trim().length;
  if (length === 0) return "Tên poster không được để trống";
  if (length > MAX_POSTER_TITLE_LENGTH) return `Tên poster tối đa ${MAX_POSTER_TITLE_LENGTH} ký tự`;
  return null;
}

/** Lỗi thứ tự (số nguyên 0–10000), hoặc `null` nếu hợp lệ. Bỏ trống tham số = không đổi. */
export function validatePosterSortOrder(sortOrder: number | undefined): string | null {
  if (sortOrder === undefined) return null;
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > MAX_POSTER_SORT_ORDER) return `Thứ tự phải là số nguyên từ 0 đến ${MAX_POSTER_SORT_ORDER}`;
  return null;
}

/** Lỗi đầu tiên của một lần sửa poster (PATCH), hoặc `null`. Sửa rỗng cũng là lỗi (BE trả 400). */
export function validatePosterPatch(patch: { title?: string; enabled?: boolean; sortOrder?: number }): string | null {
  if (patch.title === undefined && patch.enabled === undefined && patch.sortOrder === undefined) {
    return "Cần ít nhất một trường để cập nhật poster";
  }
  return validatePosterTitle(patch.title) ?? validatePosterSortOrder(patch.sortOrder);
}

/** Sắp theo thứ tự xoay vòng của BE: `sortOrder`, rồi thời điểm tạo, rồi `id`. */
export function comparePosters(a: { sortOrder: number; createdAt: string; id: string }, b: { sortOrder: number; createdAt: string; id: string }): number {
  return a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}
