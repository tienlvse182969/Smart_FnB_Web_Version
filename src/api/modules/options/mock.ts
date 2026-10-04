import type { OptionGroup, OptionItem } from "../../../types";
import { ApiError } from "../../http/errors";
import { mockDelay } from "../../mock/control";
import { assertMockWritable } from "../../mock/guards";
import { getBranchOptions, getChainState, type ChainState } from "../../mock/store";
import { genId } from "../../mock/util";
import type { OptionsApi } from "./index";
import { savePersistedOptions } from "./persist";
import { validateGroupFields, validateGroupPatch, validateOptionFields } from "./rules";

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

const throw400 = (errors: string[]): void => {
  if (errors.length) throw new ApiError(400, errors[0], errors);
};

function optionOf(group: OptionGroup, optionId: string): OptionItem {
  const o = group.options.find((x) => x.id === optionId);
  if (!o) throw new ApiError(404, "Tuỳ chọn không tồn tại");
  return o;
}

const sortedGroup = (g: OptionGroup): OptionGroup => sorted([g])[0];

export const optionsMock: OptionsApi = {
  capabilities: { isDefault: true, allowBatching: true, branchStates: true },

  async listGroups(chainId) {
    await mockDelay();
    return sorted(getChainState(chainId).optionGroups);
  },

  // --- giao diện theo từng thao tác (giống BE): mỗi hàm một thay đổi, cùng luật với real ---

  async listItemGroups(chainId, itemId) {
    await mockDelay();
    const s = getChainState(chainId);
    const ids = s.itemOptions.get(itemId)?.groupIds ?? [];
    return ids.flatMap((id) => {
      const g = s.optionGroups.find((x) => x.id === id);
      return g ? [sortedGroup(g)] : [];
    });
  },

  async addGroup(chainId, fields) {
    await mockDelay();
    assertMockWritable();
    const s = getChainState(chainId);
    throw400(validateGroupFields(fields));
    if (s.optionGroups.some((g) => g.code === fields.code)) throw new ApiError(409, `Mã nhóm "${fields.code}" đã được dùng trong chuỗi`);
    const group: OptionGroup = {
      id: genId("mock-og"),
      name: fields.name.trim(),
      code: fields.code,
      isRequired: fields.isRequired,
      minSelections: fields.minSelections,
      maxSelections: fields.maxSelections,
      displayOrder: fields.displayOrder ?? Math.max(0, ...s.optionGroups.map((g) => g.displayOrder)) + 1,
      isActive: true,
      options: [],
    };
    s.optionGroups.push(group);
    persist(s);
    return sortedGroup(group);
  },

  async patchGroup(chainId, groupId, patch) {
    await mockDelay();
    assertMockWritable();
    const s = getChainState(chainId);
    const g = groupOf(s, groupId);
    throw400(validateGroupPatch(patch));
    if (patch.code !== undefined && s.optionGroups.some((x) => x.id !== groupId && x.code === patch.code)) {
      throw new ApiError(409, `Mã nhóm "${patch.code}" đã được dùng trong chuỗi`);
    }
    const max = patch.maxSelections ?? g.maxSelections;
    if (g.options.filter((o) => o.isDefault).length > max) throw new ApiError(400, "Số tuỳ chọn mặc định không được vượt quá số chọn tối đa");
    Object.assign(g, {
      ...(patch.name !== undefined && { name: patch.name.trim() }),
      ...(patch.code !== undefined && { code: patch.code }),
      ...(patch.isRequired !== undefined && { isRequired: patch.isRequired, minSelections: patch.minSelections, maxSelections: patch.maxSelections }),
      ...(patch.displayOrder !== undefined && { displayOrder: patch.displayOrder }),
      ...(patch.isActive !== undefined && { isActive: patch.isActive }),
    });
    persist(s);
    return sortedGroup(g);
  },

  async removeGroup(chainId, groupId) {
    await mockDelay();
    assertMockWritable();
    const s = getChainState(chainId);
    groupOf(s, groupId);
    s.optionGroups = s.optionGroups.filter((g) => g.id !== groupId);
    for (const cfg of s.itemOptions.values()) cfg.groupIds = cfg.groupIds.filter((id) => id !== groupId);
    persist(s);
  },

  async addOption(chainId, groupId, fields) {
    await mockDelay();
    assertMockWritable();
    const s = getChainState(chainId);
    const g = groupOf(s, groupId);
    throw400(validateOptionFields(fields));
    if (g.options.some((o) => o.code === fields.code)) throw new ApiError(409, `Mã "${fields.code}" bị trùng trong nhóm`);
    const option: OptionItem = {
      id: genId("mock-op"),
      name: fields.name.trim(),
      code: fields.code,
      priceDelta: fields.priceDelta,
      displayOrder: fields.displayOrder ?? Math.max(0, ...g.options.map((o) => o.displayOrder)) + 1,
      isActive: true,
      isDefault: false,
    };
    g.options.push(option);
    persist(s);
    return { ...option };
  },

  async patchOption(chainId, groupId, optionId, patch) {
    await mockDelay();
    assertMockWritable();
    const s = getChainState(chainId);
    const g = groupOf(s, groupId);
    const o = optionOf(g, optionId);
    throw400(validateOptionFields(patch));
    if (patch.code !== undefined && g.options.some((x) => x.id !== optionId && x.code === patch.code)) {
      throw new ApiError(409, `Mã "${patch.code}" bị trùng trong nhóm`);
    }
    const isActive = patch.isActive ?? o.isActive;
    const isDefault = patch.isDefault ?? o.isDefault ?? false;
    // Đặc tả không nói tắt tuỳ chọn mặc định thì sao → không âm thầm bỏ cờ: từ chối, buộc bỏ mặc định tường minh (`patch.isDefault = false`).
    if (isDefault && !isActive) {
      throw new ApiError(400, `Tuỳ chọn mặc định "${o.name}" phải đang bật kinh doanh — bỏ mặc định của nhóm "${g.name}" trước khi tắt`);
    }
    if (isDefault && !o.isDefault && g.options.filter((x) => x.isDefault).length + 1 > g.maxSelections) {
      throw new ApiError(400, "Số tuỳ chọn mặc định không được vượt quá số chọn tối đa");
    }
    Object.assign(o, {
      ...(patch.name !== undefined && { name: patch.name.trim() }),
      ...(patch.code !== undefined && { code: patch.code }),
      ...(patch.priceDelta !== undefined && { priceDelta: patch.priceDelta }),
      ...(patch.displayOrder !== undefined && { displayOrder: patch.displayOrder }),
      isActive,
      isDefault,
    });
    persist(s);
    return { ...o };
  },

  async removeOption(chainId, groupId, optionId) {
    await mockDelay();
    assertMockWritable();
    const s = getChainState(chainId);
    const g = groupOf(s, groupId);
    optionOf(g, optionId);
    g.options = g.options.filter((o) => o.id !== optionId);
    persist(s);
  },

  async setItemGroups(chainId, itemId, groupIds) {
    await mockDelay();
    assertMockWritable();
    const s = getChainState(chainId);
    if (new Set(groupIds).size !== groupIds.length) throw new ApiError(400, "Một nhóm không được gắn hai lần cho một món");
    for (const gid of groupIds) groupOf(s, gid);
    const previous = s.itemOptions.get(itemId);
    s.itemOptions.set(itemId, { menuItemId: itemId, groupIds: [...groupIds], noBatch: previous?.noBatch ?? false });
    persist(s);
    return [...groupIds];
  },

  async setItemNoBatch(chainId, itemId, noBatch) {
    await mockDelay();
    assertMockWritable();
    const s = getChainState(chainId);
    const previous = s.itemOptions.get(itemId);
    s.itemOptions.set(itemId, { menuItemId: itemId, groupIds: previous ? [...previous.groupIds] : [], noBatch });
    persist(s);
  },

  async listItemConfigs(chainId, itemIds) {
    await mockDelay();
    const wanted = itemIds ? new Set(itemIds) : null;
    return [...getChainState(chainId).itemOptions.values()]
      .filter((c) => !wanted || wanted.has(c.menuItemId))
      .map((c) => ({ ...c, groupIds: [...c.groupIds] }));
  },

  async listBranchStates(chainId, branchId) {
    await mockDelay();
    return getBranchOptions(chainId, branchId).map((r) => ({ ...r }));
  },
};
