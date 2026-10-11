import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OrderPaymentRecord, OrderSummary } from "../../../types";
import {
  ATTENTION_EVENT,
  attentionItemsOf,
  createAlertBatcher,
  createPoller,
  describeAttentionBatch,
  formatWaited,
  toAttentionRows,
} from "./attention";

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
  placedAt: "2026-10-11T05:00:00.000Z",
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

describe("danh sách đơn Cần xử lý (QĐ 99)", () => {
  const now = new Date("2026-10-11T06:00:00.000Z").getTime();

  it("cũ nhất trước; chỉ lấy REQUIRES_ATTENTION; đã chờ tính từ lúc đặt", () => {
    const rows = toAttentionRows(
      [
        order("new", { placedAt: "2026-10-11T05:50:00.000Z" }),
        order("old", { placedAt: "2026-10-11T04:30:00.000Z" }),
        order("paid", { status: "SUBMITTED", paymentStatus: "PAID" }),
        order("nodate", { placedAt: null }),
      ],
      now,
    );
    expect(rows.map((r) => r.id)).toEqual(["old", "new", "nodate"]);
    expect(rows[0].waitedMs).toBe(90 * 60_000);
    expect(rows[2].waitedMs).toBeNull();
  });

  it("chênh lệch: thiếu / dư / đủ / không rõ", () => {
    const [short, over, exact, unknown] = toAttentionRows(
      [
        order("a", { payments: [pay({ receivedAmount: 70000 })], placedAt: "2026-10-11T01:00:00.000Z" }),
        order("b", { payments: [pay({ receivedAmount: 80000 })], placedAt: "2026-10-11T02:00:00.000Z" }),
        order("c", { payments: [pay({ receivedAmount: 75000 })], placedAt: "2026-10-11T03:00:00.000Z" }),
        order("d", { payments: [pay({ receivedAmount: null })], placedAt: "2026-10-11T04:00:00.000Z" }),
      ],
      now,
    );
    expect(short).toMatchObject({ kind: "short", received: 70000, difference: -5000 });
    expect(over).toMatchObject({ kind: "over", difference: 5000 });
    expect(exact).toMatchObject({ kind: "exact", difference: 0 });
    expect(unknown).toMatchObject({ kind: "unknown", received: null, difference: null });
  });

  it("đơn REQUIRES_ATTENTION không có khoản lệch (BE chưa đánh dấu rõ) → không suy ra số nhận", () => {
    const [row] = toAttentionRows([order("x", { payments: [pay({ status: "PENDING", receivedAmount: null })] })], now);
    expect(row).toMatchObject({ kind: "unknown", received: null });
  });

  it("formatWaited", () => {
    expect(formatWaited(null)).toBe("—");
    expect(formatWaited(20_000)).toBe("vừa xong");
    expect(formatWaited(12 * 60_000)).toBe("12 phút");
    expect(formatWaited(65 * 60_000)).toBe("1 giờ 5 phút");
    expect(formatWaited(120 * 60_000)).toBe("2 giờ");
    expect(formatWaited((26 * 60 + 0) * 60_000)).toBe("1 ngày 2 giờ");
  });
});

