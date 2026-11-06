/**
 * Khoản hoàn của đơn (BM-06, BR-50): các hàm THUẦN, không React, có test ở `paidCancel.test.ts`.
 * Store Manager không còn huỷ đơn đã trả trực tiếp (BE gỡ `cancel-paid`); yêu cầu hoàn do Thu ngân gửi, Store Manager chỉ duyệt.
 */
import type { OrderRefundRecord } from "../../../types";
import { ApiError } from "../../http/errors";

export const REFUND_NOTE_MAX = 500;

export function validateRefundNote(raw: string): string | null {
  return raw.trim().length > REFUND_NOTE_MAX ? `Ghi chú tối đa ${REFUND_NOTE_MAX} ký tự.` : null;
}

/** Khoản mà nút "Đánh dấu đã hoàn" áp dụng: chuyển khoản đang chờ (BE: chỉ PENDING + BANK_TRANSFER; tiền mặt đã hoàn ngay). */
export function refundCompletable(refund: Pick<OrderRefundRecord, "status" | "method">): boolean {
  return refund.status === "PENDING" && refund.method === "BANK_TRANSFER";
}

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
