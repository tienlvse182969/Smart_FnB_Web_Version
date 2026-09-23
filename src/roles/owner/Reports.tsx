import { useMemo, useState } from "react";
import { Alert, Button, Card, Col, DatePicker, Row, Segmented, Select, Skeleton, Table } from "antd";
import { Banknote, ReceiptText, Users, Wallet } from "lucide-react";
import dayjs from "dayjs";
import { SectionTitle, StatCard } from "../../components/bits";
import { useAppStore } from "../../store";
import type { ReportGranularity, TopItemRow } from "../../services/reportApi";
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
} from "../../services/reportFormat";
import { useReportData } from "./useReportData";

const ALL_BRANCHES = "__all__";

/** Báo cáo doanh thu của Owner — toàn bộ số liệu lấy từ `/reports/*`. */
export default function Reports() {
  const branches = useAppStore((s) => s.apiBranches);
  const [preset, setPreset] = useState<RangePreset | "custom">("7d");
  const [range, setRange] = useState<DateRange>(() => presetRange("7d"));
  const [branchId, setBranchId] = useState<string>(ALL_BRANCHES);
  const [granularity, setGranularity] = useState<ReportGranularity>("day");

  const branchIds = branchId === ALL_BRANCHES ? undefined : [branchId];
  const { data, loading, error, reload } = useReportData({ ...range, branchIds, granularity });

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
            onChange={setBranchId}
            style={{ minWidth: 220 }}
            showSearch
            optionFilterProp="label"
            options={[
              { value: ALL_BRANCHES, label: `Tất cả chi nhánh (${branches.length})` },
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

      {error && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="Không tải được báo cáo"
          description={error}
          action={
            <Button size="small" onClick={reload}>
              Thử lại
            </Button>
          }
        />
      )}

      <KpiRow data={data} loading={loading} />

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <TimeseriesChart data={data} loading={loading} />
        </Col>
        <Col xs={24} lg={12}>
          <BranchComparison data={data} loading={loading} />
        </Col>
        <Col xs={24} lg={12}>
          <TopItemsTable data={data} loading={loading} />
        </Col>
      </Row>
    </div>
  );
}

type BlockProps = { data: ReturnType<typeof useReportData>["data"]; loading: boolean };

function KpiRow({ data, loading }: BlockProps) {
  const totals = data?.comparison.totals;
  const revenue = parseAmount(totals?.revenue);
  const orders = totals?.orderCount ?? 0;
  const guests = data?.customers.totals.guestCount ?? 0;
  const aov = orders > 0 ? revenue / orders : 0;

  const tiles = [
    { label: "Doanh thu", value: formatVnd(revenue), icon: <Banknote size={16} />, emphasis: true },
    { label: "Số đơn hoàn tất", value: formatCount(orders), icon: <ReceiptText size={16} /> },
    { label: "Giá trị đơn trung bình", value: formatVnd(aov), icon: <Wallet size={16} /> },
    { label: "Lượt khách", value: formatCount(guests), icon: <Users size={16} /> },
  ];

  return (
    <Row gutter={[16, 16]}>
      {tiles.map((tile) => (
        <Col xs={12} md={6} key={tile.label}>
          {loading && !data ? (
            <Card style={{ borderRadius: 14, height: "100%" }} styles={{ body: { padding: 18 } }}>
              <Skeleton active paragraph={false} title={{ width: "70%" }} />
            </Card>
          ) : (
            <StatCard label={tile.label} value={tile.value} icon={tile.icon} emphasis={tile.emphasis} />
          )}
        </Col>
      ))}
    </Row>
  );
}

function ChartShell({
  title,
  sub,
  loading,
  isEmpty,
  emptyText,
  children,
}: {
  title: string;
  sub: string;
  loading: boolean;
  isEmpty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <Card style={{ borderRadius: 14, height: "100%" }} styles={{ body: { padding: 20 } }}>
      <SectionTitle title={title} sub={sub} />
      {loading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : isEmpty ? (
        <div style={{ padding: "36px 0", textAlign: "center", color: "#71717a", fontSize: 13.5 }}>
          {emptyText}
        </div>
      ) : (
        children
      )}
    </Card>
  );
}

