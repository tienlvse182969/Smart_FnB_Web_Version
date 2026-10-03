/**
 * Bản mock của module menu — cùng types và quy tắc với BE: 409 trùng tên danh mục, 409 xoá danh mục còn món, 409 trùng SKU,
 * SKU không đổi được sau khi tạo, giá là số nguyên đồng. Không có `remainingPortions`.
 */
import type { MenuCategory, MenuItem } from "../../../types";
import { ApiError } from "../../http/errors";
import { mockDelay } from "../../mock/control";
import { assertMockWritable } from "../../mock/guards";
import { ensureBranchRows, getChainState, type ChainState, type StoredMenuItem } from "../../mock/store";
import { genId } from "../../mock/util";
import { branchApi } from "../branch";
import type { MenuApi } from "./index";
import { assertPrepMinutes, assertSku, assertWholeVnd } from "./validate";

const norm = (s: string) => s.trim().toLowerCase();

function categoryOf(state: ChainState, id: string): MenuCategory {
  const found = state.categories.find((c) => c.id === id);
  if (!found) throw new ApiError(404, "Menu category not found in this chain");
  return found;
}

function itemOf(state: ChainState, id: string): StoredMenuItem {
  const found = state.menuItems.find((m) => m.id === id);
  if (!found) throw new ApiError(404, "Menu item not found in this chain");
  return found;
}

const withCount = (state: ChainState, c: MenuCategory): MenuCategory => ({
  ...c,
  itemCount: state.menuItems.filter((m) => m.categoryId === c.id).length,
});

function view(state: ChainState, item: StoredMenuItem): MenuItem {
  const rows = state.itemBranches.get(item.id) ?? new Map();
  const branches = [...rows.entries()].map(([branchId, r]) => ({ branchId, isEnabled: r.isEnabled, isAvailable: r.isAvailable }));
  const { seeded: _seeded, ...rest } = item;
  return { ...rest, branches, enabledBranchCount: branches.filter((b) => b.isEnabled).length };
}

async function chainBranchIds(chainId: string): Promise<string[]> {
  const branches = await branchApi.listBranches(chainId);
  for (const b of branches) ensureBranchRows(chainId, b.id);
  return branches.map((b) => b.id);
}

