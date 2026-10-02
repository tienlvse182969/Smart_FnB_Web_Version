import { PLAN_TIER_ORDER, type AccountStatus, type ApiPlan, type DemoAccount, type ManagerAccount, type PasswordSetupNotice, type StaffEmployee } from "../../../types";
import { ApiError } from "../../http/errors";
import { mockDelay } from "../../mock/control";
import { MOCK_PLAN_CATALOG } from "../../mock/data/plans";
import { MOCK_PROFILES } from "../../mock/data/profiles";
import { assertMockWritable } from "../../mock/guards";
import { hashString } from "../../mock/prng";
import { getChainState, type ChainState } from "../../mock/store";
import { genId } from "../../mock/util";
import { branchApi } from "../branch";
import { mockPlanBase } from "../plan/source";
import type { AccountApi } from "./index";
import { savePersistedAccounts } from "./persist";
import { splitName, validateStaffInput, validateStaffPatch } from "./staffRules";

const MANAGER_NAMES = ["Lê Thị Hồng", "Ngô Gia Bảo", "Đỗ Minh Tâm", "Vũ Thanh Hà"];
const STAFF_NAMES = ["Nguyễn Văn Tú", "Phạm Thu Hà", "Võ Hoàng Nam", "Đặng Mỹ Linh", "Bùi Anh Khoa", "Trịnh Quốc Bảo"];

const mailOf = (name: string, branchId: string) =>
  `${name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/\s+/g, ".")}.${branchId.slice(-3)}@mock.local`;

const CODE_PREFIX: Record<string, string> = { manager: "MGR", cashier: "CSH", barista: "BRS" };
const codeOf = (role: string, seed: string) => `${CODE_PREFIX[role] ?? "EMP"}-${1000 + (hashString(seed) % 9000)}`;

function account(
  chainId: string,
  branchId: string,
  role: DemoAccount["role"],
  label: string,
  name: string,
): DemoAccount {
  const email = mailOf(name, branchId);
  return {
    id: genId("mock-acc"),
    role,
    name,
    email,
    awaitingPasswordSetup: false,
    active: true,
    label,
    scope: branchId,
    tenantId: chainId,
    branchId,
    employeeCode: codeOf(role, email),
    phone: null,
    // Một phần tài khoản mẫu đã từng đăng nhập (vài giờ đến vài ngày trước), phần còn lại chưa từng.
    lastLoginAt: hashString(email) % 3 === 0 ? null : new Date(Date.now() - (1 + (hashString(email) % 70)) * 3_600_000).toISOString(),
  };
}

/** Sinh nhân sự của một chi nhánh lần đầu gặp: 1 Manager, 2 Barista, 2 Cashier. */
function seedBranch(chainId: string, branchId: string): void {
  const state = getChainState(chainId);
  if (state.staffSeeded.has(branchId)) return;
  state.staffSeeded.add(branchId);
  const h = hashString(branchId);
  state.accounts.push(
    account(chainId, branchId, "manager", "Branch Manager", MANAGER_NAMES[h % MANAGER_NAMES.length]),
    account(chainId, branchId, "barista", "Barista", STAFF_NAMES[h % STAFF_NAMES.length]),
    account(chainId, branchId, "barista", "Barista", STAFF_NAMES[(h + 1) % STAFF_NAMES.length]),
    account(chainId, branchId, "cashier", "Cashier", STAFF_NAMES[(h + 2) % STAFF_NAMES.length]),
    account(chainId, branchId, "cashier", "Cashier", STAFF_NAMES[(h + 3) % STAFF_NAMES.length]),
  );
  persist(state);
}

async function seedChain(chainId: string): Promise<void> {
  const branches = await branchApi.listBranches(chainId);
  for (const b of branches) seedBranch(chainId, b.id);
}

/** Ghi bản chụp tài khoản của chuỗi để sống qua F5 (5.4). */
function persist(state: ChainState): void {
  savePersistedAccounts(state.chainId, { accounts: state.accounts, staffSeeded: [...state.staffSeeded] });
}

