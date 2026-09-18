import { App, Button, Card, Select } from "antd";
import { ChevronLeft, ChevronRight, Copy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ShiftAssignment, ShiftTemplate } from "../../types";
import {
  assignShift,
  copyWeekAssignments,
  listShiftAssignments,
  listShiftTemplates,
  listStaff,
  unassignShift,
  type StaffLegacy,
} from "../../services";
import { SectionTitle } from "../../components/bits";
import { useAppStore } from "../../store";

const WEEKDAY_LABEL = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=CN..6=T7
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

/** Phân ca (mục 4.5.H): lưới tuần — hàng nhân viên, cột ngày, ô gán ca mẫu; BR-47: chỉ nhân viên đang hoạt động. */
export default function ShiftSchedule() {
  const { message } = App.useApp();
  const currentUser = useAppStore((s) => s.currentUser);
  const currentBranchId = useAppStore((s) => s.currentBranchId);
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [staff, setStaff] = useState<StaffLegacy[]>([]);
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [copying, setCopying] = useState(false);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekStartIso = toIso(weekStart);
  const weekEndIso = toIso(addDays(weekStart, 6));

  const load = async () => {
    if (!currentBranchId) return;
    const [staffList, templateList, assignmentList] = await Promise.all([
      listStaff(currentBranchId),
      listShiftTemplates(currentBranchId),
      listShiftAssignments(currentBranchId, weekStartIso, weekEndIso),
    ]);
    setStaff(staffList.filter((s) => s.active));
    setTemplates(templateList.filter((t) => t.active));
    setAssignments(assignmentList);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBranchId, weekStartIso]);

  const assignmentAt = (staffId: string, dateIso: string) => assignments.find((a) => a.staffId === staffId && a.date === dateIso);

  const handleChange = async (staffId: string, dateIso: string, shiftTemplateId: string | undefined) => {
    if (!currentUser?.tenantId || !currentBranchId) return;
    try {
      if (!shiftTemplateId) {
        await unassignShift(staffId, dateIso);
      } else {
        await assignShift(currentUser.tenantId, currentBranchId, staffId, dateIso, shiftTemplateId);
      }
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Không lưu được");
    }
  };

  const copyLastWeek = async () => {
    if (!currentUser?.tenantId || !currentBranchId) return;
    setCopying(true);
    try {
      const prevWeekStart = toIso(addDays(weekStart, -7));
      const created = await copyWeekAssignments(currentUser.tenantId, currentBranchId, prevWeekStart, weekStartIso);
      message.success(created.length > 0 ? `Đã sao chép ${created.length} lượt phân ca từ tuần trước` : "Tuần trước không có phân ca nào để sao chép");
      await load();
    } finally {
      setCopying(false);
    }
  };

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title="Phân ca theo ngày"
        sub={`Tuần ${weekStartIso} → ${weekEndIso}`}
        extra={
          <div style={{ display: "flex", gap: 8 }}>
            <Button icon={<ChevronLeft size={14} />} onClick={() => setWeekStart((w) => addDays(w, -7))} />
            <Button icon={<ChevronRight size={14} />} onClick={() => setWeekStart((w) => addDays(w, 7))} />
            <Button icon={<Copy size={14} />} loading={copying} onClick={copyLastWeek}>
              Sao chép tuần trước
            </Button>
          </div>
        }
      />

      {staff.length === 0 ? (
        <div style={{ fontSize: 13, color: "#a1a1aa", padding: "24px 0", textAlign: "center" }}>
          Chưa có nhân viên đang hoạt động ở chi nhánh này.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 12px", fontSize: 12.5, color: "#71717a", borderBottom: "1px solid var(--ant-color-border)" }}>Nhân viên</th>
                {weekDays.map((d, i) => (
                  <th key={i} style={{ textAlign: "center", padding: "8px 12px", fontSize: 12, color: "#71717a", borderBottom: "1px solid var(--ant-color-border)", minWidth: 110 }}>
                    {WEEKDAY_LABEL[i]}
                    <div style={{ fontSize: 11, color: "#a1a1aa" }}>{toIso(d).slice(5)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id}>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--ant-color-border)" }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{s.name}</div>
                    <div style={{ fontSize: 11.5, color: "#a1a1aa" }}>{s.role}</div>
                  </td>
                  {weekDays.map((d, i) => {
                    const dateIso = toIso(d);
                    const a = assignmentAt(s.id, dateIso);
                    return (
                      <td key={i} style={{ padding: "6px 8px", borderBottom: "1px solid var(--ant-color-border)" }}>
                        <Select
                          allowClear
                          size="small"
                          placeholder="—"
                          style={{ width: "100%" }}
                          value={a?.shiftTemplateId}
                          onChange={(v) => handleChange(s.id, dateIso, v)}
                          onClear={() => handleChange(s.id, dateIso, undefined)}
                          options={templates.map((t) => ({ value: t.id, label: `${t.name} (${t.startTime}-${t.endTime})` }))}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
