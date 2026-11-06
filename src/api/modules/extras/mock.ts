/** Mock của module extras: bộ nhớ trong trình duyệt, cùng luật và cùng mã lỗi với BE (409 trùng tên, 404, 400). */
import type { ItemExtras, MenuExtra } from "../../../types";
import { ApiError } from "../../http/errors";
import { mockDelay } from "../../mock/control";
import { assertMockWritable } from "../../mock/guards";
import { genId } from "../../mock/util";
import { DEFAULT_MAX_EXTRAS, validateExtra, validateItemExtras } from "./rules";
import type { ExtrasApi } from "./index";

interface ChainExtras {
  library: MenuExtra[];
  items: Map<string, ItemExtras>;
}

const chains = new Map<string, ChainExtras>();

export function resetExtrasMock(): void {
  chains.clear();
}

function stateOf(chainId: string): ChainExtras {
  let state = chains.get(chainId);
  if (!state) {
    state = { library: [], items: new Map() };
    chains.set(chainId, state);
  }
  return state;
}

const fail = (message: string | null): void => {
  if (message) throw new ApiError(400, message, [message]);
};

const nameTaken = (library: MenuExtra[], name: string, exceptId?: string) =>
  library.some((x) => x.id !== exceptId && x.name.trim().toLowerCase() === name.trim().toLowerCase());

export const extrasMock: ExtrasApi = {
  async listExtras(chainId) {
    await mockDelay();
    return [...stateOf(chainId).library].sort((a, b) => a.name.localeCompare(b.name)).map((x) => ({ ...x }));
  },

  async createExtra(chainId, input) {
    await mockDelay();
    assertMockWritable();
    fail(validateExtra(input));
    const state = stateOf(chainId);
    if (nameTaken(state.library, input.name)) throw new ApiError(409, "An extra with this name already exists");
    const created: MenuExtra = { id: genId("extra"), name: input.name.trim(), price: input.price, isActive: input.isActive ?? true };
    state.library.push(created);
    return { ...created };
  },

  async updateExtra(chainId, id, input) {
    await mockDelay();
    assertMockWritable();
    fail(validateExtra(input));
    const state = stateOf(chainId);
    const index = state.library.findIndex((x) => x.id === id);
    if (index < 0) throw new ApiError(404, "Extra not found in this chain");
    if (nameTaken(state.library, input.name, id)) throw new ApiError(409, "An extra with this name already exists");
    state.library[index] = { id, name: input.name.trim(), price: input.price, isActive: input.isActive };
    return { ...state.library[index] };
  },

  async disableExtra(chainId, id) {
    await mockDelay();
    assertMockWritable();
    const state = stateOf(chainId);
    const index = state.library.findIndex((x) => x.id === id);
    if (index < 0) throw new ApiError(404, "Extra not found in this chain");
    state.library[index] = { ...state.library[index], isActive: false };
  },

  async getItemExtras(chainId, itemId) {
    await mockDelay();
    const state = stateOf(chainId);
    const saved = state.items.get(itemId);
    if (!saved) return { menuItemId: itemId, maxExtras: DEFAULT_MAX_EXTRAS, extras: [] };
    return {
      ...saved,
      extras: saved.extras.map((link) => ({ ...link, libraryActive: state.library.find((x) => x.id === link.extraId)?.isActive ?? false })),
    };
  },

  async setItemExtras(chainId, itemId, input) {
    await mockDelay();
    assertMockWritable();
    fail(validateItemExtras(input));
    const state = stateOf(chainId);
    const links = input.extras.map((x) => {
      const extra = state.library.find((l) => l.id === x.extraId);
      if (!extra) throw new ApiError(400, "Extras must be unique and in the same chain");
      return { extraId: x.extraId, name: extra.name, libraryActive: extra.isActive, price: x.price, maxQuantity: x.maxQuantity };
    });
    state.items.set(itemId, { menuItemId: itemId, maxExtras: input.maxExtras, extras: links });
  },
};
