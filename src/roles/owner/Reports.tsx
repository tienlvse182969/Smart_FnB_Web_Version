import { createContext, useContext, useMemo, useState } from "react";
import { Alert, Button, Card, Col, DatePicker, Row, Segmented, Select, Skeleton, Table } from "antd";
import { Banknote, Hourglass, ReceiptText, Undo2, Wallet } from "lucide-react";
import dayjs from "dayjs";
import { SectionTitle, StatCard } from "../../components/bits";
import { useAppStore } from "../../store";
import type { PaymentMethodRow, ReportGranularity, TopItemRow, TopToppingRow } from "../../types";
import FeatureGate, { FeatureLock } from "../../plan/FeatureGate";
import { usePlan } from "../../plan/usePlan";
import { paymentMethodInfo } from "../../api/modules/order/codes";
import {
  RANGE_PRESETS,
  parseAmount,
  describeRange,
  formatCount,
  formatDayLabel,
  formatVnd,
  formatVndCompact,
  presetRange,
  type DateRange,
  type RangePreset,
} from "../../lib/reportFormat";
import { useReportData, type ReportSections, type SectionState } from "./useReportData";
import { resolveReportBranchIds, summarizeKpi } from "./reportKpi";
import ChainPendingRefunds from "./ChainPendingRefunds";
import { palette } from "../../theme";

const ALL_BRANCHES = "__all__";

/** true = các mục cùng lỗi đã được gộp thành một khối ở đầu trang, mục không lặp lại lỗi. */
const GroupedErrors = createContext(false);

