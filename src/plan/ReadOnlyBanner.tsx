import { Alert, Button } from "antd";

import { formatDateVN } from "../lib/reportFormat";

import { useAppStore } from "../store";

import { usePlan } from "./usePlan";

/** Banner đầu trang khi doanh nghiệp ở chế độ chỉ đọc (BR-09): hết hạn hoặc tạm ngưng. */

export default function ReadOnlyBanner() {
  const { plan, isExpired, status, expiresAt } = usePlan();

  const isOwner = useAppStore((state) => state.currentUser?.role === "owner");

  if (!isExpired) return null;

  const when = expiresAt ? formatDateVN(expiresAt) : null; // dd/MM/yyyy giờ Việt Nam, cùng định dạng với màn Gói của tôi (quyết định 52)

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
      description={
        plan?.planCode === "TRIAL" && isOwner && status === "expired"
          ? "Dữ liệu vẫn được giữ. Bạn có thể nâng cấp gói để tiếp tục thao tác; thanh toán chỉ có hiệu lực sau khi PayOS xác nhận."
          : "Bạn vẫn xem được dữ liệu nhưng không tạo, sửa hoặc xoá được. Đơn đã thanh toán vẫn được pha và gọi số cho xong. Liên hệ quản trị nền tảng để gia hạn."
      }
      action={
        plan?.planCode === "TRIAL" && isOwner && status === "expired" ? (
          <Button href="/owner/plan" size="small">
            Nâng cấp gói
          </Button>
        ) : undefined
      }
    />
  );
}
