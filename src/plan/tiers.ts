/**
 * Quy ước TẠM về cấp gói và cờ tính năng, dùng chung cho `usePlan`/`FeatureGate`, bản real của module plan, màn hình
 * quản lý gói của Admin và Landing — MỘT nguồn duy nhất.
 *
 * Quy ước: mã gói (`code`) BASIC / STANDARD / ADVANCED ứng với Cơ bản / Tiêu chuẩn / Nâng cao. Cờ tính năng suy ra
 * từ cấp theo bảng đặc tả 13.1. CHỜ BE: BE chưa có cột cấp (`tier`) và cờ tính năng trên gói (docs/api-contract-plan.md,
 * mục 2 và 7); khi có thì bỏ file này và đọc thẳng từ API.
 */
import {
  PLAN_TIER_ORDER,
  type FeatureKey,
  type PlanFeature,
  type PlanTier,
} from "../types";

/** Cấp gói thấp nhất có từng tính năng (đặc tả 13.1). */
export const FEATURE_REQUIRED_TIER: Record<FeatureKey, PlanTier> = {
  branding: "STANDARD",
  multiBranchCompare: "STANDARD",
  aiAssistant: "ADVANCED",
};

export const FEATURE_KEYS = Object.keys(FEATURE_REQUIRED_TIER) as FeatureKey[];

/** Mã gói ↔ cấp. */
export const TIER_CODE: Record<PlanTier, string> = {
  BASIC: "BASIC",
  STANDARD: "STANDARD",
  ADVANCED: "ADVANCED",
};

/** Cấp của một mã gói; mã ngoài ba mã trên → null ("Chưa xếp cấp"). */
export function tierFromCode(code: string | null | undefined): PlanTier | null {
  const upper = code?.trim().toUpperCase();
  return PLAN_TIER_ORDER.find((tier) => TIER_CODE[tier] === upper) ?? null;
}

/** Cấp dùng để quyết định tính năng: gói chưa xếp cấp được coi như Cơ bản. */
export function effectiveTier(code: string | null | undefined): PlanTier {
  return tierFromCode(code) ?? "BASIC";
}

export function featuresForTier(tier: PlanTier): Record<FeatureKey, PlanFeature> {
  const rank = PLAN_TIER_ORDER.indexOf(tier);
  const make = (key: FeatureKey): PlanFeature => ({
    enabled: rank >= PLAN_TIER_ORDER.indexOf(FEATURE_REQUIRED_TIER[key]),
    requiredTier: FEATURE_REQUIRED_TIER[key],
  });
  return { branding: make("branding"), multiBranchCompare: make("multiBranchCompare"), aiAssistant: make("aiAssistant") };
}

/** Gợi ý mã gói từ tên: ba tên chuẩn ra đúng ba mã cấp; tên khác → chữ hoa không dấu nối bằng `_`. */
export function suggestPlanCode(name: string): string {
  const folded = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .trim()
    .toLowerCase();
  const known: Record<string, PlanTier> = { "co ban": "BASIC", "tieu chuan": "STANDARD", "nang cao": "ADVANCED" };
  if (known[folded]) return TIER_CODE[known[folded]];
  return folded.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
}
