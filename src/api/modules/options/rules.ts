/**
 * Quy tắc tuỳ chọn món (đặc tả 12.2, BR-14, BR-15, BR-19) — thuần hàm, MỘT nguồn cho form, mock và (sau này) kiểm tra trước khi gửi BE.
 * Mock trả cùng các lỗi này khi bị gọi vòng qua form.
 */
import type { OptionGroup, OptionGroupInput } from "../../../types";
import { MAX_PRICE } from "../menu/validate";

export const CODE_PATTERN = /^[A-Z0-9_-]{1,50}$/; // CHỜ BE: giả định cùng định dạng với SKU; BE chưa công bố quy tắc `code`.

/** Giới hạn của BE: `min` 0–100, `max` 1–100 (`menu.dto.ts:262-275`), `displayOrder` 0–9999 (`menu.dto.ts:278-284`). */
export const MAX_MIN_SELECTIONS = 100;
export const MAX_MAX_SELECTIONS = 100;
export const MAX_DISPLAY_ORDER = 9999;

export type SelectionRule = { isRequired: boolean; minSelections: number; maxSelections: number };
export type SelectionRuleField = keyof SelectionRule;

const toInt = (value: number, fallback: number) => (Number.isFinite(value) ? Math.trunc(value) : fallback);
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/**
 * Đồng bộ luật chọn của nhóm sau khi người dùng đổi MỘT trường (`changed`), để bộ kiểm `validateGroupInput` luôn đạt:
 *   - tick bắt buộc mà min = 0 → min = 1; bỏ tick → min = 0;
 *   - đổi min > 0 → bắt buộc; đổi min = 0 → không bắt buộc;
 *   - max không bao giờ nhỏ hơn min (min tăng vượt max → max = min; hạ max xuống dưới min → max = min).
 * Số ngoài khoảng của BE được kẹp vào khoảng (min 0–100, max 1–100); không phải số thì coi như 0 (min) hoặc 1 (max).
 */
export function syncSelectionRule(rule: SelectionRule, changed: SelectionRuleField): SelectionRule {
  let min = clamp(toInt(rule.minSelections, 0), 0, MAX_MIN_SELECTIONS);
  let max = clamp(toInt(rule.maxSelections, 1), 1, MAX_MAX_SELECTIONS);
  let isRequired = rule.isRequired;
  if (changed === "isRequired") min = isRequired ? Math.max(min, 1) : 0;
  else if (changed === "minSelections") isRequired = min > 0;
  else isRequired = min > 0; // đổi max không đổi cờ, nhưng vẫn giữ hai chiều đúng nếu đầu vào lệch
  if (max < min) max = min;
  return { isRequired, minSelections: min, maxSelections: max };
}

/** Trường của riêng một nhóm (không có tuỳ chọn) — thứ BE nhận ở `POST/PATCH option-groups` (`menu.dto.ts:236-284`). */
export type GroupFields = Pick<OptionGroupInput, "name" | "code" | "isRequired" | "minSelections" | "maxSelections" | "displayOrder">;

/** Trường của riêng một tuỳ chọn — thứ BE nhận ở `POST/PATCH …/options` (`menu.dto.ts:295-335`); `isDefault` BE chưa có (#15), chỉ mock nhận. */
export type OptionFields = { name: string; code: string; priceDelta: number; displayOrder?: number };

/** Lỗi trường của một tuỳ chọn khi tạo/sửa riêng lẻ. Rỗng = hợp lệ. */
export function validateOptionFields(fields: Partial<OptionFields>): string[] {
  const errors: string[] = [];
  if (fields.name !== undefined && !fields.name.trim()) errors.push("Tuỳ chọn cần có tên");
  if (fields.code !== undefined && !CODE_PATTERN.test(fields.code)) errors.push("Mã tuỳ chọn chỉ gồm chữ hoa, số, gạch dưới hoặc gạch ngang, tối đa 50 ký tự");
  if (fields.priceDelta !== undefined && (!Number.isInteger(fields.priceDelta) || fields.priceDelta < 0 || fields.priceDelta > MAX_PRICE)) {
    errors.push("Giá cộng thêm phải là số nguyên đồng, từ 0 trở lên");
  }
  if (fields.displayOrder !== undefined && (!Number.isInteger(fields.displayOrder) || fields.displayOrder < 0 || fields.displayOrder > MAX_DISPLAY_ORDER)) {
    errors.push(`Thứ tự hiển thị phải là số nguyên từ 0 đến ${MAX_DISPLAY_ORDER}`);
  }
  return errors;
}

