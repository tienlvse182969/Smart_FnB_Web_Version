import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, classifyApiError, isQuotaError, reportApiError, setApiErrorHandler } from "./http/errors";
import { clearTokens, getAccessToken, refreshSession, setTokens } from "./http/client";
import { defineApi, wrapWithErrorHandling } from "./define";
import { API_MODULES, DEFAULT_MODES, flagTable, resolveModes } from "./flags";
import { mockControl } from "./mock/control";
import { setScenario } from "./mock/scenario";
import { generateBranchOrders, ORDER_HISTORY_DAYS, revenueEvents } from "./mock/data/orders";
import { buildMenu, buildOptionGroups, MOCK_PROFILES } from "./mock/data/profiles";
import { planMock } from "./modules/plan/mock";
import { planReal } from "./modules/plan/real";
import { branchMock } from "./modules/branch/mock";
import { reportMock } from "./modules/report/mock";
import { aiMock } from "./modules/ai/mock";
import { menuMock } from "./modules/menu/mock";
import { optionsMock } from "./modules/options/mock";
import type { ApiChain } from "../types";

mockControl.latency = [0, 0];
mockControl.failure = null;

describe("cờ module", () => {
  it("mặc định: auth/branch/report/plan/admin/menu/account = real, còn lại mock", () => {
    const modes = resolveModes({});
    expect(modes).toEqual(DEFAULT_MODES);
    for (const m of ["auth", "branch", "report", "plan", "admin", "menu", "account"] as const) expect(modes[m]).toBe("real");
    for (const m of ["options", "branding", "order", "ai", "payos"] as const) {
      expect(modes[m]).toBe("mock");
    }
  });

  it("VITE_API_<MODULE> ghi đè từng module riêng lẻ", () => {
    const modes = resolveModes({ VITE_API_MENU: "real", VITE_API_BRANCH: "mock" });
    expect(modes.menu).toBe("real");
    expect(modes.branch).toBe("mock");
    expect(modes.report).toBe("real");
  });

  it("giá trị lạ bị bỏ qua và cảnh báo", () => {
    const warn = vi.fn();
    const modes = resolveModes({ VITE_API_REPORT: "fake" }, warn);
    expect(modes.report).toBe("real");
    expect(warn).toHaveBeenCalledOnce();
  });

  it("bảng cờ có đủ module và ghi chú", () => {
    const table = flagTable();
    expect(table.map((r) => r.module)).toEqual([...API_MODULES]);
    expect(table.every((r) => r.note.length > 0)).toBe(true);
  });

  it("defineApi: lật cờ chọn đúng bản cài đặt; thiếu real thì rơi về mock", () => {
    const real = { id: async () => "real" };
    const mock = { id: async () => "mock" };
    return Promise.all([
      defineApi("menu", { real, mock }, "real").id().then((v) => expect(v).toBe("real")),
      defineApi("menu", { real, mock }, "mock").id().then((v) => expect(v).toBe("mock")),
      defineApi("menu", { mock }, "real").id().then((v) => expect(v).toBe("mock")),
    ]);
  });
});

