/** Menu của chuỗi và tình trạng bán tại chi nhánh (OW-02..04, BM-02). */
import type { BranchMenuItem, MenuItem } from "../../types";
import { menuApi } from "../../api";
import { broadcast } from "../broadcast";
import type { SliceCreator } from "../types";

export interface MenuSlice {
  menuItems: MenuItem[];
  branchMenuItems: BranchMenuItem[];

  /** Nạp menu chuỗi và tình trạng bán tại chi nhánh đang chọn. */
  loadMenu: () => Promise<void>;
  toggleMenuItemAvailability: (
    menuItemId: string,
    isAvailable: boolean
  ) => Promise<void>;
  /** Branch Manager sửa số suất còn lại của món tại chi nhánh. */
  updateRemainingToday: (menuItemId: string, remainingToday: number | null) => Promise<void>;
}

export const createMenuSlice: SliceCreator<MenuSlice> = (set, get) => ({
  menuItems: [],
  branchMenuItems: [],

  loadMenu: async () => {
    const { currentUser, currentBranchId } = get();
    if (!currentUser) return;

    const { chainId } = get();
    const menu = chainId ? await menuApi.listMenuItems(chainId, currentUser.role) : [];
    const branchMenu = chainId && currentBranchId ? await menuApi.listBranchMenu(chainId, currentBranchId) : [];

    set({ menuItems: menu, branchMenuItems: branchMenu });
  },

  toggleMenuItemAvailability: async (
    menuItemId: string,
    isAvailable: boolean
  ) => {
    const { chainId, currentBranchId, currentUser } = get();
    if (!chainId || !currentBranchId || !currentUser) return;

    await menuApi.toggleBranchItem(chainId, currentBranchId, menuItemId, isAvailable, currentUser.role);
    await get().loadMenu();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  updateRemainingToday: async (menuItemId: string, remainingToday: number | null) => {
    const { chainId, currentBranchId, currentUser } = get();
    if (!chainId || !currentBranchId || !currentUser) return;

    await menuApi.updateRemaining(chainId, currentBranchId, menuItemId, remainingToday, currentUser.role);
    await get().loadMenu();
    broadcast.send({ type: "REFETCH_ALL" });
  },
});