function TimeseriesChart({ data, loading }: BlockProps) {
  // Cộng mọi chi nhánh lại thành một cột cho mỗi mốc thời gian.
  const bars = useMemo(() => {
    if (!data) return [];
    const { buckets, series } = data.timeseries;
    return buckets.map((bucket, index) => ({
      bucket,
      revenue: series.reduce((sum, s) => sum + parseAmount(s.points[index]?.revenue), 0),
      orders: series.reduce((sum, s) => sum + (s.points[index]?.orderCount ?? 0), 0),
    }));
  }, [data]);

  const max = Math.max(...bars.map((b) => b.revenue), 1);
  const hasRevenue = bars.some((b) => b.revenue > 0);

  return (
    <ChartShell
      title="Doanh thu theo thời gian"
      sub={data ? `Tổng ${formatVnd(bars.reduce((s, b) => s + b.revenue, 0))}` : "Đang tải"}
      loading={loading && !data}
      isEmpty={!hasRevenue}
      emptyText="Không có doanh thu trong khoảng thời gian này."
    >
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 200, marginTop: 12, overflowX: "auto" }}>
        {bars.map((bar) => (
          <div key={bar.bucket} style={{ flex: "1 0 28px", textAlign: "center", minWidth: 28 }}>
            <div style={{ fontSize: 10.5, color: "#71717a", marginBottom: 4, whiteSpace: "nowrap" }}>
              {bar.revenue > 0 ? formatVndCompact(bar.revenue) : ""}
            </div>
            <div style={{ height: 130, display: "flex", alignItems: "flex-end" }}>
              <div
                title={`${formatDayLabel(bar.bucket)} · ${formatVnd(bar.revenue)} · ${bar.orders} đơn`}
                style={{
                  width: "100%",
                  height: `${Math.max((bar.revenue / max) * 100, bar.revenue > 0 ? 3 : 0)}%`,
                  background: "#0a0a0a",
                  borderRadius: "4px 4px 0 0",
                }}
              />
            </div>
            <div style={{ fontSize: 10.5, color: "#71717a", marginTop: 6, whiteSpace: "nowrap" }}>
              {formatDayLabel(bar.bucket)}
            </div>
          </div>
        ))}
      </div>
    </ChartShell>
  );
}

function BranchComparison({ data, loading }: BlockProps) {
  const rows = data?.comparison.branches ?? [];
  const max = Math.max(...rows.map((r) => parseAmount(r.revenue)), 1);
  const hasRevenue = rows.some((r) => parseAmount(r.revenue) > 0);

  return (
    <ChartShell
      title="Doanh thu theo chi nhánh"
      sub={`${rows.length} chi nhánh trong phạm vi`}
      loading={loading && !data}
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
              <div style={{ height: 8, background: "#f4f4f5", borderRadius: 999 }}>
                <div
                  style={{
                    width: `${(revenue / max) * 100}%`,
                    height: "100%",
                    background: "#0a0a0a",
                    borderRadius: 999,
                  }}
                />
              </div>
              <div style={{ fontSize: 11.5, color: "#71717a", marginTop: 4 }}>
                {formatCount(row.orderCount)} đơn · TB {formatVnd(row.averageOrderValue)} · {formatCount(row.guestCount)} khách
              </div>
            </div>
          );
        })}
      </div>
    </ChartShell>
  );
}

function TopItemsTable({ data, loading }: BlockProps) {
  const items = data?.topItems.items ?? [];

  return (
    <ChartShell
      title="Món bán chạy"
      sub="Xếp theo số lượng bán trong kỳ"
      loading={loading && !data}
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
            render: (_, row) => row.menuItem.name ?? <span style={{ color: "#a1a1aa" }}>Món đã xoá</span>,
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
