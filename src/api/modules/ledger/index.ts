/**
 * Module ledger — sổ giao dịch bán hàng (BM-07, mục 32). Chỉ đọc. Cờ `VITE_API_LEDGER=mock` chỉ trả sổ rỗng (không có dữ liệu giả).
 */
import type { Ledger, LedgerQuery } from "../../../types";
import { defineApi } from "../../define";
import { ledgerMock } from "./mock";
import { ledgerReal } from "./real";

export interface LedgerApi {
  /** Lỗi: 400 tham số, 403 vai trò hoặc chi nhánh ngoài phạm vi. */
  getBranchLedger(branchId: string, query: LedgerQuery): Promise<Ledger>;
  /** Chỉ Brand Manager; 403 nếu chuỗi ngoài phạm vi. */
  getChainLedger(chainId: string, query: LedgerQuery): Promise<Ledger>;
}

export const ledgerApi = defineApi<LedgerApi>("ledger", { real: ledgerReal, mock: ledgerMock });