/** Hiệu lực link đặt mật khẩu: 24 giờ như BE (employees.service.ts, PASSWORD_SETUP_TTL_MS). */
const setupNotice = (): PasswordSetupNotice => ({ expiresAt: new Date(Date.now() + 24 * 3_600_000).toISOString() });

function findAccount(accountId: string): DemoAccount {
  // Tìm qua mọi trạng thái chuỗi đang giữ — id tài khoản là duy nhất.
  for (const chainId of knownChains) {
    const hit = getChainState(chainId).accounts.find((a) => a.id === accountId);
    if (hit) return hit;
  }
  throw new ApiError(404, "Tài khoản không tồn tại");
}

/** Nhân viên (Cashier/Barista) của ĐÚNG chi nhánh — Manager không thấy/không đụng nhân viên chi nhánh khác (BR-02). */
function findStaffOfBranch(chainId: string, branchId: string, staffId: string): DemoAccount {
  const hit = getChainState(chainId).accounts.find((a) => a.id === staffId && a.branchId === branchId && (a.role === "cashier" || a.role === "barista"));
  if (!hit) throw new ApiError(404, "Employee not found in your branch");
  return hit;
}

const knownChains = new Set<string>();
const track = (chainId: string) => {
  knownChains.add(chainId);
  return chainId;
};

/** Trạng thái như BE: khoá = SUSPENDED; mới tạo chưa đặt mật khẩu = INACTIVE (đổi mật khẩu thì reset không đổi trạng thái). */
const statusOf = (a: DemoAccount): AccountStatus => (!a.active ? "SUSPENDED" : a.awaitingPasswordSetup ? "INACTIVE" : "ACTIVE");

const toStaffEmployee = (a: DemoAccount): StaffEmployee => ({
  id: a.id,
  employeeCode: a.employeeCode ?? codeOf(a.role, a.email),
  ...splitName(a.name),
  email: a.email,
  phone: a.phone ?? null,
  role: a.role === "cashier" ? "CASHIER" : "BARISTA",
  status: statusOf(a),
  lastLoginAt: a.lastLoginAt ?? null,
  branchId: a.branchId ?? "",
});

/**
 * Hạn mức tài khoản theo kịch bản gói. Đặc tả 13.1 ([dòng 1226](docs/Smart-FnB-Dac-ta-v9.md)): tính MỌI tài khoản đang hoạt động
 * của doanh nghiệp (Owner, Branch Manager, Cashier, Barista), tài khoản đã khoá KHÔNG tính — nên đếm cả chuỗi chứ không chỉ chi nhánh.
 */
function accountCap(): { limit: number; plan: ApiPlan; suggested: ApiPlan | null } {
  const tier = mockPlanBase().tier;
  const toApi = (code: string): ApiPlan => {
    const p = MOCK_PLAN_CATALOG.find((x) => x.code === code)!;
    return { id: `plan-${p.tier.toLowerCase()}`, code: p.code, name: p.name, description: null, monthlyPrice: String(p.monthlyPrice), maxBranches: p.maxBranches, maxAccounts: p.maxAccounts, maxTables: 0 };
  };
  const current = MOCK_PLAN_CATALOG.find((p) => p.tier === tier)!;
  const next = MOCK_PLAN_CATALOG.find((p) => p.tier === PLAN_TIER_ORDER[PLAN_TIER_ORDER.indexOf(tier) + 1]);
  return { limit: current.maxAccounts, plan: toApi(current.code), suggested: next ? toApi(next.code) : null };
}

const usedAccounts = (chainId: string): number => getChainState(chainId).accounts.filter((a) => a.active).length + 1; // +1: Owner

/** Cùng lỗi như các nơi khác của BE: 409 `PLAN_LIMIT_REACHED` kèm gói hiện tại và gói gợi ý (body như `branches.service`). */
function assertSeatAvailable(chainId: string): void {
  const { limit, plan, suggested } = accountCap();
  const used = usedAccounts(chainId);
  if (used >= limit) {
    throw new ApiError(409, `Gói ${plan.name} chỉ cho phép ${limit} tài khoản đang hoạt động (đã dùng ${used}).`, [], "PLAN_LIMIT_REACHED", {
      quota: { resource: "accounts", used, limit, remaining: 0 },
      currentPlan: plan,
      suggestedPlans: suggested ? [{ ...suggested, priceDifference: String(Number(suggested.monthlyPrice) - Number(plan.monthlyPrice)) }] : [],
    });
  }
}

