/**
 * Module menu — danh mục và món của chuỗi (OW-02), gán món cho chi nhánh và bật/tắt cấp chuỗi (OW-04), món tại chi nhánh
 * (BM-02). Real bám `/restaurant-chains/{id}/menu/*` và `/branches/{id}/menu`. Tuỳ chọn món (OW-03) ở module `options`.
 *
 * Web không bao giờ gửi `remainingPortions` (kho đã bỏ ở v9) và chỉ gửi giá là số nguyên đồng (BR-19).
 */
import type {
  BranchMenuItem,
  CategoryInput,
  MenuCategory,
  MenuItem,
  MenuItemBranch,
  MenuItemFilter,
  MenuItemInput,
  MenuItemPatch,
} from "../../../types";
import { defineApi } from "../../define";
import { menuMock } from "./mock";
import { menuReal } from "./real";

export { SKU_PATTERN, suggestSku } from "./validate";

export interface MenuApi {
  listCategories(chainId: string): Promise<MenuCategory[]>;
  /** 409 nếu trùng tên trong chuỗi. */
  createCategory(chainId: string, input: CategoryInput): Promise<MenuCategory>;
  updateCategory(chainId: string, id: string, patch: Partial<CategoryInput> & { isActive?: boolean }): Promise<MenuCategory>;
  /** 409 nếu danh mục còn món — hiện nguyên thông báo của BE. */
  deleteCategory(chainId: string, id: string): Promise<void>;

  listItems(chainId: string, filter?: MenuItemFilter): Promise<MenuItem[]>;
  /** 409 nếu trùng SKU. */
  createItem(chainId: string, input: MenuItemInput): Promise<MenuItem>;
  updateItem(chainId: string, id: string, patch: MenuItemPatch): Promise<MenuItem>;
  /** Bật/tắt cấp chuỗi: tắt thì mọi chi nhánh đều không bán (OW-04). */
  setItemActive(chainId: string, id: string, isActive: boolean): Promise<MenuItem>;
  /** Xoá mềm. */
  deleteItem(chainId: string, id: string): Promise<void>;
  /** Thay toàn bộ tập chi nhánh bán món; chi nhánh bỏ ra bị tắt. */
  setItemBranches(chainId: string, id: string, branchIds: string[]): Promise<MenuItemBranch[]>;

  /** Món chi nhánh đang bán (Manager/Owner đọc). */
  listBranchMenu(branchId: string): Promise<BranchMenuItem[]>;
  /** Manager/Barista bật tắt "còn bán hôm nay". */
  setBranchItemAvailable(branchId: string, itemId: string, isAvailable: boolean): Promise<void>;
}

export const menuApi = defineApi<MenuApi>("menu", { real: menuReal, mock: menuMock });
