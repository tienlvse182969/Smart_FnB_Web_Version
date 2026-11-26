/**
 * BM-05 "Đơn cần xử lý": Store Manager làm được gì với một đơn (các hàm THUẦN, có test ở `attentionActions.test.ts`).
 * Cùng điều kiện với BE (`managerAttentionRefund`, `resumeOutOfStockItems`, `resolveAttention`):
 *  - tiền về sau khi huỷ / sau khi đã thu tiền mặt → hoàn tiền mặt số đã nhận (đơn vẫn là đã huỷ);
 *  - tiền về sau khi QR hết hạn, chuyển thiếu → huỷ đơn và hoàn tiền mặt số đã nhận (hoặc xác nhận thủ công nếu đủ tiền);
 *  - hết món / hết tuỳ chọn → hoàn tiền mặt các món hết, làm tiếp khi đã có hàng, hoặc huỷ cả đơn;
 *  - lý do không rõ → đánh dấu đã xử lý (có ghi chú).
 * Mọi khoản hoàn đều là TIỀN MẶT, giống khoản hoàn của Thu ngân.
 */
import type { OrderDetail, OrderDetailLine, OrderPaymentRecord, RefundReasonCode } from "../../../types";
import { ATTENTION_STATUS, LATE_PAYMENT_REASONS, isAttentionOrder } from "./attention";
import { attentionReasonInfo, type AttentionReasonKind } from "./codes";

export const REFUND_REASON_LABEL: Record<RefundReasonCode, string> = {
  CHANGE_OF_MIND: "Khách đổi ý",
  WRONG_ITEM: "Sai món",
  OUT_OF_STOCK: "Hết món",
  LONG_WAIT: "Khách chờ lâu",
  OTHER: "Khác",
};
/** BE: lý do "Khác" cần ghi chú từ 5 ký tự. */
export const REFUND_NOTE_MIN = 5;
export const RESOLVE_NOTE_MIN = 5;

export interface AttentionRefundPlan {
  /** Số tiền mặt đưa lại cho khách khi hoàn cả đơn: số đã nhận trừ phần đã hoàn. */
  amount: number;
  /** Đơn chưa huỷ thì hoàn cả đơn sẽ huỷ đơn. */
  cancelsOrder: boolean;
  label: string;
  defaultReason: RefundReasonCode;
}

export interface AttentionPlan {
  needsAttention: boolean;
  kind: AttentionReasonKind;
  /** Hoàn cả đơn (null = không áp dụng). */
  refund: AttentionRefundPlan | null;
  /** Dòng gốc đang hết món (combo: dòng combo khi một thành phần hết). Hoàn từng món và làm tiếp chọn trong danh sách này. */
  outOfStockLines: OrderDetailLine[];
  canResolve: boolean;
}

const isLate = (p: OrderPaymentRecord, order: Pick<OrderDetail, "attentionReason">) =>
  p.status === ATTENTION_STATUS && LATE_PAYMENT_REASONS.includes(p.failureReason ?? order.attentionReason ?? "");

/** Khoản BE sẽ hoàn: khoản về muộn / cần xử lý trước, rồi khoản lệch tiền, rồi khoản đã thanh toán. */
function refundablePayment(order: OrderDetail): OrderPaymentRecord | null {
  const rank = (p: OrderPaymentRecord) => (p.status === ATTENTION_STATUS ? 0 : p.status === "AMOUNT_MISMATCH" ? 1 : p.status === "SUCCESS" ? 2 : 9);
  return [...order.payments].filter((p) => rank(p) < 9).sort((a, b) => rank(a) - rank(b))[0] ?? null;
}

function balanceOf(order: OrderDetail, payment: OrderPaymentRecord): number {
  const refunded = order.refunds.filter((r) => r.paymentId === payment.id).reduce((s, r) => s + r.amount, 0);
  return Math.max(0, (payment.receivedAmount ?? payment.amount) - refunded);
}

