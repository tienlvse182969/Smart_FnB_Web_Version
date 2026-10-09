import { useCallback, useEffect, useRef, useState } from "react";
import { createRefresher, isOrderEvent } from "./orderRefresh";
import { reconnectOperations, subscribeOperations, type OperationsEvent, type RealtimeStatus } from "./operations";

export interface UseOrderRealtimeOptions {
  /** Có = màn chi tiết một đơn: chỉ tải lại khi sự kiện thuộc đơn này. */
  orderId?: string;
  /** false = không mở kết nối (module order chạy mock, hoặc chưa có chi nhánh). */
  enabled?: boolean;
  /** Mỗi sự kiện đơn (sau khi lọc, trước khi gom) — 7.5 dùng lại hook này để hiện cảnh báo. */
  onEvent?: (event: OperationsEvent) => void;
}

export interface OrderRealtime {
  status: RealtimeStatus;
  /** true = đã hết số lần tự nối lại: màn hiện nút "Kết nối lại" (`reconnect`). */
  exhausted: boolean;
  /** Thử lại từ đầu (có làm mới phiên). Trạng thái về "connecting"; nối được thì màn tải lại 1 lần. */
  reconnect: () => void;
}

/**
 * Tự làm tươi màn đơn qua socket `/operations` của chi nhánh (quyết định 74): gom sự kiện 500 ms thành 1 lần gọi `onRefresh`,
 * tab ẩn thì chờ tới khi hiện lại, nối lại thì gọi 1 lần. `onRefresh` luôn là hàm TẢI LẠI BẰNG GET của màn (không ráp từ payload);
 * dùng bản mới nhất của hàm mà không đăng ký lại kết nối. Trả về trạng thái kết nối + nút "Kết nối lại" khi hết lượt tự nối (QĐ 80).
 */
export function useOrderRealtime(onRefresh: () => void, { orderId, enabled = true, onEvent }: UseOrderRealtimeOptions = {}): OrderRealtime {
  const [status, setStatus] = useState<RealtimeStatus>("disconnected");
  const [exhausted, setExhausted] = useState(false);
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;
  const eventRef = useRef(onEvent);
  eventRef.current = onEvent;

  useEffect(() => {
    if (!enabled) {
      setStatus("disconnected");
      setExhausted(false);
      return;
    }
    const refresher = createRefresher({
      run: () => refreshRef.current(),
      isVisible: () => typeof document === "undefined" || document.visibilityState !== "hidden",
      orderId,
    });
    const onVisibility = () => refresher.onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibility);
    const unsubscribe = subscribeOperations({
      onEvent: (event) => {
        if (isOrderEvent(event)) eventRef.current?.(event);
        refresher.onEvent(event);
      },
      onStatus: (next, info) => {
        setStatus(next);
        setExhausted(info.exhausted);
        if (info.reconnected && next === "connected") refresher.onReconnect();
      },
    });
    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisibility);
      refresher.dispose();
    };
  }, [enabled, orderId]);

  const reconnect = useCallback(() => reconnectOperations(), []);
  return { status, exhausted, reconnect };
}
