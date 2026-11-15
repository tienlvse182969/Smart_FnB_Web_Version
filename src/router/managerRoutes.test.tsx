import { describe, expect, it } from "vitest";
import { managerRoutes, ownerRoutes } from "./routeConfig";

describe("Store Manager — menu và route (BM-07)", () => {
  it("menu chỉ có một mục Sổ giao dịch (cash-ledger, BM-07); route /ledger cũ còn nhưng ẩn khỏi menu", () => {
    const labelled = managerRoutes.filter((route) => route.label === "Sổ giao dịch" && route.nav !== false);
    expect(labelled.map((route) => route.path)).toEqual(["cash-ledger"]);
    expect(labelled[0].code).toBe("BM-07");
    expect(managerRoutes.find((route) => route.path === "ledger")?.nav).toBe(false);
  });

  it("Brand Manager không có route sổ riêng (Brand Manager xem sổ trong báo cáo, làm ở phase sau)", () => {
    expect(ownerRoutes.some((route) => route.path === "ledger")).toBe(false);
  });
});
