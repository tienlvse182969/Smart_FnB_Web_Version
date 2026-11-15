import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, expect, it, vi } from "vitest"
import { useAppStore } from "../../store"
import { reportApi } from "../../api"
import Reports from "./Reports"
import { subscriptionPoints } from "../admin/SubscriptionChart"
import type { PlatformRevenueReport } from "../../types"

vi.mock("../../api", () => ({
  reportApi: {
    getRevenueComparison: vi.fn(),
    getRevenueTimeseries: vi.fn(),
    getTopItems: vi.fn(),
    getPaymentMethods: vi.fn(),
  },
  // LedgerByBranch và ghi chú giá riêng gọi API khác; trong test khối sổ theo chi nhánh để ở trạng thái đang tải, không chen vào "Thử lại" của khối kiểm thử.
  ledgerApi: { getChainLedger: vi.fn(() => new Promise(() => undefined)) },
  branchPricesApi: { getMatrix: vi.fn().mockResolvedValue({ cells: [] }) },
  describeApiError: (error: unknown) => (error instanceof Error ? error.message : "Lỗi"),
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
  vi.mocked(reportApi.getPaymentMethods).mockResolvedValue({ methods: [] } as never)
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
})
