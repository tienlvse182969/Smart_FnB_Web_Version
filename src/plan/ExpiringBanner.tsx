import { Alert } from "antd";
import { formatDateVN } from "../lib/reportFormat";
import { useAppStore } from "../store";
import { EXPIRY_WARNING_DAYS, expiringSoonDays } from "./expiry";
import { usePlanClock } from "./planClock";
import { getTrialState } from "./trial";
import UpgradeButton from "./UpgradeButton";
import { usePlan } from "./usePlan";

/**
 * Dải cảnh báo gói sắp hết hạn (QĐ 132): 7 ngày cuối trước hạn, ngày theo giờ Việt Nam. Chỉ Owner và Manager (nơi gắn component);
 * Admin không có gói. Hết hạn thì `ReadOnlyBanner` báo chế độ chỉ đọc, dải này không hiện.
 * Gói dùng thử (lượt 10.2): số ngày lấy từ `getTrialState` (cùng nguồn với nhãn ở thanh trên, nên không bao giờ lệch); Owner có nút "Nâng cấp",
 * Manager được dặn liên hệ chủ chuỗi. Gói trả phí giữ nguyên câu cũ.
 */
export default function ExpiringBanner({ now }: { now?: number } = {}) {
  const { plan, status, expiresAt, isExpired } = usePlan();
  const role = useAppStore((state) => state.currentUser?.role);
  usePlanClock();
  if (isExpired) return null;

  const trial = getTrialState(plan, now);
  let days: number | null;
  if (trial.kind === "none") days = expiringSoonDays({ status, expiresAt, now });
  else if (trial.kind === "lastDay") days = 0;
  else if (trial.kind === "active" && trial.daysLeft !== null && trial.daysLeft <= EXPIRY_WARNING_DAYS) days = trial.daysLeft;
  else days = null;
  if (days === null || !expiresAt) return null;

  const when = formatDateVN(expiresAt);
  const left = days === 0 ? "hết hạn trong hôm nay" : `còn ${days} ngày`;

  if (trial.kind === "none") {
    return (
      <Alert
        type="info"
        showIcon
        banner
        data-testid="expiring-banner"
        message={`Gói dịch vụ sắp hết hạn: ${left} (hạn ${when})`}
        description="Liên hệ nhà cung cấp để gia hạn. Hết hạn, doanh nghiệp chuyển sang chế độ chỉ đọc (đơn đã thanh toán vẫn được pha và gọi số)."
      />
    );
  }

  const owner = role === "owner";
  return (
    <Alert
      type={days <= 1 ? "warning" : "info"}
      showIcon
      banner
      data-testid="expiring-banner"
      message={`Dùng thử ${left} (hạn ${when})`}
      description={
        owner
          ? "Bạn có thể nâng cấp gói ngay, không cần đợi hết hạn. Hết hạn mà chưa nâng cấp, doanh nghiệp chuyển sang chế độ chỉ đọc (đơn đã thanh toán vẫn được pha và gọi số)."
          : "Liên hệ chủ chuỗi để nâng cấp. Hết hạn mà chưa nâng cấp, doanh nghiệp chuyển sang chế độ chỉ đọc (đơn đã thanh toán vẫn được pha và gọi số)."
      }
      action={owner ? <UpgradeButton /> : undefined}
    />
  );
}
