import { request } from "../../http/client";
import { mapBranchOption, mapWriteResult, type RawBranchOption, type RawOptionAvailabilityResult } from "./mapper";
import type { BranchOptionsApi } from "./index";

export const branchOptionsReal: BranchOptionsApi = {
  async listBranchStates() {
    // Chi nhánh lấy từ JWT của Manager (BE `manager-scope.ts:6-11`), web không gửi branchId.
    return (await request<RawBranchOption[]>("/manager/menu-options")).map(mapBranchOption);
  },

  async setBranchOptionAvailable(_branchId, optionId, isAvailable) {
    // Body CHỈ có { isAvailable } — ManagerAvailabilityDto (BE manager.dto.ts:92-96); route branch-manager.controller.ts:114-134.
    const raw = await request<RawOptionAvailabilityResult>(`/manager/menu-options/${optionId}/availability`, {
      method: "PATCH",
      body: { isAvailable },
    });
    return mapWriteResult(raw);
  },
};
