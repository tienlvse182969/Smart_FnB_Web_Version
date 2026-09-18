import { useState } from "react";
import { Col, Row } from "antd";
import { Banknote, Building2, LayoutDashboard, Package, ScrollText, Settings, UserPlus } from "lucide-react";
import RoleShell, { type NavItem } from "../../layout/RoleShell";
import { page } from "../../components/bits";
import { FEATURE_FLAGS } from "../../config";
import Kpis from "./Kpis";
import TenantsTable from "./TenantsTable";
import SignupRequests from "./SignupRequests";
import AuditLog from "./AuditLog";
import PlansTable from "./PlansTable";
import Withdrawals from "./Withdrawals";
import PlatformSettings from "./PlatformSettings";

const nav: NavItem[] = [
  { key: "overview", label: "Tổng quan", icon: <LayoutDashboard size={18} /> },
  { key: "tenants", label: "Doanh nghiệp", icon: <Building2 size={18} /> },
  { key: "signups", label: "Đăng ký", icon: <UserPlus size={18} /> },
  { key: "plans", label: "Gói dịch vụ", icon: <Package size={18} /> },
  { key: "withdrawals", label: "Yêu cầu rút tiền", icon: <Banknote size={18} /> },
  { key: "platform", label: "Cấu hình & quyết toán", icon: <Settings size={18} /> },
  // Nhật ký (Audit log) là tính năng giai đoạn 2 — ẩn khỏi menu chính, xem src/config.ts.
  ...(FEATURE_FLAGS.auditLog
    ? [{ key: "audit", label: "Nhật ký (GĐ2)", icon: <ScrollText size={18} /> }]
    : []),
];

export default function AdminApp({ onLogout }: { onLogout: () => void }) {
  const [section, setSection] = useState("overview");

  return (
    <RoleShell
      role="admin"
      nav={nav}
      section={section}
      onSection={setSection}
      onLogout={onLogout}
      searchPlaceholder="Tìm doanh nghiệp, mã tenant…"
    >
      <div style={page}>
        {section === "overview" && (
          <>
            <Kpis />
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col xs={24} lg={15}>
                <TenantsTable />
              </Col>
              <Col xs={24} lg={9}>
                <SignupRequests />
              </Col>
            </Row>
          </>
        )}
        {section === "tenants" && <TenantsTable />}
        {section === "signups" && (
          <div style={{ maxWidth: 560 }}>
            <SignupRequests />
          </div>
        )}
        {section === "plans" && <PlansTable />}
        {section === "withdrawals" && <Withdrawals />}
        {section === "platform" && <PlatformSettings />}
        {section === "audit" && <AuditLog />}
      </div>
    </RoleShell>
  );
}
