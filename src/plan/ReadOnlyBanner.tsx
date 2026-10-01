import { Alert } from "antd";
import { usePlan } from "./usePlan";

/** Banner đầu trang khi doanh nghiệp ở chế độ chỉ đọc (BR-09): hết hạn hoặc tạm ngưng. */
export default function ReadOnlyBanner() {
  const { isExpired, status, expiresAt } = usePlan();
  if (!isExpired) return null;

  const when = expiresAt ? new Date(expiresAt).toLocaleDateString("vi-VN") : null;
  const message =
    status === "suspended"
      ? "Doanh nghiệp đang bị tạm ngưng — chế độ chỉ đọc"
      : `Gói đã hết hạn${when ? ` từ ${when}` : ""} — chế độ chỉ đọc`;

  return (
    <Alert
      type="warning"
      showIcon
      banner
      data-testid="read-only-banner"
      message={message}
      description="Bạn vẫn xem được dữ liệu nhưng không tạo, sửa hoặc xoá được. Đơn đã thanh toán vẫn được pha và gọi số cho xong. Liên hệ quản trị nền tảng để gia hạn."
    />
  );
}
