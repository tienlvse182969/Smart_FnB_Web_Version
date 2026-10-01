/**
 * Kênh realtime vận hành (Socket.IO, namespace `/operations`, sự kiện `operations.updated`).
 * Giữ logic của commit dc8fcdd (Vũ Hà Gia Bảo); chỉ đổi nguồn token/origin sang lớp http mới.
 *
 * Dùng cho màn hình gọi số, giai đoạn 8 — chưa có màn hình nào gọi. Lưu ý đặc tả 11.10/BR-45: màn hình
 * gọi số dùng token thiết bị chỉ đọc, còn gateway BE hiện chỉ nhận JWT người dùng (xem BAN-GIAO mục 7).
 */
import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "../../config";
import { getAccessToken } from "../http/client";

export type OperationsEvent = {
  type: string;
  branchId?: string;
  chainId?: string;
  occurredAt: string;
  data?: unknown;
};

let socket: Socket | null = null;

/** Gốc (origin) của backend, suy từ `VITE_API_BASE_URL`. */
function getApiOrigin(): string | null {
  if (!API_BASE_URL) return null;
  return new URL(API_BASE_URL, window.location.origin).origin;
}

export function connectOperationsRealtime(onUpdate: (event: OperationsEvent) => void): void {
  disconnectOperationsRealtime();
  const origin = getApiOrigin();
  const token = getAccessToken();
  if (!origin || !token) return;

  socket = io(`${origin}/operations`, {
    path: import.meta.env.VITE_REALTIME_PATH || "/socket.io",
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
  });
  socket.on("operations.updated", onUpdate);
}

export function disconnectOperationsRealtime(): void {
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
}
