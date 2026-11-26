import { describe, expect, it } from "vitest";
import { isAttentionOrder, toAttentionRows } from "./attention";
import { attentionReasonInfo } from "./codes";
import { buildOrderQueryString } from "./query";
import type { OrderSummary } from "../../../types";

/** Đơn như ảnh lỗi: đã huỷ lúc 14:42, tiền QR 42.000 ₫ về sau đó → khoản REQUIRES_ATTENTION, chưa hoàn. */
const lateOrder = (over: Partial<OrderSummary> = {}): OrderSummary =>
  ({
    id: "o1",
    orderCode: "CTR-1",
    callNumber: 7,
    status: "CANCELLED",
    paymentStatus: "UNPAID",
    total: 42000,
    placedAt: "2026-11-26T07:41:00Z",
    attentionAt: "2026-11-26T07:52:00Z",
    attentionReason: "PAYMENT_RECEIVED_AFTER_CANCELLATION",
    payments: [{ id: "p1", method: "BANK_TRANSFER", status: "REQUIRES_ATTENTION", receivedAmount: 42000, failureReason: "PAYMENT_RECEIVED_AFTER_CANCELLATION" }],
    refunds: [],
    ...over,
  }) as unknown as OrderSummary;

describe("Đơn cần xử lý: tiền về sau khi đơn đã huỷ", () => {
  it("cancelled order with unrefunded late money is listed, with the received amount to refund", () => {
    expect(isAttentionOrder(lateOrder())).toBe(true);
    const [row] = toAttentionRows([lateOrder()], Date.parse("2026-11-26T08:02:00Z"));
    expect(row.reasonLabel).toBe("Tiền về sau khi đơn đã huỷ");
    expect(row.received).toBe(42000);
    expect(row.difference).toBeNull();
    expect(row.waitedMs).toBe(10 * 60_000);
  });

  it("leaves the list once the late payment is refunded", () => {
    const refunded = lateOrder({ refunds: [{ id: "r1", paymentId: "p1", amount: 42000, status: "PENDING" }] as never });
    expect(isAttentionOrder(refunded)).toBe(false);
    expect(toAttentionRows([refunded], Date.now())).toEqual([]);
  });

  it("QR money after switching to cash gets its own readable label", () => {
    const info = attentionReasonInfo({ attentionReason: "PAYMENT_RECEIVED_AFTER_SWITCH_TO_CASH", payments: [] });
    expect(info).toMatchObject({ label: "Tiền QR về sau khi đã thu tiền mặt", known: true });
  });

  it("asks the BE with needsAttention instead of a status filter", () => {
    const q = new URLSearchParams(buildOrderQueryString({ page: 1, limit: 100, needsAttention: true, sortBy: "attentionAt", sortOrder: "asc" }));
    expect(q.get("needsAttention")).toBe("true");
    expect(q.has("status")).toBe(false);
  });
});
