/**
 * Bản real của module order — tra cứu đơn của Branch Manager (BM-04): `GET /manager/orders` và `GET /manager/orders/:id`.
 * Chỉ MANAGER gọi được (CASHIER nhận 403); chi nhánh lấy từ token nên `branchId` không gửi đi. Không có request ghi nào ở module này.
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
};
