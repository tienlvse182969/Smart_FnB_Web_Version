/**
 * Module plan — gói dịch vụ của doanh nghiệp (OW-10, đặc tả 13).
 *
 * Bản real: hạn mức lấy THẬT từ `/restaurant-chains` (subscription.quotas); cấp gói, cờ tính năng, trạng thái và
 * hạn dùng vẫn là mock cho tới khi BE trả (CHỜ BE — xem docs/api-contract-plan.md).
 */
import type { ApiChain, PlanInfo } from "../../../types";
import { defineApi } from "../../define";
import { planMock } from "./mock";
import { planReal } from "./real";

export interface GetPlanOptions {
  /**
   * Chuỗi Owner đã đọc được (`/restaurant-chains`). Manager không đọc được nên không truyền → hạn mức
   * để trống (vẫn có tính năng/trạng thái để khoá giao diện).
   */
  chains?: ApiChain[];
}

export interface PlanApi {
  getPlan(chainId: string, options?: GetPlanOptions): Promise<PlanInfo>;
}

export const planApi = defineApi<PlanApi>("plan", { real: planReal, mock: planMock });
