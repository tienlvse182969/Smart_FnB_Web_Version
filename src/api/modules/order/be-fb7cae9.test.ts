/**
 * Hợp đồng BE `fb7cae9` ở module đơn (lượt 7.7b, QĐ 122–125): lý do "Cần xử lý", `attentionAt` và phương án thay thế,
 * mã lỗi mới (#60), enum khoản mới, hạn QR (#50/#45), tham số sắp xếp (#66), sự kiện mới (#51), cảnh báo tiền về muộn.
 */
import { describe, expect, it } from "vitest";
import type { OrderPaymentRecord, OrderSummary } from "../../../types";
import { ApiError, describeApiError, PAYMENT_ALREADY_SETTLED_TEXT } from "../../http/errors";
import { ORDER_EVENT_TYPES } from "../../realtime/orderRefresh";
import { describeAttentionBatch, attentionItemsOf, toAttentionRows } from "./attention";
import { attentionReasonInfo, isQrExpired, orderPaymentInfo, paymentStatusInfo, PAYMENT_STATUS_CODES } from "./codes";
import { buildOrderQueryString } from "./query";

const now = new Date("2026-10-12T05:00:00.000Z").getTime();
const pay = (over: Partial<OrderPaymentRecord> = {}): OrderPaymentRecord => ({
  id: "p",
  paymentCode: "PAY",
  method: "BANK_TRANSFER",
  status: "AMOUNT_MISMATCH",
  amount: 75000,
  receivedAmount: 70000,
  transactionRef: null,
  confirmationReason: null,
  confirmedAt: null,
  paidAt: null,
  createdAt: null,
  failureReason: null,
  processedBy: null,
  ...over,
});
const order = (id: string, over: Partial<OrderSummary> = {}): OrderSummary => ({
  id,
  orderCode: `CTR-${id}`,
  callNumber: null,
  placedAt: "2026-10-12T03:00:00.000Z",
  paidAt: null,
  total: 75000,
  status: "REQUIRES_ATTENTION",
  paymentStatus: "UNPAID",
  payments: [pay()],
  refunds: [],
  cashierName: null,
  cancelledAt: null,
  cancellationReason: null,
  ...over,
});

describe("lý do Cần xử lý (QĐ 123)", () => {
  it("mỗi mã BE có nhãn tiếng Việt riêng", () => {
    const label = (code: string) => attentionReasonInfo({ attentionReason: code, payments: [] }).label;
    expect(label("PAID_ITEM_OUT_OF_STOCK")).toBe("Hết món (đơn đã trả)");
    expect(label("PAID_OPTION_OUT_OF_STOCK")).toBe("Hết tuỳ chọn (đơn đã trả)");
    expect(label("PAYMENT_RECEIVED_AFTER_EXPIRY")).toBe("Tiền về sau khi QR hết hạn");
    expect(label("PAYMENT_AMOUNT_MISMATCH")).toBe("Lệch số tiền");
  });

  it("mã lạ → Khác (<mã>), không đoán", () => {
    expect(attentionReasonInfo({ attentionReason: "SOMETHING_NEW", payments: [] })).toMatchObject({ label: "Khác (SOMETHING_NEW)", kind: "UNKNOWN", known: false });
  });

  it("BE chưa ghi lý do (#77): suy từ khoản AMOUNT_MISMATCH / REQUIRES_ATTENTION; không có gì → chưa rõ", () => {
    expect(attentionReasonInfo({ attentionReason: null, payments: [{ status: "AMOUNT_MISMATCH" }] }).kind).toBe("AMOUNT_MISMATCH");
    expect(attentionReasonInfo({ attentionReason: null, payments: [{ status: "REQUIRES_ATTENTION" }] }).kind).toBe("RECEIVED_AFTER_EXPIRY");
    expect(attentionReasonInfo({ attentionReason: null, payments: [{ status: "SUCCESS" }] })).toMatchObject({ label: "Chưa rõ lý do", known: false });
  });

  it("danh sách: đơn hết món đã TRẢ không bị coi là lệch tiền (không cột tiền)", () => {
    const [row] = toAttentionRows(
      [order("stock", { paymentStatus: "PAID", payments: [pay({ status: "SUCCESS", receivedAmount: null })], attentionReason: "PAID_ITEM_OUT_OF_STOCK", attentionAt: "2026-10-12T04:00:00.000Z" })],
      now,
    );
    expect(row).toMatchObject({ reasonKind: "ITEM_OUT_OF_STOCK", reasonLabel: "Hết món (đơn đã trả)", received: null, difference: null, kind: "unknown" });
  });

  it("danh sách: cột tiền chỉ cho lệch tiền, kể cả khi khoản có receivedAmount ở loại khác", () => {
    const rows = toAttentionRows(
      [
        order("mismatch"),
        order("late", { attentionReason: "PAYMENT_RECEIVED_AFTER_EXPIRY", payments: [pay({ status: "REQUIRES_ATTENTION", receivedAmount: 75000 })] }),
      ],
      now,
    );
    expect(rows[0]).toMatchObject({ reasonKind: "AMOUNT_MISMATCH", received: 70000, difference: -5000, kind: "short" });
    expect(rows[1]).toMatchObject({ reasonKind: "RECEIVED_AFTER_EXPIRY", received: null, difference: null });
  });

  it("đã chờ: từ attentionAt khi có; không có thì từ lúc đặt và đánh dấu waitedFromPlaced", () => {
    const [withAt, without] = toAttentionRows(
      [order("a", { attentionAt: "2026-10-12T04:30:00.000Z" }), order("b")],
      now,
    );
    expect(withAt).toMatchObject({ waitedMs: 30 * 60_000, waitedFromPlaced: false });
    expect(without).toMatchObject({ waitedMs: 120 * 60_000, waitedFromPlaced: true });
  });
});

