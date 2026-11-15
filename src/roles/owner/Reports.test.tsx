import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, expect, it, vi } from "vitest"
import { useAppStore } from "../../store"
import { branchPricesApi, reportApi } from "../../api"
import Reports from "./Reports"
import { subscriptionPoints } from "../admin/SubscriptionChart"
import type { PlatformRevenueReport } from "../../types"

vi.mock("../../api", () => ({
  reportApi: {
    getRevenueComparison: vi.fn(),
    getRevenueTimeseries: vi.fn(),
    getTopItems: vi.fn(),
    getPaymentMethods: vi.fn(),
    getCancellations: vi.fn(),
  },
  branchPricesApi: { getMatrix: vi.fn() },
}))
vi.stubGlobal("matchMedia", () => ({
  matches: false,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
}))
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)
const original = useAppStore.getState()
afterEach(() => {
  useAppStore.setState(original)
  vi.resetAllMocks()
})
const noCancellations = { total: 0, paidCancellationCount: 0, refundAmount: "0", pendingRefundAmount: "0", limit: 10, items: [] }

it("loads one branch on Basic, renders a refund-only day and retries only the failed section", async () => {
  useAppStore.setState({
    scopeStatus: "ready",
    chainId: "c",
    apiBranches: ["a", "b"].map((id) => ({
      id,
      chainId: "c",
      name: id,
      code: id,
    })) as never,
    plan: { features: { multiBranchCompare: { enabled: false } } } as never,
  })
  vi.mocked(reportApi.getRevenueComparison).mockResolvedValue({
    branches: [],
    totals: {},
  } as never)
  vi.mocked(reportApi.getRevenueTimeseries).mockResolvedValue({
    buckets: ["2026-11-02"],
    series: [
      {
        points: [
          { netRevenue: "-100000", refundAmount: "100000", orderCount: 0 },
        ],
      },
    ],
  } as never)
  vi.mocked(reportApi.getPaymentMethods).mockResolvedValue({ methods: [] })
  vi.mocked(reportApi.getCancellations).mockResolvedValue(noCancellations)
  vi.mocked(branchPricesApi.getMatrix).mockResolvedValue({ cells: [] } as never)
  vi.mocked(reportApi.getTopItems)
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue({ items: [] } as never)
  render(
    <MemoryRouter initialEntries={["/brand-manager/reports?branch=__all__"]}>
      <Reports />
    </MemoryRouter>,
  )
  await waitFor(() =>
    expect(document.querySelector('[data-value="-100000"]')).toBeTruthy(),
  )
  expect(reportApi.getRevenueComparison).toHaveBeenCalledWith(
    expect.objectContaining({ branchIds: ["a"] }),
  )
  expect(screen.queryByText("Doanh thu theo chi nhánh")).toBeNull()
  fireEvent.click(await screen.findByText("Thử lại"))
  expect(await screen.findByText("Chưa có sản phẩm bán trong kỳ.")).toBeTruthy()
  expect(reportApi.getRevenueTimeseries).toHaveBeenCalledTimes(1)
})

