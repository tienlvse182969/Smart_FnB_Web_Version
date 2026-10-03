/**
 * Ánh xạ `GET/PATCH /manager/menu-options` (BE `manager-operations.service.ts:182-202`, `:204-264`) sang kiểu web theo WHITELIST.
 * API trả mảng phẳng KHÔNG có thứ tự nhóm/tuỳ chọn: web tự gom theo `group.id` và sắp theo tên (chưa nhờ BE).
 */
import { parseAmount } from "../../../lib/reportFormat";
import type { BranchOptionGroupView, BranchOptionRow, BranchOptionWriteResult } from "../../../types";

export interface RawBranchOption {
  id: string;
  name: string;
  priceDelta: string | number;
  isActive: boolean;
  group: { id: string; name: string; isActive: boolean };
  isAvailable: boolean;
  effectiveAvailable: boolean;
}

export interface RawOptionAvailabilityResult {
  optionId: string;
  isAvailable: boolean;
  effectiveAvailable: boolean;
  affectedOrderIds?: string[];
}

export function mapBranchOption(raw: RawBranchOption): BranchOptionRow {
  return {
    optionId: raw.id,
    name: raw.name,
    priceDelta: parseAmount(raw.priceDelta),
    groupId: raw.group.id,
    groupName: raw.group.name,
    // Owner tắt = tuỳ chọn hoặc cả nhóm bị tắt ở cấp chuỗi. `effectiveAvailable` cũng false khi Manager tự tắt nên KHÔNG dùng ở đây.
    ownerDisabled: !raw.isActive || !raw.group.isActive,
    isAvailable: raw.isAvailable,
    effectiveAvailable: raw.effectiveAvailable,
  };
}

export function mapWriteResult(raw: RawOptionAvailabilityResult): BranchOptionWriteResult {
  return {
    optionId: raw.optionId,
    isAvailable: raw.isAvailable,
    effectiveAvailable: raw.effectiveAvailable,
    affectedOrderCount: raw.affectedOrderIds?.length ?? 0,
  };
}

const byName = (a: string, b: string) => a.localeCompare(b, "vi");

/** Gom theo nhóm; nhóm sắp theo tên, tuỳ chọn trong nhóm sắp theo tên. */
export function groupBranchOptions(rows: BranchOptionRow[]): BranchOptionGroupView[] {
  const groups = new Map<string, BranchOptionGroupView>();
  for (const row of rows) {
    const g = groups.get(row.groupId) ?? { groupId: row.groupId, groupName: row.groupName, options: [] };
    g.options.push(row);
    groups.set(row.groupId, g);
  }
  return [...groups.values()]
    .map((g) => ({ ...g, options: [...g.options].sort((a, b) => byName(a.name, b.name)) }))
    .sort((a, b) => byName(a.groupName, b.groupName));
}
