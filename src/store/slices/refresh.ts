/**
 * Bộ đếm "làm mới" cho nút Thử lại (5.8c). `requestRefresh()` tăng `refreshEpoch`; `RefreshBoundary` (bọc nội dung màn đang mở trong
 * `RoleLayout`) dựng lại màn khi bộ đếm đổi, nên mọi lần nạp ở `useEffect` lúc mount của màn đó chạy lại đúng một lượt và màn khác
 * không chạy request nào. Màn mới ở giai đoạn 6+ tự được hưởng, không cần sửa gì.
 */
import type { SliceCreator } from "../types";

export interface RefreshSlice {
  refreshEpoch: number;
  requestRefresh: () => void;
}

export const createRefreshSlice: SliceCreator<RefreshSlice> = (set) => ({
  refreshEpoch: 0,
  requestRefresh: () => set((s) => ({ refreshEpoch: s.refreshEpoch + 1 })),
});
