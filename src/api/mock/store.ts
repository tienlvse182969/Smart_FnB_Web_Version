/**
 * Bộ nhớ chung của các bản mock. Dữ liệu được SINH LẦN ĐẦU khi gặp một chainId/branchId (kể cả ID thật
 * của backend), rồi giữ trong bộ nhớ — nên mock chạy được cạnh các module real mà không cần lớp ánh xạ ID.
 * Khoá theo (doanh nghiệp mock, chainId) để đổi doanh nghiệp mock thì dữ liệu sinh lại từ đầu.
 */
import type {
  AiQueryLog,
  BranchMenuItem,
  BranchOptionState,
  Branding,
  DemoAccount,
  MenuItem,
  Order,
  OptionGroup,
} from "../../types";
import { generateBranchOrders } from "./data/orders";
import {
  buildBranchMenu,
  buildBranding,
  buildMenu,
  buildOptionGroups,
  profileOf,
  type MockProfile,
} from "./data/profiles";
import { hashString } from "./prng";
import { getScenario } from "./scenario";

export interface ChainState {
  chainId: string;
  profile: MockProfile;
  menuItems: MenuItem[];
  optionGroups: OptionGroup[];
  branchMenu: Map<string, BranchMenuItem[]>;
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
      menuItems: buildMenu(profile, chainId),
      optionGroups: buildOptionGroups(profile, chainId),
      branchMenu: new Map(),
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

export function getBranchMenu(chainId: string, branchId: string): BranchMenuItem[] {
  const s = getChainState(chainId);
  let list = s.branchMenu.get(branchId);
  if (!list) {
    list = buildBranchMenu(branchId, s.menuItems);
    s.branchMenu.set(branchId, list);
  }
  return list;
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