describe("lỗi API thống nhất", () => {
  it("phân loại 401/403/hạn mức/mạng", () => {
    expect(classifyApiError(new ApiError(0, "x"))).toBe("network");
    expect(classifyApiError(new ApiError(401, "x"))).toBe("unauthorized");
    expect(classifyApiError(new ApiError(403, "x"))).toBe("forbidden");
    expect(classifyApiError(new ApiError(409, "x", [], "PLAN_LIMIT_REACHED"))).toBe("quota");
    expect(classifyApiError(new ApiError(403, "x", [], "SUBSCRIPTION_READ_ONLY"))).toBe("quota");
    expect(classifyApiError(new ApiError(400, "x"))).toBe("validation");
    expect(isQuotaError(new ApiError(409, "x", [], "PLAN_LIMIT_REACHED"))).toBe(true);
    expect(isQuotaError(new ApiError(409, "x"))).toBe(false);
  });

  it("chỉ báo lỗi toàn cục một lần cho mỗi đối tượng lỗi; lỗi validate để màn hình tự hiện", () => {
    const handler = vi.fn();
    setApiErrorHandler(handler);
    const forbidden = new ApiError(403, "no");
    reportApiError(forbidden);
    reportApiError(forbidden);
    reportApiError(new ApiError(400, "validate"));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].kind).toBe("forbidden");
    setApiErrorHandler(null);
  });

  it("module bọc báo lỗi; chỉ hàm đọc (list/get…) mới có nút Thử lại khi mất mạng", async () => {
    const handler = vi.fn();
    setApiErrorHandler(handler);
    const api = wrapWithErrorHandling({
      listThings: async () => {
        throw new ApiError(0, "mạng");
      },
      createThing: async () => {
        throw new ApiError(0, "mạng");
      },
    });
    await expect(api.listThings()).rejects.toBeInstanceOf(ApiError);
    await expect(api.createThing()).rejects.toBeInstanceOf(ApiError);
    expect(handler.mock.calls[0][0].retry).toBeTypeOf("function");
    expect(handler.mock.calls[1][0].retry).toBeUndefined();
    setApiErrorHandler(null);
  });

  it("mock giả lập lỗi được (mạng) qua mockControl", async () => {
    mockControl.failure = { kind: "network", rate: 1 };
    await expect(branchMock.listChains()).rejects.toMatchObject({ status: 0 });
    mockControl.failure = null;
  });
});

describe("refresh token liên tab", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, "locks");
    clearTokens();
  });

  const refreshResponse = (access: string, refresh: string) =>
    new Response(JSON.stringify({ accessToken: access, refreshToken: refresh }), { status: 200 });

  it("nhiều lời gọi trong một tab chia sẻ một lượt refresh", async () => {
    setTokens("cu", "r1");
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(refreshResponse("moi", "r2"));
    const [a, b] = await Promise.all([refreshSession("cu"), refreshSession("cu")]);
    expect(a).toBe("moi");
    expect(b).toBe("moi");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe("moi");
  });

  it("tab chờ khoá thấy tab khác đã refresh → dùng token mới, KHÔNG gọi refresh lần nữa", async () => {
    setTokens("cu", "r1");
    // Giả lập Web Locks: tab kia (đang giữ khoá) ghi token mới vào storage trước khi tab này được chạy.
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: {
        request: async (_name: string, task: () => Promise<unknown>) => {
          setTokens("do-tab-khac", "r2");
          return task();
        },
      },
    });
    const token = await refreshSession("cu");
    expect(token).toBe("do-tab-khac");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("hai tab: refresh tuần tự qua khoá, mỗi refresh dùng token mới nhất trong storage", async () => {
    setTokens("cu", "r1");
    const queue: Promise<unknown>[] = [];
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: { request: (_n: string, task: () => Promise<unknown>) => { const p = (queue.at(-1) ?? Promise.resolve()).then(task); queue.push(p.catch(() => {})); return p; } },
    });
    const sent: string[] = [];
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(async (_url: string, init: RequestInit) => {
      sent.push(JSON.parse(String(init.body)).refreshToken);
      return refreshResponse(`a${sent.length}`, `r${sent.length + 1}`);
    });
    // "tab 2" gọi ngay sau tab 1 nhưng với token cũ đã chụp; tab 1 refresh trước.
    const t1 = refreshSession("cu");
    await t1;
    const t2 = refreshSession("cu");
    expect(await t2).toBe("a1"); // thấy token đã đổi → không refresh lần hai
    expect(sent).toEqual(["r1"]);
  });
});

