/**
 * "Đơn cần xử lý" của Branch Manager (BM-05, lượt 7.5, quyết định 99–102): các hàm THUẦN, không React, có test ở `attention.test.ts`.
 *
 * BE `d98b4c1` chỉ đặt `OrderStatus.REQUIRES_ATTENTION` khi webhook/Kiểm tra lại báo SỐ TIỀN LỆCH (`counter-payment-settlement.service.ts:38-92`,
 * khoản → `AMOUNT_MISMATCH`, `receivedAmount` = số nhận được) và bỏ khi Manager xác nhận (→ `SUBMITTED`). Các loại "cần xử lý" khác của
 * đặc tả (đơn chờ xác nhận thủ công, tiền về sau khi đơn đã huỷ, hết món) BE CHƯA đánh dấu bằng trạng thái đơn: web KHÔNG giả lập (QĐ 64).
 */
import type { OperationsEvent } from "../../realtime/operations";
import type { OrderSummary } from "../../../types";

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
  /** Đã chờ tính từ lúc đặt đơn (BE không trả thời điểm lệch tiền — #65). */
  waitedMs: number | null;
  total: number;
  /** Số tiền nhận được theo khoản `AMOUNT_MISMATCH`; null nếu BE không trả. */
  received: number | null;
  /** received − total: âm = thiếu, dương = dư. */
  difference: number | null;
  kind: AttentionKind;
}

/** Cũ nhất trước (đơn chờ lâu nhất lên đầu); đơn không rõ thời gian xuống cuối. Chỉ lấy đơn đang `REQUIRES_ATTENTION`. */
export function toAttentionRows(items: OrderSummary[], now: number): AttentionRow[] {
  return items
    .filter((o) => o.status === ATTENTION_STATUS)
    .map((o): AttentionRow => {
      const mismatch = o.payments.find((p) => p.status === "AMOUNT_MISMATCH") ?? null;
      const received = mismatch?.receivedAmount ?? null;
      const difference = received === null ? null : received - o.total;
      const placed = o.placedAt ? new Date(o.placedAt).getTime() : NaN;
      return {
        id: o.id,
        orderCode: o.orderCode,
        callNumber: o.callNumber,
        placedAt: o.placedAt,
        waitedMs: Number.isFinite(placed) ? Math.max(0, now - placed) : null,
        total: o.total,
        received,
        difference,
        kind: difference === null ? "unknown" : difference < 0 ? "short" : difference > 0 ? "over" : "exact",
      };
    })
    .sort((a, b) => (a.placedAt ?? "9999").localeCompare(b.placedAt ?? "9999"));
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

export type AttentionReason = "PAYMENT_AMOUNT_MISMATCH" | "ITEM_OUT_OF_STOCK" | "OPTION_OUT_OF_STOCK" | "OTHER";

export interface AttentionAlertItem {
  /** Khoá chống trùng: `reason:orderId`. */
  key: string;
  reason: AttentionReason;
  orderId: string;
  expectedAmount?: number;
  receivedAmount?: number;
}

const REASONS: AttentionReason[] = ["PAYMENT_AMOUNT_MISMATCH", "ITEM_OUT_OF_STOCK", "OPTION_OUT_OF_STOCK"];
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

/** Một lượt gom → tối đa 2 thông báo: lệch số tiền (đỏ) và hết món (vàng). Tiếng Việt, kèm nơi "Xem". */
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
