/**
 * Cờ theo TỪNG MODULE: `VITE_API_<MODULE>=real|mock`.
 * Mặc định: module BE đã có và web đã nối → real; còn lại → mock. In bảng ra console ở chế độ dev.
 * Đổi cờ không đòi sửa màn hình vì màn hình chỉ gọi interface của module.
 */

export const API_MODULES = [
  "auth",
  "branch",
  "report",
  "plan",
  "menu",
  "options",
  "branch_options",
  "branding",
  "account",
  "stations",
  "order",
  "ai",
  "admin",
  "payos",
] as const;

export type ApiModule = (typeof API_MODULES)[number];
export type ApiMode = "real" | "mock";

/** Mặc định theo BAN-GIAO mục 7, giới hạn giai đoạn 2: chỉ auth, branch, report (và hạn mức của plan) là real. */
export const DEFAULT_MODES: Record<ApiModule, ApiMode> = {
  auth: "real",
  branch: "real",
  report: "real",
  plan: "real",
  menu: "real",
  options: "real",
  branch_options: "real",
  branding: "mock",
  account: "real",
  stations: "real",
  order: "mock",
  ai: "mock",
  admin: "real",
  payos: "mock",
};

/** Ghi chú cho bảng cờ: vì sao module đang ở chế độ đó. */
export const FLAG_NOTES: Record<ApiModule, string> = {
  auth: "real; đổi mật khẩu chờ BE (chưa có endpoint cho người đã đăng nhập)",
  branch: "real",
  report: "real; BE chưa đếm đơn quầy (lọc COMPLETED) — chờ BE",
  plan: "real cho hạn mức; tier, cờ tính năng, hạn dùng là mock — chờ BE",
  menu: "real (danh mục + món + gán chi nhánh, giai đoạn 4.2); tuỳ chọn món ở module options (real từ 6.3)",
  options: "real (OW-03): CRUD nhóm/tuỳ chọn, mặc định, xem trạng thái theo chi nhánh và gắn nhóm vào món; cần deploy BE và migration mới",
  branch_options: "real (5.7c): Manager bật/tắt tuỳ chọn tại chi nhánh qua GET/PATCH /manager/menu-options; chi nhánh lấy từ JWT",
  branding: "mock — BE có endpoint, chờ giai đoạn 6",
  account: "real cho Owner quản Manager qua /employees (xem, mời, khoá, đặt lại mật khẩu, chuyển chi nhánh); Owner xem nhân viên thật; Manager quản nhân viên còn mock",
  stations: "real (5.5): GET/POST /stations; đổi tên, ngừng dùng, sửa máy in chờ BE (#27); ghép/thu hồi thiết bị ở 5.6",
  order: "mock — BE chưa có (BM-04..06), chờ giai đoạn 7",
  ai: "mock — BE chưa có (OW-09), chờ giai đoạn 9",
  admin: "real (hồ sơ, doanh nghiệp, gói, danh sách gói công khai và nộp hồ sơ)",
  payos: "mock — BE chưa có (OW-06), chờ giai đoạn 6",
};

type Env = Record<string, string | undefined>;

/** Đọc cờ từ env. Giá trị lạ bị bỏ qua (dùng mặc định) và cảnh báo qua `warn`. */
export function resolveModes(env: Env, warn: (msg: string) => void = () => {}): Record<ApiModule, ApiMode> {
  const out = { ...DEFAULT_MODES };
  for (const name of API_MODULES) {
    const raw = env[`VITE_API_${name.toUpperCase()}`]?.trim().toLowerCase();
    if (!raw) continue;
    if (raw === "real" || raw === "mock") out[name] = raw;
    else warn(`VITE_API_${name.toUpperCase()}="${raw}" không hợp lệ (real|mock) — dùng mặc định "${DEFAULT_MODES[name]}".`);
  }
  return out;
}

export const MODES: Record<ApiModule, ApiMode> = resolveModes(
  import.meta.env as unknown as Env,
  (msg) => console.warn(`[api] ${msg}`),
);

export function modeOf(module: ApiModule): ApiMode {
  return MODES[module];
}

/** Bảng cờ hiện tại, dạng mảng dòng — dùng để in và để test. */
export function flagTable(modes: Record<ApiModule, ApiMode> = MODES) {
  return API_MODULES.map((module) => ({
    module,
    env: `VITE_API_${module.toUpperCase()}`,
    mode: modes[module],
    note: FLAG_NOTES[module],
  }));
}

let printed = false;

/** In bảng cờ ra console, đúng một lần, chỉ khi chạy `vite dev`. */
export function printFlagTable(): void {
  if (printed || !import.meta.env.DEV) return;
  printed = true;
  console.groupCollapsed("[api] cờ module (real|mock)");
  console.table(flagTable());
  console.groupEnd();
}
