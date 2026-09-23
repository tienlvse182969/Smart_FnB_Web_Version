import { useState } from "react";
import { Alert, App, Button, Card, Segmented, Skeleton, Table, Tag } from "antd";
import { CheckCircle2, Info } from "lucide-react";
import { SectionTitle, EmptyState } from "../../components/bits";
import { useAppStore } from "../../store";
import { FEATURE_FLAGS } from "../../config";
import {
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  type ApiPayment,
} from "../../services/paymentsApi";
import { formatDateTime, formatVnd } from "../../services/reportFormat";

/**
 * Thanh toán (mục 4.5.A, BR-13→BR-17).
 *
 * Phần xác nhận thu tiền chạy trên API thật. Phần "mở khoản thu cho phiên bàn"
 * chưa nối được: backend có `POST /table-sessions/{id}/payments` nhưng không có
 * endpoint nào cho Quản lý chi nhánh liệt kê phiên bàn đang mở, nên UI không
 * lấy được `tableSessionId` để gọi.
 */
export default function Payment() {
  const [tab, setTab] = useState<string>("counter");

  const options = [
    { label: "Thu ngân tại quầy", value: "counter" },
    ...(FEATURE_FLAGS.manualReconciliation
      ? [{ label: "Đối soát tay (GĐ2)", value: "reconcile" }]
      : []),
  ];

  return (
    <>
      <SectionTitle
        title="Thanh toán"
        sub="Chỉ Branch Manager xác nhận thanh toán — waiter chỉ mang QR hoặc thu tiền hộ (BR-13)"
        extra={<Segmented value={tab} onChange={(v) => setTab(v as string)} options={options} />}
      />

      {tab === "counter" ? <Counter /> : <EmptyState title="Đối soát tay — giai đoạn 2" />}
    </>
  );
}

function Counter() {
  const { message } = App.useApp();
  const payments = useAppStore((s) => s.branchPayments);
  const status = useAppStore((s) => s.paymentsStatus);
  const error = useAppStore((s) => s.paymentsError);
  const loadPayments = useAppStore((s) => s.loadPayments);
  const confirmBranchPayment = useAppStore((s) => s.confirmBranchPayment);
  const [confirming, setConfirming] = useState<string | null>(null);

  const pending = payments.filter((p) => p.status === "PENDING");

  const confirm = async (payment: ApiPayment) => {
    setConfirming(payment.id);
    try {
      await confirmBranchPayment(payment.id);
      message.success(`Đã xác nhận ${payment.paymentCode}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Không xác nhận được giao dịch");
    } finally {
      setConfirming(null);
    }
  };

  if (status === "error") {
    return (
      <Alert
        type="error"
        showIcon
        message="Không tải được giao dịch"
        description={error}
        action={
          <Button size="small" onClick={() => loadPayments()}>
            Thử lại
          </Button>
        }
      />
    );
  }

  return (
    <>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#fafafa", border: "1px solid var(--ant-color-border)", borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
        <Info size={17} color="#71717a" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12.5, color: "#52525b", lineHeight: 1.5 }}>
          <b>Mở khoản thu mới cho một bàn chưa dùng được.</b> Hệ thống chưa cho Quản lý chi nhánh
          xem danh sách phiên bàn đang mở, nên chưa chọn được bàn để tạo khoản thu. Bên dưới là các
          khoản thu <b>đang chờ xác nhận</b> do Waiter hoặc thu ngân tạo — xác nhận tại đây.
        </div>
      </div>

      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
          Chờ xác nhận ({pending.length})
        </div>

        {status === "loading" || status === "idle" ? (
          <Skeleton active paragraph={{ rows: 3 }} />
        ) : pending.length === 0 ? (
          <div style={{ fontSize: 13, color: "#a1a1aa", padding: "28px 0", textAlign: "center" }}>
            Không có khoản thu nào đang chờ xác nhận.
          </div>
        ) : (
          <Table<ApiPayment>
            dataSource={pending}
            rowKey="id"
            pagination={false}
            size="middle"
            columns={[
              {
                title: "Mã giao dịch",
                dataIndex: "paymentCode",
                render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span>,
              },
              {
                title: "Hình thức",
                dataIndex: "method",
                render: (m: ApiPayment["method"]) => PAYMENT_METHOD_LABEL[m],
              },
              {
                title: "Tạo lúc",
                dataIndex: "createdAt",
                render: (v: string) => formatDateTime(v),
              },
              {
                title: "Số tiền",
                dataIndex: "amount",
                align: "right",
                render: (v: string) => <span style={{ fontWeight: 600 }}>{formatVnd(v)}</span>,
              },
              {
                title: "",
                key: "action",
                align: "right",
                render: (_, row) => (
                  <Button
                    type="primary"
                    size="small"
                    icon={<CheckCircle2 size={15} />}
                    loading={confirming === row.id}
                    onClick={() => confirm(row)}
                  >
                    Xác nhận
                  </Button>
                ),
              },
            ]}
          />
        )}
      </Card>
    </>
  );
}

export const PAYMENT_STATUS_TAG: Record<ApiPayment["status"], string> = {
  PENDING: "gold",
  SUCCESS: "green",
  FAILED: "red",
  REFUNDED: "default",
  PARTIALLY_REFUNDED: "default",
};

export function PaymentStatusTag({ status }: { status: ApiPayment["status"] }) {
  return <Tag color={PAYMENT_STATUS_TAG[status]}>{PAYMENT_STATUS_LABEL[status]}</Tag>;
}