/** Báo cáo doanh thu của Owner — toàn bộ số liệu lấy từ `/reports/*`. Mỗi mục tự nạp và tự xử lý lỗi của mình. */
export default function Reports() {
  const branches = useAppStore((s) => s.apiBranches);
  const [preset, setPreset] = useState<RangePreset | "custom">("7d");
  const [range, setRange] = useState<DateRange>(() => presetRange("7d"));
  const [picked, setPicked] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<ReportGranularity>("day");
  const { hasFeature, requiredTierLabel } = usePlan();
  const canCompare = hasFeature("multiBranchCompare");

  // Gói không có "so sánh đa chi nhánh" (BR-08, 6.11): BE chặn báo cáo gộp ≥ 2 chi nhánh → xem từng chi nhánh, mặc định chi nhánh đầu.
  const branchIds = resolveReportBranchIds({
    selected: picked && picked !== ALL_BRANCHES ? picked : null,
    branchIds: branches.map((b) => b.id),
    canCompare,
  });
  const branchId = picked ?? (canCompare ? ALL_BRANCHES : (branches[0]?.id ?? ALL_BRANCHES));
  const sections = useReportData({ ...range, branchIds, granularity });
  // Từ 2 mục trở lên cùng lỗi thường do mạng/máy chủ: gộp thành MỘT khối báo lỗi thay vì lặp lại ở từng mục.
  const failed = Object.values(sections).filter((s) => s.error !== null);
  const grouped = failed.length >= 2 && failed.every((s) => s.error === failed[0].error);

  const choosePreset = (next: RangePreset) => {
    setPreset(next);
    setRange(presetRange(next));
  };

  const scopeLabel =
    branchId === ALL_BRANCHES
      ? `Toàn bộ ${branches.length} chi nhánh`
      : (branches.find((b) => b.id === branchId)?.name ?? "Chi nhánh");

  return (
    <div>
      <SectionTitle
        title="Báo cáo doanh thu"
        sub={`${scopeLabel} · ${describeRange(range)} · giờ Việt Nam`}
      />

      <Card style={{ borderRadius: 14, marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <Segmented
            value={preset}
            onChange={(value) => choosePreset(value as RangePreset)}
            options={RANGE_PRESETS.map((p) => ({ label: p.label, value: p.key }))}
          />
          <DatePicker.RangePicker
            allowClear={false}
            format="DD/MM/YYYY"
            value={[dayjs(range.from), dayjs(range.to)]}
            onChange={(values) => {
              if (!values?.[0] || !values?.[1]) return;
              setPreset("custom");
              setRange({ from: values[0].format("YYYY-MM-DD"), to: values[1].format("YYYY-MM-DD") });
            }}
          />
          <Select
            value={branchId}
            onChange={setPicked}
            style={{ minWidth: 220 }}
            showSearch
            optionFilterProp="label"
            data-testid="report-branch-select"
            options={[
              {
                value: ALL_BRANCHES,
                disabled: !canCompare,
                label: canCompare
                  ? `Tất cả chi nhánh (${branches.length})`
                  : `Tất cả chi nhánh — cần gói ${requiredTierLabel("multiBranchCompare") ?? "cao hơn"}`,
              },
              ...branches.map((b) => ({ value: b.id, label: `${b.name} · ${b.code}` })),
            ]}
          />
          <Select
            value={granularity}
            onChange={setGranularity}
            style={{ width: 130 }}
            options={[
              { value: "day", label: "Theo ngày" },
              { value: "week", label: "Theo tuần" },
              { value: "month", label: "Theo tháng" },
            ]}
          />
        </div>
      </Card>

      {grouped && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          data-testid="report-group-error"
          message="Không tải được báo cáo"
          description={failed[0].error}
          action={
            <Button size="small" onClick={() => failed.forEach((s) => s.reload())}>
              Thử lại
            </Button>
          }
        />
      )}

      <GroupedErrors.Provider value={grouped}>
      <KpiRow section={sections.comparison} />

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <TimeseriesChart section={sections.timeseries} />
        </Col>
        <Col xs={24} lg={12}>
          <FeatureGate feature="multiBranchCompare" compact>
            <BranchComparison section={sections.comparison} />
          </FeatureGate>
        </Col>
        <Col xs={24} lg={12}>
          <TopItemsTable section={sections.topItems} />
        </Col>
        <Col xs={24} lg={12}>
          <PaymentMethodsTable section={sections.paymentMethods} />
        </Col>
        <Col xs={24} lg={12}>
          <TopToppingsTable section={sections.topToppings} />
        </Col>
      </Row>
      </GroupedErrors.Provider>

      <ChainPendingRefunds range={range} branchIds={branchIds} />
    </div>
  );
}

type SectionProps<K extends keyof ReportSections> = {
  section: ReportSections[K];
};

/** Mục BE chặn theo gói → thẻ khoá kèm nhãn gói cần có; lỗi khác → khối lỗi riêng kèm Thử lại. */
function SectionStatus({ section, children }: { section: SectionState<unknown>; children: React.ReactNode }) {
  const grouped = useContext(GroupedErrors);
  if (section.locked) return <FeatureLock feature="multiBranchCompare" compact />;
  if (section.error && grouped) return null;
  if (section.error) {
    return (
      <Alert
        type="error"
        showIcon
        data-testid="report-section-error"
        message="Không tải được mục này"
        description={section.error}
        action={
          <Button size="small" onClick={section.reload}>
            Thử lại
          </Button>
        }
      />
    );
  }
  return <>{children}</>;
}

function KpiRow({ section }: SectionProps<"comparison">) {
  const { data, loading } = section;
  const k = summarizeKpi(data ?? undefined);

  if (section.locked || section.error) {
    return (
      <SectionStatus section={section}>
        <></>
      </SectionStatus>
    );
  }

  const tiles = [
    {
      key: "revenue",
      label: "Doanh thu (sau hoàn)",
      value: formatVnd(k.netRevenue),
      hint: `Gộp ${formatVnd(k.grossRevenue)} · đã hoàn ${formatVnd(k.refundAmount)}`,
      icon: <Banknote size={16} />,
      emphasis: true,
    },
    { key: "orders", label: "Số đơn hoàn tất", value: formatCount(k.orderCount), icon: <ReceiptText size={16} /> },
    {
      key: "aov",
      label: "Giá trị đơn trung bình",
      value: k.averageOrderValue === null ? "—" : formatVnd(k.averageOrderValue),
      icon: <Wallet size={16} />,
    },
    {
      key: "cancelled",
      label: "Đơn huỷ sau thanh toán",
      value: formatCount(k.paidCancellationCount),
      hint: `Đã hoàn ${formatVnd(k.refundAmount)} (trừ vào ngày huỷ)`,
      icon: <Undo2 size={16} />,
    },
    {
      key: "pending",
      label: "Chờ chủ chuỗi hoàn",
      value: formatVnd(k.pendingRefundAmount),
      icon: <Hourglass size={16} />,
    },
  ];

  return (
    <Row gutter={[16, 16]}>
      {tiles.map((tile) => (
        <Col xs={12} md={8} key={tile.key} data-testid={`report-kpi-${tile.key}`}>
          {loading && !data ? (
            <Card style={{ borderRadius: 14, height: "100%" }} styles={{ body: { padding: 18 } }}>
              <Skeleton active paragraph={false} title={{ width: "70%" }} />
            </Card>
          ) : (
            <StatCard label={tile.label} value={tile.value} hint={tile.hint} icon={tile.icon} emphasis={tile.emphasis} />
          )}
        </Col>
      ))}
    </Row>
  );
}

function ChartShell({
  title,
  sub,
  section,
  isEmpty,
  emptyText,
  children,
}: {
  title: string;
  sub: string;
  section: SectionState<unknown>;
  isEmpty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  const loading = section.loading && !section.data;
  return (
    <Card style={{ borderRadius: 14, height: "100%" }} styles={{ body: { padding: 20 } }}>
      <SectionTitle title={title} sub={sub} />
      <SectionStatus section={section}>
        {loading ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : isEmpty ? (
          <div style={{ padding: "36px 0", textAlign: "center", color: palette.textMuted, fontSize: 13.5 }}>
            {emptyText}
          </div>
        ) : (
          children
        )}
      </SectionStatus>
    </Card>
  );
}

function TimeseriesChart({ section }: SectionProps<"timeseries">) {
  const data = section.data;
  // Cộng mọi chi nhánh lại thành một cột cho mỗi mốc thời gian.
  const bars = useMemo(() => {
    if (!data) return [];
    const { buckets, series } = data;
    return buckets.map((bucket, index) => ({
      bucket,
      revenue: series.reduce((sum, s) => sum + parseAmount(s.points[index]?.revenue), 0),
      refund: series.reduce((sum, s) => sum + parseAmount(s.points[index]?.refundAmount), 0),
      orders: series.reduce((sum, s) => sum + (s.points[index]?.orderCount ?? 0), 0),
    }));
  }, [data]);

  const max = Math.max(...bars.map((b) => b.revenue), 1);
  const hasRevenue = bars.some((b) => b.revenue > 0);

  return (
    <ChartShell
      title="Doanh thu theo thời gian"
      sub={data ? `Tổng ${formatVnd(bars.reduce((s, b) => s + b.revenue, 0))}` : "Đang tải"}
      section={section}
      isEmpty={!hasRevenue}
      emptyText="Không có doanh thu trong khoảng thời gian này."
    >
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 200, marginTop: 12, overflowX: "auto" }}>
        {bars.map((bar) => (
          <div key={bar.bucket} style={{ flex: "1 0 28px", textAlign: "center", minWidth: 28 }}>
            <div style={{ fontSize: 10.5, color: palette.textMuted, marginBottom: 4, whiteSpace: "nowrap" }}>
              {bar.revenue > 0 ? formatVndCompact(bar.revenue) : ""}
            </div>
            <div style={{ height: 130, display: "flex", alignItems: "flex-end" }}>
              <div
                title={`${formatDayLabel(bar.bucket)} · ${formatVnd(bar.revenue)} · ${bar.orders} đơn${bar.refund > 0 ? ` · hoàn ${formatVnd(bar.refund)}` : ""}`}
                style={{
                  width: "100%",
                  height: `${Math.max((bar.revenue / max) * 100, bar.revenue > 0 ? 3 : 0)}%`,
                  background: palette.brandPrimary,
                  borderRadius: "4px 4px 0 0",
                }}
              />
            </div>
            <div style={{ fontSize: 10.5, color: palette.textMuted, marginTop: 6, whiteSpace: "nowrap" }}>
              {formatDayLabel(bar.bucket)}
            </div>
            {bar.refund > 0 && (
              <div
                data-testid="report-bar-refund"
                style={{ fontSize: 10.5, color: palette.error.text, marginTop: 2, whiteSpace: "nowrap" }}
              >
                −{formatVndCompact(bar.refund)}
              </div>
            )}
          </div>
        ))}
      </div>
    </ChartShell>
  );
}

