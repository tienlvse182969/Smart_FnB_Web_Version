import { ApiError } from "../../http/errors";
import { mockDelay } from "../../mock/control";
import { assertMockWritable } from "../../mock/guards";
import { getBranchOptions, getChainState } from "../../mock/store";
import { genId } from "../../mock/util";
import type { OptionsApi } from "./index";

export const optionsMock: OptionsApi = {
  async listGroups(chainId) {
    await mockDelay();
    return [...getChainState(chainId).optionGroups].sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async createGroup(chainId, input) {
    await mockDelay();
    assertMockWritable();
    const group = { ...input, id: genId("mock-og"), tenantId: chainId };
    getChainState(chainId).optionGroups.push(group);
    return group;
  },

  async updateGroup(chainId, id, patch) {
    await mockDelay();
    assertMockWritable();
    const groups = getChainState(chainId).optionGroups;
    const idx = groups.findIndex((g) => g.id === id);
    if (idx === -1) throw new ApiError(404, "Nhóm tuỳ chọn không tồn tại");
    groups[idx] = { ...groups[idx], ...patch };
    return groups[idx];
  },

  async deleteGroup(chainId, id) {
    await mockDelay();
    assertMockWritable();
    const state = getChainState(chainId);
    state.optionGroups = state.optionGroups.filter((g) => g.id !== id);
    // Gỡ nhóm khỏi các món đang dùng; đơn cũ không đổi vì đã chụp giá lúc bán (BR-15).
    state.menuItems = state.menuItems.map((m) => ({ ...m, optionGroupIds: m.optionGroupIds?.filter((g) => g !== id) }));
  },

  async listBranchStates(chainId, branchId) {
    await mockDelay();
    return [...getBranchOptions(chainId, branchId)];
  },

  async setBranchOptionAvailable(chainId, branchId, optionId, isAvailable) {
    await mockDelay();
    assertMockWritable();
    const row = getBranchOptions(chainId, branchId).find((s) => s.optionId === optionId);
    if (row) row.isAvailable = isAvailable;
  },
};
