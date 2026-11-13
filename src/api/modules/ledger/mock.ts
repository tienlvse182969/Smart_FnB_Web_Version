/** Mock của module ledger: KHÔNG sinh số liệu giả. Trả sổ rỗng để màn hình hiện trạng thái trống. */
import { mockDelay } from "../../mock/control";
import type { LedgerApi } from "./index";

const EMPTY = () => ({ items: [], summary: { inflow: 0, outflow: 0, net: 0 }, mayBeTruncated: false });

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
