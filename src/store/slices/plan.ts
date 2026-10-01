/**
 * Gói dịch vụ và hạn mức của doanh nghiệp (OW-10).
 * `loadScope` (slice auth) là nơi ghi hai trường này sau khi đọc `/restaurant-chains`.
 */
import type { ApiPlan, ApiQuota } from "../../services/branchApi";
import type { SliceCreator } from "../types";

export interface PlanSlice {
  /** Gói dịch vụ và hạn mức — chỉ OWNER đọc được, MANAGER nhận 403 nên để null. */
  plan: ApiPlan | null;
  quotas: ApiQuota[];
}

export const createPlanSlice: SliceCreator<PlanSlice> = () => ({
  plan: null,
  quotas: [],
});