describe("gói (plan)", () => {
  afterEach(() => setScenario({ profile: "A", tier: null, expired: false }));

  it("mock theo doanh nghiệp: A = Nâng cao, B = Cơ bản", async () => {
    setScenario({ profile: "A" });
    expect((await planMock.getPlan("c")).tier).toBe("ADVANCED");
    setScenario({ profile: "B" });
    expect((await planMock.getPlan("c")).tier).toBe("BASIC");
  });

  it("ghi đè gói và hết hạn", async () => {
    setScenario({ profile: "B", tier: "STANDARD", expired: true });
    const plan = await planMock.getPlan("c");
    expect(plan.tier).toBe("STANDARD");
    expect(plan.status).toBe("expired");
    expect(plan.features.branding.enabled).toBe(true);
    expect(plan.features.aiAssistant.enabled).toBe(false);
    expect(new Date(plan.expiresAt!).getTime()).toBeLessThan(Date.now());
  });

  it("bản real: hạn mức lấy từ subscription.quotas thật, cờ tính năng vẫn mock", async () => {
    const chain = {
      id: "real-chain",
      subscription: {
        plan: { name: "Gói thật" },
        quotas: [
          { resource: "branches", used: 1, limit: 2, remaining: 1 },
          { resource: "accounts", used: 3, limit: 10, remaining: 7 },
          { resource: "tables", used: 0, limit: 5, remaining: 5 },
        ],
      },
    } as unknown as ApiChain;
    const plan = await planReal.getPlan("real-chain", { chains: [chain] });
    expect(plan.planName).toBe("Gói thật");
    expect(plan.limits.map((l) => l.resource)).toEqual(["branches", "accounts"]); // bỏ "tables" (v7)
    expect(plan.limits[0]).toMatchObject({ used: 1, limit: 2, remaining: 1 });
    expect(plan.source).toEqual({ limits: "real", features: "mock" });
  });

  it("bản real không có chuỗi (Manager): hạn mức rỗng, vẫn có cờ để khoá giao diện", async () => {
    const plan = await planReal.getPlan("c");
    expect(plan.limits).toEqual([]);
    expect(plan.source.limits).toBe("mock");
    expect(plan.features.aiAssistant.requiredTier).toBe("ADVANCED");
  });
});

