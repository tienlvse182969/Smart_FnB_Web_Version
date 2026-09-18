/** Kiểu dữ liệu Tenant, Plan, Branding theo đặc tả v7 mục 5. */

/** Gói dịch vụ — giá tháng, giới hạn chi nhánh / tài khoản / bàn. */
export type Plan = {
  id: string;
  name: string;
  /** Giá tháng (VNĐ). */
  monthlyPrice: number;
  maxBranches: number;
  maxAccounts: number;
  maxTables: number;
};

/** Trạng thái thuê bao của tenant. */
export type TenantStatus = "active" | "suspended" | "expired";

/** Doanh nghiệp thuê bao nền tảng Smart FnB. */
export type Tenant = {
  id: string;
  name: string;
  planId: string;
  status: TenantStatus;
  /** Ngày gia hạn tiếp theo (ISO date string). */
  renewsAt: string;
  createdAt: string;
};

/**
 * Branding thương hiệu của tenant — dùng cho AntD ConfigProvider.
 * BR-28: thuộc về doanh nghiệp, áp cho mọi tài khoản (kể cả tạo sau).
 * BR-29: chỉ Owner sửa được. BR-32: Platform Admin luôn giữ nhận diện nền tảng.
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
};

/** Yêu cầu đăng ký mới từ doanh nghiệp. */
export type RegistrationStatus = "pending" | "approved" | "rejected";

export type RegistrationRequest = {
  id: string;
  businessName: string;
  taxCode: string;
  address: string;
  contactEmail: string;
  contactName: string;
  contactPhone: string;
  estimatedBranches: number;
  submittedAt: string;
  status: RegistrationStatus;
  /** Gói đã chọn khi duyệt — chỉ có khi status = "approved". */
  approvedPlanId?: string;
  /** tenantId được sinh ra khi duyệt — chỉ có khi status = "approved". */
  approvedTenantId?: string;
  /** Lý do từ chối — chỉ có khi status = "rejected". */
  rejectReason?: string;
};

/** Cấu hình nền tảng — áp dụng cho toàn bộ hệ thống. */
export type PlatformConfig = {
  /** Phần trăm phí nền tảng (0–100). */
  feePercent: number;
  /** Thời gian giữ tiền trước khi settle (giờ). Mặc định 24. */
  holdHours: number;
  /** Số tiền tối thiểu để yêu cầu rút (VNĐ). */
  minWithdraw: number;
};
