/**
 * Gói dịch vụ của doanh nghiệp đang đăng nhập (đặc tả 13): cấp, hạn mức và mức đã dùng, tính năng, trạng thái,
 * ngày hết hạn.
 *
 * Mọi kiểm tra ở FE chỉ để BÁO SỚM và khoá giao diện; BE mới là nơi chặn thật (BR-08, BR-09).
 * Hạn mức lấy thật khi BE có; cờ tính năng/hạn dùng là mock tới khi BE trả (xem docs/api-contract-plan.md).
 */
import { useAppStore } from "../store";
import {
  PLAN_TIER_LABEL,
  type FeatureKey,
  type PlanInfo,
  type PlanLimit,
  type PlanStatus,
  type PlanTier,
  type QuotaResource,
} from "../types";

export interface PlanView {
  plan: PlanInfo | null;
  /** true khi chưa nạp xong phạm vi làm việc. */
  loading: boolean;
  tier: PlanTier | null;
  tierLabel: string | null;
  planName: string | null;
  status: PlanStatus | null;
  /** Hết hạn hoặc tạm ngưng — doanh nghiệp ở chế độ chỉ đọc (BR-09). */
  isExpired: boolean;
  /** ISO, null nếu chưa biết. */
  expiresAt: string | null;
  limits: PlanLimit[];
  limitOf: (resource: QuotaResource) => PlanLimit | undefined;
  /** Đã dùng hết hạn mức của `resource` (báo sớm — BE vẫn là nơi chặn thật). */
  isLimitReached: (resource: QuotaResource) => boolean;
  hasFeature: (feature: FeatureKey) => boolean;
  /** Tên cấp gói thấp nhất có tính năng, ví dụ "Nâng cao". */
  requiredTierLabel: (feature: FeatureKey) => string | null;
}

/** Phần thuần của hook — tách ra để test không cần React. */
export function describePlan(plan: PlanInfo | null, loading = false): PlanView {
  const limitOf = (resource: QuotaResource) => plan?.limits.find((l) => l.resource === resource);
  return {
    plan,
    loading,
    tier: plan?.tier ?? null,
    tierLabel: plan ? PLAN_TIER_LABEL[plan.tier] : null,
    planName: plan?.planName ?? null,
    status: plan?.status ?? null,
    isExpired: !!plan && plan.status !== "active",
    expiresAt: plan?.expiresAt ?? null,
    limits: plan?.limits ?? [],
    limitOf,
    isLimitReached: (resource) => {
      const limit = limitOf(resource);
      return !!limit && limit.remaining <= 0;
    },
    // Chưa biết gói (đang tải, hoặc Admin) thì không khoá: BE vẫn chặn nếu thật sự không có quyền.
    hasFeature: (feature) => (plan ? plan.features[feature].enabled : true),
    requiredTierLabel: (feature) => (plan ? PLAN_TIER_LABEL[plan.features[feature].requiredTier] : null),
  };
}

export function usePlan(): PlanView {
  const plan = useAppStore((s) => s.plan);
  const scopeStatus = useAppStore((s) => s.scopeStatus);
  return describePlan(plan, scopeStatus === "loading");
}
