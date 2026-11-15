import { useCallback } from "react"
import { reportApi } from "../../api"
import { useReportSection } from "../../components/useReportSection"
import type { ReportRangeParams, ReportGranularity } from "../../types"
import { previousRange } from "../../lib/reportFormat"

export function useReportData(
  params: ReportRangeParams,
  granularity: ReportGranularity,
  product: "items" | "combos" | "toppings",
  enabled: boolean,
) {
  const comparison = useReportSection(
    useCallback(() => reportApi.getRevenueComparison(params), [params]),
    enabled,
  )
  // Cùng phạm vi chi nhánh, kỳ liền trước có cùng số ngày: số "so với kỳ trước" trên thẻ.
  const previous = useReportSection(
    useCallback(
      () => reportApi.getRevenueComparison({ ...params, ...previousRange({ from: params.from!, to: params.to! }) }),
      [params],
    ),
    enabled && !!params.from && !!params.to,
  )
  const trend = useReportSection(
    useCallback(
      () => reportApi.getRevenueTimeseries({ ...params, granularity }),
      [params, granularity],
    ),
    enabled,
  )
  const products = useReportSection(
    useCallback(async () => {
      const query = { ...params, limit: 50 }
      if (product === "items") {
        const { items } = await reportApi.getTopItems(query)
        return items.map((row) => ({
          name: row.menuItem.name ?? "Món đã xoá",
          quantity: row.quantity,
          revenue: row.revenue,
        }))
      }
      if (product === "combos") {
        const { items } = await reportApi.getTopCombos(query)
        return items.map((row) => ({ name: row.name, quantity: row.quantity, revenue: row.revenue }))
      }
      // Topping: BE trả tiền cộng thêm ở additionalRevenue; tên có thể null khi tuỳ chọn đã bị xoá.
      const { items } = await reportApi.getTopToppings(query)
      return items.map((row) => ({
        name: row.name ?? "Topping đã xoá",
        quantity: row.quantity,
        revenue: row.additionalRevenue,
      }))
    }, [params, product]),
    enabled,
  )
  const payments = useReportSection(
    useCallback(() => reportApi.getPaymentMethods(params), [params]),
    enabled,
  )
  const cancellations = useReportSection(
    useCallback(() => reportApi.getCancellations({ ...params, limit: 10 }), [params]),
    enabled,
  )
  return { comparison, previous, trend, products, payments, cancellations }
}
