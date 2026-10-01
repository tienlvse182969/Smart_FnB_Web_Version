/** Menu của chuỗi và tình trạng bán tại chi nhánh (OW-02..04, BM-02). */
import type { BranchMenuItem, MenuItem } from "../../types";
import {
  listMenuItems,
  listBranchMenuItems,
  updateRemaining as serviceUpdateRemaining,
  toggleBranchMenuItem as serviceToggleBranchMenuItem,
} from "../../services";
import { toMockBranchId } from "../../services/mockBridge";
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

    // Menu vẫn là mock nên phải đổi sang ID mock qua cầu nối.
    const activeBranchId = toMockBranchId(currentBranchId);

    const menu = currentUser.tenantId ? await listMenuItems(currentUser.tenantId, currentUser.role) : [];
    const branchMenu = activeBranchId ? await listBranchMenuItems(activeBranchId) : [];

    set({ menuItems: menu, branchMenuItems: branchMenu });
  },

  toggleMenuItemAvailability: async (
    menuItemId: string,
    isAvailable: boolean
  ) => {
    const { currentBranchId, currentUser } = get();
    if (!currentBranchId || !currentUser) return;

    await serviceToggleBranchMenuItem(currentBranchId, menuItemId, isAvailable, currentUser.role);
    await get().loadMenu();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  updateRemainingToday: async (menuItemId: string, remainingToday: number | null) => {
    const { currentBranchId, currentUser } = get();
    if (!currentBranchId || !currentUser) return;

    await serviceUpdateRemaining(currentBranchId, menuItemId, remainingToday, currentUser.role);
    await get().loadMenu();
    broadcast.send({ type: "REFETCH_ALL" });
  },
});
