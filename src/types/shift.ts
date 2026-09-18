/** Kiểu dữ liệu Ca làm việc theo đặc tả v7. */

/** Mẫu ca (template, do Branch Manager tạo — mục 4.5.H, BR-47). */
export type ShiftTemplate = {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  /** Giờ bắt đầu ca dạng "HH:MM". */
  startTime: string;
  /** Giờ kết thúc ca dạng "HH:MM" — phải sau `startTime` trong cùng ngày (BR-47). */
  endTime: string;
  /** false = tạm ngưng dùng, không hiện khi phân ca mới nhưng vẫn giữ dữ liệu cũ. */
  active: boolean;
};

/** Phân công ca — gán nhân viên vào một ca cụ thể. */
export type ShiftAssignment = {
  id: string;
  tenantId: string;
  branchId: string;
  staffId: string;
  shiftTemplateId: string;
  /** Ngày làm việc (ISO date string). */
  date: string;
};

/**
 * Trạng thái phiên làm việc thực tế:
 * - inShift: đang trong ca
 * - autoClosedPending: ca đã qua giờ nhưng chưa check-out
 * - ended: đã check-out
 */
export type WorkSessionStatus = "inShift" | "autoClosedPending" | "ended";

/** Phiên làm việc thực tế (check-in / check-out). */
export type WorkSession = {
  id: string;
  tenantId: string;
  branchId: string;
  staffId: string;
  shiftAssignmentId?: string;
  status: WorkSessionStatus;
  /** Ngoài giờ ca đã phân công. */
  offSchedule: boolean;
  /** Hệ thống tự đóng ca khi quá giờ. */
  autoClosed: boolean;
  checkedInAt: string;
  checkedOutAt?: string;
};
