/**
 * Thẻ số của báo cáo Owner (OW-08): chỉ đọc số BE trả, KHÔNG tự tính (BR-50: hoàn trừ vào ngày huỷ do BE gom).
 * Giá trị đơn trung bình lấy từ BE: `totals.averageOrderValue` cho cả phạm vi (giá trị đơn hoàn tất / số đơn hoàn tất).
 */
import { parseAmount } from "../../lib/reportFormat";
import type { RevenueComparison } from "../../types";

export interface KpiSummary {
  netRevenue: number;
  grossRevenue: number;
  refundAmount: number;
  pendingRefundAmount: number;
  orderCount: number;
  paidCancellationCount: number;
  /** null khi BE không trả (BE cũ chỉ có ở từng chi nhánh). */
  averageOrderValue: number | null;
}

export function summarizeKpi(comparison: RevenueComparison | undefined): KpiSummary {
  const totals = comparison?.totals;
  const only = comparison?.branches.length === 1 ? comparison.branches[0] : null;
  return {
    netRevenue: parseAmount(totals?.netRevenue ?? totals?.revenue),
    grossRevenue: parseAmount(totals?.grossRevenue),
    refundAmount: parseAmount(totals?.refundAmount),
    pendingRefundAmount: parseAmount(totals?.pendingRefundAmount),
    orderCount: totals?.orderCount ?? 0,
    paidCancellationCount: totals?.paidCancellationCount ?? 0,
    averageOrderValue: totals?.averageOrderValue !== undefined ? parseAmount(totals.averageOrderValue) : only ? parseAmount(only.averageOrderValue) : null,
  };
}
