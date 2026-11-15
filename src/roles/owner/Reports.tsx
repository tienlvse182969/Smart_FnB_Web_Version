import { useCallback, useMemo, useState } from "react"
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
import { SectionTitle, StatCard } from "../../components/bits"
import { useAppStore } from "../../store"
import type { ReportGranularity, RevenueComparison } from "../../types"
import { Link, useSearchParams } from "react-router-dom"
import { usePlan } from "../../plan/usePlan"
import ReportChart from "../../components/ReportChart"
import { paymentMethodInfo } from "../../api/modules/order/codes"
import { branchPricesApi } from "../../api"
import { useReportSection } from "../../components/useReportSection"
import LedgerByBranch from "./LedgerByBranch"
import { branchesWithOwnPrice } from "./reportScope"
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
  const [metric, setMetric] = useState<"revenue" | "orders">("revenue")
  const params = useMemo(
    () => ({
      ...range,
      chainId: chainId ?? undefined,
      branchIds: branchId === ALL_BRANCHES ? undefined : [branchId!],
    }),
    [range, chainId, branchId],
  )
  const { comparison, trend, products, payments } = useReportData(
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
      <Card>
        Chưa có chi nhánh để xem báo cáo.{" "}
        <Link to="/brand-manager/branches">Quản lý chi nhánh</Link>
      </Card>
    )

  const points = (trend.data?.buckets ?? []).map((key, i) => {
    const totals = { revenue: 0, orders: 0, refund: 0 }
    for (const series of trend.data!.series) {
      const point = series.points[i]
      totals.revenue += parseAmount(point?.netRevenue ?? point?.revenue)
      totals.orders += point?.orderCount ?? 0
      totals.refund += parseAmount(point?.refundAmount)
    }
    return {
      key,
      label: formatDayLabel(key),
      value: totals[metric],
      detail:
        key +
        " · " +
        formatVnd(totals.revenue) +
        " · " +
        totals.orders +
        " đơn · đã hoàn " +
        formatVnd(totals.refund),
    }
  })
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
      <SectionTitle
        title="Báo cáo doanh thu"
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
        <KpiRow comparison={comparison.data} />
      </SectionState>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="Doanh thu theo thời gian">
            <Segmented
              value={metric}
              options={[
                { label: "Doanh thu thuần", value: "revenue" },
                { label: "Số đơn", value: "orders" },
              ]}
              onChange={setMetric}
            />
            <SectionState section={trend}>
              <ReportChart
                title="Xu hướng bán hàng"
                mode="line"
                points={points}
                format={metric === "orders" ? formatCount : formatVndCompact}
              />
            </SectionState>
          </Card>
        </Col>
        {branchId === ALL_BRANCHES && (
          <Col span={24}>
            <Card title="Doanh thu theo chi nhánh">
              <SectionState section={comparison}>
                {ranks.map((row) => (
                  <div key={row.branch.id}>
                    <Button
                      type="link"
                      onClick={() => setBranchId(row.branch.id)}
                    >
                      {row.branch.name}
                    </Button>
                    {withOwnPrice.get(row.branch.id) ? (
                      <Tag color="blue" data-testid="report-own-price-tag">
                        Có giá riêng ({withOwnPrice.get(row.branch.id)})
                      </Tag>
                    ) : null}{" "}
                    {formatVnd(row.revenue)}
                    <meter
                      style={{ width: "100%" }}
                      aria-label={row.branch.name}
                      min={Math.min(
                        0,
                        ...ranks.map((r) => parseAmount(r.revenue)),
                      )}
                      max={Math.max(
                        1,
                        ...ranks.map((r) => parseAmount(r.revenue)),
                      )}
                      value={parseAmount(row.revenue)}
                    />
                  </div>
                ))}
              </SectionState>
            </Card>
          </Col>
        )}
        <Col xs={24} lg={14}>
          <Card title="Sản phẩm bán chạy">
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
            <SectionState section={products}>
              {products.data?.length ? (
                <>
                  {products.data.slice(0, 5).map((row, i) => (
                    <div key={i} style={{ marginTop: 12 }}>
                      {row.name} · {formatCount(row.quantity)}
                      <progress
                        aria-label={row.name}
                        style={{ width: "100%" }}
                        value={row.quantity}
                        max={products.data![0].quantity || 1}
                      />
                    </div>
                  ))}
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
                        <progress
                          aria-label={row.method}
                          style={{ width: "100%" }}
                          max={100}
                          value={percent}
                        />
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
        </Col>
      </Row>
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

function KpiRow({ comparison }: { comparison?: RevenueComparison }) {
  const k = summarizeKpi(comparison)

  const tiles = [
    {
      key: "revenue",
      label: "Doanh thu (sau hoàn)",
      value: formatVnd(k.netRevenue),
      hint: `Gộp ${formatVnd(k.grossRevenue)} · đã hoàn ${formatVnd(k.refundAmount)}`,
      icon: <Banknote size={16} />,
      emphasis: true,
    },
    {
      key: "orders",
      label: "Số đơn hoàn tất",
      value: formatCount(k.orderCount),
      icon: <ReceiptText size={16} />,
    },
    {
      key: "aov",
      label: "Giá trị đơn trung bình",
      value:
        k.averageOrderValue === null ? "—" : formatVnd(k.averageOrderValue),
      hint:
        k.averageOrderValue === null ? "Chọn một chi nhánh để xem" : undefined,
      icon: <Wallet size={16} />,
    },
    {
      key: "cancelled",
      label: "Đơn huỷ sau thanh toán",
      value: formatCount(k.paidCancellationCount),
      hint: `Số tiền hoàn ${formatVnd(k.refundAmount)} (trừ vào ngày huỷ)`,
      icon: <Undo2 size={16} />,
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
          />
        </Col>
      ))}
    </Row>
  )
}
