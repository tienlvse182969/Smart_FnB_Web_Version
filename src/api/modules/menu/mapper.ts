/**
 * Ánh xạ response thật của BE menu sang kiểu web, theo WHITELIST: chỉ lấy trường cần dùng. `remainingPortions` (kho, v7) và
 * các trường lạ KHÔNG được chép sang. Tiền qua `parseAmount` (BE trả chuỗi thập phân).
 */
import { parseAmount } from "../../../lib/reportFormat";
import type { BranchMenuItem, MenuCategory, MenuItem, MenuItemBranch } from "../../../types";

export interface RawCategory {
  id: string;
  name: string;
  description?: string | null;
  displayOrder: number;
  isActive: boolean;
  _count?: { items: number };
}

export interface RawItemBranch {
  branchId: string;
  isEnabled: boolean;
  isAvailable: boolean;
  remainingPortions?: number | null;
  branch?: { id: string; code: string; name: string; status: string };
}

export interface RawItem {
  id: string;
  categoryId: string;
  sku: string;
  name: string;
  description?: string | null;
  price: string | number;
  imageUrl?: string | null;
  preparationMinutes?: number | null;
  isActive: boolean;
  isAvailable?: boolean;
  category?: { id: string; name: string };
  /** Chỉ có ở danh sách món; create/update không kèm. */
  branches?: RawItemBranch[];
  enabledBranchCount?: number;
}

export interface RawBranchMenu {
  branch?: unknown;
  categories: {
    id: string;
    name: string;
    items: {
      id: string;
      sku: string;
      name: string;
      price: string | number;
      imageUrl?: string | null;
      isAvailable: boolean;
      remainingPortions?: number | null;
    }[];
  }[];
}

export function mapCategory(raw: RawCategory): MenuCategory {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? null,
    displayOrder: raw.displayOrder,
    isActive: raw.isActive,
    itemCount: raw._count?.items ?? 0,
  };
}

export function mapItemBranch(raw: RawItemBranch): MenuItemBranch {
  return { branchId: raw.branchId, isEnabled: raw.isEnabled, isAvailable: raw.isAvailable };
}

export function mapItem(raw: RawItem): MenuItem {
  const branches = (raw.branches ?? []).map(mapItemBranch);
  return {
    id: raw.id,
    categoryId: raw.categoryId,
    categoryName: raw.category?.name ?? "",
    sku: raw.sku,
    name: raw.name,
    description: raw.description ?? null,
    price: parseAmount(raw.price),
    imageUrl: raw.imageUrl ?? null,
    preparationMinutes: raw.preparationMinutes ?? null,
    isActive: raw.isActive,
    branches,
    enabledBranchCount: raw.enabledBranchCount ?? branches.filter((b) => b.isEnabled).length,
  };
}

/** `GET /branches/{id}/menu` (gom theo danh mục) → danh sách phẳng. */
export function mapBranchMenu(raw: RawBranchMenu): BranchMenuItem[] {
  return raw.categories.flatMap((category) =>
    category.items.map((item) => ({
      menuItemId: item.id,
      sku: item.sku,
      name: item.name,
      categoryName: category.name,
      price: parseAmount(item.price),
      imageUrl: item.imageUrl ?? null,
      isAvailable: item.isAvailable,
      ownerDisabled: false, // BE ẩn hẳn món Owner đã tắt (#19)
    })),
  );
}

/** Response của `PUT …/items/{id}/branches`: `{item, branches[{id, isEnabled, isAvailable, remainingPortions…}]}`. */
export function mapAssignedBranches(raw: {
  branches: { id: string; isEnabled: boolean; isAvailable: boolean; remainingPortions?: number | null }[];
}): MenuItemBranch[] {
  return raw.branches.map((b) => ({ branchId: b.id, isEnabled: b.isEnabled, isAvailable: b.isAvailable }));
}
