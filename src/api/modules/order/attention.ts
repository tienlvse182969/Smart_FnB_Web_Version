/**
 * "Đơn cần xử lý" của Branch Manager (BM-05, lượt 7.5, quyết định 99–102): các hàm THUẦN, không React, có test ở `attention.test.ts`.
 *
 * BE `d98b4c1` chỉ đặt `OrderStatus.REQUIRES_ATTENTION` khi webhook/Kiểm tra lại báo SỐ TIỀN LỆCH (`counter-payment-settlement.service.ts:38-92`,
 * khoản → `AMOUNT_MISMATCH`, `receivedAmount` = số nhận được) và bỏ khi Manager xác nhận (→ `SUBMITTED`).
 * BE `fb7cae9` (QĐ 123) thêm hai loại có `attentionReason` + `attentionAt`: hết món/tuỳ chọn khi đơn đã trả (`PAID_ITEM_OUT_OF_STOCK`,
 * `PAID_OPTION_OUT_OF_STOCK`) và tiền về sau khi QR hết hạn (`PAYMENT_RECEIVED_AFTER_EXPIRY`, khoản `REQUIRES_ATTENTION`). Mỗi dòng hiện
 * theo LÝ DO; cột tiền chỉ có nghĩa với loại lệch tiền. Loại chưa có ở BE (đơn QR chờ xác nhận tay quá lâu, #67a) web KHÔNG giả lập (QĐ 64).
 */
import type { OperationsEvent } from "../../realtime/operations";
import type { OrderSummary } from "../../../types";
import { attentionReasonInfo, type AttentionReasonKind } from "./codes";

export const ATTENTION_STATUS = "REQUIRES_ATTENTION";
/** Sự kiện của BE báo Manager (`manager.order.attention-required`): payload theo `reason`. */
export const ATTENTION_EVENT = "manager.order.attention-required";
/** Tải lại định kỳ khi chưa có #51 (BE không phát sự kiện cho mọi thay đổi): chỉ khi tab hiển thị (QĐ 101). */
export const ATTENTION_POLL_MS = 60_000;
/** Gom sự kiện thành một thông báo (QĐ 100). */
export const ATTENTION_ALERT_WINDOW_MS = 2_000;

export type AttentionKind = "short" | "over" | "exact" | "unknown";

export interface AttentionRow {
  id: string;
  orderCode: string;
  callNumber: number | null;
  placedAt: string | null;
  /** Đã chờ: từ `attentionAt` khi BE có (#65), không thì từ lúc đặt đơn (`waitedFromPlaced`). */
  waitedMs: number | null;
  /** true = `waitedMs` tính từ lúc đặt đơn (BE chưa ghi `attentionAt`, #77): màn ghi "(từ lúc đặt)". */
  waitedFromPlaced: boolean;
  total: number;
  /** Lý do hiện cho Manager (QĐ 123): mã BE hoặc suy từ khoản; nhãn tiếng Việt; mã lạ → "Khác (<mã>)". */
  reasonCode: string | null;
  reasonKind: AttentionReasonKind;
  reasonLabel: string;
  /** Số tiền nhận được theo khoản `AMOUNT_MISMATCH`; null nếu không phải loại lệch tiền hoặc BE không trả. */
  received: number | null;
  /** received − total: âm = thiếu, dương = dư. Chỉ có ở loại lệch tiền. */
  difference: number | null;
  kind: AttentionKind;
}

/**
 * Thứ tự do BE sắp (`sortBy=attentionAt&sortOrder=asc`, #66; đơn chưa có `attentionAt` xếp cuối) — web KHÔNG sắp lại.
 * Chỉ lấy đơn đang `REQUIRES_ATTENTION`.
 */
export function toAttentionRows(items: OrderSummary[], now: number): AttentionRow[] {
  return items
    .filter((o) => o.status === ATTENTION_STATUS)
    .map((o): AttentionRow => {
      const reason = attentionReasonInfo(o);
      // Cột tiền chỉ cho loại lệch tiền (QĐ 123).
      const mismatch = reason.kind === "AMOUNT_MISMATCH" ? (o.payments.find((p) => p.status === "AMOUNT_MISMATCH") ?? null) : null;
      const received = mismatch?.receivedAmount ?? null;
      const difference = received === null ? null : received - o.total;
      const since = o.attentionAt ?? o.placedAt;
      const sinceMs = since ? new Date(since).getTime() : NaN;
      return {
        id: o.id,
        orderCode: o.orderCode,
        callNumber: o.callNumber,
        placedAt: o.placedAt,
        waitedMs: Number.isFinite(sinceMs) ? Math.max(0, now - sinceMs) : null,
        waitedFromPlaced: !o.attentionAt,
        total: o.total,
        reasonCode: reason.code,
        reasonKind: reason.kind,
        reasonLabel: reason.label,
        received,
        difference,
        kind: difference === null ? "unknown" : difference < 0 ? "short" : difference > 0 ? "over" : "exact",
      };
    });
}

