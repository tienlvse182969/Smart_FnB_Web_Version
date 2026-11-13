import { useMemo, useState } from "react";
import { Alert, Button, Card, Col, DatePicker, Row, Segmented, Select, Skeleton, Table, Tag, message } from "antd";
import { Banknote, Hourglass, ReceiptText, Undo2, Wallet, Coins } from "lucide-react";
import dayjs from "dayjs";
import { SectionTitle, StatCard } from "../../components/bits";
import { useAppStore } from "../../store";
import { branchPricesApi, describeApiError } from "../../api";
import { paymentMethodInfo } from "../../api/modules/order/codes";
import type {
  PaymentMethodRow,
  ReportGranularity,
  RevenueTimeseries,
  TopComboRow,
  TopItemRow,
  TopToppingRow,
} from "../../types";
import FeatureGate from "../../plan/FeatureGate";
import { usePlan } from "../../plan/usePlan";
import {
  RANGE_PRESETS,
  parseAmount,
  describeRange,
  formatCount,
  formatDayLabel,
  formatVnd,
  formatVndCompact,
  presetRange,
  todayInVn,
  type DateRange,
  type RangePreset,
} from "../../lib/reportFormat";
import { type BlockState, useReportBlock, useReportData } from "./useReportData";
import { summarizeKpi } from "./reportKpi";
import LedgerByBranch from "./LedgerByBranch";
import { ALL_BRANCHES, branchStatusSuffix, branchesWithOwnPrice, isPlanFeatureError, resolveReportScope } from "./reportScope";
import { palette } from "../../theme";

/** Tối đa BE nhận cho một lần xem (reports.service `resolveRange`). */
const MAX_RANGE_DAYS = 366;

/** Màu phân biệt chi nhánh trên cùng biểu đồ — chỉ dùng token theme, lặp lại khi có > 7 chi nhánh. */
const SERIES_COLORS = [
  palette.brandPrimary,
  palette.info.text,
  palette.success.text,
  palette.warning.text,
  palette.purple.text,
  palette.error.text,
  palette.neutral.text,
];
const seriesColor = (index: number) => SERIES_COLORS[index % SERIES_COLORS.length];

