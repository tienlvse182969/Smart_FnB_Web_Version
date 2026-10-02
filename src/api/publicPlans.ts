/**
 * Danh sách gói công khai cho Landing và form đăng ký.
 * TODO(BE): chưa có endpoint công khai (docs/api-contract-plan.md mục 7, việc #8) — tạm đọc từ cấu hình mock dùng chung với
 * plan mock và admin mock. Khi BE có `GET /public/service-plans` thì đổi hàm này sang gọi API, màn hình không phải sửa.
 */
import { FEATURE_KEYS, featuresForTier } from "../plan/tiers";
import type { FeatureKey, PlanTier } from "../types";
import { MOCK_PLAN_CATALOG } from "./mock/data/plans";

export interface PublicPlan {
  tier: PlanTier;
  code: string;
  name: string;
  monthlyPrice: number;
  maxBranches: number;
  maxAccounts: number;
  features: Record<FeatureKey, boolean>;
}

export function getPublicPlans(): PublicPlan[] {
  return MOCK_PLAN_CATALOG.map((p) => {
    const flags = featuresForTier(p.tier);
    return {
      ...p,
      features: Object.fromEntries(FEATURE_KEYS.map((k) => [k, flags[k].enabled])) as Record<FeatureKey, boolean>,
    };
  });
}
