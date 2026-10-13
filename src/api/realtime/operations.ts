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
 * Màn hình gọi số (giai đoạn 8, QĐ 106) dùng token thiết bị chỉ đọc (đặc tả 11.10/BR-45); gateway nhận cả token thiết bị
 * (`realtime.gateway.ts:71-84`). Cùng một kết nối dùng chung, chỉ khác NGUỒN TOKEN (`OperationsCredential`): thiết bị không đọc phiên
 * người dùng, không làm mới phiên; máy chủ ngắt = token bị từ chối/thu hồi → không tự thử lại bằng chính token đó (`rejected`).
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
  /**
   * `reconnected` = true khi đây là lần nối lại sau một lần đã nối được (cần tải lại dữ liệu vì có thể bỏ lỡ sự kiện).
   * `exhausted` = true khi đã hết số lần tự nối lại: socket không tự thử nữa, màn hiện nút "Kết nối lại" (`reconnectOperations`).
   */
  onStatus?(status: RealtimeStatus, info: { reconnected: boolean; exhausted: boolean; rejected?: boolean }): void;
}

/**
 * Nguồn token của kết nối. Mặc định (không truyền) = phiên người dùng. `kind: "device"` = token thiết bị: `token()` đọc từ nơi màn hình
 * tự giữ; máy chủ ngắt thì báo `rejected` và dừng (người gọi quyết định bằng REST: 403 = thu hồi), KHÔNG gọi làm mới phiên người dùng.
 */
export interface OperationsCredential {
  kind: "user" | "device";
  token: () => string | null;
}

/** Số lần tự nối lại tối đa (cả khi đường truyền rớt lẫn khi máy chủ ngắt); hết lượt thì chỉ báo "Mất kết nối" kèm nút "Kết nối lại". */
export const MAX_AUTO_RECONNECTS = 5;
const MAX_SERVER_RETRIES = MAX_AUTO_RECONNECTS;
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
let exhausted = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
/** Nguồn token của người nghe đầu tiên (một trang chỉ có một loại: màn vận hành của người dùng HOẶC màn thiết bị). */
let credential: OperationsCredential | null = null;

function currentToken(): string | null {
  return credential ? credential.token() : getAccessToken();
}

function isDevice(): boolean {
  return credential?.kind === "device";
}

/** Làm mới phiên người dùng; thiết bị không có phiên để làm mới. */
function refreshForReconnect(): Promise<unknown> {
  return isDevice() ? Promise.resolve() : refreshSession(getAccessToken()).catch(() => undefined);
}

/** Gốc (origin) của backend, suy từ `VITE_API_BASE_URL`. */
function getApiOrigin(): string | null {
  if (!API_BASE_URL) return null;
  return new URL(API_BASE_URL, window.location.origin).origin;
}

export function getRealtimeStatus(): RealtimeStatus {
  return status;
}

/** true = đã hết số lần tự nối lại (cần người dùng bấm "Kết nối lại"). */
export function getRealtimeExhausted(): boolean {
  return exhausted;
}

function setStatus(next: RealtimeStatus, reconnected = false): void {
  if (status === next && !reconnected) return;
  status = next;
  for (const sub of [...subscribers]) sub.onStatus?.(next, { reconnected, exhausted });
}

/** Báo hết lượt tự nối: trạng thái vẫn "disconnected" nên phải thông báo riêng cho người nghe. */
function markExhausted(): void {
  if (exhausted) return;
  exhausted = true;
  status = "disconnected"; // hết lượt tức là đã bỏ cuộc, dù lần thử cuối chưa kịp báo lỗi
  for (const sub of [...subscribers]) sub.onStatus?.(status, { reconnected: false, exhausted: true });
}

/** Thiết bị bị từ chối: đã bỏ cuộc (không tự nối lại), kèm `rejected` để màn kiểm tra bằng REST xem có bị thu hồi không. */
function markRejected(): void {
  exhausted = true;
  status = "disconnected";
  for (const sub of [...subscribers]) sub.onStatus?.(status, { reconnected: false, exhausted: true, rejected: true });
}

