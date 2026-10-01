/**
 * In-memory "database" — mutable arrays cho các entity còn chạy bằng mock.
 * Chỉ import file này trong src/mock/seed.ts và src/services/*.
 * Component KHÔNG import trực tiếp.
 *
 * Đã gỡ thực thể v7 (bàn, phiên bàn, đơn waiter/kitchen, thanh toán theo
 * phiên, ví/sổ cái/quyết toán/rút tiền, ca làm, cấu hình quyết toán, audit log).
 */
import type {
  Plan,
  Tenant,
  Branding,
  RegistrationRequest,
  Branch,
  MenuItem,
  BranchMenuItem,
  AiQueryLog,
  DemoAccount,
} from "../types";

/* ---- Demo accounts ---- */
export let demoAccounts: DemoAccount[] = [];

/* ---- Plans ---- */
export let plans: Plan[] = [];

/* ---- Tenants ---- */
export let tenants: Tenant[] = [];
export let brandings: Branding[] = [];
export let registrationRequests: RegistrationRequest[] = [];

/* ---- Branches ---- */
export let branches: Branch[] = [];

/* ---- Menu ---- */
export let menuItems: MenuItem[] = [];
export let branchMenuItems: BranchMenuItem[] = [];

/* ---- AI ---- */
export let aiQueryLogs: AiQueryLog[] = [];

/* ---- Staff legacy (roster nhân sự chi nhánh) ---- */
export type StaffLegacy = {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  email: string;
  role: "Manager" | "Waiter" | "Kitchen";
  active: boolean;
};
export let staffLegacy: StaffLegacy[] = [];

/**
 * Singleton db object — dùng để truyền reference vào seed và service.
 * Mọi thay đổi qua db.xxx = [...] đều reflect ra ngoài.
 */
export const db = {
  get demoAccounts() { return demoAccounts; },
  set demoAccounts(v) { demoAccounts = v; },

  get plans() { return plans; },
  set plans(v) { plans = v; },

  get tenants() { return tenants; },
  set tenants(v) { tenants = v; },

  get brandings() { return brandings; },
  set brandings(v) { brandings = v; },

  get registrationRequests() { return registrationRequests; },
  set registrationRequests(v) { registrationRequests = v; },

  get branches() { return branches; },
  set branches(v) { branches = v; },

  get menuItems() { return menuItems; },
  set menuItems(v) { menuItems = v; },

  get branchMenuItems() { return branchMenuItems; },
  set branchMenuItems(v) { branchMenuItems = v; },

  get aiQueryLogs() { return aiQueryLogs; },
  set aiQueryLogs(v) { aiQueryLogs = v; },

  get staffLegacy() { return staffLegacy; },
  set staffLegacy(v) { staffLegacy = v; },
};
