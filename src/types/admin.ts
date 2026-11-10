/**
 * Kiểu dữ liệu của Platform Admin (PA-01..05, GU-01), bám DTO thật của BE `/admin/*` và
 * `/registration-applications` (xem platform-admin.service.ts). Chỉ giữ trường web cần: KHÔNG có trường ví
 * (`wallet`, `balance`, `heldBalance`) — BR-07, và mapper (`api/modules/admin/mapper.ts`) không bao giờ chép chúng.
 * Tiền đã qua `parseAmount` nên là số.
 */

/** Danh sách phân trang của BE: `{ items, pagination }`. */

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Paginated<T> = { items: T[]; pagination: Pagination };

export type PageQuery = { page?: number; limit?: number; search?: string };

/** Gói dịch vụ (`/admin/service-plans`). `maxTables` của BE là v7, web không dùng. */

export type ServicePlan = {
  id: string;

  code: string;

  name: string;

  description: string | null;

  /** VNĐ/tháng (BE trả chuỗi thập phân). */

  monthlyPrice: number;

  maxBranches: number;

  maxAccounts: number;

  extraBranchPrice: number;
  extraBranchAccounts: number;
  extraAccountPackPrice: number;
  extraBranchEnabled: boolean;

  /** Cờ tính năng BE đã lưu trên gói (BE `dfe8100`). Cờ AI và cấp (`tier`) chưa có ở BE: vẫn suy từ mã gói (`plan/tiers.ts`). */

  brandingEnabled: boolean;

  multiBranchComparisonEnabled: boolean;

  isActive: boolean;
};

export type ServicePlanInput = {
  code: string;

  name: string;

  description?: string;

  monthlyPrice: number;

  maxBranches: number;

  maxAccounts: number;

  extraBranchPrice?: number;
  extraBranchAccounts?: number;
  extraAccountPackPrice?: number;
  extraBranchEnabled?: boolean;

  brandingEnabled: boolean;

  multiBranchComparisonEnabled: boolean;

  isActive?: boolean;
};

/** Hồ sơ đăng ký (GU-01 nộp, PA-01..03 xử lý). */

export type RegistrationStatus = "PENDING" | "APPROVED" | "ACTIVATED" | "REJECTED";

export type RegistrationApplication = {
  id: string;

  applicationCode: string;

  businessName: string;

  taxCode: string | null;

  representativeName: string;

  representativeEmail: string;

  representativePhone: string;

  headquartersAddress: string | null;

  status: RegistrationStatus;

  rejectionReason: string | null;

  createdAt: string;

  reviewedAt: string | null;

  /** Email Admin đã duyệt/từ chối. */

  reviewedByEmail: string | null;

  requestedPlan: ServicePlan | null;
  approvedPlan: ServicePlan | null;
};

/** Chi tiết hồ sơ; sau khi duyệt có thêm thông tin doanh nghiệp đã sinh. */

export type RegistrationDetail = RegistrationApplication & {
  activationExpiresAt: string | null;
  supportActions: { id: string; action: string; note: string; createdAt: string; actor: { email: string } }[];
  approved: {
    chainId: string;

    chainCode: string;

    chainName: string;

    planName: string | null;

    expiresAt: string | null;

    ownerEmail: string | null;
  } | null;
};

/** Trường BE nhận khi nộp hồ sơ (GU-01). CHỜ BE: chưa có "số chi nhánh dự kiến". */

export type SubmitRegistrationInput = {
  businessName: string;

  taxCode?: string;

  representativeName: string;

  representativeEmail: string;

  representativePhone: string;

  headquartersAddress?: string;

  requestedPlanId?: string;
  trialRequested?: boolean;
};

export type ApproveRegistrationInput = {
  planId?: string;

  subscriptionMonths?: number;
};

/**
 * Trạng thái thuê bao hiển thị. BE có `ACTIVE | SUSPENDED | EXPIRED` nhưng KHÔNG ghi `EXPIRED`
 * (TODO BE), nên web tự tính: `ACTIVE` mà `expiresAt` đã qua → `expired`.
 */

export type SubscriptionState = "active" | "suspended" | "expired";

export type BusinessSubscription = {
  state: SubscriptionState;

  startsAt: string;

  expiresAt: string;

  suspendedAt: string | null;

  plan: ServicePlan;
  nextPlan?: ServicePlan | null;

  monthlyPrice: number;
};

export type BusinessOwner = {
  /** Owner id — dùng cho đặt lại mật khẩu. */

  id: string;

  ownerCode: string;

  name: string;

  email: string;
};

/** Số liệu tổng hợp phục vụ tính phí (BR-07). */

export type BusinessUsage = {
  branchCount: number;

  accountCount: number;

  monthlyOrderCount: number;

  /** Hạn mức đang có hiệu lực (gói + mua thêm của kỳ hiện tại) — cùng phép tính với màn Gói của tôi (BE v17.1). */
  branchLimit?: number | null;
  accountLimit?: number | null;
  activeExtraBranches?: number;
  activeAccountPacks?: number;
  pendingInvitationCount?: number;
};

export type Business = {
  id: string;

  code: string;

  name: string;

  taxCode: string | null;

  createdAt: string;

  representativeName: string | null;

  representativeEmail: string | null;

  representativePhone: string | null;

  subscription: BusinessSubscription | null;

  owners: BusinessOwner[];

  usage: BusinessUsage;
};

export type PlanChangeDirection = "UPGRADE" | "DOWNGRADE";

export type RenewInput = { months: number; note?: string };

export type ChangePlanInput = {
  planId: string;
  direction: PlanChangeDirection;
  note?: string;
};

export type OwnerPasswordResetResult = { ownerId: string; expiresAt: string };

export type AdminOverviewMetrics = {
  registrations: Record<RegistrationStatus, number>;
  businesses: { total: number; paid: number; trial: number; expired: number; suspended: number };
  activePlans: number;
  mrr: number;
  revenueThisMonth: number;
  invoicesNeedReview: number;
  generatedAt: string;
};

export type PlatformRevenueGroupBy = "day" | "month" | "year";

export type PlatformRevenueReport = {
  range: { from: string; to: string; groupBy: PlatformRevenueGroupBy };
  summary: {
    revenue: number;
    invoiceCount: number;
    mrr: number;
    paidBusinesses: number;
    trialBusinesses: number;
    expiredBusinesses: number;
    suspendedBusinesses: number;
    trialConversionRate: number;
    unpaidInvoices: number;
    reviewInvoices: number;
    outstandingAmount: number;
    manualRenewals: number;
  };
  series: { period: string; revenue: number; invoiceCount: number }[];
  plans: { planId: string; planName: string; revenue: number; invoiceCount: number }[];
};

export type PlatformInvoiceStatus = "PENDING" | "PAID" | "FAILED" | "NEEDS_REVIEW";
export type PlatformInvoiceSource = "REGISTRATION" | "SUBSCRIPTION";

export type PlatformInvoice = {
  source: PlatformInvoiceSource;
  id: string;
  referenceCode: string;
  businessId: string | null;
  businessCode: string;
  businessName: string;
  planId: string;
  planName: string;
  amount: number;
  status: PlatformInvoiceStatus;
  paidAt: string | null;
  reviewReason: string | null;
  createdAt: string;
};