describe("dữ liệu mock v9", () => {
  const now = new Date();
  const mk = (id: "A" | "B") => {
    const profile = MOCK_PROFILES[id];
    const items = buildMenu(profile).map((m) => ({ ...m, optionGroupIds: m.seedOptionGroupIds }));
    const groups = buildOptionGroups(profile, profile.chainId);
    return { profile, items, groups };
  };

  it("hai doanh nghiệp khác gói và khác nhận diện", () => {
    expect(MOCK_PROFILES.A.defaultTier).toBe("ADVANCED");
    expect(MOCK_PROFILES.B.defaultTier).toBe("BASIC");
    expect(MOCK_PROFILES.A.brandPrimary).not.toBe(MOCK_PROFILES.B.brandPrimary);
    expect(MOCK_PROFILES.A.branches.length).toBeGreaterThan(1);
  });

  it("nhóm tuỳ chọn: Size bắt buộc chọn 1, Topping tối đa 3, có giá cộng thêm", () => {
    const { groups } = mk("A");
    const size = groups.find((g) => g.name === "Size")!;
    const topping = groups.find((g) => g.name === "Topping")!;
    expect(size).toMatchObject({ isRequired: true, minSelections: 1, maxSelections: 1 });
    expect(size.options.some((o) => o.priceDelta > 0)).toBe(true);
    expect(topping).toMatchObject({ isRequired: false, minSelections: 0, maxSelections: 3 });
    expect(topping.options.every((o) => o.priceDelta > 0)).toBe(true);
  });

  const orders = () => {
    const { profile, items, groups } = mk("A");
    return generateBranchOrders({ chainId: profile.chainId, branchId: profile.branches[0].id, traffic: 1, items, groups, now });
  };

  it("đơn trải nhiều tuần và đủ trạng thái", () => {
    const list = orders();
    const days = new Set(list.map((o) => o.createdAt.slice(0, 10)));
    expect(days.size).toBeGreaterThanOrEqual(ORDER_HISTORY_DAYS - 2);
    expect(list.some((o) => o.paymentMethod === "cash" && o.paymentStatus === "paid" && o.status === "completed")).toBe(true);
    expect(list.some((o) => o.paymentMethod === "qr" && o.paymentStatus === "paid" && o.status === "completed")).toBe(true);
    expect(list.some((o) => o.status === "needsAttention" && o.paymentStatus === "amountMismatch")).toBe(true);
    expect(list.some((o) => o.status === "cancelled" && !o.refund)).toBe(true);
    const refunds = list.filter((o) => o.status === "cancelled" && o.refund);
    expect(refunds.length).toBeGreaterThan(0);
    expect(new Set(refunds.map((o) => o.refund!.status)).size).toBeGreaterThanOrEqual(1);
    for (const o of refunds) expect(o.refund!.amount).toBe(o.total);
  });

  it("đơn chụp giá lúc bán: tổng = Σ (giá + giá cộng thêm) × số lượng; một phần lệch giá menu hiện tại", () => {
    const { items } = mk("A");
    const list = orders();
    let drifted = 0;
    for (const o of list) {
      expect(o.total).toBe(o.lines.reduce((s, l) => s + l.lineTotal, 0));
      for (const l of o.lines) {
        const extras = l.options.reduce((s, op) => s + op.priceDelta, 0);
        expect(l.lineTotal).toBe((l.unitPrice + extras) * l.quantity);
        const current = items.find((i) => i.id === l.menuItemId)!;
        if (l.unitPrice !== current.price) drifted++;
      }
    }
    expect(drifted).toBeGreaterThan(0);
    expect(list.some((o) => o.lines.some((l) => l.options.some((op) => op.priceDelta > 0)))).toBe(true);
  });

  it("số gọi chỉ có ở đơn đã thanh toán, tăng dần, bắt đầu lại mỗi ngày (BR-22)", () => {
    const list = orders();
    expect(list.filter((o) => o.paymentStatus === "pendingPayment" as never).length).toBe(0);
    const byDay = new Map<string, number[]>();
    for (const o of list) {
      if (o.status === "cancelled" && !o.refund) expect(o.callNumber).toBeNull();
      if (o.callNumber !== null) {
        const day = o.createdAt.slice(0, 10);
        byDay.set(day, [...(byDay.get(day) ?? []), o.callNumber]);
      }
    }
    for (const calls of byDay.values()) {
      expect(Math.min(...calls)).toBe(1);
      expect(new Set(calls).size).toBe(calls.length);
    }
  });

  it("cùng chi nhánh → cùng dữ liệu (xác định)", () => {
    expect(orders().map((o) => o.total)).toEqual(orders().map((o) => o.total));
  });

  it("doanh thu theo BR-50: đơn huỷ sau thanh toán cộng ngày bán, trừ ngày huỷ", () => {
    const refunded = orders().find((o) => o.status === "cancelled" && o.refund)!;
    const events = revenueEvents(refunded, now);
    expect(events).toHaveLength(2);
    expect(events[0].amount).toBe(refunded.total);
    expect(events[1].amount).toBe(-refunded.total);
  });
});

