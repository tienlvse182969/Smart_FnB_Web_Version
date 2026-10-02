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
  /** Tuỳ chọn mặc định (đặc tả 12.2). CHỜ BE: schema chưa có cột này (api-contract-plan.md mục 7 #15). */
  isDefault: boolean;
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
};

/** Tuỳ chọn khi tạo/sửa. Có `id` = sửa tuỳ chọn đó; không có = tạo mới. */
export type OptionInput = {
  id?: string;
  name: string;
  code: string;
  priceDelta: number;
  isActive: boolean;
  isDefault: boolean;
};

/** Tạo/sửa nhóm. Khi sửa mà có `options` thì THAY toàn bộ danh sách: có `id` giữ/sửa, không `id` tạo, thiếu thì xoá; thứ tự mảng = displayOrder. */
export type OptionGroupInput = {
  name: string;
  code: string;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  isActive: boolean;
  options: OptionInput[];
};

/** Cờ còn bán của một tuỳ chọn tại một chi nhánh — Manager/Barista bật tắt (BR-12, BR-36). Web chỉ xem ở giai đoạn 4. */
export type BranchOptionState = {
  branchId: string;
  optionId: string;
  isAvailable: boolean;
};

/**
 * Cấu hình tuỳ chọn của một MÓN THẬT (theo ID món từ BE): các nhóm gắn vào món theo thứ tự
 * (`MenuItemOptionGroup.displayOrder`) và cờ "không gom món" (đặc tả 8.3). CHỜ BE cho cả hai.
 */
export type ItemOptionConfig = {
  menuItemId: string;
  groupIds: string[];
  /** Món không gom khi pha: mỗi ly là một mẻ. CHỜ BE (mục 7 #17). */
  noBatch: boolean;
};
