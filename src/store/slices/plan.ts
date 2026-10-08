/**
 * Gói dịch vụ của doanh nghiệp (OW-10): cấp, hạn mức, tính năng, trạng thái. `loadScope` (slice auth) ghi `plan`;
 * màn hình đọc qua `usePlan()` (src/plan), không đọc trực tiếp.
 */
import type { PlanInfo } from "../../types";
import { branchApi, planApi } from "../../api";
import type { SliceCreator } from "../types";

export interface PlanSlice {
  plan: PlanInfo | null;
  /**
   * Nạp lại CHỈ gói (không đụng khu vực làm việc): nút "Thử lại" nhỏ ở dòng hạn mức khi Manager chưa tải được gói (quyết định 53).
   * Lỗi thì im lặng, giữ gói hiện có (không toast, không chặn gì).
   */
  reloadPlan: () => Promise<void>;
}

export const createPlanSlice: SliceCreator<PlanSlice> = (set, get) => ({
  plan: null,

  reloadPlan: async () => {
    const { chainId, currentUser } = get();
    if (!chainId || !currentUser || currentUser.role === "admin") return;
    try {
      const chains = currentUser.role === "owner" ? await branchApi.listChains() : undefined;
      set({ plan: await planApi.getPlan(chainId, { chains }) });
    } catch {
      // giữ gói hiện có
    }
  },
});
