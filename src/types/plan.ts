/**
 * Gói dịch vụ của doanh nghiệp: cấp (tier), hạn mức, tính năng, trạng thái (đặc tả v9 mục 13).
 *
 * Số liệu gói (giá, hạn mức) là cấu hình của Admin (CC-01) nên FE KHÔNG viết cứng — chỉ đọc từ API.
 * Shape này là hợp đồng giữa web và BE; xem docs/api-contract-plan.md.
 */

export type PlanTier = "BASIC" | "STANDARD" | "ADVANCED";

/** Thứ tự tăng dần của các cấp, dùng để so sánh "có đủ cấp không". */
export const PLAN_TIER_ORDER: PlanTier[] = ["BASIC", "STANDARD", "ADVANCED"];

/** Tên hiển thị tiếng Việt của cấp gói (đặc tả 13.1). */
export const PLAN_TIER_LABEL: Record<PlanTier, string> = {
  BASIC: "Cơ bản",
  STANDARD: "Tiêu chuẩn",
  ADVANCED: "Nâng cao",
};

/** Tính năng bị khoá theo gói (đặc tả 13.1, 13.4). */
export type FeatureKey = "branding" | "multiBranchCompare" | "aiAssistant";

export interface PlanFeature {
  enabled: boolean;
  /** Cấp gói thấp nhất có tính năng này — dùng cho thẻ khoá "Nâng cấp lên …". */
  requiredTier: PlanTier;
}

export type PlanStatus = "active" | "expired" | "suspended";

export type QuotaResource = "branches" | "accounts";

export interface PlanLimit {
  resource: QuotaResource;
  used: number;
  limit: number;
  remaining: number;
}

/** Nguồn của từng nhóm dữ liệu, để màn hình/ghi chú biết cái nào còn là mock. */
export type PlanDataSource = "real" | "mock";

export interface PlanInfo {
  chainId: string;
  tier: PlanTier;
  /** Tên gói do Admin đặt. */
  planName: string;
  /** Trạng thái gói; `null` = máy chủ chưa trả (real, api-contract-plan #38) — KHÔNG coi là hết hạn, BE vẫn chặn thật. */
  status: PlanStatus | null;
  /** Ngày hết hạn (ISO) — null nếu chưa biết (real: BE chưa trả, #38). */
  expiresAt: string | null;
  /**
   * Chỉ Manager (real): lỗi khi đọc `GET /restaurant-chains/:chainId/subscription` (quyết định 53). KHÔNG chặn khu vực làm việc; `limits` rỗng,
   * `status` và `expiresAt` null, cờ tính năng suy như trước. Màn hiện "Chưa tải được hạn mức gói" kèm nút Thử lại nhỏ.
   */
  subscriptionUnavailable?: boolean;
  /** Real: BE không trả gói đang hoạt động (`subscription = null`: hết hạn, tạm ngưng hoặc chưa có) — quyết định 38. */
  noActivePlan?: boolean;
  limits: PlanLimit[];
  features: Record<FeatureKey, PlanFeature>;
  /** CHỜ BE: tới khi BE trả cờ tính năng/hạn dùng thì `features`, `tier`, `expiresAt`, `status` là mock. */
  source: { limits: PlanDataSource; features: PlanDataSource };
}
