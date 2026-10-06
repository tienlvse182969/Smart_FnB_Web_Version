import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { planMock } from "../../api/modules/plan/mock";
import { planReal } from "../../api/modules/plan/real";
import { mockControl } from "../../api/mock/control";
import { setScenario } from "../../api/mock/scenario";
import { resetMockStates } from "../../api/mock/store";
import { branchMock } from "../../api/modules/branch/mock";
import { describePlan } from "../../plan/usePlan";
import { FEATURE_KEYS, FEATURE_REQUIRED_TIER } from "../../plan/tiers";
import { useAppStore } from "../../store";
import type { ApiChain, PlanInfo } from "../../types";
import MyPlan, { FEATURE_LABEL, PLAN_CONTACT_TEXT, PLAN_PENDING_TEXT } from "./MyPlan";

mockControl.latency = [0, 0];
mockControl.failure = null;

const chainOf = (subscription: unknown) => ({ id: "c1", subscription }) as unknown as ApiChain;
const subscription = (flags: object = { brandingEnabled: true, multiBranchComparisonEnabled: false }) => ({
  plan: { name: "Gói Demo", code: "DEMO", ...flags },
  quotas: [
    { resource: "branches", used: 2, limit: 2, remaining: 0 },
    { resource: "accounts", used: 3, limit: 10, remaining: 7 },
    { resource: "tables", used: 0, limit: 5, remaining: 5 },
  ],
});
const show = (plan: PlanInfo | null) => {
  act(() => useAppStore.setState({ plan, scopeStatus: "ready" }));
  return render(<MyPlan />);
};
const text = (id: string) => screen.getByTestId(id).textContent ?? "";

beforeEach(() => {
  setScenario({ profile: "A", tier: null, expired: false });
  resetMockStates();
});
afterEach(() => act(() => useAppStore.setState({ plan: null, scopeStatus: "idle" })));

describe("planReal: ngày hết hạn và trạng thái (quyết định 36)", () => {
  it("BE không trả → status và expiresAt là null, KHÔNG lấy giá trị mock; subscription có thì noActivePlan=false", async () => {
    const plan = await planReal.getPlan("c1", { chains: [chainOf(subscription())] });
    expect(plan.status).toBeNull();
    expect(plan.expiresAt).toBeNull();
    expect(plan.noActivePlan).toBe(false);
    expect(plan.planName).toBe("Gói Demo");
    expect(plan.limits.map((l) => l.resource)).toEqual(["branches", "accounts"]);
    expect(describePlan(plan).isExpired).toBe(false); // null không phải hết hạn
  });

  it("subscription null → noActivePlan=true; không có chuỗi (Manager) → không đánh dấu", async () => {
    expect((await planReal.getPlan("c1", { chains: [chainOf(null)] })).noActivePlan).toBe(true);
    expect((await planReal.getPlan("c1")).noActivePlan).toBe(false);
  });

  it("ô Hết hạn của panel dev vẫn thử được chế độ chỉ đọc ở real, ngày hết hạn vẫn null", async () => {
    setScenario({ expired: true });
    const plan = await planReal.getPlan("c1", { chains: [chainOf(subscription())] });
    expect(plan.status).toBe("expired");
    expect(plan.expiresAt).toBeNull();
    expect(describePlan(plan).isExpired).toBe(true);
  });
});

describe("tên tính năng", () => {
  it("có tên tiếng Việt cho mọi cờ gói của web (FEATURE_REQUIRED_TIER)", () => {
    expect(Object.keys(FEATURE_LABEL).sort()).toEqual([...FEATURE_KEYS].sort());
    expect(Object.keys(FEATURE_REQUIRED_TIER).sort()).toEqual(Object.keys(FEATURE_LABEL).sort());
    for (const label of Object.values(FEATURE_LABEL)) expect(label).toMatch(/[A-Za-zÀ-ỹ]/);
  });
});

describe("màn Gói của tôi", () => {
  it("real: tên gói, hạn mức đã dùng/tối đa (chạm hạn mức có nhãn), tính năng theo cờ BE, hết hạn ghi đúng câu quyết định 36", async () => {
    show(await planReal.getPlan("c1", { chains: [chainOf(subscription())] }));
    expect(text("myplan-name")).toBe("Gói Demo");
    expect(text("myplan-expiry")).toBe(PLAN_PENDING_TEXT);
    expect(text("myplan-status")).toBe(PLAN_PENDING_TEXT);
    expect(PLAN_PENDING_TEXT).toBe("Chưa có dữ liệu từ máy chủ (chờ BE #38)");
    expect(text("myplan-limit-branches")).toContain("Đã dùng 2 / 2");
    expect(screen.getByTestId("myplan-limit-warn-branches")).toBeTruthy(); // chạm hạn mức
    expect(text("myplan-limit-accounts")).toContain("Đã dùng 3 / 10");
    expect(screen.queryByTestId("myplan-limit-warn-accounts")).toBeNull();
    expect(screen.getByTestId("myplan-feature-branding").getAttribute("data-enabled")).toBe("true");
    expect(screen.getByTestId("myplan-feature-multiBranchCompare").getAttribute("data-enabled")).toBe("false");
    expect(screen.getByTestId("myplan-feature-aiAssistant").getAttribute("data-enabled")).toBe("unknown"); // BE chưa trả cờ AI
    expect(text("myplan-contact")).toBe(PLAN_CONTACT_TEXT);
    expect(screen.queryAllByRole("button")).toHaveLength(0); // không có nút gia hạn/đổi gói (quyết định 37)
  });

  it("subscription null → khối 'Không có gói đang hoạt động' + câu liên hệ, không nút nào (quyết định 38)", async () => {
    show(await planReal.getPlan("c1", { chains: [chainOf(null)] }));
    expect(text("myplan-none")).toContain("Không có gói đang hoạt động");
    expect(text("myplan-contact")).toBe("Liên hệ quản trị nền tảng để đổi gói hoặc gia hạn.");
    expect(screen.queryByTestId("myplan-name")).toBeNull();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("mock giữ như cũ: có ngày hết hạn và trạng thái, đủ 3 tính năng có/chưa có", async () => {
    const chainId = (await branchMock.listChains())[0].id;
    setScenario({ tier: "BASIC" });
    show(await planMock.getPlan(chainId));
    expect(text("myplan-status")).toBe("Đang hoạt động");
    expect(text("myplan-expiry")).toMatch(/\d/);
    expect(text("myplan-expiry")).not.toContain("chờ BE");
    expect(screen.getByTestId("myplan-feature-branding").getAttribute("data-enabled")).toBe("false");
    expect(screen.getByTestId("myplan-feature-aiAssistant").getAttribute("data-enabled")).toBe("false");
  });
});