export function outOfStockRootLines(lines: OrderDetailLine[]): OrderDetailLine[] {
  const rootIds = new Set(lines.filter((l) => l.status === "OUT_OF_STOCK").map((l) => l.parentId ?? l.id));
  return lines.filter((l) => !l.parentId && rootIds.has(l.id));
}

export function attentionPlan(order: OrderDetail): AttentionPlan {
  const needsAttention = isAttentionOrder(order);
  const late = order.payments.find((p) => isLate(p, order)) ?? null;
  const kind: AttentionReasonKind = late ? "RECEIVED_AFTER_CANCELLATION" : attentionReasonInfo(order).kind;
  const none: AttentionPlan = { needsAttention, kind, refund: null, outOfStockLines: [], canResolve: false };
  if (!needsAttention) return none;

  const payment = late ?? refundablePayment(order);
  const amount = payment ? balanceOf(order, payment) : 0;
  const cancelsOrder = order.status !== "CANCELLED";
  const refundOf = (label: string, defaultReason: RefundReasonCode): AttentionRefundPlan | null =>
    amount > 0 ? { amount, cancelsOrder, label, defaultReason } : null;

  switch (kind) {
    case "RECEIVED_AFTER_CANCELLATION":
      return { ...none, refund: refundOf("Hoàn tiền mặt cho khách", "OTHER") };
    case "RECEIVED_AFTER_EXPIRY":
      return { ...none, refund: refundOf("Huỷ đơn và hoàn tiền mặt", "LONG_WAIT") };
    case "AMOUNT_MISMATCH": {
      // Nhận đủ hoặc dư thì xác nhận thủ công; nhận thiếu (BR-28) chỉ còn cách huỷ đơn và trả lại số đã nhận.
      const mismatch = order.payments.find((p) => p.status === "AMOUNT_MISMATCH");
      const short = !mismatch || mismatch.receivedAmount === null || mismatch.receivedAmount < mismatch.amount;
      return { ...none, refund: short ? refundOf("Huỷ đơn và hoàn số đã nhận", "OTHER") : null };
    }
    case "ITEM_OUT_OF_STOCK":
    case "OPTION_OUT_OF_STOCK":
      return { ...none, refund: refundOf("Huỷ cả đơn, hoàn tiền mặt", "OUT_OF_STOCK"), outOfStockLines: outOfStockRootLines(order.lines) };
    default: {
      const blocked =
        order.status !== ATTENTION_STATUS ||
        order.payments.some((p) => p.status === "AMOUNT_MISMATCH" || p.status === ATTENTION_STATUS) ||
        order.lines.some((l) => l.status === "OUT_OF_STOCK");
      return { ...none, canResolve: !blocked };
    }
  }
}

/** Số tiền mặt khi hoàn một số món hết: tổng các dòng chọn, không quá số còn có thể hoàn (BE `min(selectedTotal, balance)`). */
export function linesRefundAmount(order: OrderDetail, lineIds: string[]): number {
  const payment = refundablePayment(order);
  const balance = payment ? balanceOf(order, payment) : 0;
  const total = order.lines.filter((l) => lineIds.includes(l.id)).reduce((s, l) => s + l.total, 0);
  return Math.min(total, balance);
}

/** BE lưu lý do hoàn dạng "MÃ: ghi chú" (vd. "OTHER: khách đã về") → "Khác: khách đã về" để hiện cho người dùng. */
export function refundReasonText(reason: string | null): string | null {
  if (!reason) return reason;
  const match = /^(CHANGE_OF_MIND|WRONG_ITEM|OUT_OF_STOCK|LONG_WAIT|OTHER)(?::\s*(.*))?$/s.exec(reason.trim());
  if (!match) return reason;
  const label = REFUND_REASON_LABEL[match[1] as RefundReasonCode];
  return match[2] ? `${label}: ${match[2]}` : label;
}

/** Lý do + ghi chú đủ để gửi (BE: "Khác" cần ghi chú ≥ 5 ký tự). */
export function refundReasonValid(reasonCode: RefundReasonCode, note: string): boolean {
  return reasonCode !== "OTHER" || note.trim().length >= REFUND_NOTE_MIN;
}
