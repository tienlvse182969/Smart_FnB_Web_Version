import { Clock } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { palette } from "../theme";
import { useTrialState } from "./planClock";
import { trialLabel, type TrialLabel } from "./trial";
import { UPGRADE_PATH } from "./UpgradeButton";

/**
 * Vừa quay về từ PayOS (`/owner/plan?checkout=…`, chưa huỷ): gói vẫn là TRIAL vì webhook chưa về, nên nhãn không nói "đã hết" ngược với
 * trạng thái thanh toán trên trang Gói của tôi. Hết trang đó (URL không còn tham số) thì nhãn trở lại theo gói thật.
 */
export function isAwaitingPayment(pathname: string, search: string): boolean {
  if (!pathname.startsWith(UPGRADE_PATH)) return false;
  const params = new URLSearchParams(search);
  return params.has("checkout") && !params.has("cancelled");
}

const AWAITING: TrialLabel = { text: "Đang chờ PayOS xác nhận", tone: "info" };

/**
 * Nhãn dùng thử ở thanh trên của Owner (lượt 10.2). Chỉ dùng màu ngữ nghĩa (BR-42); nghĩa đọc được bằng chữ, không chỉ bằng màu.
 * Bấm vào để tới trang Gói của tôi. Số ngày cùng nguồn với dải cảnh báo (`getTrialState`).
 */
export default function TrialBadge() {
  const state = useTrialState();
  const { pathname, search } = useLocation();
  const base = trialLabel(state);
  if (!base) return null;
  const label = state.kind === "expired" && isAwaitingPayment(pathname, search) ? AWAITING : base;
  const color = palette[label.tone];
  return (
    <Link
      to={UPGRADE_PATH}
      data-testid="trial-badge"
      data-tone={label.tone}
      title={label.text}
      aria-label={`${label.text}. Mở trang Gói của tôi`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: color.bg,
        color: color.text,
        border: `1px solid ${color.border}`,
        padding: "4px 11px",
        borderRadius: 999,
        fontSize: 12.5,
        fontWeight: 600,
        lineHeight: 1.3,
        whiteSpace: "nowrap",
        textDecoration: "none",
        minWidth: 0,
        maxWidth: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      <Clock size={14} aria-hidden />
      {label.text}
    </Link>
  );
}
