import { Alert } from "antd";
import { formatDateVN } from "../lib/reportFormat";
import { expiringSoonDays } from "./expiry";
import { usePlan } from "./usePlan";

/**
 * Dải cảnh báo gói sắp hết hạn (QĐ 132): 7 ngày cuối trước hạn, ngày theo giờ Việt Nam. Chỉ Owner và Manager (nơi gắn component);
 * Admin không có gói. Hết hạn thì `ReadOnlyBanner` báo chế độ chỉ đọc, dải này không hiện.
 */
export default function ExpiringBanner({ now }: { now?: number } = {}) {
  const { status, expiresAt, isExpired } = usePlan();
  if (isExpired) return null;
  const days = expiringSoonDays({ status, expiresAt, now });
  if (days === null || !expiresAt) return null;
  const when = formatDateVN(expiresAt);
  const left = days === 0 ? "hết hạn trong hôm nay" : `còn ${days} ngày`;
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
