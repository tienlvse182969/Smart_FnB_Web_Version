import { describe, expect, it } from "vitest";
import { MAX_MONEY, formatMoneyInput, isWholeVnd, parseMoneyText, sanitizeMoneyDigits } from "./money";

describe("parseMoneyText — chỉ nhận số nguyên đồng (BR-19)", () => {
  it("đọc số nguyên, có hoặc không dấu ngăn nghìn, bỏ khoảng trắng và ký hiệu ₫", () => {
    expect(parseMoneyText("25000")).toBe(25000);
    expect(parseMoneyText("25.000")).toBe(25000);
    expect(parseMoneyText("1.250.000")).toBe(1250000);
    expect(parseMoneyText(" 25 000 ₫ ")).toBe(25000);
    expect(parseMoneyText("0")).toBe(0);
  });

  it("từ chối số lẻ, không nhầm thành số khác: 25,5 · 1.5 · 25.50 · 1.234,56", () => {
    for (const text of ["25,5", "1.5", "25.50", "1.234,56", "0,5"]) expect(parseMoneyText(text)).toBeNull();
  });

  it("từ chối số âm, chữ lạ, rỗng, nhóm nghìn sai", () => {
    for (const text of ["-1000", "−5", "abc", "12a", "", "   ", "1.00", "1.2345", "12.34.567"]) {
      expect(parseMoneyText(text), text).toBeNull();
    }
    expect(parseMoneyText(null)).toBeNull();
    expect(parseMoneyText(undefined)).toBeNull();
  });

  it("số quá lớn không an toàn trả null", () => {
    expect(parseMoneyText("99999999999999999999")).toBeNull();
  });
});

describe("formatMoneyInput / sanitizeMoneyDigits", () => {
  it("ngăn nghìn bằng dấu chấm; bỏ mọi ký tự không phải chữ số", () => {
    expect(formatMoneyInput(25000)).toBe("25.000");
    expect(formatMoneyInput("1250000")).toBe("1.250.000");
    expect(formatMoneyInput("12,5")).toBe("125");
    expect(formatMoneyInput(undefined)).toBe("");
    expect(formatMoneyInput(0)).toBe("0");
  });

  it("sanitizeMoneyDigits chỉ giữ chữ số", () => {
    expect(sanitizeMoneyDigits("1.2a-3,4")).toBe("1234");
  });
});

describe("isWholeVnd", () => {
  it("số nguyên không âm trong trần BE", () => {
    expect(isWholeVnd(0)).toBe(true);
    expect(isWholeVnd(MAX_MONEY)).toBe(true);
    expect(isWholeVnd(MAX_MONEY + 1)).toBe(false);
    expect(isWholeVnd(-1)).toBe(false);
    expect(isWholeVnd(1000.5)).toBe(false);
    expect(isWholeVnd(Number.NaN)).toBe(false);
    expect(isWholeVnd("1000")).toBe(false);
    expect(isWholeVnd(null)).toBe(false);
  });

  it("trần tuỳ chỉnh", () => {
    expect(isWholeVnd(500, 499)).toBe(false);
    expect(isWholeVnd(499, 499)).toBe(true);
  });
});
