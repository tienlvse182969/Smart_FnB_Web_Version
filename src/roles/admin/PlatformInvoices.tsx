import { App, Button, Card, Input, Modal, Select, Space, Table, Tag, Typography } from "antd";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { adminAnalyticsApi } from "../../api/adminAnalytics";
import { showApiError } from "../../api";
import { SectionTitle } from "../../components/bits";
import { formatDateTime, formatVnd } from "../../lib/reportFormat";
import type { Paginated, PlatformInvoice, PlatformInvoiceStatus } from "../../types";

const PAGE_SIZE = 12;
const STATUS_OPTIONS = [
  { value: "PENDING", label: "Chưa thanh toán" },
  { value: "PAID", label: "Đã thanh toán" },
  { value: "NEEDS_REVIEW", label: "Cần xem xét" },
  { value: "FAILED", label: "Đã huỷ / thất bại" },
];

export default function PlatformInvoices() {
  const { message } = App.useApp();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PlatformInvoiceStatus>();
  const [data, setData] = useState<Paginated<PlatformInvoice>>();
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<PlatformInvoice>();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await adminAnalyticsApi.invoices({ page, limit: PAGE_SIZE, search, status })); }
    catch (err) { showApiError(message.error, err, "Không tải được hoá đơn thuê bao"); }
    finally { setLoading(false); }
  }, [page, search, status, message]);

  useEffect(() => { void load(); }, [load]);

  const confirm = async () => {
    if (!selected || note.trim().length < 3) return;
    setSaving(true);
    try {
      await adminAnalyticsApi.confirmInvoice(selected.source, selected.id, note.trim());
      message.success("Đã xác nhận hoá đơn và cập nhật kỳ thuê bao");
      setSelected(undefined); setNote(""); await load();
    } catch (err) { showApiError(message.error, err, "Không xác nhận được hoá đơn"); }
    finally { setSaving(false); }
  };

  return <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
    <SectionTitle
      title="Hoá đơn thuê bao"
      sub="Theo dõi thanh toán kỳ đầu và gia hạn; xác nhận thủ công chỉ dành cho khoản PayOS cần đối chiếu"
      extra={<Button icon={<RefreshCw size={15} />} onClick={() => void load()} loading={loading}>Làm mới</Button>}
    />
    <Space wrap style={{ marginBottom: 14 }}>
      <Input.Search allowClear placeholder="Mã hoá đơn, doanh nghiệp" style={{ width: 320 }} onSearch={(value) => { setSearch(value); setPage(1); }} />
      <Select allowClear placeholder="Tất cả trạng thái" style={{ width: 190 }} value={status} options={STATUS_OPTIONS} onChange={(value) => { setStatus(value); setPage(1); }} />
    </Space>
    <Table<PlatformInvoice>
      rowKey={(row) => `${row.source}-${row.id}`}
      loading={loading}
      dataSource={data?.items ?? []}
      scroll={{ x: 1050 }}
      pagination={{ current: data?.pagination.page ?? page, pageSize: PAGE_SIZE, total: data?.pagination.total ?? 0, showSizeChanger: false, onChange: setPage }}
      columns={[
        { title: "Doanh nghiệp", render: (_, row) => <><strong>{row.businessName}</strong><br /><Typography.Text type="secondary" style={{ fontSize: 12 }}>{row.businessCode}</Typography.Text></> },
        { title: "Loại", render: (_, row) => row.source === "REGISTRATION" ? "Kỳ đầu" : "Gia hạn" },
        { title: "Gói", dataIndex: "planName" },
        { title: "Số tiền", dataIndex: "amount", align: "right", render: (value: number) => formatVnd(value) },
        { title: "Trạng thái", dataIndex: "status", render: (value: PlatformInvoiceStatus) => <InvoiceStatus value={value} /> },
        { title: "Tạo lúc", dataIndex: "createdAt", render: formatDateTime },
        { title: "Thanh toán lúc", dataIndex: "paidAt", render: formatDateTime },
        { title: "Đối chiếu", render: (_, row) => row.status === "NEEDS_REVIEW" ? <Button size="small" type="primary" icon={<CheckCircle2 size={14} />} onClick={() => { setSelected(row); setNote(""); }}>Xác nhận</Button> : row.reviewReason ?? "—" },
      ]}
    />
    <Modal title="Xác nhận hoá đơn cần đối chiếu" open={!!selected} onCancel={() => setSelected(undefined)} onOk={() => void confirm()} okText="Xác nhận đã thu" confirmLoading={saving} okButtonProps={{ disabled: note.trim().length < 3 }}>
      {selected && <>
        <Typography.Paragraph>Doanh nghiệp <strong>{selected.businessName}</strong> · {selected.planName} · <strong>{formatVnd(selected.amount)}</strong></Typography.Paragraph>
        <Typography.Paragraph type="secondary">Lý do hệ thống đưa vào kiểm tra: {selected.reviewReason ?? "Không xác định"}. Xác nhận sẽ kích hoạt hoặc gia hạn đúng một kỳ.</Typography.Paragraph>
        <Typography.Text strong>Ghi chú đối chiếu bắt buộc</Typography.Text>
        <Input.TextArea aria-label="Ghi chú đối chiếu" rows={4} maxLength={1000} showCount value={note} onChange={(event) => setNote(event.target.value)} style={{ marginTop: 8 }} />
      </>}
    </Modal>
  </Card>;
}

function InvoiceStatus({ value }: { value: PlatformInvoiceStatus }) {
  const labels: Record<PlatformInvoiceStatus, [string, string]> = {
    PENDING: ["gold", "Chưa thanh toán"],
    PAID: ["green", "Đã thanh toán"],
    FAILED: ["default", "Đã huỷ / thất bại"],
    NEEDS_REVIEW: ["red", "Cần xem xét"],
  };
  return <Tag color={labels[value][0]}>{labels[value][1]}</Tag>;
}
