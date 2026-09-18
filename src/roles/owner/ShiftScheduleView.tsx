import { Button, Card, Select } from "antd";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ShiftAssignment, ShiftTemplate } from "../../types";
import { listShiftAssignments, listShiftTemplates, listStaff, type StaffLegacy } from "../../services";
import { SectionTitle } from "../../components/bits";
import { useAppStore } from "../../store";

const WEEKDAY_LABEL = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
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

/** OW-G: Owner xem lịch phân ca của các chi nhánh — chỉ đọc, không sửa được. */
export default function ShiftScheduleView() {
  const branches = useAppStore((s) => s.branches);
  const [branchId, setBranchId] = useState<string | undefined>();
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [staff, setStaff] = useState<StaffLegacy[]>([]);
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);

  useEffect(() => {
    if (!branchId && branches[0]) setBranchId(branches[0].id);
  }, [branches, branchId]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekStartIso = toIso(weekStart);
  const weekEndIso = toIso(addDays(weekStart, 6));

  useEffect(() => {
    if (!branchId) return;
    listStaff(branchId).then((s) => setStaff(s.filter((x) => x.active)));
    listShiftTemplates(branchId).then(setTemplates);
    listShiftAssignments(branchId, weekStartIso, weekEndIso).then(setAssignments);
  }, [branchId, weekStartIso, weekEndIso]);

  const assignmentAt = (staffId: string, dateIso: string) => assignments.find((a) => a.staffId === staffId && a.date === dateIso);
  const templateLabel = (id: string) => {
    const t = templates.find((x) => x.id === id);
    return t ? `${t.name} (${t.startTime}-${t.endTime})` : "—";
  };

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title="Lịch phân ca"
        sub={`Chỉ xem — tuần ${weekStartIso} → ${weekEndIso}`}
        extra={
          <div style={{ display: "flex", gap: 8 }}>
            <Select
              style={{ width: 200 }}
              value={branchId}
              onChange={setBranchId}
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
            />
            <Button icon={<ChevronLeft size={14} />} onClick={() => setWeekStart((w) => addDays(w, -7))} />
            <Button icon={<ChevronRight size={14} />} onClick={() => setWeekStart((w) => addDays(w, 7))} />
          </div>
        }
      />

      {staff.length === 0 ? (
        <div style={{ fontSize: 13, color: "#a1a1aa", padding: "24px 0", textAlign: "center" }}>
          Chi nhánh này chưa có nhân viên đang hoạt động.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 12px", fontSize: 12.5, color: "#71717a", borderBottom: "1px solid var(--ant-color-border)" }}>Nhân viên</th>
                {weekDays.map((d, i) => (
                  <th key={i} style={{ textAlign: "center", padding: "8px 12px", fontSize: 12, color: "#71717a", borderBottom: "1px solid var(--ant-color-border)", minWidth: 120 }}>
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
                    const a = assignmentAt(s.id, toIso(d));
                    return (
                      <td key={i} style={{ padding: "6px 8px", borderBottom: "1px solid var(--ant-color-border)", textAlign: "center", fontSize: 12 }}>
                        {a ? templateLabel(a.shiftTemplateId) : <span style={{ color: "#d4d4d8" }}>—</span>}
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
