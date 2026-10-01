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

    return {
      chainId,
      tier,
      // Tên gói thật nếu BE có; không thì tên của cấp.
      planName: realPlan?.name ?? PLAN_TIER_LABEL[tier],
      status: base.status,
      expiresAt: base.expiresAt,
      limits,
      features: featuresForTier(tier),
      source: { limits: chain ? "real" : "mock", features: "mock" },
    };
  },
};