/** Báo cáo của Owner (OW-08) — toàn bộ số liệu lấy từ `/reports/*`, không tự tính lại ở web. */
export default function Reports() {
  const branches = useAppStore((s) => s.apiBranches);
  const { hasCompare, tierLabel, requiredTierLabel } = usePlanForReports();
  const [preset, setPreset] = useState<RangePreset | "custom">("7d");
  const [range, setRange] = useState<DateRange>(() => presetRange("7d"));
  const [selected, setSelected] = useState<string>(ALL_BRANCHES);
  const [granularity, setGranularity] = useState<ReportGranularity>("day");

  const scope = resolveReportScope({ hasCompare, branchIds: branches.map((b) => b.id), selected });
  const blocks = useReportData({ ...range, branchIds: scope.branchIds, granularity });

  const choosePreset = (next: RangePreset) => {
    setPreset(next);
    setRange(presetRange(next));
  };

  const scopeLabel =
    scope.selected === ALL_BRANCHES
      ? `Toàn bộ ${branches.length} chi nhánh`
      : (branches.find((b) => b.id === scope.selected)?.name ?? "Chi nhánh");

  const branchOptions = [
    ...(scope.canPickAll ? [{ value: ALL_BRANCHES, label: `Tất cả chi nhánh (${branches.length})` }] : []),
    ...branches.map((b) => ({ value: b.id, label: `${b.name} · ${b.code}${branchStatusSuffix(b.status)}` })),
  ];

  return (
    <div>
      <SectionTitle title="Báo cáo" sub={`${scopeLabel} · ${describeRange(range)} · giờ Việt Nam`} />

      {branches.length > 1 && !hasCompare && (
        <Alert
          data-testid="report-plan-note"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={`Gói ${tierLabel ?? "hiện tại"} xem báo cáo từng chi nhánh`}
          description={`Chọn một chi nhánh để xem. So sánh các chi nhánh trên cùng biểu đồ có từ gói ${requiredTierLabel ?? "Tiêu chuẩn"}.`}
        />
      )}
      {branches.length === 1 && (
        <Alert
          data-testid="report-single-note"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Chuỗi hiện chỉ có một chi nhánh nên chưa có phần so sánh chi nhánh."
        />
      )}

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
            disabledDate={(date) => date.format("YYYY-MM-DD") > todayInVn()}
            onChange={(values) => {
              if (!values?.[0] || !values?.[1]) return;
              if (values[1].diff(values[0], "day") + 1 > MAX_RANGE_DAYS) {
                message.warning(`Chỉ xem được tối đa ${MAX_RANGE_DAYS} ngày một lần.`);
                return;
              }
              setPreset("custom");
              setRange({ from: values[0].format("YYYY-MM-DD"), to: values[1].format("YYYY-MM-DD") });
            }}
          />
          <Select
            aria-label="Phạm vi chi nhánh"
            value={scope.selected}
            onChange={setSelected}
            disabled={branches.length <= 1}
            style={{ minWidth: 240 }}
            showSearch
            optionFilterProp="label"
            options={branchOptions}
          />
          <Select
            aria-label="Chia theo"
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

      <KpiRow comparison={blocks.comparison} />

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <TimeseriesChart block={blocks.timeseries} compare={scope.showComparison} />
        </Col>
        {scope.comparisonLock === "plan" ? (
          <Col xs={24} lg={12}>
            <FeatureGate feature="multiBranchCompare" compact>
              <></>
            </FeatureGate>
          </Col>
        ) : (
          scope.showComparison && (
            <Col xs={24} lg={12}>
              <BranchComparison block={blocks.comparison} />
            </Col>
          )
        )}
        <Col xs={24} lg={scope.comparisonLock === "plan" || scope.showComparison ? 12 : 24}>
          <PaymentMethodsTable block={blocks.paymentMethods} />
        </Col>
        <Col xs={24} lg={12}>
          <TopItemsTable block={blocks.topItems} />
        </Col>
        <Col xs={24} lg={12}>
          <TopCombosTable block={blocks.topCombos} />
        </Col>
        <Col xs={24}>
          <TopToppingsTable block={blocks.topToppings} />
        </Col>
        <Col xs={24}>
          <LedgerByBranch chainId={branches[0]?.chainId} range={range} />
        </Col>
      </Row>
    </div>
  );
}

/** Gói hiện tại cho màn báo cáo: có so sánh đa chi nhánh không, và tên cấp để ghi chú. */
function usePlanForReports() {
  const plan = usePlan();
  return {
    hasCompare: plan.hasFeature("multiBranchCompare"),
    tierLabel: plan.tierLabel,
    requiredTierLabel: plan.requiredTierLabel("multiBranchCompare"),
  };
}

/* ------------------------------------------------------------------ khối dùng chung ------------------------------------------------------------------ */

/** Lỗi của MỘT khối: 403 do gói thì báo nâng gói (BR-08), lỗi khác báo kèm Thử lại. Khối khác vẫn hiện. */
function BlockError({ error, reload }: { error: unknown; reload: () => void }) {
  if (isPlanFeatureError(error)) {
    return (
      <Alert
        data-testid="report-plan-error"
        type="warning"
        showIcon
        message="Gói hiện tại chưa có tính năng này"
        description="So sánh nhiều chi nhánh có từ gói Tiêu chuẩn. Chọn một chi nhánh để xem, hoặc nâng gói."
      />
    );
  }
  // 404: máy chủ chạy bản backend cũ chưa có báo cáo này (ba báo cáo OW-08 mới thêm ở BE 71e085d trở đi).
  const notSupported = (error as { status?: number } | null)?.status === 404;
  return (
    <Alert
      data-testid="report-block-error"
      type="error"
      showIcon
      message="Không tải được khối này"
      description={notSupported ? "Máy chủ chưa có báo cáo này. Cần cập nhật backend lên bản mới." : describeApiError(error)}
      action={
        <Button size="small" onClick={reload}>
          Thử lại
        </Button>
      }
    />
  );
}

