import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Descriptions, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ApiError, describeApiError, modeOf, orderApi } from "../../api";
import { useOrderRealtime } from "../../api/realtime/useOrderRealtime";
import RealtimeBadge from "../../components/RealtimeBadge";
import { orderItemStatusInfo, orderPaymentInfo, orderStatusInfo, paymentMethodInfo, paymentStatusInfo } from "../../api/modules/order/codes";
import { SectionTitle } from "../../components/bits";
import { formatDateTime, formatVnd } from "../../lib/reportFormat";
import { useAppStore } from "../../store";
import { palette } from "../../theme";
import type { OrderDetail as OrderDetailData, OrderDetailLine, OrderPaymentRecord } from "../../types";
import { Chip } from "../admin/adminUi";

/** Danh sách đặt `state.from` (chuỗi truy vấn đang lọc) khi mở chi tiết, để "Quay lại" về đúng bộ lọc và trang. */
export interface OrderDetailLocationState {
  from?: string;
}

const LIST_PATH = "/manager/orders";

const lineTotalExtras = (line: OrderDetailLine) => line.options.reduce((sum, o) => sum + o.priceDelta, 0);

const lineColumns: ColumnsType<OrderDetailLine> = [
  {
    title: "Món",
    key: "name",
    render: (_: unknown, line) => {
      const extras = lineTotalExtras(line);
      return (
        <div data-testid="order-line" data-status={line.status}>
          <div style={{ fontWeight: 600 }}>{line.name}</div>
          {line.options.length > 0 && (
            <ul data-testid="order-line-options" style={{ margin: "4px 0 0", paddingLeft: 18, color: palette.textMuted, fontSize: 13 }}>
              {line.options.map((o, i) => (
                <li key={i}>
                  {o.groupName ? `${o.groupName}: ` : ""}
                  {o.name}
                  {o.priceDelta !== 0 && <span> (+{formatVnd(o.priceDelta)})</span>}
                </li>
              ))}
            </ul>
          )}
          {line.options.length > 0 && (
            <div style={{ color: palette.textSubtle, fontSize: 12, marginTop: 2 }}>
              Giá món {formatVnd(line.unitPrice - extras)} + tuỳ chọn {formatVnd(extras)}
            </div>
          )}
          {line.note && <div style={{ color: palette.textMuted, fontSize: 13, marginTop: 2 }}>Ghi chú: {line.note}</div>}
          {line.cancellationReason && <div style={{ color: palette.textMuted, fontSize: 13, marginTop: 2 }}>Lý do huỷ dòng: {line.cancellationReason}</div>}
        </div>
      );
    },
  },
  { title: "SL", dataIndex: "quantity", align: "right", width: 70 },
  { title: "Giá lúc bán", dataIndex: "unitPrice", align: "right", width: 130, render: (v: number) => formatVnd(v) },
  { title: "Thành tiền", dataIndex: "total", align: "right", width: 130, render: (v: number) => formatVnd(v) },
  {
    title: "Trạng thái",
    dataIndex: "status",
    width: 130,
    render: (v: string) => {
      const info = orderItemStatusInfo(v);
      return <Chip tone={info.tone}>{info.label}</Chip>;
    },
  },
];

const paymentColumns: ColumnsType<OrderPaymentRecord> = [
  { title: "Hình thức", dataIndex: "method", width: 160, render: (v: string) => paymentMethodInfo(v).label },
  { title: "Số tiền", dataIndex: "amount", align: "right", width: 130, render: (v: number) => formatVnd(v) },
  {
    title: "Trạng thái",
    key: "status",
    width: 160,
    render: (_: unknown, p) => {
      const info = paymentStatusInfo(p.status, p.method);
      return <Chip tone={info.tone}>{info.label}</Chip>;
    },
  },
  { title: "Thời điểm", key: "at", width: 150, render: (_: unknown, p) => formatDateTime(p.paidAt ?? p.confirmedAt ?? p.createdAt) },
  { title: "Người xử lý", dataIndex: "processedBy", width: 150, render: (v: string | null) => v ?? "—" },
  {
    title: "Chi tiết",
    key: "detail",
    render: (_: unknown, p) => {
      const bits: string[] = [];
      if (p.confirmationReason) {
        bits.push(`Xác nhận thủ công${p.processedBy ? ` bởi ${p.processedBy}` : ""}: ${p.confirmationReason}`);
        if (p.receivedAmount !== null) bits.push(`Số tiền thực nhận: ${formatVnd(p.receivedAmount)}`);
      }
      if (p.transactionRef) bits.push(`Mã giao dịch: ${p.transactionRef}`);
      if (p.failureReason) bits.push(`Lý do lỗi: ${p.failureReason}`);
      return bits.length ? (
        <div data-testid="order-pay-detail" style={{ fontSize: 13, lineHeight: 1.6 }}>
          {bits.map((b) => (
            <div key={b}>{b}</div>
          ))}
        </div>
      ) : (
        "—"
      );
    },
  },
];

