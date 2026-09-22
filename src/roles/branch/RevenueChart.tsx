import { Card } from "antd";
import { SectionTitle } from "../../components/bits";
import { useAppStore } from "../../store";

/**
 * Doanh thu chi nhánh.
 *
 * Trước đây biểu đồ này vẽ từ `payments` trong mock. Nay Owner đã đọc doanh thu
 * thật qua `/reports/*`, nhưng nhóm endpoint đó chặn ở `@Roles(AppRole.OWNER)` —
 * Manager gọi vào nhận 403. Không có nguồn thật nào khác cho chi nhánh, nên
 * hiển thị trạng thái rỗng thay vì trộn số giả vào cùng màn với số thật.
 */
export default function RevenueChart() {
  const branches = useAppStore((s) => s.branches);
  const currentBranchId = useAppStore((s) => s.currentBranchId);
  const branchName = branches.find((b) => b.id === currentBranchId)?.name ?? "Chi nhánh";

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle title="Doanh thu chi nhánh" sub={branchName} />
      <div
        style={{
          marginTop: 8,
          padding: "40px 20px",
          textAlign: "center",
          border: "1px dashed var(--ant-color-border)",
          borderRadius: 10,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Chưa có dữ liệu</div>
        <div style={{ color: "#71717a", fontSize: 13, maxWidth: 420, margin: "0 auto", lineHeight: 1.6 }}>
          Báo cáo doanh thu hiện chỉ mở cho tài khoản Chủ chuỗi. Khi backend cho phép Quản lý chi
          nhánh đọc báo cáo, phần này sẽ hiển thị số liệu thật của chi nhánh.
        </div>
      </div>
    </Card>
  );
}
