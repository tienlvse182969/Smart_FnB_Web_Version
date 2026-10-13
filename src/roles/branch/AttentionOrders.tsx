import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ApiError, describeApiError, modeOf, orderApi } from "../../api";
import {
  ATTENTION_STATUS,
  formatWaited,
  toAttentionRows,
  createPoller,
  type AttentionRow,
} from "../../api/modules/order/attention";
import { useOrderRealtime } from "../../api/realtime/useOrderRealtime";
import RealtimeBadge from "../../components/RealtimeBadge";
import { SectionTitle } from "../../components/bits";
import { formatVnd } from "../../lib/reportFormat";
import { useAppStore } from "../../store";
import { palette } from "../../theme";
import { attentionStore } from "./attentionStore";
import PendingRefunds from "./PendingRefunds";

/**
 * BM-05 (quyết định 99–101): danh sách đơn "Cần xử lý" (`REQUIRES_ATTENTION`) của chi nhánh, cũ nhất trước. Mỗi dòng: mã đơn, số gọi,
 * đã chờ (từ lúc đặt đơn), tổng, đã nhận, chênh lệch (thiếu = đỏ, dư = vàng), nút Xem → chi tiết (nơi xác nhận thủ công).
 * Tự làm tươi qua socket (hook dùng chung) và dự phòng 60 giây khi tab hiển thị. Chỉ đọc; huỷ/hoàn làm ở trang chi tiết đơn (BM-06, #43).
 * Phía dưới có khối "Khoản chờ hoàn tiền" (`PendingRefunds`) khi có đơn còn khoản chờ hoàn.
 */
