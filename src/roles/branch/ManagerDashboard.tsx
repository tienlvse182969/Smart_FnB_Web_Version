import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Card, Col, DatePicker, Row, Segmented, Select, Skeleton, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { Banknote, Clock, ReceiptText, RefreshCw, Wallet } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { describeApiError, managerReportApi } from "../../api";
import { paymentMethodInfo } from "../../api/modules/order/codes";
import { SectionTitle, StatCard } from "../../components/bits";
import { RANGE_PRESETS, describeRange, formatCount, formatDateTime, formatVnd, formatVndCompact, type RangePreset } from "../../lib/reportFormat";
import { useAppStore } from "../../store";
import { palette } from "../../theme";
import type { ManagerReport, ManagerReportCancelledOrder, ManagerReportItem, ManagerReportPayment, ManagerReportTopping } from "../../types";
import {
  GRANULARITY_OPTIONS,
  bucketLabel,
  formatPrepTime,
  parseReportFilters,
  presetOf,
  reportFiltersToSearch,
  toReportQuery,
  withPreset,
  type ReportFilters,
  type ReportPreset,
} from "./reportFilters";

const DAY = "YYYY-MM-DD";
const EMPTY_TEXT = "Chưa có đơn trong khoảng thời gian này";

function ReportCard({ title, sub, testId, children, empty }: { title: string; sub?: string; testId: string; children: React.ReactNode; empty?: string }) {
  return (
    <Card data-testid={testId} style={{ borderRadius: 14, height: "100%" }} styles={{ body: { padding: 20 } }}>
      <SectionTitle title={title} sub={sub} />
      {empty ? <div style={{ padding: "28px 0", textAlign: "center", color: palette.textMuted, fontSize: 13.5 }}>{empty}</div> : children}
    </Card>
  );
}

/** Cột đứng đơn giản (cùng kiểu báo cáo của Owner): chiều cao theo `value / max`. */
function Bars({ rows, testId, tooltip, valueLabel }: { rows: { key: string; label: string; value: number }[]; testId: string; tooltip: (row: { label: string; value: number }) => string; valueLabel: (value: number) => string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div data-testid={testId} style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 200, marginTop: 12, overflowX: "auto" }}>
      {rows.map((row) => (
        <div key={row.key} data-key={row.key} data-value={row.value} style={{ flex: "1 0 28px", textAlign: "center", minWidth: 28 }}>
          <div style={{ fontSize: 10.5, color: palette.textMuted, marginBottom: 4, whiteSpace: "nowrap" }}>{row.value > 0 ? valueLabel(row.value) : ""}</div>
          <div style={{ height: 130, display: "flex", alignItems: "flex-end" }}>
            <div title={tooltip(row)} style={{ width: "100%", height: `${Math.max((row.value / max) * 100, row.value > 0 ? 3 : 0)}%`, background: palette.brandPrimary, borderRadius: "4px 4px 0 0" }} />
          </div>
          <div style={{ fontSize: 10.5, color: palette.textMuted, marginTop: 6, whiteSpace: "nowrap" }}>{row.label}</div>
        </div>
      ))}
    </div>
  );
}

const paymentColumns: ColumnsType<ManagerReportPayment> = [
  { title: "Hình thức", dataIndex: "method", render: (v: string) => paymentMethodInfo(v).label },
  { title: "Số khoản", dataIndex: "paymentCount", align: "right", render: (v: number) => formatCount(v) },
  { title: "Ghi nhận", dataIndex: "settledAmount", align: "right", render: (v: number) => formatVnd(v) },
  { title: "Thực nhận", dataIndex: "receivedAmount", align: "right", render: (v: number) => formatVnd(v) },
];

const itemColumns: ColumnsType<ManagerReportItem> = [
  { title: "Món", dataIndex: "name" },
  { title: "Số lượng", dataIndex: "quantity", align: "right", width: 100, render: (v: number) => formatCount(v) },
  { title: "Doanh thu", dataIndex: "lineRevenue", align: "right", width: 130, render: (v: number) => formatVnd(v) },
];

const toppingColumns: ColumnsType<ManagerReportTopping> = [
  { title: "Topping", dataIndex: "name" },
  { title: "Số lượng", dataIndex: "quantity", align: "right", width: 100, render: (v: number) => formatCount(v) },
  { title: "Doanh thu thêm", dataIndex: "additionalRevenue", align: "right", width: 140, render: (v: number) => formatVnd(v) },
];

const cancelColumns: ColumnsType<ManagerReportCancelledOrder> = [
  { title: "Số gọi", dataIndex: "callNumber", width: 90, render: (v: number | null) => v ?? "—" },
  {
    title: "Mã đơn",
    dataIndex: "orderCode",
    render: (v: string, row) => (
      <Link to={`/manager/orders/${row.id}`} data-testid="report-cancel-link" style={{ fontFamily: "monospace", fontSize: 12.5 }}>
        {v}
      </Link>
    ),
  },
  { title: "Thời điểm huỷ", dataIndex: "cancelledAt", width: 150, render: (v: string | null) => formatDateTime(v) },
  { title: "Tổng tiền", dataIndex: "totalAmount", align: "right", width: 120, render: (v: number) => formatVnd(v) },
  { title: "Lý do", dataIndex: "reason", render: (v: string | null) => v ?? "—" },
];

