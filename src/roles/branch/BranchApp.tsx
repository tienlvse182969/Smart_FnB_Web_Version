import { useState } from "react";
import { Col, Row, Segmented } from "antd";
import {
  Banknote,
  Building2,
  CalendarClock,
  CalendarDays,
  History,
  LayoutDashboard,
  LayoutGrid,
  LogIn,
  UsersRound,
  UtensilsCrossed,
} from "lucide-react";
import RoleShell, { type NavItem } from "../../layout/RoleShell";
import { page } from "../../components/bits";
import { useAppStore } from "../../store";
import Kpis from "./Kpis";
import RevenueChart from "./RevenueChart";
import FloorPlan from "./FloorPlan";
import BranchMenu from "./BranchMenu";
import StaffTable from "./StaffTable";
import Payment from "./Payment";
import ShiftTemplates from "./ShiftTemplates";
import ShiftSchedule from "./ShiftSchedule";
import ShiftCheckInOut from "./ShiftCheckInOut";
import ShiftDashboardBlock from "./ShiftDashboardBlock";
import PaymentHistory from "./PaymentHistory";
import BranchInfo from "./BranchInfo";

/**
 * Mục 4.5: giao diện Branch Manager tách 2 chế độ — Quầy (việc trong ca) và
 * Quản trị (việc ngoài ca). "Ca mẫu"/"Phân ca" (Quản trị) và "Check-in /
 * Check-out ca" (Quầy) nay dùng đúng mô hình ca làm thật (WorkSession/
 * ShiftAssignment/ShiftTemplate — BR-42→BR-48), không còn tạm trỏ vào
 * `StaffTable` (StaffTable chỉ còn quản lý tài khoản, xem `staff.service.ts`).
 */
type WorkspaceMode = "counter" | "admin";

const counterNav: NavItem[] = [
  { key: "dashboard", label: "Tổng quan", icon: <LayoutDashboard size={18} /> },
  { key: "payment", label: "Thanh toán", icon: <Banknote size={18} /> },
  { key: "history", label: "Lịch sử giao dịch", icon: <History size={18} /> },
  { key: "shift-checkin", label: "Check-in / Check-out ca", icon: <LogIn size={18} /> },
];

const adminNav: NavItem[] = [
  { key: "branch-info", label: "Thông tin chi nhánh", icon: <Building2 size={18} /> },
  { key: "floor", label: "Sơ đồ bàn", icon: <LayoutGrid size={18} /> },
  { key: "menu", label: "Món tại chi nhánh", icon: <UtensilsCrossed size={18} /> },
  { key: "staff", label: "Nhân viên", icon: <UsersRound size={18} /> },
  { key: "shift-templates", label: "Ca mẫu", icon: <CalendarClock size={18} /> },
  { key: "shift-schedule", label: "Phân ca", icon: <CalendarDays size={18} /> },
];

const defaultSectionOf: Record<WorkspaceMode, string> = {
  counter: "dashboard",
  admin: "floor",
};

export default function BranchApp({ onLogout }: { onLogout: () => void }) {
  const branches = useAppStore((s) => s.branches);
  const currentBranchId = useAppStore((s) => s.currentBranchId);
  const [mode, setMode] = useState<WorkspaceMode>("counter");
  const [section, setSection] = useState(defaultSectionOf.counter);

  const branchName = branches.find((b) => b.id === currentBranchId)?.name ?? "";

  const handleModeChange = (next: WorkspaceMode) => {
    setMode(next);
    setSection(defaultSectionOf[next]);
  };

  return (
    <RoleShell
      role="manager"
      nav={mode === "counter" ? counterNav : adminNav}
      section={section}
      onSection={setSection}
      onLogout={onLogout}
      branchChip={branchName}
      searchPlaceholder="Tìm bàn, món, nhân viên, đơn…"
    >
      <div style={page}>
        <Segmented
          size="large"
          value={mode}
          onChange={(v) => handleModeChange(v as WorkspaceMode)}
          options={[
            { label: "Quầy — việc trong ca", value: "counter" },
            { label: "Quản trị — ngoài ca", value: "admin" },
          ]}
          style={{ marginBottom: 18 }}
        />

        {section === "dashboard" && (
          <>
            <Kpis />
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col xs={24}>
                <RevenueChart />
              </Col>
            </Row>
            <ShiftDashboardBlock />
          </>
        )}
        {section === "branch-info" && <BranchInfo />}
        {section === "floor" && <FloorPlan />}
        {section === "menu" && <BranchMenu />}
        {section === "staff" && <StaffTable />}
        {section === "shift-checkin" && <ShiftCheckInOut />}
        {section === "shift-templates" && <ShiftTemplates />}
        {section === "shift-schedule" && <ShiftSchedule />}
        {section === "payment" && <Payment />}

        {section === "history" && <PaymentHistory />}
      </div>
    </RoleShell>
  );
}
