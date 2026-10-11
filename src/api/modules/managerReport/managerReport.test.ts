import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockControl } from "../../mock/control";
import { resetMockStates } from "../../mock/store";
import { setScenario } from "../../mock/scenario";
import { MOCK_PROFILES } from "../../mock/data/profiles";
import { mapManagerReport } from "./mapper";
import { managerReportMock } from "./mock";
import { buildManagerReportQueryString } from "./query";
import { managerReportReal } from "./real";

mockControl.latency = [0, 0];
mockControl.failure = null;

const fallback = { from: "2026-10-03", to: "2026-10-09", granularity: "day" as const };

// Phản hồi mẫu đúng dạng BE `de4f55c` (đã đối chiếu bằng GET thật ở lượt 7.3).
const rawReport = {
  branch: { id: "b1", name: "Smart F&B Nguyễn Huệ", timezone: "Asia/Ho_Chi_Minh" },
  range: { from: "2026-10-03", to: "2026-10-09", timezone: "Asia/Ho_Chi_Minh", granularity: "day" },
  summary: { revenue: "1090000.00", orderCount: 11, averageOrderValue: "99090.91" },
  revenue: [
    { bucket: "2026-10-07", revenue: "0", orderCount: 0 },
    { bucket: "2026-10-08", revenue: "1090000", orderCount: 11 },
  ],
  payments: [
    { method: "CASH", settledAmount: "1090000.00", receivedAmount: "1155000.00", paymentCount: 11 },
    { method: "BANK_TRANSFER", settledAmount: "75000", receivedAmount: "80000", paymentCount: 1 },
  ],
  topItems: [{ menuItemId: "m1", name: "Cơm gà nướng", quantity: 11, lineRevenue: "715000" }],
  topOptions: [],
  topToppings: [{ optionId: "o1", name: "Trân châu đen", quantity: 3, additionalRevenue: "15000" }],
  ordersByHour: Array.from({ length: 24 }, (_, hour) => ({ hour, orderCount: hour === 12 ? 11 : 0 })),
  preparation: { averageSeconds: 0.02, completedUnits: 2 },
  cancellations: {
    total: 1,
    limit: 10,
    items: [{ id: "c1", orderCode: "CTR-1-AF0042", callNumber: null, totalAmount: "75000", cancelledAt: "2026-10-08T05:56:59.324Z", reason: "Khách đổi ý trước khi trả tiền", cancelledById: "e1" }],
  },
};

