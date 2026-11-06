/** Bản REAL của module combos — BE `combos.controller.ts`. Thân chỉ gồm trường có trong DTO (BE bật `forbidNonWhitelisted`). */
import { ApiError } from "../../http/errors";
import { request } from "../../http/client";
import { mapCombo, type RawCombo } from "./mapper";
import { comboProblems } from "./rules";
import type { ComboComponent, ComboInput } from "../../../types";
import type { CombosApi } from "./index";

const base = (chainId: string) => `/restaurant-chains/${chainId}/combos`;

function assertValid(problems: string[]): void {
  if (problems.length) throw new ApiError(400, problems[0], problems);
}

/** Thành phần cố định lấy tên của món ở nơi gọi; ở đây chỉ chuẩn hoá thân gửi đi. */
const componentBody = (component: ComboComponent, index: number) => ({
  type: component.type,
  name: component.name.trim(),
  quantity: component.quantity,
  fixedSizeCode: component.fixedSizeCode,
  displayOrder: index,
  choices: component.choices.map((c) => ({ menuItemId: c.menuItemId, surcharge: c.surcharge, isDefault: c.isDefault })),
});

/** Kiểm riêng phần có trong lần sửa: thành phần luôn kiểm; tên/giá/danh mục chỉ khi có gửi. */
function componentsOnlyProblems(patch: Partial<ComboInput>): string[] {
  const all = comboProblems({ name: patch.name ?? "-", categoryId: patch.categoryId ?? "-", price: patch.price ?? 0, components: patch.components ?? [], description: patch.description, imageUrl: patch.imageUrl });
  return all;
}

function body(input: Partial<ComboInput>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (input.categoryId !== undefined) out.categoryId = input.categoryId;
  if (input.name !== undefined) out.name = input.name.trim();
  if (input.description !== undefined) out.description = input.description?.trim() ? input.description.trim() : null;
  // Web không đặt ảnh combo (BE chưa có API tải ảnh): chỉ gửi imageUrl nếu nơi gọi truyền.
  if (input.imageUrl !== undefined) out.imageUrl = input.imageUrl?.trim() ? input.imageUrl.trim() : null;
  if (input.price !== undefined) out.price = input.price;
  if (input.isActive !== undefined) out.isActive = input.isActive;
  if (input.components !== undefined) out.components = input.components.map(componentBody);
  return out;
}

export const combosReal: CombosApi = {
  async listCombos(chainId) {
    return (await request<RawCombo[]>(base(chainId))).map(mapCombo);
  },

  async createCombo(chainId, input) {
    assertValid(comboProblems(input));
    return mapCombo(await request<RawCombo>(base(chainId), { method: "POST", body: body(input) }));
  },

  async updateCombo(chainId, id, patch) {
    // Chỉ kiểm khi có đủ trường để kiểm; trường vắng giữ nguyên ở BE.
    if (patch.components) assertValid(componentsOnlyProblems(patch));
    return mapCombo(await request<RawCombo>(`${base(chainId)}/${id}`, { method: "PATCH", body: body(patch) }));
  },

  async deleteCombo(chainId, id) {
    await request<unknown>(`${base(chainId)}/${id}`, { method: "DELETE" });
  },

  async setComboBranches(chainId, id, branchIds) {
    await request<unknown>(`${base(chainId)}/${id}/branches`, { method: "PUT", body: { branchIds } });
  },
};