/** "vừa xong" / "12 phút" / "1 giờ 5 phút" / "2 ngày 3 giờ". */
export function formatWaited(ms: number | null): string {
  if (ms === null) return "—";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return minutes % 60 ? `${hours} giờ ${minutes % 60} phút` : `${hours} giờ`;
  const days = Math.floor(hours / 24);
  return hours % 24 ? `${days} ngày ${hours % 24} giờ` : `${days} ngày`;
}

// ---------------------------------------------------------------------------------------------------------------------
// Cảnh báo từ socket
// ---------------------------------------------------------------------------------------------------------------------

export type AttentionReason =
  | "PAYMENT_AMOUNT_MISMATCH"
  | "PAYMENT_RECEIVED_AFTER_CANCELLATION"
  | "PAYMENT_RECEIVED_AFTER_EXPIRY"
  | "ITEM_OUT_OF_STOCK"
  | "OPTION_OUT_OF_STOCK"
  | "OTHER";

export interface AttentionAlertItem {
  /** Khoá chống trùng: `reason:orderId`. */
  key: string;
  reason: AttentionReason;
  orderId: string;
  expectedAmount?: number;
  receivedAmount?: number;
}

const REASONS: AttentionReason[] = ["PAYMENT_AMOUNT_MISMATCH", "PAYMENT_RECEIVED_AFTER_CANCELLATION", "PAYMENT_RECEIVED_AFTER_EXPIRY", "ITEM_OUT_OF_STOCK", "OPTION_OUT_OF_STOCK"];
const asNumber = (v: unknown): number | undefined => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
};

/**
 * Sự kiện `manager.order.attention-required` → các mục cảnh báo, mỗi đơn một mục. Payload (BE):
 *  - `PAYMENT_AMOUNT_MISMATCH` `{ orderId, paymentId, expectedAmount, receivedAmount }` (`counter-payment-settlement.service.ts:83-89`);
 *  - `ITEM_OUT_OF_STOCK` `{ menuItemId, orderIds }`, `OPTION_OUT_OF_STOCK` `{ optionId, orderIds }` (`counter-operations.controller.ts:351, 371`).
 * Sự kiện khác loại → []. Payload thiếu id đơn → [].
 */
export function attentionItemsOf(event: OperationsEvent): AttentionAlertItem[] {
  if (event.type !== ATTENTION_EVENT) return [];
  const data = (event.data ?? {}) as Record<string, unknown>;
  const raw = typeof data.reason === "string" ? data.reason : "";
  const reason: AttentionReason = (REASONS as string[]).includes(raw) ? (raw as AttentionReason) : "OTHER";
  const ids: string[] = [];
  if (typeof data.orderId === "string") ids.push(data.orderId);
  if (Array.isArray(data.orderIds)) ids.push(...data.orderIds.filter((x): x is string => typeof x === "string"));
  return [...new Set(ids)].map((orderId) => ({
    key: `${reason}:${orderId}`,
    reason,
    orderId,
    expectedAmount: asNumber(data.expectedAmount),
    receivedAmount: asNumber(data.receivedAmount),
  }));
}

export interface AlertBatcher {
  push(items: AttentionAlertItem[]): void;
  dispose(): void;
}

/**
 * Gom mục cảnh báo trong `windowMs` kể từ mục đầu tiên thành MỘT lượt `onBatch`; mục đã báo (cùng `key`) không báo lại
 * (quyết định 100: không trùng theo orderId).
 */
