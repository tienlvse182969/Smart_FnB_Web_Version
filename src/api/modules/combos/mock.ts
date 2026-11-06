/** Mock của module combos: bộ nhớ trong trình duyệt, cùng luật và mã lỗi với BE (400 sai quy tắc, 404, chi nhánh ngoài chuỗi). */
import type { Combo } from "../../../types";
import { ApiError } from "../../http/errors";
import { mockDelay } from "../../mock/control";
import { assertMockWritable } from "../../mock/guards";
import { genId } from "../../mock/util";
import { comboProblems } from "./rules";
import type { CombosApi } from "./index";

const chains = new Map<string, Combo[]>();

export function resetCombosMock(): void {
  chains.clear();
}

const listOf = (chainId: string): Combo[] => {
  let list = chains.get(chainId);
  if (!list) {
    list = [];
    chains.set(chainId, list);
  }
  return list;
};

const copy = (combo: Combo): Combo => structuredClone(combo);

const fail = (problems: string[]): void => {
  if (problems.length) throw new ApiError(400, problems[0], problems);
};

export const combosMock: CombosApi = {
  async listCombos(chainId) {
    await mockDelay();
    return listOf(chainId).map(copy);
  },

  async createCombo(chainId, input) {
    await mockDelay();
    assertMockWritable();
    fail(comboProblems(input));
    const created: Combo = {
      id: genId("combo"),
      categoryId: input.categoryId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      imageUrl: input.imageUrl?.trim() || null,
      price: input.price,
      isActive: input.isActive ?? true,
      displayOrder: 0,
      components: structuredClone(input.components),
      branchIds: [],
    };
    listOf(chainId).push(created);
    return copy(created);
  },

  async updateCombo(chainId, id, patch) {
    await mockDelay();
    assertMockWritable();
    const list = listOf(chainId);
    const index = list.findIndex((c) => c.id === id);
    if (index < 0) throw new ApiError(404, "Combo not found in this chain");
    const merged = { ...list[index], ...patch, components: patch.components ?? list[index].components } as Combo;
    fail(comboProblems(merged));
    list[index] = {
      ...merged,
      name: merged.name.trim(),
      description: patch.description !== undefined ? patch.description?.trim() || null : list[index].description,
      imageUrl: patch.imageUrl !== undefined ? patch.imageUrl?.trim() || null : list[index].imageUrl,
      components: structuredClone(merged.components),
    };
    return copy(list[index]);
  },

  async deleteCombo(chainId, id) {
    await mockDelay();
    assertMockWritable();
    const list = listOf(chainId);
    const index = list.findIndex((c) => c.id === id);
    if (index < 0) throw new ApiError(404, "Combo not found");
    list.splice(index, 1);
  },

  async setComboBranches(chainId, id, branchIds) {
    await mockDelay();
    assertMockWritable();
    if (new Set(branchIds).size !== branchIds.length) throw new ApiError(400, "Duplicate branch");
    const combo = listOf(chainId).find((c) => c.id === id);
    if (!combo) throw new ApiError(404, "Combo not found");
    combo.branchIds = [...branchIds];
  },
};