describe("mock chạy được với ID thật (không có lớp ánh xạ)", () => {
  it("menu mock sinh dữ liệu lần đầu cho chainId lạ và giữ trong bộ nhớ", async () => {
    setScenario({ profile: "A", expired: false });
    const chainId = "11111111-2222-3333-4444-555555555555";
    const items = await menuMock.listItems(chainId);
    expect(items.length).toBeGreaterThan(0);
    expect((await optionsMock.listItemConfigs(chainId)).some((c) => c.groupIds.length > 0)).toBe(true);
    expect((await menuMock.listCategories(chainId)).length).toBeGreaterThan(1);
  });

  it("hết hạn thì mock chặn ghi nhưng vẫn cho đọc (BR-09)", async () => {
    setScenario({ profile: "A", expired: true });
    await expect(menuMock.listItems("c2")).resolves.toBeDefined();
    await expect(menuMock.createCategory("c2", { name: "Mới" })).rejects.toMatchObject({ status: 403, code: "SUBSCRIPTION_READ_ONLY" });
    setScenario({ expired: false });
  });

  it("branch + report mock: báo cáo cộng đúng từ đơn mock, nhiều chi nhánh", async () => {
    setScenario({ profile: "A", tier: null, expired: false });
    const chains = await branchMock.listChains();
    const chainId = chains[0].id;
    const comparison = await reportMock.getRevenueComparison({ chainId });
    expect(comparison.branches.length).toBeGreaterThan(1);
    const total = comparison.branches.reduce((s, b) => s + Number(b.revenue), 0);
    expect(total).toBe(Number(comparison.totals.revenue));
    expect(comparison.branches[0].revenue).toMatch(/^\d+\.00$/);
    const series = await reportMock.getRevenueTimeseries({ chainId, granularity: "week" });
    expect(series.series[0].points).toHaveLength(series.buckets.length);
    const top = await reportMock.getTopItems({ chainId, limit: 3 });
    expect(top.items.length).toBeLessThanOrEqual(3);
    expect(top.items[0].quantity).toBeGreaterThan(0);
  });

  it("AI: trả số liệu thật từ bộ đơn mock, không rỗng; chỉ gói Nâng cao", async () => {
    setScenario({ profile: "A", tier: null, expired: false });
    const chainId = (await branchMock.listChains())[0].id;
    const revenue = await aiMock.ask(chainId, "u", "Hôm nay chi nhánh nào doanh thu cao nhất?");
    expect(revenue.table?.rows.length).toBeGreaterThan(0);
    const top = await aiMock.ask(chainId, "u", "Top 5 món bán chạy tháng này");
    expect(top.table?.rows.length).toBeGreaterThan(0);
    const orders = await aiMock.ask(chainId, "u", "Tuần trước mỗi chi nhánh có bao nhiêu đơn?");
    expect(orders.table?.rows.length).toBeGreaterThan(0);
    const refused = await aiMock.ask(chainId, "u", "lợi nhuận tháng này là bao nhiêu");
    expect(refused.refused).toBe(true);

    setScenario({ tier: "STANDARD" });
    await expect(aiMock.ask(chainId, "u", "doanh thu hôm nay")).rejects.toMatchObject({ status: 403, code: "PLAN_FEATURE_UNAVAILABLE" });
  });

  it("AI vào sáng mùng 1 (01/10 03:00, chưa có đơn trong tháng): 'tháng này' trả câu trả lời hợp lệ, không ném lỗi", async () => {
    vi.setSystemTime(new Date("2026-10-01T03:00:00+07:00"));
    try {
      setScenario({ profile: "A", tier: null, expired: false });
      // chainId mới để đơn mock sinh lại theo giờ giả (đơn được sinh lần đầu rồi giữ trong bộ nhớ).
      const chainId = "aaaaaaaa-0000-4000-8000-000000000101";
      const answer = await aiMock.ask(chainId, "u", "Top 5 món bán chạy tháng này");
      expect(typeof answer.narrative).toBe("string");
      expect(answer.narrative.length).toBeGreaterThan(0);
      expect(answer.refused).toBeFalsy();
      expect(answer.table?.rows.length ?? 0).toBeGreaterThanOrEqual(0);
    } finally {
      vi.setSystemTime(new Date(process.env.TEST_NOW ?? "2026-10-15T10:30:00+07:00"));
    }
  });

  it("tạo chi nhánh vượt hạn mức → PLAN_LIMIT_REACHED như BE", async () => {
    setScenario({ profile: "B", tier: "BASIC", expired: false });
    const chainId = (await branchMock.listChains())[0].id;
    await expect(
      branchMock.createBranch(chainId, { code: "X1", name: "Thêm", addressLine1: "1 A", city: "Hà Nội" }),
    ).rejects.toMatchObject({ status: 409, code: "PLAN_LIMIT_REACHED" });
  });
});
