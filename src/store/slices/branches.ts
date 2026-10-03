/** Chi nhánh thật của chuỗi và chi nhánh đang chọn (OW-01). */
import type { ApiBranch, Branch } from "../../types";
import { branchApi } from "../../api";
import { broadcast } from "../broadcast";
import { toApiStatus } from "../branchMapping";
import type { BranchFormData, SliceCreator } from "../types";

export interface BranchSlice {
  /** Chi nhánh thật, nguyên dạng backend trả về. */
  apiBranches: ApiBranch[];
  /** Chi nhánh theo hình dạng UI, ánh xạ từ `apiBranches`. */
  branches: Branch[];
  /** UUID chi nhánh thật đang chọn. */
  currentBranchId: string | null;

  switchBranch: (branchId: string) => Promise<void>;
  createBranch: (data: BranchFormData) => Promise<void>;
  updateBranch: (id: string, data: Partial<BranchFormData> & { status?: "open" | "closed" | "suspended" }) => Promise<void>;
}

export const createBranchSlice: SliceCreator<BranchSlice> = (set, get) => ({
  apiBranches: [],
  branches: [],
  currentBranchId: null,

  switchBranch: async (branchId: string) => {
    const { currentUser } = get();
    set({
      currentBranchId: branchId,
      currentUser: currentUser ? { ...currentUser, branchId } : null,
    });
    await get().loadMenu();
  },

  createBranch: async (data) => {
    const { chainId } = get();
    if (!chainId) throw new Error("Chưa xác định được chuỗi nhà hàng");

    await branchApi.createBranch(chainId, {
      code: data.code,
      name: data.name,
      addressLine1: data.addressLine1,
      ward: data.ward || undefined,
      city: data.city,
      phone: data.phone || undefined,
      openTime: data.openTime || undefined,
      closeTime: data.closeTime || undefined,
    });

    await get().loadScope();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  updateBranch: async (id, data) => {
    const { status, ...fields } = data;
    const patch = {
      ...(fields.code !== undefined ? { code: fields.code } : {}),
      ...(fields.name !== undefined ? { name: fields.name } : {}),
      ...(fields.phone !== undefined ? { phone: fields.phone } : {}),
      ...(fields.addressLine1 !== undefined ? { addressLine1: fields.addressLine1 } : {}),
      ...(fields.ward !== undefined ? { ward: fields.ward } : {}),
      ...(fields.city !== undefined ? { city: fields.city } : {}),
    };
    if (Object.keys(patch).length) await branchApi.updateBranch(id, patch);
    if (status) await branchApi.updateBranchStatus(id, toApiStatus(status));

    await get().loadScope();
    broadcast.send({ type: "REFETCH_ALL" });
  },
});
