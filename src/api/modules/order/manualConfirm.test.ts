import { describe, expect, it } from "vitest";
import { ApiError } from "../../http/errors";
import type { OrderPaymentRecord } from "../../../types";
import {
  CONFIRM_REASON_MAX,
  CONFIRM_REF_MAX,
  canSubmitConfirm,
  checkReceived,
  confirmErrorInfo,
  confirmableTransfer,
  parseVndInput,
  validateReason,
  validateRef,
} from "./manualConfirm";

const pay = (over: Partial<OrderPaymentRecord> = {}): OrderPaymentRecord => ({
  id: "p1",
  paymentCode: "PAY-1",
  method: "BANK_TRANSFER",
  status: "PENDING",
  amount: 75000,
  receivedAmount: null,
  transactionRef: null,
  confirmationReason: null,
  confirmedAt: null,
  paidAt: null,
  createdAt: "2026-10-10T07:00:00.000Z",
  failureReason: null,
  processedBy: null,
  ...over,
});
const order = (status: string, paymentStatus: string, payments: OrderPaymentRecord[]) => ({ status, paymentStatus, payments });

describe("điều kiện hiện nút Xác nhận thủ công (quyết định 82)", () => {
  it("QR chờ chuyển khoản: có; Lệch số tiền: có", () => {
    expect(confirmableTransfer(order("CONFIRMED", "UNPAID", [pay()]))?.id).toBe("p1");
    expect(confirmableTransfer(order("REQUIRES_ATTENTION", "UNPAID", [pay({ status: "AMOUNT_MISMATCH", receivedAmount: 70000 })]))?.status).toBe("AMOUNT_MISMATCH");
  });

  it("tiền mặt: không; khoản FAILED: không", () => {
    expect(confirmableTransfer(order("CONFIRMED", "UNPAID", [pay({ method: "CASH" })]))).toBeNull();
    expect(confirmableTransfer(order("CONFIRMED", "UNPAID", [pay({ status: "FAILED", failureReason: "PAYOS_EXPIRED" })]))).toBeNull();
  });

  it("đơn huỷ: không; đã trả hoặc đã có khoản thành công: không", () => {
    expect(confirmableTransfer(order("CANCELLED", "UNPAID", [pay()]))).toBeNull();
    expect(confirmableTransfer(order("SUBMITTED", "PAID", [pay({ status: "SUCCESS" })]))).toBeNull();
    expect(confirmableTransfer(order("CONFIRMED", "UNPAID", [pay(), pay({ id: "p2", method: "CASH", status: "SUCCESS" })]))).toBeNull();
    expect(confirmableTransfer(order("PREPARING", "UNPAID", [pay()]))).toBeNull();
  });

  it("nhiều khoản đủ điều kiện: ưu tiên Lệch số tiền rồi khoản mới nhất", () => {
    const older = pay({ id: "a", createdAt: "2026-10-10T06:00:00.000Z" });
    const newer = pay({ id: "b", createdAt: "2026-10-10T07:30:00.000Z" });
    expect(confirmableTransfer(order("CONFIRMED", "UNPAID", [older, newer]))?.id).toBe("b");
    const mismatch = pay({ id: "m", status: "AMOUNT_MISMATCH", createdAt: "2026-10-10T05:00:00.000Z" });
    expect(confirmableTransfer(order("REQUIRES_ATTENTION", "UNPAID", [newer, mismatch]))?.id).toBe("m");
  });
});

describe("BR-28: so số tiền thực nhận với tổng đơn", () => {
  it("thiếu / bằng / dư / chưa nhập", () => {
    expect(checkReceived(75000, 70000)).toEqual({ kind: "short", shortBy: 5000 });
    expect(checkReceived(75000, 75000)).toEqual({ kind: "exact" });
    expect(checkReceived(75000, 80000)).toEqual({ kind: "over", change: 5000 });
    expect(checkReceived(75000, null)).toEqual({ kind: "empty" });
    expect(checkReceived(75000, 0)).toEqual({ kind: "empty" });
  });

  it("chỉ nhận thiếu mới khoá nút gửi", () => {
    const form = { reason: "Khách chìa màn hình", transactionRef: "" };
    expect(canSubmitConfirm(75000, { ...form, received: "70000" })).toBe(false);
    expect(canSubmitConfirm(75000, { ...form, received: "75000" })).toBe(true);
    expect(canSubmitConfirm(75000, { ...form, received: "80000" })).toBe(true);
    expect(canSubmitConfirm(75000, { ...form, received: "" })).toBe(false);
  });
});

describe("ô nhập", () => {
  it("lý do: trim rồi 3–500 ký tự", () => {
    expect(validateReason("   ")).toMatch(/nhập lý do/);
    expect(validateReason("ab")).toMatch(/ít nhất 3/);
    expect(validateReason("  ab  ")).toMatch(/ít nhất 3/);
    expect(validateReason("abc")).toBeNull();
    expect(validateReason("a".repeat(CONFIRM_REASON_MAX))).toBeNull();
    expect(validateReason("a".repeat(CONFIRM_REASON_MAX + 1))).toMatch(/tối đa 500/);
  });

  it("mã giao dịch tối đa 255", () => {
    expect(validateRef("")).toBeNull();
    expect(validateRef("x".repeat(CONFIRM_REF_MAX))).toBeNull();
    expect(validateRef("x".repeat(CONFIRM_REF_MAX + 1))).toMatch(/tối đa 255/);
    expect(canSubmitConfirm(1000, { reason: "abc", received: "1000", transactionRef: "x".repeat(256) })).toBe(false);
  });

  it("số tiền: chấp nhận dấu nghìn, từ chối chữ và số thập phân", () => {
    expect(parseVndInput("75.000")).toBe(75000);
    expect(parseVndInput("75 000")).toBe(75000);
    expect(parseVndInput("")).toBeNull();
    expect(parseVndInput("abc")).toBeNull();
    expect(parseVndInput("75000đ")).toBeNull();
  });
});

describe("phân loại lỗi xác nhận (quyết định 84)", () => {
  it("409 và 404 → GET lại + đóng hộp; 400, 403, 5xx, mạng → giữ hộp", () => {
    expect(confirmErrorInfo(new ApiError(409, "PAYMENT_ALREADY_SETTLED")).refresh).toBe(true);
    expect(confirmErrorInfo(new ApiError(404, "Payment not found")).refresh).toBe(true);
    for (const status of [400, 403, 500, 0]) expect(confirmErrorInfo(new ApiError(status, "x")).refresh, String(status)).toBe(false);
  });
});
