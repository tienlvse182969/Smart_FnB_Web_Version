/** Kiểu dữ liệu xác thực và phân quyền. */

/** Vai trò người dùng trong hệ thống. */
export type RoleKey = "admin" | "owner" | "manager" | "waiter" | "kitchen";

/** Mật khẩu mặc định cấp cho tài khoản mới/reset — demo, plaintext. */
export const DEFAULT_PASSWORD = "demo1234";

/**
 * Một tài khoản đăng nhập được — seed sẵn (demo ban đầu) hoặc tạo qua
 * onboarding/cấp tài khoản (Admin duyệt hồ sơ, Owner tạo Manager, Manager
 * tạo Waiter/Kitchen). Không còn giới hạn "một tài khoản mỗi vai trò".
 */
export type DemoAccount = {
  id: string;
  role: RoleKey;
  name: string;
  email: string;
  /** Mật khẩu — plaintext vì đây là mock demo, không phải hệ thống xác thực thật. */
  password: string;
  /** true = bắt đổi mật khẩu ở lần đăng nhập kế tiếp (CM-01). */
  mustChangePassword: boolean;
  /** false = đã bị khoá, không đăng nhập được. */
  active: boolean;
  label: string;
  scope: string;
  /** tenantId nếu không phải admin */
  tenantId?: string;
  /** branchId nếu là manager/waiter/kitchen */
  branchId?: string;
};

/** Người dùng đã đăng nhập — gắn tenant/branch context. */
export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: RoleKey;
  tenantId: string | null; // null chỉ cho admin nền tảng
  branchId: string | null; // null cho admin + owner
  /** true = phải đổi mật khẩu trước khi dùng hệ thống (CM-01). */
  mustChangePassword: boolean;
  /** True when Waiter/Kitchen data comes from the backend API. */
  apiBacked?: boolean;
};
