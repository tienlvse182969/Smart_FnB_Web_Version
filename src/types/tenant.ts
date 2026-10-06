/** Kiểu dữ liệu nhận diện thương hiệu (đặc tả v9 mục 10). Kiểu của Platform Admin: xem `admin.ts`. */

/**
 * Branding thương hiệu của tenant — dùng cho AntD ConfigProvider.
 * BR-41: thuộc về doanh nghiệp, áp cho mọi tài khoản (kể cả tạo sau), chỉ từ gói Tiêu chuẩn.
 * BR-43: chỉ Owner sửa được. BR-44: Platform Admin luôn giữ nhận diện nền tảng.
 */
export type Branding = {
  tenantId: string;
  displayName: string;
  logoUrl?: string;
  /** Màu chủ đạo (hex), dùng làm colorPrimary của AntD. */
  primaryColor: string;
  /** Màu phụ (hex), dùng làm accent. */
  accentColor: string;
  /**
   * false = doanh nghiệp chưa tự cấu hình nhận diện — mọi màn hình PHẢI
   * hiển thị đúng theme đơn sắc mặc định của nền tảng (giống Admin), bất kể
   * `primaryColor`/`accentColor` đang lưu giá trị gì. true = Owner đã lưu
   * nhận diện riêng — xem `theme/index.ts#buildTenantTheme`.
   */
  isCustom: boolean;
  /**
   * `isCustom` chia hai (quyết định 28): `lookCustom` = màu khác mặc định hoặc có logo. `isCustom && lookCustom === false` nghĩa là CHỈ đổi
   * tên hiển thị: áp tên, màu và logo vẫn theo giao diện nền tảng. `undefined` (mock, bản lưu cũ) = coi như bằng `isCustom`.
   */
  lookCustom?: boolean;
};
