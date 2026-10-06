import type { PlanInfo, PlanLimit, QuotaResource } from "../../../types";
import { PLAN_TIER_LABEL } from "../../../types";
import { effectiveTier, featuresForTier } from "../../../plan/tiers";
import { getScenario } from "../../mock/scenario";
import type { GetPlanOptions, PlanApi } from "./index";
import { mockPlanBase } from "./source";

const RESOURCES: QuotaResource[] = ["branches", "accounts"];

export const planReal: PlanApi = {
  async getPlan(chainId: string, options: GetPlanOptions = {}): Promise<PlanInfo> {
    const base = mockPlanBase();
    const chain = options.chains?.find((c) => c.id === chainId);
    const quotas = chain?.subscription?.quotas ?? [];
    const limits: PlanLimit[] = quotas
      .filter((q): q is typeof q & { resource: QuotaResource } => RESOURCES.includes(q.resource as QuotaResource))
      .map((q) => ({ resource: q.resource, used: q.used, limit: q.limit, remaining: q.remaining }));

    // Cấp suy từ MÃ gói thật theo quy ước tạm (plan/tiers.ts); mã lạ → coi như Cơ bản. Panel dev vẫn ghi đè được.
    const realPlan = chain?.subscription?.plan;
    const tier = getScenario().tier ?? (realPlan ? effectiveTier(realPlan.code) : base.tier);

    // Cờ tính năng: ưu tiên cờ BE lưu trên gói (nhận diện, so sánh đa chi nhánh); chỉ suy từ cấp khi BE không trả
    // (BE cũ) hoặc khi panel dev ghi đè cấp. Cờ AI chưa có ở BE → luôn suy từ mã gói (api-contract-plan #30).
    const features = featuresForTier(tier);
    const overridden = getScenario().tier !== null && getScenario().tier !== undefined;
    const hasBackendFlags = !!realPlan && typeof realPlan.brandingEnabled === "boolean" && typeof realPlan.multiBranchComparisonEnabled === "boolean";
    if (hasBackendFlags && !overridden) {
      features.branding = { ...features.branding, enabled: realPlan.brandingEnabled === true };
      features.multiBranchCompare = { ...features.multiBranchCompare, enabled: realPlan.multiBranchComparisonEnabled === true };
    }

    return {
      chainId,
      tier,
      // Tên gói thật nếu BE có; không thì tên của cấp.
      planName: realPlan?.name ?? PLAN_TIER_LABEL[tier],
      // BE KHÔNG trả trạng thái và ngày hết hạn (#38): không lấy giá trị mock ở real (quyết định 36). Chỉ ô "Hết hạn" của panel dev
      // (ghi đè tường minh, như `tier`) mới đổi `status` để thử chế độ chỉ đọc; ngày hết hạn luôn null.
      status: getScenario().expired ? "expired" : null,
      expiresAt: null,
      // Chuỗi đã đọc được mà `subscription = null` (`branches.service.ts:203`: `getActivePlan` ném 403 khi hết hạn/tạm ngưng/chưa có, rồi `.catch(() => null)`).
      noActivePlan: !!chain && chain.subscription === null,
      limits,
      features,
      // Hai cờ là thật khi BE trả; cờ AI vẫn suy từ mã nên cả khối ghi "real" chỉ khi có cờ BE.
      source: { limits: chain ? "real" : "mock", features: hasBackendFlags && !overridden ? "real" : "mock" },
    };
  },
};