describe("cảnh báo tiền về sau khi QR hết hạn (#61)", () => {
  const event = (data: Record<string, unknown>) => ({ type: "manager.order.attention-required", occurredAt: "2026-10-12T05:00:00Z", data });
  const money = (n: number) => `${n}đ`;

  it("sự kiện PAYMENT_RECEIVED_AFTER_EXPIRY không còn rơi vào OTHER", () => {
    const items = attentionItemsOf(event({ reason: "PAYMENT_RECEIVED_AFTER_EXPIRY", orderId: "o1", paymentId: "p1", expectedAmount: "75000", receivedAmount: "75000" }));
    expect(items).toEqual([expect.objectContaining({ reason: "PAYMENT_RECEIVED_AFTER_EXPIRY", orderId: "o1", receivedAmount: 75000 })]);
    const [text] = describeAttentionBatch(items, money);
    expect(text).toMatchObject({ key: "attention-expired", to: "/manager/orders/o1", tone: "error" });
    expect(text.text).toMatch(/sau khi mã QR hết hạn/);
    expect(text.text).toMatch(/chưa được đưa xuống pha chế/);
  });

  it("nhiều khoản gom một thông báo trỏ tới Đơn cần xử lý", () => {
    const items = [
      ...attentionItemsOf(event({ reason: "PAYMENT_RECEIVED_AFTER_EXPIRY", orderId: "o1" })),
      ...attentionItemsOf(event({ reason: "PAYMENT_RECEIVED_AFTER_EXPIRY", orderId: "o2" })),
    ];
    const [text] = describeAttentionBatch(items, money);
    expect(text.to).toBe("/manager/orders/needs-attention");
    expect(text.text).toMatch(/^Có 2 khoản/);
  });
});

describe("enum khoản mới của BE (migration 20261012100000)", () => {
  it("EXPIRED, REQUIRES_ATTENTION có trong danh sách mã và có nhãn đã biết", () => {
    expect(PAYMENT_STATUS_CODES).toContain("EXPIRED");
    expect(PAYMENT_STATUS_CODES).toContain("REQUIRES_ATTENTION");
    expect(paymentStatusInfo("EXPIRED", "BANK_TRANSFER")).toMatchObject({ label: "Hết hạn", known: true });
    expect(paymentStatusInfo("REQUIRES_ATTENTION", "BANK_TRANSFER")).toMatchObject({ label: "Cần xử lý", tone: "error", known: true });
  });

  it("mọi mã trong PAYMENT_STATUS_CODES có nhãn tiếng Việt (không 'Khác' cho mã đã biết trong đặc tả)", () => {
    for (const code of ["SUCCESS", "PENDING", "AMOUNT_MISMATCH", "EXPIRED", "REQUIRES_ATTENTION"]) {
      expect(paymentStatusInfo(code, "BANK_TRANSFER").label).not.toMatch(/^Khác/);
    }
  });

  it("đơn có khoản EXPIRED/REQUIRES_ATTENTION: nhãn thanh toán của đơn", () => {
    const base = { status: "CONFIRMED", paymentStatus: "UNPAID" };
    expect(orderPaymentInfo({ ...base, payments: [{ method: "BANK_TRANSFER", status: "EXPIRED" }] }, now)).toMatchObject({ label: "QR hết hạn" });
    expect(orderPaymentInfo({ ...base, status: "REQUIRES_ATTENTION", payments: [{ method: "BANK_TRANSFER", status: "REQUIRES_ATTENTION" }] }, now)).toMatchObject({ label: "Cần xử lý", tone: "error" });
  });
});

