/**
 * Module options — nhóm tuỳ chọn món (OW-03, đặc tả mục 12).
 * Giao diện theo TỪNG THAO TÁC như BE (`chain-menu.controller.ts:114-205, 329-345`): mỗi hàm ghi đúng 1 request.
 * Mock (mặc định) cài đủ trên `ChainState.optionGroups`; real (`real.ts`, chưa bật) gọi BE `0083289`.
 * Món được tham chiếu bằng ID THẬT của BE (không có lớp ánh xạ).
 */
import type { BranchOptionState, ItemOptionConfig, OptionGroup, OptionGroupInput, OptionItem } from "../../../types";
import { defineApi } from "../../define";
import { optionsMock } from "./mock";
import { optionsReal } from "./real";
import type { GroupFields, OptionFields } from "./rules";

export type { OptionGroupInput } from "../../../types";
export type { GroupFields, OptionFields } from "./rules";

/** Việc mà bản đang chạy làm được. Mock: cả ba; real: không có gì (BE chưa có #15, #17, và Owner chưa đọc được trạng thái theo chi nhánh). */
export interface OptionsCapabilities {
  /** Tuỳ chọn mặc định (`isDefault`, #15). */
  isDefault: boolean;
  /** Cờ "không gom món" (`noBatch`, #17). */
  allowBatching: boolean;
  /** Đọc trạng thái còn bán của tuỳ chọn theo chi nhánh (`listBranchStates`). */
  branchStates: boolean;
}

/** Trường được sửa của một nhóm (sửa từng phần). `isActive` = cờ kinh doanh cấp chuỗi (OW-04). */
export type GroupPatch = Partial<GroupFields> & { isActive?: boolean };
/** Trường được sửa của một tuỳ chọn (sửa từng phần). `isDefault` chỉ mock nhận. */
export type OptionPatch = Partial<OptionFields> & { isActive?: boolean; isDefault?: boolean };

export interface OptionsApi {
  readonly capabilities: OptionsCapabilities;

  // --- đọc ---------------------------------------------------------------------------------------------------------
  /** Nhóm của chuỗi, theo `displayOrder`, kèm tuỳ chọn (cũng theo `displayOrder`). `GET option-groups`. */
  listGroups(chainId: string): Promise<OptionGroup[]>;
  /** Nhóm đang gắn vào một món theo thứ tự gắn. `GET items/:id/option-groups`. */
  listItemGroups(chainId: string, itemId: string): Promise<OptionGroup[]>;
  /**
   * Cấu hình tuỳ chọn của nhiều món; món chưa gắn nhóm nào không có trong kết quả (gom món bình thường).
   * Real: BẮT BUỘC `itemIds` (BE không có cách đọc gộp, #16), mỗi món một request, chạy song song TỐI ĐA 4.
   * Mock: có `itemIds` thì lọc theo đó, không có thì trả mọi món có cấu hình.
   */
  listItemConfigs(chainId: string, itemIds?: string[]): Promise<ItemOptionConfig[]>;
  /** Cờ còn bán của từng tuỳ chọn tại chi nhánh — chỉ mock (`capabilities.branchStates`); real ném lỗi "chưa hỗ trợ", không gọi BE. */
  listBranchStates(chainId: string, branchId: string): Promise<BranchOptionState[]>;

  // --- ghi: mỗi hàm đúng 1 request ------------------------------------------------------------------------------------
  /** Tạo nhóm RỖNG (chưa có tuỳ chọn). `POST option-groups`. Trùng mã → 409. */
  addGroup(chainId: string, fields: GroupFields): Promise<OptionGroup>;
  /** Sửa từng phần một nhóm. `PATCH option-groups/:id`. */
  patchGroup(chainId: string, groupId: string, patch: GroupPatch): Promise<OptionGroup>;
  /** Xoá nhóm và gỡ khỏi mọi món; đơn cũ không đổi (BR-15). `DELETE option-groups/:id`. */
  removeGroup(chainId: string, groupId: string): Promise<void>;
  /** Thêm tuỳ chọn vào nhóm (luôn đang bật). `POST option-groups/:id/options`. Trùng mã trong nhóm → 409. */
  addOption(chainId: string, groupId: string, fields: OptionFields): Promise<OptionItem>;
  /** Sửa từng phần một tuỳ chọn, kể cả bật/tắt cấp chuỗi. `PATCH option-groups/:id/options/:optionId`. */
  patchOption(chainId: string, groupId: string, optionId: string, patch: OptionPatch): Promise<OptionItem>;
  /** Xoá một tuỳ chọn. `DELETE option-groups/:id/options/:optionId`. */
  removeOption(chainId: string, groupId: string, optionId: string): Promise<void>;
  /** Thay danh sách nhóm của món; thứ tự mảng = thứ tự hiển thị. `PUT items/:id/option-groups` body `{optionGroupIds}`. Trả danh sách id đã lưu. */
  setItemGroups(chainId: string, itemId: string, groupIds: string[]): Promise<string[]>;

  // --- hàm CŨ (gửi/nhận cả nhóm lồng tuỳ chọn). Xoá ở 6.2b khi màn hình chuyển sang thao tác từng dòng; real KHÔNG hỗ trợ. ---
  /** @deprecated Dùng `addGroup` + `addOption`. Xoá ở 6.2b. Thứ tự tuỳ chọn = thứ tự mảng `options`. Lỗi quy tắc → 400, trùng mã nhóm → 409. */
  createGroup(chainId: string, input: OptionGroupInput): Promise<OptionGroup>;
  /** @deprecated Dùng `patchGroup`, `addOption`, `patchOption`, `removeOption`. Xoá ở 6.2b. Thay cả nhóm: tuỳ chọn có `id` được giữ, không `id` là mới, vắng mặt là xoá. */
  updateGroup(chainId: string, id: string, input: OptionGroupInput): Promise<OptionGroup>;
  /** @deprecated Dùng `removeGroup`. Xoá ở 6.2b. */
  deleteGroup(chainId: string, id: string): Promise<void>;
  /** @deprecated Dùng `patchGroup` với `displayOrder`. Xoá ở 6.2b. Đặt lại `displayOrder` của nhóm theo thứ tự id truyền vào. */
  reorderGroups(chainId: string, orderedIds: string[]): Promise<void>;
  /** @deprecated Dùng `patchOption` với `isActive`. Xoá ở 6.2b. Tuỳ chọn đang mặc định thì không tắt được (400) — Owner phải bỏ mặc định qua `updateGroup`. */
  setOptionActive(chainId: string, groupId: string, optionId: string, isActive: boolean): Promise<OptionGroup>;
  /** @deprecated Dùng `setItemGroups`. Xoá ở 6.2b. Gắn nhóm cho món + cờ không gom món (mock). */
  setItemConfig(chainId: string, config: ItemOptionConfig): Promise<ItemOptionConfig>;
}

export const optionsApi = defineApi<OptionsApi>("options", { real: optionsReal, mock: optionsMock });
