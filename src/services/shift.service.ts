/**
 * Service quản lý Ca làm việc & Chấm công — đặc tả v7 mục 12 (BR-42→BR-48).
 *
 * TẠM DÙNG `staffLegacy` làm danh mục nhân viên (đã có từ `staff.service.ts`,
 * cùng `id` với `DemoAccount` để check-in/out gắn đúng người đăng nhập).
 */
import { db, type StaffLegacy } from "../mock/db";
import type { ShiftAssignment, ShiftTemplate, WorkSession } from "../types";
import { assertTenantWritable } from "./_guard";
import { delay, newId, nowISO } from "./_utils";

function addAudit(tenantId: string | null, actor: string, action: string, target: string) {
  db.auditLog = [
    { id: `L-${newId()}`, tenantId, time: nowISO(), actor, action, target },
    ...db.auditLog,
  ];
}

/* ============================ CA MẪU ============================ */

/** Lấy danh sách mẫu ca của chi nhánh. */
export async function listShiftTemplates(branchId: string): Promise<ShiftTemplate[]> {
  await delay();
  return db.shiftTemplates.filter((t) => t.branchId === branchId);
}

function assertValidShiftTimes(startTime: string, endTime: string) {
  if (startTime >= endTime) {
    throw new Error("Giờ kết thúc phải sau giờ bắt đầu, trong cùng một ngày (BR-47)");
  }
}

/** Branch Manager tạo ca mẫu (mục 4.5.H). */
export async function createShiftTemplate(
  tenantId: string,
  branchId: string,
  name: string,
  startTime: string,
  endTime: string
): Promise<ShiftTemplate> {
  await delay();
  assertTenantWritable(tenantId);
  assertValidShiftTimes(startTime, endTime);

  const template: ShiftTemplate = {
    id: `ST-${newId()}`,
    tenantId,
    branchId,
    name,
    startTime,
    endTime,
    active: true,
  };
  db.shiftTemplates.push(template);
  return template;
}

/** Sửa ca mẫu — giờ vẫn phải hợp lệ (BR-47). */
export async function updateShiftTemplate(
  id: string,
  data: { name?: string; startTime?: string; endTime?: string }
): Promise<ShiftTemplate> {
  await delay();
  const template = db.shiftTemplates.find((t) => t.id === id);
  if (!template) throw new Error("Ca mẫu không tồn tại");
  assertTenantWritable(template.tenantId);

  const next = { ...template, ...data };
  assertValidShiftTimes(next.startTime, next.endTime);
  Object.assign(template, data);
  return template;
}

/** Bật/tắt ca mẫu. */
export async function setShiftTemplateActive(id: string, active: boolean): Promise<void> {
  await delay();
  const template = db.shiftTemplates.find((t) => t.id === id);
  if (!template) throw new Error("Ca mẫu không tồn tại");
  assertTenantWritable(template.tenantId);
  template.active = active;
}

/* ============================ PHÂN CA ============================ */

/** Lấy phân công ca theo chi nhánh, lọc theo một ngày hoặc một khoảng ngày [from, to]. */
export async function listShiftAssignments(
  branchId: string,
  from?: string,
  to?: string
): Promise<ShiftAssignment[]> {
  await delay();
  let list = db.shiftAssignments.filter((a) => a.branchId === branchId);
  if (from) list = list.filter((a) => a.date >= from);
  if (to) list = list.filter((a) => a.date <= to);
  return list;
}

/**
 * Gán một nhân viên vào một ca mẫu trong một ngày cụ thể (ô trên lưới tuần).
 * BR-47: chỉ phân ca cho nhân viên đang hoạt động thuộc đúng chi nhánh.
 * Gọi lại trên cùng (staffId, date) sẽ THAY THẾ ca cũ của ngày đó (một người
 * một ca mỗi ngày trong mô hình lưới tuần này).
 */
export async function assignShift(
  tenantId: string,
  branchId: string,
  staffId: string,
  date: string,
  shiftTemplateId: string
): Promise<ShiftAssignment> {
  await delay();
  assertTenantWritable(tenantId);

  const staff = db.staffLegacy.find((s) => s.id === staffId);
  if (!staff || !staff.active || staff.branchId !== branchId) {
    throw new Error("Chỉ phân ca được cho nhân viên đang hoạt động của chi nhánh này");
  }
  const template = db.shiftTemplates.find((t) => t.id === shiftTemplateId && t.branchId === branchId);
  if (!template) throw new Error("Ca mẫu không tồn tại ở chi nhánh này");

  db.shiftAssignments = db.shiftAssignments.filter((a) => !(a.staffId === staffId && a.date === date));

  const assignment: ShiftAssignment = {
    id: `SA-${newId()}`,
    tenantId,
    branchId,
    staffId,
    shiftTemplateId,
    date,
  };
  db.shiftAssignments.push(assignment);
  return assignment;
}

