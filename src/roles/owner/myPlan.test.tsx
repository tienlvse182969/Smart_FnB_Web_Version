import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { planMock } from "../../api/modules/plan/mock";
import { planReal } from "../../api/modules/plan/real";
import { mockControl } from "../../api/mock/control";
import { setScenario } from "../../api/mock/scenario";
import { resetMockStates } from "../../api/mock/store";
import { branchMock } from "../../api/modules/branch/mock";
import { FEATURE_KEYS, FEATURE_REQUIRED_TIER } from "../../plan/tiers";
import { useAppStore } from "../../store";
import type { ApiChain, PlanInfo } from "../../types";
import MyPlan, { FEATURE_LABEL, PLAN_CONTACT_TEXT, STATUS_LABEL } from "./MyPlan";

mockControl.latency = [0, 0];
mockControl.failure = null;

const chainOf = (subscription: unknown) => ({ id: "c1", subscription }) as unknown as ApiChain;
const subscription = (over: Record<string, unknown> = {}) => ({
  status: "ACTIVE",
  expiresAt: "2026-11-30T16:59:59.000Z", // 23:59:59 ngày 30/11/2026 giờ Việt Nam
  plan: { name: "Gói Demo", code: "DEMO", brandingEnabled: true, multiBranchComparisonEnabled: false },
  quotas: [
    { resource: "branches", used: 2, limit: 2, remaining: 0 },
    { resource: "accounts", used: 3, limit: 10, remaining: 7 },
    { resource: "tables", used: 0, limit: 5, remaining: 5 },
  ],
  ...over,
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

describe("tên tính năng và nhãn trạng thái", () => {
  it("có tên tiếng Việt cho mọi cờ gói của web (FEATURE_REQUIRED_TIER)", () => {
    expect(Object.keys(FEATURE_LABEL).sort()).toEqual([...FEATURE_KEYS].sort());
    expect(Object.keys(FEATURE_REQUIRED_TIER).sort()).toEqual(Object.keys(FEATURE_LABEL).sort());
    for (const label of Object.values(FEATURE_LABEL)) expect(label).toMatch(/[A-Za-zÀ-ỹ]/);
  });

  it("nhãn tiếng Việt cho ĐỦ giá trị enum BusinessSubscriptionStatus của BE (ACTIVE, SUSPENDED, EXPIRED)", () => {
    expect(STATUS_LABEL).toEqual({ active: "Đang hoạt động", suspended: "Tạm ngưng", expired: "Đã hết hạn" });
  });
});

describe("màn Gói của tôi (dữ liệu thật, quyết định 52)", () => {
  it("real ACTIVE: tên gói, 'Đang hoạt động', ngày hết hạn dd/MM/yyyy giờ Việt Nam, hạn mức (chạm hạn mức có nhãn), tính năng theo cờ BE, không còn câu 'chờ BE #38'", async () => {
    show(await planReal.getPlan("c1", { chains: [chainOf(subscription())] }));
    expect(text("myplan-name")).toBe("Gói Demo");
    expect(text("myplan-status")).toBe("Đang hoạt động");
    expect(text("myplan-expiry")).toBe("30/11/2026");
    expect(document.body.textContent).not.toMatch(/chờ BE #38|Chưa có dữ liệu từ máy chủ \(chờ BE #38\)/);
    expect(text("myplan-limit-branches")).toContain("Đã dùng 2 / 2");
    expect(screen.getByTestId("myplan-limit-warn-branches")).toBeTruthy();
    expect(text("myplan-limit-accounts")).toContain("Đã dùng 3 / 10");
    expect(screen.queryByTestId("myplan-limit-warn-accounts")).toBeNull();
    expect(screen.getByTestId("myplan-feature-branding").getAttribute("data-enabled")).toBe("true");
    expect(screen.getByTestId("myplan-feature-multiBranchCompare").getAttribute("data-enabled")).toBe("false");
    expect(screen.getByTestId("myplan-feature-aiAssistant").getAttribute("data-enabled")).toBe("unknown"); // BE chưa trả cờ AI
    expect(text("myplan-contact")).toBe(PLAN_CONTACT_TEXT);
    expect(screen.queryAllByRole("button")).toHaveLength(0); // không có nút gia hạn/đổi gói (quyết định 37)
  });

  it("ngày hết hạn quy về giờ Việt Nam: 2099-12-31T23:59:59.999Z (UTC) hiện 01/01/2100", async () => {
    show(await planReal.getPlan("c1", { chains: [chainOf(subscription({ expiresAt: "2099-12-31T23:59:59.999Z" }))] }));
    expect(text("myplan-expiry")).toBe("01/01/2100");
  });

  it("EXPIRED và SUSPENDED: nhãn 'Đã hết hạn' / 'Tạm ngưng' (BE vẫn trả gói, không phải khối 'không có gói')", async () => {
    for (const [raw, label] of [["EXPIRED", "Đã hết hạn"], ["SUSPENDED", "Tạm ngưng"]] as const) {
      const { unmount } = show(await planReal.getPlan("c1", { chains: [chainOf(subscription({ status: raw }))] }));
      expect(text("myplan-status")).toBe(label);
      expect(screen.queryByTestId("myplan-none")).toBeNull();
      unmount();
    }
  });

  it("BE cũ không có status/expiresAt: hiện '—', không bịa giá trị", async () => {
    show(await planReal.getPlan("c1", { chains: [chainOf(subscription({ status: undefined, expiresAt: undefined }))] }));
    expect(text("myplan-status")).toBe("—");
    expect(text("myplan-expiry")).toBe("—");
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
    expect(text("myplan-expiry")).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(screen.getByTestId("myplan-feature-branding").getAttribute("data-enabled")).toBe("false");
    expect(screen.getByTestId("myplan-feature-aiAssistant").getAttribute("data-enabled")).toBe("false");
  });
});
