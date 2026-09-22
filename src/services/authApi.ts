/**
 * Đăng nhập thật qua backend NestJS (api/v1/auth/*).
 *
 * Tách khỏi `auth.service.ts` — file đó vẫn giữ các thao tác quản trị tài khoản
 * chạy trên mock (tạo/khoá/reset tài khoản) và chưa có API tương ứng.
 */
import type { AuthUser, RoleKey } from "../types";
import {
  clearTokens,
  getRefreshToken,
  request,
  setTokens,
  ApiError,
} from "./http";

/** Tên vai trò do backend trả về. */
type BackendRole = "ADMIN" | "OWNER" | "MANAGER" | "WAITER" | "KITCHEN" | "CASHIER";

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

/** Hai vai trò đã chuyển hẳn sang ứng dụng tablet. */
const TABLET_ONLY_ROLES: BackendRole[] = ["WAITER", "KITCHEN"];

export const TABLET_ONLY_MESSAGE = "Vui lòng sử dụng ứng dụng tablet";

function displayName(user: BackendAuthUser): string {
  const person = user.owner ?? user.employee;
  if (person) return `${person.firstName} ${person.lastName}`.trim();
  return user.email;
}

function toAuthUser(user: BackendAuthUser): AuthUser {
  const role = WEB_ROLE_BY_BACKEND[user.role];
  if (!role) throw new ApiError(403, TABLET_ONLY_MESSAGE);

  return {
    id: user.id,
    name: displayName(user),
    email: user.email,
    // Phạm vi thật được nạp riêng sau đăng nhập (store#loadScope) vì payload
    // auth của backend không chứa chainId/branchId.
    role,
    tenantId: null,
    branchId: null,
    // Backend đặt mật khẩu qua luồng riêng (/auth/setup-password), không có
    // cờ "phải đổi mật khẩu" ở lần đăng nhập thường.
    mustChangePassword: false,
  };
}

/**
 * Đăng nhập bằng email + mật khẩu.
 *
 * Waiter/Kitchen bị chặn: thu hồi luôn phiên vừa tạo ở backend và không lưu
 * token nào ở client.
 */
export async function loginWithPassword(email: string, password: string): Promise<AuthUser> {
  const result = await request<BackendAuthResult>("/auth/login", {
    method: "POST",
    body: { email: email.trim().toLowerCase(), password },
    anonymous: true,
  });

  if (TABLET_ONLY_ROLES.includes(result.user.role)) {
    await revokeSession(result.refreshToken);
    throw new ApiError(403, TABLET_ONLY_MESSAGE);
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
export async function restoreSession(): Promise<AuthUser | null> {
  if (!getRefreshToken()) return null;

  try {
    const result = await request<BackendAuthResult>("/auth/refresh", {
      method: "POST",
      body: { refreshToken: getRefreshToken() },
      anonymous: true,
    });

    if (TABLET_ONLY_ROLES.includes(result.user.role)) {
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

/** Đăng xuất: thu hồi phiên ở backend rồi xoá token phía client. */
export async function logoutSession(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (refreshToken) await revokeSession(refreshToken);
  clearTokens();
}
