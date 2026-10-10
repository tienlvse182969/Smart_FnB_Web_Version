/**
 * Module order — tra cứu đơn của Branch Manager (BM-04). Real từ GĐ7 (7.1): `GET /manager/orders`, `GET /manager/orders/:id`.
 * Xác nhận thủ công (BM-05, 7.4): `POST /payments/:paymentId/confirm`. Huỷ đơn đã trả (BM-06) thêm ở 7.6 (BE còn thiếu #43).
 * Mock vẫn là nguồn đơn của trợ lý AI mock và báo cáo mock (qua `getBranchOrders`, không qua module này).
 */
import type { ConfirmPaymentInput, OrderDetail, OrderPage, OrderQuery } from "../../../types";
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
  /**
   * BM-05: Manager xác nhận thủ công một khoản chuyển khoản đang chờ hoặc "Lệch số tiền" (`POST /payments/:paymentId/confirm`).
   * KHÔNG trả dữ liệu để vẽ lại (quyết định 84): màn GET lại chi tiết đơn. Lỗi: 400 thiếu/sai ô, 403 không phải Manager, chế độ chỉ đọc,
   * 404, 409 `PAYMENT_ALREADY_SETTLED` / `PAYMENT_AMOUNT_INSUFFICIENT` / tiền mặt / đơn không còn chờ thanh toán.
   */
  confirmPayment(scope: OrderScope, paymentId: string, input: ConfirmPaymentInput): Promise<void>;
}

export const orderApi = defineApi<OrderApi>("order", { real: orderReal, mock: orderMock });
