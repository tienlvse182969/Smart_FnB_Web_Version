import type {
  ApiBranch,
  ApiBranchDetail,
  ApiBranchStatus,
  ApiChain,
  ApiPlan,
  CreateBranchInput,
  UpdateBranchInput,
} from "../../../types";
import { ApiError } from "../../http/errors";
import { mockDelay } from "../../mock/control";
import { MOCK_PROFILES, profileOf, toApiBranch } from "../../mock/data/profiles";
import { getScenario } from "../../mock/scenario";
import { genId, nowISO } from "../../mock/util";
import { MOCK_TIER_LIMITS, mockPlanBase } from "../plan/source";
import type { BranchApi } from "./index";

/** Chi nhánh mock theo (doanh nghiệp mock, chuỗi): chi nhánh gốc từ hồ sơ + chi nhánh tạo thêm. */
const created = new Map<string, ApiBranch[]>();
const statusOverride = new Map<string, ApiBranchStatus>();
const patched = new Map<string, Partial<ApiBranch>>();

function chainIdsForScenario(): string[] {
  return [profileOf(getScenario().profile).chainId];
}

function branchesOfChain(chainId: string): ApiBranch[] {
  const profile = profileOf(getScenario().profile);
  const base = chainId === profile.chainId ? profile.branches.map((s, i) => toApiBranch(profile, s, i)) : [];
  const extra = created.get(`${profile.id}:${chainId}`) ?? [];
  return [...base, ...extra].map((b) => ({
    ...b,
    ...patched.get(b.id),
    status: statusOverride.get(b.id) ?? b.status,
  }));
}

function allBranches(): ApiBranch[] {
  return chainIdsForScenario().flatMap(branchesOfChain);
}

function findBranch(branchId: string): ApiBranch {
  const found = allBranches().find((b) => b.id === branchId);
  if (!found) throw new ApiError(404, "Chi nhánh không tồn tại");
  return found;
}

function planOf(): ApiPlan {
  const base = mockPlanBase();
  const caps = MOCK_TIER_LIMITS[base.tier];
  return {
    id: `mock-plan-${base.tier.toLowerCase()}`,
    code: base.tier,
    name: base.planName,
    description: null,
    monthlyPrice: "0.00",
    maxBranches: caps.branches,
    maxAccounts: caps.accounts,
    maxTables: 0,
  };
}

function toChain(chainId: string): ApiChain {
  const profile = Object.values(MOCK_PROFILES).find((p) => p.chainId === chainId) ?? profileOf(getScenario().profile);
  const branches = branchesOfChain(chainId);
  const plan = planOf();
  return {
    id: chainId,
    code: profile.code,
    name: profile.name,
    logoUrl: null,
    email: null,
    phone: null,
    website: null,
    taxCode: null,
    headquartersAddress: null,
    timezone: "Asia/Ho_Chi_Minh",
    currency: "VND",
    status: "ACTIVE",
    createdAt: nowISO(),
    updatedAt: nowISO(),
    _count: { branches: branches.length },
    subscription: {
      plan,
      quotas: [
        { resource: "branches", used: branches.length, limit: plan.maxBranches, remaining: Math.max(0, plan.maxBranches - branches.length) },
      ],
    },
  };
}

export const branchMock: BranchApi = {
  async listChains() {
    await mockDelay();
    return chainIdsForScenario().map(toChain);
  },

  async listBranches(chainId) {
    await mockDelay();
    return chainId ? branchesOfChain(chainId) : allBranches();
  },

  async getBranch(branchId): Promise<ApiBranchDetail> {
    await mockDelay();
    return {
      ...findBranch(branchId),
      operatingHours: [1, 2, 3, 4, 5, 6, 0].map((d) => ({ dayOfWeek: d, openTime: "07:00", closeTime: "22:00" })),
      specialHours: [],
      areas: [],
    };
  },

  async createBranch(chainId, input: CreateBranchInput) {
    await mockDelay();
    // BE mới là nơi chặn thật (BR-08); mock mô phỏng đúng mã lỗi để màn hình thử được đường báo lỗi.
    const base = mockPlanBase();
    if (base.status !== "active") {
      throw new ApiError(403, "Doanh nghiệp đang ở chế độ chỉ đọc.", [], "SUBSCRIPTION_READ_ONLY");
    }
    const plan = planOf();
    const count = branchesOfChain(chainId).length;
    if (count >= plan.maxBranches) {
      throw new ApiError(
        409,
        `Gói ${plan.name} chỉ cho phép ${plan.maxBranches} chi nhánh.`,
        [],
        "PLAN_LIMIT_REACHED",
        { quota: { resource: "branches", used: count, limit: plan.maxBranches, remaining: 0 }, currentPlan: plan },
      );
    }
    const profile = profileOf(getScenario().profile);
    const now = nowISO();
    const branch: ApiBranch = {
      id: genId("mock-branch"),
      chainId,
      code: input.code,
      name: input.name,
      phone: input.phone ?? null,
      email: input.email ?? null,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2 ?? null,
      ward: input.ward ?? null,
      district: null,
      city: input.city,
      country: "VN",
      timezone: "Asia/Ho_Chi_Minh",
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
      chain: { id: chainId, code: profile.code, name: profile.name, status: "ACTIVE" },
    };
    const key = `${profile.id}:${chainId}`;
    created.set(key, [...(created.get(key) ?? []), branch]);
    return branch;
  },

  async updateBranch(branchId, input: UpdateBranchInput) {
    await mockDelay();
    const current = findBranch(branchId);
    patched.set(branchId, { ...patched.get(branchId), ...input, updatedAt: nowISO() });
    return { ...current, ...input } as ApiBranch;
  },

  async updateBranchStatus(branchId, status) {
    await mockDelay();
    const current = findBranch(branchId);
    statusOverride.set(branchId, status);
    return { ...current, status };
  },
};
