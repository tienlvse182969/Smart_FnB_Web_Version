/** Ánh xạ response của BE `menu-extras.controller.ts` theo whitelist. Tiền qua `parseAmount` (BE trả chuỗi thập phân). */
import { parseAmount } from "../../../lib/reportFormat";
import type { ItemExtras, MenuExtra } from "../../../types";

export interface RawExtra {
  id: string;
  name: string;
  price: string | number;
  isActive: boolean;
}

export interface RawItemExtras {
  id: string;
  maxExtras: number;
  extras: { extraId: string; price: string | number; maxQuantity: number; displayOrder: number; extra: RawExtra }[];
}

export const mapExtra = (raw: RawExtra): MenuExtra => ({ id: raw.id, name: raw.name, price: parseAmount(raw.price), isActive: raw.isActive });

export function mapItemExtras(raw: RawItemExtras): ItemExtras {
  return {
    menuItemId: raw.id,
    maxExtras: raw.maxExtras,
    // BE đã sắp theo displayOrder; sắp lại để chắc chắn.
    extras: [...raw.extras]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((link) => ({
        extraId: link.extraId,
        name: link.extra.name,
        libraryActive: link.extra.isActive,
        price: parseAmount(link.price),
        maxQuantity: link.maxQuantity,
      })),
  };
}
