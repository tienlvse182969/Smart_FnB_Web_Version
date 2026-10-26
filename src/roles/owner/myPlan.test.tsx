import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { App as AntApp } from "antd";
import { platformBillingApi, type SubscriptionCheckout } from "../../api/platformBilling";
import { planMock } from "../../api/modules/plan/mock";
import { planReal } from "../../api/modules/plan/real";
import { mockControl } from "../../api/mock/control";
import { setScenario } from "../../api/mock/scenario";
import { resetMockStates } from "../../api/mock/store";
import { branchMock } from "../../api/modules/branch/mock";
import { FEATURE_KEYS, FEATURE_REQUIRED_TIER } from "../../plan/tiers";
import { useAppStore } from "../../store";
import type { ApiChain, PlanInfo } from "../../types";
import { adminApi } from "../../api";
import { vi } from "vitest";
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

describe("màn Gói của tôi — gói dùng thử (lượt 10.2)", () => {
  const trialSub = (over: Record<string, unknown> = {}) =>
    subscription({ plan: { name: "Dùng thử 14 ngày", code: "TRIAL", brandingEnabled: false, multiBranchComparisonEnabled: false }, expiresAt: "2099-11-30T16:59:59.000Z", ...over });
  const showTrial = async (over: Record<string, unknown> = {}) => show(await planReal.getPlan("c1", { chains: [chainOf(trialSub(over))] }));

  beforeEach(() => {
    vi.spyOn(adminApi, "listPublicPlans").mockResolvedValue([{ id: "p1", code: "BASIC", name: "Cơ bản", monthlyPrice: 300000, maxBranches: 2, maxAccounts: 10, isActive: true }] as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it("tên 'Dùng thử miễn phí' thay cho tên BE; dòng phụ chỉ 'Hạn mức như gói Cơ bản'; ngày hết hạn chỉ hiện MỘT lần (dòng 'Hết hạn'); hạn mức vẫn đọc từ BE", async () => {
    await showTrial();
    expect(text("myplan-expiry")).toBe("30/11/2099");
    expect(document.body.textContent?.split("30/11/2099")).toHaveLength(2); // đúng một lần
    expect(text("myplan-name")).toBe("Dùng thử miễn phí");
    expect(text("myplan-trial-note")).toBe("Hạn mức như gói Cơ bản");
    expect(text("myplan-limit-branches")).toContain("Đã dùng 2 / 2");
    expect(await screen.findByTestId("myplan-upgrade")).toBeTruthy();
  });

  it("đã hết: dòng phụ ghi 'đã hết hạn', thẻ nâng cấp nằm TRƯỚC thẻ gói đang dùng và nổi bật", async () => {
    await showTrial({ status: "EXPIRED", expiresAt: "2026-10-01T16:59:59.000Z" });
    const upgrade = await screen.findByTestId("myplan-upgrade");
    expect(text("myplan-trial-note")).toBe("Hạn mức như gói Cơ bản");
    expect(upgrade.textContent).toContain("Thời gian dùng thử đã hết");
    expect(upgrade.compareDocumentPosition(screen.getByTestId("myplan-name")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(text("myplan-status")).toBe("Đã hết hạn");
  });

  it("còn hạn: thẻ nâng cấp nằm SAU thẻ gói đang dùng", async () => {
    await showTrial();
    const upgrade = await screen.findByTestId("myplan-upgrade");
    expect(screen.getByTestId("myplan-name").compareDocumentPosition(upgrade) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("tạm ngưng: không có thẻ nâng cấp; gói trả phí: không có dòng phụ dùng thử", async () => {
    const view = await showTrial({ status: "SUSPENDED" });
    expect(screen.queryByTestId("myplan-upgrade")).toBeNull();
    view.unmount();
    show(await planReal.getPlan("c1", { chains: [chainOf(subscription())] }));
    expect(screen.queryByTestId("myplan-trial-note")).toBeNull();
    expect(text("myplan-name")).toBe("Gói Demo");
  });

  it("không đọc được hạn: dòng phụ chỉ còn 'Hạn mức như gói Cơ bản', không NaN", async () => {
    await showTrial({ expiresAt: undefined });
    expect(text("myplan-trial-note")).toBe("Hạn mức như gói Cơ bản");
    expect(document.body.textContent).not.toContain("NaN");
  });
});

describe("màn Gói của tôi — hỏi trạng thái thanh toán (lượt 10.2b)", () => {
  const checkout = (status: SubscriptionCheckout["status"]): SubscriptionCheckout => ({ id: "c-1", planId: "p1", amount: 300000, status, checkoutUrl: null, paidAt: null });
  const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
  const trialSubscription = () => subscription({ plan: { name: "Dùng thử 14 ngày", code: "TRIAL", brandingEnabled: false, multiBranchComparisonEnabled: false }, expiresAt: "2099-11-30T16:59:59.000Z" });

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(new Date("2026-10-15T10:30:00+07:00"));
    window.history.pushState({}, "", "/owner/plan?checkout=c-1");
    vi.spyOn(adminApi, "listPublicPlans").mockResolvedValue([{ id: "p1", code: "BASIC", name: "Cơ bản", monthlyPrice: 300000, maxBranches: 2, maxAccounts: 10, isActive: true }] as never);
    const plan = await planReal.getPlan("c1", { chains: [chainOf(trialSubscription())] });
    act(() => useAppStore.setState({ plan, chainId: "c1", scopeStatus: "ready" }));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    window.history.pushState({}, "", "/");
    act(() => useAppStore.setState({ chainId: null }));
  });
  const alertText = () => screen.getByTestId("checkout-alert").textContent ?? "";

  it("PENDING: hỏi đúng 20 lượt rồi DỪNG, hiện câu 'PayOS chưa xác nhận…' và nút Kiểm tra lại", async () => {
    const get = vi.spyOn(platformBillingApi, "getCheckout").mockResolvedValue(checkout("PENDING"));
    render(<AntApp><MyPlan /></AntApp>);
    await advance(0);
    expect(alertText()).toContain("Đang chờ PayOS xác nhận thanh toán");
    expect(screen.queryByTestId("checkout-recheck")).toBeNull();
    await advance(3000 * 25);
    expect(get).toHaveBeenCalledTimes(20);
    expect(alertText()).toContain("PayOS chưa xác nhận. Nếu bạn đã chuyển khoản, bấm Kiểm tra lại sau ít phút.");
    expect(screen.getByTestId("checkout-recheck").textContent).toContain("Kiểm tra lại");
    await advance(60_000);
    expect(get).toHaveBeenCalledTimes(20); // đã dừng hỏi
  });

  it("Kiểm tra lại: mỗi lần bấm đúng 1 GET, khoá nút trong lúc chờ; vẫn PENDING thì giữ nút, PAID thì báo thành công", async () => {
    const get = vi.spyOn(platformBillingApi, "getCheckout").mockResolvedValue(checkout("PENDING"));
    render(<AntApp><MyPlan /></AntApp>);
    await advance(3000 * 25);
    expect(get).toHaveBeenCalledTimes(20);

    let release: (c: SubscriptionCheckout) => void = () => undefined;
    get.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
    const button = () => screen.getByTestId("checkout-recheck") as HTMLButtonElement;
    fireEvent.click(button());
    await advance(0);
    expect(get).toHaveBeenCalledTimes(21);
    expect(button().disabled).toBe(true);
    fireEvent.click(button());
    fireEvent.click(button());
    await advance(0);
    expect(get).toHaveBeenCalledTimes(21); // bấm thêm lúc đang chờ không gọi thêm
    await act(async () => release(checkout("PENDING")));
    expect(button().disabled).toBe(false);
    expect(alertText()).toContain("PayOS chưa xác nhận");

    get.mockResolvedValueOnce(checkout("PAID"));
    fireEvent.click(button());
    await advance(0);
    expect(get).toHaveBeenCalledTimes(22);
    expect(alertText()).toContain("gói trả phí đã kích hoạt");
    expect(screen.queryByTestId("checkout-recheck")).toBeNull();
  });

  it("FAILED và EXPIRED: câu tương ứng và nút 'Tạo thanh toán mới' (tạo đúng gói đã chọn)", async () => {
    for (const [status, sentence] of [["FAILED", "Không thể hoàn tất thanh toán"], ["EXPIRED", "Liên kết thanh toán đã hết hạn"]] as const) {
      vi.spyOn(platformBillingApi, "getCheckout").mockResolvedValue(checkout(status));
      const create = vi.spyOn(platformBillingApi, "createCheckout").mockRejectedValue(new Error("không gọi PayOS thật"));
      const view = render(<AntApp><MyPlan /></AntApp>);
      await advance(0);
      expect(alertText()).toContain(sentence);
      expect(screen.queryByTestId("checkout-recheck")).toBeNull();
      fireEvent.click(screen.getByTestId("checkout-new"));
      await advance(0);
      expect(create).toHaveBeenCalledWith("c1", "p1");
      view.unmount();
      vi.restoreAllMocks();
      vi.spyOn(adminApi, "listPublicPlans").mockResolvedValue([{ id: "p1", code: "BASIC", name: "Cơ bản", monthlyPrice: 300000, maxBranches: 2, maxAccounts: 10, isActive: true }] as never);
    }
  });

  it("NEEDS_REVIEW: câu đối soát, KHÔNG có nút tạo thanh toán mới và các nút thanh toán nâng cấp bị khoá (tránh trả tiền hai lần)", async () => {
    vi.spyOn(platformBillingApi, "getCheckout").mockResolvedValue(checkout("NEEDS_REVIEW"));
    render(<AntApp><MyPlan /></AntApp>);
    await advance(0);
    expect(alertText()).toContain("Thanh toán cần nền tảng đối soát, gói sẽ được cập nhật sau khi xác nhận.");
    expect(screen.queryByTestId("checkout-new")).toBeNull();
    expect(screen.queryByTestId("checkout-recheck")).toBeNull();
    const pay = screen.getAllByRole("button", { name: /Thanh toán nâng cấp/ }) as HTMLButtonElement[];
    expect(pay.length).toBeGreaterThan(0);
    expect(pay.every((b) => b.disabled)).toBe(true);
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
