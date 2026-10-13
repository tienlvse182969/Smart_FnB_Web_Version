/**
 * Huỷ đơn đã trả và khoản phải hoàn (BM-06, BR-28, BR-49, BR-50): các hàm THUẦN, không React, có test ở `paidCancel.test.ts`.
 * Căn cứ BE `main` `514c426` (#43): `paid-order-refund.service.ts:124-345` (huỷ), `:347-404` (đánh dấu đã hoàn), `manager.dto.ts`
 * `CancelPaidOrderDto`/`CompleteRefundDto`. Nền tảng KHÔNG chuyển tiền và không gọi API hoàn tiền của PayOS: chỉ ghi quán phải hoàn.
 */
import type { OrderDetail, OrderDetailLine, OrderRefundRecord } from "../../../types";
import { ApiError } from "../../http/errors";
import { CONFIRM_REASON_MAX, CONFIRM_REASON_MIN, isLateAfterExpiry } from "./manualConfirm";

export const CANCEL_REASON_MIN = CONFIRM_REASON_MIN;
export const CANCEL_REASON_MAX = CONFIRM_REASON_MAX;
export const REFUND_NOTE_MAX = 500;

/** Trạng thái đơn mà BE cho huỷ (`cancellableOrderStatuses`, `paid-order-refund.service.ts:27-32`). Đã giao/hoàn tất/đã huỷ → 409. */
export const CANCELLABLE_ORDER_STATUSES: readonly string[] = ["SUBMITTED", "PREPARING", "READY", "REQUIRES_ATTENTION"];

export interface CancelTarget {
  /** `paid` = đã trả (SUCCESS); `mismatch` = nhận lệch số tiền (AMOUNT_MISMATCH): chỉ huỷ cả đơn, hoàn đúng số đã nhận. */
  kind: "paid" | "mismatch" | "late";
  paymentId: string;
  /** Số tiền thực nhận của khoản. */
  received: number;
  /** Số còn có thể hoàn = đã nhận − tổng các khoản hoàn đã ghi (BE `refundableBalance`). */
  balance: number;
}

const sumRefunds = (refunds: OrderRefundRecord[]) => refunds.reduce((s, r) => s + r.amount, 0);

/**
 * Khoản mà nút "Huỷ đơn và ghi hoàn tiền" áp dụng, hoặc null nếu không có nút (đúng điều kiện BE):
 *  - đơn quầy ở trạng thái SUBMITTED / PREPARING / READY / REQUIRES_ATTENTION (chưa giao, chưa huỷ);
 *  - đơn đã trả (`paymentStatus` PAID) có khoản SUCCESS, HOẶC có khoản AMOUNT_MISMATCH (đơn Cần xử lý, BR-28);
 *  - còn số dư để hoàn (> 0).
 * BE ưu tiên khoản SUCCESS rồi mới AMOUNT_MISMATCH (`orderBy status desc`).
 */
export function cancelTarget(order: Pick<OrderDetail, "status" | "paymentStatus" | "payments" | "refunds">): CancelTarget | null {
  if (!CANCELLABLE_ORDER_STATUSES.includes(order.status)) return null;
  const success = order.paymentStatus === "PAID" ? order.payments.find((p) => p.status === "SUCCESS") : undefined;
  const mismatch = success ? undefined : order.payments.find((p) => p.status === "AMOUNT_MISMATCH");
  // #75 (BE `7d7f2dc`, `paid-order-refund.service.ts:133-190`): tiền về sau khi QR hết hạn (`REQUIRES_ATTENTION` +
  // `PAYMENT_RECEIVED_AFTER_EXPIRY`): huỷ CẢ ĐƠN, hoàn đúng số đã nhận.
  const late = success || mismatch ? undefined : order.payments.find((p) => isLateAfterExpiry(p));
  const payment = success ?? mismatch ?? late;
  if (!payment) return null;
  const received = payment.receivedAmount ?? payment.amount;
  const balance = received - sumRefunds(order.refunds);
  if (balance <= 0) return null;
  return { kind: success ? "paid" : mismatch ? "mismatch" : "late", paymentId: payment.id, received, balance };
}

/** Dòng còn huỷ được: chưa huỷ và chưa nằm trong khoản hoàn nào (BE `activeItems`). */
export function cancellableLines(order: Pick<OrderDetail, "lines" | "refunds">): OrderDetailLine[] {
  const refunded = new Set(order.refunds.flatMap((r) => r.lines.map((l) => l.orderItemId)));
  return order.lines.filter((l) => l.status !== "CANCELLED" && !refunded.has(l.id));
}

/**
 * Số tiền phải hoàn khi huỷ (BE `refundAmount`): cả đơn = toàn bộ số dư; huỷ một phần = min(tổng các dòng chọn, số dư).
 * `selected` rỗng = cả đơn. Khoản lệch thiếu chỉ huỷ cả đơn: số hoàn = số đã nhận.
 */
export function refundAmountFor(target: CancelTarget, lines: OrderDetailLine[], selected: string[]): number {
  if (target.kind !== "paid" || selected.length === 0) return target.balance;
  const total = lines.filter((l) => selected.includes(l.id)).reduce((s, l) => s + l.total, 0);
  return Math.min(total, target.balance);
}

/** Lý do 3–500 ký tự sau khi trim (DTO BE trim rồi kiểm). Trả câu lỗi hoặc null. */
export function validateCancelReason(raw: string): string | null {
  const text = raw.trim();
  if (text.length === 0) return "Vui lòng nhập lý do huỷ đơn.";
  if (text.length < CANCEL_REASON_MIN) return `Lý do phải có ít nhất ${CANCEL_REASON_MIN} ký tự.`;
  if (text.length > CANCEL_REASON_MAX) return `Lý do tối đa ${CANCEL_REASON_MAX} ký tự.`;
  return null;
}

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

/** Thân gửi BE: đúng 3 ô của DTO; `orderItemIds` chỉ gửi khi chọn dòng (không gửi = huỷ cả đơn). */
export function buildCancelBody(input: { reason: string; refundMethod: "CASH" | "BANK_TRANSFER"; orderItemIds?: string[] }): Record<string, unknown> {
  const body: Record<string, unknown> = { reason: input.reason.trim(), refundMethod: input.refundMethod };
  if (input.orderItemIds && input.orderItemIds.length > 0) body.orderItemIds = input.orderItemIds;
  return body;
}

export interface PaidActionErrorInfo {
  /** Đóng hộp và GET lại chi tiết đơn (409, 404: dữ liệu trên màn đã cũ). 400, 403, 5xx, mạng: giữ hộp để sửa/thử lại. */
  refresh: boolean;
  error: unknown;
}

/** Phân loại lỗi của `cancel-paid` và `refunds/:id/complete` (cùng quy tắc `confirmErrorInfo`, quyết định 84). */
export function paidActionErrorInfo(err: unknown): PaidActionErrorInfo {
  const status = err instanceof ApiError ? err.status : 0;
  return { refresh: status === 409 || status === 404, error: err };
}
