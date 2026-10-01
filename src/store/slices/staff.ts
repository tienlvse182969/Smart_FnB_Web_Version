/** Nhân sự chi nhánh (BM-01) — tạm chạy bằng mock cho tới khi BE có endpoint Manager tạo tài khoản. */
import type { StaffMember } from "../../types";
import { accountApi } from "../../api";
import { broadcast } from "../broadcast";
import type { SliceCreator } from "../types";

export interface StaffSlice {
  staff: StaffMember[];

  loadStaff: () => Promise<void>;
  createStaffAccount: (name: string, email: string, role: "Cashier" | "Barista") => Promise<void>;
  setStaffActive: (id: string, active: boolean) => Promise<void>;
}

export const createStaffSlice: SliceCreator<StaffSlice> = (set, get) => ({
  staff: [],

  loadStaff: async () => {
    const { currentUser, chainId, currentBranchId } = get();
    if (!currentUser || !chainId) return;
    set({ staff: currentBranchId ? await accountApi.listStaff(chainId, currentBranchId) : [] });
  },

  createStaffAccount: async (name: string, email: string, role: "Cashier" | "Barista") => {
    const { chainId, currentBranchId } = get();
    if (!chainId || !currentBranchId) return;

    await accountApi.createStaff(chainId, currentBranchId, name, email, role);
    await get().loadStaff();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  setStaffActive: async (id: string, active: boolean) => {
    await accountApi.setActive(id, active);
    await get().loadStaff();
    broadcast.send({ type: "REFETCH_ALL" });
  },
});
