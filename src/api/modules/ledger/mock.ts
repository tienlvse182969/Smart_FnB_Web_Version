/** Mock của module ledger: KHÔNG sinh số liệu giả. Trả sổ rỗng để màn hình hiện trạng thái trống. */
import { mockDelay } from "../../mock/control";
import type { LedgerApi } from "./index";

const EMPTY = () => ({
  items: [],
  pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
  summary: { cashCollected: 0, qrCollected: 0, cashRefunded: 0, netCash: 0, netTotal: 0 },
  branches: [],
});

export const ledgerMock: LedgerApi = {
  async getBranchLedger() {
    await mockDelay();
    return EMPTY();
  },
  async getChainLedger() {
    await mockDelay();
    return EMPTY();
  },
};
