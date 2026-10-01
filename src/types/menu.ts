/** Kiểu dữ liệu Menu theo đặc tả v9 (mục 12, BR-12/BR-13). `tenantId` chính là chainId của backend. */

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
  /** Nhóm tuỳ chọn gắn vào món (đặc tả 12.2). Rỗng/không có = món không có tuỳ chọn. */
  optionGroupIds?: string[];
};

/**
 * Trạng thái của món tại một chi nhánh cụ thể.
 * Sự tồn tại của bản ghi = món có mặt ở chi nhánh đó.
 *
 * BR-12: món hiện trên POS khi cờ cấp chuỗi (`activeChain`, Owner) bật, món được gán cho
 * chi nhánh (có bản ghi này) và cờ còn bán hôm nay (`isAvailable`, Manager/Barista) bật.
 * Owner tắt thì chi nhánh không bật lại được.
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
