/**
 * Khoản hoàn của đơn (BM-06, BR-50): các hàm THUẦN, không React, có test ở `paidCancel.test.ts`.
 * Store Manager không còn huỷ đơn đã trả trực tiếp (BE gỡ `cancel-paid`); yêu cầu hoàn do Thu ngân gửi, Store Manager chỉ duyệt.
 */
import type { OrderRefundRecord } from "../../../types";
import { ApiError } from "../../http/errors";

/** Tổng tiền còn chờ hoàn của đơn. */
export function pendingRefundTotal(refunds: OrderRefundRecord[]): number {
  return refunds.filter((r) => r.status === "PENDING").reduce((s, r) => s + r.amount, 0);
}

export interface PaidActionErrorInfo {
  /** Đóng hộp và GET lại chi tiết đơn (409, 404: dữ liệu trên màn đã cũ). 400, 403, 5xx, mạng: giữ hộp để sửa/thử lại. */
  refresh: boolean;
  error: unknown;
}

/** Phân loại lỗi của `refunds/:id/complete` (cùng quy tắc `confirmErrorInfo`, quyết định 84). */
export function paidActionErrorInfo(err: unknown): PaidActionErrorInfo {
  const status = err instanceof ApiError ? err.status : 0;
  return { refresh: status === 409 || status === 404, error: err };
}
