/**
 * Chế độ chỉ đọc khi gói hết hạn/tạm ngưng (BR-09): xem được dữ liệu, không tạo/sửa/xoá cấu hình.
 *
 * LƯU Ý lệch với BE: BE hiện chặn CẢ ĐỌC khi hết hạn, còn đặc tả là chỉ đọc. FE làm theo đặc tả; nếu BE vẫn
 * chặn đọc thì màn hình sẽ nhận lỗi từ BE.
 */
import { describePlan, usePlan } from "./usePlan";
import type { PlanInfo, QuotaResource } from "../types";

export interface WriteGuard {
  /** true = chỉ đọc (hết hạn/tạm ngưng). */
  readOnly: boolean;
  /** Nút ghi nên bị vô hiệu hoá. */
  disabled: boolean;
  /** Lý do hiển thị trong tooltip; null khi không bị chặn. */
  reason: string | null;
}

export const READ_ONLY_REASON = "Gói đã hết hạn — doanh nghiệp đang ở chế độ chỉ đọc. Liên hệ quản trị nền tảng để gia hạn.";

export function limitReason(resource: QuotaResource, planName: string | null): string {
  const what = resource === "branches" ? "chi nhánh" : "tài khoản";
  return `Đã dùng hết hạn mức ${what}${planName ? ` của gói ${planName}` : ""}. Nâng gói để thêm.`;
}

/** Phần thuần: tính trạng thái chặn từ `PlanInfo`; `resource` = hạn mức cần kiểm cho thao tác tạo mới. */
export function computeWriteGuard(plan: PlanInfo | null, resource?: QuotaResource): WriteGuard {
  const view = describePlan(plan);
  if (view.isExpired) return { readOnly: true, disabled: true, reason: READ_ONLY_REASON };
  if (resource && view.isLimitReached(resource)) {
    return { readOnly: false, disabled: true, reason: limitReason(resource, view.planName) };
  }
  return { readOnly: false, disabled: false, reason: null };
}

export function useReadOnly(): boolean {
  return usePlan().isExpired;
}

/** Cho các điều khiển không phải nút (Switch, Popconfirm…): có bị chặn ghi không, và vì sao. */
export function useWriteGuard(resource?: QuotaResource): WriteGuard {
  return computeWriteGuard(usePlan().plan, resource);
}
