import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Table } from "antd";
import { Check, Minus } from "lucide-react";
import type { ServicePlan } from "../../types";
import { describeApiError } from "../../api";
import { platformStaffApi } from "../../api/platformStaff";
import { SectionTitle } from "../../components/bits";
import { formatVnd } from "../../lib/reportFormat";
import { palette } from "../../theme";
import { Chip } from "../admin/adminUi";

/**
 * PA-04 cho Platform Staff (đặc tả 17.3 mục 30.2): XEM gói và giá gói, chỉ đọc. Không có nút thêm, sửa hay bật/tắt gói —
 * việc đó chỉ Platform Admin làm (BR-74). Dữ liệu từ `GET /platform-staff/service-plans`.
 */
export default function PlatformStaffPlans() {
  const [plans, setPlans] = useState<ServicePlan[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const seq = useRef(0);

  const load = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const rows = await platformStaffApi.listPlans();
      if (mine === seq.current) setPlans(rows);
    } catch (err) {
      if (mine === seq.current) setError(err);
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      seq.current += 1;
    };
  }, [load]);

  const forbidden = (error as { status?: number } | null)?.status === 403;

  return (
    <Card data-testid="staff-plans" style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle title="Gói dịch vụ" sub="Giá tháng và hạn mức của từng gói — chỉ xem, việc chỉnh sửa do Platform Admin làm" />
      {error ? (
        <Alert
          data-testid="staff-plans-error"
          type={forbidden ? "warning" : "error"}
          showIcon
          message={forbidden ? "Bạn chưa có quyền xem danh sách gói" : "Không tải được danh sách gói"}
          description={forbidden ? "Tài khoản này không được xem gói dịch vụ." : describeApiError(error)}
          action={
            forbidden ? undefined : (
              <Button size="small" onClick={() => void load()}>
                Thử lại
              </Button>
            )
          }
        />
      ) : (
        <Table<ServicePlan>
          dataSource={plans ?? []}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="middle"
          scroll={{ x: 720 }}
          locale={{ emptyText: <span style={{ color: palette.textMuted }}>Chưa có gói dịch vụ nào.</span> }}
          columns={[
            { title: "Gói", dataIndex: "name", render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
            { title: "Mã", dataIndex: "code" },
            { title: "Giá / tháng", dataIndex: "monthlyPrice", align: "right", render: (v: number) => formatVnd(v) },
            { title: "Chi nhánh tối đa", dataIndex: "maxBranches", align: "right" },
            { title: "Tài khoản tối đa", dataIndex: "maxAccounts", align: "right" },
            {
              title: "Nhận diện",
              dataIndex: "brandingEnabled",
              align: "center",
              render: (v: boolean) => (v ? <Check size={14} color={palette.success.text} /> : <Minus size={14} color={palette.textSubtle} />),
            },
            {
              title: "So sánh chi nhánh",
              dataIndex: "multiBranchComparisonEnabled",
              align: "center",
              render: (v: boolean) => (v ? <Check size={14} color={palette.success.text} /> : <Minus size={14} color={palette.textSubtle} />),
            },
            { title: "Trạng thái", dataIndex: "isActive", render: (v: boolean) => <Chip tone={v ? "success" : "neutral"}>{v ? "Đang bán" : "Ngừng bán"}</Chip> },
          ]}
        />
      )}
    </Card>
  );
}
