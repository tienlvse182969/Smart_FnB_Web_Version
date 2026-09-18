import { App, Button, Card, Modal, Tag } from "antd";
import { LogIn, LogOut, UserCheck } from "lucide-react";
import { useEffect, useState } from "react";
import type { ShiftAssignment, ShiftTemplate, WorkSession } from "../../types";
import {
  checkIn,
  checkOut,
  listShiftAssignments,
  listShiftTemplates,
  listStaff,
  listWorkSessions,
  type StaffLegacy,
} from "../../services";
import { SectionTitle } from "../../components/bits";
import { useAppStore } from "../../store";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Check-in/out hôm nay (mục 4.5.E, BR-42/45/46) — Branch Manager thao tác,
 * không phải nhân viên tự làm (tablet/màn bếp dùng chung).
 */
export default function ShiftCheckInOut() {
  const { message } = App.useApp();
  const currentUser = useAppStore((s) => s.currentUser);
  const currentBranchId = useAppStore((s) => s.currentBranchId);
  const [staff, setStaff] = useState<StaffLegacy[]>([]);
  const [assignmentsToday, setAssignmentsToday] = useState<ShiftAssignment[]>([]);
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [pendingCheckout, setPendingCheckout] = useState<{ session: WorkSession; count: number } | null>(null);

  const today = todayIso();

  const load = async () => {
    if (!currentBranchId) return;
    const [staffList, assignments, templateList, workSessions] = await Promise.all([
      listStaff(currentBranchId),
      listShiftAssignments(currentBranchId, today, today),
      listShiftTemplates(currentBranchId),
      listWorkSessions(currentBranchId, today),
    ]);
    setStaff(staffList.filter((s) => s.active));
    setAssignmentsToday(assignments);
    setTemplates(templateList);
    setSessions(workSessions);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBranchId]);

  const openSessionOf = (staffId: string) => sessions.find((w) => w.staffId === staffId && w.status !== "ended");
  const templateLabel = (id: string) => templates.find((t) => t.id === id);

  const scheduledNotIn = staff.filter((s) => assignmentsToday.some((a) => a.staffId === s.id) && !openSessionOf(s.id));
  const unscheduledActive = staff.filter((s) => !assignmentsToday.some((a) => a.staffId === s.id) && !openSessionOf(s.id));
  const inShiftNow = sessions.filter((w) => w.status === "inShift");

  const doCheckIn = async (staffId: string, shiftAssignmentId?: string) => {
    if (!currentUser?.tenantId || !currentBranchId) return;
    try {
      await checkIn(currentUser.tenantId, currentBranchId, staffId, shiftAssignmentId);
      message.success("Đã check-in");
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Không check-in được");
    }
  };

  const doCheckOut = async (session: WorkSession, force = false) => {
    const result = await checkOut(session.id, force);
    if (!result.ok) {
      setPendingCheckout({ session, count: result.pendingTaskCount });
      return;
    }
    message.success("Đã check-out");
    setPendingCheckout(null);
    await load();
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
        <SectionTitle title={`Đang trong ca (${inShiftNow.length})`} />
        {inShiftNow.length === 0 ? (
          <div style={{ fontSize: 13, color: "#a1a1aa", padding: "16px 0" }}>Chưa có ai check-in hôm nay.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {inShiftNow.map((w) => {
              const s = staff.find((x) => x.id === w.staffId);
              const template = w.shiftAssignmentId ? templateLabel(assignmentsToday.find((a) => a.id === w.shiftAssignmentId)?.shiftTemplateId ?? "") : undefined;
              return (
                <div key={w.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid var(--ant-color-border)", borderRadius: 10, padding: "10px 14px" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{s?.name ?? w.staffId}</div>
                    <div style={{ fontSize: 12, color: "#a1a1aa" }}>
                      {s?.role} · check-in {new Date(w.checkedInAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      {w.offSchedule && <Tag color="orange" style={{ marginLeft: 6 }}>Ngoài lịch</Tag>}
                      {template && <span> · {template.name}</span>}
                    </div>
                  </div>
                  <Button size="small" icon={<LogOut size={14} />} onClick={() => doCheckOut(w)}>
                    Check-out
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
          <SectionTitle title="Có lịch hôm nay" sub="Gợi ý check-in theo phân ca" />
          {scheduledNotIn.length === 0 ? (
            <div style={{ fontSize: 13, color: "#a1a1aa" }}>Mọi người có lịch hôm nay đã check-in.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {scheduledNotIn.map((s) => {
                const a = assignmentsToday.find((x) => x.staffId === s.id)!;
                const t = templateLabel(a.shiftTemplateId);
                return (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid var(--ant-color-border)", borderRadius: 10, padding: "10px 14px" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: "#a1a1aa" }}>{s.role}{t ? ` · ${t.name} (${t.startTime}-${t.endTime})` : ""}</div>
                    </div>
                    <Button size="small" type="primary" icon={<LogIn size={14} />} onClick={() => doCheckIn(s.id, a.id)}>
                      Check-in
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
          <SectionTitle title="Không có lịch" sub="Vẫn check-in được, gắn cờ ngoài lịch (BR-46)" />
          {unscheduledActive.length === 0 ? (
            <div style={{ fontSize: 13, color: "#a1a1aa" }}>Không có ai khác đang hoạt động.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {unscheduledActive.map((s) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid var(--ant-color-border)", borderRadius: 10, padding: "10px 14px" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: "#a1a1aa" }}>{s.role}</div>
                  </div>
                  <Button size="small" icon={<UserCheck size={14} />} onClick={() => doCheckIn(s.id)}>
                    Check-in (ngoài lịch)
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={!!pendingCheckout}
        onCancel={() => setPendingCheckout(null)}
        title="Đang giữ việc bưng món chưa xong"
        okText="Vẫn check-out"
        okButtonProps={{ danger: true }}
        onOk={() => pendingCheckout && doCheckOut(pendingCheckout.session, true)}
      >
        Nhân viên này đang nhận {pendingCheckout?.count} món chưa bưng xong. Nếu vẫn check-out, các món này sẽ được trả về hàng chờ chung cho waiter khác nhận (BR-45).
      </Modal>
    </div>
  );
}
