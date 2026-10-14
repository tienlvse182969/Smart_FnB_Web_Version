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

export interface ReportApi {
  getRevenueComparison(params?: ReportRangeParams): Promise<RevenueComparison>;
  getRevenueTimeseries(params?: ReportRangeParams & { granularity?: ReportGranularity }): Promise<RevenueTimeseries>;
  getTopItems(params?: ReportRangeParams & { limit?: number }): Promise<TopItems>;
}

export const reportApi = defineApi<ReportApi>("report", { real: reportReal, mock: reportMock });
