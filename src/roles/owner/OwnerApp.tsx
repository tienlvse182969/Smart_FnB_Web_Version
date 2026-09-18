import { useState } from "react";
import { Col, Row, Tabs } from "antd";
import {
  Banknote,
  CalendarDays,
  LayoutDashboard,
  Settings,
  Sparkles,
  Store,
  UserCog,
  UtensilsCrossed,
} from "lucide-react";
import RoleShell, { type NavItem } from "../../layout/RoleShell";
import { page } from "../../components/bits";
import Kpis from "./Kpis";
import RevenueChart from "./RevenueChart";
import MenuTable from "./MenuTable";
import Branches from "./Branches";
import ManagerAccounts from "./ManagerAccounts";
import Wallet from "./Wallet";
import Branding from "./Branding";
import ShiftScheduleView from "./ShiftScheduleView";
import AiAssistant from "./AiAssistant";

const nav: NavItem[] = [
  { key: "dashboard", label: "Tổng quan", icon: <LayoutDashboard size={18} /> },
  { key: "branches", label: "Chi nhánh", icon: <Store size={18} /> },
  { key: "menu", label: "Menu toàn chuỗi", icon: <UtensilsCrossed size={18} /> },
  { key: "accounts", label: "Tài khoản quản lý", icon: <UserCog size={18} /> },
  { key: "shifts", label: "Lịch phân ca", icon: <CalendarDays size={18} /> },
  { key: "wallet", label: "Ví doanh nghiệp", icon: <Banknote size={18} /> },
  { key: "ai", label: "Trợ lý số liệu", icon: <Sparkles size={18} /> },
  { key: "settings", label: "Cài đặt doanh nghiệp", icon: <Settings size={18} /> },
];

export default function OwnerApp({ onLogout }: { onLogout: () => void }) {
  const [section, setSection] = useState("dashboard");

  return (
    <RoleShell
      role="owner"
      nav={nav}
      section={section}
      onSection={setSection}
      onLogout={onLogout}
      searchPlaceholder="Tìm chi nhánh, món, tài khoản…"
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
            <div style={{ marginTop: 16 }}>
              <MenuTable />
            </div>
          </>
        )}
        {section === "branches" && <Branches />}
        {section === "menu" && <MenuTable />}
        {section === "accounts" && <ManagerAccounts />}
        {section === "shifts" && <ShiftScheduleView />}
        {section === "wallet" && <Wallet />}
        {section === "ai" && <AiAssistant />}
        {section === "settings" && (
          <Tabs items={[{ key: "branding", label: "Nhận diện", children: <Branding /> }]} />
        )}
      </div>
    </RoleShell>
  );
}
