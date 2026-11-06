/**
 * Combo (OW-14, đặc tả mục 26, BR-77, BR-78, BR-79) theo DTO của BE `combos.controller.ts`.
 * Tiền là số nguyên đồng (BR-19); BE trả chuỗi thập phân nên mapper dùng `parseAmount`.
 */

export type ComboComponentType = "FIXED" | "CHOICE";

/** Một món trong thành phần: thành phần cố định có đúng 1, thành phần biến thể có 2–10. */
export type ComboChoice = {
  menuItemId: string;
  /** Phụ thu (đồng) khi khách chọn món này trong nhóm biến thể. */
  surcharge: number;
  /** Đúng một món mặc định trong mỗi thành phần. */
  isDefault: boolean;
};

export type ComboComponent = {
  type: ComboComponentType;
  /** Tên thành phần (tên nhóm với biến thể). Thành phần cố định lấy tên món. */
  name: string;
  /** 1–5. */
  quantity: number;
  /** Mã tuỳ chọn size cố định (`OptionItem.code` của nhóm SIZE), hoặc null. */
  fixedSizeCode: string | null;
  choices: ComboChoice[];
};

export type Combo = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  /** Giá chuỗi (đồng). Giá riêng theo chi nhánh đặt ở OW-16. */
  price: number;
  /** Cờ kinh doanh cấp chuỗi. */
  isActive: boolean;
  displayOrder: number;
  components: ComboComponent[];
  /** Chi nhánh đang được bán combo (đã gán). */
  branchIds: string[];
};

export type ComboInput = {
  categoryId: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  price: number;
  isActive?: boolean;
  components: ComboComponent[];
};

/** Sửa combo: các trường gửi lên; `components` có mặt = thay toàn bộ thành phần. */
export type ComboPatch = Partial<ComboInput>;
