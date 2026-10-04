/**
 * Ánh xạ nhóm tuỳ chọn của BE (`optionGroupSelect`, `menu.service.ts:66-82`; `optionSelect` ngay trên đó) sang kiểu web theo WHITELIST:
 * trường lạ (`chainId`, `createdAt`, `_count`…) không được chép sang. `priceDelta` là Decimal nên JSON ra CHUỖI ("5000.00") → `parseAmount`.
 * BE không có `isDefault` (#15): real để `undefined`.
 */
import { parseAmount } from "../../../lib/reportFormat";
import type { OptionGroup, OptionItem } from "../../../types";

export interface RawOption {
  id: string;
  code: string;
  name: string;
  priceDelta: string | number;
  displayOrder: number;
  isActive: boolean;
}

export interface RawOptionGroup {
  id: string;
  code: string;
  name: string;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  displayOrder: number;
  isActive: boolean;
  /** Có ở mọi response nhóm (`optionGroupSelect`); thiếu thì coi như rỗng. */
  options?: RawOption[];
  /** Chỉ có ở `GET option-groups` (`menu.service.ts:158-168`); các response tạo/sửa không có. */
  _count?: { menuItems: number };
}

export function mapOption(raw: RawOption): OptionItem {
  return {
    id: raw.id,
    name: raw.name,
    code: raw.code,
    priceDelta: parseAmount(raw.priceDelta),
    displayOrder: raw.displayOrder,
    isActive: raw.isActive,
  };
}

export function mapGroup(raw: RawOptionGroup): OptionGroup {
  return {
    id: raw.id,
    name: raw.name,
    code: raw.code,
    isRequired: raw.isRequired,
    minSelections: raw.minSelections,
    maxSelections: raw.maxSelections,
    displayOrder: raw.displayOrder,
    isActive: raw.isActive,
    options: (raw.options ?? []).map(mapOption),
    menuItemCount: raw._count?.menuItems,
  };
}
