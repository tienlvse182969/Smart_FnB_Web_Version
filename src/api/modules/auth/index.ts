/** Module auth — phiên đăng nhập. Màn hình/store chỉ gọi `authApi`. */
import type { AuthContext, AuthUser } from "../../../types";
import { defineApi } from "../../define";
import { authMock } from "./mock";
import { authReal } from "./real";

export interface AuthApi {
  /** Đăng nhập; cashier/barista và vai trò v7 bị chặn (không vào được web). */
  login(email: string, password: string): Promise<AuthUser>;
  /** Khôi phục phiên sau F5; null nếu không còn phiên hợp lệ. */
  restoreSession(): Promise<AuthUser | null>;
  /** Phạm vi chuỗi/chi nhánh của phiên (`/auth/me`). */
  getContext(): Promise<AuthContext>;
  logout(): Promise<void>;
  /** CHỜ BE: chưa có endpoint đổi mật khẩu cho người đã đăng nhập. */
  changePassword(newPassword: string): Promise<void>;
}

export const TABLET_ONLY_MESSAGE = "Vui lòng sử dụng ứng dụng tablet";
export const NO_WEB_ACCESS_MESSAGE = "Tài khoản này không có quyền truy cập trang quản trị";

export const authApi = defineApi<AuthApi>("auth", { real: authReal, mock: authMock });
