import { describe, expect, it } from "vitest";
import type { OptionGroupInput } from "../../../types";
import { MAX_DISPLAY_ORDER, syncSelectionRule, validateGroupInput, type SelectionRuleField } from "./rules";

const options = Array.from({ length: 6 }, (_, i) => ({ name: `Món ${i + 1}`, code: `OP${i + 1}`, priceDelta: 0, isActive: true, isDefault: false }));
const group = (rule: { isRequired: boolean; minSelections: number; maxSelections: number }): OptionGroupInput => ({
  name: "Nhóm", code: "NHOM", isActive: true, options, ...rule,
});

describe("syncSelectionRule — luật chọn tự đồng bộ (isRequired ⇔ min > 0)", () => {
  it("tick bắt buộc khi min = 0 → min = 1", () => {
    expect(syncSelectionRule({ isRequired: true, minSelections: 0, maxSelections: 3 }, "isRequired")).toEqual({ isRequired: true, minSelections: 1, maxSelections: 3 });
  });
  it("tick bắt buộc khi min đã > 0 → giữ min", () => {
    expect(syncSelectionRule({ isRequired: true, minSelections: 2, maxSelections: 3 }, "isRequired").minSelections).toBe(2);
  });
  it("bỏ tick bắt buộc → min = 0", () => {
    expect(syncSelectionRule({ isRequired: false, minSelections: 2, maxSelections: 3 }, "isRequired")).toEqual({ isRequired: false, minSelections: 0, maxSelections: 3 });
  });
  it("đổi min > 0 → bắt buộc; đổi min = 0 → không bắt buộc", () => {
    expect(syncSelectionRule({ isRequired: false, minSelections: 1, maxSelections: 3 }, "minSelections").isRequired).toBe(true);
    expect(syncSelectionRule({ isRequired: true, minSelections: 0, maxSelections: 3 }, "minSelections").isRequired).toBe(false);
  });
  it("min tăng vượt max → max = min", () => {
    expect(syncSelectionRule({ isRequired: false, minSelections: 5, maxSelections: 2 }, "minSelections")).toEqual({ isRequired: true, minSelections: 5, maxSelections: 5 });
  });
  it("hạ max xuống dưới min → max = min (max không bao giờ < min)", () => {
    expect(syncSelectionRule({ isRequired: true, minSelections: 3, maxSelections: 1 }, "maxSelections")).toEqual({ isRequired: true, minSelections: 3, maxSelections: 3 });
  });
  it("kẹp vào khoảng của BE và xử lý không phải số", () => {
    expect(syncSelectionRule({ isRequired: false, minSelections: 500, maxSelections: 500 }, "minSelections")).toEqual({ isRequired: true, minSelections: 100, maxSelections: 100 });
    expect(syncSelectionRule({ isRequired: false, minSelections: -4, maxSelections: 0 }, "minSelections")).toEqual({ isRequired: false, minSelections: 0, maxSelections: 1 });
    expect(syncSelectionRule({ isRequired: true, minSelections: Number.NaN, maxSelections: Number.NaN }, "isRequired")).toEqual({ isRequired: true, minSelections: 1, maxSelections: 1 });
    expect(syncSelectionRule({ isRequired: false, minSelections: 1.9, maxSelections: 2.2 }, "minSelections")).toEqual({ isRequired: true, minSelections: 1, maxSelections: 2 });
  });
  it("chạy xong thì bộ kiểm luôn đạt, với mọi tổ hợp đầu vào và mọi trường vừa đổi", () => {
    const fields: SelectionRuleField[] = ["isRequired", "minSelections", "maxSelections"];
    const numbers = [-3, 0, 1, 2, 5, 6, 100, 101, 999];
    for (const isRequired of [true, false]) {
      for (const minSelections of numbers) {
        for (const maxSelections of numbers) {
          for (const field of fields) {
            const rule = syncSelectionRule({ isRequired, minSelections, maxSelections }, field);
            // Bộ kiểm còn một luật phụ thuộc số tuỳ chọn đang bật (≥ min): nhóm mẫu có 6, nên bỏ qua các ca min > 6.
            if (rule.minSelections > options.length) continue;
            expect(validateGroupInput(group(rule)), JSON.stringify({ isRequired, minSelections, maxSelections, field, rule })).toEqual([]);
          }
        }
      }
    }
  });
});

describe("validateGroupInput — khớp luật BE (menu.service.ts:581-593, menu.dto.ts:243-284)", () => {
  it("hai chiều: không bắt buộc mà min > 0 bị từ chối", () => {
    expect(validateGroupInput(group({ isRequired: false, minSelections: 1, maxSelections: 2 }))).toContain("Nhóm không bắt buộc phải có số chọn tối thiểu bằng 0");
  });
  it("khoảng: min ≤ 100, max 1–100", () => {
    expect(validateGroupInput(group({ isRequired: true, minSelections: 101, maxSelections: 101 }))).toEqual(
      expect.arrayContaining(["Số chọn tối thiểu tối đa là 100", "Số chọn tối đa tối đa là 100"]),
    );
    expect(validateGroupInput(group({ isRequired: false, minSelections: 0, maxSelections: 0 }))).toContain("Số chọn tối đa phải từ 1 trở lên");
  });
  it("displayOrder 0–9999 khi có", () => {
    const base = group({ isRequired: false, minSelections: 0, maxSelections: 1 });
    expect(validateGroupInput({ ...base, displayOrder: MAX_DISPLAY_ORDER })).toEqual([]);
    expect(validateGroupInput({ ...base, displayOrder: 0 })).toEqual([]);
    expect(validateGroupInput({ ...base, displayOrder: MAX_DISPLAY_ORDER + 1 })).toHaveLength(1);
    expect(validateGroupInput({ ...base, displayOrder: -1 })).toHaveLength(1);
  });
});
