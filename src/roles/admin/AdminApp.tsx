import { useState } from "react";
import { Col, Row } from "antd";
import { Building2, LayoutDashboard, ScrollText, UserPlus } from "lucide-react";
import RoleShell, { type NavItem } from "../../layout/RoleShell";
import { page } from "../../components/bits";
import Kpis from "./Kpis";
import TenantsTable from "./TenantsTable";
import SignupRequests from "./SignupRequests";
import AuditLog from "./AuditLog";

const nav: NavItem[] = [
  { key: "overview", label: "Tổng quan", icon: <LayoutDashboard size={18} /> },
  { key: "tenants", label: "Doanh nghiệp", icon: <Building2 size={18} /> },
  { key: "signups", label: "Đăng ký", icon: <UserPlus size={18} /> },
  { key: "audit", label: "Nhật ký", icon: <ScrollText size={18} /> },
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
        {section === "audit" && <AuditLog />}
      </div>
    </RoleShell>
  );
}
