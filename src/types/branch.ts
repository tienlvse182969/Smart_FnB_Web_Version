/** Kiểu dữ liệu Chi nhánh. */

/** Trạng thái hoạt động của chi nhánh. */
export type BranchStatus = "open" | "closed" | "suspended";

/** Chi nhánh thuộc một tenant. */
export type Branch = {
  id: string;
  tenantId: string;
  name: string;
  address: string;
  /** Số điện thoại chi nhánh. */
  phone: string;
  /** Giờ mở cửa dạng "HH:MM". */
  openTime: string;
  /** Giờ đóng cửa dạng "HH:MM". */
  closeTime: string;
  status: BranchStatus;
};


// ---------------------------------------------------------------------------
// Kiểu dữ liệu API chuỗi/chi nhánh — bám response thật của backend (api/v1).
// Swagger không khai báo schema cho response 200 của nhóm này; các trường lấy từ
// payload thực tế đã kiểm chứng.
// ---------------------------------------------------------------------------

export type ApiBranchStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";

export interface ApiChainRef {
  id: string;
  code: string;
  name: string;
  status: string;
}

export interface ApiBranch {
  id: string;
  chainId: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  addressLine1: string;
  addressLine2: string | null;
  ward: string | null;
  district: string | null;
  city: string;
  country: string | null;
  timezone: string | null;
  status: ApiBranchStatus;
  createdAt: string;
  updatedAt: string;
  chain: ApiChainRef;
}

export interface ApiOperatingHour {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed?: boolean;
}

export interface ApiBranchDetail extends ApiBranch {
  operatingHours: ApiOperatingHour[];
  specialHours: unknown[];
  areas: unknown[];
}

export interface ApiPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  monthlyPrice: string;
  maxBranches: number;
  maxAccounts: number;
  maxTables: number;
  /** Cờ tính năng của gói, `GET /restaurant-chains` → `subscription.plan` (BE `dfe8100`). Thiếu = BE cũ → suy từ mã gói. */
  brandingEnabled?: boolean;
  multiBranchComparisonEnabled?: boolean;
}

export interface ApiQuota {
  resource: "branches" | "accounts" | "tables";
  used: number;
  limit: number;
  remaining: number;
}

export interface ApiChain {
  id: string;
  code: string;
  name: string;
  logoUrl: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  taxCode: string | null;
  headquartersAddress: string | null;
  timezone: string | null;
  currency: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count: { branches: number };
  subscription: { plan: ApiPlan; quotas: ApiQuota[] } | null;
}

export interface CreateBranchInput {
  code: string;
  name: string;
  addressLine1: string;
  city: string;
  phone?: string;
  email?: string;
  addressLine2?: string;
  ward?: string;
  district?: string;
  country?: string;
  timezone?: string;
  openTime?: string;
  closeTime?: string;
}

export type UpdateBranchInput = Partial<Omit<CreateBranchInput, "openTime" | "closeTime">>;
