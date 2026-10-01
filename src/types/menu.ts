/**
 * Kiểu dữ liệu Menu theo DTO thật của BE (`/restaurant-chains/{id}/menu/*`, `/branches/{id}/menu`) và đặc tả v9
 * (mục 12, BR-12/BR-13). Tiền là số nguyên đồng (BR-19) — BE trả chuỗi thập phân, mapper dùng `parseAmount`.
 * `remainingPortions` của BE (kho, v7) KHÔNG có ở đây: web bỏ qua và không bao giờ gửi.
 */

/** Danh mục món của chuỗi. */
export type MenuCategory = {
  id: string;
  name: string;
  description: string | null;
  displayOrder: number;
  /** Cờ hiển thị cấp chuỗi. */
  isActive: boolean;
  /** Số món (chưa xoá) trong danh mục. */
  itemCount: number;
};

export type CategoryInput = {
  name: string;
  description?: string;
  displayOrder?: number;
};

/** Một chi nhánh trong `branches[]` của món (BE chỉ trả các chi nhánh đã từng được gán). */
export type MenuItemBranch = {
  branchId: string;
  /** Món được gán cho chi nhánh (OW-04) — "có mặt tại". */
  isEnabled: boolean;
  /** Cờ còn bán hôm nay do Manager/Barista bật tắt (BR-12). */
  isAvailable: boolean;
};

/** Món của CHUỖI (Owner quản lý). Một giá toàn chuỗi (BR-13). */
export type MenuItem = {
  id: string;
  categoryId: string;
  categoryName: string;
  /** Mã món, duy nhất toàn hệ thống, chỉ nhập khi tạo. */
  sku: string;
  name: string;
  description: string | null;
  /** Đồng, số nguyên. */
  price: number;
  /** Ảnh dạng URL — TODO(BE): chưa có endpoint tải ảnh lên. */
  imageUrl: string | null;
  preparationMinutes: number | null;
  /** Cờ kinh doanh cấp chuỗi: Owner tắt → mọi chi nhánh đều không bán (OW-04). */
  isActive: boolean;
  branches: MenuItemBranch[];
  /** Số chi nhánh đang được gán (isEnabled). */
  enabledBranchCount: number;
  /** Nhóm tuỳ chọn gắn vào món (OW-03) — chỉ có ở mock tới giai đoạn 4.3; BE chưa trả. */
  optionGroupIds?: string[];
};

export type MenuItemFilter = {
  categoryId?: string;
  search?: string;
  isActive?: boolean;
};

export type MenuItemInput = {
  categoryId: string;
  /** A-Z, 0-9, `_`, `-`; tối đa 50 ký tự. */
  sku: string;
  name: string;
  description?: string;
  /** Số nguyên đồng ≥ 0. */
  price: number;
  imageUrl?: string;
  /** 0–1440 phút. */
  preparationMinutes?: number;
  /** Chi nhánh bán món; luôn gửi tường minh khi tạo. */
  branchIds: string[];
};

/** Sửa món: SKU không đổi được, gán chi nhánh đi đường riêng. */
export type MenuItemPatch = Partial<Omit<MenuItemInput, "sku" | "branchIds">>;

/**
 * Món như một chi nhánh đang bán (`GET /branches/{id}/menu`): BE chỉ trả món Owner đang bật và đã gán cho chi nhánh
 * (BR-12), nên không có "món chuỗi đã tắt".
 */
export type BranchMenuItem = {
  menuItemId: string;
  sku: string;
  name: string;
  categoryName: string;
  price: number;
  imageUrl: string | null;
  /** Còn bán hôm nay — Manager/Barista bật tắt. */
  isAvailable: boolean;
};
