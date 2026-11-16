import { describe, expect, it } from "vitest";
import { managerRoutes, ownerRoutes } from "./routeConfig";

describe("Store Manager — menu và route (BM-07)", () => {
  it("có mục Sổ giao dịch trong menu, mã BM-07, đường dẫn /store-manager/ledger", () => {
    const ledger = managerRoutes.find((route) => route.path === "ledger");
    expect(ledger?.label).toBe("Sổ giao dịch");
    expect(ledger?.code).toBe("BM-07");
    expect(ledger?.nav).not.toBe(false);
  });

  it("Brand Manager không có route sổ riêng (Brand Manager xem sổ trong báo cáo, làm ở phase sau)", () => {
    expect(ownerRoutes.some((route) => route.path === "ledger")).toBe(false);
  });
});
