/**
 * Module options — nhóm tuỳ chọn món (OW-03, đặc tả mục 12). Mock; BE chưa có controller (docs/api-contract-plan.md mục 7, #12–17, #20).
 * Shape khớp model Prisma; khi BE có endpoint chỉ cần thêm `real.ts`, màn hình không đổi.
 * Món được tham chiếu bằng ID THẬT của BE (không có lớp ánh xạ).
 */
import type { BranchOptionState, ItemOptionConfig, OptionGroup, OptionGroupInput } from "../../../types";
import { defineApi } from "../../define";
import { optionsMock } from "./mock";

export type { OptionGroupInput } from "../../../types";

export interface OptionsApi {
  /** Nhóm của chuỗi, theo `displayOrder`; tuỳ chọn trong nhóm cũng theo `displayOrder`. */
  listGroups(chainId: string): Promise<OptionGroup[]>;
  /** Thứ tự tuỳ chọn = thứ tự mảng `options`. Lỗi quy tắc → 400, trùng mã nhóm → 409. */
  createGroup(chainId: string, input: OptionGroupInput): Promise<OptionGroup>;
  /** Thay cả nhóm: tuỳ chọn có `id` được giữ, không `id` là mới, vắng mặt là xoá. */
  updateGroup(chainId: string, id: string, input: OptionGroupInput): Promise<OptionGroup>;
  /** Xoá nhóm và gỡ khỏi mọi món; đơn cũ không đổi (BR-15). */
  deleteGroup(chainId: string, id: string): Promise<void>;
  /** Đặt lại `displayOrder` của nhóm theo thứ tự id truyền vào. */
  reorderGroups(chainId: string, orderedIds: string[]): Promise<void>;
  /** Cờ kinh doanh cấp chuỗi của một tuỳ chọn (OW-04). Tắt tuỳ chọn đang mặc định thì bỏ cờ mặc định. */
  setOptionActive(chainId: string, groupId: string, optionId: string, isActive: boolean): Promise<OptionGroup>;
  /** Cấu hình tuỳ chọn của mọi món có cấu hình (món không có = chưa gắn nhóm, gom món bình thường). */
  listItemConfigs(chainId: string): Promise<ItemOptionConfig[]>;
  /** Gắn nhóm cho món (thứ tự mảng = `MenuItemOptionGroup.displayOrder`) + cờ không gom món. CHỜ BE: lưu tạm trong mock. */
  setItemConfig(chainId: string, config: ItemOptionConfig): Promise<ItemOptionConfig>;
  /** Cờ còn bán của từng tuỳ chọn tại chi nhánh — CHỈ ĐỌC; Manager bật/tắt thuộc giai đoạn 5 (#20). */
  listBranchStates(chainId: string, branchId: string): Promise<BranchOptionState[]>;
}

export const optionsApi = defineApi<OptionsApi>("options", { mock: optionsMock });
