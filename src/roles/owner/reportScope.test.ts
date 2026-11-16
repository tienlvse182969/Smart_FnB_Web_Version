import { describe, expect, it } from "vitest";
import { ApiError } from "../../api/http/errors";
import { ALL_BRANCHES, branchStatusSuffix, branchesWithOwnPrice, isPlanFeatureError, resolveReportScope } from "./reportScope";

const three = ["b1", "b2", "b3"];

describe("resolveReportScope — chế độ theo gói (OW-08, mục 13.1)", () => {
  it("Tiêu chuẩn trở lên: mặc định tất cả chi nhánh, có so sánh", () => {
    expect(resolveReportScope({ hasCompare: true, branchIds: three, selected: ALL_BRANCHES })).toEqual({
      selected: ALL_BRANCHES,
      canPickAll: true,
      branchIds: undefined,
      showComparison: true,
      comparisonLock: null,
    });
  });

  it("Tiêu chuẩn: chọn một chi nhánh thì gửi đúng chi nhánh đó và ẩn khối so sánh (chỉ một dòng)", () => {
    const scope = resolveReportScope({ hasCompare: true, branchIds: three, selected: "b2" });
    expect(scope.branchIds).toEqual(["b2"]);
    expect(scope.showComparison).toBe(false);
    expect(scope.canPickAll).toBe(true);
  });

  it("Cơ bản: bắt buộc một chi nhánh — 'tất cả' rơi về chi nhánh đầu và khoá khối so sánh theo gói", () => {
    const scope = resolveReportScope({ hasCompare: false, branchIds: three, selected: ALL_BRANCHES });
    expect(scope).toEqual({ selected: "b1", canPickAll: false, branchIds: ["b1"], showComparison: false, comparisonLock: "plan" });
  });

  it("Cơ bản: giữ chi nhánh đang chọn nếu hợp lệ", () => {
    expect(resolveReportScope({ hasCompare: false, branchIds: three, selected: "b3" }).branchIds).toEqual(["b3"]);
  });

  it("chuỗi chỉ có một chi nhánh: luôn đúng chi nhánh đó, không so sánh, kể cả gói có so sánh", () => {
    for (const hasCompare of [true, false]) {
      const scope = resolveReportScope({ hasCompare, branchIds: ["only"], selected: ALL_BRANCHES });
      expect(scope.branchIds).toEqual(["only"]);
      expect(scope.showComparison).toBe(false);
      expect(scope.comparisonLock).toBe("single-branch");
      expect(scope.canPickAll).toBe(false);
    }
  });

  it("lựa chọn không còn hợp lệ (chi nhánh bị xoá) không vỡ: về tất cả (có so sánh) hoặc chi nhánh đầu (Cơ bản)", () => {
    expect(resolveReportScope({ hasCompare: true, branchIds: three, selected: "gone" }).selected).toBe(ALL_BRANCHES);
    expect(resolveReportScope({ hasCompare: false, branchIds: three, selected: "gone" }).selected).toBe("b1");
  });

  it("chưa có chi nhánh nào: không gửi bộ lọc, không so sánh", () => {
    const scope = resolveReportScope({ hasCompare: true, branchIds: [], selected: ALL_BRANCHES });
    expect(scope.branchIds).toBeUndefined();
    expect(scope.showComparison).toBe(false);
  });
});

describe("isPlanFeatureError — 403 do gói (BR-08)", () => {
  it("chỉ nhận 403 PLAN_FEATURE_NOT_ENABLED", () => {
    expect(isPlanFeatureError(new ApiError(403, "Gói hiện tại không hỗ trợ so sánh nhiều chi nhánh.", [], "PLAN_FEATURE_NOT_ENABLED"))).toBe(true);
    expect(isPlanFeatureError(new ApiError(403, "Only OWNER can read chain reports"))).toBe(false);
    expect(isPlanFeatureError(new ApiError(500, "x", [], "PLAN_FEATURE_NOT_ENABLED"))).toBe(false);
    expect(isPlanFeatureError(null)).toBe(false);
  });
});

describe("chi nhánh Tạm ngưng và giá riêng", () => {
  it("nhãn hậu tố theo trạng thái chi nhánh", () => {
    expect(branchStatusSuffix("ACTIVE")).toBe("");
    expect(branchStatusSuffix("MAINTENANCE")).toBe(" · Tạm ngưng");
    expect(branchStatusSuffix("INACTIVE")).toBe(" · Đóng cửa");
  });

  it("đếm số mục có giá riêng theo chi nhánh, bỏ ô dùng giá chuỗi (BR-85)", () => {
    const map = branchesWithOwnPrice([
      { branchId: "b1", priceOverride: 30000 },
      { branchId: "b1", priceOverride: null },
      { branchId: "b1", priceOverride: 0 },
      { branchId: "b2", priceOverride: null },
    ]);
    expect(map.get("b1")).toBe(2);
    expect(map.has("b2")).toBe(false);
  });
});
