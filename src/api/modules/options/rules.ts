/**
 * Quy tắc tuỳ chọn món (đặc tả 12.2, BR-14, BR-15, BR-19) — thuần hàm, MỘT nguồn cho form, mock và (sau này) kiểm tra trước khi gửi BE.
 * Mock trả cùng các lỗi này khi bị gọi vòng qua form.
 */
import type { OptionGroup, OptionGroupInput } from "../../../types";
import { MAX_PRICE } from "../menu/validate";

export const CODE_PATTERN = /^[A-Z0-9_-]{1,50}$/; // CHỜ BE: giả định cùng định dạng với SKU; BE chưa công bố quy tắc `code`.

/** Lỗi nhập một nhóm (kèm tuỳ chọn). Rỗng = hợp lệ. Thứ tự lỗi ổn định để hiện cho người dùng. */
export function validateGroupInput(input: OptionGroupInput): string[] {
  const errors: string[] = [];
  if (!input.name.trim()) errors.push("Nhóm cần có tên");
  if (!CODE_PATTERN.test(input.code)) errors.push("Mã nhóm chỉ gồm chữ hoa, số, gạch dưới hoặc gạch ngang, tối đa 50 ký tự");

  const { minSelections: min, maxSelections: max } = input;
  if (!Number.isInteger(min) || !Number.isInteger(max)) errors.push("Số chọn tối thiểu và tối đa phải là số nguyên");
  else {
    if (min < 0) errors.push("Số chọn tối thiểu không được âm");
    if (max < 1) errors.push("Số chọn tối đa phải từ 1 trở lên");
    if (min > max) errors.push("Số chọn tối thiểu không được lớn hơn số chọn tối đa");
    if (input.isRequired && min < 1) errors.push("Nhóm bắt buộc phải có số chọn tối thiểu từ 1 trở lên");
  }

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
