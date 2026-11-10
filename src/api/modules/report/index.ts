/** Module report — báo cáo doanh thu. Chỉ OWNER gọi được (real). */
import type {
  PaymentMethodsReport,
  ReportGranularity,
  ReportRangeParams,
  RevenueComparison,
  RevenueTimeseries,
  TopCombos,
  TopItems,
  TopToppings,
} from "../../../types";
import { defineApi } from "../../define";
import { reportMock } from "./mock";
import { reportReal } from "./real";

/** `signal` huỷ request đang chờ khi người dùng đổi bộ lọc (bản mock bỏ qua). */
export interface ReportCallOptions {
  signal?: AbortSignal;
}

export interface ReportApi {
  getRevenueComparison(params?: ReportRangeParams & ReportCallOptions): Promise<RevenueComparison>;
  getRevenueTimeseries(
    params?: ReportRangeParams & ReportCallOptions & { granularity?: ReportGranularity },
  ): Promise<RevenueTimeseries>;
  getTopItems(params?: ReportRangeParams & ReportCallOptions & { limit?: number }): Promise<TopItems>;
  /** Doanh thu theo hình thức thanh toán, giữ hình thức gốc; tiền hoàn tách riêng (BR-83). */
  getPaymentMethods(params?: ReportRangeParams & ReportCallOptions): Promise<PaymentMethodsReport>;
  getTopCombos(params?: ReportRangeParams & ReportCallOptions & { limit?: number }): Promise<TopCombos>;
  getTopToppings(params?: ReportRangeParams & ReportCallOptions & { limit?: number }): Promise<TopToppings>;
}

export const reportApi = defineApi<ReportApi>("report", { real: reportReal, mock: reportMock });