export function createAlertBatcher({ windowMs = ATTENTION_ALERT_WINDOW_MS, onBatch }: { windowMs?: number; onBatch: (items: AttentionAlertItem[]) => void }): AlertBatcher {
  const seen = new Set<string>();
  let pending: AttentionAlertItem[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;
  return {
    push(items) {
      if (disposed) return;
      for (const item of items) {
        if (seen.has(item.key)) continue;
        seen.add(item.key);
        pending.push(item);
      }
      if (pending.length > 0 && timer === null) {
        timer = setTimeout(() => {
          timer = null;
          const batch = pending;
          pending = [];
          if (!disposed && batch.length > 0) onBatch(batch);
        }, windowMs);
      }
    },
    dispose() {
      disposed = true;
      if (timer !== null) clearTimeout(timer);
      timer = null;
      pending = [];
    },
  };
}

export interface AttentionAlertText {
  /** Khoá thông báo của antd (thay thế thay vì chồng). */
  key: string;
  text: string;
  /** Nơi nút "Xem" dẫn tới. */
  to: string;
  tone: "error" | "warning";
}

const ORDERS_PATH = "/manager/orders";
const ATTENTION_PATH = "/manager/orders/needs-attention";

/** Một lượt gom → tối đa 4 thông báo: lệch số tiền, tiền về muộn (sau huỷ / sau hết hạn QR) và hết món. Tiếng Việt, kèm nơi "Xem". */
export function describeAttentionBatch(items: AttentionAlertItem[], formatMoney: (n: number) => string): AttentionAlertText[] {
  const out: AttentionAlertText[] = [];
  const mismatch = items.filter((i) => i.reason === "PAYMENT_AMOUNT_MISMATCH");
  if (mismatch.length === 1) {
    const m = mismatch[0];
    const detail = m.receivedAmount !== undefined && m.expectedAmount !== undefined ? `: nhận ${formatMoney(m.receivedAmount)}, cần ${formatMoney(m.expectedAmount)}` : "";
    out.push({ key: "attention-mismatch", text: `Có đơn chuyển khoản lệch số tiền${detail}. Cần xử lý.`, to: `${ORDERS_PATH}/${m.orderId}`, tone: "error" });
  } else if (mismatch.length > 1) {
    out.push({ key: "attention-mismatch", text: `Có ${mismatch.length} đơn chuyển khoản lệch số tiền cần xử lý.`, to: ATTENTION_PATH, tone: "error" });
  }
  // Tiền về SAU khi đơn đã huỷ (#43): BE tự ghi MỘT khoản phải hoàn (`refund.pending`); Manager hoàn ngoài hệ thống rồi đánh dấu đã hoàn.
  const late = items.filter((i) => i.reason === "PAYMENT_RECEIVED_AFTER_CANCELLATION");
  if (late.length === 1) {
    const l = late[0];
    const detail = l.receivedAmount !== undefined ? `: cần hoàn ${formatMoney(l.receivedAmount)}` : "";
    out.push({ key: "attention-late", text: `Có khoản tiền về sau khi đơn đã huỷ${detail}.`, to: `${ORDERS_PATH}/${l.orderId}`, tone: "error" });
  } else if (late.length > 1) {
    out.push({ key: "attention-late", text: `Có ${late.length} khoản tiền về sau khi đơn đã huỷ, cần hoàn lại cho khách.`, to: ATTENTION_PATH, tone: "error" });
  }
  // Tiền về SAU khi QR hết hạn (BE `fb7cae9`, #61): đơn KHÔNG vào hàng đợi pha; chờ xử lý (đường xử lý của BE: #75).
  const expired = items.filter((i) => i.reason === "PAYMENT_RECEIVED_AFTER_EXPIRY");
  if (expired.length === 1) {
    const e = expired[0];
    const detail = e.receivedAmount !== undefined ? `: nhận ${formatMoney(e.receivedAmount)}` : "";
    out.push({ key: "attention-expired", text: `Có khoản tiền về sau khi mã QR hết hạn${detail}. Đơn chưa được đưa xuống pha chế.`, to: `${ORDERS_PATH}/${e.orderId}`, tone: "error" });
  } else if (expired.length > 1) {
    out.push({ key: "attention-expired", text: `Có ${expired.length} khoản tiền về sau khi mã QR hết hạn, đơn chưa được đưa xuống pha chế.`, to: ATTENTION_PATH, tone: "error" });
  }
  const stock = items.filter((i) => i.reason === "ITEM_OUT_OF_STOCK" || i.reason === "OPTION_OUT_OF_STOCK");
  if (stock.length > 0) {
    out.push({ key: "attention-stock", text: `Pha chế báo hết món hoặc tuỳ chọn: ${stock.length} đơn đã trả tiền có món này.`, to: ORDERS_PATH, tone: "warning" });
  }
  const other = items.filter((i) => i.reason === "OTHER");
  if (other.length > 0) {
    out.push({ key: "attention-other", text: `Có ${other.length} đơn cần xử lý.`, to: ATTENTION_PATH, tone: "warning" });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// Tải định kỳ dự phòng (#51)
// ---------------------------------------------------------------------------------------------------------------------

export interface Poller {
  /** Bắt đầu (nếu tab đang hiển thị) hoặc chờ tới khi hiện. */
  start(): void;
  /** Gọi khi `visibilitychange`: hiện → tải ngay + chạy lại; ẩn → dừng. */
  onVisibilityChange(): void;
  dispose(): void;
}

/**
 * Tải lại mỗi `intervalMs` khi tab hiển thị; tab ẩn thì DỪNG (không tải); hiện lại thì tải NGAY rồi chạy tiếp (quyết định 101).
 * Dọn timer khi `dispose`. `load` là hàm GET của màn.
 */
export function createPoller({ load, isVisible, intervalMs = ATTENTION_POLL_MS }: { load: () => void; isVisible: () => boolean; intervalMs?: number }): Poller {
  let timer: ReturnType<typeof setInterval> | null = null;
  let disposed = false;
  const stop = () => {
    if (timer !== null) clearInterval(timer);
    timer = null;
  };
  const run = () => {
    stop();
    timer = setInterval(() => {
      if (!disposed && isVisible()) load();
    }, intervalMs);
  };
  return {
    start() {
      if (disposed) return;
      if (isVisible()) run();
    },
    onVisibilityChange() {
      if (disposed) return;
      if (isVisible()) {
        load();
        run();
      } else {
        stop();
      }
    },
    dispose() {
      disposed = true;
      stop();
    },
  };
}
