/**
 * Luật nhập nhân viên (Cashier/Barista). Theo DTO tạo nhân viên hiện có của BE (`CreateStaffDto`, create-staff.dto.ts):
 * email hợp lệ ≤255, điện thoại `^\+?[0-9]{8,15}$`, họ và tên mỗi phần 1–100 ký tự. Không đặt thêm luật ngoài DTO/đặc tả.
 * Một nguồn cho form và mock.
 */
import type { ApiPlan, StaffEmployee, StaffInput, StaffPatch } from "../../../types";
import { ApiError, translateBackendMessage } from "../../http/errors";

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
    // BE thật (`manager-staff.service.ts`) trả câu tiếng Việt sẵn, KHÔNG kèm `suggestedPlans`: dùng nguyên câu (Manager không đổi được gói).
    if ((err.body as AccountLimitBody | null)?.suggestedPlans === undefined) return translateBackendMessage(err);
    const suggestion = (err.body as AccountLimitBody | null)?.suggestedPlans?.[0];
    return suggestion
      ? `${translateBackendMessage(err)} Hãy nâng lên gói "${suggestion.name}" (tối đa ${suggestion.maxAccounts} tài khoản) hoặc khoá bớt tài khoản không dùng.`
      : `${translateBackendMessage(err)} Đây đã là gói cao nhất: hãy khoá bớt tài khoản không dùng.`;
  }
  // Chỉ lỗi trùng email/điện thoại/mã nhân viên; các 409 khác (gói không hoạt động, cập nhật đồng thời…) dùng câu dịch chung.
  if (err.status === 409 && /already exists/i.test(err.message)) return "Email, số điện thoại hoặc mã nhân viên này đã được dùng cho một tài khoản khác. Kiểm tra lại.";
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
  const code = (input.employeeCode ?? "").trim();
  if (!code) errors.push("Nhập mã nhân viên");
  else if (code.length > 50) errors.push("Mã nhân viên tối đa 50 ký tự");
  return errors;
}

export const STAFF_REASON_MIN = 3;
export const STAFF_REASON_MAX = 500;

/** Lý do khoá/mở khoá/gửi lại email (`ManagerStaffStatusDto`/`ManagerResetPasswordDto`: 3–500 ký tự sau trim). Trả câu lỗi hoặc null. */
export function validateStaffReason(raw: string): string | null {
  const text = raw.trim();
  if (!text) return "Nhập lý do (ghi vào nhật ký, bắt buộc).";
  if (text.length < STAFF_REASON_MIN) return `Lý do phải có ít nhất ${STAFF_REASON_MIN} ký tự.`;
  if (text.length > STAFF_REASON_MAX) return `Lý do tối đa ${STAFF_REASON_MAX} ký tự.`;
  return null;
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