function isEmptyReport(r: ManagerReport): boolean {
  return r.summary.orderCount === 0 && r.cancellations.total === 0 && r.revenue.every((b) => b.revenue === 0 && b.orderCount === 0) && r.ordersByHour.every((h) => h.orderCount === 0);
}

/**
 * BM-03: báo cáo chi nhánh của Branch Manager. Real `GET /manager/reports` (module `managerReport`). Hiện ĐÚNG số BE trả, không tính lại
 * hay lọc lại (quyết định 78); giờ và ngày BE đã cắt theo giờ Việt Nam. Khoảng thời gian nằm trên URL (F5 giữ nguyên). Không tự làm
 * tươi qua socket (quyết định 79): có nút Làm mới. Chưa có mục hoàn tiền (BR-49/50) vì BE chưa có (#43).
 */
export default function ManagerDashboard() {
  const chainId = useAppStore((s) => s.chainId);
  const branchId = useAppStore((s) => s.currentBranchId);
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseReportFilters(params), [params]);
  const preset: ReportPreset = useMemo(() => presetOf(filters), [filters]);
  const query = useMemo(() => toReportQuery(filters), [filters]);

  const [data, setData] = useState<ManagerReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!chainId || !branchId) return;
    const mine = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const report = await managerReportApi.getReport({ chainId, branchId }, query);
      if (mine !== seq.current) return;
      setData(report);
    } catch (err) {
      if (mine !== seq.current) return;
      setData(null);
      setError(describeApiError(err));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [chainId, branchId, query]);

  useEffect(() => {
    void load();
    return () => {
      seq.current++;
    };
  }, [load, nonce]);

  const apply = (next: ReportFilters) => setParams(reportFiltersToSearch(next), { replace: false });

  if (!branchId) return <Alert type="warning" showIcon message="Tài khoản chưa được gán chi nhánh nào" />;

  const ordersFilterSearch = new URLSearchParams({ status: "CANCELLED", from: filters.from, to: filters.to }).toString();
  const empty = data ? isEmptyReport(data) : false;

  return (
    <div data-testid="manager-report">
      <SectionTitle
        title="Báo cáo chi nhánh"
        sub={`${data?.branchName ?? "Chi nhánh"} · ${describeRange({ from: filters.from, to: filters.to })} · giờ Việt Nam`}
        extra={
          <Button icon={<RefreshCw size={15} />} onClick={() => setNonce((n) => n + 1)} loading={loading && !!data} data-testid="report-refresh">
            Làm mới
          </Button>
        }
      />

      <Card style={{ borderRadius: 14, marginBottom: 16 }} styles={{ body: { padding: 16 } }} data-testid="report-filters">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <Segmented
            data-testid="report-preset"
            value={preset}
            onChange={(value) => {
              if (value !== "custom") apply(withPreset(filters, value as RangePreset));
            }}
            options={[...RANGE_PRESETS.map((p) => ({ label: p.label, value: p.key as ReportPreset })), { label: "Tuỳ chọn", value: "custom" as ReportPreset }]}
          />
          <DatePicker.RangePicker
            data-testid="report-range"
            allowClear={false}
            format="DD/MM/YYYY"
            value={[dayjs(filters.from, DAY), dayjs(filters.to, DAY)]}
            onChange={(values) => {
              if (values?.[0] && values?.[1]) apply({ ...filters, from: values[0].format(DAY), to: values[1].format(DAY) });
            }}
          />
          <Select
            data-testid="report-granularity"
            style={{ width: 140 }}
            value={filters.granularity}
            options={GRANULARITY_OPTIONS}
            onChange={(granularity) => apply({ ...filters, granularity })}
          />
        </div>
      </Card>

      {error && (
        <Alert
          data-testid="report-error"
          type="error"
          showIcon
          message="Không tải được báo cáo chi nhánh"
          description={error}
          action={
            <Button size="small" onClick={() => setNonce((n) => n + 1)} data-testid="report-retry">
              Thử lại
            </Button>
          }
        />
      )}

      {!error && !data && <Skeleton active paragraph={{ rows: 8 }} />}

      {!error && data && (
        <div style={{ opacity: loading ? 0.6 : 1 }} data-loading={loading}>
          <Row gutter={[16, 16]}>
            <Col xs={12} lg={6}>
              <div data-testid="report-kpi-revenue" style={{ height: "100%" }}>
                <StatCard label="Doanh thu" value={formatVnd(data.summary.revenue)} icon={<Banknote size={18} />} hint="đơn đã thanh toán, chưa huỷ" />
              </div>
            </Col>
            <Col xs={12} lg={6}>
              <div data-testid="report-kpi-orders" style={{ height: "100%" }}>
                <StatCard label="Số đơn" value={formatCount(data.summary.orderCount)} icon={<ReceiptText size={18} />} hint="đã thanh toán" />
              </div>
            </Col>
            <Col xs={12} lg={6}>
              <div data-testid="report-kpi-avg" style={{ height: "100%" }}>
                <StatCard label="Giá trị đơn trung bình" value={formatVnd(data.summary.averageOrderValue)} icon={<Wallet size={18} />} />
              </div>
            </Col>
            <Col xs={12} lg={6}>
              <div data-testid="report-kpi-prep" style={{ height: "100%" }}>
                <StatCard
                  label="Thời gian pha trung bình"
                  value={<span style={{ fontSize: 22 }}>{formatPrepTime(data.preparation.averageSeconds)}</span>}
                  icon={<Clock size={18} />}
                  hint={data.preparation.averageSeconds === null ? undefined : `${formatCount(data.preparation.completedUnits)} suất đã xong · phút:giây`}
                />
              </div>
            </Col>
          </Row>

          {empty ? (
            <Card data-testid="report-empty" style={{ borderRadius: 14, marginTop: 16 }} styles={{ body: { padding: 20 } }}>
              <div style={{ padding: "36px 0", textAlign: "center", color: palette.textMuted, fontSize: 14 }}>{EMPTY_TEXT}</div>
            </Card>
          ) : (
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col xs={24}>
                <ReportCard title="Doanh thu theo thời gian" sub={GRANULARITY_OPTIONS.find((o) => o.value === data.range.granularity)?.label} testId="report-revenue">
                  <Bars
                    testId="report-revenue-bars"
                    rows={data.revenue.map((b) => ({ key: b.bucket, label: bucketLabel(b.bucket, data.range.granularity), value: b.revenue }))}
                    tooltip={(row) => `${row.label} · ${formatVnd(row.value)}`}
                    valueLabel={formatVndCompact}
                  />
                </ReportCard>
              </Col>
              <Col xs={24} lg={12}>
                <ReportCard title="Theo hình thức thanh toán" testId="report-payments" empty={data.payments.length === 0 ? "Chưa có khoản thanh toán trong kỳ." : undefined}>
                  <Table<ManagerReportPayment> rowKey="method" size="small" columns={paymentColumns} dataSource={data.payments} pagination={false} />
                </ReportCard>
              </Col>
              <Col xs={24} lg={12}>
                <ReportCard title="Số đơn theo giờ" sub="Đơn đặt trong kỳ, giờ Việt Nam (0–23)" testId="report-hours">
                  <Bars
                    testId="report-hours-bars"
                    rows={data.ordersByHour.map((h) => ({ key: String(h.hour), label: `${h.hour}h`, value: h.orderCount }))}
                    tooltip={(row) => `${row.label} · ${row.value} đơn`}
                    valueLabel={(v) => String(v)}
                  />
                </ReportCard>
              </Col>
              <Col xs={24} lg={12}>
                <ReportCard title="Món bán chạy" sub={`Top ${query.limit}`} testId="report-top-items" empty={data.topItems.length === 0 ? "Chưa có món nào bán trong kỳ." : undefined}>
                  <Table<ManagerReportItem> rowKey="menuItemId" size="small" columns={itemColumns} dataSource={data.topItems} pagination={false} />
                </ReportCard>
              </Col>
              <Col xs={24} lg={12}>
                <ReportCard title="Topping bán chạy" sub={`Top ${query.limit}`} testId="report-top-toppings" empty={data.topToppings.length === 0 ? "Chưa có topping nào bán trong kỳ." : undefined}>
                  <Table<ManagerReportTopping> rowKey="optionId" size="small" columns={toppingColumns} dataSource={data.topToppings} pagination={false} />
                </ReportCard>
              </Col>
              <Col xs={24}>
                <ReportCard
                  title="Đơn huỷ"
                  sub={`${formatCount(data.cancellations.total)} đơn huỷ trong kỳ${data.cancellations.total > data.cancellations.items.length ? ` · hiện ${data.cancellations.items.length} đơn gần nhất` : ""}`}
                  testId="report-cancellations"
                  empty={data.cancellations.items.length === 0 ? "Không có đơn huỷ trong kỳ." : undefined}
                >
                  <Table<ManagerReportCancelledOrder> rowKey="id" size="small" columns={cancelColumns} dataSource={data.cancellations.items} pagination={false} scroll={{ x: 640 }} />
                  {data.cancellations.total > data.cancellations.items.length && (
                    <div style={{ marginTop: 10, fontSize: 13 }}>
                      <Link to={`/manager/orders?${ordersFilterSearch}`} data-testid="report-cancel-all">
                        Xem tất cả đơn huỷ ở Tra cứu đơn
                      </Link>
                    </div>
                  )}
                </ReportCard>
              </Col>
            </Row>
          )}
        </div>
      )}
    </div>
  );
}
