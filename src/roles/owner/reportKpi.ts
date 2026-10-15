/**
 * Thẻ số của báo cáo Owner (OW-08): chỉ đọc số BE trả, KHÔNG tự tính (BR-50: hoàn trừ vào ngày huỷ do BE gom).
 * Giá trị đơn trung bình ở phần tổng do BE tính (`totals.averageOrderValue`, BE `8a315ad`, #98).
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
  /** null khi chưa có dữ liệu hoặc BE cũ chưa trả trường này. */
  averageOrderValue: number | null;
}

export function summarizeKpi(comparison: RevenueComparison | undefined): KpiSummary {
  const totals = comparison?.totals;
  return {
    netRevenue: parseAmount(totals?.netRevenue ?? totals?.revenue),
    grossRevenue: parseAmount(totals?.grossRevenue),
    refundAmount: parseAmount(totals?.refundAmount),
    pendingRefundAmount: parseAmount(totals?.pendingRefundAmount),
    orderCount: totals?.orderCount ?? 0,
    paidCancellationCount: totals?.paidCancellationCount ?? 0,
    averageOrderValue: totals?.averageOrderValue == null ? null : parseAmount(totals.averageOrderValue),
  };
}

/**
 * BE chặn MỌI báo cáo Owner gộp từ 2 chi nhánh trở lên khi gói không có "so sánh đa chi nhánh" (`PLAN_FEATURE_NOT_ENABLED`,
 * BE `8a315ad`, #84). Gói không có tính năng thì web chỉ gọi theo ĐÚNG MỘT chi nhánh (chi nhánh đầu tiên nếu chưa chọn).
 */
export function resolveReportBranchIds(opts: {
  selected: string | null;
  branchIds: string[];
  canCompare: boolean;
}): string[] | undefined {
  const { selected, branchIds, canCompare } = opts;
  if (selected) return [selected];
  if (canCompare) return undefined;
  return branchIds.length > 0 ? [branchIds[0]] : undefined;
}

/** Lỗi BE chặn tính năng theo gói (403, `error: PLAN_FEATURE_NOT_ENABLED`). */
export const PLAN_FEATURE_NOT_ENABLED = "PLAN_FEATURE_NOT_ENABLED";
