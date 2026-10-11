import { useSyncExternalStore } from "react";

/**
 * Số đơn "Cần xử lý" của chi nhánh đang chọn (quyết định 100): `total` của `GET /manager/orders?status=REQUIRES_ATTENTION`.
 * Store ngoài React để cả sidebar (RoleLayout), watcher và trang danh sách dùng chung một con số. `null` = chưa biết.
 */
let count: number | null = null;
const listeners = new Set<() => void>();

export const attentionStore = {
  get: () => count,
  set(next: number | null) {
    if (next === count) return;
    count = next;
    for (const l of [...listeners]) l();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useAttentionCount(): number | null {
  return useSyncExternalStore(attentionStore.subscribe, attentionStore.get, attentionStore.get);
}
