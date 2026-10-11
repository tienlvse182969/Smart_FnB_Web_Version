import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, App, Button, Card, Descriptions, Space, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ApiError, describeApiError, modeOf, orderApi, showApiError } from "../../api";
import { confirmErrorInfo, confirmableTransfer } from "../../api/modules/order/manualConfirm";
import ActionButton from "../../plan/ActionButton";
import { pendingRefundTotal, paidActionErrorInfo, cancelTarget, refundCompletable } from "../../api/modules/order/paidCancel";
import ConfirmTransferModal from "./ConfirmTransferModal";
import { CancelPaidModal, CompleteRefundModal } from "./RefundModals";
import { useOrderRealtime } from "../../api/realtime/useOrderRealtime";
import RealtimeBadge from "../../components/RealtimeBadge";
import {
  orderItemStatusInfo,
  orderPaymentInfo,
  orderStatusInfo,
  paymentMethodInfo,
  paymentStatusInfo,
  refundMethodInfo,
  refundSourceInfo,
  refundStatusInfo,
} from "../../api/modules/order/codes";
import { SectionTitle } from "../../components/bits";
import { formatDateTime, formatVnd } from "../../lib/reportFormat";
import { useAppStore } from "../../store";
import { palette } from "../../theme";
import type {
  CancelPaidInput,
  CompleteRefundInput,
  ConfirmPaymentInput,
  OrderDetail as OrderDetailData,
  OrderDetailLine,
  OrderPaymentRecord,
  OrderRefundRecord,
} from "../../types";
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
      } else if (p.status === "AMOUNT_MISMATCH" && p.receivedAmount !== null) {
        // Khoản "Lệch số tiền" (BR-28): số BE ghi nhận từ webhook/Kiểm tra lại, chưa phải số Manager đã xác nhận.
        bits.push(`Số tiền nhận được: ${formatVnd(p.receivedAmount)} (khác số cần nhận ${formatVnd(p.amount)})`);
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

/** Vai trò BE ghi ở khoản hoàn (BE không trả tên người): hiện bằng tiếng Việt. */
const ROLE_LABEL: Record<string, string> = { MANAGER: "Quản lý chi nhánh", OWNER: "Chủ chuỗi", SYSTEM: "Hệ thống" };
const roleLabel = (role: string | null) => (role ? (ROLE_LABEL[role] ?? role) : "—");

type LoadError = { kind: "notfound" } | { kind: "other"; text: string };

/**
 * BM-04: chi tiết một đơn của chi nhánh (quyết định 63, 73). Real `GET /manager/orders/:id`. Hành động duy nhất: "Xác nhận thủ công"
 * (BM-05, quyết định 82–85) cho khoản chuyển khoản chờ/lệch số tiền; Huỷ đơn đã trả ở 7.6. Không có khối audit log (đặc tả loại trừ), không hiện tiền khách đưa/tiền thối
 * (BE chưa trả, #48) và không hiện quầy (BE không trả quầy trong chi tiết đơn, #52).
 */
export default function OrderDetail() {
  const { orderId = "" } = useParams();
  const chainId = useAppStore((s) => s.chainId);
  const branchId = useAppStore((s) => s.currentBranchId);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as OrderDetailLocationState | null)?.from ?? "";
  const { message } = App.useApp();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  /** Id khoản hoàn đang mở hộp "Đánh dấu đã hoàn". */
  const [completeId, setCompleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Bấm đúp nhanh chỉ gửi 1 request (state cập nhật bất đồng bộ nên giữ thêm ref).
  const inFlight = useRef(false);

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

  // Quyết định 102: hộp xác nhận tay đang mở mà dữ liệu mới (socket/Thử lại) cho thấy đơn hết điều kiện xác nhận (webhook về, đã huỷ…)
  // → đóng hộp và nói rõ. Không chạy khi đang gửi (kết quả của chính request đó do `submitConfirm` xử lý).
  useEffect(() => {
    if (!confirmOpen || submitting || !order) return;
    if (confirmableTransfer(order)) return;
    setConfirmOpen(false);
    message.info(`Đơn vừa được cập nhật (${orderStatusInfo(order.status).label}), không cần xác nhận nữa.`);
  }, [confirmOpen, submitting, order, message]);

  // Cùng ý quyết định 102 cho hộp huỷ / đánh dấu đã hoàn: dữ liệu mới cho thấy hết điều kiện (đơn đã giao, đã huỷ ở nơi khác, khoản
  // đã hoàn) → đóng hộp và nói rõ. Không chạy khi đang gửi.
  useEffect(() => {
    if (submitting || !order) return;
    if (cancelOpen && !cancelTarget(order)) {
      setCancelOpen(false);
      message.info(`Đơn vừa được cập nhật (${orderStatusInfo(order.status).label}), không huỷ được nữa.`);
    }
    if (completeId) {
      const r = order.refunds.find((x) => x.id === completeId);
      if (!r || !refundCompletable(r)) {
        setCompleteId(null);
        message.info("Khoản hoàn này vừa được cập nhật, không cần đánh dấu nữa.");
      }
    }
  }, [cancelOpen, completeId, submitting, order, message]);

  const back =() => navigate(`${LIST_PATH}${from}`);

  /**
   * Xác nhận thủ công (quyết định 84): đúng 1 request; thành công → đóng hộp, thông báo, GET lại (KHÔNG vẽ từ phản hồi);
   * 409/404 → câu tiếng Việt, GET lại, đóng hộp; 400, 403, 5xx, mạng → báo và giữ hộp để sửa hoặc thử lại.
   */
  const submitConfirm = async (paymentId: string, input: ConfirmPaymentInput) => {
    if (inFlight.current || !chainId || !branchId) return;
    inFlight.current = true;
    setSubmitting(true);
    try {
      await orderApi.confirmPayment({ chainId, branchId }, paymentId, input);
      setConfirmOpen(false);
      message.success("Đã xác nhận thanh toán thủ công. Đơn chuyển sang Đã thanh toán và xuống pha chế.");
      await load(true);
    } catch (err) {
      showApiError(message.error, err, "Không xác nhận được thanh toán. Thử lại sau.");
      if (confirmErrorInfo(err).refresh) {
        setConfirmOpen(false);
        await load(true);
      }
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  /**
   * Huỷ đơn đã trả (BM-06): đúng 1 request; thành công → đóng hộp, thông báo, GET lại (KHÔNG vẽ từ phản hồi); 409/404 → câu tiếng Việt qua
   * `showApiError`, GET lại, đóng hộp; 400/403/5xx/mạng → báo và giữ hộp để sửa hoặc thử lại.
   */
  const submitCancel = async (input: CancelPaidInput) => {
    if (inFlight.current || !chainId || !branchId) return;
    inFlight.current = true;
    setSubmitting(true);
    try {
      await orderApi.cancelPaidOrder({ chainId, branchId }, orderId, input);
      setCancelOpen(false);
      message.success(
        input.refundMethod === "CASH"
          ? "Đã huỷ đơn và ghi hoàn tiền mặt. Hãy trả tiền lại cho khách."
          : "Đã huỷ đơn và ghi khoản chờ hoàn tiền. Sau khi chuyển khoản, bấm “Đánh dấu đã hoàn”.",
      );
      await load(true);
    } catch (err) {
      showApiError(message.error, err, "Không huỷ được đơn. Thử lại sau.");
      if (paidActionErrorInfo(err).refresh) {
        setCancelOpen(false);
        await load(true);
      }
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  const submitComplete = async (refundId: string, input: CompleteRefundInput) => {
    if (inFlight.current || !chainId || !branchId) return;
    inFlight.current = true;
    setSubmitting(true);
    try {
      await orderApi.completeRefund({ chainId, branchId }, refundId, input);
      setCompleteId(null);
      message.success("Đã đánh dấu khoản hoàn là đã hoàn tiền.");
      await load(true);
    } catch (err) {
      showApiError(message.error, err, "Không đánh dấu được khoản hoàn. Thử lại sau.");
      if (paidActionErrorInfo(err).refresh) {
        setCompleteId(null);
        await load(true);
      }
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

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
  const confirmable = confirmableTransfer(order);
  const mismatch = order.payments.find((p) => p.status === "AMOUNT_MISMATCH");
  const target = cancelTarget(order);
  const pendingTotal = pendingRefundTotal(order.refunds);
  const completing = completeId ? (order.refunds.find((r) => r.id === completeId) ?? null) : null;

  const refundColumns: ColumnsType<OrderRefundRecord> = [
    { title: "Số tiền", dataIndex: "amount", align: "right", width: 130, render: (v: number) => <b>{formatVnd(v)}</b> },
    {
      title: "Trạng thái",
      key: "status",
      width: 150,
      render: (_: unknown, r) => {
        const info = refundStatusInfo(r.status);
        return <Chip tone={info.tone}>{info.label}</Chip>;
      },
    },
    { title: "Cách hoàn", dataIndex: "method", width: 150, render: (v: string) => refundMethodInfo(v).label },
    {
      title: "Chi tiết",
      key: "detail",
      render: (_: unknown, r) => (
        <div data-testid="order-refund-detail" style={{ fontSize: 13, lineHeight: 1.6 }}>
          <div>Nguồn: {refundSourceInfo(r.source).label}</div>
          <div>
            Lý do: {r.reason} · {roleLabel(r.requestedByRole)}, {formatDateTime(r.requestedAt)}
          </div>
          {r.lines.length > 0 && (
            <div>
              Món huỷ: {r.lines.length} dòng{r.lines.some((l) => l.isWastage) ? " (có món đã pha xong, tính hao hụt)" : ""}
            </div>
          )}
          {r.status === "COMPLETED" && (
            <div>
              Đã hoàn bởi {roleLabel(r.completedByRole)}, {formatDateTime(r.completedAt)}
              {r.note ? ` · ${r.note}` : ""}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "",
      key: "action",
      width: 170,
      render: (_: unknown, r) =>
        refundCompletable(r) ? (
          <ActionButton size="small" type="primary" data-testid="refund-complete-open" onClick={() => setCompleteId(r.id)}>
            Đánh dấu đã hoàn
          </ActionButton>
        ) : null,
    },
  ];

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

      {order.status === "REQUIRES_ATTENTION" && !cancelled && (
        <Alert
          data-testid="order-detail-attention"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="Đơn cần xử lý"
          action={
            target?.kind === "mismatch" && (
              <ActionButton danger data-testid="order-cancel-open-attention" onClick={() => setCancelOpen(true)}>
                Huỷ đơn và ghi hoàn tiền
              </ActionButton>
            )
          }
          description={
            mismatch && mismatch.receivedAmount !== null
              ? `Số tiền chuyển khoản nhận được (${formatVnd(mismatch.receivedAmount)}) khác tổng đơn (${formatVnd(mismatch.amount)}). Chỉ xác nhận khi đã kiểm tra tiền đã vào tài khoản của quán.`
              : "Khoản chuyển khoản lệch số tiền so với tổng đơn. Chỉ xác nhận khi đã kiểm tra tiền đã vào tài khoản của quán."
          }
        />
      )}

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

      <Card
        title="Lịch sử thanh toán"
        style={{ borderRadius: 14 }}
        styles={{ body: { padding: 0 } }}
        extra={
          (confirmable || target) && (
            <Space>
              {target && (
                <ActionButton danger data-testid="order-cancel-open" onClick={() => setCancelOpen(true)}>
                  Huỷ đơn và ghi hoàn tiền
                </ActionButton>
              )}
              {confirmable && (
                <ActionButton type="primary" data-testid="order-confirm-open" onClick={() => setConfirmOpen(true)}>
                  Xác nhận thủ công
                </ActionButton>
              )}
            </Space>
          )
        }
      >
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

      {order.refunds.length > 0 && (
        <Card
          title="Khoản phải hoàn"
          data-testid="order-refunds"
          style={{ borderRadius: 14, marginTop: 16 }}
          styles={{ body: { padding: 0 } }}
          extra={
            pendingTotal > 0 && (
              <span data-testid="order-refund-pending" style={{ color: palette.warning.text, fontWeight: 600 }}>
                Còn chờ hoàn {formatVnd(pendingTotal)}
              </span>
            )
          }
        >
          <Table<OrderRefundRecord>
            data-testid="order-refunds-table"
            rowKey="id"
            size="middle"
            columns={refundColumns}
            dataSource={order.refunds}
            pagination={false}
            scroll={{ x: 760 }}
          />
        </Card>
      )}

      {target && (
        <CancelPaidModal
          open={cancelOpen}
          order={order}
          target={target}
          submitting={submitting}
          onCancel={() => setCancelOpen(false)}
          onSubmit={(input) => void submitCancel(input)}
        />
      )}

      {completing && (
        <CompleteRefundModal
          open
          order={order}
          refund={completing}
          submitting={submitting}
          onCancel={() => setCompleteId(null)}
          onSubmit={(input) => void submitComplete(completing.id, input)}
        />
      )}

      {confirmable && (
        <ConfirmTransferModal
          open={confirmOpen}
          order={order}
          payment={confirmable}
          submitting={submitting}
          onCancel={() => setConfirmOpen(false)}
          onSubmit={(input) => void submitConfirm(confirmable.id, input)}
        />
      )}
    </div>
  );
}
