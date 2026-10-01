import { ApiError } from "../../http/errors";
import { mockDelay } from "../../mock/control";
import { getBranchOrders } from "../../mock/store";
import { branchApi } from "../branch";
import type { OrderApi } from "./index";

export const orderMock: OrderApi = {
  async listOrders({ chainId, branchId, from, to, statuses }) {
    await mockDelay();
    const branchIds = branchId ? [branchId] : (await branchApi.listBranches(chainId)).map((b) => b.id);
    const fromMs = from ? new Date(from).getTime() : -Infinity;
    const toMs = to ? new Date(to).getTime() : Infinity;
    return branchIds
      .flatMap((id) => getBranchOrders(chainId, id))
      .filter((o) => {
        const t = new Date(o.createdAt).getTime();
        return t >= fromMs && t <= toMs && (!statuses?.length || statuses.includes(o.status));
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getOrder(chainId, branchId, orderId) {
    await mockDelay();
    const found = getBranchOrders(chainId, branchId).find((o) => o.id === orderId);
    if (!found) throw new ApiError(404, "Đơn không tồn tại");
    return found;
  },
};
