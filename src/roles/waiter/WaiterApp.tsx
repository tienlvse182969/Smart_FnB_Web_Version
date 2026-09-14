import { useState } from "react";
import { Button } from "antd";
import { HandPlatter, LayoutGrid, LogOut, ReceiptText, Utensils } from "lucide-react";
import RoleShell, { type NavItem } from "../../layout/RoleShell";
import { page } from "../../components/bits";
import { CURRENT_WAITER, WaiterStoreProvider } from "./store";
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

function WaiterWorkspace({ onLogout }: { onLogout: () => void }) {
  const [section, setSection] = useState("floor");
  // Bàn đang thao tác — chia sẻ khi chuyển giữa sơ đồ → ghi order → tính tiền.
  const [activeSession, setActiveSession] = useState<string | null>(null);

  const footer = (
    <div style={{ padding: 12 }}>
      <div style={{ padding: "0 8px 10px", color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
        Đang trực ca: <span style={{ color: "#fff", fontWeight: 600 }}>{CURRENT_WAITER}</span>
      </div>
      <Button
        block
        icon={<LogOut size={16} />}
        onClick={onLogout}
        style={{ background: "rgba(255,255,255,0.08)", color: "#fff", borderColor: "transparent" }}
      >
        Check-out ca làm
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
      branchChip={CURRENT_WAITER}
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

export default function WaiterApp({ onLogout }: { onLogout: () => void }) {
  return (
    <WaiterStoreProvider>
      <WaiterWorkspace onLogout={onLogout} />
    </WaiterStoreProvider>
  );
}
