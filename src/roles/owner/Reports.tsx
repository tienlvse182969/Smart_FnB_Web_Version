import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Row,
  Segmented,
  Select,
  Skeleton,
  Table,
  Tag,
} from "antd"
import { Banknote, Coins, Hourglass, ReceiptText, Undo2, Wallet } from "lucide-react"
import dayjs from "dayjs"
import { AccentBadge, PageHeader, SectionTitle, ShareBar, StatCard } from "../../components/bits"
import NoBranchState from "./NoBranchState"
import { useAppStore } from "../../store"
import type { ReportGranularity, RevenueComparison } from "../../types"
import { useSearchParams } from "react-router-dom"
import { usePlan } from "../../plan/usePlan"
import ReportChart, { seriesColor } from "../../components/ReportChart"
import { branchPricesApi } from "../../api"
import { palette } from "../../theme"
import { bucketLabel } from "../branch/reportFilters"
import { formatDateTime } from "../../lib/reportFormat"
import type { ReportCancellations } from "../../types"
import { paymentMethodInfo } from "../../api/modules/order/codes"
import { useReportSection } from "../../components/useReportSection"
import LedgerByBranch from "./LedgerByBranch"
import { branchesWithOwnPrice } from "./reportScope"
import {
  RANGE_PRESETS,
  changeRatio,
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
} from "../../lib/reportFormat"
import { useReportData } from "./useReportData"
import { summarizeKpi } from "./reportKpi"

const ALL_BRANCHES = "__all__"
/** Tối đa BE nhận cho một lần xem (reports.service resolveRange). */
const MAX_RANGE_DAYS = 366