type LoadError = { kind: "notfound" } | { kind: "other"; text: string };

/**
 * BM-04: chi tiết một đơn của chi nhánh (quyết định 63, 73). Real `GET /manager/orders/:id`. Chỉ đọc: chưa có nút hành động
 * (Xác nhận thủ công ở 7.4, Huỷ đơn đã trả ở 7.6). Không có khối audit log (đặc tả loại trừ), không hiện tiền khách đưa/tiền thối
 * (BE chưa trả, #48) và không hiện quầy (BE không trả quầy trong chi tiết đơn, #52).
 */
export default function OrderDetail() {
  const { orderId = "" } = useParams();
  const chainId = useAppStore((s) => s.chainId);
  const branchId = useAppStore((s) => s.currentBranchId);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as OrderDetailLocationState | null)?.from ?? "";

  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [error, setError] = useState<LoadError | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const seq = useRef(0);

  const load = useCallback(
    async (silent: boolean) => {
      if (!chainId || !branchId || !orderId) return;
      const mine = ++seq.current;
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const data = await orderApi.getOrder({ chainId, branchId }, orderId);
        if (mine !== seq.current) return;
        setOrder(data);
        setError(null);
      } catch (err) {
        if (mine !== seq.current) return;
        // Làm tươi ngầm lỗi thì giữ dữ liệu đang hiện (không dựng khối lỗi trên nội dung đã có).
        if (silent) return;
        setOrder(null);
        // 404: đơn không có trong chi nhánh; 400: id không phải UUID. Cả hai là "không tìm thấy đơn".
        const missing = err instanceof ApiError && (err.status === 404 || err.status === 400);
        setError(missing ? { kind: "notfound" } : { kind: "other", text: describeApiError(err) });
      } finally {
        if (mine === seq.current && !silent) setLoading(false);
      }
    },
    [chainId, branchId, orderId],
  );

  useEffect(() => {
    void load(false);
    return () => {
      seq.current++;
    };
  }, [load, nonce]);

  // Tự làm tươi qua socket (quyết định 74): chỉ khi sự kiện thuộc đơn này (hoặc payload không nêu đơn nào); tải lại bằng GET.
  const realtimeOn = modeOf("order") === "real" && !!branchId && !!orderId;
  const realtime = useOrderRealtime(() => void load(true), { orderId, enabled: realtimeOn });

  const back = () => navigate(`${LIST_PATH}${from}`);

  const backButton = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
      {realtimeOn && <RealtimeBadge {...realtime} />}
      <Button icon={<ArrowLeft size={15} />} onClick={back} data-testid="order-detail-back">
        Quay lại
      </Button>
    </span>
  );

  if (!branchId) return <Alert type="warning" showIcon message="Tài khoản chưa được gán chi nhánh nào" />;

  if (error?.kind === "notfound") {
    return (
      <>
        <SectionTitle title="Chi tiết đơn" extra={backButton} />
        <Alert
          data-testid="order-detail-notfound"
          type="warning"
          showIcon
          message="Không tìm thấy đơn"
          description="Đơn này không có trong chi nhánh của bạn hoặc đã bị xoá."
          action={
            <Button size="small" onClick={back} data-testid="order-detail-tolist">
              Về Tra cứu đơn
            </Button>
          }
        />
      </>
    );
  }
  if (error?.kind === "other") {
    return (
      <>
        <SectionTitle title="Chi tiết đơn" extra={backButton} />
        <Alert
          data-testid="order-detail-error"
          type="error"
          showIcon
          message="Không tải được chi tiết đơn"
          description={error.text}
          action={
            <Button size="small" onClick={() => setNonce((n) => n + 1)} data-testid="order-detail-retry">
              Thử lại
            </Button>
          }
        />
      </>
    );
  }
  if (!order) {
    return (
      <>
        <SectionTitle title="Chi tiết đơn" extra={backButton} />
        <Card loading={loading} style={{ borderRadius: 14 }} />
      </>
    );
  }

  const status = orderStatusInfo(order.status);
  const payment = orderPaymentInfo(order);
  const cancelled = order.status === "CANCELLED";

  return (
    <div data-testid="order-detail">
      <SectionTitle title={`Đơn số ${order.callNumber ?? "—"}`} sub={order.orderCode} extra={backButton} />
      <Card style={{ borderRadius: 14, marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} size="small">
          <Descriptions.Item label="Số gọi">
            <b data-testid="order-detail-call">{order.callNumber ?? "—"}</b>
          </Descriptions.Item>
          <Descriptions.Item label="Mã đơn">
            <span data-testid="order-detail-code" style={{ fontFamily: "monospace" }}>
              {order.orderCode}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="Thu ngân tạo đơn">
            <span data-testid="order-detail-cashier">{order.cashierName ?? "—"}</span>
          </Descriptions.Item>
          <Descriptions.Item label="Thời gian đặt">
            <span data-testid="order-detail-placed">{formatDateTime(order.placedAt)}</span>
          </Descriptions.Item>
          <Descriptions.Item label="Thời gian thanh toán">
            <span data-testid="order-detail-paid-at">{formatDateTime(order.paidAt)}</span>
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái đơn">
            <span data-testid="order-detail-status">
              <Chip tone={status.tone}>{status.label}</Chip>
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="Thanh toán">
            <span data-testid="order-detail-payment">
              <Chip tone={payment.tone}>{payment.label}</Chip>
            </span>
          </Descriptions.Item>
          {order.note && <Descriptions.Item label="Ghi chú đơn">{order.note}</Descriptions.Item>}
        </Descriptions>
      </Card>

      {cancelled && (
        <Alert
          data-testid="order-detail-cancel"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Đơn đã huỷ"
          description={
            <div style={{ lineHeight: 1.7 }}>
              <div>
                Người huỷ: <b data-testid="order-detail-cancel-by">{order.cancelledBy ?? "—"}</b>
              </div>
              <div>
                Thời điểm: <span data-testid="order-detail-cancel-at">{formatDateTime(order.cancelledAt)}</span>
              </div>
              <div>
                Lý do: <span data-testid="order-detail-cancel-reason">{order.cancellationReason ?? "—"}</span>
              </div>
            </div>
          }
        />
      )}

      <Card title="Món đã đặt" style={{ borderRadius: 14, marginBottom: 16 }} styles={{ body: { padding: 0 } }}>
        <Table<OrderDetailLine>
          data-testid="order-detail-lines"
          rowKey="id"
          size="middle"
          columns={lineColumns}
          dataSource={order.lines}
          pagination={false}
          scroll={{ x: 640 }}
          locale={{ emptyText: "Đơn chưa có món" }}
        />
        <div data-testid="order-detail-totals" style={{ padding: "12px 16px", display: "grid", gap: 4, justifyContent: "end", textAlign: "right" }}>
          {(order.discount > 0 || order.tax > 0 || order.serviceCharge > 0) && <div>Tạm tính: {formatVnd(order.subtotal)}</div>}
          {order.discount > 0 && <div>Giảm giá: −{formatVnd(order.discount)}</div>}
          {order.tax > 0 && <div>Thuế: {formatVnd(order.tax)}</div>}
          {order.serviceCharge > 0 && <div>Phí dịch vụ: {formatVnd(order.serviceCharge)}</div>}
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            Tổng tiền: <span data-testid="order-detail-total">{formatVnd(order.total)}</span>
          </div>
        </div>
      </Card>

      <Card title="Lịch sử thanh toán" style={{ borderRadius: 14 }} styles={{ body: { padding: 0 } }}>
        <Table<OrderPaymentRecord>
          data-testid="order-detail-payments"
          rowKey={(p) => p.id || p.paymentCode}
          size="middle"
          columns={paymentColumns}
          dataSource={order.payments}
          pagination={false}
          scroll={{ x: 860 }}
          locale={{ emptyText: "Chưa có khoản thanh toán" }}
        />
      </Card>
    </div>
  );
}
