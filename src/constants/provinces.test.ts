/**
 * Unit test cho danh sách tỉnh/thành sau sáp nhập 2025. Mục đích chính là chốt đúng con số 34 — sai sót ở đây
 * sẽ đi thẳng vào dữ liệu địa chỉ chi nhánh mà không ai phát hiện.
 */
import { describe, expect, it } from "vitest";
import {
  CENTRAL_CITIES,
  canonicalProvince,
  PROVINCES,
  PROVINCES_ONLY,
  PROVINCE_OPTIONS,
  isKnownProvince,
} from "./provinces";

describe("danh sách tỉnh/thành 2025", () => {
  it("có 6 thành phố trực thuộc trung ương, 28 tỉnh, tổng 34", () => {
    expect(CENTRAL_CITIES).toHaveLength(6);
    expect(PROVINCES_ONLY).toHaveLength(28);
    expect(PROVINCES).toHaveLength(34);
  });

  it("không trùng tên, không rỗng, không thừa khoảng trắng", () => {
    expect(PROVINCES.filter((name, index) => PROVINCES.indexOf(name) !== index)).toEqual([]);
    expect(PROVINCES.filter((name) => name !== name.trim() || name.length === 0)).toEqual([]);
  });

  it("PROVINCE_OPTIONS đủ 34 lựa chọn, value trùng label", () => {
    expect(PROVINCE_OPTIONS).toHaveLength(34);
    expect(PROVINCE_OPTIONS.every((option) => option.value === option.label)).toBe(true);
  });

  it.each(["Bình Dương", "Bà Rịa - Vũng Tàu", "Hà Nam", "Nam Định", "Hậu Giang", "Bạc Liêu"])(
    "đã bỏ đơn vị bị sáp nhập: %s",
    (merged) => {
      expect(PROVINCES).not.toContain(merged);
    },
  );

  it("isKnownProvince", () => {
    expect(isKnownProvince("Thành phố Hồ Chí Minh")).toBe(true);
    expect(isKnownProvince("Bình Dương")).toBe(false);
    expect(isKnownProvince("")).toBe(false);
    expect(isKnownProvince(null)).toBe(false);
  });
});

describe("canonicalProvince — backend ghi tên không thống nhất", () => {
  const HCM = "Thành phố Hồ Chí Minh";

  it.each([
    "Hồ Chí Minh",
    "Thành phố Hồ Chí Minh",
    "thành phố hồ chí minh",
    "THÀNH PHỐ HỒ CHÍ MINH",
    "TP Hồ Chí Minh",
    "TP. Hồ Chí Minh",
    "  Hồ   Chí  Minh  ",
  ])('"%s" → tên chuẩn', (variant) => {
    expect(canonicalProvince(variant)).toBe(HCM);
  });

  it("bỏ tiền tố, chuẩn hoá hoa thường", () => {
    expect(canonicalProvince("Tỉnh Nghệ An")).toBe("Nghệ An");
    expect(canonicalProvince("tuyên quang")).toBe("Tuyên Quang");
    expect(canonicalProvince("Cần Thơ")).toBe("Cần Thơ");
  });

  it("không khớp thì trả null", () => {
    expect(canonicalProvince("12 Le Loi")).toBeNull();
    expect(canonicalProvince("Bình Dương")).toBeNull();
    expect(canonicalProvince(null)).toBeNull();
    expect(canonicalProvince("   ")).toBeNull();
  });

  it("mọi tên chuẩn tự khớp chính nó", () => {
    expect(PROVINCES.every((name) => canonicalProvince(name) === name)).toBe(true);
  });
});