/** Email là duy nhất toàn hệ thống (`User.email @unique`): chặn trùng với mọi tài khoản mock và tài khoản đăng nhập mẫu. */
function assertEmailFree(chainId: string, email: string): void {
  const needle = email.trim().toLowerCase();
  const taken =
    getChainState(chainId).accounts.some((a) => a.email.toLowerCase() === needle) ||
    Object.values(MOCK_PROFILES).some((p) => p.accounts.some((a) => a.email.toLowerCase() === needle));
  if (taken) throw new ApiError(409, "Email, phone, or employee code already exists");
}

async function toManager(chainId: string, a: DemoAccount): Promise<ManagerAccount> {
  const branches = await branchApi.listBranches(chainId);
  return {
    id: a.id,
    employeeCode: a.employeeCode ?? `MGR-${a.id.slice(-4).toUpperCase()}`,
    name: a.name,
    email: a.email,
    status: statusOf(a),
    lastLoginAt: a.lastLoginAt ?? null,
    branchId: a.branchId ?? "",
    branchName: branches.find((b) => b.id === a.branchId)?.name ?? "—",
  };
}

export const accountMock: AccountApi = {
  async listManagers(chainId, query = {}) {
    await mockDelay();
    await seedChain(track(chainId));
    const all = await Promise.all(getChainState(chainId).accounts.filter((a) => a.role === "manager").map((a) => toManager(chainId, a)));
    const needle = query.search?.trim().toLowerCase();
    const filtered = all.filter(
      (m) =>
        (!query.status || m.status === query.status) &&
        (!query.branchId || m.branchId === query.branchId) &&
        (!needle || [m.name, m.email, m.employeeCode].some((v) => v.toLowerCase().includes(needle))),
    );
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return {
      items: filtered.slice((page - 1) * limit, page * limit),
      pagination: { page, limit, total: filtered.length, totalPages: Math.max(1, Math.ceil(filtered.length / limit)) },
    };
  },

  async listStaffAccounts(chainId) {
    await mockDelay();
    await seedChain(track(chainId));
    const branches = await branchApi.listBranches(chainId);
    return getChainState(chainId)
      .accounts.filter((a) => a.role === "cashier" || a.role === "barista")
      .map((a) => ({
        id: a.id,
        employeeCode: a.employeeCode ?? codeOf(a.role, a.email),
        name: a.name,
        email: a.email,
        status: statusOf(a),
        branchId: a.branchId ?? "",
        branchName: branches.find((b) => b.id === a.branchId)?.name ?? "—",
        role: a.role === "cashier" ? ("Cashier" as const) : ("Barista" as const),
      }));
  },

  async listStaff(chainId, branchId, query = {}) {
    await mockDelay();
    track(chainId);
    seedBranch(chainId, branchId);
    const needle = query.search?.trim().toLowerCase();
    const all = getChainState(chainId)
      .accounts.filter((a) => a.branchId === branchId && (a.role === "cashier" || a.role === "barista"))
      .map(toStaffEmployee)
      .filter(
        (s) =>
          (!query.role || s.role === query.role) &&
          (!query.status || s.status === query.status) &&
          (!needle || [`${s.firstName} ${s.lastName}`, s.email, s.employeeCode, s.phone ?? ""].some((v) => v.toLowerCase().includes(needle))),
      )
      .sort((a, b) => a.firstName.localeCompare(b.firstName) || a.lastName.localeCompare(b.lastName));
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    return {
      items: all.slice((page - 1) * limit, page * limit),
      pagination: { page, limit, total: all.length, totalPages: Math.max(1, Math.ceil(all.length / limit)) },
    };
  },

  async createManager(chainId, branchId, name, email) {
    await mockDelay();
    assertMockWritable();
    track(chainId);
    seedBranch(chainId, branchId);
    const created = { ...account(chainId, branchId, "manager", "Branch Manager", name), email, awaitingPasswordSetup: true, lastLoginAt: null };
    getChainState(chainId).accounts.push(created);
    persist(getChainState(chainId));
    return { account: await toManager(chainId, created), ...setupNotice() };
  },

  async createStaff(chainId, branchId, input) {
    await mockDelay();
    assertMockWritable();
    track(chainId);
    seedBranch(chainId, branchId);
    const errors = validateStaffInput(input);
    if (errors.length) throw new ApiError(400, errors[0], errors);
    assertSeatAvailable(chainId);
    assertEmailFree(chainId, input.email);
    const role = input.role === "CASHIER" ? "cashier" : "barista";
    const name = `${input.firstName.trim()} ${input.lastName.trim()}`;
    const created: DemoAccount = {
      ...account(chainId, branchId, role, input.role === "CASHIER" ? "Cashier" : "Barista", name),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || null,
      awaitingPasswordSetup: true,
      lastLoginAt: null,
    };
    created.employeeCode = codeOf(role, created.id);
    const state = getChainState(chainId);
    state.accounts.push(created);
    persist(state);
    return { staff: toStaffEmployee(created), ...setupNotice() };
  },

  async updateStaff(chainId, branchId, staffId, patch) {
    await mockDelay();
    assertMockWritable();
    const acc = findStaffOfBranch(track(chainId), branchId, staffId);
    const errors = validateStaffPatch(patch);
    if (errors.length) throw new ApiError(400, errors[0], errors);
    if (patch.firstName !== undefined || patch.lastName !== undefined) {
      const current = splitName(acc.name);
      acc.name = `${(patch.firstName ?? current.firstName).trim()} ${(patch.lastName ?? current.lastName).trim()}`;
    }
    if (patch.phone !== undefined) acc.phone = patch.phone?.trim() || null;
    persist(getChainState(chainId));
    return toStaffEmployee(acc);
  },

  async setManagerActive(accountId, active) {
    await mockDelay();
    assertMockWritable();
    const acc = findAccount(accountId);
    acc.active = active;
    for (const chainId of knownChains) persist(getChainState(chainId));
  },

  async setStaffActive(chainId, branchId, staffId, active) {
    await mockDelay();
    assertMockWritable();
    const acc = findStaffOfBranch(track(chainId), branchId, staffId);
    // Mở khoá một tài khoản đang khoá cũng chiếm một chỗ trong hạn mức (khoá không tính, 13.1) nên bị chặn khi đã đủ.
    if (active && !acc.active) assertSeatAvailable(chainId);
    acc.active = active;
    persist(getChainState(chainId));
  },

  async resetStaffPassword(chainId, branchId, staffId) {
    await mockDelay();
    assertMockWritable();
    findStaffOfBranch(track(chainId), branchId, staffId); // 404 nếu không thuộc chi nhánh; trạng thái không đổi (như BE)
    return setupNotice();
  },

  async resetManagerPassword(accountId) {
    await mockDelay();
    assertMockWritable();
    findAccount(accountId); // 404 nếu không có; trạng thái không đổi (như BE: chỉ thu hồi phiên và xếp email)
    return setupNotice();
  },

  async reassignManager(accountId, branchId) {
    await mockDelay();
    assertMockWritable();
    const acc = findAccount(accountId);
    acc.branchId = branchId;
    acc.scope = branchId;
    for (const chainId of knownChains) persist(getChainState(chainId));
  },

  async getAccountQuota(chainId) {
    await mockDelay();
    await seedChain(track(chainId));
    return { used: usedAccounts(chainId), limit: accountCap().limit };
  },

  async countAccounts(chainId) {
    await mockDelay();
    await seedChain(track(chainId));
    // +1: tài khoản Owner (tính vào hạn mức — mục 13.1).
    return usedAccounts(chainId);
  },
};