/** Lỗi trường của một nhóm khi tạo/sửa riêng lẻ (chưa xét tuỳ chọn). Rỗng = hợp lệ. */
export function validateGroupFields(input: GroupFields): string[] {
  const errors: string[] = [];
  if (!input.name.trim()) errors.push("Nhóm cần có tên");
  if (!CODE_PATTERN.test(input.code)) errors.push("Mã nhóm chỉ gồm chữ hoa, số, gạch dưới hoặc gạch ngang, tối đa 50 ký tự");

  const { minSelections: min, maxSelections: max } = input;
  if (!Number.isInteger(min) || !Number.isInteger(max)) errors.push("Số chọn tối thiểu và tối đa phải là số nguyên");
  else {
    if (min < 0) errors.push("Số chọn tối thiểu không được âm");
    if (min > MAX_MIN_SELECTIONS) errors.push(`Số chọn tối thiểu tối đa là ${MAX_MIN_SELECTIONS}`);
    if (max < 1) errors.push("Số chọn tối đa phải từ 1 trở lên");
    if (max > MAX_MAX_SELECTIONS) errors.push(`Số chọn tối đa tối đa là ${MAX_MAX_SELECTIONS}`);
    if (min > max) errors.push("Số chọn tối thiểu không được lớn hơn số chọn tối đa");
    // BE (`menu.service.ts:589`): `isRequired` đúng khi và chỉ khi `min > 0` — hai chiều.
    if (input.isRequired && min < 1) errors.push("Nhóm bắt buộc phải có số chọn tối thiểu từ 1 trở lên");
    if (!input.isRequired && min > 0) errors.push("Nhóm không bắt buộc phải có số chọn tối thiểu bằng 0");
  }
  if (input.displayOrder !== undefined && (!Number.isInteger(input.displayOrder) || input.displayOrder < 0 || input.displayOrder > MAX_DISPLAY_ORDER)) {
    errors.push(`Thứ tự hiển thị phải là số nguyên từ 0 đến ${MAX_DISPLAY_ORDER}`);
  }
  return errors;
}

/**
 * Lỗi khi SỬA TỪNG PHẦN một nhóm. Ba trường luật chọn (`isRequired`, `min`, `max`) phải đi cùng nhau — web luôn gửi cả bộ đã qua
 * `syncSelectionRule`, không dựa vào cách BE tự suy phần thiếu (`menu.service.ts:187-205`).
 */
export function validateGroupPatch(patch: Partial<GroupFields>): string[] {
  const rule = [patch.isRequired, patch.minSelections, patch.maxSelections];
  const given = rule.filter((v) => v !== undefined).length;
  if (given > 0 && given < 3) return ["Luật chọn (bắt buộc, tối thiểu, tối đa) phải được sửa cùng lúc"];
  const errors = validateGroupFields({
    name: patch.name ?? "x",
    code: patch.code ?? "X",
    isRequired: patch.isRequired ?? false,
    minSelections: patch.minSelections ?? 0,
    maxSelections: patch.maxSelections ?? 1,
    displayOrder: patch.displayOrder,
  });
  return errors;
}

