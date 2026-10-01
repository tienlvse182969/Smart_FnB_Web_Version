/**
 * Nguồn DUY NHẤT của mã màu trong dự án (đặc tả v9 mục 10, BR-41→BR-44).
 * Luật lint `no-restricted-syntax` cấm mã màu cứng ở mọi nơi khác ngoài `src/theme/`.
 *
 * Ba họ màu, tách bạch:
 *  1. THƯƠNG HIỆU (`brand.*`) — theo doanh nghiệp, Owner đổi được. Chỉ áp cho nút chính,
 *     thanh điều hướng, liên kết, điểm nhấn.
 *  2. NGỮ NGHĨA (`semantic.*`, `status.*`) — hằng số hệ thống, thương hiệu không bao giờ ghi đè (BR-42).
 *  3. TRUNG TÍNH (`neutral.*`) — chữ, nền, đường kẻ của giao diện; cũng cố định.
 */

/** Nhận diện nền tảng — dùng cho Admin, trang đăng nhập, landing và doanh nghiệp chưa/không được dùng nhận diện riêng. */
export const PLATFORM_BRAND = {
  primary: "#0a0a0a",
  primaryContrast: "#ffffff",
  /** Mục 10.2: màu nhấn mặc định là "xám trung tính". */
  accent: "#71717a",
  displayName: "Smart F&B",
} as const;

/** Nhận diện nền tảng dưới dạng token. */
export const PLATFORM_BRAND_TOKENS: BrandTokens = {
  primary: PLATFORM_BRAND.primary,
  primaryContrast: PLATFORM_BRAND.primaryContrast,
  accent: PLATFORM_BRAND.accent,
  displayName: PLATFORM_BRAND.displayName,
  logo: undefined,
  custom: false,
};

/** Trung tính của giao diện — không đổi theo thương hiệu. */
export const NEUTRAL = {
  ink: "#0a0a0a",
  surface: "#ffffff",
  paper: "#f4f4f5",
  paperSubtle: "#fafafa",
  line: "#e4e4e7",
  lineSubtle: "#f0f0f1",
  textStrong: "#52525b",
  textMuted: "#71717a",
  textSubtle: "#a1a1aa",
  /** Nền khối mã/ghi chú tối, chữ trên đó. */
  codeBg: "#0a0a0a",
  codeText: "#e4e4e7",
} as const;

/** Màu ngữ nghĩa — mỗi màu có nền nhạt, chữ, viền. */
export const SEMANTIC = {
  success: { bg: "#F6FFED", text: "#389E0D", border: "#B7EB8F" },
  warning: { bg: "#FFFBE6", text: "#AD6800", border: "#FFE58F" },
  error: { bg: "#FFF1F0", text: "#CF1322", border: "#FFA39E" },
  info: { bg: "#E6F4FF", text: "#0958D9", border: "#91CAFF" },
  neutral: { bg: "#FAFAFA", text: "#595959", border: "#D9D9D9" },
  purple: { bg: "#F9F0FF", text: "#531DAB", border: "#D3ADF7" },
} as const;

export type SemanticKey = keyof typeof SEMANTIC;

/** Ba màu trạng thái pha chế dạng đặc (đặc tả 10.5): vàng chờ, xanh xong, đỏ trễ. */
export const STATUS = {
  waiting: "#F59E0B",
  done: "#10B981",
  late: "#EF4444",
} as const;

/** Bộ 8 màu chủ đạo dựng sẵn cho Owner chọn nhanh (mục 10.4 R3). */
export const BRAND_COLOR_PRESETS = [
  "#0a0a0a", // đen (mặc định)
  "#DC2626", // đỏ
  "#EA580C", // cam
  "#D97706", // vàng đất
  "#16A34A", // xanh lá
  "#0891B2", // xanh ngọc
  "#2563EB", // xanh dương
  "#7C3AED", // tím
] as const;

/** Bộ token thương hiệu đã giải quyết xong — thứ duy nhất màn hình/theme được đọc. */
export interface BrandTokens {
  primary: string;
  /** Màu chữ/biểu tượng trên nền `primary`, tự chọn để đạt tương phản WCAG (BR-43). */
  primaryContrast: string;
  accent: string;
  displayName: string;
  /** Logo của chuỗi; undefined = logo nền tảng. */
  logo: string | undefined;
  /** true = nhận diện của doanh nghiệp đang được áp; false = nhận diện nền tảng. */
  custom: boolean;
}

/**
 * Tên CSS variable. Màn hình KHÔNG viết tên này, mà dùng `palette` (bên dưới) để có kiểu
 * và để đổi tên một chỗ.
 */
export const CSS_VAR = {
  brandPrimary: "--brand-primary",
  brandPrimaryContrast: "--brand-primary-contrast",
  brandAccent: "--brand-accent",
  ink: "--fnb-ink",
  surface: "--fnb-surface",
  paper: "--fnb-paper",
  paperSubtle: "--fnb-paper-subtle",
  line: "--fnb-line",
  lineSubtle: "--fnb-line-subtle",
  textStrong: "--fnb-text-strong",
  textMuted: "--fnb-text-muted",
  textSubtle: "--fnb-text-subtle",
  codeBg: "--fnb-code-bg",
  codeText: "--fnb-code-text",
  statusWaiting: "--status-waiting",
  statusDone: "--status-done",
  statusLate: "--status-late",
} as const;

const v = (name: string) => `var(${name})`;

const semanticVars = (key: SemanticKey) => ({
  bg: v(`--sem-${key}-bg`),
  text: v(`--sem-${key}-text`),
  border: v(`--sem-${key}-border`),
});

/** Chuỗi `var(--…)` dùng trong `style`, thuộc tính màu của AntD/lucide. */
export const palette = {
  brandPrimary: v(CSS_VAR.brandPrimary),
  onBrand: v(CSS_VAR.brandPrimaryContrast),
  brandAccent: v(CSS_VAR.brandAccent),
  ink: v(CSS_VAR.ink),
  surface: v(CSS_VAR.surface),
  paper: v(CSS_VAR.paper),
  paperSubtle: v(CSS_VAR.paperSubtle),
  line: v(CSS_VAR.line),
  lineSubtle: v(CSS_VAR.lineSubtle),
  textStrong: v(CSS_VAR.textStrong),
  textMuted: v(CSS_VAR.textMuted),
  textSubtle: v(CSS_VAR.textSubtle),
  codeBg: v(CSS_VAR.codeBg),
  codeText: v(CSS_VAR.codeText),
  statusWaiting: v(CSS_VAR.statusWaiting),
  statusDone: v(CSS_VAR.statusDone),
  statusLate: v(CSS_VAR.statusLate),
  success: semanticVars("success"),
  warning: semanticVars("warning"),
  error: semanticVars("error"),
  info: semanticVars("info"),
  neutral: semanticVars("neutral"),
  purple: semanticVars("purple"),
} as const;

/** Chữ/biểu tượng trên nền thương hiệu, pha trong suốt `pct`% (vd. phụ đề trên thanh điều hướng). */
export const onBrandAlpha = (pct: number) =>
  `color-mix(in srgb, ${v(CSS_VAR.brandPrimaryContrast)} ${pct}%, transparent)`;
