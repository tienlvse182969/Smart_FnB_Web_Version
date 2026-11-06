import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, App, Button, Card, Input, Modal, Segmented, Space, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Link } from "react-router-dom";
import { describeApiError, modeOf } from "../../api";
import { listManagerRefundApprovals, reviewManagerRefundApproval, type RefundApprovalRequest } from "../../api/modules/order/refundApprovals";
import { useOrderRealtime } from "../../api/realtime/useOrderRealtime";
import { SectionTitle } from "../../components/bits";
import { Chip } from "../admin/adminUi";
import type { StatusColorKey } from "../../theme";
import { formatDateTime, formatVnd } from "../../lib/reportFormat";

type Status = RefundApprovalRequest["status"];
type Filter = "PENDING" | "APPROVED" | "REJECTED" | "ALL";

const STATUS: Record<Status, { label: string; tone: StatusColorKey }> = {
  PENDING: { label: "Chờ duyệt", tone: "warning" },
  APPROVED: { label: "Đã duyệt · chờ Thu ngân trả tiền", tone: "info" },
  REJECTED: { label: "Đã từ chối", tone: "error" },
  COMPLETED: { label: "Thu ngân đã trả tiền", tone: "success" },
};

const REASON_LABEL: Record<string, string> = {
  CHANGE_OF_MIND: "Khách đổi ý",
  WRONG_ITEM: "Món sai",
  OUT_OF_STOCK: "Hết món",
  LONG_WAIT: "Chờ quá lâu",
  OTHER: "Khác",
};

/** BE lưu `reason` = "<MÃ>" hoặc "<MÃ>: <ghi chú>"; tách ghi chú để hiện cạnh nhãn tiếng Việt. */
const reasonText = (row: RefundApprovalRequest) => {
  const label = REASON_LABEL[row.reasonCode] ?? row.reasonCode;
  const note = row.reason.startsWith(row.reasonCode) ? row.reason.slice(row.reasonCode.length).replace(/^:\s*/, "") : row.reason;
  return note ? `${label}: ${note}` : label;
};

/** Mô tả các dòng xin hoàn. BE chỉ trả id dòng (chưa có tên món) nên hiện số dòng; rỗng = toàn bộ phần còn lại của đơn. */
const linesText = (row: RefundApprovalRequest) => (row.orderItemIds.length === 0 ? "Cả đơn" : `${row.orderItemIds.length} dòng`);

/**
 * BM-06 (BR-82): Store Manager duyệt/từ chối yêu cầu hoàn tiền mặt của Thu ngân (đơn ngày trước). Thu ngân là người trả tiền.
 * BE: `GET /manager/refund-approval-requests`, `POST …/:id/approve|reject` thân `{ note? ≤ 500 }`.
 * Làm tươi: sự kiện `refund.approval-requested|reviewed` của socket chi nhánh + nút Làm mới (không polling).
 * CHƯA CÓ ở BE nên không hiện: hình thức đã trả, tên món của dòng xin hoàn, tên Thu ngân gửi (list chỉ trả id).
 */
