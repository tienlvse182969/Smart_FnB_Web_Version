import { useState } from "react";
import { Alert, Button, Card, DatePicker, Select, Skeleton, Table } from "antd";
import { Info } from "lucide-react";
import dayjs from "dayjs";
import { SectionTitle } from "../../components/bits";
import { useAppStore } from "../../store";
import {
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  type ApiPayment,
  type ApiPaymentStatus,
} from "../../services/paymentsApi";
import { formatDateTime, formatVnd, parseAmount, presetRange } from "../../services/reportFormat";
import { PaymentStatusTag } from "./Payment";

const ALL = "__all__";

/** Lịch sử giao dịch của chi nhánh — dữ liệu thật từ `/branches/{id}/payments`. */
export default function PaymentHistory() {
  const payments = useAppStore((s) => s.branchPayments);
  const total = useAppStore((s) => s.paymentsTotal);
  const status = useAppStore((s) => s.paymentsStatus);
  const error = useAppStore((s) => s.paymentsError);
  const loadPayments = useAppStore((s) => s.loadPayments);

  const [range, setRange] = useState<[string, string] | null>(null);
  const [statusFilter, setStatusFilter] = useState<ApiPaymentStatus | typeof ALL>(ALL);

  const apply = (next: { range?: [string, string] | null; status?: ApiPaymentStatus | typeof ALL }) => {
    const nextRange = next.range !== undefined ? next.range : range;
    const nextStatus = next.status !== undefined ? next.status : statusFilter;
    if (next.range !== undefined) setRange(next.range);
    if (next.status !== undefined) setStatusFilter(next.status);
    loadPayments({
      from: nextRange?.[0],
      to: nextRange?.[1],
      status: nextStatus === ALL ? undefined : nextStatus,
    });
  };

  const sum = payments.reduce((acc, p) => acc + (p.status === "SUCCESS" ? parseAmount(p.amount) : 0), 0);

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title="Lịch sử giao dịch"
        sub={`${total} giao dịch · tổng đã thu ${formatVnd(sum)}`}
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 14 }}>
        <DatePicker.RangePicker
          format="DD/MM/YYYY"
          value={range ? [dayjs(range[0]), dayjs(range[1])] : null}
          onChange={(values) =>
            apply({
              range:
                values?.[0] && values?.[1]
                  ? [values[0].format("YYYY-MM-DD"), values[1].format("YYYY-MM-DD")]
                  : null,
            })
          }
        />
        <Button size="small" onClick={() => { const r = presetRange("today"); apply({ range: [r.from, r.to] }); }}>
          Hôm nay
        </Button>
        <Button size="small" onClick={() => { const r = presetRange("7d"); apply({ range: [r.from, r.to] }); }}>
          7 ngày
        </Button>
        <Select
          value={statusFilter}
          onChange={(value) => apply({ status: value })}
          style={{ minWidth: 180 }}
          options={[
            { value: ALL, label: "Mọi trạng thái" },
            ...(Object.keys(PAYMENT_STATUS_LABEL) as ApiPaymentStatus[]).map((s) => ({
              value: s,
              label: PAYMENT_STATUS_LABEL[s],
            })),
          ]}
        />
      </div>

      {/* Backend lọc theo createdAt (thời điểm ghi bản ghi), không phải paidAt. */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#fafafa", border: "1px solid var(--ant-color-border)", borderRadius: 12, padding: "10px 14px", marginBottom: 14 }}>
        <Info size={16} color="#71717a" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 12.5, color: "#52525b", lineHeight: 1.5 }}>
          Bộ lọc ngày áp theo <b>thời điểm tạo bản ghi</b>, không phải thời điểm thu tiền. Với dữ
          liệu mẫu, mọi bản ghi được tạo cùng một lúc nên lọc theo ngày sẽ không tách được các ngày
          thu tiền khác nhau.
        </div>
      </div>

      {status === "error" ? (
        <Alert
          type="error"
          showIcon
          message="Không tải được lịch sử giao dịch"
          description={error}
          action={
            <Button size="small" onClick={() => loadPayments()}>
              Thử lại
            </Button>
          }
        />
      ) : status === "loading" || status === "idle" ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : payments.length === 0 ? (
        <div style={{ padding: "36px 0", textAlign: "center", color: "#71717a", fontSize: 13.5 }}>
          Không có giao dịch nào khớp bộ lọc.
        </div>
      ) : (
        <Table<ApiPayment>
          dataSource={payments}
          rowKey="id"
          size="middle"
          pagination={{ pageSize: 20, showSizeChanger: false }}
          columns={[
            {
              title: "Mã giao dịch",
              dataIndex: "paymentCode",
              render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span>,
            },
            {
              title: "Đơn hàng",
              key: "order",
              render: (_, r) => r.order?.orderCode ?? r.tableSession?.sessionCode ?? "—",
            },
            {
              title: "Hình thức",
              dataIndex: "method",
              render: (m: ApiPayment["method"]) => PAYMENT_METHOD_LABEL[m],
            },
            {
              title: "Người xử lý",
              key: "by",
              render: (_, r) => (r.processedBy ? `${r.processedBy.firstName} ${r.processedBy.lastName}` : "—"),
            },
            {
              title: "Thu lúc",
              dataIndex: "paidAt",
              render: (v: string | null) => formatDateTime(v),
            },
            {
              title: "Số tiền",
              dataIndex: "amount",
              align: "right",
              render: (v: string) => formatVnd(v),
            },
            {
              title: "Trạng thái",
              dataIndex: "status",
              render: (s: ApiPayment["status"]) => <PaymentStatusTag status={s} />,
            },
          ]}
        />
      )}
    </Card>
  );
}
