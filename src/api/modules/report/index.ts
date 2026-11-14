/** Module report — báo cáo doanh thu. Chỉ OWNER gọi được (real). */
import type {
  ReportGranularity,
  ReportRangeParams,
  RevenueComparison,
  RevenueTimeseries,
  TopItems,
} from "../../../types";
import { defineApi } from "../../define";
import { reportMock } from "./mock";
import { reportReal } from "./real";

export interface RankedProduct { name: string; quantity: number; revenue: string }
export interface ReportApi {
  getTopCombos(params: ReportRangeParams & { limit?: number }): Promise<{ items: RankedProduct[] }>;
  getTopToppings(params: ReportRangeParams & { limit?: number }): Promise<{ items: RankedProduct[] }>;
  getPaymentMethods(params: ReportRangeParams): Promise<{ methods: { method: string; grossSettledAmount: string }[] }>;
  getRevenueComparison(params?: ReportRangeParams): Promise<RevenueComparison>;
  getRevenueTimeseries(params?: ReportRangeParams & { granularity?: ReportGranularity }): Promise<RevenueTimeseries>;
  getTopItems(params?: ReportRangeParams & { limit?: number }): Promise<TopItems>;
}

export const reportApi = defineApi<ReportApi>("report", { real: reportReal, mock: reportMock });
