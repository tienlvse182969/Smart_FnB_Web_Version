/**
 * Topping thêm của món (OW-15, đặc tả mục 27, BR-80). Theo DTO của BE `menu-extras.controller.ts`.
 * Tiền là số nguyên đồng (BR-19); BE trả chuỗi thập phân nên mapper dùng `parseAmount`.
 */

/** Một topping trong thư viện của chuỗi. */
export type MenuExtra = {
  id: string;
  name: string;
  /** Giá mặc định (đồng), dùng khi gắn vào món mà không đặt giá riêng. */
  price: number;
  /** Cờ kinh doanh cấp chuỗi. Tắt = mọi món không bán được topping này. */
  isActive: boolean;
};

export type ExtraInput = {
  name: string;
  price: number;
  isActive?: boolean;
};

/** Topping đã gắn vào một món. */
export type ItemExtraLink = {
  extraId: string;
  /** Tên và cờ của topping trong thư viện (để hiện nhãn "Đang tắt"). */
  name: string;
  libraryActive: boolean;
  /** Giá cộng thêm theo món (đồng). */
  price: number;
  /** Số phần tối đa mỗi ly, 1–5. */
  maxQuantity: number;
};

/** Cấu hình topping của một món; thứ tự mảng = thứ tự hiển thị. */
export type ItemExtras = {
  menuItemId: string;
  /** Tổng số phần topping tối đa của món (mặc định 5). */
  maxExtras: number;
  extras: ItemExtraLink[];
};

/** Thân `PUT items/:itemId/extras`. `displayOrder` do web đặt theo vị trí trong danh sách. */
export type ItemExtrasInput = {
  maxExtras: number;
  extras: { extraId: string; price: number; maxQuantity: number }[];
};
