/**
 * Xác nhận chuyển khoản thủ công (BM-05, quyết định 82–84): các hàm THUẦN, không React, có test ở `manualConfirm.test.ts`.
 * Căn cứ BE `main` `d98b4c1`: `payments.service.ts:144-186` (Manager, lý do 3–500, `receivedAmount` bắt buộc, chỉ `BANK_TRANSFER`),
 * `counter-payment-settlement.service.ts:94-135` (khoản `PENDING` hoặc `AMOUNT_MISMATCH`; đơn `CONFIRMED` hoặc `REQUIRES_ATTENTION`; nhận thiếu → 409).
 */
import type { OrderDetail, OrderPaymentRecord } from "../../../types";
import { ApiError, PAYMENT_AMOUNT_INSUFFICIENT_TEXT } from "../../http/errors";

export const CONFIRM_REASON_MIN = 3;
export const CONFIRM_REASON_MAX = 500;
export const CONFIRM_REF_MAX = 255;
/** `ConfirmPaymentDto.receivedAmount` tối đa 999999999999.99 (`payment.dto.ts`). */
export const CONFIRM_AMOUNT_MAX = 999_999_999_999;

/** Câu BR-28 khi nhận thiếu (cả ở ô nhập lẫn khi BE trả 409 `PAYMENT_AMOUNT_INSUFFICIENT`). Việc huỷ đơn thuộc 7.6. */
export const SHORT_RECEIVED_TEXT = PAYMENT_AMOUNT_INSUFFICIENT_TEXT;
/** GĐ-04: nhắc kiểm tiền thật trước khi xác nhận. */
export const CONFIRM_REMINDER = "Chỉ xác nhận khi đã kiểm tra tiền đã vào tài khoản của quán.";

/**
 * Khoản mà nút "Xác nhận thủ công" áp dụng (quyết định 82), hoặc null nếu không có nút:
 *  - đơn chưa trả, chưa huỷ, trạng thái `CONFIRMED` (chờ thanh toán) hoặc `REQUIRES_ATTENTION` (cần xử lý) — đúng điều kiện BE;
 *  - đơn chưa có khoản `SUCCESS`;
 *  - khoản chuyển khoản (`BANK_TRANSFER`) `PENDING` hoặc `AMOUNT_MISMATCH`. KHÔNG cho tiền mặt, KHÔNG cho `FAILED`.
 * Nhiều khoản đủ điều kiện: ưu tiên "Lệch số tiền", rồi khoản mới nhất.
 */
export function confirmableTransfer(order: Pick<OrderDetail, "status" | "paymentStatus" | "payments">): OrderPaymentRecord | null {
  if (order.paymentStatus !== "UNPAID") return null;
  if (order.status !== "CONFIRMED" && order.status !== "REQUIRES_ATTENTION") return null;
  if (order.payments.some((p) => p.status === "SUCCESS")) return null;
  const eligible = order.payments.filter((p) => p.method === "BANK_TRANSFER" && (p.status === "PENDING" || p.status === "AMOUNT_MISMATCH"));
  if (eligible.length === 0) return null;
  const rank = (p: OrderPaymentRecord) => (p.status === "AMOUNT_MISMATCH" ? 1 : 0);
  return [...eligible].sort((a, b) => rank(b) - rank(a) || (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))[0];
}

export type ReceivedCheck =
  /** Chưa nhập hoặc không phải số dương. */
  | { kind: "empty" }
  /** BR-28: nhỏ hơn số cần nhận — KHOÁ xác nhận. */
  | { kind: "short"; shortBy: number }
  | { kind: "exact" }
  /** Lớn hơn: ghi nhận phần dư, quán trả lại khách. */
  | { kind: "over"; change: number };

/** BR-28 so số tiền thực nhận với số cần nhận (`expected` = số tiền của khoản, BE so đúng số này). Số nguyên đồng (BR-19). */
export function checkReceived(expected: number, received: number | null): ReceivedCheck {
  if (received === null || !Number.isFinite(received) || received <= 0) return { kind: "empty" };
  if (received < expected) return { kind: "short", shortBy: expected - received };
  if (received === expected) return { kind: "exact" };
  return { kind: "over", change: received - expected };
}

/** Số tiền gõ trong ô (cho phép dấu chấm/phẩy/dấu cách nghìn) → số nguyên đồng; null nếu rỗng hoặc có ký tự lạ. */
export function parseVndInput(raw: string): number | null {
  const digits = raw.replace(/[\s.,]/g, "");
  if (digits === "" || !/^\d+$/.test(digits)) return null;
  const value = Number(digits);
  return Number.isSafeInteger(value) ? value : null;
}

/** Lý do sau khi trim phải 3–500 ký tự (DTO BE trim rồi kiểm). Trả câu lỗi hoặc null. */
export function validateReason(raw: string): string | null {
  const text = raw.trim();
  if (text.length === 0) return "Vui lòng nhập lý do xác nhận.";
  if (text.length < CONFIRM_REASON_MIN) return `Lý do phải có ít nhất ${CONFIRM_REASON_MIN} ký tự.`;
  if (text.length > CONFIRM_REASON_MAX) return `Lý do tối đa ${CONFIRM_REASON_MAX} ký tự.`;
  return null;
}

export function validateRef(raw: string): string | null {
  return raw.trim().length > CONFIRM_REF_MAX ? `Mã giao dịch tối đa ${CONFIRM_REF_MAX} ký tự.` : null;
}

export interface ConfirmErrorInfo {
  /** Đóng hộp xác nhận và GET lại chi tiết đơn (409, 404: dữ liệu trên màn đã cũ). 400, 403, 5xx, mạng: giữ hộp để sửa/thử lại. */
  refresh: boolean;
  /** Câu tiếng Việt hiện cho người dùng (qua `showApiError`, không bao giờ tiếng Anh thô). */
  error: unknown;
}

/** Phân loại lỗi `POST /payments/:id/confirm` theo quyết định 84. */
export function confirmErrorInfo(err: unknown): ConfirmErrorInfo {
  const status = err instanceof ApiError ? err.status : 0;
  return { refresh: status === 409 || status === 404, error: err };
}

export interface ConfirmFormState {
  reason: string;
  /** Chuỗi đang gõ ở ô số tiền. */
  received: string;
  transactionRef: string;
}

/** Nút gửi chỉ mở khi mọi ô hợp lệ và BR-28 không chặn. */
export function canSubmitConfirm(expected: number, form: ConfirmFormState): boolean {
  if (validateReason(form.reason) !== null || validateRef(form.transactionRef) !== null) return false;
  const received = parseVndInput(form.received);
  if (received !== null && received > CONFIRM_AMOUNT_MAX) return false;
  const check = checkReceived(expected, received);
  return check.kind === "exact" || check.kind === "over";
}
