/** Nhân sự chi nhánh (BM-01) — tạm chạy bằng mock cho tới khi BE có endpoint Manager tạo tài khoản. */
import {
  listStaff,
  createStaffAccount as serviceCreateStaffAccount,
  setStaffActive as serviceSetStaffActive,
  type StaffLegacy,
} from "../../services";
import { toMockBranchId } from "../../services/mockBridge";
import { broadcast } from "../broadcast";
import type { SliceCreator } from "../types";

export interface StaffSlice {
  staff: StaffLegacy[];

  loadStaff: () => Promise<void>;
  createStaffAccount: (name: string, email: string, role: "Waiter" | "Kitchen") => Promise<void>;
  setStaffActive: (id: string, active: boolean) => Promise<void>;
}

export const createStaffSlice: SliceCreator<StaffSlice> = (set, get) => ({
  staff: [],

  loadStaff: async () => {
    const { currentUser, currentBranchId } = get();
    if (!currentUser) return;
    const activeBranchId = toMockBranchId(currentBranchId);
    set({ staff: activeBranchId ? await listStaff(activeBranchId) : [] });
  },

  createStaffAccount: async (name: string, email: string, role: "Waiter" | "Kitchen") => {
    const { currentUser, currentBranchId } = get();
    if (!currentUser?.tenantId || !currentBranchId) return;

    await serviceCreateStaffAccount(currentUser.tenantId, currentBranchId, name, email, role);
    await get().loadStaff();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  setStaffActive: async (id: string, active: boolean) => {
    await serviceSetStaffActive(id, active);
    await get().loadStaff();
    broadcast.send({ type: "REFETCH_ALL" });
  },
});
