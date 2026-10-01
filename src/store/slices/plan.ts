/**
 * Gói dịch vụ của doanh nghiệp (OW-10): cấp, hạn mức, tính năng, trạng thái. `loadScope` (slice auth) ghi `plan`;
 * màn hình đọc qua `usePlan()` (src/plan), không đọc trực tiếp.
 */
import type { PlanInfo } from "../../types";
import type { SliceCreator } from "../types";

export interface PlanSlice {
  plan: PlanInfo | null;
}

export const createPlanSlice: SliceCreator<PlanSlice> = () => ({
  plan: null,
});
