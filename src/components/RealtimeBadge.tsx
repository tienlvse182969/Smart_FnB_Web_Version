import type { OrderRealtime } from "../api/realtime/useOrderRealtime";
import type { RealtimeStatus } from "../api/realtime/operations";
import { palette } from "../theme";

const TEXT: Record<RealtimeStatus, string> = {
  connecting: "Đang kết nối cập nhật trực tiếp…",
  connected: "Cập nhật trực tiếp",
  disconnected: "Mất kết nối cập nhật trực tiếp",
};

const TONE: Record<RealtimeStatus, "warning" | "success" | "error"> = {
  connecting: "warning",
  connected: "success",
  disconnected: "error",
};

/**
 * Chỉ báo nhỏ, kín đáo, trạng thái kết nối realtime (không chặn màn, không có thông báo nổi). Khi socket đã hết lượt tự nối lại
 * (`exhausted`) thì kèm nút "Kết nối lại" (quyết định 80).
 */
export default function RealtimeBadge({ status, exhausted = false, reconnect }: Pick<OrderRealtime, "status"> & Partial<Pick<OrderRealtime, "exhausted" | "reconnect">>) {
  return (
    <span
      data-testid="realtime-status"
      data-status={status}
      data-exhausted={exhausted}
      title={TEXT[status]}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: palette.textSubtle, whiteSpace: "nowrap" }}
    >
      <span aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", background: palette[TONE[status]].text, display: "inline-block" }} />
      {TEXT[status]}
      {status === "disconnected" && exhausted && reconnect && (
        <button
          type="button"
          data-testid="realtime-reconnect"
          onClick={reconnect}
          style={{ border: "none", background: "none", padding: 0, color: palette.brandPrimary, cursor: "pointer", fontSize: 12, textDecoration: "underline" }}
        >
          Kết nối lại
        </button>
      )}
    </span>
  );
}
