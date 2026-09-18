import { useState } from "react";
import { Button } from "antd";
import { HandPlatter, LayoutGrid, LogOut, ReceiptText, Utensils } from "lucide-react";
import RoleShell, { type NavItem } from "../../layout/RoleShell";
import { NotInShiftScreen, page } from "../../components/bits";
import { useAppStore } from "../../store";
import TableMap from "./TableMap";
import OrderScreen from "./OrderScreen";
import ServingTasks from "./ServingTasks";
import Billing from "./Billing";

const nav: NavItem[] = [
  { key: "floor", label: "Sơ đồ bàn", icon: <LayoutGrid size={18} /> },
  { key: "orders", label: "Order đang mở", icon: <Utensils size={18} /> },
  { key: "serving", label: "Việc bưng món", icon: <HandPlatter size={18} /> },
  { key: "checkout", label: "Tính tiền", icon: <ReceiptText size={18} /> },
];

export default function WaiterApp({ onLogout }: { onLogout: () => void }) {
  const currentUser = useAppStore((s) => s.currentUser);
  const workSessions = useAppStore((s) => s.workSessions);
  const [section, setSection] = useState("floor");
  // Bàn đang thao tác — chia sẻ khi chuyển giữa sơ đồ → ghi order → tính tiền.
  const [activeSession, setActiveSession] = useState<string | null>(null);

  // BR-43: chỉ nhận việc/thông báo khi đang trong ca — Manager check-in, không tự check-in.
  const inShift = workSessions.some((w) => w.staffId === currentUser?.id && w.status === "inShift");
  if (!inShift) return <NotInShiftScreen onLogout={onLogout} />;

  const footer = (
    <div style={{ padding: 12 }}>
      <div style={{ padding: "0 8px 10px", color: "var(--sider-fg-dim)", fontSize: 12 }}>
        Đang trực ca: <span style={{ color: "var(--sider-fg)", fontWeight: 600 }}>{currentUser?.name}</span>
      </div>
      <Button
        block
        icon={<LogOut size={16} />}
        onClick={onLogout}
        style={{ background: "var(--sider-btn-bg)", color: "var(--sider-fg)", borderColor: "transparent" }}
      >
        Đăng xuất
      </Button>
    </div>
  );

  return (
    <RoleShell
      role="waiter"
      nav={nav}
      section={section}
      onSection={setSection}
      onLogout={onLogout}
      searchPlaceholder="Tìm bàn, order…"
      branchChip={currentUser?.name}
      footer={footer}
    >
      <div style={page}>
        {section === "floor" && (
          <TableMap
            onOpenOrder={(id) => {
              setActiveSession(id);
              setSection("orders");
            }}
            onOpenBilling={(id) => {
              setActiveSession(id);
              setSection("checkout");
            }}
          />
        )}
        {section === "orders" && (
          <OrderScreen
            sessionId={activeSession}
            onSent={() => setSection("serving")}
            onGoFloor={() => setSection("floor")}
          />
        )}
        {section === "serving" && <ServingTasks />}
        {section === "checkout" && <Billing initialSessionId={activeSession} />}
      </div>
    </RoleShell>
  );
}
