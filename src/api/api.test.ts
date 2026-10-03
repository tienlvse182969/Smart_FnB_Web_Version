import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, classifyApiError, describeApiError, ERROR_DEDUPE_MS, GENERIC_ERROR_TEXT, isQuotaError, isReadOnlyError, READ_ONLY_TEXT, reportApiError, resetErrorDedupe, SERVER_ERROR_TEXT, setApiErrorHandler, showApiError } from "./http/errors";
import { clearTokens, getAccessToken, refreshSession, setTokens } from "./http/client";
import { defineApi, wrapWithErrorHandling } from "./define";
import { API_MODULES, DEFAULT_MODES, flagTable, resolveModes } from "./flags";
import { mockControl } from "./mock/control";
import { resetMockStates } from "./mock/store";
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
  it("mặc định: auth/branch/report/plan/admin/menu/account/stations = real, còn lại mock", () => {
    const modes = resolveModes({});
    expect(modes).toEqual(DEFAULT_MODES);
    for (const m of ["auth", "branch", "report", "plan", "admin", "menu", "account", "stations", "branch_options"] as const) expect(modes[m]).toBe("real");
    for (const m of ["options", "branding", "order", "ai", "payos"] as const) {
      expect(modes[m]).toBe("mock");
    }
  });

  it("VITE_API_BRANCH_OPTIONS ghi đè riêng, không đụng cờ options của Owner", () => {
    const modes = resolveModes({ VITE_API_BRANCH_OPTIONS: "mock" });
    expect(modes.branch_options).toBe("mock");
    expect(modes.options).toBe("mock");
    expect(resolveModes({ VITE_API_OPTIONS: "mock" }).branch_options).toBe("real");
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

  it("hết hạn gói: 403 CÓ mã (mock) và KHÔNG mã (BE thật) cùng một thông báo tiếng Việt, không lộ câu tiếng Anh thô", () => {
    const real = new ApiError(403, "The business subscription is read-only; renew it before making this change");
    const mock = new ApiError(403, "Doanh nghiệp đang ở chế độ chỉ đọc.", [], "SUBSCRIPTION_READ_ONLY");
    for (const err of [real, mock]) {
      expect(isReadOnlyError(err)).toBe(true);
      expect(classifyApiError(err)).toBe("quota");
      expect(describeApiError(err)).toBe(READ_ONLY_TEXT);
    }
    expect(READ_ONLY_TEXT).not.toMatch(/subscription|SUBSCRIPTION|[{}]/);
    // 403 thiếu quyền thật vẫn là "không đủ quyền", không bị nhầm sang chỉ đọc.
    const denied = new ApiError(403, "You do not have permission to access this resource");
    expect(isReadOnlyError(denied)).toBe(false);
    expect(classifyApiError(denied)).toBe("forbidden");
  });

  it("hết hạn gói không mã: báo toàn cục đúng một lần, màn hình không báo lại", () => {
    const handler = vi.fn();
    setApiErrorHandler(handler);
    const show = vi.fn();
    const err = new ApiError(403, "The business subscription is read-only; renew it before making this change");
    reportApiError(err);
    reportApiError(err);
    showApiError(show, err, "Không cập nhật được");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(show).not.toHaveBeenCalled();
    setApiErrorHandler(null);
  });

  it("lỗi 5xx (500, 502, 503) → một câu tiếng Việt, không lộ câu của BE", () => {
    for (const [status, message] of [[500, "Internal server error"], [502, "Bad Gateway"], [503, "Service Unavailable"]] as const) {
      const err = new ApiError(status, message);
      expect(describeApiError(err)).toBe(SERVER_ERROR_TEXT);
      const show = vi.fn();
      resetErrorDedupe();
      showApiError(show, err, "x");
      expect(show).toHaveBeenCalledExactlyOnceWith(SERVER_ERROR_TEXT);
    }
    expect(SERVER_ERROR_TEXT).toBe("Máy chủ đang gặp sự cố, thử lại sau ít phút.");
  });

  it("câu tiếng Anh của BE không có trong bảng dịch → câu chung tiếng Việt; câu đã Việt thì giữ nguyên", () => {
    expect(describeApiError(new ApiError(400, "Something odd happened"))).toBe(GENERIC_ERROR_TEXT);
    expect(describeApiError(new ApiError(404, "Thing was not located anywhere"))).toMatch(/Không tìm thấy/);
    expect(describeApiError(new ApiError(409, "Weird collision"))).toMatch(/xung đột/);
    expect(describeApiError(new ApiError(404, "Menu item not found in this chain"))).toMatch(/Không tìm thấy/); // có trong bảng
    expect(describeApiError(new ApiError(400, "Giá phải là số nguyên đồng, từ 0 trở lên"))).toBe("Giá phải là số nguyên đồng, từ 0 trở lên");
    expect(describeApiError(new Error("TypeError: x is not a function"))).toBe("Có lỗi xảy ra. Thử lại sau.");
    for (const text of [describeApiError(new ApiError(400, "Something odd happened")), describeApiError(new ApiError(409, "Weird collision"))]) {
      expect(text).not.toMatch(/odd|collision|happened/i);
    }
    // thông báo hạn mức cũng không lộ câu tiếng Anh của BE
    expect(describeApiError(new ApiError(409, "Service plan account limit has been reached", [], "PLAN_LIMIT_REACHED"))).not.toMatch(/Service plan/);
  });

  it("chống trùng: cùng loại lỗi, cùng màn, cùng nội dung trong 3 giây chỉ hiện một thông báo; sau đó hiện lại", () => {
    resetErrorDedupe();
    const show = vi.fn();
    for (let i = 0; i < 4; i++) showApiError(show, new ApiError(500, "Internal server error"), "x");
    expect(show).toHaveBeenCalledTimes(1);
    // nội dung khác vẫn hiện
    showApiError(show, new ApiError(400, "Giá phải là số nguyên đồng"), "x");
    expect(show).toHaveBeenCalledTimes(2);
    // hết cửa sổ chống trùng
    vi.setSystemTime(Date.now() + ERROR_DEDUPE_MS + 100);
    showApiError(show, new ApiError(500, "Internal server error"), "x");
    expect(show).toHaveBeenCalledTimes(3);
    vi.setSystemTime(new Date(process.env.TEST_NOW ?? "2026-10-15T10:30:00+07:00"));
  });

  it("403: hết hạn không mã → chỉ đọc (tiếng Việt); thiếu quyền → câu tiếng Việt, không lộ tiếng Anh", () => {
    expect(describeApiError(new ApiError(403, "The business subscription is read-only; renew it before making this change"))).toBe(READ_ONLY_TEXT);
    const denied = describeApiError(new ApiError(403, "You do not have permission to access this resource"));
    expect(denied).toBe("Bạn không đủ quyền thực hiện thao tác này.");
    expect(denied).not.toMatch(/permission|resource/i);
  });

  it("lỗi 403/mất mạng ở màn tự hiện khối lỗi trong trang (Reports, BranchInfo) không bắn thêm thông báo nổi", () => {
    const handler = vi.fn();
    setApiErrorHandler(handler);
    const route = vi.spyOn(window, "location", "get");
    route.mockReturnValue({ ...window.location, pathname: "/owner/reports" } as Location);
    reportApiError(new ApiError(403, "no"));
    reportApiError(new ApiError(0, "mạng"));
    expect(handler).not.toHaveBeenCalled();
    // hạn mức vẫn báo toàn cục ở mọi màn
    reportApiError(new ApiError(409, "x", [], "PLAN_LIMIT_REACHED"));
    expect(handler).toHaveBeenCalledTimes(1);
    route.mockRestore();
    setApiErrorHandler(null);
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
    expect(handler.mock.calls[0][0].canRetry).toBe(true);
    expect(handler.mock.calls[1][0].canRetry).toBe(false);
    setApiErrorHandler(null);
  });

  it("Thử lại: chỉ lỗi ĐỌC mất mạng và 5xx; không cho 403, 401, 404, 409, 4xx khác và không cho lỗi ghi", async () => {
    const handler = vi.fn();
    setApiErrorHandler(handler);
    const fail = (status: number, code: string | null = null) => async () => {
      throw new ApiError(status, "x", [], code);
    };
    const api = wrapWithErrorHandling({
      listA: fail(0), listB: fail(500), listC: fail(503), listD: fail(403), listE: fail(401), listF: fail(404), listG: fail(409), listH: fail(400),
      saveA: fail(0), saveB: fail(500), saveC: fail(403),
    });
    const retryable: Record<string, boolean> = { listA: true, listB: true, listC: true, listD: false, saveA: false, saveC: false };
    for (const name of Object.keys(retryable) as (keyof typeof api)[]) await expect(api[name]()).rejects.toBeInstanceOf(ApiError);
    const events = handler.mock.calls.map((c) => c[0]);
    // listE (401), listF (404), listG (409), listH (400), saveB (500 ghi) không báo toàn cục
    for (const name of ["listE", "listF", "listG", "listH", "saveB"] as const) await expect(api[name]()).rejects.toBeInstanceOf(ApiError);
    expect(handler.mock.calls.length).toBe(events.length + 1); // chỉ listE (401, báo toàn cục, không retry) thêm vào
    expect(events.map((e) => [e.kind, e.canRetry])).toEqual([
      ["network", true], ["server", true], ["server", true], ["forbidden", false], ["network", false], ["forbidden", false],
    ]);
    expect(handler.mock.calls[events.length][0]).toMatchObject({ kind: "unauthorized", canRetry: false });
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

  it("bản real: cờ nhận diện và so sánh lấy từ BE (ưu tiên hơn suy từ mã gói), cờ AI vẫn suy từ mã", async () => {
    setScenario({ profile: "A", tier: null, expired: false });
    const chainOf = (code: string, flags: object) =>
      ({ id: "c", subscription: { plan: { name: "G", code, ...flags }, quotas: [] } }) as unknown as ApiChain;
    // Mã ADVANCED nhưng BE tắt hai cờ → theo BE; AI vẫn bật theo mã.
    const off = await planReal.getPlan("c", { chains: [chainOf("ADVANCED", { brandingEnabled: false, multiBranchComparisonEnabled: false })] });
    expect([off.features.branding.enabled, off.features.multiBranchCompare.enabled, off.features.aiAssistant.enabled]).toEqual([false, false, true]);
    expect(off.source.features).toBe("real");
    // Mã BASIC (lạ) nhưng BE bật cờ → theo BE.
    const on = await planReal.getPlan("c", { chains: [chainOf("DEMO_OPERATIONS", { brandingEnabled: true, multiBranchComparisonEnabled: true })] });
    expect([on.features.branding.enabled, on.features.multiBranchCompare.enabled, on.features.aiAssistant.enabled]).toEqual([true, true, false]);
    // BE cũ không trả cờ → suy từ mã.
    const legacy = await planReal.getPlan("c", { chains: [chainOf("STANDARD", {})] });
    expect([legacy.features.branding.enabled, legacy.features.multiBranchCompare.enabled]).toEqual([true, true]);
    expect(legacy.source.features).toBe("mock");
    // Panel dev ghi đè cấp thì theo cấp ghi đè.
    setScenario({ tier: "BASIC" });
    const forced = await planReal.getPlan("c", { chains: [chainOf("ADVANCED", { brandingEnabled: true, multiBranchComparisonEnabled: true })] });
    expect(forced.features.branding.enabled).toBe(false);
    setScenario({ tier: null });
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

  it("AI không phụ thuộc giờ chạy: 00:30 'hôm nay' có đơn; sáng mùng 1 'tháng này' có món bán chạy", async () => {
    const cases = ["2026-10-15T00:30:00+07:00", "2026-11-01T00:30:00+07:00", "2026-11-01T07:10:00+07:00", "2026-10-15T03:00:00+07:00"];
    try {
      for (const at of cases) {
        vi.setSystemTime(new Date(at));
        setScenario({ profile: "A", tier: null, expired: false });
        resetMockStates(); // đơn mock được sinh lần đầu rồi giữ trong bộ nhớ: sinh lại theo giờ giả
        const chainId = (await branchMock.listChains())[0].id;
        const orders = await aiMock.ask(chainId, "u", "Hôm nay mỗi chi nhánh có bao nhiêu đơn?");
        expect(orders.narrative, at).toMatch(/đơn \(huỷ/);
        expect(orders.table?.rows.some((r) => Number(r[1]) > 0), at).toBe(true);
        const top = await aiMock.ask(chainId, "u", "Top 5 món bán chạy tháng này");
        expect(top.table?.rows.length, at).toBeGreaterThan(0);
      }
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