describe("mapper báo cáo chi nhánh (đúng dạng BE)", () => {
  it("tiền chuỗi → số, giữ nguyên số liệu BE (không tính lại), giờ 0–23 theo BE", () => {
    const r = mapManagerReport(rawReport, fallback);
    expect(r.branchName).toBe("Smart F&B Nguyễn Huệ");
    expect(r.summary).toEqual({ revenue: 1090000, orderCount: 11, averageOrderValue: 99090.91 });
    expect(r.revenue).toEqual([
      { bucket: "2026-10-07", revenue: 0, orderCount: 0 },
      { bucket: "2026-10-08", revenue: 1090000, orderCount: 11 },
    ]);
    expect(r.payments[0]).toEqual({ method: "CASH", settledAmount: 1090000, receivedAmount: 1155000, paymentCount: 11 });
    expect(r.payments[1].settledAmount).toBe(75000);
    expect(r.topItems).toEqual([{ menuItemId: "m1", name: "Cơm gà nướng", quantity: 11, lineRevenue: 715000 }]);
    expect(r.topToppings[0]).toEqual({ optionId: "o1", name: "Trân châu đen", quantity: 3, additionalRevenue: 15000 });
    expect(r.ordersByHour).toHaveLength(24);
    expect(r.ordersByHour[12]).toEqual({ hour: 12, orderCount: 11 });
    expect(r.cancellations).toEqual({
      total: 1,
      limit: 10,
      items: [{ id: "c1", orderCode: "CTR-1-AF0042", callNumber: null, totalAmount: 75000, cancelledAt: "2026-10-08T05:56:59.324Z", reason: "Khách đổi ý trước khi trả tiền" }],
    });
  });

  it("thời gian pha: giữ số giây (0,02 là số thật), null khi chưa có suất xong", () => {
    expect(mapManagerReport(rawReport, fallback).preparation).toEqual({ averageSeconds: 0.02, completedUnits: 2 });
    expect(mapManagerReport({ ...rawReport, preparation: { averageSeconds: null, completedUnits: 0 } }, fallback).preparation).toEqual({ averageSeconds: null, completedUnits: 0 });
    expect(mapManagerReport({ ...rawReport, preparation: {} }, fallback).preparation.averageSeconds).toBeNull();
  });

  it("mục rỗng hoặc thiếu không làm vỡ", () => {
    const empty = mapManagerReport({}, fallback);
    expect(empty.summary).toEqual({ revenue: 0, orderCount: 0, averageOrderValue: 0 });
    expect(empty.revenue).toEqual([]);
    expect(empty.payments).toEqual([]);
    expect(empty.topItems).toEqual([]);
    expect(empty.ordersByHour).toEqual([]);
    expect(empty.cancellations).toEqual({ total: 0, limit: 0, items: [] });
    expect(empty.range).toEqual({ from: "2026-10-03", to: "2026-10-09", granularity: "day" });
    expect(mapManagerReport(null, fallback).branchName).toBe("Chi nhánh");
    expect(mapManagerReport("lỗi", fallback).summary.orderCount).toBe(0);
    const weird = mapManagerReport({ ...rawReport, payments: [null, 3, { method: 5 }], revenue: "x", range: { granularity: "year" } }, fallback);
    expect(weird.payments).toEqual([{ method: "OTHER", settledAmount: 0, receivedAmount: 0, paymentCount: 0 }]);
    expect(weird.revenue).toEqual([]);
    expect(weird.range.granularity).toBe("day");
  });

  it("đơn huỷ: số gọi là số hoặc null, lý do rỗng → null", () => {
    const r = mapManagerReport({ ...rawReport, cancellations: { total: 2, limit: 10, items: [{ id: "a", callNumber: 7, reason: "" }, { id: "b" }] } }, fallback);
    expect(r.cancellations.items.map((c) => [c.callNumber, c.reason])).toEqual([[7, null], [null, null]]);
    expect(r.cancellations.total).toBe(2);
  });
});

describe("tham số gửi BE", () => {
  it("luôn gửi đủ from, to (ngày giờ Việt Nam), granularity, limit; limit kẹp 1–50", () => {
    const p = new URLSearchParams(buildManagerReportQueryString({ from: "2026-10-03", to: "2026-10-09", granularity: "week", limit: 10 }));
    expect(Object.fromEntries(p)).toEqual({ from: "2026-10-03", to: "2026-10-09", granularity: "week", limit: "10" });
    expect(new URLSearchParams(buildManagerReportQueryString({ from: "a", to: "b", granularity: "day", limit: 999 })).get("limit")).toBe("50");
    expect(new URLSearchParams(buildManagerReportQueryString({ from: "a", to: "b", granularity: "day", limit: 0 })).get("limit")).toBe("10");
  });
});

describe("managerReportReal — đúng endpoint /manager/reports", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("chỉ GET, kèm tham số, map đủ", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(rawReport), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const r = await managerReportReal.getReport({ chainId: "c", branchId: "b" }, { ...fallback, limit: 10 });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new URL(url).pathname).toMatch(/\/manager\/reports$/);
    expect(new URL(url).searchParams.get("from")).toBe("2026-10-03");
    expect(init.method).toBe("GET");
    expect(r.summary.orderCount).toBe(11);
  });
});

