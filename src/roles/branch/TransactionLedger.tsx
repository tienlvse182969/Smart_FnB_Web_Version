import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Card, DatePicker, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { RefreshCw } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { describeApiError, ledgerApi } from "../../api";
import { paymentMethodInfo } from "../../api/modules/order/codes";
import { SectionTitle } from "../../components/bits";
import { formatDateTime, formatVnd, todayInVn } from "../../lib/reportFormat";
import { useAppStore } from "../../store";
import { palette } from "../../theme";
import type { Ledger, LedgerEntry, LedgerSummary } from "../../types";
import { Chip } from "../admin/adminUi";

const DAY = "YYYY-MM-DD";

const SOURCE_LABEL: Record<string, string> = {
  CASH_PAYMENT: "Thu tiền mặt khi chốt đơn",
  PAYOS_WEBHOOK: "QR — PayOS xác nhận",
  PAYOS_RECHECK: "QR — Kiểm tra lại",
  MANUAL_CONFIRMATION: "QR — Quản lý xác nhận thủ công",
  REFUND: "Hoàn tiền",
};

export const ledgerSourceLabel = (code: string) => SOURCE_LABEL[code] ?? (code ? `Khác (${code})` : "—");

/** Số tiền có dấu: thu `+`, chi `−`. Số nguyên đồng. */
export const signedAmountText = (e: Pick<LedgerEntry, "direction" | "amount">) => `${e.direction === "OUTFLOW" ? "−" : "+"}${formatVnd(e.amount)}`;

const columns = (orderLink?: (orderId: string) => string): ColumnsType<LedgerEntry> => [
  { title: "Thời điểm", dataIndex: "occurredAt", width: 150, render: (v: string) => formatDateTime(v) },
  {
    title: "Loại",
    dataIndex: "direction",
    width: 80,
    render: (v: LedgerEntry["direction"]) => <Chip tone={v === "OUTFLOW" ? "error" : "success"}>{v === "OUTFLOW" ? "Chi" : "Thu"}</Chip>,
  },
  {
    title: "Hình thức",
    dataIndex: "method",
    width: 150,
    render: (v: string | null) => (v ? paymentMethodInfo(v).label : "—"),
  },
  { title: "Nguồn", dataIndex: "sourceType", render: (v: string) => ledgerSourceLabel(v) },
  {
    title: "Số tiền",
    dataIndex: "amount",
    align: "right",
    width: 140,
    render: (_: number, e) => <span style={{ fontWeight: 600, color: e.direction === "OUTFLOW" ? palette.error.text : palette.success.text }}>{signedAmountText(e)}</span>,
  },
  {
    title: "Mã đơn",
    dataIndex: "orderId",
    width: 150,
    render: (id: string | null, e) => {
      if (!id) return "—";
      const label = e.orderCode ?? `…${id.slice(-6)}`;
      return orderLink ? <Link to={orderLink(id)}>{label}</Link> : <span style={{ fontFamily: "monospace", fontSize: 12.5 }}>{label}</span>;
    },
  },
  // Các cột dưới CHỜ BE (L6): hiện "—" tới khi BE trả.
  { title: "Số gọi", dataIndex: "callNumber", width: 80, render: (v?: number | null) => v ?? "—" },
  { title: "Người thao tác", dataIndex: "actorName", width: 150, render: (v?: string | null) => v ?? "—" },
  { title: "Ghi chú", dataIndex: "note", render: (v?: string | null) => v ?? "—" },
];

function SummaryRow({ summary }: { summary: LedgerSummary }) {
  const tiles: { key: string; label: string; value: number }[] = [
    { key: "in", label: "Tổng thu", value: summary.inflow },
    { key: "out", label: "Tổng chi", value: summary.outflow },
    { key: "net", label: "Thuần (thu − chi)", value: summary.net },
  ];
  // Khi BE trả đủ 5 tổng (32.5) thì hiện thêm; Web không tự cộng.
  if (summary.cashIn !== undefined) tiles.push({ key: "cashIn", label: "Thu tiền mặt", value: summary.cashIn });
  if (summary.qrIn !== undefined) tiles.push({ key: "qrIn", label: "Thu QR", value: summary.qrIn });
  if (summary.cashOut !== undefined) tiles.push({ key: "cashOut", label: "Chi tiền mặt", value: summary.cashOut });
  if (summary.cashNet !== undefined) tiles.push({ key: "cashNet", label: "Tiền mặt thuần (phải có trong két)", value: summary.cashNet });
  return (
    <div data-testid="ledger-summary" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
      {tiles.map((t) => (
        <Card key={t.key} styles={{ body: { padding: 14 } }} style={{ borderRadius: 14 }}>
          <div style={{ fontSize: 12.5, color: palette.textMuted }}>{t.label}</div>
          <div data-testid={`ledger-total-${t.key}`} style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>
            {formatVnd(t.value)}
          </div>
        </Card>
      ))}
    </div>
  );
}

