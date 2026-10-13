/**
 * Lượt 7.8 (QĐ 132, BM-06, BR-49): hộp huỷ đơn đã trả chọn từng dòng — hiện tuỳ chọn, giá lúc bán, dòng đã pha xong báo hao hụt;
 * thân gửi đúng DTO; lệch thiếu / tiền về muộn chỉ huỷ cả đơn.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CancelPaidModal } from "./RefundModals";
import { cancelTarget, isWastageLine, refundAmountFor } from "../../api/modules/order/paidCancel";
import type { OrderDetail, OrderDetailLine, OrderPaymentRecord } from "../../types";

vi.stubGlobal(
  "matchMedia",
  (query: string) => ({ matches: false, media: query, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined }),
);
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

/** antd gắn `data-testid` lên chính `<input>` hoặc lên nhãn bọc ngoài tuỳ phiên bản: lấy input trong cả hai trường hợp. */
const input = (el: HTMLElement): HTMLElement => (el.tagName === "INPUT" ? el : (el.querySelector("input") as HTMLElement));

const line = (over: Partial<OrderDetailLine>): OrderDetailLine => ({
  id: "l",
  name: "Trà sữa",
  unitPrice: 50000,
  quantity: 1,
  options: [],
  total: 50000,
  status: "QUEUED",
  note: null,
  cancellationReason: null,
  ...over,
});
const pay: OrderPaymentRecord = {
  id: "p",
  paymentCode: "PAY",
  method: "CASH",
  status: "SUCCESS",
  amount: 125000,
  receivedAmount: null,
  transactionRef: null,
  confirmationReason: null,
  confirmedAt: null,
  paidAt: null,
  createdAt: null,
  failureReason: null,
  processedBy: null,
};
const order = (over: Partial<OrderDetail> = {}): OrderDetail =>
  ({
    id: "o",
    orderCode: "CTR-1",
    callNumber: 5,
    placedAt: null,
    paidAt: null,
    total: 125000,
    status: "PREPARING",
    paymentStatus: "PAID",
    payments: [pay],
    cashierName: null,
    cancelledAt: null,
    cancellationReason: null,
    refunds: [],
    subtotal: 125000,
    discount: 0,
    tax: 0,
    serviceCharge: 0,
    note: null,
    cancelledBy: null,
    lines: [
      line({ id: "a", name: "Trà sữa", unitPrice: 55000, total: 110000, quantity: 2, status: "READY", options: [{ groupName: "Size", name: "L", priceDelta: 5000 }, { groupName: "Đường", name: "50%", priceDelta: 0 }] }),
      line({ id: "b", name: "Cà phê", unitPrice: 15000, total: 15000, status: "QUEUED" }),
    ],
    ...over,
  }) as OrderDetail;

