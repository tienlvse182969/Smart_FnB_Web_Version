import { Card } from "antd";
import { Store } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "../../components/bits";

/** Dùng chung cho mọi màn của Brand Manager cần có chi nhánh: nút mở thẳng form tạo chi nhánh. */
export default function NoBranchState({ description }: { description?: string }) {
  const navigate = useNavigate();
  return (
    <Card style={{ borderRadius: 14 }}>
      <EmptyState
        icon={<Store size={24} />}
        title="Chuỗi chưa có chi nhánh"
        description={description ?? "Tạo chi nhánh đầu tiên để bắt đầu bán hàng và xem báo cáo."}
        action={{ label: "Tạo chi nhánh đầu tiên", onClick: () => navigate("/brand-manager/branches?new=1") }}
      />
    </Card>
  );
}