export default function AttentionOrders() {
  const chainId = useAppStore((s) => s.chainId);
  const branchId = useAppStore((s) => s.currentBranchId);
  const navigate = useNavigate();
  const [rows, setRows] = useState<AttentionRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const load = useCallback(
    async (silent: boolean) => {
      if (!chainId || !branchId) return;
      const mine = ++seq.current;
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        // #66 (BE `fb7cae9`): BE sắp cũ nhất trước theo `attentionAt` (đơn chưa có `attentionAt` xếp cuối, #77); web không sắp lại.
        const page = await orderApi.listOrders({ chainId, branchId }, { status: ATTENTION_STATUS, sortBy: "attentionAt", sortOrder: "asc", page: 1, limit: 100 });
        if (mine !== seq.current) return;
        setRows(toAttentionRows(page.items, Date.now()));
        setTotal(page.total);
        setError(null);
        attentionStore.set(page.total);
      } catch (err) {
        if (mine !== seq.current || silent) return;
        setRows(null);
        setError(err instanceof ApiError || err instanceof Error ? describeApiError(err) : "Có lỗi xảy ra. Thử lại sau.");
      } finally {
        if (mine === seq.current && !silent) setLoading(false);
      }
    },
    [chainId, branchId],
  );

  useEffect(() => {
    void load(false);
    return () => {
      seq.current++;
    };
  }, [load]);

  // Dự phòng #51: 60 giây khi tab hiển thị (cũng cập nhật cột "Đã chờ").
  useEffect(() => {
    if (!chainId || !branchId) return;
    const poller = createPoller({ load: () => void load(true), isVisible: () => document.visibilityState !== "hidden" });
    const onVisibility = () => poller.onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibility);
    poller.start();
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      poller.dispose();
    };
  }, [chainId, branchId, load]);

  const realtimeOn = modeOf("order") === "real" && !!branchId;
  const realtime = useOrderRealtime(() => void load(true), { enabled: realtimeOn });

  const columns: ColumnsType<AttentionRow> = [
    { title: "Số gọi", dataIndex: "callNumber", width: 90, render: (v: number | null) => v ?? "—" },
    { title: "Mã đơn", dataIndex: "orderCode", render: (v: string) => <span style={{ fontFamily: "monospace" }}>{v}</span> },
    // Lý do theo BE (QĐ 123): mỗi loại một nhãn riêng; mã lạ → "Khác (<mã>)".
    {
      title: "Lý do",
      key: "reason",
      width: 210,
      render: (_: unknown, r) => (
        <Tag color={r.reasonKind === "ITEM_OUT_OF_STOCK" || r.reasonKind === "OPTION_OUT_OF_STOCK" ? "warning" : r.reasonKind === "UNKNOWN" ? "default" : "error"} data-testid="attention-reason">
          {r.reasonLabel}
        </Tag>
      ),
    },
    // "Đã chờ" từ `attentionAt` (#65); BE chưa ghi cho đơn lệch tiền (#77) thì tính từ lúc đặt và ghi rõ trong ô.
    {
      title: "Đã chờ",
      dataIndex: "waitedMs",
      width: 170,
      render: (v: number | null, r) => (
        <span data-testid="attention-waited">
          {formatWaited(v)}
          {v !== null && r.waitedFromPlaced && <span style={{ color: palette.textMuted }}> (từ lúc đặt)</span>}
        </span>
      ),
    },
    { title: "Tổng đơn", dataIndex: "total", align: "right", width: 130, render: (v: number) => formatVnd(v) },
    // Hai cột tiền chỉ có nghĩa với loại lệch tiền (QĐ 123).
    { title: "Đã nhận", dataIndex: "received", align: "right", width: 130, render: (v: number | null) => (v === null ? "—" : formatVnd(v)) },
    {
      title: "Chênh lệch",
      key: "diff",
      width: 170,
      render: (_: unknown, r) => {
        if (r.difference === null) return "—";
        if (r.kind === "short") return <Tag color="error" data-testid="attention-diff">Thiếu {formatVnd(-r.difference)}</Tag>;
        if (r.kind === "over") return <Tag color="warning" data-testid="attention-diff">Dư {formatVnd(r.difference)}</Tag>;
        return <Tag data-testid="attention-diff">Đủ</Tag>;
      },
    },
    {
      title: "",
      key: "open",
      align: "right",
      width: 100,
      render: (_: unknown, r) => (
        <Button size="small" type="primary" data-testid="attention-open" onClick={() => navigate(`/manager/orders/${r.id}`, { state: { from: "" } })}>
          Xem
        </Button>
      ),
    },
  ];

  if (!branchId) return <Alert type="warning" showIcon message="Tài khoản chưa được gán chi nhánh nào" />;

  return (
    <div data-testid="attention-page">
      <SectionTitle
        title="Đơn cần xử lý"
        sub="Lệch số tiền (không tự xác nhận, BR-28), hết món khi đơn đã trả, tiền về sau khi QR hết hạn. Cũ nhất ở trên."
        extra={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
            {realtimeOn && <RealtimeBadge {...realtime} />}
            <Button icon={<RefreshCw size={15} />} onClick={() => void load(false)} data-testid="attention-refresh">
              Làm mới
            </Button>
          </span>
        }
      />
      {error && (
        <Alert
          data-testid="attention-error"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="Không tải được danh sách đơn cần xử lý"
          description={error}
          action={
            <Button size="small" onClick={() => void load(false)} data-testid="attention-retry">
              Thử lại
            </Button>
          }
        />
      )}
      {!error && (
        <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 0 } }}>
          <Table<AttentionRow>
            data-testid="attention-table"
            rowKey="id"
            size="middle"
            loading={loading}
            columns={columns}
            dataSource={rows ?? []}
            pagination={false}
            scroll={{ x: 1000 }}
            locale={{ emptyText: loading ? " " : <span data-testid="attention-empty">Không có đơn nào cần xử lý.</span> }}
          />
          {rows !== null && total > rows.length && (
            <div style={{ padding: "10px 16px", color: palette.textMuted, fontSize: 13 }}>
              Hiện {rows.length}/{total} đơn (trang đầu 100 đơn). Dùng Tra cứu đơn lọc "Cần xử lý" để xem phần còn lại.
            </div>
          )}
        </Card>
      )}
      <PendingRefunds refreshKey={rows} />
    </div>
  );
}
