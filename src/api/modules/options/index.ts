/** Module options — nhóm tuỳ chọn món (OW-03, đặc tả mục 12). Mock; BE chưa có. */
import type { BranchOptionState, OptionGroup } from "../../../types";
import { defineApi } from "../../define";
import { optionsMock } from "./mock";

export type OptionGroupInput = Omit<OptionGroup, "id" | "tenantId">;

export interface OptionsApi {
  listGroups(chainId: string): Promise<OptionGroup[]>;
  createGroup(chainId: string, input: OptionGroupInput): Promise<OptionGroup>;
  updateGroup(chainId: string, id: string, patch: Partial<OptionGroupInput>): Promise<OptionGroup>;
  deleteGroup(chainId: string, id: string): Promise<void>;
  /** Cờ còn bán của từng tuỳ chọn tại một chi nhánh. */
  listBranchStates(chainId: string, branchId: string): Promise<BranchOptionState[]>;
  setBranchOptionAvailable(chainId: string, branchId: string, optionId: string, isAvailable: boolean): Promise<void>;
}

// CHỜ BE: OW-03 chưa có endpoint. Bản real viết ở giai đoạn 4.
export const optionsApi = defineApi<OptionsApi>("options", { mock: optionsMock });
