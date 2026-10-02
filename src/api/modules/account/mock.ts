import type { AccountStatus, DemoAccount, ManagerAccount, PasswordSetupNotice, StaffMember } from "../../../types";
import { ApiError } from "../../http/errors";
import { mockDelay } from "../../mock/control";
import { assertMockWritable } from "../../mock/guards";
import { hashString } from "../../mock/prng";
import { getChainState } from "../../mock/store";
import { genId } from "../../mock/util";
import { branchApi } from "../branch";
import type { AccountApi } from "./index";

const MANAGER_NAMES = ["Lê Thị Hồng", "Ngô Gia Bảo", "Đỗ Minh Tâm", "Vũ Thanh Hà"];
const STAFF_NAMES = ["Nguyễn Văn Tú", "Phạm Thu Hà", "Võ Hoàng Nam", "Đặng Mỹ Linh", "Bùi Anh Khoa", "Trịnh Quốc Bảo"];

const mailOf = (name: string, branchId: string) =>
  `${name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/\s+/g, ".")}.${branchId.slice(-3)}@mock.local`;

function account(
  chainId: string,
  branchId: string,
  role: DemoAccount["role"],
  label: string,
  name: string,
): DemoAccount {
  return {
    id: genId("mock-acc"),
    role,
    name,
    email: mailOf(name, branchId),
    awaitingPasswordSetup: false,
    active: true,
    label,
    scope: branchId,
    tenantId: chainId,
    branchId,
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
}

async function seedChain(chainId: string): Promise<void> {
  const branches = await branchApi.listBranches(chainId);
  for (const b of branches) seedBranch(chainId, b.id);
}

/** Hiệu lực link đặt mật khẩu: 24 giờ như BE (employees.service.ts, PASSWORD_SETUP_TTL_MS). */
const setupNotice = (): PasswordSetupNotice => ({ expiresAt: new Date(Date.now() + 24 * 3_600_000).toISOString() });

const ROLE_LABEL: Record<string, StaffMember["role"]> = { manager: "Manager", cashier: "Cashier", barista: "Barista" };

const toStaff = (a: DemoAccount): StaffMember => ({
  id: a.id,
  tenantId: a.tenantId ?? "",
  branchId: a.branchId ?? "",
  name: a.name,
  email: a.email,
  role: ROLE_LABEL[a.role] ?? "Cashier",
  active: a.active,
});

function findAccount(accountId: string): DemoAccount {
  // Tìm qua mọi trạng thái chuỗi đang giữ — id tài khoản là duy nhất.
  for (const chainId of knownChains) {
    const hit = getChainState(chainId).accounts.find((a) => a.id === accountId);
    if (hit) return hit;
  }
  throw new ApiError(404, "Tài khoản không tồn tại");
}

const knownChains = new Set<string>();
const track = (chainId: string) => {
  knownChains.add(chainId);
  return chainId;
};

/** Trạng thái như BE: khoá = SUSPENDED; mới tạo chưa đặt mật khẩu = INACTIVE (đổi mật khẩu thì reset không đổi trạng thái). */
const statusOf = (a: DemoAccount): AccountStatus => (!a.active ? "SUSPENDED" : a.awaitingPasswordSetup ? "INACTIVE" : "ACTIVE");

async function toManager(chainId: string, a: DemoAccount): Promise<ManagerAccount> {
  const branches = await branchApi.listBranches(chainId);
  return {
    id: a.id,
    employeeCode: `MGR-${a.id.slice(-4).toUpperCase()}`,
    name: a.name,
    email: a.email,
    status: statusOf(a),
    lastLoginAt: null,
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
        employeeCode: `${a.role === "cashier" ? "CSH" : "BRS"}-${a.id.slice(-4).toUpperCase()}`,
        name: a.name,
        email: a.email,
        status: statusOf(a),
        branchId: a.branchId ?? "",
        branchName: branches.find((b) => b.id === a.branchId)?.name ?? "—",
        role: a.role === "cashier" ? ("Cashier" as const) : ("Barista" as const),
      }));
  },

  async listStaff(chainId, branchId) {
    await mockDelay();
    track(chainId);
    seedBranch(chainId, branchId);
    return getChainState(chainId).accounts.filter((a) => a.branchId === branchId).map(toStaff);
  },

  async createManager(chainId, branchId, name, email) {
    await mockDelay();
    assertMockWritable();
    track(chainId);
    seedBranch(chainId, branchId);
    const created = { ...account(chainId, branchId, "manager", "Branch Manager", name), email, awaitingPasswordSetup: true };
    getChainState(chainId).accounts.push(created);
    return { account: await toManager(chainId, created), ...setupNotice() };
  },

  async createStaff(chainId, branchId, name, email, role) {
    await mockDelay();
    assertMockWritable();
    track(chainId);
    seedBranch(chainId, branchId);
    const created = {
      ...account(chainId, branchId, role === "Cashier" ? "cashier" : "barista", role, name),
      email,
      awaitingPasswordSetup: true,
    };
    getChainState(chainId).accounts.push(created);
    return { staff: toStaff(created), ...setupNotice() };
  },

  async setManagerActive(accountId, active) {
    await mockDelay();
    assertMockWritable();
    findAccount(accountId).active = active;
  },

  async setStaffActive(accountId, active) {
    await mockDelay();
    assertMockWritable();
    findAccount(accountId).active = active;
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
  },

  async countAccounts(chainId) {
    await mockDelay();
    await seedChain(track(chainId));
    // +1: tài khoản Owner (tính vào hạn mức — mục 13.1).
    return getChainState(chainId).accounts.filter((a) => a.active).length + 1;
  },
};
