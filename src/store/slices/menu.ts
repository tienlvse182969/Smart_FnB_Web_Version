/** Menu của chuỗi và tình trạng bán tại chi nhánh (OW-02..04, BM-02). */
import type { BranchMenuItem, MenuItem } from "../../types";
import {
  updateRemaining as serviceUpdateRemaining,
  toggleBranchMenuItem as serviceToggleBranchMenuItem,
} from "../../services";
import { broadcast } from "../broadcast";
import type { SliceCreator } from "../types";

export interface MenuSlice {
  menuItems: MenuItem[];
  branchMenuItems: BranchMenuItem[];

  toggleMenuItemAvailability: (
    menuItemId: string,
    isAvailable: boolean
  ) => Promise<void>;
  /** Branch Manager/Kitchen sửa số suất còn lại của món tại chi nhánh. */
  updateRemainingToday: (menuItemId: string, remainingToday: number | null) => Promise<void>;
}

export const createMenuSlice: SliceCreator<MenuSlice> = (_set, get) => ({
  menuItems: [],
  branchMenuItems: [],

  toggleMenuItemAvailability: async (
    menuItemId: string,
    isAvailable: boolean
  ) => {
    const { currentBranchId, currentUser } = get();
    if (!currentBranchId || !currentUser) return;

    await serviceToggleBranchMenuItem(currentBranchId, menuItemId, isAvailable, currentUser.role);
    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  updateRemainingToday: async (menuItemId: string, remainingToday: number | null) => {
    const { currentBranchId, currentUser } = get();
    if (!currentBranchId || !currentUser) return;

    await serviceUpdateRemaining(currentBranchId, menuItemId, remainingToday, currentUser.role);
    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },
});
