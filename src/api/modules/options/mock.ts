import type { OptionGroup, OptionGroupInput } from "../../../types";
import { ApiError } from "../../http/errors";
import { mockDelay } from "../../mock/control";
import { assertMockWritable } from "../../mock/guards";
import { getBranchOptions, getChainState, type ChainState } from "../../mock/store";
import { genId } from "../../mock/util";
import type { OptionsApi } from "./index";
import { savePersistedOptions } from "./persist";
import { validateGroupInput } from "./rules";

const sorted = (groups: OptionGroup[]): OptionGroup[] =>
  [...groups]
    .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name))
    .map((g) => ({ ...g, options: [...g.options].sort((a, b) => a.displayOrder - b.displayOrder).map((o) => ({ ...o })) }));

/** Ghi bản chụp tuỳ chọn của chuỗi (khi cờ options = mock). */
function persist(state: ChainState): void {
  savePersistedOptions(state.chainId, { groups: state.optionGroups, itemOptions: [...state.itemOptions.values()] });
}

function groupOf(state: ChainState, id: string): OptionGroup {
  const g = state.optionGroups.find((x) => x.id === id);
  if (!g) throw new ApiError(404, "Nhóm tuỳ chọn không tồn tại");
  return g;
}

/** Cùng quy tắc với form: gọi vòng qua form vẫn nhận lỗi 400; mã nhóm trùng trong chuỗi → 409. */
function check(state: ChainState, input: OptionGroupInput, selfId?: string): void {
  const errors = validateGroupInput(input);
  if (errors.length) throw new ApiError(400, errors[0], errors);
  if (state.optionGroups.some((g) => g.id !== selfId && g.code === input.code)) {
    throw new ApiError(409, `Mã nhóm "${input.code}" đã được dùng trong chuỗi`);
  }
}

function build(id: string, input: OptionGroupInput, displayOrder: number, previous?: OptionGroup): OptionGroup {
  return {
    id,
    name: input.name.trim(),
    code: input.code,
    isRequired: input.isRequired,
    minSelections: input.minSelections,
    maxSelections: input.maxSelections,
    displayOrder,
    isActive: previous?.isActive ?? true,
    options: input.options.map((o, i) => ({
      id: o.id && previous?.options.some((p) => p.id === o.id) ? o.id : genId("mock-op"),
      name: o.name.trim(),
      code: o.code,
      priceDelta: o.priceDelta,
      displayOrder: i + 1,
      isActive: o.isActive,
      isDefault: o.isDefault,
    })),
  };
}

export const optionsMock: OptionsApi = {
  async listGroups(chainId) {
    await mockDelay();
    return sorted(getChainState(chainId).optionGroups);
  },

  async createGroup(chainId, input) {
    await mockDelay();
    assertMockWritable();
    const s = getChainState(chainId);
    check(s, input);
    const next = Math.max(0, ...s.optionGroups.map((g) => g.displayOrder)) + 1;
    const group = build(genId("mock-og"), input, next);
    s.optionGroups.push(group);
    persist(s);
    return sorted([group])[0];
  },

  async updateGroup(chainId, id, input) {
    await mockDelay();
    assertMockWritable();
    const s = getChainState(chainId);
    const old = groupOf(s, id);
    check(s, input, id);
    const group = build(id, input, old.displayOrder, old);
    s.optionGroups[s.optionGroups.indexOf(old)] = group;
    persist(s);
    return sorted([group])[0];
  },

  async deleteGroup(chainId, id) {
    await mockDelay();
    assertMockWritable();
    const s = getChainState(chainId);
    groupOf(s, id);
    s.optionGroups = s.optionGroups.filter((g) => g.id !== id);
    for (const cfg of s.itemOptions.values()) cfg.groupIds = cfg.groupIds.filter((g) => g !== id);
    persist(s);
  },

  async reorderGroups(chainId, orderedIds) {
    await mockDelay();
    assertMockWritable();
    const s = getChainState(chainId);
    orderedIds.forEach((gid, i) => {
      groupOf(s, gid).displayOrder = i + 1;
    });
    persist(s);
  },

  async setOptionActive(chainId, groupId, optionId, isActive) {
    await mockDelay();
    assertMockWritable();
    const s = getChainState(chainId);
    const g = groupOf(s, groupId);
    const o = g.options.find((x) => x.id === optionId);
    if (!o) throw new ApiError(404, "Tuỳ chọn không tồn tại");
    // Đặc tả không nói tắt tuỳ chọn mặc định thì sao → không âm thầm bỏ cờ: từ chối, buộc bỏ mặc định tường minh qua `updateGroup`.
    if (!isActive && o.isDefault) {
      throw new ApiError(400, `Tuỳ chọn mặc định "${o.name}" phải đang bật kinh doanh — bỏ mặc định của nhóm "${g.name}" trước khi tắt`);
    }
    o.isActive = isActive;
    persist(s);
    return sorted([g])[0];
  },

  async listItemConfigs(chainId) {
    await mockDelay();
    return [...getChainState(chainId).itemOptions.values()].map((c) => ({ ...c, groupIds: [...c.groupIds] }));
  },

  async setItemConfig(chainId, config) {
    await mockDelay();
    assertMockWritable();
    const s = getChainState(chainId);
    // Không kiểm tra món tồn tại: món là ID THẬT của BE (menu=real), mock không có bảng món đó.
    for (const gid of config.groupIds) groupOf(s, gid);
    if (new Set(config.groupIds).size !== config.groupIds.length) throw new ApiError(400, "Một nhóm không được gắn hai lần cho một món");
    const saved = { menuItemId: config.menuItemId, groupIds: [...config.groupIds], noBatch: config.noBatch };
    s.itemOptions.set(config.menuItemId, saved);
    persist(s);
    return { ...saved, groupIds: [...saved.groupIds] };
  },

  async listBranchStates(chainId, branchId) {
    await mockDelay();
    return getBranchOptions(chainId, branchId).map((r) => ({ ...r }));
  },
};