/** Gỡ phân ca của một nhân viên trong một ngày (ô trống trên lưới). */
export async function unassignShift(staffId: string, date: string): Promise<void> {
  await delay();
  db.shiftAssignments = db.shiftAssignments.filter((a) => !(a.staffId === staffId && a.date === date));
}

/**
 * Sao chép toàn bộ phân ca của tuần trước sang tuần đang xem.
 * `weekStart`/`prevWeekStart` là ngày thứ Hai của mỗi tuần (ISO "yyyy-MM-dd").
 */
export async function copyWeekAssignments(
  tenantId: string,
  branchId: string,
  prevWeekStart: string,
  weekStart: string
): Promise<ShiftAssignment[]> {
  await delay();
  assertTenantWritable(tenantId);

  const prevEnd = addDays(prevWeekStart, 6);
  const source = db.shiftAssignments.filter(
    (a) => a.branchId === branchId && a.date >= prevWeekStart && a.date <= prevEnd
  );

  const created: ShiftAssignment[] = [];
  for (const a of source) {
    const offset = dayDiff(prevWeekStart, a.date);
    const newDate = addDays(weekStart, offset);
    db.shiftAssignments = db.shiftAssignments.filter((x) => !(x.staffId === a.staffId && x.date === newDate));
    const copy: ShiftAssignment = {
      id: `SA-${newId()}`,
      tenantId,
      branchId,
      staffId: a.staffId,
      shiftTemplateId: a.shiftTemplateId,
      date: newDate,
    };
    db.shiftAssignments.push(copy);
    created.push(copy);
  }
  return created;
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayDiff(fromIso: string, toIso: string): number {
  const a = new Date(`${fromIso}T00:00:00.000Z`).getTime();
  const b = new Date(`${toIso}T00:00:00.000Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

/* ============================ CHECK-IN / CHECK-OUT ============================ */

/** Lấy danh sách phiên làm việc theo chi nhánh, lọc theo ngày check-in nếu có. */
export async function listWorkSessions(branchId: string, date?: string): Promise<WorkSession[]> {
  await delay();
  let list = db.workSessions.filter((w) => w.branchId === branchId);
  if (date) list = list.filter((w) => w.checkedInAt.startsWith(date));
  return list;
}

/** Phiên làm việc đang mở (inShift hoặc autoClosedPending) của một nhân viên, nếu có. */
export function findOpenWorkSession(staffId: string): WorkSession | undefined {
  return db.workSessions.find((w) => w.staffId === staffId && w.status !== "ended");
}

/** true nếu nhân viên đang thực sự trong ca (đã check-in, chưa check-out) — dùng để lọc thông báo (BR-43). */
export function isInShift(staffId: string): boolean {
  return db.workSessions.some((w) => w.staffId === staffId && w.status === "inShift");
}

/**
 * Branch Manager check-in cho nhân viên (BR-42: Manager thao tác, không phải
 * nhân viên tự làm — vì tablet/màn bếp là thiết bị dùng chung).
 * BR-46: không có lịch vẫn check-in được nhưng gắn cờ `offSchedule`; một
 * nhân viên không có hai lượt làm việc trùng giờ — chặn nếu đang có lượt
 * chưa kết thúc.
 */
export async function checkIn(
  tenantId: string,
  branchId: string,
  staffId: string,
  shiftAssignmentId?: string
): Promise<WorkSession> {
  await delay();
  assertTenantWritable(tenantId);

  if (findOpenWorkSession(staffId)) {
    throw new Error("Nhân viên đang có một lượt làm việc chưa kết thúc — không thể check-in trùng giờ (BR-46)");
  }

  const sessionId = `WS-${newId()}`;
  const now = nowISO();

  const newSession: WorkSession = {
    id: sessionId,
    tenantId,
    branchId,
    staffId,
    shiftAssignmentId,
    status: "inShift",
    offSchedule: !shiftAssignmentId,
    autoClosed: false,
    checkedInAt: now,
  };

  db.workSessions.unshift(newSession);
  return newSession;
}

export type CheckOutResult =
  | { ok: true }
  | { ok: false; pendingTaskCount: number };

/**
 * Branch Manager check-out cho nhân viên (BR-42/45). Nếu nhân viên đang giữ
 * `ServeTask` chưa bưng xong (`OrderLine.status = awaiting_pickup`), trả về
 * cảnh báo trước — gọi lại với `force = true` để vẫn check-out, khi đó việc
 * đang giữ được TRẢ VỀ hàng chờ chung (bỏ `claimedBy`) cho waiter khác nhận.
 */
export async function checkOut(workSessionId: string, force = false): Promise<CheckOutResult> {
  await delay();
  const session = db.workSessions.find((w) => w.id === workSessionId);
  if (!session) throw new Error("Phiên làm việc không tồn tại");

  const pendingLines = db.orderLines.filter(
    (l) => l.status === "awaiting_pickup" && l.claimedBy === staffNameOf(session.staffId)
  );

  if (pendingLines.length > 0 && !force) {
    return { ok: false, pendingTaskCount: pendingLines.length };
  }

  if (pendingLines.length > 0) {
    for (const line of pendingLines) {
      line.claimedBy = undefined;
      line.claimedAt = undefined;
      const task = db.serveTasks.find((t) => t.orderLineId === line.id && t.claimedBy === staffNameOf(session.staffId));
      if (task) {
        task.claimedBy = null;
        task.claimedAt = undefined;
      }
    }
  }

  session.status = "ended";
  session.checkedOutAt = nowISO();
  return { ok: true };
}

function staffNameOf(staffId: string): string | undefined {
  return db.staffLegacy.find((s) => s.id === staffId)?.name;
}

/* ============================ NHẮC QUÁ GIỜ & TỰ ĐÓNG ============================ */

/** Giờ kết thúc dự kiến của một phiên làm việc: theo ca mẫu, hoặc giờ đóng cửa chi nhánh nếu ngoài lịch. */
function expectedEndAt(session: WorkSession): Date | null {
  const dayKey = session.checkedInAt.slice(0, 10);
  let endTime: string | undefined;

  const assignment = session.shiftAssignmentId
    ? db.shiftAssignments.find((a) => a.id === session.shiftAssignmentId)
    : undefined;
  if (assignment) {
    endTime = db.shiftTemplates.find((t) => t.id === assignment.shiftTemplateId)?.endTime;
  }
  if (!endTime) {
    endTime = db.branches.find((b) => b.id === session.branchId)?.closeTime;
  }
  if (!endTime) return null;

  return new Date(`${dayKey}T${endTime}:00.000Z`);
}

export interface OverdueWorkSession {
  session: WorkSession;
  staffName: string;
  expectedEndAt: string;
  minutesOverdue: number;
}

/** BR-44: quá giờ kết thúc ca 15 phút chưa check-out thì nhắc Manager. */
export async function listOverdueWorkSessions(branchId: string, now: Date = new Date()): Promise<OverdueWorkSession[]> {
  await delay();
  const result: OverdueWorkSession[] = [];
  for (const session of db.workSessions.filter((w) => w.branchId === branchId && w.status === "inShift")) {
    const end = expectedEndAt(session);
    if (!end) continue;
    const minutesOverdue = Math.round((now.getTime() - end.getTime()) / 60_000);
    if (minutesOverdue >= 15) {
      result.push({ session, staffName: staffNameOf(session.staffId) ?? session.staffId, expectedEndAt: end.toISOString(), minutesOverdue });
    }
  }
  return result;
}

/**
 * BR-44: "Giả lập đóng cửa" — tới giờ đóng cửa chi nhánh mà còn người trong
 * ca thì hệ thống tự đóng lượt làm việc theo giờ kết thúc ca, gắn cờ chờ
 * xác nhận (`autoClosedPending`). Manager xác nhận hoặc sửa giờ sau đó.
 */
export async function autoCloseOverdueShifts(
  branchId: string,
  actorEmail: string,
  now: Date = new Date()
): Promise<WorkSession[]> {
  await delay();
  const branch = db.branches.find((b) => b.id === branchId);
  if (!branch) throw new Error("Chi nhánh không tồn tại");

  const dayKey = now.toISOString().slice(0, 10);
  const closeAt = new Date(`${dayKey}T${branch.closeTime}:00.000Z`);
  if (now.getTime() < closeAt.getTime()) {
    throw new Error(`Chưa tới giờ đóng cửa (${branch.closeTime}) của chi nhánh`);
  }

  const closed: WorkSession[] = [];
  for (const session of db.workSessions.filter((w) => w.branchId === branchId && w.status === "inShift")) {
    const end = expectedEndAt(session) ?? closeAt;
    session.status = "autoClosedPending";
    session.autoClosed = true;
    session.checkedOutAt = end.toISOString();
    closed.push(session);
  }

  if (closed.length > 0) {
    addAudit(
      branch.tenantId,
      actorEmail,
      "Giả lập đóng cửa — tự đóng ca còn treo",
      `${branchId}: ${closed.length} lượt làm việc chờ Manager xác nhận`
    );
  }
  return closed;
}

/**
 * Manager xác nhận (hoặc sửa giờ) một lượt làm việc đã bị hệ thống tự đóng.
 * Ghi audit log (BR-20).
 */
export async function confirmAutoClosedWorkSession(
  workSessionId: string,
  checkedOutAt: string,
  actorEmail: string
): Promise<WorkSession> {
  await delay();
  const session = db.workSessions.find((w) => w.id === workSessionId);
  if (!session) throw new Error("Phiên làm việc không tồn tại");
  if (session.status !== "autoClosedPending") throw new Error("Lượt làm việc không ở trạng thái chờ xác nhận");

  session.status = "ended";
  session.checkedOutAt = checkedOutAt;
  addAudit(session.tenantId, actorEmail, "Xác nhận/sửa giờ check-out tự động", `${workSessionId} → ${checkedOutAt}`);
  return session;
}
