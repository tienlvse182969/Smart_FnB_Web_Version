/**
 * Module combos — combo và combo biến thể (OW-14), gán combo cho chi nhánh (OW-04). Mục 26, BR-77, BR-78, BR-12.
 * Real: BE `combos.controller.ts` (`/restaurant-chains/:chainId/combos`), chỉ OWNER. Giá riêng theo chi nhánh (OW-16) ở module `branchPrices`.
 * Ảnh combo: tải từ máy qua `uploadComboImage` (`POST …/combos/:id/image`, JPEG/PNG/WebP ≤ 5 MB) hoặc dán URL qua `imageUrl`.
 */
import type { Combo, ComboInput, ComboPatch } from "../../../types";
import { defineApi } from "../../define";
import { combosMock } from "./mock";
import { combosReal } from "./real";

export interface CombosApi {
  /** Combo chưa xoá của chuỗi, gồm cả combo đang tắt; `branchIds` là chi nhánh đang được bán. */
  listCombos(chainId: string): Promise<Combo[]>;
  /** BE tự gán combo mới cho mọi chi nhánh đang hoạt động. 400 sai quy tắc (2–6 thành phần, …). */
  createCombo(chainId: string, input: ComboInput): Promise<Combo>;
  /** `PATCH`: trường vắng giữ nguyên; `components` có mặt thì thay toàn bộ. Đơn cũ giữ giá lúc bán. */
  updateCombo(chainId: string, id: string, patch: ComboPatch): Promise<Combo>;
  /** Ngừng bán (xoá mềm); lịch sử đơn giữ nguyên. */
  deleteCombo(chainId: string, id: string): Promise<void>;
  /** Thay tập chi nhánh bán combo; chi nhánh bỏ ra bị tắt, giá riêng của chi nhánh được giữ. */
  setComboBranches(chainId: string, id: string, branchIds: string[]): Promise<void>;
  /** Tải ảnh combo (multipart `file`); BE thay ảnh cũ đã tải lên. 400 sai định dạng hoặc quá 5 MB. */
  uploadComboImage(chainId: string, id: string, file: File): Promise<Combo>;
}

export const combosApi = defineApi<CombosApi>("combos", { real: combosReal, mock: combosMock });
