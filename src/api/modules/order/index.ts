/**
 * Module order — tra cứu đơn của Branch Manager (BM-04). Real từ GĐ7 (7.1): `GET /manager/orders`, `GET /manager/orders/:id`.
 * Xác nhận thủ công (BM-05), Cần xử lý, huỷ đơn đã trả (BM-06) thêm ở 7.4–7.6 (BE còn thiếu: api-contract-plan #43–#45).
 * Mock vẫn là nguồn đơn của trợ lý AI mock và báo cáo mock (qua `getBranchOrders`, không qua module này).
 */
import type { OrderDetail, OrderPage, OrderQuery } from "../../../types";
import { defineApi } from "../../define";
import { orderMock } from "./mock";
import { orderReal } from "./real";

/** Phạm vi của người gọi. Real: BE lấy chi nhánh từ token nên không gửi đi; mock dùng để tách dữ liệu theo chi nhánh. */
export interface OrderScope {
  chainId: string;
  branchId: string;
}

export interface OrderApi {
  /**
   * Đơn quầy của chi nhánh, mới nhất trước (BE không có tham số sắp xếp), phân trang. Lỗi: 400 tham số sai, 403 không phải Manager.
   */
  listOrders(scope: OrderScope, query: OrderQuery): Promise<OrderPage>;
  /** Chi tiết một đơn trong chi nhánh; id không thuộc chi nhánh → 404. */
  getOrder(scope: OrderScope, orderId: string): Promise<OrderDetail>;
}

export const orderApi = defineApi<OrderApi>("order", { real: orderReal, mock: orderMock });
