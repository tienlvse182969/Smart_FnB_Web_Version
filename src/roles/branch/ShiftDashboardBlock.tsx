import { App, Button, Card, DatePicker, Modal, Tag } from "antd";
import { AlertTriangle, DoorClosed, Users } from "lucide-react";
import { useEffect, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import type { WorkSession } from "../../types";
import {
  autoCloseOverdueShifts,
  confirmAutoClosedWorkSession,
  listOverdueWorkSessions,
  listStaff,
  listWorkSessions,
  type OverdueWorkSession,
  type StaffLegacy,
} from "../../services";
import { SectionTitle } from "../../components/bits";
import { useAppStore } from "../../store";

/** BR-44: nhắc quá giờ + "Giả lập đóng cửa" cho dashboard Manager (mục 4.5.D). */
export default function ShiftDashboardBlock() {
  const { message } = App.useApp();
  const currentUser = useAppStore((s) => s.currentUser);
  const currentBranchId = useAppStore((s) => s.currentBranchId);
  const [inShift, setInShift] = useState<WorkSession[]>([]);
  const [staff, setStaff] = useState<StaffLegacy[]>([]);
  const [overdue, setOverdue] = useState<OverdueWorkSession[]>([]);
  const [pendingConfirm, setPendingConfirm] = useState<WorkSession[]>([]);
  const [editingTime, setEditingTime] = useState<{ session: WorkSession; value: Dayjs } | null>(null);
  const [closing, setClosing] = useState(false);

  const staffName = (id: string) => staff.find((s) => s.id === id)?.name ?? id;

  const load = async () => {
    if (!currentBranchId) return;
    const [sessions, staffList, overdueList] = await Promise.all([
      listWorkSessions(currentBranchId),
      listStaff(currentBranchId),
      listOverdueWorkSessions(currentBranchId),
    ]);
    setInShift(sessions.filter((w) => w.status === "inShift"));
    setPendingConfirm(sessions.filter((w) => w.status === "autoClosedPending"));
    setStaff(staffList);
    setOverdue(overdueList);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBranchId]);

  const runAutoClose = async () => {
    if (!currentBranchId || !currentUser) return;
    setClosing(true);
    try {
      const closed = await autoCloseOverdueShifts(currentBranchId, currentUser.email);
      message.success(closed.length > 0 ? `Đã tự đóng ${closed.length} lượt làm việc — chờ xác nhận giờ` : "Chưa tới giờ đóng cửa hoặc không còn ai trong ca");
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Không chạy được");
    } finally {
      setClosing(false);
    }
  };

  const confirmTime = async () => {
    if (!editingTime || !currentUser) return;
    await confirmAutoClosedWorkSession(editingTime.session.id, editingTime.value.toISOString(), currentUser.email);
    message.success("Đã xác nhận giờ check-out");
    setEditingTime(null);
    await load();
  };

  return (
    <Card style={{ borderRadius: 14, marginTop: 16 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title={`Đang trong ca (${inShift.length})`}
        sub="Chỉ người đang trong ca mới nhận thông báo món xong / hết món (BR-43)"
        extra={
          <Button icon={<DoorClosed size={14} />} loading={closing} onClick={runAutoClose}>
            Giả lập đóng cửa
          </Button>
        }
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: overdue.length > 0 || pendingConfirm.length > 0 ? 16 : 0 }}>
        {inShift.length === 0 ? (
          <span style={{ fontSize: 13, color: "#a1a1aa" }}>Không có ai đang trong ca.</span>
        ) : (
          inShift.map((w) => (
            <Tag key={w.id} icon={<Users size={12} />} style={{ padding: "4px 10px" }}>
              {staffName(w.staffId)}
            </Tag>
          ))
        )}
      </div>

      {overdue.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#ad6800", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={14} /> Quá giờ kết thúc ca trên 15 phút chưa check-out
          </div>
          {overdue.map((o) => (
            <div key={o.session.id} style={{ fontSize: 13, color: "#52525b", marginBottom: 4 }}>
              {o.staffName} — trễ {o.minutesOverdue} phút
            </div>
          ))}
        </div>
      )}

      {pendingConfirm.length > 0 && (
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#71717a", marginBottom: 8 }}>Chờ xác nhận giờ check-out (tự đóng khi đóng cửa)</div>
          {pendingConfirm.map((w) => (
            <div key={w.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--ant-color-border)" }}>
              <div style={{ fontSize: 13 }}>
                {staffName(w.staffId)} — dự kiến {w.checkedOutAt ? new Date(w.checkedOutAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "—"}
              </div>
              <Button size="small" onClick={() => setEditingTime({ session: w, value: dayjs(w.checkedOutAt) })}>
                Xác nhận / sửa giờ
              </Button>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!editingTime} onCancel={() => setEditingTime(null)} onOk={confirmTime} title="Xác nhận giờ check-out">
        <DatePicker
          showTime
          value={editingTime?.value}
          onChange={(v) => v && setEditingTime((p) => (p ? { ...p, value: v } : p))}
          style={{ width: "100%" }}
        />
      </Modal>
    </Card>
  );
}
