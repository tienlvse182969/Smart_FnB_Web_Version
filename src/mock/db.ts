/**
 * In-memory "database" — mutable arrays cho toàn bộ entity.
 * Chỉ import file này trong src/mock/seed.ts và src/services/*.
 * Component KHÔNG import trực tiếp.
 */
import type {
  Plan,
  Tenant,
  Branding,
  RegistrationRequest,
  PlatformConfig,
  Branch,
  FloorTable,
  MenuItem,
  BranchMenuItem,
  TableSession,
  Order,
  OrderLine,
  ServeTask,
  SoldOutAlert,
  Payment,
  LedgerEntry,
  SettlementBatch,
  WithdrawalRequest,
  PayoutAccount,
  ShiftTemplate,
  ShiftAssignment,
  WorkSession,
  AiQueryLog,
  DemoAccount,
  AuthUser,
} from "../types";

/* ---- Cấu hình nền tảng ---- */
export let platformConfig: PlatformConfig = {
  feePercent: 2.5,
  holdHours: 24,
  minWithdraw: 500_000,
};

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
export let floorTables: FloorTable[] = [];

/* ---- Menu ---- */
export let menuItems: MenuItem[] = [];
export let branchMenuItems: BranchMenuItem[] = [];

/* ---- Sessions / Orders ---- */
export let tableSessions: TableSession[] = [];
export let orders: Order[] = [];
export let orderLines: OrderLine[] = [];
export let serveTasks: ServeTask[] = [];
export let soldOutAlerts: SoldOutAlert[] = [];

/* ---- Payments ---- */
export let payments: Payment[] = [];

/* ---- Wallet ---- */
export let ledgerEntries: LedgerEntry[] = [];
export let settlementBatches: SettlementBatch[] = [];
export let withdrawalRequests: WithdrawalRequest[] = [];
export let payoutAccounts: PayoutAccount[] = [];

/* ---- Shifts ---- */
export let shiftTemplates: ShiftTemplate[] = [];
export let shiftAssignments: ShiftAssignment[] = [];
export let workSessions: WorkSession[] = [];

/* ---- AI ---- */
export let aiQueryLogs: AiQueryLog[] = [];

/* ---- Staff legacy (cho các màn dùng data.ts cũ) ---- */
export type StaffLegacy = {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  email: string;
  role: "Manager" | "Waiter" | "Kitchen";
  onShift: boolean;
  active: boolean;
};
export let staffLegacy: StaffLegacy[] = [];

/* ---- Audit log legacy ---- */
export type AuditEntryLegacy = {
  id: string;
  tenantId: string | null;
  time: string;
  actor: string;
  action: string;
  target: string;
};
export let auditLog: AuditEntryLegacy[] = [];

/**
 * Singleton db object — dùng để truyền reference vào seed và service.
 * Mọi thay đổi qua db.xxx = [...] đều reflect ra ngoài.
 */
export const db = {
  get platformConfig() { return platformConfig; },
  set platformConfig(v) { platformConfig = v; },

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

  get floorTables() { return floorTables; },
  set floorTables(v) { floorTables = v; },

  get menuItems() { return menuItems; },
  set menuItems(v) { menuItems = v; },

  get branchMenuItems() { return branchMenuItems; },
  set branchMenuItems(v) { branchMenuItems = v; },

  get tableSessions() { return tableSessions; },
  set tableSessions(v) { tableSessions = v; },

  get orders() { return orders; },
  set orders(v) { orders = v; },

  get orderLines() { return orderLines; },
  set orderLines(v) { orderLines = v; },

  get serveTasks() { return serveTasks; },
  set serveTasks(v) { serveTasks = v; },

  get soldOutAlerts() { return soldOutAlerts; },
  set soldOutAlerts(v) { soldOutAlerts = v; },

  get payments() { return payments; },
  set payments(v) { payments = v; },

  get ledgerEntries() { return ledgerEntries; },
  set ledgerEntries(v) { ledgerEntries = v; },

  get settlementBatches() { return settlementBatches; },
  set settlementBatches(v) { settlementBatches = v; },

  get withdrawalRequests() { return withdrawalRequests; },
  set withdrawalRequests(v) { withdrawalRequests = v; },

  get payoutAccounts() { return payoutAccounts; },
  set payoutAccounts(v) { payoutAccounts = v; },

  get shiftTemplates() { return shiftTemplates; },
  set shiftTemplates(v) { shiftTemplates = v; },

  get shiftAssignments() { return shiftAssignments; },
  set shiftAssignments(v) { shiftAssignments = v; },

  get workSessions() { return workSessions; },
  set workSessions(v) { workSessions = v; },

  get aiQueryLogs() { return aiQueryLogs; },
  set aiQueryLogs(v) { aiQueryLogs = v; },

  get staffLegacy() { return staffLegacy; },
  set staffLegacy(v) { staffLegacy = v; },

  get auditLog() { return auditLog; },
  set auditLog(v) { auditLog = v; },
};
