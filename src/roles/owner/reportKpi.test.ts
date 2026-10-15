import { describe, expect, it } from "vitest";
import type { BranchRevenueRow, RevenueComparison } from "../../types";
import { resolveReportBranchIds, summarizeKpi } from "./reportKpi";

const ref = { id: "b1", code: "B1", name: "Chi nhánh 1", city: null, chainId: "c1" };
const row = (over: Partial<BranchRevenueRow> = {}): BranchRevenueRow => ({
  branch: ref,
  revenue: "950000.00",
  grossRevenue: "1090000.00",
  refundAmount: "140000.00",
  pendingRefundAmount: "30000.00",
  netRevenue: "950000.00",
  paidCancellationCount: 2,
  discount: "0.00",
  orderCount: 9,
  averageOrderValue: "105555.56",
  ...over,
});
const comparison = (branches: BranchRevenueRow[]): RevenueComparison => ({
  range: { from: "2026-10-01", to: "2026-10-07", timezone: "Asia/Ho_Chi_Minh", branchCount: branches.length },
  totals: {
    averageOrderValue: "105555.56",
    revenue: "950000.00",
    grossRevenue: "1090000.00",
    refundAmount: "140000.00",
    pendingRefundAmount: "30000.00",
    netRevenue: "950000.00",
    paidCancellationCount: 2,
    orderCount: 9,
  },
  branches,
});

describe("summarizeKpi (OW-08, BR-50, #98)", () => {
  it("đọc đúng số BE: doanh thu sau hoàn, gộp, đã hoàn, chờ hoàn, số đơn huỷ sau thanh toán, giá trị đơn trung bình ở tổng", () => {
    expect(summarizeKpi(comparison([row()]))).toEqual({
      netRevenue: 950000,
      grossRevenue: 1090000,
      refundAmount: 140000,
      pendingRefundAmount: 30000,
      orderCount: 9,
      paidCancellationCount: 2,
      averageOrderValue: 105555.56,
    });
  });

  it("nhiều chi nhánh: lấy giá trị đơn trung bình ở tổng do BE tính, không tự chia", () => {
    const two = comparison([row(), row({ branch: { ...ref, id: "b2" }, averageOrderValue: "1.00" })]);
    expect(summarizeKpi(two).averageOrderValue).toBe(105555.56);
  });

  it("chưa có dữ liệu: toàn số 0, không bịa", () => {
    expect(summarizeKpi(undefined)).toEqual({
      netRevenue: 0,
      grossRevenue: 0,
      refundAmount: 0,
      pendingRefundAmount: 0,
      orderCount: 0,
      paidCancellationCount: 0,
      averageOrderValue: null,
    });
  });
});

describe("resolveReportBranchIds (BR-08, #84)", () => {
  const all = ["b1", "b2", "b3"];
  it("gói có so sánh đa chi nhánh, chưa chọn → không gửi branchIds (tất cả)", () => {
    expect(resolveReportBranchIds({ selected: null, branchIds: all, canCompare: true })).toBeUndefined();
  });
  it("gói không có so sánh, chưa chọn → đúng một chi nhánh, chi nhánh đầu", () => {
    expect(resolveReportBranchIds({ selected: null, branchIds: all, canCompare: false })).toEqual(["b1"]);
  });
  it("đã chọn một chi nhánh → chỉ chi nhánh đó, bất kể gói", () => {
    expect(resolveReportBranchIds({ selected: "b2", branchIds: all, canCompare: false })).toEqual(["b2"]);
    expect(resolveReportBranchIds({ selected: "b2", branchIds: all, canCompare: true })).toEqual(["b2"]);
  });
  it("chưa có chi nhánh nào → undefined", () => {
    expect(resolveReportBranchIds({ selected: null, branchIds: [], canCompare: false })).toBeUndefined();
  });
});
