import { Alert } from "antd";
import { formatDateVN } from "../lib/reportFormat";
import { useAppStore } from "../store";
import { usePlanClock } from "./planClock";
import { getTrialState, trialExpiredText } from "./trial";
import UpgradeButton from "./UpgradeButton";
import { usePlan } from "./usePlan";

/**
 * Banner đầu trang khi doanh nghiệp ở chế độ chỉ đọc (BR-09): hết hạn hoặc tạm ngưng.
 * Gói dùng thử đã hết (lượt 10.2) có câu riêng theo vai (Owner: nâng cấp ở Gói của tôi, kèm nút; Manager: liên hệ chủ chuỗi).
 * Gói dùng thử bị tạm ngưng chỉ nói về tạm ngưng, không nhắc dùng thử.
 */
export default function ReadOnlyBanner() {
  const { plan, isExpired, status, expiresAt } = usePlan();
  const role = useAppStore((state) => state.currentUser?.role);
  usePlanClock();
  if (!isExpired) return null;

  const when = expiresAt ? formatDateVN(expiresAt) : null; // dd/MM/yyyy giờ Việt Nam, cùng định dạng với màn Gói của tôi (quyết định 52)
  const isTrialExpired = status !== "suspended" && getTrialState(plan).kind === "expired";
  const trialText = isTrialExpired ? trialExpiredText(plan, role) : null;

  const message =
    status === "suspended"
      ? "Doanh nghiệp đang bị tạm ngưng — chế độ chỉ đọc"
      : isTrialExpired
        ? `Dùng thử đã hết${when ? ` vào ngày ${when}` : ""} — chế độ chỉ đọc`
        : `Gói đã hết hạn${when ? ` từ ${when}` : ""} — chế độ chỉ đọc`;

  return (
    <Alert
      type="warning"
      showIcon
      banner
      data-testid="read-only-banner"
      message={message}
      description={
        trialText
          ? `${trialText} Bạn vẫn xem được dữ liệu.`
          : "Bạn vẫn xem được dữ liệu nhưng không tạo, sửa hoặc xoá được. Đơn đã thanh toán vẫn được pha và gọi số cho xong. Liên hệ quản trị nền tảng để gia hạn."
      }
      action={isTrialExpired && role === "owner" ? <UpgradeButton /> : undefined}
    />
  );
}