function open(): void {
  if (socket) return;
  const origin = getApiOrigin();
  if (!origin || !currentToken()) {
    setStatus("disconnected");
    return;
  }
  setStatus("connecting");
  const s = createSocket(`${origin}/operations`, {
    path: import.meta.env.VITE_REALTIME_PATH || "/socket.io",
    // Hàm: socket.io gọi lại ở MỖI lần nối (kể cả nối lại), nên luôn dùng token mới nhất.
    auth: (cb: (data: { token: string | null }) => void) => cb({ token: currentToken() }),
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: MAX_AUTO_RECONNECTS,
  });
  socket = s;
  // Hết `reconnectionAttempts` lần nối lại do rớt đường truyền: socket.io ngừng thử (sự kiện của Manager, không phải của socket).
  s.io?.on("reconnect_failed", markExhausted);
  s.on("operations.connected", () => {
    serverRetries = 0;
    exhausted = false;
    const reconnected = everConnected;
    everConnected = true;
    setStatus("connected", reconnected);
  });
  s.on("operations.updated", (event: OperationsEvent) => {
    for (const sub of [...subscribers]) sub.onEvent(event);
  });
  // BE `fb7cae9` (#68): thu hồi thiết bị phát `device.revoked` rồi ngắt socket → màn kiểm tra bằng REST ngay (không đợi nhịp hỏi).
  s.on("device.revoked", () => {
    if (isDevice()) markRejected();
  });
  s.on("connect_error", () => setStatus("disconnected"));
  s.on("disconnect", (reason: string) => {
    setStatus("disconnected");
    // Thiết bị bị máy chủ ngắt = token bị từ chối hoặc đã thu hồi: không có phiên để làm mới, nối lại bằng chính token đó vô ích.
    if (reason === "io server disconnect" && isDevice()) {
      markRejected();
      return;
    }
    // Máy chủ chủ động ngắt (token hết hạn → không còn xác thực được): socket.io không tự nối lại. Làm mới phiên rồi nối lại.
    if (reason === "io server disconnect" && serverRetries >= MAX_SERVER_RETRIES) markExhausted();
    if (reason === "io server disconnect" && serverRetries < MAX_SERVER_RETRIES && subscribers.size > 0) {
      serverRetries++;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        refreshForReconnect()
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
  exhausted = false;
  status = "disconnected";
  credential = null;
}

/**
 * Nút "Kết nối lại" (quyết định 80): thử lại từ đầu sau khi hết lượt tự nối. Báo "Đang kết nối" ngay, làm mới phiên (lỗi làm mới
 * bị bỏ qua, không đăng xuất), rồi mở socket mới. Giữ `everConnected` nên nối lại thành công sẽ được báo `reconnected` (màn tải lại
 * dữ liệu đúng 1 lần). Không có thông báo nổi nào.
 */
export function reconnectOperations(): void {
  if (subscribers.size === 0) return;
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  const old = socket;
  old?.removeAllListeners();
  old?.io?.removeAllListeners?.();
  old?.disconnect();
  socket = null;
  exhausted = false;
  serverRetries = 0;
  setStatus("connecting");
  void refreshForReconnect().finally(() => {
    if (subscribers.size > 0 && !socket) open();
  });
}

/**
 * Nghe sự kiện vận hành của chi nhánh. Kết nối mở khi có người nghe đầu tiên và đóng khi người nghe cuối cùng rời đi. Trả về hàm huỷ
 * đăng ký (gọi khi rời màn, tránh rò listener). `source` chỉ có hiệu lực ở người nghe ĐẦU TIÊN (người sau dùng chung kết nối).
 */
export function subscribeOperations(subscriber: OperationsSubscriber, source?: OperationsCredential): () => void {
  subscribers.add(subscriber);
  if (subscribers.size === 1) {
    credential = source ?? null;
    open();
  }
  else subscriber.onStatus?.(status, { reconnected: false, exhausted });
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

/**
 * CHỈ DEV (lượt 7.5): kiểm trình duyệt bơm sự kiện vận hành giả cho các người nghe (BE local không có đơn lệch tiền để phát sự kiện thật).
 * `import.meta.env.DEV` viết thẳng tại chỗ để bản build production thay bằng `false` và bỏ hẳn khối này (kiểm bằng grep bundle, BAN-GIAO 7.5).
 * KHÔNG mở kết nối, KHÔNG gọi BE: chỉ gọi `onEvent` của những người đã đăng ký.
 */
if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as { __injectOperationsEvent?: (event: OperationsEvent) => number }).__injectOperationsEvent = (event) => {
    const listeners = [...subscribers];
    for (const sub of listeners) sub.onEvent(event);
    return listeners.length;
  };
}
