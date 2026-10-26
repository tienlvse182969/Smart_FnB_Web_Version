/**
 * Đồng hồ của gói (lượt 10.2): số ngày còn lại tính theo giờ hiện tại, nhưng một tab mở qua nửa đêm không có gì làm màn hình
 * vẽ lại. `bumpPlanClock` được gọi khi tab được focus lại, tab hiện lại và khi đổi route (KHÔNG có bộ đếm định kỳ); mọi nơi dùng
 * `useTrialState` / `usePlanClock` vẽ lại một lần và tính lại số ngày. Nếu mốc hết hạn đã qua mà gói còn `active`, nạp lại gói một lần.
 */
import { useEffect, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";
import { useAppStore } from "../store";
import { getTrialState, type TrialState } from "./trial";

let tick = 0;
const listeners = new Set<() => void>();

export function bumpPlanClock(): void {
  tick += 1;
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Đọc để vẽ lại khi đồng hồ nhích; giá trị trả về không có ý nghĩa nào khác. */
export function usePlanClock(): number {
  return useSyncExternalStore(subscribe, () => tick, () => tick);
}

/**
 * Trạng thái dùng thử của gói đang nạp trong store. Gói của chuỗi khác với chuỗi đang chọn (`plan.chainId !== chainId`) bị bỏ qua,
 * nên đổi chuỗi không bao giờ để lại nhãn của chuỗi cũ.
 */
export function useTrialState(): TrialState {
  const plan = useAppStore((s) => s.plan);
  const chainId = useAppStore((s) => s.chainId);
  usePlanClock();
  if (!plan || (chainId && plan.chainId !== chainId)) return { kind: "none" };
  return getTrialState(plan, Date.now());
}

/** Gắn một lần ở khung đã đăng nhập (`RoleLayout`): focus lại, hiện lại tab, đổi route. */
export function usePlanFreshness(): void {
  const { pathname } = useLocation();
  const refreshPlanIfStale = useAppStore((s) => s.refreshPlanIfStale);

  useEffect(() => {
    const check = () => {
      bumpPlanClock();
      void refreshPlanIfStale();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshPlanIfStale]);

  useEffect(() => {
    bumpPlanClock();
    void refreshPlanIfStale();
  }, [pathname, refreshPlanIfStale]);
}
