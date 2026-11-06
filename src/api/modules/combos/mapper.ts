/** Ánh xạ response `combos.controller.ts` theo whitelist. Tiền qua `parseAmount` (BE trả chuỗi thập phân). */
import { parseAmount } from "../../../lib/reportFormat";
import { absoluteLogoUrl } from "../branding/mapper";
import type { Combo, ComboComponent } from "../../../types";

export interface RawCombo {
  id: string;
  categoryId: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  price: string | number;
  isActive: boolean;
  displayOrder: number;
  components: {
    type: string;
    name: string;
    quantity: number;
    fixedSizeCode?: string | null;
    displayOrder: number;
    choices: { menuItemId: string; surcharge: string | number; isDefault: boolean }[];
  }[];
  branches?: { branchId: string; isEnabled: boolean }[];
}

export function mapCombo(raw: RawCombo): Combo {
  const components: ComboComponent[] = [...raw.components]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((c) => ({
      type: c.type === "CHOICE" ? "CHOICE" : "FIXED",
      name: c.name,
      quantity: c.quantity,
      fixedSizeCode: c.fixedSizeCode ?? null,
      choices: c.choices.map((x) => ({ menuItemId: x.menuItemId, surcharge: parseAmount(x.surcharge), isDefault: x.isDefault })),
    }));
  return {
    id: raw.id,
    categoryId: raw.categoryId,
    name: raw.name,
    description: raw.description ?? null,
    imageUrl: absoluteLogoUrl(raw.imageUrl) ?? null,
    price: parseAmount(raw.price),
    isActive: raw.isActive,
    displayOrder: raw.displayOrder,
    components,
    branchIds: (raw.branches ?? []).filter((b) => b.isEnabled).map((b) => b.branchId),
  };
}
