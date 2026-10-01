/**
 * Món chi nhánh đang bán (BM-02). Menu toàn chuỗi của Owner (OW-02, OW-04) do các màn Owner tự tải qua `menuApi`
 * (có bộ lọc phía server) nên không nằm trong store.
 */
import type { BranchMenuItem } from "../../types";
import { menuApi } from "../../api";
import { broadcast } from "../broadcast";
import type { SliceCreator } from "../types";

export interface MenuSlice {
  /** Món chi nhánh đang chọn bán — chỉ nạp cho Branch Manager. */
  branchMenu: BranchMenuItem[];

  loadMenu: () => Promise<void>;
  /** Manager/Barista bật tắt "còn bán hôm nay" (BR-12, BR-36). */
  toggleMenuItemAvailability: (menuItemId: string, isAvailable: boolean) => Promise<void>;
}

export const createMenuSlice: SliceCreator<MenuSlice> = (set, get) => ({
  branchMenu: [],

  loadMenu: async () => {
    const { currentUser, currentBranchId } = get();
    // `/branches/{id}/menu` chỉ cần cho Manager; Owner và Admin không dùng.
    if (currentUser?.role !== "manager" || !currentBranchId) {
      set({ branchMenu: [] });
      return;
    }
    set({ branchMenu: await menuApi.listBranchMenu(currentBranchId) });
  },

  toggleMenuItemAvailability: async (menuItemId, isAvailable) => {
    const { currentBranchId } = get();
    if (!currentBranchId) return;

    await menuApi.setBranchItemAvailable(currentBranchId, menuItemId, isAvailable);
    await get().loadMenu();
    broadcast.send({ type: "REFETCH_ALL" });
  },
});
