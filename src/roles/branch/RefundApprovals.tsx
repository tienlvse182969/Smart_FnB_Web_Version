import { useCallback, useEffect, useState } from "react";
import { Alert, App, Button, Card, Input, Modal, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Link } from "react-router-dom";
import { describeApiError } from "../../api";
import { listManagerRefundApprovals, reviewManagerRefundApproval, type RefundApprovalRequest } from "../../api/modules/order/refundApprovals";
import { SectionTitle } from "../../components/bits";
import { formatDateTime, formatVnd } from "../../lib/reportFormat";

const STATUS: Record<RefundApprovalRequest["status"], { label: string; color: string }> = {
  PENDING: { label: "Chờ duyệt", color: "gold" },
  APPROVED: { label: "Đã duyệt · chờ Thu ngân trả tiền", color: "blue" },
  REJECTED: { label: "Đã từ chối", color: "red" },
  COMPLETED: { label: "Thu ngân đã trả tiền", color: "green" },
};

export default function RefundApprovals() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<RefundApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<{ request: RefundApprovalRequest; approved: boolean } | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setRows(await listManagerRefundApprovals());
      setError(null);
    } catch (failure) {
      if (!silent) setError(describeApiError(failure));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 20_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const submit = async () => {
    if (!decision || saving) return;
    setSaving(true);
    try {
      await reviewManagerRefundApproval(decision.request.id, decision.approved, note);
      message.success(decision.approved ? "Đã duyệt. Thu ngân sẽ trả tiền mặt và xác nhận trên ứng dụng." : "Đã từ chối yêu cầu hoàn tiền.");
      setDecision(null);
      setNote("");
      await load(true);
    } catch (failure) {
      message.error(describeApiError(failure));
      await load(true);
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<RefundApprovalRequest> = [
    { title: "Đơn", key: "order", render: (_, row) => <Link to={`/store-manager/orders/${row.orderId}`}>{row.order.orderCode}</Link> },
    { title: "Số gọi", key: "callNumber", render: (_, row) => row.order.callNumber ?? "—" },
    { title: "Số tiền", dataIndex: "amount", align: "right", render: (amount: string) => <b>{formatVnd(Number(amount))}</b> },
    { title: "Lý do", dataIndex: "reason" },
    { title: "Thời điểm gửi", dataIndex: "requestedAt", render: (at: string) => formatDateTime(at) },
    { title: "Trạng thái", key: "status", render: (_, row) => <Tag color={STATUS[row.status].color}>{STATUS[row.status].label}</Tag> },
    { title: "Ghi chú duyệt", dataIndex: "reviewNote", render: (value: string | null) => value || "—" },
    { title: "Thao tác", key: "actions", render: (_, row) => row.status === "PENDING" ? (
      <Space>
        <Button type="primary" onClick={() => { setNote(""); setDecision({ request: row, approved: true }); }}>Duyệt</Button>
        <Button danger onClick={() => { setNote(""); setDecision({ request: row, approved: false }); }}>Từ chối</Button>
      </Space>
    ) : null },
  ];

  return (
    <div data-testid="refund-approvals">
      <SectionTitle title="Yêu cầu hoàn tiền" sub="Store Manager duyệt yêu cầu của Thu ngân. Thu ngân là người trả tiền và xác nhận hoàn tất." />
      {error && <Alert type="error" showIcon message="Không tải được yêu cầu" description={error} action={<Button onClick={() => void load()}>Thử lại</Button>} style={{ marginBottom: 16 }} />}
      <Card style={{ borderRadius: 14 }}>
        <Table rowKey="id" loading={loading} columns={columns} dataSource={rows} scroll={{ x: 900 }} pagination={{ pageSize: 20 }} locale={{ emptyText: "Chưa có yêu cầu hoàn tiền" }} />
      </Card>
      <Modal
        open={!!decision}
        title={decision?.approved ? "Duyệt yêu cầu hoàn tiền" : "Từ chối yêu cầu hoàn tiền"}
        okText={decision?.approved ? "Duyệt yêu cầu" : "Từ chối"}
        okButtonProps={{ danger: !decision?.approved, loading: saving }}
        cancelText="Đóng"
        onCancel={() => { if (!saving) setDecision(null); }}
        onOk={() => void submit()}
      >
        <p>{decision?.approved ? "Sau khi duyệt, Thu ngân sẽ trả tiền mặt cho khách và xác nhận trên ứng dụng." : "Thu ngân sẽ thấy yêu cầu đã bị từ chối và có thể gửi yêu cầu mới."}</p>
        <Input.TextArea aria-label="Ghi chú duyệt hoàn tiền" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={3} placeholder="Ghi chú cho Thu ngân (không bắt buộc)" />
      </Modal>
    </div>
  );
}
