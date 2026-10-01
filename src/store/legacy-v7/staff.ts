/** v7 — nhân sự Waiter/Kitchen và ca làm. BM-01 v9 (thu ngân, pha chế, quầy) sẽ dựng lại. Gỡ ở bước xoá v7. */
import {
  createStaffAccount as serviceCreateStaffAccount,
  setStaffShift as serviceSetStaffShift,
  setStaffActive as serviceSetStaffActive,
  type StaffLegacy,
} from "../../services";
import { broadcast } from "../broadcast";
import type { SliceCreator } from "../types";

export interface LegacyStaffSlice {
  staff: StaffLegacy[];

  createStaffAccount: (name: string, email: string, role: "Waiter" | "Kitchen") => Promise<void>;
  setStaffShift: (id: string, onShift: boolean) => Promise<void>;
  setStaffActive: (id: string, active: boolean) => Promise<void>;
}

export const createLegacyStaffSlice: SliceCreator<LegacyStaffSlice> = (_set, get) => ({
  staff: [],

  createStaffAccount: async (name: string, email: string, role: "Waiter" | "Kitchen") => {
    const { currentUser, currentBranchId } = get();
    if (!currentUser?.tenantId || !currentBranchId) return;

    await serviceCreateStaffAccount(currentUser.tenantId, currentBranchId, name, email, role);
    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  setStaffShift: async (id: string, onShift: boolean) => {
    await serviceSetStaffShift(id, onShift);
    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  setStaffActive: async (id: string, active: boolean) => {
    await serviceSetStaffActive(id, active);
    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },
});
