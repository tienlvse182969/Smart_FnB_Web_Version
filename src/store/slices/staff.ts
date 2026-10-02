/** Nhân sự chi nhánh (BM-01) — tạm chạy bằng mock cho tới khi BE có endpoint Manager tạo tài khoản. */
import type { PasswordSetupNotice, StaffMember } from "../../types";
import { accountApi } from "../../api";
import { broadcast } from "../broadcast";
import type { SliceCreator } from "../types";

export interface StaffSlice {
  staff: StaffMember[];

  loadStaff: () => Promise<void>;
  createStaffAccount: (name: string, email: string, role: "Cashier" | "Barista") => Promise<PasswordSetupNotice | null>;
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
    if (!chainId || !currentBranchId) return null;

    const { expiresAt } = await accountApi.createStaff(chainId, currentBranchId, name, email, role);
    await get().loadStaff();
    broadcast.send({ type: "REFETCH_ALL" });
    return { expiresAt };
  },

  setStaffActive: async (id: string, active: boolean) => {
    await accountApi.setStaffActive(id, active);
    await get().loadStaff();
    broadcast.send({ type: "REFETCH_ALL" });
  },
});
