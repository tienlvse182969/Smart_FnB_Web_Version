/**
 * Luật nhập nhân viên (Cashier/Barista). Theo DTO tạo nhân viên hiện có của BE (`CreateStaffDto`, create-staff.dto.ts):
 * email hợp lệ ≤255, điện thoại `^\+?[0-9]{8,15}$`, họ và tên mỗi phần 1–100 ký tự. Không đặt thêm luật ngoài DTO/đặc tả.
 * Một nguồn cho form và mock.
 */
import type { ApiPlan, StaffEmployee, StaffInput, StaffPatch } from "../../../types";
import { ApiError } from "../../http/errors";

interface AccountLimitBody {
  suggestedPlans?: (ApiPlan & { priceDifference: string })[];
}

/**
 * Thông báo cho lỗi nghiệp vụ nhân viên: đủ hạn mức (kèm TÊN gói cần nâng) và email trùng. `null` = không phải các lỗi này
 * (lớp gọi dùng thông báo chung của BE).
 */
export function describeAccountError(err: unknown): string | null {
  if (!(err instanceof ApiError)) return null;
  if (err.code === "PLAN_LIMIT_REACHED") {
    const suggestion = (err.body as AccountLimitBody | null)?.suggestedPlans?.[0];
    return suggestion
      ? `${err.message} Hãy nâng lên gói "${suggestion.name}" (tối đa ${suggestion.maxAccounts} tài khoản) hoặc khoá bớt tài khoản không dùng.`
      : `${err.message} Đây đã là gói cao nhất: hãy khoá bớt tài khoản không dùng.`;
  }
  if (err.status === 409) return "Email này đã được dùng cho một tài khoản khác. Dùng email khác.";
  return null;
}

export const PHONE_PATTERN = /^\+?[0-9]{8,15}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "Nguyễn Văn Tú" → tên = chữ đầu, họ = phần còn lại (hiển thị lại là `firstName lastName`). */
export function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

export const staffName = (s: Pick<StaffEmployee, "firstName" | "lastName">): string => `${s.firstName} ${s.lastName}`.trim();

/** Lỗi nhập nhân viên mới (rỗng = hợp lệ). */
export function validateStaffInput(input: StaffInput): string[] {
  const errors: string[] = [];
  const first = input.firstName.trim();
  const last = input.lastName.trim();
  if (!first || !last) errors.push("Nhập họ và tên (ít nhất hai chữ)");
  if (first.length > 100 || last.length > 100) errors.push("Họ và tên mỗi phần tối đa 100 ký tự");
  const email = input.email.trim();
  if (!email) errors.push("Nhập email đăng nhập");
  else if (!EMAIL_PATTERN.test(email) || email.length > 255) errors.push("Email không hợp lệ");
  if (input.phone?.trim() && !PHONE_PATTERN.test(input.phone.trim())) errors.push("Điện thoại gồm 8–15 chữ số (có thể có dấu + ở đầu)");
  if (input.role !== "CASHIER" && input.role !== "BARISTA") errors.push("Chọn vai trò Cashier hoặc Barista");
  return errors;
}

/** Lỗi sửa nhân viên (chỉ họ tên và điện thoại). */
export function validateStaffPatch(patch: StaffPatch): string[] {
  const errors: string[] = [];
  if (patch.firstName !== undefined || patch.lastName !== undefined) {
    if (!(patch.firstName ?? "").trim() || !(patch.lastName ?? "").trim()) errors.push("Nhập họ và tên (ít nhất hai chữ)");
  }
  if (patch.phone && !PHONE_PATTERN.test(patch.phone.trim())) errors.push("Điện thoại gồm 8–15 chữ số (có thể có dấu + ở đầu)");
  return errors;
}
