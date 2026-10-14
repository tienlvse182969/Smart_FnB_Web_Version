import { describe, expect, it } from "vitest";
import type { BranchRevenueRow, RevenueComparison } from "../../types";
import { summarizeKpi } from "./reportKpi";

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

describe("summarizeKpi (OW-08, BR-50)", () => {
  it("đọc đúng số BE: doanh thu sau hoàn, gộp, đã hoàn, chờ hoàn, số đơn huỷ sau thanh toán", () => {
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

  it("nhiều chi nhánh: giá trị đơn trung bình là null (BE không trả ở tổng, web không tự chia)", () => {
    const two = comparison([row(), row({ branch: { ...ref, id: "b2" } })]);
    expect(summarizeKpi(two).averageOrderValue).toBeNull();
    expect(summarizeKpi(two).netRevenue).toBe(950000);
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
