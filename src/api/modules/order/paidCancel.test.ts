import { describe, expect, it } from "vitest";
import type { OrderDetail, OrderDetailLine, OrderPaymentRecord, OrderRefundRecord } from "../../../types";
import { ApiError, describeApiError } from "../../http/errors";
import { refundMethodInfo, refundSourceInfo, refundStatusInfo } from "./codes";
import {
  paidActionErrorInfo,
  pendingRefundTotal,
} from "./paidCancel";

const pay = (over: Partial<OrderPaymentRecord> = {}): OrderPaymentRecord => ({
  id: "pay-1",
  paymentCode: "PAY-1",
  method: "CASH",
  status: "SUCCESS",
  amount: 100000,
  receivedAmount: null,
  transactionRef: null,
  confirmationReason: null,
  confirmedAt: null,
  paidAt: null,
  createdAt: null,
  failureReason: null,
  processedBy: null,
  ...over,
});
const refund = (over: Partial<OrderRefundRecord> = {}): OrderRefundRecord => ({
  id: "r1",
  paymentId: "pay-1",
  amount: 30000,
  status: "PENDING",
  method: "BANK_TRANSFER",
  source: "MANAGER_CANCELLATION",
  reason: "Khách đổi ý",
  requestedByRole: "MANAGER",
  requestedAt: null,
  completedByRole: null,
  completedAt: null,
  note: null,
  lines: [],
  ...over,
});
const line = (id: string, total: number, status = "QUEUED"): OrderDetailLine => ({
  id,
  name: id,
  unitPrice: total,
  quantity: 1,
  options: [],
  total,
  status,
  note: null,
  cancellationReason: null,
});
const order = (over: Partial<Pick<OrderDetail, "status" | "paymentStatus" | "payments" | "refunds">> = {}) => ({
  status: "SUBMITTED",
  paymentStatus: "PAID",
  payments: [pay()],
  refunds: [] as OrderRefundRecord[],
  ...over,
});

describe("khoản hoàn còn chờ", () => {
  it("tổng còn chờ chỉ cộng khoản PENDING", () => {
    expect(pendingRefundTotal([refund({ amount: 30000 }), refund({ id: "r2", amount: 20000, status: "COMPLETED" }), refund({ id: "r3", amount: 5000 })])).toBe(35000);
  });
});

describe("lỗi và nhãn tiếng Việt", () => {
  it("409 và 404 → tải lại; 400/403/5xx/mạng → giữ hộp", () => {
    for (const s of [409, 404]) expect(paidActionErrorInfo(new ApiError(s, "x")).refresh).toBe(true);
    for (const s of [400, 403, 500, 0]) expect(paidActionErrorInfo(new ApiError(s, "x")).refresh).toBe(false);
  });

  it("câu 409 của BE (#43) dịch cụ thể, không hiện tiếng Anh", () => {
    const cases: [number, string, RegExp][] = [
      [409, "Delivered, completed or already cancelled orders cannot be cancelled", /đã giao, đã hoàn tất hoặc đã huỷ/],
      [409, "An underpaid order must be cancelled in full", /chỉ huỷ được cả đơn/],
      [409, "Only a pending refund can be completed", /không còn ở trạng thái chờ hoàn tiền/],
      [409, "Cash refunds are completed when the order is cancelled", /Hoàn tiền mặt đã được ghi/],
      [409, "Order has no received payment to refund", /chưa có khoản tiền đã nhận/],
      [404, "Refund not found", /khoản hoàn/],
    ];
    for (const [status, message, re] of cases) {
      expect(describeApiError(new ApiError(status, message)), message).toMatch(re);
    }
  });

  it("nhãn enum mới: RefundStatus, RefundMethod, RefundSource", () => {
    expect(refundStatusInfo("PENDING")).toMatchObject({ label: "Chờ hoàn tiền", tone: "warning", known: true });
    expect(refundStatusInfo("COMPLETED")).toMatchObject({ label: "Đã hoàn tiền", tone: "success" });
    expect(refundStatusInfo("???").label).toBe("Khác (???)");
    expect(refundMethodInfo("CASH").label).toBe("Tiền mặt tại quầy");
    expect(refundMethodInfo("BANK_TRANSFER").label).toBe("Chuyển khoản");
    expect(refundSourceInfo("LATE_PAYMENT").label).toBe("Tiền về sau khi đơn đã huỷ");
    expect(refundSourceInfo("MANAGER_CANCELLATION").label).toBe("Manager huỷ đơn đã trả");
  });
});
