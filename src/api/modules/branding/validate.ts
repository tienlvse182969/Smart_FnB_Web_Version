/** Kiểm nhận diện theo ĐẶC TẢ trước khi gửi (quyết định 4): logo PNG/JPG ≤ 1 MB, tên hiển thị ≤ 50 ký tự (BE rộng hơn: WebP, 5 MB, tên 150 — #39). */
export const MAX_LOGO_BYTES = 1024 * 1024;
export const ACCEPTED_LOGO_TYPES = ["image/png", "image/jpeg"];
export const MAX_DISPLAY_NAME_LENGTH = 50;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** Lỗi của tệp logo, hoặc `null` nếu hợp lệ. */
export function validateLogoFile(file: { type: string; size: number }): string | null {
  if (!ACCEPTED_LOGO_TYPES.includes(file.type)) return "Logo chỉ nhận PNG hoặc JPG";
  if (file.size > MAX_LOGO_BYTES) return "Logo vượt quá 1 MB";
  if (file.size === 0) return "Tệp logo rỗng";
  return null;
}

/** Lỗi theo ô cho các trường được gửi; rỗng = hợp lệ. */
export function validateBrandingFields(input: { displayName?: string; primaryColor?: string; accentColor?: string; logoFile?: { type: string; size: number } }): string[] {
  const errors: string[] = [];
  if (input.displayName !== undefined && input.displayName.trim().length > MAX_DISPLAY_NAME_LENGTH) errors.push(`Tên hiển thị tối đa ${MAX_DISPLAY_NAME_LENGTH} ký tự`);
  if (input.primaryColor !== undefined && !HEX_COLOR.test(input.primaryColor)) errors.push("Màu chủ đạo phải là mã màu dạng #RRGGBB");
  if (input.accentColor !== undefined && !HEX_COLOR.test(input.accentColor)) errors.push("Màu nhấn phải là mã màu dạng #RRGGBB");
  if (input.logoFile) {
    const logoError = validateLogoFile(input.logoFile);
    if (logoError) errors.push(logoError);
  }
  return errors;
}
