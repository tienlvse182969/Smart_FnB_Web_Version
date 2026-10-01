/**
 * Module order — tra cứu đơn (BM-04), đơn Cần xử lý (BM-05), huỷ đơn đã thanh toán (BM-06). Mock; BE chưa có.
 * Cũng là nguồn dữ liệu của trợ lý AI mock và báo cáo mock.
 */
import type { Order, OrderStatus } from "../../../types";
import { defineApi } from "../../define";
import { orderMock } from "./mock";

export interface ListOrdersParams {
  chainId: string;
  /** Bỏ trống = mọi chi nhánh của chuỗi (Owner). Manager luôn bị giới hạn ở chi nhánh mình (BR-02). */
  branchId?: string;
  /** ISO. */
  from?: string;
  to?: string;
  statuses?: OrderStatus[];
}

export interface OrderApi {
  listOrders(params: ListOrdersParams): Promise<Order[]>;
  getOrder(chainId: string, branchId: string, orderId: string): Promise<Order>;
}

// CHỜ BE: BM-04..06 chưa có endpoint. Bản real viết ở giai đoạn 7.
export const orderApi = defineApi<OrderApi>("order", { mock: orderMock });
