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
  /** Cho phép gom món khi pha (OW-02, đặc tả 8.3; BE `allow_batching`, #17). `false` = "Không gom món": mỗi ly là một mẻ. MỘT nguồn cho mock lẫn real. */
  allowBatching: boolean;
  /** Cờ kinh doanh cấp chuỗi: Owner tắt → mọi chi nhánh đều không bán (OW-04). */
  isActive: boolean;
  branches: MenuItemBranch[];
  /** Số chi nhánh đang được gán (isEnabled). */
  enabledBranchCount: number;
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
  /** Mặc định BE là `true`; web gửi tường minh khi tạo món (`CreateMenuItemDto`, menu.dto.ts:112-119). */
  allowBatching?: boolean;
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
  /** Owner đã tắt món (cấp chuỗi): chi nhánh không bật lại được (BR-12). BE chưa trả món này (api-contract-plan #19) nên real luôn false. */
  ownerDisabled: boolean;
};
