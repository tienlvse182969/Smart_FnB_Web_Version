/**
 * Bộ nhớ chung của các bản mock. Dữ liệu được SINH LẦN ĐẦU khi gặp một chainId/branchId (kể cả ID thật
 * của backend), rồi giữ trong bộ nhớ — nên mock chạy được cạnh các module real mà không cần lớp ánh xạ ID.
 * Khoá theo (doanh nghiệp mock, chainId) để đổi doanh nghiệp mock thì dữ liệu sinh lại từ đầu.
 */
import type {
  AiQueryLog,
  BranchOptionState,
  Branding,
  DemoAccount,
  MenuCategory,
  MenuItem,
  Order,
  OptionGroup,
} from "../../types";
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
      branchOptions: new Map(),
      branding: buildBranding(profile, chainId),
      accounts: [],
      orders: new Map(),
      aiLogs: [],
      staffSeeded: new Set(),
    };
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
      items: s.menuItems,
      groups: s.optionGroups,
      now: new Date(),
    });
    s.orders.set(branchId, list);
  }
  return list;
}
