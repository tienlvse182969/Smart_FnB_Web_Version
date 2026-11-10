/**
 * Bản real của module order — tra cứu đơn của Branch Manager (BM-04): `GET /manager/orders` và `GET /manager/orders/:id`; và xác nhận
 * thủ công chuyển khoản (BM-05): `POST /payments/:paymentId/confirm`.
 * Chỉ MANAGER gọi được (CASHIER nhận 403); chi nhánh lấy từ token nên `branchId` không gửi đi.
 */
import { request } from "../../http/client";
import { mapOrderDetail, mapOrderPage } from "./mapper";
import { buildOrderQueryString } from "./query";
import type { OrderApi } from "./index";

export const orderReal: OrderApi = {
  async listOrders(_scope, query) {
    const raw = await request<unknown>(`/manager/orders${buildOrderQueryString(query)}`);
    return mapOrderPage(raw, { page: query.page, limit: query.limit });
  },

  async getOrder(_scope, orderId) {
    return mapOrderDetail(await request<unknown>(`/manager/orders/${encodeURIComponent(orderId)}`));
  },

  async confirmPayment(_scope, paymentId, input) {
    // Chỉ đúng 3 ô của `ConfirmPaymentDto` (BE bật `forbidNonWhitelisted`); ô tuỳ chọn trống thì không gửi.
    const body: Record<string, unknown> = { reason: input.reason, receivedAmount: input.receivedAmount };
    if (input.transactionRef) body.transactionRef = input.transactionRef;
    // Bỏ qua phản hồi (`{...payment, order, tracking}`): màn GET lại chi tiết đơn (quyết định 84).
    await request<unknown>(`/payments/${encodeURIComponent(paymentId)}/confirm`, { method: "POST", body });
  },
};