/** Lỗi nhập một nhóm (kèm tuỳ chọn). Rỗng = hợp lệ. Thứ tự lỗi ổn định để hiện cho người dùng. */
export function validateGroupInput(input: OptionGroupInput): string[] {
  const errors = validateGroupFields(input);
  const { minSelections: min, maxSelections: max } = input;

  if (input.options.length === 0) errors.push("Nhóm cần ít nhất một tuỳ chọn");
  const codes = new Set<string>();
  input.options.forEach((o, i) => {
    const label = o.name.trim() ? `"${o.name.trim()}"` : `thứ ${i + 1}`;
    if (!o.name.trim()) errors.push(`Tuỳ chọn ${label} cần có tên`);
    if (!CODE_PATTERN.test(o.code)) errors.push(`Mã của tuỳ chọn ${label} không hợp lệ (chữ hoa, số, _ hoặc -, tối đa 50 ký tự)`);
    else if (codes.has(o.code)) errors.push(`Mã "${o.code}" bị trùng trong nhóm`);
    codes.add(o.code);
    if (typeof o.priceDelta !== "number" || !Number.isInteger(o.priceDelta) || o.priceDelta < 0 || o.priceDelta > MAX_PRICE) {
      errors.push(`Giá cộng thêm của tuỳ chọn ${label} phải là số nguyên đồng, từ 0 trở lên`);
    }
    if (o.isDefault && !o.isActive) errors.push(`Tuỳ chọn mặc định ${label} phải đang bật kinh doanh`);
  });

  if (Number.isInteger(max) && input.options.filter((o) => o.isDefault).length > max) {
    errors.push("Số tuỳ chọn mặc định không được vượt quá số chọn tối đa");
  }
  // Một nhóm bắt buộc phải thoả được: cần đủ tuỳ chọn đang bật để chọn tối thiểu. Mặc định thì KHÔNG bắt buộc (đặc tả 12.2: Size bắt buộc, không mặc định).
  if (Number.isInteger(min) && input.isRequired && input.options.filter((o) => o.isActive).length < min) {
    errors.push("Số tuỳ chọn đang bật ít hơn số chọn tối thiểu — nhóm bắt buộc sẽ không chọn đủ được");
  }
  return errors;
}

/** Lựa chọn của một nhóm: danh sách id tuỳ chọn. */
export type GroupSelection = { groupId: string; optionIds: string[] };

/** Lỗi khi một lựa chọn vi phạm quy tắc của nhóm (BR-14). Rỗng = được thêm vào giỏ. */
export function validateSelection(group: OptionGroup, optionIds: string[]): string[] {
  const errors: string[] = [];
  const unique = new Set(optionIds);
  if (unique.size !== optionIds.length) errors.push(`${group.name}: không chọn trùng một tuỳ chọn`);
  for (const id of unique) {
    const option = group.options.find((o) => o.id === id);
    if (!option) errors.push(`${group.name}: tuỳ chọn không thuộc nhóm`);
    else if (!option.isActive) errors.push(`${group.name}: "${option.name}" đã ngừng kinh doanh`);
  }
  const count = unique.size;
  if (group.isRequired && count < Math.max(1, group.minSelections)) {
    errors.push(`${group.name}: chọn ít nhất ${Math.max(1, group.minSelections)}`);
  } else if (count < group.minSelections) {
    errors.push(`${group.name}: chọn ít nhất ${group.minSelections}`);
  }
  if (count > group.maxSelections) errors.push(`${group.name}: chọn tối đa ${group.maxSelections}`);
  return errors;
}

/** Lựa chọn khởi đầu khi mở bảng tuỳ chọn: các tuỳ chọn mặc định đang bật, cắt theo số tối đa. */
export function defaultSelection(group: OptionGroup): string[] {
  return group.options.filter((o) => o.isDefault && o.isActive).slice(0, group.maxSelections).map((o) => o.id);
}

/** Giá một ly = giá món + giá cộng thêm mọi tuỳ chọn đã chọn (đặc tả 12.3). Chỉ tính tuỳ chọn có thật trong nhóm. */
export function unitPrice(itemPrice: number, groups: OptionGroup[], selections: GroupSelection[]): number {
  let total = itemPrice;
  for (const s of selections) {
    const group = groups.find((g) => g.id === s.groupId);
    if (!group) continue;
    for (const id of new Set(s.optionIds)) total += group.options.find((o) => o.id === id)?.priceDelta ?? 0;
  }
  return total;
}

/** Chọn/bỏ chọn một tuỳ chọn theo quy tắc nhóm: nhóm chọn 1 thì thay thế; nhóm chọn nhiều thì chặn khi đã đủ tối đa. */
export function toggleOption(group: OptionGroup, current: string[], optionId: string): string[] {
  const option = group.options.find((o) => o.id === optionId);
  if (!option || !option.isActive) return current;
  if (current.includes(optionId)) {
    // Nhóm bắt buộc chọn đúng 1 không cho bỏ chọn về trống: phải chuyển sang tuỳ chọn khác.
    return group.maxSelections === 1 && group.isRequired ? current : current.filter((id) => id !== optionId);
  }
  if (group.maxSelections === 1) return [optionId];
  if (current.length >= group.maxSelections) return current;
  return [...current, optionId];
}
