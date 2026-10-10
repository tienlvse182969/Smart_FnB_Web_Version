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
  "manager_report",
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
  branding: "real",
  account: "real",
  stations: "real",
  order: "real",
  manager_report: "real",
  ai: "mock",
  admin: "real",
  payos: "real",
};

/** Ghi chú cho bảng cờ: vì sao module đang ở chế độ đó. */
export const FLAG_NOTES: Record<ApiModule, string> = {
  auth: "real; đổi mật khẩu chờ BE (chưa có endpoint cho người đã đăng nhập)",
  branch: "real",
  report: "real; BE chưa đếm đơn quầy (lọc COMPLETED) — chờ BE",
  plan: "real (#38, BE de4f55c): trạng thái, hạn dùng, hạn mức, cờ nhận diện/so sánh; cấp gói và cờ AI suy từ mã gói (#30)",
  menu: "real (danh mục + món + gán chi nhánh, giai đoạn 4.2); tuỳ chọn món ở module options (real từ 6.3)",
  options: "real (OW-03): CRUD nhóm/tuỳ chọn, mặc định, xem trạng thái theo chi nhánh và gắn nhóm vào món; cần deploy BE và migration mới",
  branch_options: "real (5.7c): Manager bật/tắt tuỳ chọn tại chi nhánh qua GET/PATCH /manager/menu-options; chi nhánh lấy từ JWT",
  branding: "real (6.4, OW-07): GET/PUT/DELETE restaurant-chains/{id}/branding + POST …/branding/logo (multipart); BE chưa có isCustom/version (#39) và chưa chặn theo gói (#33) nên web tự suy và tự khoá; mock = VITE_API_BRANDING=mock",
  account: "real MỘT PHẦN (5.3): Manager qua /employees (list, khoá, đặt lại mật khẩu, chuyển chi nhánh); tạo Manager chờ BE #23; Cashier/Barista là mock chờ BE #24",
  stations: "real (5.5): GET/POST /stations; đổi tên, ngừng dùng, sửa máy in chờ BE (#27); ghép/thu hồi thiết bị ở 5.6",
  order: "real (7.1, BM-04): GET /manager/orders (luôn type=COUNTER_PICKUP) và /manager/orders/:id; real (7.4, BM-05): POST /payments/:id/confirm (xác nhận chuyển khoản thủ công); huỷ đơn đã trả chờ BE (#43); mock = VITE_API_ORDER=mock",
  manager_report: "real (7.3, BM-03): GET /manager/reports (từ/đến theo ngày giờ Việt Nam, kỳ ngày/tuần/tháng, top 10), chỉ đọc; tách khỏi `report` của Owner (/reports/*); mock = VITE_API_MANAGER_REPORT=mock",
  ai: "mock — BE chưa có (OW-09), chờ giai đoạn 9",
  admin: "real (hồ sơ + doanh nghiệp, giai đoạn 3.2); gói và nộp hồ sơ công khai còn chờ BE (xem api-contract-plan.md)",
  payos: "real (6.5, đủ #40 từ 6.10): GET/PUT/DELETE /restaurant-chains/:id/payos-channel; PUT xác minh với PayOS, cần PAYOS_MASTER_KEY và PAYOS_WEBHOOK_BASE_URL trên BE",
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

/**
 * Cờ TÍNH NĂNG của màn công khai (không phải module API; quyết định 91–92). Mặc định TẮT: route không đăng ký nên đường dẫn ra như route
 * lạ (về trang chủ), không còn link nào trỏ tới. Bật bằng `VITE_FEATURE_<TÊN>=true` ở dòng lệnh/CI. Mã của nhóm vẫn nguyên, chỉ không nối vào router.
 */
export interface RouteFlags {
  /** `/t/:token` — trang theo dõi đơn công khai ("thẻ rung ảo"); nhóm tạm hoãn 08–10/10. Env: `VITE_FEATURE_ORDER_TRACKING`. */
  orderTracking: boolean;
  /** `/display/customer` — màn hình phía khách bản web; đặc tả giao FE-M (repo mobile backscreen). Env: `VITE_FEATURE_WEB_CUSTOMER_DISPLAY`. */
  webCustomerDisplay: boolean;
}

export function resolveRouteFlags(env: Env): RouteFlags {
  const on = (name: string) => env[name]?.trim().toLowerCase() === "true";
  return {
    orderTracking: on("VITE_FEATURE_ORDER_TRACKING"),
    webCustomerDisplay: on("VITE_FEATURE_WEB_CUSTOMER_DISPLAY"),
  };
}

export const ROUTE_FLAGS: RouteFlags = resolveRouteFlags(import.meta.env as unknown as Env);

let printed = false;

/** In bảng cờ ra console, đúng một lần, chỉ khi chạy `vite dev`. */
export function printFlagTable(): void {
  if (printed || !import.meta.env.DEV) return;
  printed = true;
  console.groupCollapsed("[api] cờ module (real|mock)");
  console.table(flagTable());
  console.groupEnd();
}
