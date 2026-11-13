import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Card, DatePicker, Select, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { RefreshCw } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { accountApi, describeApiError, ledgerApi, managerReportApi } from "../../api";
import { LEDGER_PAGE_SIZES } from "../../api/modules/ledger/query";
import { paymentMethodInfo } from "../../api/modules/order/codes";
import { SectionTitle } from "../../components/bits";
import { formatDateTime, formatVnd, todayInVn } from "../../lib/reportFormat";
import { useAppStore } from "../../store";
import { palette } from "../../theme";
import type { Ledger, LedgerDirection, LedgerEntry, LedgerSummary } from "../../types";
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

export interface LedgerFilters {
  range: [string, string];
  direction?: LedgerDirection;
  /** "CASH" hoặc "BANK_TRANSFER" (QR). */
  method?: string;
  cashierId?: string;
  page: number;
  pageSize: number;
}

const hasFilter = (f: LedgerFilters) => !!(f.direction || f.method || f.cashierId);

const columns = (orderLink?: (orderCode: string) => string): ColumnsType<LedgerEntry> => [
  { title: "Thời điểm", dataIndex: "occurredAt", width: 150, render: (v: string) => formatDateTime(v) },
  {
    title: "Loại",
    dataIndex: "direction",
    width: 80,
    render: (v: LedgerEntry["direction"]) => <Chip tone={v === "OUTFLOW" ? "error" : "success"}>{v === "OUTFLOW" ? "Chi" : "Thu"}</Chip>,
  },
  { title: "Hình thức", dataIndex: "method", width: 150, render: (v: string | null) => (v ? paymentMethodInfo(v).label : "—") },
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
    dataIndex: "orderCode",
    width: 150,
    render: (code: string | null) => {
      if (!code) return "—";
      return orderLink ? <Link to={orderLink(code)}>{code}</Link> : <span style={{ fontFamily: "monospace", fontSize: 12.5 }}>{code}</span>;
    },
  },
  { title: "Số gọi", dataIndex: "callNumber", width: 80, render: (v: number | null) => v ?? "—" },
  { title: "Người thao tác", dataIndex: "actorName", width: 150, render: (v: string | null) => v ?? "—" },
  { title: "Ghi chú", dataIndex: "note", render: (v: string | null) => v ?? "—" },
];

export function SummaryRow({ summary }: { summary: LedgerSummary }) {
  const tiles: { key: keyof LedgerSummary; label: string; emphasis?: boolean }[] = [
    { key: "cashCollected", label: "Thu tiền mặt" },
    { key: "qrCollected", label: "Thu QR" },
    { key: "cashRefunded", label: "Chi tiền mặt (hoàn)" },
    { key: "netCash", label: "Tiền mặt thuần (phải có trong két)", emphasis: true },
    { key: "netTotal", label: "Thuần tổng" },
  ];
  return (
    <div data-testid="ledger-summary" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 16 }}>
      {tiles.map((t) => (
        <Card key={t.key} styles={{ body: { padding: 14 } }} style={{ borderRadius: 14, borderColor: t.emphasis ? palette.brandPrimary : undefined }}>
          <div style={{ fontSize: 12.5, color: palette.textMuted }}>{t.label}</div>
          <div data-testid={`ledger-total-${t.key}`} style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>
            {formatVnd(summary[t.key])}
          </div>
        </Card>
      ))}
    </div>
  );
}

type CrossState = { kind: "idle" } | { kind: "ok" } | { kind: "diff"; report: Pick<LedgerSummary, "cashCollected" | "cashRefunded" | "netCash"> } | { kind: "na"; reason: string };

/**
 * Kiểm chéo (BR-94): tiền mặt thu, hoàn, thuần của sổ phải bằng bảng "Tiền mặt theo Thu ngân" của báo cáo cùng khoảng ngày. Chỉ so khi
 * không có bộ lọc. Lệch thì GHI LẠI cho người dùng thấy, không sửa số nào. Tổng báo cáo cộng từ các dòng Thu ngân BE trả.
 */
