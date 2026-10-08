/**
 * Kênh realtime vận hành (Socket.IO, namespace `/operations`, sự kiện `operations.updated`).
 * Giữ logic của commit dc8fcdd (Vũ Hà Gia Bảo); đổi nguồn token/origin sang lớp http mới (GĐ7 đổi thêm: nhiều người nghe dùng chung
 * MỘT kết nối, token lấy lại mỗi lần nối).
 *
 * Xác thực (BE `realtime.gateway.ts:52-80`): JWT người dùng trong `auth.token`; Manager vào phòng chi nhánh của mình và nhận mọi
 * sự kiện của chi nhánh. Máy chủ báo `operations.connected` khi xác thực xong. Token là HÀM nên mỗi lần nối lại lấy token mới nhất
 * (token đã làm mới bởi request REST); nếu máy chủ ngắt vì token hết hạn (`io server disconnect`, socket.io không tự nối lại) thì làm
 * mới phiên rồi nối lại, tối đa `MAX_SERVER_RETRIES` lần.
 *
 * Màn hình gọi số (giai đoạn 8) dùng token thiết bị chỉ đọc (đặc tả 11.10/BR-45); gateway nhận cả token thiết bị.
 */
import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "../../config";
import { getAccessToken, refreshSession } from "../http/client";

export type OperationsEvent = {
  type: string;
  branchId?: string;
  chainId?: string;
  occurredAt: string;
  data?: unknown;
};

/** connecting = chưa xong xác thực; connected = đã nhận `operations.connected`; disconnected = mất kết nối hoặc bị từ chối. */
export type RealtimeStatus = "connecting" | "connected" | "disconnected";

export interface OperationsSubscriber {
  onEvent(event: OperationsEvent): void;
  /** `reconnected` = true khi đây là lần nối lại sau một lần đã nối được (cần tải lại dữ liệu vì có thể bỏ lỡ sự kiện). */
  onStatus?(status: RealtimeStatus, info: { reconnected: boolean }): void;
}

const MAX_SERVER_RETRIES = 5;
const SERVER_RETRY_DELAY_MS = 3000;

type SocketFactory = (url: string, options: Record<string, unknown>) => Socket;
let createSocket: SocketFactory = (url, options) => io(url, options);

/** Chỉ cho test: thay nhà máy tạo socket. */
export function setSocketFactory(factory: SocketFactory | null): void {
  createSocket = factory ?? ((url, options) => io(url, options));
}

const subscribers = new Set<OperationsSubscriber>();
let socket: Socket | null = null;
let status: RealtimeStatus = "disconnected";
let everConnected = false;
let serverRetries = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

/** Gốc (origin) của backend, suy từ `VITE_API_BASE_URL`. */
function getApiOrigin(): string | null {
  if (!API_BASE_URL) return null;
  return new URL(API_BASE_URL, window.location.origin).origin;
}

export function getRealtimeStatus(): RealtimeStatus {
  return status;
}

function setStatus(next: RealtimeStatus, reconnected = false): void {
  if (status === next && !reconnected) return;
  status = next;
  for (const sub of [...subscribers]) sub.onStatus?.(next, { reconnected });
}

function open(): void {
  if (socket) return;
  const origin = getApiOrigin();
  if (!origin || !getAccessToken()) {
    setStatus("disconnected");
    return;
  }
  setStatus("connecting");
  const s = createSocket(`${origin}/operations`, {
    path: import.meta.env.VITE_REALTIME_PATH || "/socket.io",
    // Hàm: socket.io gọi lại ở MỖI lần nối (kể cả nối lại), nên luôn dùng token mới nhất.
    auth: (cb: (data: { token: string | null }) => void) => cb({ token: getAccessToken() }),
    transports: ["websocket", "polling"],
    reconnection: true,
  });
  socket = s;
  s.on("operations.connected", () => {
    serverRetries = 0;
    const reconnected = everConnected;
    everConnected = true;
    setStatus("connected", reconnected);
  });
  s.on("operations.updated", (event: OperationsEvent) => {
    for (const sub of [...subscribers]) sub.onEvent(event);
  });
  s.on("connect_error", () => setStatus("disconnected"));
  s.on("disconnect", (reason: string) => {
    setStatus("disconnected");
    // Máy chủ chủ động ngắt (token hết hạn → không còn xác thực được): socket.io không tự nối lại. Làm mới phiên rồi nối lại.
    if (reason === "io server disconnect" && serverRetries < MAX_SERVER_RETRIES && subscribers.size > 0) {
      serverRetries++;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        refreshSession(getAccessToken())
          .catch(() => undefined)
          .finally(() => {
            if (socket === s && subscribers.size > 0) {
              setStatus("connecting");
              s.connect();
            }
          });
      }, SERVER_RETRY_DELAY_MS);
    }
  });
}

function close(): void {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
  everConnected = false;
  serverRetries = 0;
  status = "disconnected";
}

/**
 * Nghe sự kiện vận hành của chi nhánh. Kết nối mở khi có người nghe đầu tiên và đóng khi người nghe cuối cùng rời đi. Trả về hàm huỷ
 * đăng ký (gọi khi rời màn, tránh rò listener).
 */
export function subscribeOperations(subscriber: OperationsSubscriber): () => void {
  subscribers.add(subscriber);
  if (subscribers.size === 1) open();
  else subscriber.onStatus?.(status, { reconnected: false });
  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0) close();
  };
}

/** Tương thích với bản cũ (một người nghe, kết nối riêng cho tới khi gọi `disconnectOperationsRealtime`). */
let legacyUnsubscribe: (() => void) | null = null;

export function connectOperationsRealtime(onUpdate: (event: OperationsEvent) => void): void {
  disconnectOperationsRealtime();
  legacyUnsubscribe = subscribeOperations({ onEvent: onUpdate });
}

export function disconnectOperationsRealtime(): void {
  legacyUnsubscribe?.();
  legacyUnsubscribe = null;
}
