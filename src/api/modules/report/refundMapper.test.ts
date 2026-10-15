import { describe, expect, it } from "vitest";
import { mapChainRefundPage } from "./refundMapper";

describe("mapChainRefundPage (#99, BE 8a315ad)", () => {
  it("đọc đơn, chi nhánh, số tiền chuỗi thập phân và vai trò người huỷ", () => {
    const page = mapChainRefundPage({
      items: [
        {
          id: "r1",
          orderId: "o1",
          amount: "65000.00",
          reason: "Khách đổi ý",
          method: "BANK_TRANSFER",
          source: "MANAGER_CANCELLATION",
          requestedByRole: "MANAGER",
          requestedAt: "2026-10-14T03:00:00.000Z",
          order: { id: "o1", orderCode: "ORD-1", callNumber: 7, branch: { id: "b1", name: "CN 1", code: "B1", chainId: "c1" } },
        },
      ],
      total: 1,
      page: 1,
      limit: 100,
    });
    expect(page.total).toBe(1);
    expect(page.items[0]).toMatchObject({
      id: "r1",
      orderCode: "ORD-1",
      callNumber: 7,
      branchId: "b1",
      branchName: "CN 1",
      amount: 65000,
      requestedByRole: "MANAGER",
    });
  });

  it("phản hồi lạ không ném lỗi", () => {
    expect(mapChainRefundPage(null)).toEqual({ items: [], total: 0, page: 1, limit: 0 });
  });
});