/** Báo cáo doanh thu của Owner — toàn bộ số liệu lấy từ `/reports/*`. */
export default function Reports() {
  const { message } = App.useApp()
  const accessibleBranches = useAppStore((s) => s.apiBranches)
  const [preset, setPreset] = useState<RangePreset | "custom">("7d")
  const [range, setRange] = useState<DateRange>(() => presetRange("7d"))
  const [url, setUrl] = useSearchParams()
  const selected = url.get("branch") ?? ALL_BRANCHES
  const setBranchId = (id: string) =>
    setUrl((previous) => {
      const next = new URLSearchParams(previous)
      if (id === ALL_BRANCHES) next.delete("branch")
      else next.set("branch", id)
      return next
    })
  const [granularity, setGranularity] = useState<ReportGranularity>("day")

  const plan = usePlan()
  const scope = useAppStore((s) => s.scopeStatus)
  const chainId = useAppStore((s) => s.chainId)
  const branches = accessibleBranches.filter((b) => b.chainId === chainId)
  const canCompare =
    branches.length > 1 && !!plan.plan && plan.hasFeature("multiBranchCompare")
  const branchId = branches.some((b) => b.id === selected)
    ? selected
    : canCompare
      ? ALL_BRANCHES
      : branches[0]?.id
  const [product, setProduct] = useState<"items" | "combos" | "toppings">(
    "items",
  )
  const [expanded, setExpanded] = useState(false)
  const [productSort, setProductSort] = useState<"quantity" | "revenue">("quantity")
  const [metric, setMetric] = useState<"revenue" | "orders">("revenue")
  /** OW-08: gói có so sánh đa chi nhánh vẽ mỗi chi nhánh một đường trên cùng trục; "Tổng chuỗi" gộp lại thành một đường. */
  const [trendView, setTrendView] = useState<"branches" | "total">("branches")
  const customPrices = useCustomPriceCounts(chainId)
  const params = useMemo(
    () => ({
      ...range,
      chainId: chainId ?? undefined,
      branchIds: branchId === ALL_BRANCHES ? undefined : [branchId!],
    }),
    [range, chainId, branchId],
  )
  const { comparison, previous, trend, products, payments, cancellations } = useReportData(
    params,
    granularity,
    product,
    scope === "ready" && !!branchId,
  )
  // Ghi chú chi nhánh có giá riêng (BR-85) từ ma trận giá của BE; chỉ gọi khi có khối so sánh, lỗi ở đây không làm hỏng khối so sánh.
  const loadOwnPrice = useCallback(() => branchPricesApi.getMatrix(chainId!), [chainId])
  const ownPrice = useReportSection(
    loadOwnPrice,
    scope === "ready" && !!chainId && branchId === ALL_BRANCHES,
  )
  const withOwnPrice = ownPrice.data
    ? branchesWithOwnPrice(ownPrice.data.cells)
    : new Map<string, number>()
  if (scope === "error")
    return <Alert type="error" message="Không tải được phạm vi chi nhánh." />
  if (scope !== "ready") return <Skeleton active />
  if (!branchId)
    return (
      <div>
        <PageHeader title="Tổng quan" sub="Báo cáo doanh thu của chuỗi" />
        <NoBranchState description="Tạo chi nhánh đầu tiên để bắt đầu bán hàng và xem báo cáo doanh thu." />
      </div>
    )

  const compareSeries =
    branchId === ALL_BRANCHES && trendView === "branches" && (trend.data?.series.length ?? 0) > 1
  const points = (trend.data?.buckets ?? []).map((key, i) => {
    const totals = { revenue: 0, orders: 0, refund: 0 }
    for (const series of trend.data!.series) {
      const point = series.points[i]
      totals.revenue += parseAmount(point?.netRevenue ?? point?.revenue)
      totals.orders += point?.orderCount ?? 0
      totals.refund += parseAmount(point?.refundAmount)
    }
    const label = bucketLabel(key, granularity)
    return {
      key,
      label,
      value: totals[metric],
      detail: compareSeries
        ? label + " · " + trend.data!.series.map((s) => {
            const point = s.points[i]
            return s.branch.name + ": " + (metric === "orders" ? formatCount(point?.orderCount ?? 0) + " đơn" : formatVnd(parseAmount(point?.netRevenue ?? point?.revenue)))
          }).join(" · ")
        : label +
          " · " +
          formatVnd(totals.revenue) +
          " · " +
          totals.orders +
          " đơn · đã hoàn " +
          formatVnd(totals.refund),
    }
  })
  const series = compareSeries
    ? trend.data!.series.map((s) => ({
        key: s.branch.id,
        name: s.branch.name,
        values: (trend.data?.buckets ?? []).map((_, i) => {
          const point = s.points[i]
          return metric === "orders" ? point?.orderCount ?? 0 : parseAmount(point?.netRevenue ?? point?.revenue)
        }),
      }))
    : undefined
  const ranks = [...(comparison.data?.branches ?? [])].sort(
    (a, b) => parseAmount(b.revenue) - parseAmount(a.revenue),
  )
  const methods = payments.data?.methods ?? []
  const total = methods.reduce(
    (sum, row) => sum + parseAmount(row.grossSettledAmount),
    0,
  )

  const choosePreset = (next: RangePreset) => {
    setPreset(next)
    setRange(presetRange(next))
  }

  const scopeLabel =
    branchId === ALL_BRANCHES
      ? `Toàn bộ ${branches.length} chi nhánh`
      : (branches.find((b) => b.id === branchId)?.name ?? "Chi nhánh")

  return (
    <div>
      <PageHeader
        title="Tổng quan"
        sub={`${scopeLabel} · ${describeRange(range)} · giờ Việt Nam`}
      />

      {branches.length > 1 && !canCompare && (
        <Alert
          data-testid="report-plan-note"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={`Gói ${plan.tierLabel ?? "hiện tại"} xem báo cáo từng chi nhánh`}
          description={`Chọn một chi nhánh để xem. So sánh các chi nhánh trên cùng biểu đồ có từ gói ${plan.requiredTierLabel("multiBranchCompare") ?? "Tiêu chuẩn"}.`}
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

      <Card
        style={{ borderRadius: 14, marginBottom: 16 }}
        styles={{ body: { padding: 16 } }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
          }}
        >
          <Segmented
            value={preset}
            onChange={(value) => choosePreset(value as RangePreset)}
            options={RANGE_PRESETS.map((p) => ({
              label: p.label,
              value: p.key,
            }))}
          />
          <DatePicker.RangePicker
            allowClear={false}
            format="DD/MM/YYYY"
            value={[dayjs(range.from), dayjs(range.to)]}
            disabledDate={(date) => date.format("YYYY-MM-DD") > todayInVn()}
            onChange={(values) => {
              if (!values?.[0] || !values?.[1]) return
              if (values[1].diff(values[0], "day") + 1 > MAX_RANGE_DAYS) {
                message.warning(`Chỉ xem được tối đa ${MAX_RANGE_DAYS} ngày một lần.`)
                return
              }
              setPreset("custom")
              setRange({
                from: values[0].format("YYYY-MM-DD"),
                to: values[1].format("YYYY-MM-DD"),
              })
            }}
          />
          <Select
            value={branchId}
            onChange={setBranchId}
            style={{ minWidth: 220 }}
            showSearch
            optionFilterProp="label"
            options={[
              ...(canCompare
                ? [
                    {
                      value: ALL_BRANCHES,
                      label: `Tất cả chi nhánh (${branches.length})`,
                    },
                  ]
                : []),
              ...branches.map((b) => ({
                value: b.id,
                label: `${b.name} · ${b.code}`,
              })),
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

      <SectionState section={comparison}>
        <KpiRow comparison={comparison.data} previous={previous.error ? undefined : previous.data} />
      </SectionState>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="Doanh thu theo thời gian">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <Segmented
                value={metric}
                options={[
                  { label: "Doanh thu thuần", value: "revenue" },
                  { label: "Số đơn", value: "orders" },
                ]}
                onChange={setMetric}
              />
              {branchId === ALL_BRANCHES && (
                <Segmented
                  data-testid="trend-view"
                  value={trendView}
                  options={[
                    { label: "Từng chi nhánh", value: "branches" },
                    { label: "Tổng chuỗi", value: "total" },
                  ]}
                  onChange={setTrendView}
                />
              )}
            </div>
            <SectionState section={trend}>
              <ReportChart
                title="Xu hướng bán hàng"
                mode="line"
                points={points}
                series={series}
                format={metric === "orders" ? formatCount : formatVndCompact}
              />
              {range.from === range.to && (
                <div data-testid="single-day-note" style={{ fontSize: 12.5, color: palette.textMuted }}>
                  Khoảng một ngày chỉ có một mốc nên không thấy xu hướng; chọn 7 hoặc 30 ngày để so sánh các ngày với nhau.
                </div>
              )}
            </SectionState>
          </Card>
        </Col>
        {branchId === ALL_BRANCHES && (
          <Col span={24}>
            <Card title="Doanh thu theo chi nhánh">
              <SectionState section={comparison}>
                <BranchRanking
                  ranks={ranks}
                  customPrices={customPrices}
                  colorOf={(id) => seriesColor(Math.max(0, (trend.data?.series ?? []).findIndex((s) => s.branch.id === id)))}
                  onPick={setBranchId}
                />
              </SectionState>
            </Card>
          </Col>
        )}
        <Col xs={24} lg={14}>
          <Card title="Sản phẩm bán chạy">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <Segmented<typeof product>
                value={product}
                options={[
                  { label: "Món", value: "items" },
                  { label: "Combo", value: "combos" },
                  { label: "Topping", value: "toppings" },
                ]}
                onChange={(v) => {
                  setProduct(v)
                  setExpanded(false)
                }}
              />
              <Segmented<typeof productSort>
                data-testid="product-sort"
                value={productSort}
                options={[
                  { label: "Theo số lượng", value: "quantity" },
                  { label: "Theo doanh thu", value: "revenue" },
                ]}
                onChange={setProductSort}
              />
            </div>
            <SectionState section={products}>
              {products.data?.length ? (
                <>
                  {rankProducts(products.data, productSort).slice(0, 5).map((row, i, top) => (
                    <div key={i} style={{ marginTop: 12 }} data-testid="product-row">
                      {row.name} · {productSort === "quantity" ? formatCount(row.quantity) : formatVnd(row.revenue)}
                      <span style={{ color: palette.textMuted, fontSize: 12.5 }}> · {productSort === "quantity" ? formatVnd(row.revenue) : `${formatCount(row.quantity)} suất`}</span>
                      <ShareBar
                        label={row.name}
                        value={productSort === "quantity" ? row.quantity : parseAmount(row.revenue)}
                        max={productSort === "quantity" ? top[0].quantity : parseAmount(top[0].revenue)}
                      />
                    </div>
                  ))}
                  {productSort === "revenue" && (
                    <div style={{ fontSize: 12, color: palette.textSubtle, marginTop: 8 }}>
                      Xếp trong 50 sản phẩm bán nhiều nhất theo số lượng; doanh thu combo không chia về từng món (GĐ-25).
                    </div>
                  )}
                  <Button type="link" onClick={() => setExpanded(!expanded)}>
                    {expanded ? "Ẩn chi tiết" : "Xem bảng chi tiết"}
                  </Button>
                  {expanded && (
                    <Table
                      size="small"
                      dataSource={products.data.map((row, i) => ({
                        ...row,
                        key: i,
                      }))}
                      columns={[
                        { title: "Tên", dataIndex: "name" },
                        { title: "Số lượng", dataIndex: "quantity" },
                        {
                          title: "Doanh thu",
                          dataIndex: "revenue",
                          render: formatVnd,
                        },
                      ]}
                    />
                  )}
                </>
              ) : (
                <p>Chưa có sản phẩm bán trong kỳ.</p>
              )}
            </SectionState>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Tỷ trọng thanh toán">
            <SectionState section={payments}>
              {total > 0 ? (
                <>
                  <p>Theo số tiền ghi nhận trước hoàn</p>
                  {methods.map((row) => {
                    const percent =
                      (100 * parseAmount(row.grossSettledAmount)) / total
                    return (
                      <div key={row.method} data-testid="report-payment-row">
                        {paymentMethodInfo(row.method).label} ·{" "}
                        {formatVnd(row.grossSettledAmount)} ·{" "}
                        {percent.toLocaleString("vi-VN", {
                          maximumFractionDigits: 1,
                        })}
                        %
                        <div style={{ fontSize: 12 }}>
                          Đã hoàn {formatVnd(row.refundAmount)} · sau hoàn{" "}
                          {formatVnd(row.netAmount)} · {formatCount(row.paymentCount)} khoản
                        </div>
                        <ShareBar label={row.method} max={100} value={percent} />
                      </div>
                    )
                  })}
                </>
              ) : (
                <p>Chưa có tiền thanh toán trong kỳ.</p>
              )}
            </SectionState>
          </Card>
        </Col>
        <Col span={24}>
          <LedgerByBranch chainId={chainId ?? undefined} range={range} />
          <Card title="Đơn huỷ và hoàn tiền">
            <SectionState section={cancellations}>
              <CancellationsSection data={cancellations.data} />
            </SectionState>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

/** Sắp xếp danh sách bán chạy theo số lượng (thứ tự BE) hoặc theo doanh thu; không đổi dữ liệu. */
export function rankProducts<T extends { quantity: number; revenue: string }>(rows: T[], by: "quantity" | "revenue"): T[] {
  if (by === "quantity") return rows
  return [...rows].sort((a, b) => parseAmount(b.revenue) - parseAmount(a.revenue))
}

/** Mục 29.4 / dòng 956: số giá riêng đang đặt ở từng chi nhánh, để đọc so sánh doanh thu đúng ngữ cảnh. Lỗi tải thì bỏ qua ghi chú. */
function useCustomPriceCounts(chainId: string | null | undefined) {
  const [counts, setCounts] = useState<Map<string, number>>()
  useEffect(() => {
    if (!chainId) return
    let alive = true
    branchPricesApi.getMatrix(chainId).then(
      (matrix) => {
        if (!alive) return
        const next = new Map<string, number>()
        for (const cell of matrix.cells) if (cell.priceOverride !== null) next.set(cell.branchId, (next.get(cell.branchId) ?? 0) + 1)
        setCounts(next)
      },
      () => {
        if (alive) setCounts(undefined)
      },
    )
    return () => {
      alive = false
    }
  }, [chainId])
  return counts
}

function BranchRanking({
  ranks,
  customPrices,
  colorOf,
  onPick,
}: {
  ranks: RevenueComparison["branches"]
  customPrices?: Map<string, number>
  colorOf: (branchId: string) => string
  onPick: (branchId: string) => void
}) {
  const total = ranks.reduce((sum, r) => sum + Math.max(0, parseAmount(r.revenue)), 0)
  const max = Math.max(1, ...ranks.map((r) => parseAmount(r.revenue)))
  return (
    <div data-testid="branch-ranking" style={{ display: "grid", gap: 12 }}>
      {ranks.map((row) => {
        const revenue = parseAmount(row.revenue)
        const share = total > 0 ? (100 * Math.max(0, revenue)) / total : 0
        const custom = customPrices?.get(row.branch.id) ?? 0
        return (
          <div key={row.branch.id} data-testid={`branch-rank-${row.branch.id}`}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 8 }}>
              <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: colorOf(row.branch.id) }} />
              <Button type="link" style={{ padding: 0, height: "auto" }} onClick={() => onPick(row.branch.id)}>
                {row.branch.name}
              </Button>
              <b>{formatVnd(row.revenue)}</b>
              <span style={{ color: palette.textMuted, fontSize: 12.5 }}>
                {share.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}% · {formatCount(row.orderCount)} đơn · TB {formatVnd(row.averageOrderValue)}
                {custom > 0 && <> · <span data-testid="branch-custom-prices">{custom} giá riêng</span></>}
              </span>
            </div>
            <div aria-hidden style={{ height: 8, borderRadius: 4, background: palette.paperSubtle, marginTop: 4 }}>
              <div style={{ width: `${Math.max(0, (100 * revenue) / max)}%`, height: "100%", borderRadius: 4, background: colorOf(row.branch.id) }} />
            </div>
          </div>
        )
      })}
      {customPrices && [...customPrices.values()].some((n) => n > 0) && (
        <div style={{ fontSize: 12.5, color: palette.textMuted }}>
          Chi nhánh có giá riêng bán khác giá chuỗi; doanh thu không quy đổi về cùng một giá (GĐ-26).
        </div>
      )}
    </div>
  )
}

const personName = (p: { firstName?: string; lastName?: string; employeeCode?: string } | null) =>
  p ? [p.firstName, p.lastName].filter(Boolean).join(" ").trim() || p.employeeCode || "—" : "—"

/** BR-50: hoàn tiền trừ vào ngày huỷ; mục này cho biết đơn nào bị huỷ, ai huỷ và ai hoàn. */
function CancellationsSection({ data }: { data?: ReportCancellations }) {
  if (!data) return null
  if (data.total === 0 && data.paidCancellationCount === 0) return <p>Không có đơn huỷ trong kỳ.</p>
  return (
    <div data-testid="report-cancellations">
      <p style={{ marginTop: 0 }}>
        {formatCount(data.total)} đơn huỷ · {formatCount(data.paidCancellationCount)} đơn huỷ sau khi trả · đã hoàn {formatVnd(data.refundAmount)}
        {parseAmount(data.pendingRefundAmount) > 0 && <> · còn chờ hoàn {formatVnd(data.pendingRefundAmount)}</>}
        {data.total > data.items.length && <> · hiện {data.items.length} đơn gần nhất</>}
      </p>
      <Table
        size="small"
        rowKey="id"
        pagination={false}
        scroll={{ x: 760 }}
        dataSource={data.items}
        columns={[
          { title: "Chi nhánh", render: (_, row) => row.branch.name },
          { title: "Mã đơn", dataIndex: "orderCode" },
          { title: "Thời điểm huỷ", dataIndex: "cancelledAt", render: (v: string | null) => formatDateTime(v) },
          { title: "Tổng tiền", dataIndex: "totalAmount", align: "right", render: (v: string) => formatVnd(v) },
          { title: "Đã hoàn", dataIndex: "refundAmount", align: "right", render: (v: string) => (parseAmount(v) > 0 ? formatVnd(v) : "—") },
          { title: "Người huỷ", render: (_, row) => personName(row.cancelledBy) },
          { title: "Người hoàn", render: (_, row) => [...new Set(row.refunds.map((r) => personName(r.completedBy)).filter((n) => n !== "—"))].join(", ") || "—" },
          { title: "Lý do", dataIndex: "reason", render: (v: string | null) => v ?? "—" },
        ]}
      />
    </div>
  )
}

function SectionState({
  section,
  children,
}: {
  section: {
    loading: boolean
    error?: string
    reload: () => void
  }
  children: React.ReactNode
}) {
  if (section.error)
    return (
      <Alert
        type="error"
        showIcon
        message={section.error}
        action={<Button onClick={section.reload}>Thử lại</Button>}
      />
    )
  return section.loading ? <Skeleton active /> : <>{children}</>
}

function KpiRow({ comparison, previous }: { comparison?: RevenueComparison; previous?: RevenueComparison }) {
  const k = summarizeKpi(comparison)
  const p = previous ? summarizeKpi(previous) : null
  const delta = (current: number | null, before: number | null | undefined, higherIsBetter = true) =>
    p ? { ratio: changeRatio(current, before), higherIsBetter } : undefined

  const tiles = [
    {
      key: "revenue",
      label: "Doanh thu (sau hoàn)",
      value: formatVnd(k.netRevenue),
      hint: `Gộp ${formatVnd(k.grossRevenue)} · đã hoàn ${formatVnd(k.refundAmount)}`,
      icon: <Banknote size={16} />,
      emphasis: true,
      delta: delta(k.netRevenue, p?.netRevenue),
    },
    {
      key: "orders",
      label: "Số đơn hoàn tất",
      value: formatCount(k.orderCount),
      icon: <ReceiptText size={16} />,
      delta: delta(k.orderCount, p?.orderCount),
    },
    {
      key: "aov",
      label: "Giá trị đơn trung bình",
      value:
        k.averageOrderValue === null ? "—" : formatVnd(k.averageOrderValue),
      hint: k.averageOrderValue === null ? undefined : "đơn hoàn tất, không tính đơn huỷ",
      icon: <Wallet size={16} />,
      delta: delta(k.averageOrderValue, p?.averageOrderValue),
    },
    {
      key: "cancelled",
      label: "Đơn huỷ sau thanh toán",
      value: formatCount(k.paidCancellationCount),
      hint: `Số tiền hoàn ${formatVnd(k.refundAmount)} (trừ vào ngày huỷ)`,
      icon: <Undo2 size={16} />,
      delta: delta(k.refundAmount, p?.refundAmount, false),
    },
    {
      key: "cash-refund",
      label: "Tiền mặt đã hoàn",
      // BR-81, BR-83: mọi khoản hoàn đều là tiền mặt tại quầy, bất kể đơn gốc trả tiền mặt hay QR, nên đây là TỔNG hoàn BE gom theo
      // ngày huỷ (totals.refundAmount). BE chưa có số "tiền mặt đã hoàn" riêng.
      value: formatVnd(k.refundAmount),
      icon: <Coins size={16} />,
    },
    {
      key: "pending",
      label: "Đang chờ hoàn",
      value: formatVnd(k.pendingRefundAmount),
      icon: <Hourglass size={16} />,
    },
  ]

  return (
    <Row gutter={[16, 16]}>
      {tiles.map((tile) => (
        <Col
          xs={12}
          md={8}
          key={tile.key}
          data-testid={`report-kpi-${tile.key}`}
        >
          <StatCard
            label={tile.label}
            value={tile.value}
            hint={tile.hint}
            icon={tile.icon}
            emphasis={tile.emphasis}
            delta={"delta" in tile ? tile.delta : undefined}
          />
        </Col>
      ))}
    </Row>
  )
}
