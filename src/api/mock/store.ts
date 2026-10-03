/**
 * Bộ nhớ chung của các bản mock. Dữ liệu được SINH LẦN ĐẦU khi gặp một chainId/branchId (kể cả ID thật
 * của backend), rồi giữ trong bộ nhớ — nên mock chạy được cạnh các module real mà không cần lớp ánh xạ ID.
 * Khoá theo (doanh nghiệp mock, chainId) để đổi doanh nghiệp mock thì dữ liệu sinh lại từ đầu.
 */
import type {
  AiQueryLog,
  BranchOptionState,
  ItemOptionConfig,
  Branding,
  DemoAccount,
  MenuCategory,
  MenuItem,
  Order,
  OptionGroup,
} from "../../types";
import { loadPersistedAccounts } from "../modules/account/persist";
import { loadPersistedBranchOptions } from "../modules/branchOptions/persist";
import { loadPersistedOptions } from "../modules/options/persist";
import { generateBranchOrders } from "./data/orders";
import {
  buildBranding,
  buildCategories,
  buildMenu,
  buildOptionGroups,
  profileOf,
  type MockProfile,
} from "./data/profiles";
import { hashString } from "./prng";
import { getScenario } from "./scenario";

/** Món lưu trong mock: như `MenuItem` nhưng `branches` được dựng lúc đọc từ `itemBranches`. */
export type StoredMenuItem = Omit<MenuItem, "branches" | "enabledBranchCount"> & {
  /** Món có sẵn từ dữ liệu mẫu: lần đầu gặp một chi nhánh thì tự được gán cho chi nhánh đó. */
  seeded?: boolean;
  /** Nhóm tuỳ chọn mẫu của món có sẵn — chỉ để khởi tạo `itemOptions`; nguồn thật là `ChainState.itemOptions`. */
  seedOptionGroupIds?: string[];
};

export interface BranchItemRow {
  isEnabled: boolean;
  isAvailable: boolean;
}

export interface ChainState {
  chainId: string;
  profile: MockProfile;
  categories: MenuCategory[];
  menuItems: StoredMenuItem[];
  /** itemId → (branchId → trạng thái). Chỉ có hàng cho chi nhánh đã từng được gán — như BE. */
  itemBranches: Map<string, Map<string, BranchItemRow>>;
  seededBranches: Set<string>;
  optionGroups: OptionGroup[];
  /** itemId (ID THẬT của BE hoặc ID mẫu) → nhóm gắn vào món + cờ không gom món. CHỜ BE (api-contract-plan #13, #17). */
  itemOptions: Map<string, ItemOptionConfig>;
  branchOptions: Map<string, BranchOptionState[]>;
  branding: Branding;
  /** Tài khoản đăng nhập được: Owner, Manager (mock). */
  accounts: DemoAccount[];
  orders: Map<string, Order[]>;
  aiLogs: AiQueryLog[];
  /** Chi nhánh đã sinh nhân sự. */
  staffSeeded: Set<string>;
}

const states = new Map<string, ChainState>();

/** Chỉ cho test: bỏ state trong bộ nhớ để mô phỏng tải lại trang. */
export function resetMockStates(): void {
  states.clear();
}

export function getChainState(chainId: string): ChainState {
  const profile = profileOf(getScenario().profile);
  const key = `${profile.id}:${chainId}`;
  let state = states.get(key);
  if (!state) {
    state = {
      chainId,
      profile,
      categories: buildCategories(profile),
      menuItems: buildMenu(profile),
      itemBranches: new Map(),
      seededBranches: new Set(),
      optionGroups: buildOptionGroups(profile, chainId),
      itemOptions: new Map(),
      branchOptions: new Map(),
      branding: buildBranding(profile, chainId),
      accounts: [],
      orders: new Map(),
      aiLogs: [],
      staffSeeded: new Set(),
    };
    for (const m of state.menuItems) {
      if (m.seedOptionGroupIds?.length) state.itemOptions.set(m.id, { menuItemId: m.id, groupIds: [...m.seedOptionGroupIds], noBatch: false });
    }
    // Mock tuỳ chọn lưu qua F5: nạp trước khi ai đó dùng state (kể cả bộ sinh đơn).
    const saved = loadPersistedOptions(chainId);
    if (saved) {
      state.optionGroups = saved.groups;
      state.itemOptions = new Map(saved.itemOptions.map((c) => [c.menuItemId, c]));
    }
    // Mock tài khoản (5.4) cũng lưu qua F5; `staffSeeded` đi kèm để không sinh nhân sự trùng.
    const savedAccounts = loadPersistedAccounts(chainId);
    if (savedAccounts) {
      state.accounts = savedAccounts.accounts;
      state.staffSeeded = new Set(savedAccounts.staffSeeded);
    }
    states.set(key, state);
  }
  return state;
}

/** Lần đầu gặp một chi nhánh: món mẫu được gán cho chi nhánh; vài món tắt "còn bán hôm nay", xác định theo (chi nhánh, món). */
export function ensureBranchRows(chainId: string, branchId: string): void {
  const s = getChainState(chainId);
  if (s.seededBranches.has(branchId)) return;
  s.seededBranches.add(branchId);
  for (const item of s.menuItems) {
    if (!item.seeded) continue;
    const rows = s.itemBranches.get(item.id) ?? new Map<string, BranchItemRow>();
    if (!rows.has(branchId)) rows.set(branchId, { isEnabled: true, isAvailable: hashString(`${branchId}:${item.id}`) % 100 >= 12 });
    s.itemBranches.set(item.id, rows);
  }
}

export function getBranchOptions(chainId: string, branchId: string): BranchOptionState[] {
  const s = getChainState(chainId);
  let list = s.branchOptions.get(branchId);
  if (!list) {
    list = s.optionGroups.flatMap((g) =>
      g.options.map((o) => ({ branchId, optionId: o.id, isAvailable: hashString(`${branchId}:${o.id}`) % 9 !== 0 })),
    );
    // Mock tuỳ chọn theo chi nhánh lưu qua F5 (5.7c): phủ cờ đã lưu lên dữ liệu sinh sẵn.
    const saved = loadPersistedBranchOptions(chainId, branchId);
    if (saved) {
      const byId = new Map(saved.map((r) => [r.optionId, r.isAvailable]));
      list = list.map((r) => (byId.has(r.optionId) ? { ...r, isAvailable: byId.get(r.optionId)! } : r));
    }
    s.branchOptions.set(branchId, list);
  }
  return list;
}

/** Đơn của một chi nhánh, sinh lần đầu. `traffic` lấy từ hồ sơ mock nếu chi nhánh trùng ID mock, nếu không = 1. */
export function getBranchOrders(chainId: string, branchId: string): Order[] {
  const s = getChainState(chainId);
  let list = s.orders.get(branchId);
  if (!list) {
    const seed = s.profile.branches.find((b) => b.id === branchId);
    list = generateBranchOrders({
      chainId,
      branchId,
      traffic: seed?.traffic ?? 0.6 + (hashString(branchId) % 80) / 100,
      items: s.menuItems.map((m) => ({ ...m, optionGroupIds: s.itemOptions.get(m.id)?.groupIds })),
      groups: s.optionGroups,
      now: new Date(),
    });
    s.orders.set(branchId, list);
  }
  return list;
}
