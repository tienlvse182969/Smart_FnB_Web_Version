import { useCallback } from "react"
import { reportApi } from "../../api"
import { useReportSection } from "../../components/useReportSection"
import type { ReportRangeParams, ReportGranularity } from "../../types"

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
      const result =
        product === "combos"
          ? await reportApi.getTopCombos(query)
          : await reportApi.getTopToppings(query)
      return result.items
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
  return { comparison, trend, products, payments, cancellations }
}
