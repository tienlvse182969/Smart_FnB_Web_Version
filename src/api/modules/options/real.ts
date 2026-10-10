/**
 * Bản REAL của module options — BE role OWNER, `chain-menu.controller.ts:114-205, 329-345`. Đã bật mặc định từ 6.3.
 * KHÔNG import `api/mock/*` và KHÔNG dùng localStorage. Cờ "không gom món" thuộc MenuItem.allowBatching.
 * Body CHỈ gồm trường nằm trong DTO của BE: `forbidNonWhitelisted` trả 400 nếu gửi trường lạ.
 */
import { mapWithLimit } from "../../../lib/concurrency";
import { ApiError } from "../../http/errors";
import { request } from "../../http/client";
import { mapGroup, mapOption, type RawOption, type RawOptionGroup } from "./mapper";
import type { BranchOptionState } from "../../../types";
import { validateGroupFields, validateGroupPatch, validateOptionFields } from "./rules";
import type { OptionsApi } from "./index";

/** Số request đọc cấu hình món chạy cùng lúc (quyết định GĐ6 số 9). */
export const ITEM_CONFIG_CONCURRENCY = 4;

const base = (chainId: string) => `/restaurant-chains/${chainId}/menu`;

/** Bỏ các khoá `undefined` để body chỉ có đúng trường được đặt. */
function defined<T extends Record<string, unknown>>(source: T): Partial<T> {
  return Object.fromEntries(Object.entries(source).filter(([, value]) => value !== undefined)) as Partial<T>;
}

function assertValid(errors: string[]): void {
  if (errors.length) throw new ApiError(400, errors[0], errors);
}

export const optionsReal: OptionsApi = {
  capabilities: { isDefault: true, branchStates: true },

  async listGroups(chainId) {
    return (await request<RawOptionGroup[]>(`${base(chainId)}/option-groups`)).map(mapGroup);
  },

  async listItemGroups(chainId, itemId) {
    // BE trả nhóm kèm `displayOrder` của liên kết (`menu.service.ts:450-462`), đã sắp theo thứ tự gắn.
    return (await request<RawOptionGroup[]>(`${base(chainId)}/items/${itemId}/option-groups`)).map(mapGroup);
  },

  async listItemConfigs(chainId, itemIds) {
    if (!itemIds) throw new Error("Cần danh sách món để đọc cấu hình tuỳ chọn (BE chưa có cách đọc gộp, #16).");
    const lists = await mapWithLimit(itemIds, ITEM_CONFIG_CONCURRENCY, (itemId) =>
      request<RawOptionGroup[]>(`${base(chainId)}/items/${itemId}/option-groups`),
    );
    return itemIds.flatMap((menuItemId, i) => (lists[i].length ? [{ menuItemId, groupIds: lists[i].map((g) => g.id) }] : []));
  },

  async listBranchStates(chainId, branchId) {
    return request<BranchOptionState[]>(`${base(chainId)}/option-groups/branch-states?${new URLSearchParams({ branchId })}`);
  },

  async addGroup(chainId, fields) {
    assertValid(validateGroupFields(fields));
    // CreateMenuOptionGroupDto (menu.dto.ts:236-284); `isActive` không có khi tạo.
    const body = defined({
      code: fields.code,
      name: fields.name.trim(),
      isRequired: fields.isRequired,
      minSelections: fields.minSelections,
      maxSelections: fields.maxSelections,
      displayOrder: fields.displayOrder,
    });
    return mapGroup(await request<RawOptionGroup>(`${base(chainId)}/option-groups`, { method: "POST", body }));
  },

  async patchGroup(chainId, groupId, patch) {
    assertValid(validateGroupPatch(patch));
    // UpdateMenuOptionGroupDto = Partial(CreateMenuOptionGroupDto) + isActive (menu.dto.ts:287-293).
    const body = defined({
      code: patch.code,
      name: patch.name?.trim(),
      isRequired: patch.isRequired,
      minSelections: patch.minSelections,
      maxSelections: patch.maxSelections,
      displayOrder: patch.displayOrder,
      isActive: patch.isActive,
    });
    return mapGroup(await request<RawOptionGroup>(`${base(chainId)}/option-groups/${groupId}`, { method: "PATCH", body }));
  },

  async removeGroup(chainId, groupId) {
    await request(`${base(chainId)}/option-groups/${groupId}`, { method: "DELETE" });
  },

  async addOption(chainId, groupId, fields) {
    assertValid(validateOptionFields(fields));
    // Tạo option trước; cờ mặc định được bật qua PATCH sau khi tạo.
    const body = defined({ code: fields.code, name: fields.name.trim(), priceDelta: fields.priceDelta, displayOrder: fields.displayOrder });
    return mapOption(await request<RawOption>(`${base(chainId)}/option-groups/${groupId}/options`, { method: "POST", body }));
  },

  async patchOption(chainId, groupId, optionId, patch) {
    assertValid(validateOptionFields(patch));
    const body = defined({ code: patch.code, name: patch.name?.trim(), priceDelta: patch.priceDelta, displayOrder: patch.displayOrder, isActive: patch.isActive, isDefault: patch.isDefault });
    return mapOption(await request<RawOption>(`${base(chainId)}/option-groups/${groupId}/options/${optionId}`, { method: "PATCH", body }));
  },

  async removeOption(chainId, groupId, optionId) {
    await request(`${base(chainId)}/option-groups/${groupId}/options/${optionId}`, { method: "DELETE" });
  },

  async setItemGroups(chainId, itemId, groupIds) {
    // SetMenuItemOptionGroupsDto (menu.dto.ts:344): { optionGroupIds }, thứ tự mảng = thứ tự hiển thị; BE trả danh sách nhóm đã gắn.
    const saved = await request<RawOptionGroup[]>(`${base(chainId)}/items/${itemId}/option-groups`, { method: "PUT", body: { optionGroupIds: groupIds } });
    return saved.map((g) => g.id);
  },
};
