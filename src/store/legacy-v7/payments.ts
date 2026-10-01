/** v7 — lịch sử thanh toán theo phiên bàn. Tra cứu đơn v9 (BM-04) sẽ dựng lại. Gỡ ở bước xoá v7. */
import {
  listBranchPayments,
  confirmPayment as apiConfirmPayment,
  type ApiPayment,
  type ListPaymentsParams,
} from "../../services/paymentsApi";
import type { LoadStatus, SliceCreator } from "../types";

export interface LegacyPaymentsSlice {
  /** Lịch sử giao dịch thật của chi nhánh đang chọn. */
  branchPayments: ApiPayment[];
  paymentsTotal: number;
  paymentsStatus: LoadStatus;
  paymentsError: string | null;

  /** Nạp lịch sử giao dịch thật; bộ lọc theo `createdAt` phía backend. */
  loadPayments: (params?: ListPaymentsParams) => Promise<void>;
  confirmBranchPayment: (paymentId: string) => Promise<void>;
}

export const createLegacyPaymentsSlice: SliceCreator<LegacyPaymentsSlice> = (set, get) => ({
  branchPayments: [],
  paymentsTotal: 0,
  paymentsStatus: "idle",
  paymentsError: null,

  loadPayments: async (params = {}) => {
    const branchId = get().currentBranchId;
    if (!branchId) {
      set({ branchPayments: [], paymentsTotal: 0, paymentsStatus: "ready", paymentsError: null });
      return;
    }
    set({ paymentsStatus: "loading", paymentsError: null });
    try {
      const page = await listBranchPayments(branchId, { limit: 100, ...params });
      set({ branchPayments: page.items, paymentsTotal: page.total, paymentsStatus: "ready" });
    } catch (err) {
      set({
        branchPayments: [],
        paymentsTotal: 0,
        paymentsStatus: "error",
        paymentsError: err instanceof Error ? err.message : "Không tải được lịch sử giao dịch",
      });
    }
  },

  confirmBranchPayment: async (paymentId) => {
    await apiConfirmPayment(paymentId);
    await get().loadPayments();
  },
});
