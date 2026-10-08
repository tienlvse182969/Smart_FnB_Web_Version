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

/** Chỉ báo nhỏ, kín đáo, trạng thái kết nối realtime (không chặn màn, không có thông báo nổi). */
export default function RealtimeBadge({ status }: { status: RealtimeStatus }) {
  return (
    <span
      data-testid="realtime-status"
      data-status={status}
      title={TEXT[status]}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: palette.textSubtle, whiteSpace: "nowrap" }}
    >
      <span aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", background: palette[TONE[status]].text, display: "inline-block" }} />
      {TEXT[status]}
    </span>
  );
}