export function CrossCheck({ range, summary }: { range: [string, string]; summary: LedgerSummary }) {
  const chainId = useAppStore((s) => s.chainId);
  const branchId = useAppStore((s) => s.currentBranchId);
  const [state, setState] = useState<CrossState>({ kind: "idle" });

  useEffect(() => {
    if (!chainId || !branchId) return;
    let cancelled = false;
    setState({ kind: "idle" });
    managerReportApi
      .getReport({ chainId, branchId }, { from: range[0], to: range[1], granularity: "day", limit: 10 })
      .then((report) => {
        if (cancelled) return;
        if (!report.cashDrawer) return setState({ kind: "na", reason: "báo cáo chưa có bảng tiền mặt theo Thu ngân" });
        const sum = report.cashDrawer.reduce(
          (acc, row) => ({ cashCollected: acc.cashCollected + row.cashCollected, cashRefunded: acc.cashRefunded + row.cashRefunded, netCash: acc.netCash + row.netCash }),
          { cashCollected: 0, cashRefunded: 0, netCash: 0 },
        );
        const same = sum.cashCollected === summary.cashCollected && sum.cashRefunded === summary.cashRefunded && sum.netCash === summary.netCash;
        setState(same ? { kind: "ok" } : { kind: "diff", report: sum });
      })
      .catch((err) => !cancelled && setState({ kind: "na", reason: describeApiError(err) }));
    return () => {
      cancelled = true;
    };
  }, [chainId, branchId, range, summary]);

  if (state.kind === "idle") return null;
  if (state.kind === "ok") {
    return (
      <div data-testid="ledger-crosscheck-ok" style={{ marginBottom: 16, fontSize: 12.5, color: palette.success.text }}>
        Khớp báo cáo cùng khoảng ngày (tiền mặt thu, hoàn, thuần).
      </div>
    );
  }
  if (state.kind === "na") {
    return (
      <div data-testid="ledger-crosscheck-na" style={{ marginBottom: 16, fontSize: 12.5, color: palette.textMuted }}>
        Chưa đối chiếu được với báo cáo: {state.reason}.
      </div>
    );
  }
  return (
    <Alert
      data-testid="ledger-crosscheck-diff"
      type="warning"
      showIcon
      style={{ marginBottom: 16 }}
      message="Sổ giao dịch lệch với báo cáo cùng khoảng ngày"
      description={`Sổ: thu ${formatVnd(summary.cashCollected)}, hoàn ${formatVnd(summary.cashRefunded)}, thuần ${formatVnd(summary.netCash)}. Báo cáo: thu ${formatVnd(state.report.cashCollected)}, hoàn ${formatVnd(state.report.cashRefunded)}, thuần ${formatVnd(state.report.netCash)}. Hệ thống không tự sửa số nào; hãy báo cho bộ phận kỹ thuật.`}
    />
  );
}

/**
 * Sổ giao dịch của MỘT chi nhánh (BM-07, mục 32; BR-93, BR-94). Chỉ đọc. Lọc, phân trang và mọi tổng do BE làm; Web chỉ hiện.
 * `cashiers` có thì hiện ô lọc Thu ngân (Store Manager); `crossCheck` đối chiếu với báo cáo chi nhánh (chỉ Store Manager gọi được).
 */
