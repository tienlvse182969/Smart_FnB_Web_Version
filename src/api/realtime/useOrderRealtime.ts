import { useEffect, useRef, useState } from "react";
import { createRefresher, isOrderEvent } from "./orderRefresh";
import { subscribeOperations, type OperationsEvent, type RealtimeStatus } from "./operations";

export interface UseOrderRealtimeOptions {
  /** Có = màn chi tiết một đơn: chỉ tải lại khi sự kiện thuộc đơn này. */
  orderId?: string;
  /** false = không mở kết nối (module order chạy mock, hoặc chưa có chi nhánh). */
  enabled?: boolean;
  /** Mỗi sự kiện đơn (sau khi lọc, trước khi gom) — 7.5 dùng lại hook này để hiện cảnh báo. */
  onEvent?: (event: OperationsEvent) => void;
}

/**
 * Tự làm tươi màn đơn qua socket `/operations` của chi nhánh (quyết định 74): gom sự kiện 500 ms thành 1 lần gọi `onRefresh`,
 * tab ẩn thì chờ tới khi hiện lại, nối lại thì gọi 1 lần. `onRefresh` luôn là hàm TẢI LẠI BẰNG GET của màn (không ráp từ payload);
 * dùng bản mới nhất của hàm mà không đăng ký lại kết nối. Trả về trạng thái kết nối để màn hiện chỉ báo nhỏ.
 */
export function useOrderRealtime(onRefresh: () => void, { orderId, enabled = true, onEvent }: UseOrderRealtimeOptions = {}): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>("disconnected");
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;
  const eventRef = useRef(onEvent);
  eventRef.current = onEvent;

  useEffect(() => {
    if (!enabled) {
      setStatus("disconnected");
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
        if (info.reconnected && next === "connected") refresher.onReconnect();
      },
    });
    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisibility);
      refresher.dispose();
    };
  }, [enabled, orderId]);

  return status;
}
