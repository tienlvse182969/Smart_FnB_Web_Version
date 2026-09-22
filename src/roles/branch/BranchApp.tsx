import { useState } from "react";
import { Card, Col, Row, Segmented, Table, Tag } from "antd";
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
import { money } from "../../data";
import type { Payment as PaymentRecord, PaymentStatus } from "../../types";
import { minutesSinceISO } from "../../services/_utils";
import { SectionTitle, page } from "../../components/bits";
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

const paymentStatusMeta: Record<PaymentStatus, { label: string; bg: string; color: string }> = {
  initiated: { label: "Khởi tạo", bg: "#f4f4f5", color: "#0a0a0a" },
  awaiting_transfer: { label: "Chờ chuyển khoản", bg: "#fff3d6", color: "#0a0a0a" },
  cash_received: { label: "Chờ xác nhận tiền mặt", bg: "#fff3d6", color: "#0a0a0a" },
  confirmed: { label: "Đã xác nhận", bg: "#e7f7ec", color: "#0a0a0a" },
  failed: { label: "Lỗi · đối soát", bg: "#0a0a0a", color: "#fff" },
  expired: { label: "Hết hạn", bg: "#0a0a0a", color: "#fff" },
  partially_refunded: { label: "Hoàn một phần", bg: "#f4f4f5", color: "#0a0a0a" },
  refunded: { label: "Đã hoàn", bg: "#f4f4f5", color: "#0a0a0a" },
};

export default function BranchApp({ onLogout }: { onLogout: () => void }) {
  const branches = useAppStore((s) => s.branches);
  const currentBranchId = useAppStore((s) => s.currentBranchId);
  const payments = useAppStore((s) => s.payments);
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

        {section === "history" && (
          <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
            <SectionTitle title="Lịch sử giao dịch" sub="Toàn bộ giao dịch của chi nhánh trong ca hiện tại" />
            <Table<PaymentRecord>
              dataSource={payments}
              rowKey="id"
              pagination={false}
              size="middle"
              columns={[
                { title: "Mã hoá đơn", dataIndex: "invoiceCode", render: (v) => <span style={{ fontWeight: 600 }}>{v}</span> },
                { title: "Phiên", dataIndex: "sessionId" },
                { title: "Phương thức", dataIndex: "method", render: (m: "qr" | "cash") => (m === "qr" ? "VietQR" : "Tiền mặt") },
                { title: "Thu hộ / xác nhận", key: "who", render: (_, r) => r.confirmedBy ?? r.collectedBy ?? "—" },
                { title: "Tạo lúc", dataIndex: "createdAt", render: (v) => `${minutesSinceISO(v)} phút trước` },
                { title: "Số tiền", dataIndex: "amount", align: "right", render: (v) => money(v) },
                {
                  title: "Trạng thái",
                  dataIndex: "status",
                  render: (s: PaymentStatus) => (
                    <Tag style={{ background: paymentStatusMeta[s].bg, color: paymentStatusMeta[s].color, border: "none" }}>
                      {paymentStatusMeta[s].label}
                    </Tag>
                  ),
                },
              ]}
            />
          </Card>
        )}
      </div>
    </RoleShell>
  );
}
