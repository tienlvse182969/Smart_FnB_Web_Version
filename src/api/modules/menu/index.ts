/** Module menu — món của chuỗi và trạng thái bán tại chi nhánh (OW-02, OW-04, BM-02). Mock cho tới giai đoạn 4. */
import type { BranchMenuItem, MenuItem, RoleKey } from "../../../types";
import { defineApi } from "../../define";
import { menuMock } from "./mock";

export interface MenuApi {
  /** Món của chuỗi. Platform Admin không xem được menu (BR-07). */
  listMenuItems(chainId: string, actingRole: RoleKey): Promise<MenuItem[]>;
  /** Món có mặt ở chi nhánh và cờ còn bán. */
  listBranchMenu(chainId: string, branchId: string): Promise<BranchMenuItem[]>;
  /** Manager/Barista bật tắt món tại chi nhánh. Owner đã tắt ở cấp chuỗi thì chi nhánh không bật lại được (BR-12). */
  toggleBranchItem(chainId: string, branchId: string, menuItemId: string, isAvailable: boolean, actingRole: RoleKey): Promise<void>;
  /** Số suất còn lại trong ngày — v7, giữ cho tới khi gỡ ở giai đoạn 5 (v9 không quản lý kho). */
  updateRemaining(chainId: string, branchId: string, menuItemId: string, remaining: number | null, actingRole: RoleKey): Promise<void>;
  createItem(chainId: string, item: Omit<MenuItem, "id" | "tenantId">): Promise<MenuItem>;
  updateItem(chainId: string, id: string, patch: Partial<MenuItem>): Promise<MenuItem>;
  /** Owner chọn chi nhánh có mặt bán món; chi nhánh mới chọn mặc định TẮT (BR-12). */
  setItemPresence(chainId: string, menuItemId: string, branchIds: string[]): Promise<void>;
}

// CHỜ BE: bản real viết ở giai đoạn 4 (BE đã có /restaurant-chains/{id}/menu/*, /branches/{id}/menu).
export const menuApi = defineApi<MenuApi>("menu", { mock: menuMock });