it("compares branches on one chart, labels months, shows chain AOV, price overrides and cancellations (OW-08, BR-50)", async () => {
  useAppStore.setState({
    scopeStatus: "ready",
    chainId: "c",
    apiBranches: ["a", "b"].map((id) => ({ id, chainId: "c", name: "CN " + id, code: id })) as never,
    plan: { features: { multiBranchCompare: { enabled: true } } } as never,
  })
  vi.mocked(reportApi.getRevenueComparison).mockResolvedValue({
    totals: { revenue: "500000", grossRevenue: "500000", refundAmount: "0", pendingRefundAmount: "0", netRevenue: "500000", paidCancellationCount: 0, orderCount: 4, averageOrderValue: "125000.00" },
    branches: [
      { branch: { id: "a", name: "CN a" }, revenue: "300000", orderCount: 2, averageOrderValue: "150000.00" },
      { branch: { id: "b", name: "CN b" }, revenue: "200000", orderCount: 2, averageOrderValue: "100000.00" },
    ],
  } as never)
  vi.mocked(reportApi.getRevenueTimeseries).mockResolvedValue({
    buckets: ["2026-10-01", "2026-11-01"],
    series: [
      { branch: { id: "a", name: "CN a" }, points: [{ netRevenue: "100000", orderCount: 1 }, { netRevenue: "200000", orderCount: 1 }] },
      { branch: { id: "b", name: "CN b" }, points: [{ netRevenue: "50000", orderCount: 1 }, { netRevenue: "150000", orderCount: 1 }] },
    ],
  } as never)
  vi.mocked(reportApi.getPaymentMethods).mockResolvedValue({ methods: [] })
  vi.mocked(reportApi.getTopItems).mockResolvedValue({ items: [] } as never)
  vi.mocked(branchPricesApi.getMatrix).mockResolvedValue({ cells: [{ branchId: "b", priceOverride: 30000 }, { branchId: "b", priceOverride: null }, { branchId: "a", priceOverride: null }] } as never)
  vi.mocked(reportApi.getCancellations).mockResolvedValue({
    total: 1, paidCancellationCount: 1, refundAmount: "45000", pendingRefundAmount: "0", limit: 10,
    items: [{ id: "o1", orderCode: "CTR-9", callNumber: 9, totalAmount: "45000", cancelledAt: "2026-11-02T03:00:00Z", reason: "Hết món", branch: { id: "a", name: "CN a" }, cancelledBy: { firstName: "Lan" }, refundAmount: "45000", refunds: [{ id: "r1", amount: "45000", status: "COMPLETED", completedBy: { firstName: "Minh", lastName: "Lê" } }] }],
  })
  render(
    <MemoryRouter initialEntries={["/brand-manager/reports"]}>
      <Reports />
    </MemoryRouter>,
  )
  await waitFor(() => expect(document.querySelectorAll("[data-series]").length).toBe(2))
  expect(screen.getByTestId("chart-legend").textContent).toContain("CN a")
  expect(screen.getByTestId("chart-legend").textContent).toContain("CN b")
  // Chain-wide AOV comes from BE totals instead of being hidden.
  expect(screen.getByTestId("report-kpi-aov").textContent).toContain("125.000")
  expect(await screen.findByTestId("branch-custom-prices")).toBeTruthy()
  expect(screen.getByTestId("branch-rank-b").textContent).toContain("1 giá riêng")
  expect(screen.getByTestId("branch-rank-a").textContent).toContain("60%")
  const cancelled = await screen.findByTestId("report-cancellations")
  expect(cancelled.textContent).toContain("Minh Lê")
  expect(cancelled.textContent).toContain("Lan")
  // Previous period gets the same branches and the 7 days before (default preset).
  const calls = vi.mocked(reportApi.getRevenueComparison).mock.calls.map((c) => c[0]!)
  expect(calls.length).toBe(2)
  expect(calls[1].from! < calls[0].from!).toBe(true)
  // Same numbers both periods → flat delta on the revenue card.
  expect(screen.getByTestId("report-kpi-revenue").textContent).toContain("±0%")
  // "Tổng chuỗi" collapses the comparison back into one line.
  fireEvent.click(screen.getByText("Tổng chuỗi"))
  await waitFor(() => expect(document.querySelectorAll("[data-series]").length).toBe(0))
})

it("labels week and month buckets instead of DD/MM", async () => {
  const { bucketLabel } = await import("../branch/reportFilters")
  expect(bucketLabel("2026-11-01", "month")).toBe("11/2026")
  expect(bucketLabel("2026-11-02", "week")).toBe("Tuần 02/11")
})

it("fills missing subscription days in Vietnam time and preserves the collected total", () => {
  const points = subscriptionPoints({
    range: {
      from: "2026-10-31T17:00:00Z",
      to: "2026-11-02T17:00:00Z",
      groupBy: "day",
    },
    series: [{ period: "2026-11-02", revenue: 300000, invoiceCount: 1 }],
  } as PlatformRevenueReport)
  expect(points.map((p) => [p.key, p.value])).toEqual([
    ["2026-11-01", 0],
    ["2026-11-02", 300000],
    ["2026-11-03", 0],
  ])
  // Hộp số liệu dùng ngày kiểu Việt Nam, không hiện "2026-11-02".
  expect(points[1].label).toBe("02/11")
  expect(points[1].detail.startsWith("02/11/2026 · ")).toBe(true)
  const months = subscriptionPoints({
    range: { from: "2026-09-30T17:00:00Z", to: "2026-10-31T16:59:59Z", groupBy: "month" },
    series: [{ period: "2026-10", revenue: 798000, invoiceCount: 2 }],
  } as PlatformRevenueReport)
  expect(months.map((p) => p.label)).toEqual(["10/2026"])
  expect(months[0].detail.startsWith("Tháng 10/2026 · ")).toBe(true)
})
