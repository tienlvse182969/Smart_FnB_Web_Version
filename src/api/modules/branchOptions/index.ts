/**
 * Module branchOptions — Manager bật/tắt tuỳ chọn tại chi nhánh (BM-02, BR-12, BR-36). Cờ riêng `VITE_API_BRANCH_OPTIONS`
 * (mặc định real) vì phía Owner (module `options`) còn mock và dùng ID mock, không trộn với ID thật của BE.
 * Real: `GET/PATCH /manager/menu-options` (BE `0083289`). Mock cùng shape, lưu qua F5.
 */
import type { BranchOptionRow, BranchOptionWriteResult } from "../../../types";
import { defineApi } from "../../define";
import { branchOptionsMock } from "./mock";
import { branchOptionsReal } from "./real";

export { groupBranchOptions } from "./mapper";

export interface BranchOptionsApi {
  /** Mọi tuỳ chọn của chuỗi kèm cờ tại chi nhánh (real: chi nhánh của Manager đang đăng nhập; `branchId` chỉ để mock dùng). */
  listBranchStates(branchId: string): Promise<BranchOptionRow[]>;
  /**
   * Bật/tắt tại chi nhánh. Real: BE vẫn lưu cờ khi Owner đã tắt (hiệu lực vẫn false), nên web phải tự khoá;
   * mock trả 403 cho trường hợp đó. Tắt thì đơn đã thanh toán chứa tuỳ chọn chuyển "Hết món" (`affectedOrderCount`).
   */
  setBranchOptionAvailable(branchId: string, optionId: string, isAvailable: boolean): Promise<BranchOptionWriteResult>;
}

export const branchOptionsApi = defineApi<BranchOptionsApi>("branch_options", { real: branchOptionsReal, mock: branchOptionsMock });
