import type { PlanInfo, PlanLimit } from "../../../types";
import { mockDelay } from "../../mock/control";
import { accountApi } from "../account";
import { branchApi } from "../branch";
import type { PlanApi } from "./index";
import { MOCK_TIER_LIMITS, mockPlanBase } from "./source";

export const planMock: PlanApi = {
  async getPlan(chainId: string): Promise<PlanInfo> {
    await mockDelay();
    const base = mockPlanBase();
    const caps = MOCK_TIER_LIMITS[base.tier];
    const [branches, accounts] = await Promise.all([
      branchApi.listBranches(chainId),
      accountApi.countAccounts(chainId),
    ]);
    const limit = (resource: PlanLimit["resource"], used: number, cap: number): PlanLimit => ({
      resource,
      used,
      limit: cap,
      remaining: Math.max(0, cap - used),
    });
    return {
      chainId,
      tier: base.tier,
      planName: base.planName,
      status: base.status,
      expiresAt: base.expiresAt,
      limits: [limit("branches", branches.length, caps.branches), limit("accounts", accounts, caps.accounts)],
      features: base.features,
      source: { limits: "mock", features: "mock" },
    };
  },
};
