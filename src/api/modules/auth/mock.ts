/**
 * Bản mock của module auth. Tài khoản mock thuộc hai doanh nghiệp mock; đăng nhập bằng tài khoản của
 * doanh nghiệp nào thì kịch bản mock chuyển sang doanh nghiệp đó.
 */
import type { AuthContext, AuthUser, RoleKey } from "../../../types";
import { clearTokens, getRefreshToken, setTokens } from "../../http/client";
import { ApiError } from "../../http/errors";
import { mockDelay } from "../../mock/control";
import { MOCK_PROFILES, type MockProfile } from "../../mock/data/profiles";
import { setScenario } from "../../mock/scenario";
import { failedPasswordRules } from "./passwordRules";
import { NO_WEB_ACCESS_MESSAGE, SETUP_TOKEN_INVALID, SETUP_TOKEN_MESSAGE, TABLET_ONLY_MESSAGE, type AuthApi } from "./index";

/** Mật khẩu chung của mọi tài khoản mock — chỉ có ý nghĩa khi cờ auth = mock. */
export const MOCK_PASSWORD = "mock1234";

const SESSION_KEY = "fnb.mock.session";

interface MockAccount {
  id: string;
  email: string;
  name: string;
  roleKey: RoleKey;
  profile: MockProfile | null;
  /** Chỉ số chi nhánh trong hồ sơ (manager). */
  branchIndex?: number;
}

function allAccounts(): MockAccount[] {
  const list: MockAccount[] = [
    { id: "mock-admin", email: "admin@mock.local", name: "Platform Admin", roleKey: "admin", profile: null },
    { id: "mock-cashier-a", email: "cashier.a@mock.local", name: "Thu ngân", roleKey: "cashier", profile: MOCK_PROFILES.A },
  ];
  for (const profile of Object.values(MOCK_PROFILES)) {
    for (const acc of profile.accounts) {
      list.push({
        id: `mock-${acc.role}-${profile.id.toLowerCase()}`,
        email: acc.email,
        name: acc.name,
        roleKey: acc.role,
        profile,
        branchIndex: acc.branchIndex,
      });
    }
  }
  return list;
}

function toUser(acc: MockAccount): AuthUser {
  return {
    id: acc.id,
    name: acc.name,
    email: acc.email,
    role: acc.roleKey,
    tenantId: null,
    branchId: null,
  };
}

function readSession(): MockAccount | null {
  try {
    const email = localStorage.getItem(SESSION_KEY);
    return email ? (allAccounts().find((a) => a.email === email) ?? null) : null;
  } catch {
    return null;
  }
}

function webBlock(acc: MockAccount): string | null {
  if (acc.roleKey === "cashier" || acc.roleKey === "barista") return TABLET_ONLY_MESSAGE;
  return acc.roleKey === "admin" || acc.roleKey === "owner" || acc.roleKey === "manager" ? null : NO_WEB_ACCESS_MESSAGE;
}

export const authMock: AuthApi = {
  async login(email, password) {
    await mockDelay();
    const acc = allAccounts().find((a) => a.email === email.trim().toLowerCase());
    if (!acc || password !== MOCK_PASSWORD) throw new ApiError(401, "Email hoặc mật khẩu không đúng.");
    const block = webBlock(acc);
    if (block) throw new ApiError(403, block);
    if (acc.profile) setScenario({ profile: acc.profile.id });
    setTokens("mock-access-token", "mock-refresh-token");
    try {
      localStorage.setItem(SESSION_KEY, acc.email);
    } catch {
      // ignore
    }
    return toUser(acc);
  },

  async restoreSession() {
    await mockDelay();
    const acc = getRefreshToken() ? readSession() : null;
    if (!acc) return null;
    if (acc.profile) setScenario({ profile: acc.profile.id });
    return toUser(acc);
  },

  async getContext(): Promise<AuthContext> {
    await mockDelay();
    const acc = readSession();
    if (!acc) throw new ApiError(401, "Phiên đăng nhập đã hết hạn.");
    const profile = acc.profile;
    const branch = profile && acc.roleKey === "manager" ? profile.branches[acc.branchIndex ?? 0] : null;
    return {
      id: acc.id,
      email: acc.email,
      phone: null,
      role: acc.roleKey === "admin" ? "ADMIN" : acc.roleKey === "owner" ? "OWNER" : "MANAGER",
      sessionId: "mock-session",
      employeeId: branch ? acc.id : null,
      ownerId: acc.roleKey === "owner" ? acc.id : null,
      branchId: branch?.id ?? null,
      chainId: branch && profile ? profile.chainId : null,
      chainIds: acc.roleKey === "owner" && profile ? [profile.chainId] : [],
    };
  },

  async logout() {
    await mockDelay();
    clearTokens();
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
  },

  async changePassword(newPassword) {
    await mockDelay();
    if (newPassword.trim().length < 6) throw new ApiError(400, "Mật khẩu phải từ 6 ký tự trở lên");
  },

  /** Token thử: `mock-valid` đặt được (dùng 1 lần); `mock-expired`, `mock-used` và mọi token khác bị từ chối như BE (không phân biệt lý do). */
  async setupPassword(token, password) {
    await mockDelay();
    const failed = failedPasswordRules(password);
    if (failed.length) throw new ApiError(400, `password: ${failed.map((r) => r.label).join("; ")}`, failed.map((r) => r.label));
    if (token !== "mock-valid" || consumedTokens.has(token)) throw new ApiError(400, SETUP_TOKEN_MESSAGE, [], SETUP_TOKEN_INVALID);
    consumedTokens.add(token);
  },
};

/** Token mock đã dùng (một lần, như `usedAt` của BE). Mất khi tải lại trang. */
const consumedTokens = new Set<string>();