describe("hộp huỷ chọn từng dòng", () => {
  const mount = (o: OrderDetail, onSubmit = vi.fn()) => {
    const target = cancelTarget(o)!;
    render(<CancelPaidModal open order={o} target={target} submitting={false} onCancel={() => undefined} onSubmit={onSubmit} />);
    return onSubmit;
  };

  it("mỗi dòng hiện tên, số suất, giá lúc bán, tuỳ chọn; dòng đã pha xong ghi hao hụt", () => {
    mount(order());
    const texts = screen.getAllByTestId("cancel-line-text").map((e) => e.textContent ?? "");
    expect(texts[0]).toMatch(/Trà sữa ×2/);
    expect(texts[0]).toMatch(/55\.000\s?₫\/suất/);
    expect(texts[0]).toMatch(/110\.000/);
    expect((screen.getByTestId("cancel-line-options").textContent ?? "").replace(/\s/g, " ")).toBe("Size: L (+5.000 ₫) · Đường: 50%");
    const wastage = screen.getAllByTestId("cancel-line-wastage");
    expect(wastage).toHaveLength(1);
    expect(wastage[0].textContent).toMatch(/hao hụt/);
  });

  it("chọn một dòng: tóm tắt hoàn theo giá lúc bán, thân gửi đúng orderItemIds, lý do và hình thức hoàn", () => {
    const onSubmit = mount(order());
    fireEvent.click(input(screen.getAllByTestId("cancel-line")[1]));
    fireEvent.click(input(screen.getByTestId("cancel-method-bank")));
    fireEvent.change(screen.getByTestId("cancel-reason"), { target: { value: "Khách đổi ý" } });
    expect(screen.getByTestId("cancel-amount").textContent).toMatch(/15\.000/);
    fireEvent.click(screen.getByTestId("cancel-next"));
    expect(screen.getByTestId("cancel-review-scope").textContent).toBe("Cà phê ×1");
    expect(screen.queryByTestId("cancel-review-wastage")).toBeNull();
    fireEvent.click(screen.getByTestId("cancel-submit"));
    expect(onSubmit).toHaveBeenCalledWith({ reason: "Khách đổi ý", refundMethod: "BANK_TRANSFER", orderItemIds: ["b"] });
  });

  it("chọn dòng đã pha xong: bước xem lại nêu hao hụt", () => {
    mount(order());
    fireEvent.click(input(screen.getAllByTestId("cancel-line")[0]));
    fireEvent.change(screen.getByTestId("cancel-reason"), { target: { value: "Làm sai món" } });
    fireEvent.click(screen.getByTestId("cancel-next"));
    expect(screen.getByTestId("cancel-review-wastage").textContent).toMatch(/Trà sữa ×2 đã pha xong, sẽ ghi hao hụt/);
  });

  it("không chọn dòng: huỷ cả đơn, không gửi orderItemIds", () => {
    const onSubmit = mount(order());
    fireEvent.change(screen.getByTestId("cancel-reason"), { target: { value: "Khách bỏ đi" } });
    fireEvent.click(screen.getByTestId("cancel-next"));
    fireEvent.click(screen.getByTestId("cancel-submit"));
    expect(onSubmit).toHaveBeenCalledWith({ reason: "Khách bỏ đi", refundMethod: "CASH" });
  });

  it("thiếu lý do: không sang bước xem lại", () => {
    mount(order());
    fireEvent.click(screen.getByTestId("cancel-next"));
    expect(screen.getByTestId("cancel-reason-error")).toBeTruthy();
    expect(screen.queryByTestId("cancel-review-scope")).toBeNull();
  });

  it("lệch thiếu hoặc tiền về muộn: không có ô chọn dòng, hoàn đúng số đã nhận", () => {
    const mismatch = order({ status: "REQUIRES_ATTENTION", paymentStatus: "UNPAID", payments: [{ ...pay, method: "BANK_TRANSFER", status: "AMOUNT_MISMATCH", receivedAmount: 100000 }] });
    mount(mismatch);
    expect(screen.queryByTestId("cancel-lines")).toBeNull();
    expect(screen.getByTestId("cancel-amount").textContent).toMatch(/100\.000/);
  });
});

describe("hàm thuần", () => {
  it("isWastageLine: READY/DELIVERED là hao hụt, còn lại không", () => {
    expect(isWastageLine({ status: "READY" })).toBe(true);
    expect(isWastageLine({ status: "DELIVERED" })).toBe(true);
    expect(isWastageLine({ status: "QUEUED" })).toBe(false);
    expect(isWastageLine({ status: "PREPARING" })).toBe(false);
  });

  it("refundAmountFor: nhiều dòng chọn = tổng giá lúc bán, không vượt số dư", () => {
    const o = order();
    const target = cancelTarget(o)!;
    expect(refundAmountFor(target, o.lines, ["a"])).toBe(110000);
    expect(refundAmountFor(target, o.lines, ["a", "b"])).toBe(125000);
    expect(refundAmountFor(target, o.lines, [])).toBe(125000);
  });
});
