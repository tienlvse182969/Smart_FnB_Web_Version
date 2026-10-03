import type { BranchOptionRow } from "../../../types";
import { ApiError } from "../../http/errors";
import { mockDelay } from "../../mock/control";
import { assertMockWritable } from "../../mock/guards";
import { getBranchOptions, getChainState } from "../../mock/store";
import { chainOfBranch } from "../menu/mock";
import type { BranchOptionsApi } from "./index";
import { savePersistedBranchOptions } from "./persist";

export const MOCK_AFFECTED_TOPPING_ORDERS = 2;

/** Dựng dòng như `GET /manager/menu-options`: Owner tắt = tuỳ chọn hoặc nhóm bị tắt ở cấp chuỗi (BR-12). */
function rowsOf(chainId: string, branchId: string): BranchOptionRow[] {
  const state = getChainState(chainId);
  const local = new Map(getBranchOptions(chainId, branchId).map((r) => [r.optionId, r.isAvailable]));
  return state.optionGroups.flatMap((g) =>
    g.options.map((o) => {
      const isAvailable = local.get(o.id) ?? true;
      const ownerDisabled = !o.isActive || !g.isActive;
      return {
        optionId: o.id,
        name: o.name,
        priceDelta: o.priceDelta,
        groupId: g.id,
        groupName: g.name,
        ownerDisabled,
        isAvailable,
        effectiveAvailable: !ownerDisabled && isAvailable,
      };
    }),
  );
}

export const branchOptionsMock: BranchOptionsApi = {
  async listBranchStates(branchId) {
    await mockDelay();
    return rowsOf(await chainOfBranch(branchId), branchId);
  },

  async setBranchOptionAvailable(branchId, optionId, isAvailable) {
    await mockDelay();
    assertMockWritable();
    const chainId = await chainOfBranch(branchId);
    const row = rowsOf(chainId, branchId).find((r) => r.optionId === optionId);
    if (!row) throw new ApiError(404, "Option not found in your chain");
    // BR-12: Owner tắt thì chi nhánh không bật lại được. (BE thật vẫn lưu cờ rồi trả hiệu lực false; mock chặn hẳn để thử giao diện.)
    if (isAvailable && row.ownerDisabled) throw new ApiError(403, "Owner đã tắt tuỳ chọn này, chi nhánh không bật lại được");
    const list = getBranchOptions(chainId, branchId);
    const state = list.find((r) => r.optionId === optionId);
    if (state) state.isAvailable = isAvailable;
    else list.push({ branchId, optionId, isAvailable });
    savePersistedBranchOptions(
      chainId,
      branchId,
      list.map((r) => ({ optionId: r.optionId, isAvailable: r.isAvailable })),
    );
    // Mô phỏng BR-36 (mock không lưu đơn gắn tuỳ chọn): tắt tuỳ chọn thuộc nhóm Topping thì có 2 đơn đã thanh toán bị chuyển "Hết món", để thử thông báo.
    const affectedOrderCount = !isAvailable && row.groupId.endsWith("-og-topping") ? MOCK_AFFECTED_TOPPING_ORDERS : 0;
    return { optionId, isAvailable, effectiveAvailable: isAvailable && !row.ownerDisabled, affectedOrderCount };
  },
};