function ChartShell<T>({
  title,
  sub,
  block,
  isEmpty,
  emptyText,
  children,
  testId,
}: {
  title: string;
  sub: string;
  block: BlockState<T>;
  isEmpty: (data: T) => boolean;
  emptyText: string;
  children: (data: T) => React.ReactNode;
  testId?: string;
}) {
  return (
    <Card data-testid={testId} style={{ borderRadius: 14, height: "100%" }} styles={{ body: { padding: 20 } }}>
      <SectionTitle title={title} sub={sub} />
      {block.loading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : block.error ? (
        <BlockError error={block.error} reload={block.reload} />
      ) : block.data && isEmpty(block.data) ? (
        <div style={{ padding: "36px 0", textAlign: "center", color: palette.textMuted, fontSize: 13.5 }}>{emptyText}</div>
      ) : block.data ? (
        children(block.data)
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------------------ thẻ số ------------------------------------------------------------------ */

function KpiRow({ comparison }: { comparison: ReturnType<typeof useReportData>["comparison"] }) {
  const k = summarizeKpi(comparison.data ?? undefined);

  const fromComparison = (value: React.ReactNode) =>
    comparison.error ? <ErrorText onRetry={comparison.reload} error={comparison.error} /> : value;

  const tiles: {
    key: string;
    label: string;
    value: React.ReactNode;
    hint?: React.ReactNode;
    icon: React.ReactNode;
    emphasis?: boolean;
    loading: boolean;
  }[] = [
    {
      key: "revenue",
      label: "Doanh thu (sau hoàn)",
      value: fromComparison(formatVnd(k.netRevenue)),
      hint: comparison.error ? undefined : `Gộp ${formatVnd(k.grossRevenue)} · đã hoàn ${formatVnd(k.refundAmount)}`,
      icon: <Banknote size={16} />,
      emphasis: true,
      loading: comparison.loading,
    },
    {
      key: "orders",
      label: "Số đơn",
      value: fromComparison(formatCount(k.orderCount)),
      icon: <ReceiptText size={16} />,
      loading: comparison.loading,
    },
    {
      key: "aov",
      label: "Giá trị đơn trung bình",
      value: fromComparison(k.averageOrderValue === null ? "—" : formatVnd(k.averageOrderValue)),
      hint: k.averageOrderValue === null && !comparison.error ? "Chọn một chi nhánh để xem" : undefined,
      icon: <Wallet size={16} />,
      loading: comparison.loading,
    },
    {
      key: "cancelled",
      label: "Đơn huỷ sau thanh toán",
      value: fromComparison(formatCount(k.paidCancellationCount)),
      hint: comparison.error ? undefined : `Số tiền hoàn ${formatVnd(k.refundAmount)} (trừ vào ngày huỷ)`,
      icon: <Undo2 size={16} />,
      loading: comparison.loading,
    },
    {
      key: "cash-refund",
      label: "Tiền mặt đã hoàn",
      // BR-81, BR-83: mọi khoản hoàn đều là tiền mặt tại quầy, bất kể đơn trả bằng tiền mặt hay QR — nên đây là TỔNG hoàn
      // BE gom theo ngày huỷ (`totals.refundAmount`), KHÔNG lọc theo hình thức gốc của đơn. BE chưa có số "tiền mặt đã hoàn" riêng;
      // số này gồm cả khoản hoàn còn chờ của đơn cũ (nếu có) và không gồm khoản tiền về muộn (LATE_PAYMENT).
      value: fromComparison(formatVnd(k.refundAmount)),
      icon: <Coins size={16} />,
      loading: comparison.loading,
    },
    {
      key: "pending",
      label: "Chờ chủ chuỗi hoàn",
      value: fromComparison(formatVnd(k.pendingRefundAmount)),
      icon: <Hourglass size={16} />,
      loading: comparison.loading,
    },
  ];

  return (
    <Row gutter={[16, 16]}>
      {tiles.map((tile) => (
        <Col xs={12} md={8} key={tile.key} data-testid={`report-kpi-${tile.key}`}>
          {tile.loading ? (
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

function ErrorText({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <span style={{ fontSize: 13, fontWeight: 400 }} title={describeApiError(error)}>
      Lỗi tải{" "}
      <a onClick={onRetry} role="button">
        Thử lại
      </a>
    </span>
  );
}

/* ------------------------------------------------------------------ biểu đồ thời gian ------------------------------------------------------------------ */

function TimeseriesChart({ block, compare }: { block: BlockState<RevenueTimeseries>; compare: boolean }) {
  return (
    <ChartShell
      testId="report-timeseries"
      title="Doanh thu theo thời gian"
      sub={
        block.data
          ? `Tổng ${formatVnd(block.data.series.reduce((sum, s) => sum + parseAmount(s.netTotal ?? s.total), 0))}`
          : "Đang tải"
      }
      block={block}
      isEmpty={(data) => !data.series.some((s) => s.points.some((p) => parseAmount(p.revenue) !== 0 || p.orderCount > 0))}
      emptyText="Không có doanh thu trong khoảng thời gian này."
    >
      {(data) => (compare && data.series.length > 1 ? <BranchLines data={data} /> : <SumBars data={data} />)}
    </ChartShell>
  );
}

/** Cộng mọi chi nhánh trong phạm vi thành một cột cho mỗi mốc thời gian. */
function SumBars({ data }: { data: RevenueTimeseries }) {
  const bars = useMemo(() => {
    const { buckets, series } = data;
    return buckets.map((bucket, index) => ({
      bucket,
      revenue: series.reduce((sum, s) => sum + parseAmount(s.points[index]?.revenue), 0),
      refund: series.reduce((sum, s) => sum + parseAmount(s.points[index]?.refundAmount), 0),
      orders: series.reduce((sum, s) => sum + (s.points[index]?.orderCount ?? 0), 0),
    }));
  }, [data]);
  const max = Math.max(...bars.map((b) => b.revenue), 1);

  return (
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
            <div data-testid="report-bar-refund" style={{ fontSize: 10.5, color: palette.error.text, marginTop: 2, whiteSpace: "nowrap" }}>
              −{formatVndCompact(bar.refund)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const CHART_W = 720;
const CHART_H = 240;
const PAD = { left: 56, right: 16, top: 12, bottom: 28 };

/** So sánh các chi nhánh trên cùng biểu đồ: mỗi chi nhánh một đường, có chú giải và chú thích số tiền khi rê chuột. */
function BranchLines({ data }: { data: RevenueTimeseries }) {
  const { buckets, series } = data;
  const values = series.map((s) => buckets.map((_, i) => parseAmount(s.points[i]?.revenue)));
  const max = Math.max(...values.flat(), 1);
  const innerW = CHART_W - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (buckets.length <= 1 ? innerW / 2 : (i / (buckets.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const labelEvery = Math.max(1, Math.ceil(buckets.length / 8));

  return (
    <div data-testid="report-branch-lines" style={{ marginTop: 8 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 8 }}>
        {series.map((s, index) => (
          <span key={s.branch.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
            <span style={{ width: 12, height: 3, borderRadius: 2, background: seriesColor(index), display: "inline-block" }} />
            {s.branch.name}
          </span>
        ))}
      </div>
      <div style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} role="img" aria-label="Doanh thu theo thời gian của từng chi nhánh" style={{ width: "100%", minWidth: 480, height: "auto" }}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={CHART_W - PAD.right} y1={y(max * t)} y2={y(max * t)} stroke={palette.lineSubtle} strokeWidth={1} />
              <text x={PAD.left - 6} y={y(max * t) + 4} textAnchor="end" fontSize={10.5} fill={palette.textMuted}>
                {formatVndCompact(max * t)}
              </text>
            </g>
          ))}
          {buckets.map((bucket, i) =>
            i % labelEvery === 0 ? (
              <text key={bucket} x={x(i)} y={CHART_H - 8} textAnchor="middle" fontSize={10.5} fill={palette.textMuted}>
                {formatDayLabel(bucket)}
              </text>
            ) : null,
          )}
          {series.map((s, index) => (
            <g key={s.branch.id}>
              <polyline
                fill="none"
                stroke={seriesColor(index)}
                strokeWidth={2}
                points={values[index].map((v, i) => `${x(i)},${y(v)}`).join(" ")}
              />
              {values[index].map((v, i) => (
                <circle key={buckets[i]} cx={x(i)} cy={y(v)} r={3.5} fill={seriesColor(index)}>
                  <title>{`${s.branch.name} · ${formatDayLabel(buckets[i])} · ${formatVnd(v)} · ${s.points[i]?.orderCount ?? 0} đơn`}</title>
                </circle>
              ))}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ so sánh chi nhánh ------------------------------------------------------------------ */

function BranchComparison({ block }: { block: ReturnType<typeof useReportData>["comparison"] }) {
  const chainId = useAppStore((s) => s.apiBranches[0]?.chainId);
  // Ghi chú chi nhánh có giá riêng (BR-85) lấy từ ma trận giá chi nhánh của BE (OW-16); lỗi ở đây không làm hỏng khối so sánh.
  const ownPrice = useReportBlock(chainId ?? "none", async () => (chainId ? branchPricesApi.getMatrix(chainId) : null));
  const withOwnPrice = ownPrice.data ? branchesWithOwnPrice(ownPrice.data.cells) : new Map<string, number>();

  return (
    <ChartShell
      testId="report-branch-comparison"
      title="Doanh thu theo chi nhánh"
      sub={block.data ? `${block.data.branches.length} chi nhánh trong phạm vi` : "Đang tải"}
      block={block}
      isEmpty={(data) => !data.branches.some((r) => parseAmount(r.revenue) > 0 || r.orderCount > 0)}
      emptyText="Chưa chi nhánh nào có doanh thu trong kỳ."
    >
      {(data) => {
        const rows = data.branches;
        const max = Math.max(...rows.map((r) => parseAmount(r.revenue)), 1);
        return (
          <div style={{ display: "grid", gap: 14, marginTop: 12 }}>
            {rows.map((row) => {
              const revenue = parseAmount(row.revenue);
              const own = withOwnPrice.get(row.branch.id);
              return (
                <div key={row.branch.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, marginBottom: 5 }}>
                    <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row.branch.name}
                      {own ? (
                        <Tag style={{ marginLeft: 8 }} color="blue" data-testid="report-own-price-tag">
                          Có giá riêng ({own})
                        </Tag>
                      ) : null}
                    </span>
                    <span style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{formatVnd(revenue)}</span>
                  </div>
                  <div style={{ height: 8, background: palette.paper, borderRadius: 999 }}>
                    <div style={{ width: `${(revenue / max) * 100}%`, height: "100%", background: palette.brandPrimary, borderRadius: 999 }} />
                  </div>
                  <div style={{ fontSize: 11.5, color: palette.textMuted, marginTop: 4 }}>
                    {formatCount(row.orderCount)} đơn · TB {formatVnd(row.averageOrderValue)}
                    {row.paidCancellationCount > 0 &&
                      ` · huỷ ${formatCount(row.paidCancellationCount)} đơn, hoàn ${formatVnd(row.refundAmount)}`}
                  </div>
                </div>
              );
            })}
            <div style={{ fontSize: 12, color: palette.textMuted, lineHeight: 1.6 }}>
              So sánh doanh thu thực thu theo giá áp dụng tại từng chi nhánh.
              {ownPrice.error
                ? " Không tải được danh sách chi nhánh có giá riêng."
                : withOwnPrice.size > 0
                  ? " Chi nhánh có thẻ “Có giá riêng” đang bán một số món hoặc combo khác giá chuỗi."
                  : ""}
            </div>
          </div>
        );
      }}
    </ChartShell>
  );
}

/* ------------------------------------------------------------------ hình thức thanh toán, bảng xếp hạng ------------------------------------------------------------------ */

function PaymentMethodsTable({ block }: { block: ReturnType<typeof useReportData>["paymentMethods"] }) {
  return (
    <ChartShell
      testId="report-payment-methods"
      title="Theo hình thức thanh toán"
      sub="Giữ hình thức gốc của đơn; tiền hoàn tách riêng, trừ vào ngày hoàn"
      block={block}
      isEmpty={(data) => data.methods.length === 0}
      emptyText="Chưa có khoản thanh toán nào trong khoảng thời gian này."
    >
      {(data) => (
        <Table<PaymentMethodRow>
          dataSource={data.methods}
          rowKey="method"
          pagination={false}
          size="small"
          style={{ marginTop: 8 }}
          scroll={{ x: true }}
          columns={[
            { title: "Hình thức", key: "method", render: (_, row) => paymentMethodInfo(row.method).label },
            { title: "Ghi nhận", dataIndex: "grossSettledAmount", align: "right", render: (v: string) => formatVnd(v) },
            { title: "Đã hoàn", dataIndex: "refundAmount", align: "right", render: (v: string) => formatVnd(v) },
            { title: "Sau hoàn", dataIndex: "netAmount", align: "right", render: (v: string) => formatVnd(v) },
            { title: "Số khoản", dataIndex: "paymentCount", align: "right", render: (v: number) => formatCount(v) },
            {
              title: "Huỷ sau trả",
              dataIndex: "cancelledAfterPaymentCount",
              align: "right",
              render: (v: number) => formatCount(v),
            },
          ]}
        />
      )}
    </ChartShell>
  );
}

function TopItemsTable({ block }: { block: ReturnType<typeof useReportData>["topItems"] }) {
  return (
    <ChartShell
      testId="report-top-items"
      title="Món bán chạy"
      sub="Xếp theo số lượng bán trong kỳ"
      block={block}
      isEmpty={(data) => data.items.length === 0}
      emptyText="Chưa bán được món nào trong khoảng thời gian này."
    >
      {(data) => (
        <Table<TopItemRow>
          dataSource={data.items}
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
            { title: "Doanh thu", dataIndex: "revenue", align: "right", render: (v: string) => formatVnd(v) },
          ]}
        />
      )}
    </ChartShell>
  );
}

function TopCombosTable({ block }: { block: ReturnType<typeof useReportData>["topCombos"] }) {
  return (
    <ChartShell
      testId="report-top-combos"
      title="Combo bán chạy"
      sub="Xếp theo số lượng bán; doanh thu ghi ở dòng combo"
      block={block}
      isEmpty={(data) => data.items.length === 0}
      emptyText="Chưa bán được combo nào trong khoảng thời gian này."
    >
      {(data) => (
        <Table<TopComboRow>
          dataSource={data.items}
          rowKey={(row) => row.comboId ?? `${row.rank}-${row.name}`}
          pagination={false}
          size="small"
          style={{ marginTop: 8 }}
          columns={[
            { title: "#", dataIndex: "rank", width: 44 },
            { title: "Combo", dataIndex: "name" },
            { title: "SL", dataIndex: "quantity", align: "right", width: 70, render: (v: number) => formatCount(v) },
            { title: "Doanh thu", dataIndex: "revenue", align: "right", render: (v: string) => formatVnd(v) },
          ]}
        />
      )}
    </ChartShell>
  );
}

function TopToppingsTable({ block }: { block: ReturnType<typeof useReportData>["topToppings"] }) {
  return (
    <ChartShell
      testId="report-top-toppings"
      title="Topping bán chạy"
      sub="Xếp theo số phần bán; tiền là phần cộng thêm của topping"
      block={block}
      isEmpty={(data) => data.items.length === 0}
      emptyText="Chưa bán được topping nào trong khoảng thời gian này."
    >
      {(data) => (
        <Table<TopToppingRow>
          dataSource={data.items}
          rowKey={(row) => row.optionId ?? `${row.rank}-${row.name}`}
          pagination={false}
          size="small"
          style={{ marginTop: 8 }}
          columns={[
            { title: "#", dataIndex: "rank", width: 44 },
            { title: "Topping", key: "name", render: (_, row) => row.name ?? <span style={{ color: palette.textSubtle }}>Không rõ tên</span> },
            { title: "SL", dataIndex: "quantity", align: "right", width: 70, render: (v: number) => formatCount(v) },
            { title: "Tiền cộng thêm", dataIndex: "additionalRevenue", align: "right", render: (v: string) => formatVnd(v) },
          ]}
        />
      )}
    </ChartShell>
  );
}
