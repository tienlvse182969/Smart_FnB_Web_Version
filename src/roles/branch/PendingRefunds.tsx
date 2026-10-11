import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import { modeOf, orderApi } from "../../api";
import { pendingRefundTotal } from "../../api/modules/order/paidCancel";
import { useOrderRealtime } from "../../api/realtime/useOrderRealtime";
import { formatDateTime, formatVnd } from "../../lib/reportFormat";
import { useAppStore } from "../../store";
import { palette } from "../../theme";
import type { OrderSummary } from "../../types";

/**
 * BM-06 (BR-50): đơn còn khoản chờ hoàn tiền (chuyển khoản chưa đánh dấu đã hoàn, kể cả tiền về sau khi đơn đã huỷ). Lọc theo
 * `refundStatus=PENDING` của BE (`514c426`). Chỉ hiện khi CÓ đơn; lỗi tải thì im lặng (đơn "Cần xử lý" ở trên là nội dung chính).
 * Tự làm tươi qua socket dùng chung (`order.cancelled`, `refund.pending`, `refund.completed`).
 */
export default function PendingRefunds({ refreshKey }: { /** Đổi mỗi lần danh sách chính nạp xong (null = chưa nạp/lỗi: không nạp khối này). */ refreshKey: unknown }) {
  const chainId = useAppStore((s) => s.chainId);
  const branchId = useAppStore((s) => s.currentBranchId);
  const navigate = useNavigate();
  const [rows, setRows] = useState<OrderSummary[]>([]);
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!chainId || !branchId || refreshKey === null) return;
    const mine = ++seq.current;
    try {
      const page = await orderApi.listOrders({ chainId, branchId }, { refundStatus: "PENDING", page: 1, limit: 100 });
      if (mine !== seq.current) return;
      setRows(page.items.filter((o) => o.refunds.some((r) => r.status === "PENDING")));
    } catch {
      // im lặng: xem ghi chú ở đầu file
    }
    // `refreshKey` là điều kiện nạp (không dùng giá trị): đổi theo danh sách chính để khối này nạp lại cùng lúc.
  }, [chainId, branchId, refreshKey]);

  useEffect(() => {
    void load();
    return () => {
      seq.current++;
    };
  }, [load]);

  const realtimeOn = modeOf("order") === "real" && !!branchId;
  useOrderRealtime(() => void load(), { enabled: realtimeOn });

  if (rows.length === 0) return null;

  const columns: ColumnsType<OrderSummary> = [
    { title: "Số gọi", dataIndex: "callNumber", width: 90, render: (v: number | null) => v ?? "—" },
    { title: "Mã đơn", dataIndex: "orderCode", render: (v: string) => <span style={{ fontFamily: "monospace" }}>{v}</span> },
    { title: "Ngày huỷ", dataIndex: "cancelledAt", width: 160, render: (v: string | null) => formatDateTime(v) },
    {
      title: "Còn phải hoàn",
      key: "pending",
      align: "right",
      width: 150,
      render: (_: unknown, o) => (
        <b data-testid="pending-refund-amount" style={{ color: palette.warning.text }}>
          {formatVnd(pendingRefundTotal(o.refunds))}
        </b>
      ),
    },
    {
      title: "",
      key: "open",
      align: "right",
      width: 100,
      render: (_: unknown, o) => (
        <Button size="small" type="primary" data-testid="pending-refund-open" onClick={() => navigate(`/manager/orders/${o.id}`, { state: { from: "" } })}>
          Xem
        </Button>
      ),
    },
  ];

  return (
    <Card title="Khoản chờ hoàn tiền" data-testid="pending-refunds" style={{ borderRadius: 14, marginTop: 16 }} styles={{ body: { padding: 0 } }}>
      <Table<OrderSummary> rowKey="id" size="middle" columns={columns} dataSource={rows} pagination={false} scroll={{ x: 640 }} />
    </Card>
  );
}
