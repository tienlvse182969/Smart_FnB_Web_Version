import { useCallback, useEffect, useRef, useState } from "react";
import { createRefresher } from "./orderRefresh";
import { reconnectOperations, subscribeOperations, type OperationsEvent, type RealtimeStatus } from "./operations";

export interface UseDeviceRealtimeOptions {
  /** Token thiết bị hiện tại (đọc lại mỗi lần nối). null/enabled=false = không mở kết nối. */
  token: string | null;
  enabled?: boolean;
  /** Sự kiện nào làm màn tải lại (mặc định: mọi sự kiện). */
  isRelevant?: (event: OperationsEvent) => boolean;
}

export interface DeviceRealtime {
  status: RealtimeStatus;
  /** Hết lượt tự nối lại (hoặc bị máy chủ ngắt): màn tự gọi `reconnect` theo nhịp. */
  exhausted: boolean;
  /** Máy chủ ngắt kết nối thiết bị (token sai/thu hồi): màn nên kiểm tra bằng REST ngay. */
  rejected: boolean;
  reconnect: () => void;
}

/**
 * Lớp con của kết nối `/operations` dùng chung cho thiết bị ghép (QĐ 106): cùng gom 500 ms, tab ẩn thì chờ, nối lại thì tải lại 1 lần.
 * Khác `useOrderRealtime` ở nguồn token (token thiết bị, không phiên người dùng) và bộ lọc sự kiện. `onRefresh` là hàm TẢI LẠI BẰNG
 * GET của màn, luôn dùng bản mới nhất mà không đăng ký lại kết nối.
 */
export function useDeviceRealtime(onRefresh: () => void, { token, enabled = true, isRelevant }: UseDeviceRealtimeOptions): DeviceRealtime {
  const [status, setStatus] = useState<RealtimeStatus>("disconnected");
  const [exhausted, setExhausted] = useState(false);
  const [rejected, setRejected] = useState(false);
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const relevantRef = useRef(isRelevant);
  relevantRef.current = isRelevant;
  const active = enabled && !!token;

  useEffect(() => {
    if (!active) {
      setStatus("disconnected");
      setExhausted(false);
      setRejected(false);
      return;
    }
    const refresher = createRefresher({
      run: () => refreshRef.current(),
      isVisible: () => typeof document === "undefined" || document.visibilityState !== "hidden",
      isRelevant: (event) => (relevantRef.current ? relevantRef.current(event) : true),
    });
    const onVisibility = () => refresher.onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibility);
    const unsubscribe = subscribeOperations(
      {
        onEvent: (event) => refresher.onEvent(event),
        onStatus: (next, info) => {
          setStatus(next);
          setExhausted(info.exhausted);
          setRejected(!!info.rejected);
          if (info.reconnected && next === "connected") refresher.onReconnect();
        },
      },
      { kind: "device", token: () => tokenRef.current },
    );
    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisibility);
      refresher.dispose();
    };
    // Đổi token (ghép lại) = kết nối mới.
  }, [active, token]);

  const reconnect = useCallback(() => reconnectOperations(), []);
  return { status, exhausted, rejected, reconnect };
}