function BranchComparison({ section }: SectionProps<"comparison">) {
  const rows = section.data?.branches ?? [];
  const max = Math.max(...rows.map((r) => parseAmount(r.revenue)), 1);
  const hasRevenue = rows.some((r) => parseAmount(r.revenue) > 0);

  return (
    <ChartShell
      title="Doanh thu theo chi nhánh"
      sub={`${rows.length} chi nhánh trong phạm vi`}
      section={section}
      isEmpty={!hasRevenue}
      emptyText="Chưa chi nhánh nào có doanh thu trong kỳ."
    >
      <div style={{ display: "grid", gap: 14, marginTop: 12 }}>
        {rows.map((row) => {
          const revenue = parseAmount(row.revenue);
          return (
            <div key={row.branch.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, marginBottom: 5 }}>
                <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {row.branch.name}
                </span>
                <span style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{formatVnd(revenue)}</span>
              </div>
              <div style={{ height: 8, background: palette.paper, borderRadius: 999 }}>
                <div
                  style={{
                    width: `${(revenue / max) * 100}%`,
                    height: "100%",
                    background: palette.brandPrimary,
                    borderRadius: 999,
                  }}
                />
              </div>
              <div style={{ fontSize: 11.5, color: palette.textMuted, marginTop: 4 }}>
                {formatCount(row.orderCount)} đơn · TB {formatVnd(row.averageOrderValue)}
                {row.paidCancellationCount > 0 &&
                  ` · huỷ ${formatCount(row.paidCancellationCount)} đơn, hoàn ${formatVnd(row.refundAmount)}`}
              </div>
            </div>
          );
        })}
      </div>
    </ChartShell>
  );
}

