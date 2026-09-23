import { useEffect, useState } from "react";
import { Alert, Card, Descriptions, Spin, Tag } from "antd";
import { useAppStore } from "../../store";
import { getBranch, type ApiBranchDetail } from "../../services/branchApi";
import { SectionTitle } from "../../components/bits";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Đang hoạt động",
  INACTIVE: "Ngưng hoạt động",
  MAINTENANCE: "Đang bảo trì",
};

const DAY_LABEL = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

/** Thông tin chi nhánh mà Manager được gán — đọc trực tiếp từ API thật. */
export default function BranchInfo() {
  const branchId = useAppStore((s) => s.currentBranchId);
  const [branch, setBranch] = useState<ApiBranchDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!branchId) return;
    let cancelled = false;
    setBranch(null);
    setError(null);
    getBranch(branchId)
      .then((data) => !cancelled && setBranch(data))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Không tải được chi nhánh"));
    return () => {
      cancelled = true;
    };
  }, [branchId]);

  if (!branchId) return <Alert type="warning" showIcon message="Tài khoản chưa được gán chi nhánh nào" />;
  if (error) return <Alert type="error" showIcon message="Không tải được thông tin chi nhánh" description={error} />;
  if (!branch) {
    return (
      <div style={{ display: "grid", placeItems: "center", padding: 60 }}>
        <Spin />
      </div>
    );
  }

  const address = [branch.addressLine1, branch.addressLine2, branch.ward, branch.district, branch.city, branch.country]
    .filter((part) => part && part.trim())
    .join(", ");

  return (
    <div>
      <SectionTitle title="Thông tin chi nhánh" sub="Dữ liệu lấy trực tiếp từ hệ thống" />
      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
        <Descriptions column={2} size="middle" colon={false}>
          <Descriptions.Item label="Tên chi nhánh">{branch.name}</Descriptions.Item>
          <Descriptions.Item label="Mã chi nhánh">{branch.code}</Descriptions.Item>
          <Descriptions.Item label="Thuộc chuỗi">{branch.chain.name}</Descriptions.Item>
          <Descriptions.Item label="Trạng thái">
            <Tag color={branch.status === "ACTIVE" ? "green" : "default"}>
              {STATUS_LABEL[branch.status] ?? branch.status}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Địa chỉ" span={2}>
            {address || "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Điện thoại">{branch.phone || "—"}</Descriptions.Item>
          <Descriptions.Item label="Email">{branch.email || "—"}</Descriptions.Item>
          <Descriptions.Item label="Múi giờ">{branch.timezone || "—"}</Descriptions.Item>
          <Descriptions.Item label="Số khu vực">{branch.areas.length}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card style={{ borderRadius: 14, marginTop: 16 }} styles={{ body: { padding: 20 } }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Giờ hoạt động</div>
        {branch.operatingHours.length === 0 ? (
          <div style={{ color: "#71717a", fontSize: 13 }}>Chưa khai báo giờ hoạt động cho chi nhánh này.</div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {branch.operatingHours.map((h) => (
              <div key={h.dayOfWeek} style={{ display: "flex", gap: 12, fontSize: 13 }}>
                <span style={{ width: 90, color: "#71717a" }}>{DAY_LABEL[h.dayOfWeek] ?? h.dayOfWeek}</span>
                <span>{h.isClosed ? "Nghỉ" : `${h.openTime}–${h.closeTime}`}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
