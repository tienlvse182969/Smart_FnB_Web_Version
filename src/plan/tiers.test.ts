import { afterEach, describe, expect, it } from "vitest";
import type { ApiChain } from "../types";
import { setScenario } from "../api/mock/scenario";
import { planReal } from "../api/modules/plan/real";
import { getPublicPlans } from "../api/publicPlans";
import { MOCK_PLAN_CATALOG, MOCK_TIER_LIMITS } from "../api/mock/data/plans";
import { describePlan } from "./usePlan";
import { effectiveTier, featuresForTier, suggestPlanCode, tierFromCode } from "./tiers";

const chainWithPlan = (code: string): ApiChain =>
  ({
    id: "c",
    subscription: { plan: { code, name: `Gói ${code}` }, quotas: [{ resource: "branches", used: 1, limit: 2, remaining: 1 }] },
  }) as unknown as ApiChain;

describe("quy ước cấp gói theo mã", () => {
  it("BASIC / STANDARD / ADVANCED ↔ cấp; không phân biệt hoa thường", () => {
    expect(tierFromCode("BASIC")).toBe("BASIC");
    expect(tierFromCode("standard")).toBe("STANDARD");
    expect(tierFromCode(" ADVANCED ")).toBe("ADVANCED");
  });

  it("mã ngoài ba mã → chưa xếp cấp, coi như Cơ bản", () => {
    expect(tierFromCode("DEMO_OPERATIONS")).toBeNull();
    expect(tierFromCode(undefined)).toBeNull();
    expect(effectiveTier("DEMO_OPERATIONS")).toBe("BASIC");
    expect(Object.values(featuresForTier(effectiveTier("LEGACY"))).every((f) => !f.enabled)).toBe(true);
  });

  it("cờ tính năng theo bảng đặc tả 13.1", () => {
    const on = (t: Parameters<typeof featuresForTier>[0]) => Object.entries(featuresForTier(t)).filter(([, f]) => f.enabled).map(([k]) => k);
    expect(on("BASIC")).toEqual([]);
    expect(on("STANDARD")).toEqual(["branding", "multiBranchCompare"]);
    expect(on("ADVANCED")).toEqual(["branding", "multiBranchCompare", "aiAssistant"]);
  });

  it("gợi ý mã từ tên: ba tên chuẩn ra ba mã cấp, tên khác ra chữ hoa không dấu", () => {
    expect(suggestPlanCode("Cơ bản")).toBe("BASIC");
    expect(suggestPlanCode("Tiêu chuẩn")).toBe("STANDARD");
    expect(suggestPlanCode("Nâng cao")).toBe("ADVANCED");
    expect(suggestPlanCode("Gói Đặc Biệt 2026")).toBe("GOI_DAC_BIET_2026");
    expect(suggestPlanCode("   ")).toBe("");
  });
});

describe("usePlan/FeatureGate dùng chung một nguồn với quy ước", () => {
  afterEach(() => setScenario({ profile: "A", tier: null, expired: false }));

  it("plan real: cấp suy từ mã gói thật → cờ tính năng", async () => {
    setScenario({ tier: null });
    const standard = await planReal.getPlan("c", { chains: [chainWithPlan("STANDARD")] });
    expect(standard.tier).toBe("STANDARD");
    expect(describePlan(standard).hasFeature("branding")).toBe(true);
    expect(describePlan(standard).hasFeature("aiAssistant")).toBe(false);
    const unknown = await planReal.getPlan("c", { chains: [chainWithPlan("DEMO_OPERATIONS")] });
    expect(unknown.tier).toBe("BASIC");
    expect(describePlan(unknown).hasFeature("branding")).toBe(false);
  });

  it("panel dev vẫn ghi đè được cấp", async () => {
    setScenario({ tier: "ADVANCED" });
    expect((await planReal.getPlan("c", { chains: [chainWithPlan("BASIC")] })).tier).toBe("ADVANCED");
  });
});

describe("một nguồn cấu hình gói mock", () => {
  it("hạn mức của plan mock và bảng giá Landing cùng đọc từ MOCK_PLAN_CATALOG", () => {
    const pub = getPublicPlans();
    expect(pub.map((p) => p.name)).toEqual(["Cơ bản", "Tiêu chuẩn", "Nâng cao"]);
    for (const p of pub) {
      expect(p.maxBranches).toBe(MOCK_TIER_LIMITS[p.tier].branches);
      expect(p.maxAccounts).toBe(MOCK_TIER_LIMITS[p.tier].accounts);
      expect(MOCK_PLAN_CATALOG.some((c) => c.code === p.code)).toBe(true);
    }
    expect(pub[2].features.aiAssistant).toBe(true);
    expect(pub[0].features.branding).toBe(false);
  });
});
