/**
 * Thanh toán — API thật (`/api/v1/branches/{branchId}/payments`, `/payments/*`).
 *
 * Phân quyền backend: xem lịch sử thì OWNER, MANAGER, WAITER và CASHIER đều
 * gọi được; tạo và xác nhận thì MANAGER, WAITER, CASHIER (OWNER không tạo).
 *
 * Hai điểm cần biết khi dùng:
 * - `amount` trả về là **chuỗi** (`"250000"`), dù Swagger khai là số. Dùng
 *   `parseAmount` trong `reportFormat.ts`.
 * - Bộ lọc `from`/`to` lọc theo **`createdAt`** (thời điểm ghi bản ghi), không
 *   phải `paidAt` (thời điểm thu tiền). Với dữ liệu seed thì mọi bản ghi có
 *   cùng `createdAt`, nên lọc theo ngày gần như vô nghĩa về mặt nghiệp vụ.
 */
import { request } from "./http";

export type ApiPaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED";
export type ApiPaymentMethod = "CASH" | "CARD" | "BANK_TRANSFER" | "E_WALLET" | "OTHER";

export interface ApiPaymentOrderRef {
  id: string;
  orderCode: string;
  branchId: string;
  totalAmount: string;
}

export interface ApiPayment {
  id: string;
  paymentCode: string;
  orderId: string | null;
  tableSessionId: string | null;
  processedById: string | null;
  method: ApiPaymentMethod;
  status: ApiPaymentStatus;
  /** Chuỗi số tiền, ví dụ `"250000"`. */
  amount: string;
  transactionRef: string | null;
  paidAt: string | null;
  failureReason: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  processedBy: { id: string; firstName: string; lastName: string } | null;
  tableSession: { id: string; sessionCode: string } | null;
  order: ApiPaymentOrderRef | null;
}

export interface PaymentPage {
  items: ApiPayment[];
  total: number;
  page: number;
  limit: number;
}

export interface ListPaymentsParams {
  status?: ApiPaymentStatus;
  /** Nhận `YYYY-MM-DD` hoặc ISO. Lọc theo `createdAt`. */
  from?: string;
  /** Cận trên, cùng định dạng với `from`. */
  to?: string;
  page?: number;
  /** 1–100, backend mặc định 20. */
  limit?: number;
}

function buildQuery(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

/** Lịch sử giao dịch của một chi nhánh, có phân trang. */
export function listBranchPayments(
  branchId: string,
  params: ListPaymentsParams = {},
): Promise<PaymentPage> {
  return request<PaymentPage>(`/branches/${branchId}/payments${buildQuery(params)}`);
}

export function getPayment(paymentId: string): Promise<ApiPayment> {
  return request<ApiPayment>(`/payments/${paymentId}`);
}

/** Mở một khoản thu đang chờ cho phiên bàn. Trạng thái khởi tạo là PENDING. */
export function createTableSessionPayment(
  tableSessionId: string,
  input: { method: ApiPaymentMethod; amount: number; transactionRef?: string; note?: string },
): Promise<ApiPayment> {
  return request<ApiPayment>(`/table-sessions/${tableSessionId}/payments`, {
    method: "POST",
    body: input,
  });
}

/** Xác nhận đã nhận tiền; backend đồng bộ trạng thái đã thanh toán của phiên/đơn. */
export function confirmPayment(paymentId: string, transactionRef?: string): Promise<ApiPayment> {
  return request<ApiPayment>(`/payments/${paymentId}/confirm`, {
    method: "POST",
    body: transactionRef ? { transactionRef } : {},
  });
}

export const PAYMENT_STATUS_LABEL: Record<ApiPaymentStatus, string> = {
  PENDING: "Chờ xác nhận",
  SUCCESS: "Thành công",
  FAILED: "Thất bại",
  REFUNDED: "Đã hoàn",
  PARTIALLY_REFUNDED: "Hoàn một phần",
};

export const PAYMENT_METHOD_LABEL: Record<ApiPaymentMethod, string> = {
  CASH: "Tiền mặt",
  CARD: "Thẻ",
  BANK_TRANSFER: "Chuyển khoản",
  E_WALLET: "Ví điện tử",
  OTHER: "Khác",
};
