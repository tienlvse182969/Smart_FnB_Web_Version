import { describe, expect, it } from "vitest";
import { mapManagerReport } from "./mapper";

const fallback = { from: "2026-11-13", to: "2026-11-13", granularity: "day" as const };
const cancelled = (over: Record<string, unknown> = {}) => ({ id: "o1", orderCode: "A-1", callNumber: 3, totalAmount: "45000", cancelledAt: "2026-11-13T03:00:00.000Z", reason: "Khách đổi ý", refundAmount: "45000", ...over });

describe("báo cáo chi nhánh: người huỷ và người hoàn (BE 2491dce, BR-50)", () => {
  it("map người huỷ và từng khoản hoàn kèm người yêu cầu, người hoàn", () => {
    const r = mapManagerReport(
      {
        cancellations: {
          total: 1,
          items: [
            cancelled({
              cancelledBy: { id: "e1", employeeCode: "NV1", firstName: "Lan", lastName: "Lê" },
              refunds: [{ id: "r1", amount: "45000", status: "COMPLETED", reason: "Sai món", note: null, requestedBy: { firstName: "An", lastName: "Vũ" }, completedBy: { employeeCode: "NV9", firstName: "", lastName: "" } }],
            }),
          ],
        },
      },
      fallback,
    );
    const item = r.cancellations.items[0];
    expect(item.cancelledByName).toBe("Lan Lê");
    expect(item.refunds).toEqual([{ amount: 45000, status: "COMPLETED", reason: "Sai món", note: null, requestedByName: "An Vũ", completedByName: "NV9" }]);
  });

  it("BE cũ không trả: không có trường, không bịa tên", () => {
    const item = mapManagerReport({ cancellations: { items: [cancelled()] } }, fallback).cancellations.items[0];
    expect("cancelledByName" in item).toBe(false);
    expect("refunds" in item).toBe(false);
  });

  it("cancelledBy null (hệ thống huỷ): null; refunds rỗng: mảng rỗng", () => {
    const item = mapManagerReport({ cancellations: { items: [cancelled({ cancelledBy: null, refunds: [] })] } }, fallback).cancellations.items[0];
    expect(item.cancelledByName).toBeNull();
    expect(item.refunds).toEqual([]);
  });
});
