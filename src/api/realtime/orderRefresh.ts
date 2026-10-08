/**
 * Lõi (thuần, không React) của việc tự làm tươi màn đơn khi có sự kiện socket (GĐ7, quyết định 74).
 *
 * Nguyên tắc: sự kiện chỉ là TÍN HIỆU "có thay đổi". Màn tải lại bằng GET, KHÔNG ráp dữ liệu từ payload.
 *  - gom: nhiều sự kiện trong `delayMs` (mặc định 500 ms) → đúng 1 lần tải;
 *  - tab ẩn: không tải; ghi nhớ "có sự kiện bị bỏ lỡ", khi tab hiện lại thì tải 1 lần;
 *  - nối lại sau khi mất kết nối: tải 1 lần (có thể đã bỏ lỡ sự kiện);
 *  - chi tiết một đơn: chỉ quan tâm sự kiện của đơn đó; payload không có id đơn thì tải luôn.
 *
 * Sự kiện BE phát tới phòng chi nhánh liên quan đơn (docs/BAN-GIAO.md, mục 7.2): xem `ORDER_EVENT_TYPES`.
 */
import type { OperationsEvent } from "./operations";

/**
 * Loại sự kiện làm đổi đơn, dòng món hoặc thanh toán:
 *  - `cashier.order.updated` { orderId }: sửa giỏ nháp (thêm/xoá/đổi dòng);
 *  - `payment.created` { id, status }, `payment.confirmed` { orderId, callNumber } (thu tiền mặt, webhook PayOS) hoặc { id, status } (xác nhận thủ công);
 *  - `preparation.order.queued` { orderId, callNumber? }: đơn đã trả được đẩy xuống pha chế;
 *  - `preparation.batch.started` { unitIds }, `preparation.batch.completed` { …, readyOrders }, `preparation.item.started|completed|undone` { unitId }: pha chế;
 *  - `preparation.order.delivered` { orderId }: pha chế bấm Đã giao;
 *  - `manager.order.attention-required` { reason, orderIds }: hết món/tuỳ chọn khi còn đơn đã trả.
 * KHÔNG có sự kiện cho: chốt đơn (`POST /cashier/checkout`) và huỷ đơn chưa trả (`POST /cashier/orders/:id/cancel`) — BE chưa phát (#51).
 */
export const ORDER_EVENT_TYPES: ReadonlySet<string> = new Set([
  "cashier.order.updated",
  "payment.created",
  "payment.confirmed",
  "preparation.order.queued",
  "preparation.batch.started",
  "preparation.batch.completed",
  "preparation.item.started",
  "preparation.item.completed",
  "preparation.item.undone",
  "preparation.order.delivered",
  "manager.order.attention-required",
]);

export const REFRESH_DEBOUNCE_MS = 500;

export function isOrderEvent(event: OperationsEvent): boolean {
  return ORDER_EVENT_TYPES.has(event.type);
}

/** Các id đơn nêu trong payload (`orderId`, `orderIds`, `readyOrders[].id`); rỗng = payload không nói tới đơn nào. */
export function orderIdsOf(event: OperationsEvent): string[] {
  const data = event.data;
  if (!data || typeof data !== "object") return [];
  const d = data as Record<string, unknown>;
  const ids: string[] = [];
  if (typeof d.orderId === "string") ids.push(d.orderId);
  if (Array.isArray(d.orderIds)) ids.push(...d.orderIds.filter((x): x is string => typeof x === "string"));
  if (Array.isArray(d.readyOrders)) {
    for (const o of d.readyOrders) {
      if (o && typeof o === "object" && typeof (o as { id?: unknown }).id === "string") ids.push((o as { id: string }).id);
    }
  }
  return ids;
}

/** Danh sách: mọi sự kiện đơn. Chi tiết: sự kiện đơn khác bị bỏ; payload không có id đơn thì tải luôn. */
export function isRelevantToOrder(event: OperationsEvent, orderId?: string): boolean {
  if (!isOrderEvent(event)) return false;
  if (!orderId) return true;
  const ids = orderIdsOf(event);
  return ids.length === 0 || ids.includes(orderId);
}

export interface RefresherOptions {
  /** Việc tải lại (GET). */
  run: () => void;
  isVisible: () => boolean;
  /** Chi tiết một đơn: chỉ tải khi sự kiện thuộc đơn này. */
  orderId?: string;
  delayMs?: number;
}

export interface Refresher {
  onEvent(event: OperationsEvent): void;
  /** Nối lại sau khi mất kết nối. */
  onReconnect(): void;
  /** Gọi khi `visibilitychange`. */
  onVisibilityChange(): void;
  dispose(): void;
}

export function createRefresher({ run, isVisible, orderId, delayMs = REFRESH_DEBOUNCE_MS }: RefresherOptions): Refresher {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let missed = false;
  let disposed = false;

  const fire = () => {
    timer = null;
    if (disposed) return;
    // Tab bị ẩn đúng lúc hết hạn gom: không tải, nhớ để tải khi hiện lại.
    if (!isVisible()) {
      missed = true;
      return;
    }
    run();
  };

  const signal = () => {
    if (disposed) return;
    if (!isVisible()) {
      missed = true;
      return;
    }
    if (timer === null) timer = setTimeout(fire, delayMs);
  };

  return {
    onEvent(event) {
      if (isRelevantToOrder(event, orderId)) signal();
    },
    onReconnect: signal,
    onVisibilityChange() {
      if (disposed || !isVisible() || !missed) return;
      missed = false;
      signal();
    },
    dispose() {
      disposed = true;
      if (timer !== null) clearTimeout(timer);
      timer = null;
    },
  };
}
