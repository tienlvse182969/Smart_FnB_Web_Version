/**
 * Module plan — gói dịch vụ của doanh nghiệp (OW-10, đặc tả 13).
 *
 * Bản real (BE `de4f55c`, #38): trạng thái, hạn dùng, hạn mức và hai cờ tính năng lấy THẬT — Owner từ `/restaurant-chains`
 * (`subscription`), Manager từ `/restaurant-chains/:chainId/subscription`. Cấp gói và cờ AI vẫn suy từ mã gói (#30).
 */
import type { ApiChain, PlanInfo } from "../../../types";
import { defineApi } from "../../define";
import { planMock } from "./mock";
import { planReal } from "./real";

export interface GetPlanOptions {
  /**
   * Chuỗi Owner đã đọc được (`/restaurant-chains`). Manager không đọc được nên không truyền → real gọi
   * `GET /restaurant-chains/:chainId/subscription`; lỗi thì trả `subscriptionUnavailable` thay vì ném (quyết định 53).
   */
  chains?: ApiChain[];
}

export interface PlanApi {
  getPlan(chainId: string, options?: GetPlanOptions): Promise<PlanInfo>;
}

export const planApi = defineApi<PlanApi>("plan", { real: planReal, mock: planMock });
