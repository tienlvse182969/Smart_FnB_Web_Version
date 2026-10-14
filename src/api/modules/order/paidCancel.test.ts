import { describe, expect, it } from "vitest";
import type { OrderDetail, OrderDetailLine, OrderPaymentRecord, OrderRefundRecord } from "../../../types";
import { ApiError, describeApiError } from "../../http/errors";
import { refundMethodInfo, refundSourceInfo, refundStatusInfo } from "./codes";
import {
  buildCancelBody,
  cancelTarget,
  cancellableLines,
  paidActionErrorInfo,
  pendingRefundTotal,
  refundAmountFor,
  refundCompletable,
  validateCancelReason,
  validateRefundNote,
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

describe("điều kiện hiện nút huỷ đơn đã trả (BE 514c426 cancellableOrderStatuses)", () => {
  it("đơn đã trả ở SUBMITTED / PREPARING / READY / REQUIRES_ATTENTION → có nút", () => {
    for (const status of ["SUBMITTED", "PREPARING", "READY"]) {
      expect(cancelTarget(order({ status }))?.kind, status).toBe("paid");
    }
  });

  it("đơn đã giao, hoàn tất, đã huỷ, chờ thanh toán → KHÔNG có nút (BE 409)", () => {
    for (const status of ["DELIVERED", "COMPLETED", "CANCELLED", "CONFIRMED", "PENDING"]) {
      expect(cancelTarget(order({ status })), status).toBeNull();
    }
  });

  it("đơn chưa trả hoặc khoản chưa thành công → không có nút", () => {
    expect(cancelTarget(order({ paymentStatus: "UNPAID" }))).toBeNull();
    expect(cancelTarget(order({ payments: [pay({ status: "PENDING", method: "BANK_TRANSFER" })] }))).toBeNull();
    expect(cancelTarget(order({ payments: [] }))).toBeNull();
  });

  it("lệch thiếu (AMOUNT_MISMATCH, Cần xử lý): có nút, số hoàn = số đã nhận", () => {
    const t = cancelTarget(
      order({ status: "REQUIRES_ATTENTION", paymentStatus: "UNPAID", payments: [pay({ status: "AMOUNT_MISMATCH", method: "BANK_TRANSFER", amount: 100000, receivedAmount: 70000 })] }),
    );
    expect(t).toMatchObject({ kind: "mismatch", paymentId: "pay-1", received: 70000, balance: 70000 });
  });

  it("số đã nhận lấy `receivedAmount` nếu có; trừ các khoản đã hoàn; hết số dư → không có nút", () => {
    expect(cancelTarget(order({ payments: [pay({ receivedAmount: 105000 })] }))?.balance).toBe(105000);
    expect(cancelTarget(order({ refunds: [refund({ amount: 30000 })] }))?.balance).toBe(70000);
    expect(cancelTarget(order({ refunds: [refund({ amount: 100000 })] }))).toBeNull();
  });

  it("có cả khoản SUCCESS và AMOUNT_MISMATCH: ưu tiên SUCCESS (như BE)", () => {
    const t = cancelTarget(order({ payments: [pay({ id: "m", status: "AMOUNT_MISMATCH" }), pay({ id: "s", status: "SUCCESS" })] }));
    expect(t?.paymentId).toBe("s");
  });
});

describe("số tiền phải hoàn và dòng huỷ được", () => {
  const target = { kind: "paid" as const, paymentId: "p", received: 100000, balance: 100000 };
  const lines = [line("a", 40000), line("b", 70000)];

  it("cả đơn (không chọn) = toàn bộ số dư; huỷ một phần = min(tổng dòng chọn, số dư)", () => {
    expect(refundAmountFor(target, lines, [])).toBe(100000);
    expect(refundAmountFor(target, lines, ["a"])).toBe(40000);
    expect(refundAmountFor(target, lines, ["a", "b"])).toBe(100000); // 110000 vượt số dư
  });

  it("lệch thiếu: luôn đúng số đã nhận, kể cả khi truyền dòng chọn", () => {
    const mismatch = { kind: "mismatch" as const, paymentId: "p", received: 70000, balance: 70000 };
    expect(refundAmountFor(mismatch, lines, ["a"])).toBe(70000);
  });

  it("dòng đã huỷ hoặc đã nằm trong khoản hoàn thì không chọn được", () => {
    const o = { lines: [line("a", 1), line("b", 1, "CANCELLED"), line("c", 1)], refunds: [refund({ lines: [{ orderItemId: "c", quantity: 1, refundAmount: 1, isWastage: false }] })] };
    expect(cancellableLines(o).map((l) => l.id)).toEqual(["a"]);
  });
});

describe("lý do, ghi chú, thân gửi BE", () => {
  it("lý do 3–500 ký tự sau trim (DTO CancelPaidOrderDto)", () => {
    expect(validateCancelReason("")).toMatch(/nhập lý do/);
    expect(validateCancelReason("  ab  ")).toMatch(/ít nhất 3/);
    expect(validateCancelReason("abc")).toBeNull();
    expect(validateCancelReason("a".repeat(500))).toBeNull();
    expect(validateCancelReason("a".repeat(501))).toMatch(/tối đa 500/);
  });

  it("ghi chú hoàn tối đa 500, không bắt buộc", () => {
    expect(validateRefundNote("")).toBeNull();
    expect(validateRefundNote("a".repeat(500))).toBeNull();
    expect(validateRefundNote("a".repeat(501))).toMatch(/tối đa 500/);
  });

  it("thân gửi đúng 2–3 ô; orderItemIds chỉ khi chọn dòng; lý do đã trim", () => {
    expect(buildCancelBody({ reason: "  Khách đổi ý ", refundMethod: "CASH" })).toEqual({ reason: "Khách đổi ý", refundMethod: "CASH" });
    expect(buildCancelBody({ reason: "abc", refundMethod: "BANK_TRANSFER", orderItemIds: [] })).toEqual({ reason: "abc", refundMethod: "BANK_TRANSFER" });
    expect(buildCancelBody({ reason: "abc", refundMethod: "BANK_TRANSFER", orderItemIds: ["x"] })).toEqual({ reason: "abc", refundMethod: "BANK_TRANSFER", orderItemIds: ["x"] });
  });
});

describe("đánh dấu đã hoàn", () => {
  it("chỉ khoản chuyển khoản đang chờ; tiền mặt (đã hoàn ngay) và khoản đã hoàn thì không", () => {
    expect(refundCompletable(refund())).toBe(true);
    expect(refundCompletable(refund({ method: "CASH", status: "COMPLETED" }))).toBe(false);
    expect(refundCompletable(refund({ status: "COMPLETED" }))).toBe(false);
  });

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
