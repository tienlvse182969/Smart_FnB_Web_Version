/** Bản real của module auth — đăng nhập thật qua backend NestJS (api/v1/auth/*). */
import type { AuthContext, AuthUser, BackendRole, RoleKey } from "../../../types";
import {
  ApiError,
  clearTokens,
  getRefreshToken,
  refreshForRestore,
  request,
  setTokens,
} from "../../http/client";
import { SETUP_TOKEN_INVALID, SETUP_TOKEN_MESSAGE, type AuthApi } from "./index";

interface BackendAuthUser {
  id: string;
  email: string;
  phone: string | null;
  status: string;
  role: BackendRole;
  employee: { id: string; employeeCode: string; branchId: string; firstName: string; lastName: string } | null;
  owner: { id: string; ownerCode: string; firstName: string; lastName: string } | null;
}

interface BackendAuthResult {
  user: BackendAuthUser;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

/** Vai trò backend → khu vực làm việc trên web. Thiếu ở đây = không vào được web. */
const WEB_ROLE_BY_BACKEND: Partial<Record<BackendRole, RoleKey>> = {
  ADMIN: "admin",
  OWNER: "owner",
  MANAGER: "manager",
};

/** Hai vai trò vận hành của v9, chỉ dùng ứng dụng tablet. */
const TABLET_ONLY_ROLES: BackendRole[] = ["CASHIER", "BARISTA"];

export const TABLET_ONLY_MESSAGE = "Vui lòng sử dụng ứng dụng tablet";

/** Vai trò backend còn trả về nhưng không thuộc đặc tả v9 (WAITER, KITCHEN). */
export const NO_WEB_ACCESS_MESSAGE = "Tài khoản này không có quyền truy cập trang quản trị";

/** Thông báo chặn khi vai trò không được vào web; null nếu được vào. */
function webAccessBlock(role: BackendRole): string | null {
  if (WEB_ROLE_BY_BACKEND[role]) return null;
  return TABLET_ONLY_ROLES.includes(role) ? TABLET_ONLY_MESSAGE : NO_WEB_ACCESS_MESSAGE;
}

function displayName(user: BackendAuthUser): string {
  const person = user.owner ?? user.employee;
  if (person) return `${person.firstName} ${person.lastName}`.trim();
  return user.email;
}

function toAuthUser(user: BackendAuthUser): AuthUser {
  const role = WEB_ROLE_BY_BACKEND[user.role];
  if (!role) throw new ApiError(403, webAccessBlock(user.role) ?? NO_WEB_ACCESS_MESSAGE);

  return {
    id: user.id,
    name: displayName(user),
    email: user.email,
    // Phạm vi thật được nạp riêng sau đăng nhập (store#loadScope) vì payload
    // auth của backend không chứa chainId/branchId.
    role,
    tenantId: null,
    branchId: null,
    // Không có cờ "phải đổi mật khẩu": BE đặt mật khẩu qua /auth/setup-password (token trong email); login và /auth/me không trả cờ nào.
  };
}

/**
 * Đăng nhập bằng email + mật khẩu.
 *
 * Cashier/Barista (và vai trò v7 còn sót ở backend) bị chặn: thu hồi luôn phiên
 * vừa tạo ở backend và không lưu token nào ở client.
 */
async function loginWithPassword(email: string, password: string): Promise<AuthUser> {
  const result = await request<BackendAuthResult>("/auth/login", {
    method: "POST",
    body: { email: email.trim().toLowerCase(), password },
    anonymous: true,
  });

  const blocked = webAccessBlock(result.user.role);
  if (blocked) {
    await revokeSession(result.refreshToken);
    throw new ApiError(403, blocked);
  }

  const user = toAuthUser(result.user);
  setTokens(result.accessToken, result.refreshToken);
  return user;
}

/**
 * Khôi phục phiên sau khi tải lại trang. Trả null khi không còn phiên hợp lệ.
 * Dùng refresh token để lấy luôn cặp token mới, nên access token cũ hết hạn
 * cũng không làm văng người dùng ra.
 */
async function restoreSession(): Promise<AuthUser | null> {
  if (!getRefreshToken()) return null;

  try {
    // Dưới khoá refresh liên tab: hai tab F5 cùng lúc không đá nhau ra (backend xoay vòng refresh token).
    const result = await refreshForRestore<BackendAuthResult>();

    if (webAccessBlock(result.user.role)) {
      await revokeSession(result.refreshToken);
      return null;
    }

    const user = toAuthUser(result.user);
    setTokens(result.accessToken, result.refreshToken);
    return user;
  } catch {
    clearTokens();
    return null;
  }
}

async function revokeSession(refreshToken: string): Promise<void> {
  try {
    await request("/auth/logout", {
      method: "POST",
      body: { refreshToken },
      anonymous: true,
    });
  } catch {
    // Phiên hết hạn hoặc mạng lỗi — client vẫn phải xoá token của mình.
  }
}

function getAuthContext(): Promise<AuthContext> {
  return request<AuthContext>("/auth/me");
}

/** Đăng xuất: thu hồi phiên ở backend rồi xoá token phía client. */
async function logoutSession(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (refreshToken) await revokeSession(refreshToken);
  clearTokens();
}

export const authReal: AuthApi = {
  login: loginWithPassword,
  restoreSession,
  getContext: getAuthContext,
  logout: logoutSession,
  // CHỜ BE: chỉ có /auth/setup-password (cần token một lần trong email). Chưa có endpoint đổi mật khẩu
  // cho người đã đăng nhập.
  async changePassword() {
    throw new ApiError(501, "Đổi mật khẩu chưa được backend hỗ trợ.");
  },
  async setupPassword(token, password) {
    try {
      await request<{ message: string }>("/auth/setup-password", { method: "POST", body: { token, password }, anonymous: true });
    } catch (err) {
      // BE trả 401 cho token sai/hết hạn/đã dùng; 401 ở web nghĩa là hết phiên nên đổi sang mã riêng.
      if (err instanceof ApiError && err.status === 401) throw new ApiError(400, SETUP_TOKEN_MESSAGE, [], SETUP_TOKEN_INVALID);
      throw err;
    }
  },
};