describe("hạn mã QR (#50, #45)", () => {
  it("khoản QR PENDING quá expiresAt hiện Hết hạn dù BE chưa ghi EXPIRED (không có job)", () => {
    const past = "2026-10-12T04:50:00.000Z";
    const future = "2026-10-12T05:10:00.000Z";
    expect(isQrExpired({ status: "PENDING", method: "BANK_TRANSFER", expiresAt: past }, now)).toBe(true);
    expect(isQrExpired({ status: "PENDING", method: "BANK_TRANSFER", expiresAt: future }, now)).toBe(false);
    expect(isQrExpired({ status: "PENDING", method: "BANK_TRANSFER", expiresAt: null }, now)).toBe(false);
    expect(isQrExpired({ status: "PENDING", method: "CASH", expiresAt: past }, now)).toBe(false);
    expect(isQrExpired({ status: "SUCCESS", method: "BANK_TRANSFER", expiresAt: past }, now)).toBe(false);
    expect(paymentStatusInfo("PENDING", "BANK_TRANSFER", past, now).label).toBe("Hết hạn");
    expect(paymentStatusInfo("PENDING", "BANK_TRANSFER", future, now).label).toBe("Chờ chuyển khoản");
  });

  it("đơn chưa trả có QR quá hạn: 'QR hết hạn' thay vì 'Chờ chuyển khoản'", () => {
    const info = orderPaymentInfo({ status: "CONFIRMED", paymentStatus: "UNPAID", payments: [{ method: "BANK_TRANSFER", status: "PENDING", expiresAt: "2026-10-12T04:50:00.000Z" }] }, now);
    expect(info.label).toBe("QR hết hạn");
  });
});

describe("mã lỗi thanh toán ở trường error (#60)", () => {
  it("PAYMENT_ALREADY_SETTLED: câu Việt theo MÃ dù message là tiếng Anh mới của BE", () => {
    const err = new ApiError(409, "Payment has already been settled or is no longer payable", [], "PAYMENT_ALREADY_SETTLED");
    expect(describeApiError(err)).toBe(PAYMENT_ALREADY_SETTLED_TEXT);
  });

  it("PAYMENT_ALREADY_SETTLED: câu cũ (message = mã, BE trước fb7cae9, mock) vẫn khớp", () => {
    expect(describeApiError(new ApiError(409, "PAYMENT_ALREADY_SETTLED"))).toBe(PAYMENT_ALREADY_SETTLED_TEXT);
  });

  it("PAYMENT_AMOUNT_INSUFFICIENT theo mã", () => {
    const err = new ApiError(409, "Số tiền thực nhận thấp hơn tổng tiền đơn hàng.", [], "PAYMENT_AMOUNT_INSUFFICIENT");
    expect(describeApiError(err)).toMatch(/Nhận thiếu so với tổng đơn/);
  });

  it("câu tiếng Anh mới của recheck/webhook muộn có câu Việt", () => {
    expect(describeApiError(new ApiError(409, "Payment is no longer awaiting reconciliation"))).toMatch(/vừa thay đổi/);
    expect(describeApiError(new ApiError(409, "Order is no longer awaiting payment review"))).toMatch(/vừa thay đổi/);
  });
});

describe("sắp xếp phía BE (#66)", () => {
  it("gửi sortBy/sortOrder khi hợp lệ", () => {
    const q = new URLSearchParams(buildOrderQueryString({ page: 1, limit: 100, status: "REQUIRES_ATTENTION", sortBy: "attentionAt", sortOrder: "asc" }));
    expect(q.get("sortBy")).toBe("attentionAt");
    expect(q.get("sortOrder")).toBe("asc");
  });

  it("không gửi khi không chọn (BE mặc định placedAt giảm dần)", () => {
    const q = new URLSearchParams(buildOrderQueryString({ page: 1, limit: 20 }));
    expect(q.has("sortBy")).toBe(false);
    expect(q.has("sortOrder")).toBe(false);
  });
});

describe("sự kiện BE fb7cae9 làm tươi màn đơn (#51, QĐ 124)", () => {
  it("nghe order.finalized, payment.cancelled, payment.expired", () => {
    for (const t of ["order.finalized", "payment.cancelled", "payment.expired"]) expect(ORDER_EVENT_TYPES.has(t)).toBe(true);
  });
});
