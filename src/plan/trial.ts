/**
 * Dùng thử 14 ngày (lượt 10.2, QĐ 146–152): MỘT nguồn duy nhất cho mọi chỗ cần biết "đang dùng thử không, còn bao lâu, hết chưa".
 * Nhãn ở thanh trên, dải cảnh báo, câu báo chỉ đọc, màn Gói của tôi và bảng doanh nghiệp của Admin đều đọc từ đây; không màn nào tự tính lại.
 *
 * BE (`a403612`) chỉ trả cho Owner/Manager `{status, expiresAt, plan}`: gói dùng thử nhận diện bằng `plan.code === "TRIAL"`, KHÔNG có
 * cột `trialStartedAt` hay số ngày dùng thử, nên không có thanh tiến độ "ngày X/14" và không viết cứng số 14 ở đây.
 * Ngày tính theo LỊCH giờ Việt Nam (`expiry.ts`, QĐ 134); quá mốc hết hạn thì tính là đã hết ngay (BE chặn ghi đúng tại mốc đó).
 */
import { daysUntilExpiry } from "./expiry";
import type { PlanInfo, RoleKey } from "../types";
import type { StatusColorKey } from "../theme";

export const TRIAL_CODE = "TRIAL";

/** Còn từ ngần này ngày trở xuống thì nhãn đổi sang màu cảnh báo. */
export const TRIAL_WARNING_DAYS = 3;

export type TrialState =
  /** Không phải gói dùng thử (kể cả đã chuyển sang gói trả phí: không còn dấu vết). */
  | { kind: "none" }
  /** Còn hạn. `daysLeft` null khi không đọc được `expiresAt` (không có số ngày, không hiện "NaN"). */
  | { kind: "active"; daysLeft: number | null }
  /** Ngày cuối: còn hôm nay, chưa tới mốc hết hạn. Không bao giờ là "còn 0 ngày". */
  | { kind: "lastDay" }
  | { kind: "expired" }
  /** Gói dùng thử nhưng Admin đã tạm ngưng: thắng mọi trạng thái dùng thử, giao diện chỉ nói về tạm ngưng. */
  | { kind: "suspended" };

/** Phần tối thiểu của một gói để xét dùng thử: `PlanInfo` của Owner/Manager hay thuê bao của Admin đều đưa về dạng này. */
export interface TrialInput {
  code: string | null | undefined;
  status: "active" | "expired" | "suspended" | null | undefined;
  expiresAt: string | null | undefined;
}

export function isTrialCode(code: string | null | undefined): boolean {
  return code?.trim().toUpperCase() === TRIAL_CODE;
}

export function getTrialStateOf(input: TrialInput | null | undefined, now: number = Date.now()): TrialState {
  if (!input || !isTrialCode(input.code)) return { kind: "none" };
  if (input.status === "suspended") return { kind: "suspended" };
  if (input.status === "expired") return { kind: "expired" };

  const expiry = input.expiresAt ? Date.parse(input.expiresAt) : NaN;
  if (Number.isNaN(expiry)) return { kind: "active", daysLeft: null };
  if (expiry <= now) return { kind: "expired" };

  const days = daysUntilExpiry(input.expiresAt, now);
  if (days === null) return { kind: "active", daysLeft: null };
  // `expiry > now` nên còn ít nhất một phần của ngày hôm nay: ngày lịch 0 (hoặc lệch múi giờ) → ngày cuối.
  if (days <= 0) return { kind: "lastDay" };
  return { kind: "active", daysLeft: days };
}

export function getTrialState(plan: Pick<PlanInfo, "planCode" | "status" | "expiresAt" | "noActivePlan"> | null | undefined, now?: number): TrialState {
  if (!plan || plan.noActivePlan) return { kind: "none" };
  return getTrialStateOf({ code: plan.planCode, status: plan.status, expiresAt: plan.expiresAt }, now);
}

/** Hiển thị của một trạng thái dùng thử ở thanh trên (Owner). `null` = không hiện nhãn. */
export interface TrialLabel {
  text: string;
  tone: StatusColorKey;
}

export function trialLabel(state: TrialState): TrialLabel | null {
  switch (state.kind) {
    case "active": {
      if (state.daysLeft === null) return { text: "Dùng thử", tone: "info" };
      return {
        text: `Dùng thử · còn ${state.daysLeft} ngày`,
        tone: state.daysLeft <= TRIAL_WARNING_DAYS ? "warning" : "info",
      };
    }
    case "lastDay":
      return { text: "Dùng thử · hết hạn hôm nay", tone: "warning" };
    case "expired":
      return { text: "Dùng thử đã hết", tone: "error" };
    default:
      return null;
  }
}

/** Phụ đề ngắn dưới tên gói trong bảng doanh nghiệp của Admin. Cùng hệ màu với `trialLabel`. */
export function trialSubtitle(state: TrialState): TrialLabel | null {
  switch (state.kind) {
    case "active":
      if (state.daysLeft === null) return null;
      return { text: `còn ${state.daysLeft} ngày`, tone: state.daysLeft <= TRIAL_WARNING_DAYS ? "warning" : "info" };
    case "lastDay":
      return { text: "hết hạn hôm nay", tone: "warning" };
    case "expired":
      return { text: "đã hết", tone: "error" };
    default:
      return null;
  }
}

export const TRIAL_PLAN_NAME = "Dùng thử miễn phí";
export const TRIAL_PLAN_NOTE = "Hạn mức như gói Cơ bản";

/** Câu báo chỉ đọc dùng chung: tooltip nút khoá, câu lỗi 403 của BE, mô tả banner. Chỉ gói dùng thử đã hết có câu riêng (theo vai). */
export const READ_ONLY_DEFAULT = "Gói đã hết hạn — doanh nghiệp đang ở chế độ chỉ đọc. Liên hệ quản trị nền tảng để gia hạn.";
export const TRIAL_EXPIRED_OWNER = "Thời gian dùng thử đã hết. Nâng cấp gói ở trang Gói của tôi để tiếp tục thay đổi dữ liệu.";
export const TRIAL_EXPIRED_MANAGER = "Thời gian dùng thử của chuỗi đã hết. Liên hệ chủ chuỗi để nâng cấp.";

type TrialPlan = Parameters<typeof getTrialState>[0];

/** Câu riêng khi gói DÙNG THỬ đã hết (theo vai); `null` cho mọi trường hợp khác (gói trả phí, tạm ngưng, vai Admin) → dùng câu cũ. */
export function trialExpiredText(plan: TrialPlan, role: RoleKey | null | undefined, now?: number): string | null {
  if (getTrialState(plan, now).kind !== "expired") return null;
  if (role === "owner") return TRIAL_EXPIRED_OWNER;
  if (role === "manager") return TRIAL_EXPIRED_MANAGER;
  return null;
}

export function readOnlyReason(plan: TrialPlan, role: RoleKey | null | undefined, now?: number): string {
  return trialExpiredText(plan, role, now) ?? READ_ONLY_DEFAULT;
}
