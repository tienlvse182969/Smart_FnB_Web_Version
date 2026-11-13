/**
 * Bản real của module ledger (BM-07): `GET /branches/:branchId/cash-ledger` (Store Manager chi nhánh mình; Brand Manager chi nhánh trong
 * chuỗi) và `GET /restaurant-chains/:chainId/cash-ledger` (Brand Manager). Chỉ đọc; Platform Staff, Cashier, Barista nhận 403 (BR-94).
 */
import { request } from "../../http/client";
import { mapLedger } from "./mapper";
import { buildLedgerQueryString } from "./query";
import type { LedgerApi } from "./index";

export const ledgerReal: LedgerApi = {
  async getBranchLedger(branchId, query) {
    return mapLedger(await request<unknown>(`/branches/${encodeURIComponent(branchId)}/cash-ledger${buildLedgerQueryString(query)}`));
  },
  async getChainLedger(chainId, query) {
    return mapLedger(await request<unknown>(`/restaurant-chains/${encodeURIComponent(chainId)}/cash-ledger${buildLedgerQueryString(query)}`));
  },
};