export const menuMock: MenuApi = {
  async listCategories(chainId) {
    await mockDelay();
    const s = getChainState(chainId);
    return [...s.categories].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)).map((c) => withCount(s, c));
  },

  async createCategory(chainId, input) {
    await mockDelay();
    assertMockWritable();
    const s = getChainState(chainId);
    if (!input.name.trim()) throw new ApiError(400, "name should not be empty");
    if (s.categories.some((c) => norm(c.name) === norm(input.name))) {
      throw new ApiError(409, "A category with this name already exists in the chain");
    }
    const created: MenuCategory = {
      id: genId("mock-cat"),
      name: input.name.trim(),
      description: input.description?.trim() || null,
      displayOrder: input.displayOrder ?? 0,
      isActive: true,
      itemCount: 0,
    };
    s.categories.push(created);
    return { ...created };
  },

  async updateCategory(chainId, id, patch) {
    await mockDelay();
    assertMockWritable();
    const s = getChainState(chainId);
    const cat = categoryOf(s, id);
    if (patch.name !== undefined && s.categories.some((c) => c.id !== id && norm(c.name) === norm(patch.name!))) {
      throw new ApiError(409, "A category with this name already exists in the chain");
    }
    if (patch.name !== undefined) cat.name = patch.name.trim();
    if (patch.description !== undefined) cat.description = patch.description.trim() || null;
    if (patch.displayOrder !== undefined) cat.displayOrder = patch.displayOrder;
    if (patch.isActive !== undefined) cat.isActive = patch.isActive;
    for (const item of s.menuItems) if (item.categoryId === id) item.categoryName = cat.name;
    return withCount(s, cat);
  },

  async deleteCategory(chainId, id) {
    await mockDelay();
    assertMockWritable();
    const s = getChainState(chainId);
    categoryOf(s, id);
    const count = s.menuItems.filter((m) => m.categoryId === id).length;
    if (count > 0) throw new ApiError(409, `Move or delete the ${count} item(s) in this category before deleting it`);
    s.categories = s.categories.filter((c) => c.id !== id);
  },

  async listItems(chainId, { categoryId, search, isActive } = {}) {
    await mockDelay();
    await chainBranchIds(chainId);
    const s = getChainState(chainId);
    const q = search?.trim().toLowerCase();
    return s.menuItems
      .filter((m) => (!categoryId || m.categoryId === categoryId) && (isActive === undefined || m.isActive === isActive))
      .filter((m) => !q || m.name.toLowerCase().includes(q) || m.sku.toLowerCase().includes(q))
      .map((m) => view(s, m));
  },

  async createItem(chainId, input) {
    await mockDelay();
    assertMockWritable();
    assertWholeVnd(input.price);
    assertSku(input.sku);
    assertPrepMinutes(input.preparationMinutes);
    const s = getChainState(chainId);
    const cat = categoryOf(s, input.categoryId);
    if (!input.name.trim()) throw new ApiError(400, "name should not be empty");
    if (s.menuItems.some((m) => m.sku === input.sku)) throw new ApiError(409, "A menu item with this SKU already exists");
    const known = await chainBranchIds(chainId);
    const bad = input.branchIds.filter((id) => !known.includes(id));
    if (bad.length) throw new ApiError(400, `Branches do not belong to this chain: ${bad.join(", ")}`);

    const item: StoredMenuItem = {
      id: genId("mock-item"),
      categoryId: cat.id,
      categoryName: cat.name,
      sku: input.sku,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      price: input.price,
      imageUrl: input.imageUrl?.trim() || null,
      preparationMinutes: input.preparationMinutes ?? null,
      isActive: true,
    };
    s.menuItems.push(item);
    s.itemBranches.set(item.id, new Map(input.branchIds.map((id) => [id, { isEnabled: true, isAvailable: true }])));
    return view(s, item);
  },

  async updateItem(chainId, id, patch) {
    await mockDelay();
    assertMockWritable();
    if (patch.price !== undefined) assertWholeVnd(patch.price);
    assertPrepMinutes(patch.preparationMinutes);
    const s = getChainState(chainId);
    const item = itemOf(s, id);
    if (patch.categoryId) {
      const cat = categoryOf(s, patch.categoryId);
      item.categoryId = cat.id;
      item.categoryName = cat.name;
    }
    if (patch.name !== undefined) item.name = patch.name.trim();
    if (patch.description !== undefined) item.description = patch.description.trim() || null;
    if (patch.price !== undefined) item.price = patch.price;
    if (patch.imageUrl !== undefined) item.imageUrl = patch.imageUrl.trim() || null;
    if (patch.preparationMinutes !== undefined) item.preparationMinutes = patch.preparationMinutes;
    return view(s, item);
  },

  async setItemActive(chainId, id, isActive) {
    await mockDelay();
    assertMockWritable();
    const s = getChainState(chainId);
    const item = itemOf(s, id);
    item.isActive = isActive;
    return view(s, item);
  },

  async deleteItem(chainId, id) {
    await mockDelay();
    assertMockWritable();
    const s = getChainState(chainId);
    itemOf(s, id);
    s.menuItems = s.menuItems.filter((m) => m.id !== id);
    s.itemBranches.delete(id);
    s.itemOptions.delete(id);
  },

  async setItemBranches(chainId, id, branchIds) {
    await mockDelay();
    assertMockWritable();
    const s = getChainState(chainId);
    itemOf(s, id);
    const known = await chainBranchIds(chainId);
    const bad = branchIds.filter((b) => !known.includes(b));
    if (bad.length) throw new ApiError(400, `Branches do not belong to this chain: ${bad.join(", ")}`);
    const rows = s.itemBranches.get(id) ?? new Map();
    // Chi nhánh bỏ ra bị tắt (giữ hàng, isEnabled=false) — như BE; chi nhánh chọn thêm mặc định còn bán.
    for (const [branchId, row] of rows) if (!branchIds.includes(branchId)) row.isEnabled = false;
    for (const branchId of branchIds) {
      const row = rows.get(branchId);
      if (row) row.isEnabled = true;
      else rows.set(branchId, { isEnabled: true, isAvailable: true });
    }
    s.itemBranches.set(id, rows);
    return [...rows.entries()].map(([branchId, r]) => ({ branchId, isEnabled: r.isEnabled, isAvailable: r.isAvailable }));
  },

  async listBranchMenu(branchId) {
    await mockDelay();
    const chainId = await chainOfBranch(branchId);
    ensureBranchRows(chainId, branchId);
    const s = getChainState(chainId);
    // Khác BE hiện tại (#19): mock trả cả món Owner đã tắt (đã gán cho chi nhánh) kèm `ownerDisabled` để thử dòng xám.
    return s.menuItems
      .filter((m) => s.itemBranches.get(m.id)?.get(branchId)?.isEnabled)
      .map((m) => {
        const cat = s.categories.find((c) => c.id === m.categoryId);
        const ownerDisabled = !(m.isActive && cat?.isActive);
        return {
          menuItemId: m.id,
          sku: m.sku,
          name: m.name,
          categoryName: m.categoryName,
          price: m.price,
          imageUrl: m.imageUrl,
          // BR-12: món bán được khi Owner bật (và danh mục bật), đã gán chi nhánh, và còn bán hôm nay.
          isAvailable: !ownerDisabled && s.itemBranches.get(m.id)!.get(branchId)!.isAvailable,
          ownerDisabled,
        };
      });
  },

  async setBranchItemAvailable(branchId, itemId, isAvailable) {
    await mockDelay();
    assertMockWritable();
    const chainId = await chainOfBranch(branchId);
    ensureBranchRows(chainId, branchId);
    const row = getChainState(chainId).itemBranches.get(itemId)?.get(branchId);
    if (!row?.isEnabled) throw new ApiError(404, "Menu item not found in this branch");
    const s = getChainState(chainId);
    const item = s.menuItems.find((m) => m.id === itemId);
    const cat = s.categories.find((c) => c.id === item?.categoryId);
    // BR-12: Owner tắt thì chi nhánh không bật lại được.
    if (isAvailable && !(item?.isActive && cat?.isActive)) throw new ApiError(403, "Owner đã tắt món này, chi nhánh không bật lại được");
    row.isAvailable = isAvailable;
  },
};

/** Mock chỉ nhận branchId (như BE) nên phải tra chuỗi của chi nhánh qua module branch. */
async function chainOfBranch(branchId: string): Promise<string> {
  const branch = (await branchApi.listBranches()).find((b) => b.id === branchId);
  if (!branch) throw new ApiError(404, "Branch not found");
  return branch.chainId;
}
