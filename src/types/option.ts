/**
 * Tuỳ chọn món (đặc tả v9 mục 12, BR-12, BR-14, BR-15) — bám đúng model Prisma của BE
 * (`menu_option_groups`, `menu_options`, `menu_item_option_groups`, `branch_menu_options`). BE CHƯA có endpoint (docs/api-contract-plan.md
 * mục 7, #12–17) nên web chạy mock tới khi có; shape ở đây là shape sẽ gửi/nhận khi viết `real.ts`.
 */

export type OptionItem = {
  id: string;
  name: string;
  /** Duy nhất trong nhóm. */
  code: string;
  /** Giá cộng thêm (đồng, số nguyên ≥ 0 — BR-19). */
  priceDelta: number;
  displayOrder: number;
  /** Cờ kinh doanh cấp chuỗi (OW-04): tắt thì mọi chi nhánh không bán tuỳ chọn này. */
  isActive: boolean;
  /** Tuỳ chọn mặc định (đặc tả 12.2). */
  isDefault?: boolean;
};

export type OptionGroup = {
  id: string;
  name: string;
  /** Duy nhất trong chuỗi. */
  code: string;
  isRequired: boolean;
  /** Số chọn tối thiểu / tối đa (BR-14). */
  minSelections: number;
  maxSelections: number;
  displayOrder: number;
  isActive: boolean;
  options: OptionItem[];
  /** Số món đang dùng nhóm này: real = `_count.menuItems` của BE; mock = số món có cấu hình gắn nhóm. Dùng cho cột "Số món" và hộp xoá. */
  menuItemCount?: number;
};

/** Tuỳ chọn khi tạo/sửa. Có `id` = sửa tuỳ chọn đó; không có = tạo mới. */
export type OptionInput = {
  id?: string;
  name: string;
  code: string;
  priceDelta: number;
  isActive: boolean;
  /** Bỏ trống/`undefined` = không mặc định. */
  isDefault?: boolean;
};

/** Tạo/sửa nhóm. Khi sửa mà có `options` thì THAY toàn bộ danh sách: có `id` giữ/sửa, không `id` tạo, thiếu thì xoá; thứ tự mảng = displayOrder. */
export type OptionGroupInput = {
  name: string;
  code: string;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  /** Chỉ kiểm khoảng 0–9999 nếu có (BE `displayOrder`); thứ tự thật do web đặt khi sắp xếp. */
  displayOrder?: number;
  isActive: boolean;
  options: OptionInput[];
};

/** Cờ còn bán của một tuỳ chọn tại một chi nhánh — Manager/Barista bật tắt (BR-12, BR-36). Web chỉ xem ở giai đoạn 4. */
export type BranchOptionState = {
  branchId: string;
  optionId: string;
  isAvailable: boolean;
};

/** Một tuỳ chọn tại chi nhánh như Manager thấy (`GET /manager/menu-options`, 5.7c). */
export type BranchOptionRow = {
  optionId: string;
  name: string;
  priceDelta: number;
  groupId: string;
  groupName: string;
  /** Owner đã tắt tuỳ chọn hoặc cả nhóm (cấp chuỗi): chi nhánh không bật lại được (BR-12). KHÔNG suy từ `effectiveAvailable`. */
  ownerDisabled: boolean;
  /** Cờ riêng của chi nhánh (Manager/Barista bật tắt). */
  isAvailable: boolean;
  /** Bán được thật = Owner bật và chi nhánh bật. Chỉ để hiển thị. */
  effectiveAvailable: boolean;
};

/** Nhóm tuỳ chọn tại chi nhánh do web gom từ `BranchOptionRow` (API không trả thứ tự nhóm/tuỳ chọn). */
export type BranchOptionGroupView = {
  groupId: string;
  groupName: string;
  options: BranchOptionRow[];
};

/** Kết quả bật/tắt tuỳ chọn tại chi nhánh. `affectedOrderCount` = số đơn đã thanh toán bị chuyển "Hết món" (khi tắt). */
export type BranchOptionWriteResult = {
  optionId: string;
  isAvailable: boolean;
  effectiveAvailable: boolean;
  affectedOrderCount: number;
};

/**
 * Cấu hình tuỳ chọn của một MÓN THẬT (theo ID món từ BE): các nhóm gắn vào món theo thứ tự
 * (`MenuItemOptionGroup.displayOrder`). Cờ "không gom món" KHÔNG nằm ở đây từ 6.3d: nó là `MenuItem.allowBatching` (một nguồn, #17).
 */
export type ItemOptionConfig = {
  menuItemId: string;
  groupIds: string[];
};