function TopItemsTable({ section }: SectionProps<"topItems">) {
  const items = section.data?.items ?? [];

  return (
    <ChartShell
      title="Món bán chạy"
      sub="Xếp theo số lượng bán trong kỳ"
      section={section}
      isEmpty={items.length === 0}
      emptyText="Chưa bán được món nào trong khoảng thời gian này."
    >
      <Table<TopItemRow>
        dataSource={items}
        rowKey={(row) => row.menuItem.id}
        pagination={false}
        size="small"
        style={{ marginTop: 8 }}
        columns={[
          { title: "#", dataIndex: "rank", width: 44 },
          {
            title: "Món",
            key: "name",
            render: (_, row) => row.menuItem.name ?? <span style={{ color: palette.textSubtle }}>Món đã xoá</span>,
          },
          { title: "SL", dataIndex: "quantity", align: "right", width: 70, render: (v: number) => formatCount(v) },
          {
            title: "Doanh thu",
            dataIndex: "revenue",
            align: "right",
            render: (v: string) => formatVnd(v),
          },
        ]}
      />
    </ChartShell>
  );
}

/** #94: theo hình thức thanh toán, đúng số BE trả (cộng `netAmount` các dòng khớp doanh thu sau hoàn). */
function PaymentMethodsTable({ section }: SectionProps<"paymentMethods">) {
  const rows = section.data?.methods ?? [];

  return (
    <ChartShell
      title="Theo hình thức thanh toán"
      sub="Sau hoàn, theo thời điểm thanh toán"
      section={section}
      isEmpty={rows.length === 0}
      emptyText="Chưa có khoản thanh toán nào trong khoảng thời gian này."
    >
      <div data-testid="report-payment-methods">
        <Table<PaymentMethodRow>
          dataSource={rows}
          rowKey="method"
          pagination={false}
          size="small"
          style={{ marginTop: 8 }}
          columns={[
            { title: "Hình thức", dataIndex: "method", render: (v: string) => paymentMethodInfo(v).label },
            { title: "Số khoản", dataIndex: "paymentCount", align: "right", render: (v: number) => formatCount(v) },
            { title: "Đã hoàn", dataIndex: "refundAmount", align: "right", render: (v: string) => formatVnd(v) },
            { title: "Sau hoàn", dataIndex: "netAmount", align: "right", render: (v: string) => formatVnd(v) },
          ]}
        />
      </div>
    </ChartShell>
  );
}

/** #97: topping bán chạy theo snapshot của dòng món. */
function TopToppingsTable({ section }: SectionProps<"topToppings">) {
  const items = section.data?.items ?? [];

  return (
    <ChartShell
      title="Topping bán chạy"
      sub="Xếp theo số lượng trong kỳ"
      section={section}
      isEmpty={items.length === 0}
      emptyText="Chưa bán được topping nào trong khoảng thời gian này."
    >
      <div data-testid="report-top-toppings">
        <Table<TopToppingRow>
          dataSource={items}
          rowKey={(row) => `${row.rank}-${row.optionId ?? row.name}`}
          pagination={false}
          size="small"
          style={{ marginTop: 8 }}
          columns={[
            { title: "#", dataIndex: "rank", width: 44 },
            { title: "Topping", dataIndex: "name", render: (v: string | null) => v ?? "—" },
            { title: "SL", dataIndex: "quantity", align: "right", width: 70, render: (v: number) => formatCount(v) },
            { title: "Thu thêm", dataIndex: "additionalRevenue", align: "right", render: (v: string) => formatVnd(v) },
          ]}
        />
      </div>
    </ChartShell>
  );
}