export function LedgerPanel({
  branchId,
  orderLink,
  initialRange,
  cashiers,
  crossCheck = false,
}: {
  branchId: string;
  orderLink?: (orderCode: string) => string;
  initialRange?: [string, string];
  cashiers?: { id: string; name: string }[];
  crossCheck?: boolean;
}) {
  const [filters, setFilters] = useState<LedgerFilters>(() => ({ range: initialRange ?? [todayInVn(), todayInVn()], page: 1, pageSize: 50 }));
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
      const ledger = await ledgerApi.getBranchLedger(branchId, {
        from: filters.range[0],
        to: filters.range[1],
        direction: filters.direction,
        paymentMethod: filters.method,
        cashierId: filters.cashierId,
        page: filters.page,
        pageSize: filters.pageSize,
      });
      if (mine === seq.current) setData(ledger);
    } catch (err) {
      if (mine !== seq.current) return;
      setData(null);
      setError(describeApiError(err));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [branchId, filters]);

  useEffect(() => {
    void load();
    return () => {
      seq.current++;
    };
  }, [load, nonce]);

  const change = (patch: Partial<LedgerFilters>) => setFilters((f) => ({ ...f, ...patch, page: 1 }));
  const summary = data?.summary;
  const tableColumns = useMemo(() => columns(orderLink), [orderLink]);

  return (
    <div data-testid="ledger-panel">
      <Card style={{ borderRadius: 14, marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <DatePicker.RangePicker
            data-testid="ledger-range"
            allowClear={false}
            format="DD/MM/YYYY"
            value={[dayjs(filters.range[0], DAY), dayjs(filters.range[1], DAY)]}
            disabledDate={(d) => d.isAfter(dayjs(), "day")}
            onChange={(values) => {
              if (values?.[0] && values?.[1]) change({ range: [values[0].format(DAY), values[1].format(DAY)] });
            }}
            aria-label="Khoảng ngày"
          />
          <Select
            data-testid="ledger-direction"
            aria-label="Loại"
            allowClear
            placeholder="Loại (Thu, Chi)"
            style={{ minWidth: 150 }}
            value={filters.direction}
            onChange={(v) => change({ direction: v })}
            options={[
              { value: "INFLOW", label: "Thu" },
              { value: "OUTFLOW", label: "Chi" },
            ]}
          />
          <Select
            data-testid="ledger-method"
            aria-label="Hình thức"
            allowClear
            placeholder="Hình thức (Tiền mặt, QR)"
            style={{ minWidth: 190 }}
            value={filters.method}
            onChange={(v) => change({ method: v })}
            options={[
              { value: "CASH", label: "Tiền mặt" },
              { value: "BANK_TRANSFER", label: "QR (chuyển khoản)" },
            ]}
          />
          {cashiers && (
            <Select
              data-testid="ledger-cashier"
              aria-label="Thu ngân"
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Thu ngân"
              style={{ minWidth: 180 }}
              value={filters.cashierId}
              onChange={(v) => change({ cashierId: v })}
              options={cashiers.map((c) => ({ value: c.id, label: c.name }))}
            />
          )}
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

      {summary && <SummaryRow summary={summary} />}
      {summary && hasFilter(filters) && (
        <div data-testid="ledger-filtered-note" style={{ marginBottom: 16, fontSize: 12.5, color: palette.textMuted }}>
          Các tổng ở trên tính theo bộ lọc đang chọn.
        </div>
      )}
      {crossCheck && summary && !hasFilter(filters) && <CrossCheck range={filters.range} summary={summary} />}

      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 16 } }}>
        <Table<LedgerEntry>
          size="small"
          rowKey="id"
          loading={loading}
          dataSource={data?.items ?? []}
          columns={tableColumns}
          scroll={{ x: 960 }}
          onChange={(p) => setFilters((f) => ({ ...f, page: p.current ?? 1, pageSize: p.pageSize ?? f.pageSize }))}
          pagination={{
            current: data?.pagination.page ?? filters.page,
            pageSize: filters.pageSize,
            total: data?.pagination.total ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [...LEDGER_PAGE_SIZES],
            hideOnSinglePage: true,
            showTotal: (total) => `${total} dòng`,
          }}
          locale={{ emptyText: <span style={{ color: palette.textMuted }}>{error ? "Không tải được sổ giao dịch" : "Không có giao dịch trong khoảng ngày này"}</span> }}
        />
      </Card>
    </div>
  );
}

/** BM-07: màn Sổ giao dịch của Store Manager (chi nhánh của mình). */
export default function TransactionLedger() {
  const chainId = useAppStore((s) => s.chainId);
  const branchId = useAppStore((s) => s.currentBranchId);
  const basePath = useLocation().pathname.startsWith("/manager/") ? "/manager" : "/store-manager";
  const [cashiers, setCashiers] = useState<{ id: string; name: string }[] | undefined>();

  useEffect(() => {
    if (!chainId || !branchId) return;
    let cancelled = false;
    accountApi
      .listStaff(chainId, branchId, { role: "CASHIER" })
      .then((page) => !cancelled && setCashiers(page.items.map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}`.trim() || s.employeeCode }))))
      .catch(() => undefined); // không có danh sách thu ngân thì chỉ ẩn ô lọc, sổ vẫn dùng được
    return () => {
      cancelled = true;
    };
  }, [chainId, branchId]);

  const orderLink = useCallback((code: string) => `${basePath}/orders?orderCode=${encodeURIComponent(code)}`, [basePath]);

  return (
    <div data-testid="ledger-page">
      <SectionTitle title="Sổ giao dịch" sub="Mọi khoản tiền vào, ra của chi nhánh qua hệ thống — chỉ xem, không sửa hay xoá" />
      {branchId ? <LedgerPanel branchId={branchId} orderLink={orderLink} cashiers={cashiers} crossCheck /> : <Alert type="warning" showIcon message="Tài khoản chưa được gán chi nhánh nào" />}
    </div>
  );
}
