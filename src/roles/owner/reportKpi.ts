/**
 * Thẻ số của báo cáo Owner (OW-08): chỉ đọc số BE trả, KHÔNG tự tính (BR-50: hoàn trừ vào ngày huỷ do BE gom).
 * Giá trị đơn trung bình: ưu tiên số BE trả ở tổng (`totals.averageOrderValue`); BE cũ không trả thì chỉ hiện khi phạm vi
 * đúng một chi nhánh (lấy số của chi nhánh đó), còn lại là null — web không tự chia.
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
  /** null khi BE không trả ở tổng và phạm vi có ≠ 1 chi nhánh. */
  averageOrderValue: number | null;
}

export function summarizeKpi(comparison: RevenueComparison | undefined): KpiSummary {
  const totals = comparison?.totals;
  const only = comparison?.branches.length === 1 ? comparison.branches[0] : null;
  const fromTotals = totals?.averageOrderValue;
  return {
    netRevenue: parseAmount(totals?.netRevenue ?? totals?.revenue),
    grossRevenue: parseAmount(totals?.grossRevenue),
    refundAmount: parseAmount(totals?.refundAmount),
    pendingRefundAmount: parseAmount(totals?.pendingRefundAmount),
    orderCount: totals?.orderCount ?? 0,
    paidCancellationCount: totals?.paidCancellationCount ?? 0,
    averageOrderValue: fromTotals !== undefined && fromTotals !== null ? parseAmount(fromTotals) : only ? parseAmount(only.averageOrderValue) : null,
  };
}
