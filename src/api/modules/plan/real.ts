import type { PlanInfo, PlanLimit, QuotaResource } from "../../../types";
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

    return {
      chainId,
      tier: base.tier,
      // Tên gói thật nếu BE có; không thì tên của cấp mock.
      planName: chain?.subscription?.plan.name ?? base.planName,
      status: base.status,
      expiresAt: base.expiresAt,
      limits,
      features: base.features,
      source: { limits: chain ? "real" : "mock", features: "mock" },
    };
  },
};
