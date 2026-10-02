/**
 * Luật mật khẩu của `POST /auth/setup-password` — LẤY NGUYÊN từ DTO của BE
 * (`SetupPasswordDto`, auth/dto/setup-password.dto.ts:11-18): 8–128 ký tự, có chữ thường, chữ hoa và chữ số.
 * Không thêm luật nào khác. Một nguồn cho form và mock.
 */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export interface PasswordRule {
  key: "length" | "lower" | "upper" | "digit";
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { key: "length", label: `Từ ${PASSWORD_MIN} đến ${PASSWORD_MAX} ký tự`, test: (p) => p.length >= PASSWORD_MIN && p.length <= PASSWORD_MAX },
  { key: "lower", label: "Có chữ thường", test: (p) => /[a-z]/.test(p) },
  { key: "upper", label: "Có chữ hoa", test: (p) => /[A-Z]/.test(p) },
  { key: "digit", label: "Có chữ số", test: (p) => /[0-9]/.test(p) },
];

/** Các luật mật khẩu chưa đạt (rỗng = hợp lệ). */
export function failedPasswordRules(password: string): PasswordRule[] {
  return PASSWORD_RULES.filter((r) => !r.test(password));
}
