/**
 * Nguồn MOCK cho phần gói mà BE chưa có: cấp gói (tier), cờ tính năng, trạng thái và hạn dùng
 * (đặc tả 13). Kịch bản trong `mock/scenario` có thể ghi đè (panel dev) để thử BASIC/STANDARD/ADVANCED/hết hạn.
 * Dùng chung cho bản mock lẫn bản real của module plan (real chỉ thay phần hạn mức bằng số thật).
 */
import {
  PLAN_TIER_LABEL,
  PLAN_TIER_ORDER,
  type FeatureKey,
  type PlanFeature,
  type PlanStatus,
  type PlanTier,
} from "../../../types";
import { profileOf } from "../../mock/data/profiles";
import { getScenario } from "../../mock/scenario";

/** Cấp gói thấp nhất có từng tính năng (đặc tả 13.1). */
export const FEATURE_REQUIRED_TIER: Record<FeatureKey, PlanTier> = {
  branding: "STANDARD",
  multiBranchCompare: "STANDARD",
  aiAssistant: "ADVANCED",
};

/** Hạn mức mẫu của đặc tả 13.1 — chỉ là dữ liệu mock; số thật do Admin cấu hình và BE trả về (CC-01). */
export const MOCK_TIER_LIMITS: Record<PlanTier, { branches: number; accounts: number }> = {
  BASIC: { branches: 2, accounts: 10 },
  STANDARD: { branches: 5, accounts: 30 },
  ADVANCED: { branches: 10, accounts: 80 },
};

export function buildFeatures(tier: PlanTier): Record<FeatureKey, PlanFeature> {
  const rank = PLAN_TIER_ORDER.indexOf(tier);
  const make = (key: FeatureKey): PlanFeature => ({
    enabled: rank >= PLAN_TIER_ORDER.indexOf(FEATURE_REQUIRED_TIER[key]),
    requiredTier: FEATURE_REQUIRED_TIER[key],
  });
  return { branding: make("branding"), multiBranchCompare: make("multiBranchCompare"), aiAssistant: make("aiAssistant") };
}

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
    features: buildFeatures(tier),
  };
}
