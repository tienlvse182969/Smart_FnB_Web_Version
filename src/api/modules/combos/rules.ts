/**
 * Quy tắc combo (BR-77, BR-78) cùng ngưỡng với BE (`combos.dto.ts`, `validateCombo` trong `combos.service.ts`) — MỘT nguồn cho form, real và mock.
 * Các hàm thuần, có test ở `combos.test.ts`.
 */
import type { Combo, ComboComponent, ComboInput, MenuItem } from "../../../types";

export const MAX_COMBO_NAME = 150;
export const MAX_COMBO_DESCRIPTION = 2000;
export const MAX_COMBO_IMAGE_URL = 500;
export const MAX_COMPONENT_NAME = 100;
export const MIN_COMPONENTS = 2;
export const MAX_COMPONENTS = 6;
export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 5;
export const MIN_VARIANTS = 2;
export const MAX_VARIANTS = 10;
export const MAX_COMBO_PRICE = 99_999_999_999;

const wholeVnd = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_COMBO_PRICE;

/** Mọi lỗi của một thành phần (rỗng = hợp lệ). `label` để nêu vị trí, ví dụ "Thành phần 2". */
export function componentProblems(component: ComboComponent, label: string): string[] {
  const out: string[] = [];
  if (component.type === "CHOICE" && !component.name.trim()) out.push(`${label}: nhập tên nhóm`);
  if (component.name.length > MAX_COMPONENT_NAME) out.push(`${label}: tên tối đa ${MAX_COMPONENT_NAME} ký tự`);
  if (!Number.isInteger(component.quantity) || component.quantity < MIN_QUANTITY || component.quantity > MAX_QUANTITY) {
    out.push(`${label}: số lượng từ ${MIN_QUANTITY} đến ${MAX_QUANTITY}`);
  }
  const { choices } = component;
  if (component.type === "FIXED" && choices.length !== 1) out.push(`${label}: món cố định cần đúng 1 món`);
  if (component.type === "CHOICE" && (choices.length < MIN_VARIANTS || choices.length > MAX_VARIANTS)) {
    out.push(`${label}: nhóm biến thể cần từ ${MIN_VARIANTS} đến ${MAX_VARIANTS} món`);
  }
  if (choices.some((c) => !c.menuItemId)) out.push(`${label}: chọn món cho mọi dòng`);
  const ids = choices.map((c) => c.menuItemId).filter(Boolean);
  if (new Set(ids).size !== ids.length) out.push(`${label}: một món chỉ xuất hiện một lần trong nhóm`);
  if (choices.filter((c) => c.isDefault).length !== 1) out.push(`${label}: chọn đúng 1 món mặc định`);
  if (choices.some((c) => !wholeVnd(c.surcharge))) out.push(`${label}: phụ thu là số nguyên đồng, từ 0 trở lên`);
  return out;
}

/** Mọi lỗi của combo (rỗng = hợp lệ). Combo không chứa combo khác: thành phần chỉ chọn được món lẻ (BR-77). */
export function comboProblems(input: Pick<ComboInput, "name" | "categoryId" | "price" | "components"> & { description?: string | null; imageUrl?: string | null }): string[] {
  const out: string[] = [];
  const name = input.name.trim();
  if (!name) out.push("Nhập tên combo");
  if (name.length > MAX_COMBO_NAME) out.push(`Tên combo tối đa ${MAX_COMBO_NAME} ký tự`);
  if (!input.categoryId) out.push("Chọn danh mục hiển thị trên POS");
  if (!wholeVnd(input.price)) out.push("Giá combo là số nguyên đồng, từ 0 trở lên");
  if ((input.description?.length ?? 0) > MAX_COMBO_DESCRIPTION) out.push(`Mô tả tối đa ${MAX_COMBO_DESCRIPTION} ký tự`);
  if ((input.imageUrl?.length ?? 0) > MAX_COMBO_IMAGE_URL) out.push(`Địa chỉ ảnh tối đa ${MAX_COMBO_IMAGE_URL} ký tự`);
  if (input.components.length < MIN_COMPONENTS || input.components.length > MAX_COMPONENTS) {
    out.push(`Combo cần từ ${MIN_COMPONENTS} đến ${MAX_COMPONENTS} thành phần`);
  }
  input.components.forEach((component, index) => out.push(...componentProblems(component, `Thành phần ${index + 1}`)));
  return out;
}

/** Món mặc định của thành phần, hoặc undefined nếu chưa chọn. */
const defaultChoice = (component: ComboComponent) => component.choices.find((c) => c.isDefault);

/**
 * Giá mua lẻ theo giá chuỗi (mục 26.2): Σ số lượng × (giá món mặc định + phụ thu của món mặc định). Món chưa chọn/không tìm thấy bỏ qua.
 * Chỉ để hiển thị so sánh với giá combo, không chặn lưu.
 */
export function retailTotal(components: ComboComponent[], priceOf: (menuItemId: string) => number | undefined): number {
  return components.reduce((sum, component) => {
    const choice = defaultChoice(component);
    const price = choice ? priceOf(choice.menuItemId) : undefined;
    return choice && price !== undefined ? sum + component.quantity * (price + choice.surcharge) : sum;
  }, 0);
}

/** Món thành phần đang tắt cấp chuỗi (cảnh báo cạnh thành phần). Trả tên món, theo thứ tự thành phần. */
export function disabledChoiceItems(component: ComboComponent, items: Pick<MenuItem, "id" | "name" | "isActive">[]): string[] {
  return component.choices.flatMap((choice) => {
    const item = items.find((x) => x.id === choice.menuItemId);
    return item && !item.isActive ? [item.name] : [];
  });
}

/**
 * BR-78: combo không hiện trên POS ở chi nhánh nếu món cố định chưa được gán cho chi nhánh, hoặc nhóm biến thể chưa có món nào được gán.
 * Trả danh sách lý do (rỗng = bán được ở chi nhánh về mặt gán món).
 */
export function branchGapReasons(
  components: ComboComponent[],
  items: Pick<MenuItem, "id" | "name" | "branches">[],
  branchId: string,
): string[] {
  const assigned = (menuItemId: string) =>
    items.find((x) => x.id === menuItemId)?.branches.some((b) => b.branchId === branchId && b.isEnabled) ?? false;
  const nameOf = (menuItemId: string) => items.find((x) => x.id === menuItemId)?.name ?? "món đã bị xoá";
  const out: string[] = [];
  for (const component of components) {
    if (component.type === "FIXED") {
      const choice = component.choices[0];
      if (choice && !assigned(choice.menuItemId)) out.push(`chưa gán món "${nameOf(choice.menuItemId)}"`);
    } else if (!component.choices.some((c) => assigned(c.menuItemId))) {
      out.push(`nhóm "${component.name}" chưa có món nào được gán`);
    }
  }
  return out;
}

/** Mã size dùng chung cho mọi món của thành phần: giao các tập size của từng món. Món chưa biết size (chưa nạp) được bỏ qua. */
export function commonSizeCodes(sizesByItem: Map<string, { code: string; name: string }[]>, menuItemIds: string[]): { code: string; name: string }[] {
  const lists = menuItemIds.map((id) => sizesByItem.get(id)).filter((x): x is { code: string; name: string }[] => !!x);
  if (lists.length === 0) return [];
  const [first, ...rest] = lists;
  return first.filter((size) => rest.every((list) => list.some((x) => x.code === size.code)));
}

/** Tóm tắt một combo cho danh sách. */
export const componentCount = (combo: Pick<Combo, "components">): number => combo.components.length;
