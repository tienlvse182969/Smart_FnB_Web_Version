/**
 * Nguồn MOCK cho phần gói mà BE chưa có: cấp gói (tier), cờ tính năng, trạng thái và hạn dùng
 * (đặc tả 13). Kịch bản trong `mock/scenario` có thể ghi đè (panel dev) để thử BASIC/STANDARD/ADVANCED/hết hạn.
 * Dùng chung cho bản mock lẫn bản real của module plan (real chỉ thay phần hạn mức bằng số thật).
 */
import { PLAN_TIER_LABEL, type FeatureKey, type PlanFeature, type PlanStatus, type PlanTier } from "../../../types";
import { featuresForTier } from "../../../plan/tiers";
import { profileOf } from "../../mock/data/profiles";
import { getScenario } from "../../mock/scenario";

// Quy ước cấp ↔ cờ tính năng và cấu hình gói mẫu dùng chung — xem plan/tiers.ts và mock/data/plans.ts.
export { FEATURE_REQUIRED_TIER, featuresForTier as buildFeatures } from "../../../plan/tiers";
export { MOCK_TIER_LIMITS } from "../../mock/data/plans";

const DAY_MS = 86_400_000;

export interface MockPlanBase {
  tier: PlanTier;
  planName: string;
  status: PlanStatus;
  expiresAt: string;
  features: Record<FeatureKey, PlanFeature>;
}

export function mockPlanBase(): MockPlanBase {
  const scenario = getScenario();
  const tier = scenario.tier ?? profileOf(scenario.profile).defaultTier;
  const expired = scenario.expired;
  return {
    tier,
    planName: PLAN_TIER_LABEL[tier],
    status: expired ? "expired" : "active",
    expiresAt: new Date(Date.now() + (expired ? -5 : 21) * DAY_MS).toISOString(),
    features: featuresForTier(tier),
  };
}
