/**
 * MỘT nguồn cấu hình gói (mock) dùng chung cho: hạn mức của module plan mock, danh sách gói của admin mock, và bảng giá
 * ở Landing (chưa có endpoint công khai — docs/api-contract-plan.md mục 7, việc #8).
 * Số liệu là ví dụ đặc tả 13.1; số thật do Admin cấu hình và BE trả về (CC-01).
 */
import { PLAN_TIER_LABEL, type PlanTier } from "../../../types";
import { TIER_CODE } from "../../../plan/tiers";

export interface MockPlanConfig {
  tier: PlanTier;
  code: string;
  name: string;
  monthlyPrice: number;
  maxBranches: number;
  maxAccounts: number;
}

const make = (tier: PlanTier, monthlyPrice: number, maxBranches: number, maxAccounts: number): MockPlanConfig => ({
  tier,
  code: TIER_CODE[tier],
  name: PLAN_TIER_LABEL[tier],
  monthlyPrice,
  maxBranches,
  maxAccounts,
});

export const MOCK_PLAN_CATALOG: MockPlanConfig[] = [
  make("BASIC", 300_000, 2, 10),
  make("STANDARD", 600_000, 5, 30),
  make("ADVANCED", 1_200_000, 10, 80),
];

export const MOCK_TIER_LIMITS: Record<PlanTier, { branches: number; accounts: number }> = {
  BASIC: { branches: MOCK_PLAN_CATALOG[0].maxBranches, accounts: MOCK_PLAN_CATALOG[0].maxAccounts },
  STANDARD: { branches: MOCK_PLAN_CATALOG[1].maxBranches, accounts: MOCK_PLAN_CATALOG[1].maxAccounts },
  ADVANCED: { branches: MOCK_PLAN_CATALOG[2].maxBranches, accounts: MOCK_PLAN_CATALOG[2].maxAccounts },
};
