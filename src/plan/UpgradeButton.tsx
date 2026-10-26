import { Button } from "antd";
import { useInRouterContext, useNavigate } from "react-router-dom";

export const UPGRADE_PATH = "/owner/plan";

/**
 * Nút "Nâng cấp" ở các dải cảnh báo của Owner khi dùng thử: đi tới trang Gói của tôi, nơi có thẻ nâng cấp và checkout PayOS (không có
 * nút thanh toán thứ hai). Trong ứng dụng điều hướng bằng router (không tải lại trang, giữ phiên làm việc); ngoài router (test) là liên kết thường.
 */
export default function UpgradeButton({ label = "Nâng cấp" }: { label?: string }) {
  const inRouter = useInRouterContext();
  return inRouter ? <RouterUpgradeButton label={label} /> : (
    <Button size="small" type="primary" href={UPGRADE_PATH} data-testid="upgrade-button">
      {label}
    </Button>
  );
}

function RouterUpgradeButton({ label }: { label: string }) {
  const navigate = useNavigate();
  return (
    <Button size="small" type="primary" data-testid="upgrade-button" href={UPGRADE_PATH} onClick={(event) => { event.preventDefault(); navigate(UPGRADE_PATH); }}>
      {label}
    </Button>
  );
}