describe("sự kiện manager.order.attention-required (QĐ 100)", () => {
  const ev = (data: unknown, type = ATTENTION_EVENT) => ({ type, occurredAt: "2026-10-11T06:00:00.000Z", data });

  it("lệch số tiền: 1 đơn kèm số nhận/cần; hết món: nhiều đơn; loại sự kiện khác → rỗng", () => {
    expect(attentionItemsOf(ev({ reason: "PAYMENT_AMOUNT_MISMATCH", orderId: "o1", paymentId: "p1", expectedAmount: "75000", receivedAmount: "70000" }))).toEqual([
      { key: "PAYMENT_AMOUNT_MISMATCH:o1", reason: "PAYMENT_AMOUNT_MISMATCH", orderId: "o1", expectedAmount: 75000, receivedAmount: 70000 },
    ]);
    expect(attentionItemsOf(ev({ reason: "ITEM_OUT_OF_STOCK", menuItemId: "m", orderIds: ["o1", "o2", "o1"] })).map((i) => i.key)).toEqual(["ITEM_OUT_OF_STOCK:o1", "ITEM_OUT_OF_STOCK:o2"]);
    expect(attentionItemsOf(ev({}, "payment.confirmed"))).toEqual([]);
    expect(attentionItemsOf(ev({ reason: "PAYMENT_AMOUNT_MISMATCH" }))).toEqual([]);
    expect(attentionItemsOf(ev({ reason: "LA", orderId: "o9" }))[0].reason).toBe("OTHER");
  });

  describe("gom 2 giây, không trùng theo đơn", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());
    const item = (id: string) => ({ key: `PAYMENT_AMOUNT_MISMATCH:${id}`, reason: "PAYMENT_AMOUNT_MISMATCH" as const, orderId: id });

    it("nhiều sự kiện trong 2 giây → đúng 1 lượt; đơn đã báo không báo lại", () => {
      const onBatch = vi.fn();
      const b = createAlertBatcher({ onBatch });
      b.push([item("o1")]);
      vi.advanceTimersByTime(1000);
      b.push([item("o2"), item("o1")]);
      expect(onBatch).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1000);
      expect(onBatch).toHaveBeenCalledTimes(1);
      expect(onBatch.mock.calls[0][0].map((i: { orderId: string }) => i.orderId)).toEqual(["o1", "o2"]);
      b.push([item("o1")]); // đã báo
      vi.advanceTimersByTime(5000);
      expect(onBatch).toHaveBeenCalledTimes(1);
      b.push([item("o3")]);
      vi.advanceTimersByTime(2000);
      expect(onBatch).toHaveBeenCalledTimes(2);
    });

    it("dispose huỷ lượt đang chờ", () => {
      const onBatch = vi.fn();
      const b = createAlertBatcher({ onBatch });
      b.push([item("o1")]);
      b.dispose();
      vi.advanceTimersByTime(5000);
      expect(onBatch).not.toHaveBeenCalled();
    });
  });

  it("câu thông báo tiếng Việt: 1 đơn lệch → kèm số tiền + dẫn tới chi tiết; nhiều đơn → dẫn tới danh sách; hết món → Tra cứu", () => {
    const money = (n: number) => `${n.toLocaleString("vi-VN")}₫`;
    const [one] = describeAttentionBatch([{ key: "k", reason: "PAYMENT_AMOUNT_MISMATCH", orderId: "o1", expectedAmount: 75000, receivedAmount: 70000 }], money);
    expect(one).toMatchObject({ to: "/manager/orders/o1", tone: "error" });
    expect(one.text).toContain("nhận 70.000₫, cần 75.000₫");
    const many = describeAttentionBatch(
      [
        { key: "a", reason: "PAYMENT_AMOUNT_MISMATCH", orderId: "o1" },
        { key: "b", reason: "PAYMENT_AMOUNT_MISMATCH", orderId: "o2" },
        { key: "c", reason: "ITEM_OUT_OF_STOCK", orderId: "o3" },
      ],
      money,
    );
    expect(many).toHaveLength(2);
    expect(many[0]).toMatchObject({ to: "/manager/orders/needs-attention", text: "Có 2 đơn chuyển khoản lệch số tiền cần xử lý." });
    expect(many[1]).toMatchObject({ to: "/manager/orders", tone: "warning" });
    expect(many.map((m) => m.text).join(" ")).not.toMatch(/[A-Za-z]{4,} [a-z]{3,} [a-z]{3,}.*(order|payment|attention)/);
  });
});

describe("tải định kỳ dự phòng #51 (QĐ 101)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("60 giây một lần khi tab hiển thị; ẩn thì dừng; hiện lại thì tải ngay rồi chạy tiếp; dispose dọn timer", () => {
    let visible = true;
    const load = vi.fn();
    const p = createPoller({ load, isVisible: () => visible });
    p.start();
    vi.advanceTimersByTime(59_000);
    expect(load).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1_000);
    expect(load).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_000);
    expect(load).toHaveBeenCalledTimes(2);

    visible = false;
    p.onVisibilityChange();
    vi.advanceTimersByTime(300_000);
    expect(load).toHaveBeenCalledTimes(2); // ẩn: không tải

    visible = true;
    p.onVisibilityChange();
    expect(load).toHaveBeenCalledTimes(3); // hiện lại: tải ngay
    vi.advanceTimersByTime(60_000);
    expect(load).toHaveBeenCalledTimes(4);

    p.dispose();
    vi.advanceTimersByTime(600_000);
    expect(load).toHaveBeenCalledTimes(4);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("bắt đầu khi tab đang ẩn: không có timer; hiện lên mới chạy", () => {
    let visible = false;
    const load = vi.fn();
    const p = createPoller({ load, isVisible: () => visible });
    p.start();
    expect(vi.getTimerCount()).toBe(0);
    visible = true;
    p.onVisibilityChange();
    expect(load).toHaveBeenCalledTimes(1);
    p.dispose();
  });
});
