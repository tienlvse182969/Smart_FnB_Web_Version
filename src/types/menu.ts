/** Kiểu dữ liệu Menu theo đặc tả v7. */

/**
 * Món ăn thuộc về CHUỖI (owner quản lý).
 * Trạng thái bán và số suất nằm ở BranchMenuItem.
 */
export type MenuItem = {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  category: string;
  price: number;
  /** Owner tắt → mọi chi nhánh đều không bán. */
  activeChain: boolean;
};

/**
 * Trạng thái của món tại một chi nhánh cụ thể.
 * Sự tồn tại của bản ghi = món có mặt ở chi nhánh đó.
 *
 * BR-06: món bán được khi CẢ HAI cờ đều bật — `MenuItem.activeChain` (Owner,
 * cấp chuỗi) VÀ `isAvailable` (Branch Manager/bếp, cấp chi nhánh). Owner tắt
 * thì chi nhánh không bật lại được — xem `menu.service.ts#isSellable`.
 */
export type BranchMenuItem = {
  branchId: string;
  menuItemId: string;
  /** Branch Manager / bếp bật/tắt cho chi nhánh mình. */
  isAvailable: boolean;
  /** Suất còn lại hôm nay tại chi nhánh, null = không giới hạn. */
  remainingToday: number | null;
  /** Đã bán hôm nay tại chi nhánh (dùng cho "món bán chạy"). */
  soldToday: number;
};
