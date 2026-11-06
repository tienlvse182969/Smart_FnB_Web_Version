/**
 * Module extras — topping thêm của món (OW-15, mục 27, BR-80). Real: BE `menu-extras.controller.ts`
 * (`/restaurant-chains/:chainId/menu/extras`, `.../items/:itemId/extras`), chỉ OWNER.
 * BE KHÔNG xoá thật: `DELETE extras/:id` chỉ tắt topping, giữ liên kết với món và ảnh chụp trong đơn.
 * Đổi giá thư viện KHÔNG đổi giá đã gắn vào món (BE: giá theo món giữ nguyên).
 */
import type { ExtraInput, ItemExtras, ItemExtrasInput, MenuExtra } from "../../../types";
import { defineApi } from "../../define";
import { extrasMock } from "./mock";
import { extrasReal } from "./real";

export interface ExtrasApi {
  /** Thư viện topping của chuỗi, gồm cả topping đang tắt, sắp theo tên. */
  listExtras(chainId: string): Promise<MenuExtra[]>;
  /** 409 nếu trùng tên trong chuỗi. */
  createExtra(chainId: string, input: ExtraInput): Promise<MenuExtra>;
  /** `PUT`: gửi đủ tên, giá, cờ. 404 nếu không thuộc chuỗi; 409 nếu trùng tên. */
  updateExtra(chainId: string, id: string, input: Required<ExtraInput>): Promise<MenuExtra>;
  /** Tắt cấp chuỗi (BE không xoá thật). */
  disableExtra(chainId: string, id: string): Promise<void>;
  /** Topping đã gắn vào món, theo thứ tự hiển thị. 404 nếu món không thuộc chuỗi. */
  getItemExtras(chainId: string, itemId: string): Promise<ItemExtras>;
  /** Thay toàn bộ topping của món. 400 nếu topping trùng hoặc ngoài chuỗi. */
  setItemExtras(chainId: string, itemId: string, input: ItemExtrasInput): Promise<void>;
}

export const extrasApi = defineApi<ExtrasApi>("extras", { real: extrasReal, mock: extrasMock });
