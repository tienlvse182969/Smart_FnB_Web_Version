/** Danh sách đơn: một cột trạng thái (thay hai cột trùng nhau) và mặc định ẩn đơn còn chờ thanh toán. */
import { describe, expect, it } from "vitest";
import { orderListStatusInfo } from "./codes";
import { buildOrderQueryString } from "./query";
import { toOrderQuery } from "../../../roles/branch/orderFilters";

const qr = (status: string, expiresAt: string | null = null) => ({ method: "BANK_TRANSFER", status, expiresAt });

describe("orderListStatusInfo — một nhãn cho mỗi đơn", () => {
  it("đơn huỷ: phân biệt huỷ khi chưa trả với huỷ sau khi trả (đã hoàn / chờ hoàn)", () => {
    expect(orderListStatusInfo({ status: "CANCELLED", paymentStatus: "UNPAID", payments: [] }).label).toBe("Đã huỷ");
    expect(orderListStatusInfo({ status: "CANCELLED", paymentStatus: "PAID", payments: [], refunds: [{ status: "COMPLETED" }] }).label).toBe("Đã huỷ · đã hoàn tiền");
    expect(orderListStatusInfo({ status: "CANCELLED", paymentStatus: "PAID", payments: [], refunds: [{ status: "PENDING" }] })).toMatchObject({ label: "Đã huỷ · chờ hoàn tiền", tone: "warning" });
    expect(orderListStatusInfo({ status: "CANCELLED", paymentStatus: "PAID", payments: [] }).label).toBe("Đã huỷ sau khi thanh toán");
  });

  it("đơn chờ thanh toán: kèm tình trạng QR nếu có", () => {
    const now = Date.parse("2026-11-27T08:00:00Z");
    expect(orderListStatusInfo({ status: "CONFIRMED", paymentStatus: "UNPAID", payments: [] }, now).label).toBe("Chờ thanh toán");
    expect(orderListStatusInfo({ status: "CONFIRMED", paymentStatus: "UNPAID", payments: [qr("PENDING", "2026-11-27T08:10:00Z")] }, now).label).toBe("Chờ thanh toán · Chờ chuyển khoản");
    expect(orderListStatusInfo({ status: "CONFIRMED", paymentStatus: "UNPAID", payments: [qr("EXPIRED")] }, now).label).toBe("Chờ thanh toán · QR hết hạn");
  });

  it("các trạng thái khác giữ nhãn trạng thái đơn", () => {
    expect(orderListStatusInfo({ status: "SUBMITTED", paymentStatus: "PAID", payments: [] }).label).toBe("Đã thanh toán");
    expect(orderListStatusInfo({ status: "DELIVERED", paymentStatus: "PAID", payments: [] }).label).toBe("Hoàn tất");
  });
});

describe("mặc định ẩn đơn còn chờ thanh toán", () => {
  const filters = { from: "2026-11-21", to: "2026-11-27", page: 1, limit: 20, branch: "", callNumber: "", orderCode: "", status: "", payment: "", method: "", refund: "" };

  it("không chọn trạng thái → gửi hideAwaitingPayment; chọn trạng thái (vd. Chờ thanh toán) → không gửi", () => {
    const hidden = toOrderQuery(filters as never);
    expect(hidden.hideAwaitingPayment).toBe(true);
    expect(buildOrderQueryString(hidden)).toContain("hideAwaitingPayment=true");
    const pending = toOrderQuery({ ...filters, status: "CONFIRMED" } as never);
    expect(pending.hideAwaitingPayment).toBeUndefined();
    expect(buildOrderQueryString(pending)).not.toContain("hideAwaitingPayment");
    expect(buildOrderQueryString(pending)).toContain("status=CONFIRMED");
  });
});