export default function RefundApprovals() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<RefundApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("PENDING");
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
  }, [load]);

  useOrderRealtime(() => void load(true), { enabled: modeOf("order") === "real" });

  const submit = async () => {
    if (!decision || saving) return;
    setSaving(true);
    try {
      await reviewManagerRefundApproval(decision.request.id, decision.approved, note);
      message.success(decision.approved ? "Đã duyệt. Thu ngân sẽ trả tiền mặt và xác nhận trên ứng dụng." : "Đã từ chối yêu cầu hoàn tiền.");
      setDecision(null);
      setNote("");
    } catch (failure) {
      // 409: yêu cầu đã được Store Manager khác xử lý (hoặc không còn duyệt được) → báo rõ rồi tải lại danh sách.
      message.error(describeApiError(failure));
      setDecision(null);
    } finally {
      setSaving(false);
      await load(true);
    }
  };

  const shown = useMemo(
    () => rows.filter((row) => (filter === "ALL" ? true : filter === "APPROVED" ? row.status === "APPROVED" || row.status === "COMPLETED" : row.status === filter)),
    [rows, filter],
  );
  const pendingCount = rows.filter((row) => row.status === "PENDING").length;

  const columns: ColumnsType<RefundApprovalRequest> = [
    { title: "Số gọi", key: "callNumber", width: 80, render: (_, row) => row.order.callNumber ?? "—" },
    { title: "Đơn", key: "order", render: (_, row) => <Link to={`/store-manager/orders/${row.orderId}`}>{row.order.orderCode}</Link> },
    { title: "Thanh toán lúc", key: "paidAt", render: (_, row) => formatDateTime(row.order.paidAt) },
    { title: "Dòng xin hoàn", key: "lines", render: (_, row) => linesText(row) },
    { title: "Số tiền hoàn", dataIndex: "amount", align: "right", render: (amount: string) => <b>{formatVnd(Number(amount))}</b> },
    { title: "Lý do", key: "reason", render: (_, row) => reasonText(row) },
    { title: "Gửi lúc", dataIndex: "requestedAt", render: (at: string) => formatDateTime(at) },
    { title: "Trạng thái", key: "status", render: (_, row) => <Chip tone={STATUS[row.status].tone}>{STATUS[row.status].label}</Chip> },
    { title: "Ghi chú duyệt", dataIndex: "reviewNote", render: (value: string | null) => value || "—" },
    {
      title: "Thao tác",
      key: "actions",
      render: (_, row) =>
        row.status === "PENDING" ? (
          <Space>
            <Button type="primary" onClick={() => { setNote(""); setDecision({ request: row, approved: true }); }}>Duyệt</Button>
            <Button danger onClick={() => { setNote(""); setDecision({ request: row, approved: false }); }}>Từ chối</Button>
          </Space>
        ) : null,
    },
  ];

  const amountText = decision ? formatVnd(Number(decision.request.amount)) : "";

  return (
    <div data-testid="refund-approvals">
      <SectionTitle title="Yêu cầu hoàn tiền" sub="Store Manager duyệt yêu cầu của Thu ngân. Thu ngân là người trả tiền mặt và xác nhận hoàn tất." />
      {error && <Alert type="error" showIcon message="Không tải được yêu cầu" description={error} action={<Button onClick={() => void load()}>Thử lại</Button>} style={{ marginBottom: 16 }} />}
      <Card style={{ borderRadius: 14 }}>
        <Space style={{ marginBottom: 12, width: "100%", justifyContent: "space-between" }} wrap>
          <Segmented
            value={filter}
            onChange={(value) => setFilter(value as Filter)}
            options={[
              { label: `Chờ duyệt (${pendingCount})`, value: "PENDING" },
              { label: "Đã duyệt", value: "APPROVED" },
              { label: "Đã từ chối", value: "REJECTED" },
              { label: "Tất cả", value: "ALL" },
            ]}
          />
          <Button onClick={() => void load()} loading={loading} data-testid="refund-approvals-refresh">Làm mới</Button>
        </Space>
        <Table rowKey="id" loading={loading} columns={columns} dataSource={shown} scroll={{ x: 1100 }} pagination={{ pageSize: 20 }} locale={{ emptyText: "Chưa có yêu cầu hoàn tiền" }} />
      </Card>
      <Modal
        open={!!decision}
        title={decision?.approved ? "Duyệt yêu cầu hoàn tiền" : "Từ chối yêu cầu hoàn tiền"}
        okText={decision?.approved ? `Duyệt hoàn ${amountText}` : "Từ chối"}
        okButtonProps={{ danger: !decision?.approved, loading: saving }}
        cancelText="Đóng"
        onCancel={() => { if (!saving) setDecision(null); }}
        onOk={() => void submit()}
      >
        <p>
          {decision?.approved
            ? `Duyệt hoàn ${amountText} cho đơn ${decision?.request.order.orderCode}. Thu ngân sẽ trả tiền mặt cho khách và xác nhận trên ứng dụng.`
            : `Từ chối hoàn ${amountText} cho đơn ${decision?.request.order.orderCode}. Thu ngân sẽ thấy yêu cầu bị từ chối và có thể gửi yêu cầu mới.`}
        </p>
        <Input.TextArea aria-label="Ghi chú duyệt hoàn tiền" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} showCount rows={3} placeholder="Ghi chú cho Thu ngân (không bắt buộc, tối đa 500 ký tự)" />
      </Modal>
    </div>
  );
}
