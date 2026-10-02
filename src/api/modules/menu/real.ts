import { request } from "../../http/client";
import {
  mapAssignedBranches,
  mapBranchMenu,
  mapCategory,
  mapItem,
  type RawBranchMenu,
  type RawCategory,
  type RawItem,
} from "./mapper";
import { assertPrepMinutes, assertSku, assertWholeVnd } from "./validate";
import type { MenuApi } from "./index";

const base = (chainId: string) => `/restaurant-chains/${chainId}/menu`;

function query(params: Record<string, string | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export const menuReal: MenuApi = {
  async listCategories(chainId) {
    return (await request<RawCategory[]>(`${base(chainId)}/categories`)).map(mapCategory);
  },

  async createCategory(chainId, input) {
    return mapCategory(await request<RawCategory>(`${base(chainId)}/categories`, { method: "POST", body: input }));
  },

  async updateCategory(chainId, id, patch) {
    return mapCategory(await request<RawCategory>(`${base(chainId)}/categories/${id}`, { method: "PATCH", body: patch }));
  },

  async deleteCategory(chainId, id) {
    await request(`${base(chainId)}/categories/${id}`, { method: "DELETE" });
  },

  async listItems(chainId, { categoryId, search, isActive } = {}) {
    const raw = await request<RawItem[]>(`${base(chainId)}/items${query({ categoryId, search: search?.trim(), isActive })}`);
    return raw.map(mapItem);
  },

  async createItem(chainId, input) {
    assertWholeVnd(input.price);
    assertSku(input.sku);
    assertPrepMinutes(input.preparationMinutes);
    // branchIds luôn gửi tường minh (không dựa vào "bỏ trống = mọi chi nhánh").
    return mapItem(await request<RawItem>(`${base(chainId)}/items`, { method: "POST", body: input }));
  },

  async updateItem(chainId, id, patch) {
    if (patch.price !== undefined) assertWholeVnd(patch.price);
    assertPrepMinutes(patch.preparationMinutes);
    return mapItem(await request<RawItem>(`${base(chainId)}/items/${id}`, { method: "PATCH", body: patch }));
  },

  async setItemActive(chainId, id, isActive) {
    return mapItem(await request<RawItem>(`${base(chainId)}/items/${id}/active`, { method: "PATCH", body: { isActive } }));
  },

  async deleteItem(chainId, id) {
    await request(`${base(chainId)}/items/${id}`, { method: "DELETE" });
  },

  async setItemBranches(chainId, id, branchIds) {
    const raw = await request<Parameters<typeof mapAssignedBranches>[0]>(`${base(chainId)}/items/${id}/branches`, {
      method: "PUT",
      body: { branchIds },
    });
    return mapAssignedBranches(raw);
  },

  async listBranchMenu(branchId) {
    return mapBranchMenu(await request<RawBranchMenu>(`/branches/${branchId}/menu`));
  },

  async setBranchItemAvailable(branchId, itemId, isAvailable) {
    // Chỉ gửi isAvailable — web không bao giờ gửi remainingPortions.
    await request(`/branches/${branchId}/menu/items/${itemId}`, { method: "PATCH", body: { isAvailable } });
  },
};