/**
 * Sổ giao dịch của MỘT chi nhánh (BM-07, mục 32; BR-93, BR-94). Chỉ đọc. Hiện đúng số BE trả: 3 tổng do BE tính, KHÔNG lọc hay cộng ở
 * client (BE chỉ trả 500 dòng mới nhất). Lọc theo loại, hình thức, thu ngân, người thao tác, ghi chú và 5 tổng chờ BE (`_audit/05` L6).
 */
export function LedgerPanel({ branchId, orderLink, initialRange }: { branchId: string; orderLink?: (orderId: string) => string; initialRange?: [string, string] }) {
  const [range, setRange] = useState<[string, string]>(() => initialRange ?? [todayInVn(), todayInVn()]);
  const [data, setData] = useState<Ledger | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const seq = useRef(0);

  const load = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const ledger = await ledgerApi.getBranchLedger(branchId, { from: range[0], to: range[1] });
      if (mine === seq.current) setData(ledger);
    } catch (err) {
      if (mine !== seq.current) return;
      setData(null);
      setError(describeApiError(err));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [branchId, range]);

  useEffect(() => {
    void load();
    return () => {
      seq.current++;
    };
  }, [load, nonce]);

  return (
    <div data-testid="ledger-panel">
      <Card style={{ borderRadius: 14, marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <DatePicker.RangePicker
            data-testid="ledger-range"
            allowClear={false}
            format="DD/MM/YYYY"
            value={[dayjs(range[0], DAY), dayjs(range[1], DAY)]}
            disabledDate={(d) => d.isAfter(dayjs(), "day")}
            onChange={(values) => {
              if (values?.[0] && values?.[1]) setRange([values[0].format(DAY), values[1].format(DAY)]);
            }}
            aria-label="Khoảng ngày"
          />
          <Button icon={<RefreshCw size={14} />} loading={loading} onClick={() => setNonce((n) => n + 1)} data-testid="ledger-refresh">
            Làm mới
          </Button>
        </div>
      </Card>

      {error && (
        <Alert
          data-testid="ledger-error"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message={error}
          action={
            <Button size="small" onClick={() => setNonce((n) => n + 1)}>
              Thử lại
            </Button>
          }
        />
      )}

      {data && <SummaryRow summary={data.summary} />}
      {data?.mayBeTruncated && (
        <Alert
          data-testid="ledger-truncated"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Chỉ hiện 500 dòng mới nhất"
          description="Khoảng ngày này có thể còn dòng cũ hơn. Các tổng ở trên do hệ thống tính trên toàn bộ khoảng ngày. Chọn khoảng ngày ngắn hơn để xem hết."
        />
      )}

      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 16 } }}>
        <Table<LedgerEntry>
          size="small"
          rowKey="id"
          loading={loading}
          dataSource={data?.items ?? []}
          columns={columns(orderLink)}
          scroll={{ x: 960 }}
          pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: [20, 50, 100], hideOnSinglePage: true }}
          locale={{ emptyText: <span style={{ color: palette.textMuted }}>{error ? "Không tải được sổ giao dịch" : "Không có giao dịch trong khoảng ngày này"}</span> }}
        />
      </Card>
    </div>
  );
}

/** BM-07: màn Sổ giao dịch của Store Manager (chi nhánh của mình). */
export default function TransactionLedger() {
  const branchId = useAppStore((s) => s.currentBranchId);
  const basePath = useLocation().pathname.startsWith("/manager/") ? "/manager" : "/store-manager";
  return (
    <div data-testid="ledger-page">
      <SectionTitle title="Sổ giao dịch" sub="Mọi khoản tiền vào, ra của chi nhánh qua hệ thống — chỉ xem, không sửa hay xoá" />
      {branchId ? (
        <LedgerPanel branchId={branchId} orderLink={(id) => `${basePath}/orders/${id}`} />
      ) : (
        <Alert type="warning" showIcon message="Tài khoản chưa được gán chi nhánh nào" />
      )}
    </div>
  );
}
