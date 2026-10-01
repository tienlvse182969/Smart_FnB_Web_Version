import type { MenuItem } from "../../../types";
import { ApiError } from "../../http/errors";
import { mockDelay } from "../../mock/control";
import { assertMockWritable } from "../../mock/guards";
import { getBranchMenu, getChainState } from "../../mock/store";
import { genId } from "../../mock/util";
import type { MenuApi } from "./index";

/** BM-02: chỉ Branch Manager và Barista được bật/tắt món tại chi nhánh. */
function assertCanEditAvailability(role: string) {
  if (role !== "manager" && role !== "barista") {
    throw new ApiError(403, "Chỉ Branch Manager hoặc Barista mới được bật/tắt món tại chi nhánh");
  }
}

export const menuMock: MenuApi = {
  async listMenuItems(chainId, actingRole) {
    await mockDelay();
    // BR-07: Platform Admin chỉ xem số liệu tổng hợp, không xem menu.
    if (actingRole === "admin") throw new ApiError(403, "Platform Admin không được xem menu của doanh nghiệp (BR-07)");
    return [...getChainState(chainId).menuItems];
  },

  async listBranchMenu(chainId, branchId) {
    await mockDelay();
    return [...getBranchMenu(chainId, branchId)];
  },

  async toggleBranchItem(chainId, branchId, menuItemId, isAvailable, actingRole) {
    await mockDelay();
    assertCanEditAvailability(actingRole);
    assertMockWritable();
    const state = getChainState(chainId);
    const item = state.menuItems.find((m) => m.id === menuItemId);
    if (!item) throw new ApiError(404, "Món không tồn tại");
    if (isAvailable && !item.activeChain) {
      throw new ApiError(409, "Owner đã tắt món này ở cấp chuỗi — chi nhánh không thể bật lại");
    }
    const list = getBranchMenu(chainId, branchId);
    const row = list.find((b) => b.menuItemId === menuItemId);
    if (row) row.isAvailable = isAvailable;
    else list.push({ branchId, menuItemId, isAvailable, remainingToday: null, soldToday: 0 });
  },

  async updateRemaining(chainId, branchId, menuItemId, remaining, actingRole) {
    await mockDelay();
    assertCanEditAvailability(actingRole);
    assertMockWritable();
    const list = getBranchMenu(chainId, branchId);
    const row = list.find((b) => b.menuItemId === menuItemId);
    if (row) row.remainingToday = remaining;
    else list.push({ branchId, menuItemId, isAvailable: true, remainingToday: remaining, soldToday: 0 });
  },

  async createItem(chainId, item) {
    await mockDelay();
    assertMockWritable();
    const created: MenuItem = { id: genId("mock-item"), tenantId: chainId, ...item };
    getChainState(chainId).menuItems.push(created);
    return created;
  },

  async updateItem(chainId, id, patch) {
    await mockDelay();
    assertMockWritable();
    const state = getChainState(chainId);
    const idx = state.menuItems.findIndex((m) => m.id === id);
    if (idx === -1) throw new ApiError(404, "Món không tồn tại");
    state.menuItems[idx] = { ...state.menuItems[idx], ...patch };
    return state.menuItems[idx];
  },

  async setItemPresence(chainId, menuItemId, branchIds) {
    await mockDelay();
    assertMockWritable();
    const state = getChainState(chainId);
    if (!state.menuItems.some((m) => m.id === menuItemId)) throw new ApiError(404, "Món không tồn tại");
    // Chi nhánh đã có thì giữ nguyên; chi nhánh mới chọn mặc định TẮT; bỏ chọn thì gỡ hẳn.
    const known = new Set([...state.branchMenu.keys(), ...branchIds]);
    for (const branchId of known) {
      const list = getBranchMenu(chainId, branchId);
      const idx = list.findIndex((b) => b.menuItemId === menuItemId);
      if (branchIds.includes(branchId)) {
        if (idx === -1) list.push({ branchId, menuItemId, isAvailable: false, remainingToday: null, soldToday: 0 });
      } else if (idx !== -1) {
        list.splice(idx, 1);
      }
    }
  },
};
