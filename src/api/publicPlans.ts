/**
 * Danh sách gói công khai cho Landing và form đăng ký. `loadPublicPlans` đọc endpoint thật hoặc mock theo cờ module
 * admin; `getPublicPlans` giữ bản đồng bộ cho các phép kiểm thuần và fallback phát triển.
 */
import { FEATURE_KEYS, featuresForTier, tierFromCode } from "../plan/tiers";
import type { FeatureKey, PlanTier } from "../types";
import { MOCK_PLAN_CATALOG } from "./mock/data/plans";
import { adminApi } from "./modules/admin";

export interface PublicPlan {
  id: string;
  tier: PlanTier | null;
  code: string;
  name: string;
  monthlyPrice: number;
  maxBranches: number;
  maxAccounts: number;
  features: Record<FeatureKey, boolean>;
}

function fromServicePlan(plan: Awaited<ReturnType<typeof adminApi.listPublicPlans>>[number]): PublicPlan {
  const tier = tierFromCode(plan.code);
  return {
    id: plan.id,
    tier,
    code: plan.code,
    name: plan.name,
    monthlyPrice: plan.monthlyPrice,
    maxBranches: plan.maxBranches,
    maxAccounts: plan.maxAccounts,
    features: {
      branding: plan.brandingEnabled,
      multiBranchCompare: plan.multiBranchComparisonEnabled,
      // BE chưa có cờ AI; chỉ cờ này còn tạm suy từ cấp/mã gói.
      aiAssistant: tier ? featuresForTier(tier).aiAssistant.enabled : false,
    },
  };
}

export function getPublicPlans(): PublicPlan[] {
  return MOCK_PLAN_CATALOG.map((p, index) => {
    const flags = featuresForTier(p.tier);
    return {
      id: `mock-public-plan-${index + 1}`,
      ...p,
      features: Object.fromEntries(FEATURE_KEYS.map((k) => [k, flags[k].enabled])) as Record<FeatureKey, boolean>,
    };
  });
}

let publicPlansRequest: Promise<PublicPlan[]> | null = null;

/** Đọc các gói đang bán từ `GET /public/service-plans`; dùng chung một request cho các khối trên landing. */
export function loadPublicPlans(force = false): Promise<PublicPlan[]> {
  if (force || !publicPlansRequest) {
    publicPlansRequest = adminApi
      .listPublicPlans()
      .then((plans) => plans.map(fromServicePlan))
      .catch((error) => {
        publicPlansRequest = null;
        throw error;
      });
  }
  return publicPlansRequest;
}
