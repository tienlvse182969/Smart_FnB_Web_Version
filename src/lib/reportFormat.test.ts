import { describe, expect, it } from "vitest";
import { formatCount, formatVnd, formatVndCompact, parseAmount } from "./reportFormat";

describe("parseAmount — backend trả lẫn chuỗi thập phân và chuỗi nguyên", () => {
  it('đọc "995000.00" (báo cáo) và "250000" (thanh toán)', () => {
    expect(parseAmount("995000.00")).toBe(995000);
    expect(parseAmount("250000")).toBe(250000);
  });

  it("nhận số, số 0, số âm, số thập phân", () => {
    expect(parseAmount(1250000)).toBe(1250000);
    expect(parseAmount(0)).toBe(0);
    expect(parseAmount("-1500.50")).toBe(-1500.5);
  });

  it("null, undefined, chuỗi rỗng → 0", () => {
    expect(parseAmount(null)).toBe(0);
    expect(parseAmount(undefined)).toBe(0);
    expect(parseAmount("")).toBe(0);
  });

  it("NaN, Infinity và chuỗi không phải số → 0 (một dòng hỏng không làm vỡ cả bảng)", () => {
    expect(parseAmount(NaN)).toBe(0);
    expect(parseAmount(Infinity)).toBe(0);
    expect(parseAmount("abc")).toBe(0);
  });
});

describe("định dạng", () => {
  it("formatVnd đi qua parseAmount", () => {
    expect(formatVnd("995000.00")).toMatch(/995\.000/);
    expect(formatVnd(null)).toMatch(/^0/);
  });

  it("formatVndCompact", () => {
    expect(formatVndCompact(0)).toBe("0");
    expect(formatVndCompact(7_420_000)).toContain("tr");
    expect(formatVndCompact(NaN)).toBe("0");
  });

  it("formatCount chịu NaN", () => {
    expect(formatCount(NaN)).toBe("0");
    expect(formatCount(1234)).toBe((1234).toLocaleString("vi-VN"));
  });
});
