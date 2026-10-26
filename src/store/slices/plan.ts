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
  /**
   * Mốc hết hạn đã qua mà gói trong store còn `active` (tab mở qua mốc): nạp lại gói MỘT lần. Gọi khi tab được focus lại hoặc đổi route
   * (lượt 10.2, `plan/planClock.ts`). Có chống lặp, không polling.
   */
  refreshPlanIfStale: () => Promise<void>;
  /**
   * BE vừa trả 403 "chế độ chỉ đọc" lúc đang ghi mà gói trong store vẫn `active`: nạp lại gói để nhãn và banner chuyển ngay sang hết hạn.
   * Chống lặp: tối đa một lần mỗi `PLAN_RELOAD_COOLDOWN_MS`, và không làm gì nếu gói đã ghi nhận là hết hạn/tạm ngưng.
   */
  refreshPlanAfterReadOnly: () => Promise<void>;
}

export const PLAN_RELOAD_COOLDOWN_MS = 10_000;
let lastGuardedReloadAt = 0;

/** Chỉ cho test: xoá bộ nhớ chống lặp. */
export function resetPlanReloadGuard(): void {
  lastGuardedReloadAt = 0;
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

  refreshPlanIfStale: async () => {
    const { plan } = get();
    if (!plan || (plan.status !== "active" && plan.status !== null)) return;
    const expiry = plan.expiresAt ? Date.parse(plan.expiresAt) : NaN;
    if (Number.isNaN(expiry) || expiry > Date.now()) return;
    await guardedReload(get);
  },

  refreshPlanAfterReadOnly: async () => {
    const { plan } = get();
    if (plan && (plan.status === "expired" || plan.status === "suspended")) return;
    await guardedReload(get);
  },
});

async function guardedReload(get: () => PlanSlice): Promise<void> {
  const now = Date.now();
  if (now - lastGuardedReloadAt < PLAN_RELOAD_COOLDOWN_MS) return;
  lastGuardedReloadAt = now;
  await get().reloadPlan();
}
