/** Service quản lý Thực đơn & Món ăn chi nhánh — đặc tả v7 mục 4.4/4.5/4.7, BR-06/07/08/19. */
import { db } from "../mock/db";
import type { BranchMenuItem, MenuItem, RoleKey } from "../types";
import { assertTenantWritable } from "./_guard";
import { delay, newId } from "./_utils";

/**
 * BR-06: món bán được khi CẢ HAI cờ đều bật — `activeChain` (Owner, cấp
 * chuỗi) và `isAvailable` (chi nhánh) — và còn suất (`remainingToday`).
 */
export function isSellable(menuItem: MenuItem, branchItem: BranchMenuItem | undefined): boolean {
  if (!branchItem) return false;
  return (
    menuItem.activeChain &&
    branchItem.isAvailable &&
    (branchItem.remainingToday == null || branchItem.remainingToday > 0)
  );
}

/** Chỉ Branch Manager và Kitchen Staff được đổi trạng thái món tại chi nhánh (BR-06/4.7.D). */
function assertCanEditBranchAvailability(actingRole: RoleKey) {
  if (actingRole !== "manager" && actingRole !== "kitchen") {
    throw new Error("Chỉ Branch Manager hoặc Kitchen Staff mới được đổi trạng thái món tại chi nhánh");
  }
}

/** BR-21: Platform Admin chỉ xem số liệu tổng hợp của tenant, không xem menu/món. */
function assertNotAdmin(actingRole: RoleKey) {
  if (actingRole === "admin") {
    throw new Error("Platform Admin không được xem menu của doanh nghiệp (BR-21)");
  }
}

/** Danh sách món theo tenant. */
export async function listMenuItems(tenantId: string | undefined, actingRole: RoleKey): Promise<MenuItem[]> {
  assertNotAdmin(actingRole);
  await delay();
  if (!tenantId) return [...db.menuItems];
  return db.menuItems.filter((m) => m.tenantId === tenantId);
}

/** Lấy 1 món theo ID. */
export async function getMenuItem(id: string): Promise<MenuItem | undefined> {
  await delay();
  return db.menuItems.find((m) => m.id === id);
}

/** Danh sách trạng thái món theo chi nhánh. */
export async function listBranchMenuItems(
  branchId: string
): Promise<BranchMenuItem[]> {
  await delay();
  return db.branchMenuItems.filter((bm) => bm.branchId === branchId);
}

/**
 * Bật/tắt món tại chi nhánh (Branch Manager hoặc Kitchen — BR-06, mục 4.7.D).
 * Owner đã tắt món ở cấp chuỗi (`activeChain = false`) thì chi nhánh KHÔNG
 * bật lại được, kể cả khi gọi hàm này với `isAvailable = true`.
 */
export async function toggleBranchMenuItem(
  branchId: string,
  menuItemId: string,
  isAvailable: boolean,
  actingRole: RoleKey
): Promise<void> {
  assertCanEditBranchAvailability(actingRole);
  await delay();
  const branch = db.branches.find((b) => b.id === branchId);
  if (branch) assertTenantWritable(branch.tenantId);

  if (isAvailable) {
    const menuItem = db.menuItems.find((m) => m.id === menuItemId);
    if (!menuItem) throw new Error("Món không tồn tại");
    if (!menuItem.activeChain) {
      throw new Error("Owner đã tắt món này ở cấp chuỗi — chi nhánh không thể bật lại");
    }
  }

  let item = db.branchMenuItems.find(
    (bm) => bm.branchId === branchId && bm.menuItemId === menuItemId
  );
  if (item) {
    item.isAvailable = isAvailable;
  } else {
    db.branchMenuItems.push({
      branchId,
      menuItemId,
      isAvailable,
      remainingToday: null,
      soldToday: 0,
    });
  }
}

/** Cập nhật số suất còn lại trong ngày (Branch Manager hoặc Kitchen). */
export async function updateRemaining(
  branchId: string,
  menuItemId: string,
  remainingToday: number | null,
  actingRole: RoleKey
): Promise<void> {
  assertCanEditBranchAvailability(actingRole);
  await delay();
  const branch = db.branches.find((b) => b.id === branchId);
  if (branch) assertTenantWritable(branch.tenantId);
  let item = db.branchMenuItems.find(
    (bm) => bm.branchId === branchId && bm.menuItemId === menuItemId
  );
  if (item) {
    item.remainingToday = remainingToday;
  } else {
    db.branchMenuItems.push({
      branchId,
      menuItemId,
      isAvailable: true,
      remainingToday,
      soldToday: 0,
    });
  }
}

/** Thêm món mới vào menu chung (Owner: tên, mô tả, ảnh, giá, danh mục — mục 4.4.B). */
export async function createMenuItem(
  item: Omit<MenuItem, "id">
): Promise<MenuItem> {
  await delay();
  assertTenantWritable(item.tenantId);
  const newItem: MenuItem = {
    id: `MENU-${newId()}`,
    ...item,
  };
  db.menuItems.push(newItem);
  return newItem;
}

/** Sửa món ăn (Owner). */
export async function updateMenuItem(
  id: string,
  item: Partial<MenuItem>
): Promise<MenuItem> {
  await delay();
  const idx = db.menuItems.findIndex((m) => m.id === id);
  if (idx === -1) throw new Error("Món không tồn tại");
  assertTenantWritable(db.menuItems[idx].tenantId);
  db.menuItems[idx] = { ...db.menuItems[idx], ...item };
  return db.menuItems[idx];
}

/**
 * Owner chọn chi nhánh "có mặt" bán món này (mục 4.4.B). Chi nhánh mới được
 * chọn mặc định TẮT (`isAvailable=false`) — Branch Manager/Kitchen tự bật
 * (BR-06). Bỏ chọn thì gỡ hẳn bản ghi khỏi chi nhánh đó.
 */
export async function setMenuItemPresence(menuItemId: string, branchIds: string[]): Promise<void> {
  await delay();
  const menuItem = db.menuItems.find((m) => m.id === menuItemId);
  if (!menuItem) throw new Error("Món không tồn tại");
  assertTenantWritable(menuItem.tenantId);

  for (const branchId of branchIds) {
    const exists = db.branchMenuItems.some(
      (bm) => bm.menuItemId === menuItemId && bm.branchId === branchId
    );
    if (!exists) {
      db.branchMenuItems.push({ branchId, menuItemId, isAvailable: false, remainingToday: null, soldToday: 0 });
    }
  }
  db.branchMenuItems = db.branchMenuItems.filter(
    (bm) => bm.menuItemId !== menuItemId || branchIds.includes(bm.branchId)
  );
}