describe("managerReportMock — đủ mục BM-03", () => {
  const profile = MOCK_PROFILES.A;
  const scope = { chainId: profile.chainId, branchId: profile.branches[0].id };
  const today = "2026-10-15"; // đồng hồ cố định của bộ test (src/test/setup.ts)
  beforeEach(() => {
    resetMockStates();
    setScenario({ profile: "A", tier: null, expired: false });
  });

  it("30 ngày: có doanh thu, theo hình thức, món, topping, theo giờ 24 mốc, thời gian pha, đơn huỷ nhiều lý do", async () => {
    const r = await managerReportMock.getReport(scope, { from: "2026-09-16", to: today, granularity: "day", limit: 10 });
    expect(r.summary.orderCount).toBeGreaterThan(50);
    expect(r.summary.revenue).toBeGreaterThan(0);
    expect(r.summary.averageOrderValue).toBeCloseTo(r.summary.revenue / r.summary.orderCount, 1);
    expect(r.revenue).toHaveLength(30);
    expect(r.revenue.reduce((s, b) => s + b.revenue, 0)).toBe(r.summary.revenue);
    expect(r.payments.map((p) => p.method).sort()).toEqual(["BANK_TRANSFER", "CASH"]);
    expect(r.payments.reduce((s, p) => s + p.paymentCount, 0)).toBe(r.summary.orderCount);
    expect(r.topItems.length).toBeGreaterThan(0);
    expect(r.topItems.length).toBeLessThanOrEqual(10);
    expect(r.topItems.map((i) => i.quantity)).toEqual([...r.topItems.map((i) => i.quantity)].sort((a, b) => b - a));
    expect(r.topToppings.length).toBeGreaterThan(0);
    expect(r.ordersByHour.map((h) => h.hour)).toEqual(Array.from({ length: 24 }, (_, i) => i));
    expect(r.preparation.averageSeconds).toBeGreaterThan(60);
    expect(r.cancellations.total).toBeGreaterThan(0);
    expect(new Set(r.cancellations.items.map((c) => c.reason)).size).toBeGreaterThan(1);
  });

  it("ngày không có đơn vẫn có bucket 0; khoảng không có đơn → số 0, thời gian pha null, mục rỗng", async () => {
    const r = await managerReportMock.getReport(scope, { from: "2000-01-01", to: "2000-01-07", granularity: "day", limit: 10 });
    expect(r.revenue).toHaveLength(7);
    expect(r.revenue.every((b) => b.revenue === 0 && b.orderCount === 0)).toBe(true);
    expect(r.summary).toEqual({ revenue: 0, orderCount: 0, averageOrderValue: 0 });
    expect(r.payments).toEqual([]);
    expect(r.topItems).toEqual([]);
    expect(r.preparation.averageSeconds).toBeNull();
    expect(r.cancellations).toMatchObject({ total: 0, items: [] });
  });

  it("kỳ tuần (đầu kỳ là thứ Hai) và tháng (mùng 1)", async () => {
    const week = await managerReportMock.getReport(scope, { from: "2026-10-01", to: "2026-10-15", granularity: "week", limit: 10 });
    expect(week.revenue.map((b) => b.bucket)).toEqual(["2026-09-28", "2026-10-05", "2026-10-12"]);
    const month = await managerReportMock.getReport(scope, { from: "2026-09-15", to: "2026-10-15", granularity: "month", limit: 10 });
    expect(month.revenue.map((b) => b.bucket)).toEqual(["2026-09-01", "2026-10-01"]);
  });

  it("đơn huỷ dẫn sang đơn có thật (mã đơn khớp module order)", async () => {
    const r = await managerReportMock.getReport(scope, { from: "2026-09-16", to: today, granularity: "day", limit: 10 });
    const { orderMock } = await import("../order/mock");
    const detail = await orderMock.getOrder(scope, r.cancellations.items[0].id);
    expect(detail.orderCode).toBe(r.cancellations.items[0].orderCode);
    expect(detail.status).toBe("CANCELLED");
  });
});
