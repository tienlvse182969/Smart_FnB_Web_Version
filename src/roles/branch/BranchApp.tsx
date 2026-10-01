import { useState } from "react";
import { Col, Row } from "antd";
import { Building2, LayoutDashboard, UsersRound, UtensilsCrossed } from "lucide-react";
import RoleShell, { type NavItem } from "../../layout/RoleShell";
import { page } from "../../components/bits";
import { useAppStore } from "../../store";
import Kpis from "./Kpis";
import RevenueChart from "./RevenueChart";
import BranchMenu from "./BranchMenu";
import StaffTable from "./StaffTable";
import BranchInfo from "./BranchInfo";

const nav: NavItem[] = [
  { key: "dashboard", label: "Tổng quan", icon: <LayoutDashboard size={18} /> },
  { key: "branch-info", label: "Thông tin chi nhánh", icon: <Building2 size={18} /> },
  { key: "menu", label: "Món tại chi nhánh", icon: <UtensilsCrossed size={18} /> },
  { key: "staff", label: "Nhân viên", icon: <UsersRound size={18} /> },
];

export default function BranchApp({ onLogout }: { onLogout: () => void }) {
  const branches = useAppStore((s) => s.branches);
  const currentBranchId = useAppStore((s) => s.currentBranchId);
  const [section, setSection] = useState("dashboard");

  const branchName = branches.find((b) => b.id === currentBranchId)?.name ?? "";

  return (
    <RoleShell
      role="manager"
      nav={nav}
      section={section}
      onSection={setSection}
      onLogout={onLogout}
      branchChip={branchName}
      searchPlaceholder="Tìm món, nhân viên, đơn…"
    >
      <div style={page}>
        {section === "dashboard" && (
          <>
            <Kpis />
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col xs={24}>
                <RevenueChart />
              </Col>
            </Row>
          </>
        )}
        {section === "branch-info" && <BranchInfo />}
        {section === "menu" && <BranchMenu />}
        {section === "staff" && <StaffTable />}
      </div>
    </RoleShell>
  );
}
