import { useState } from "react";
import { App as AntApp, ConfigProvider } from "antd";
import { monoTheme } from "./theme";
import type { RoleKey } from "./data";
import LoginScreen from "./auth/LoginScreen";
import AdminApp from "./roles/admin/AdminApp";
import OwnerApp from "./roles/owner/OwnerApp";
import BranchApp from "./roles/branch/BranchApp";
import WaiterApp from "./roles/waiter/WaiterApp";
import KitchenApp from "./roles/kitchen/KitchenApp";

export default function App() {
  const [role, setRole] = useState<RoleKey | null>(null);
  const logout = () => setRole(null);

  const workspace: Record<RoleKey, React.ReactNode> = {
    admin: <AdminApp onLogout={logout} />,
    owner: <OwnerApp onLogout={logout} />,
    branch: <BranchApp onLogout={logout} />,
    waiter: <WaiterApp onLogout={logout} />,
    kitchen: <KitchenApp onLogout={logout} />,
  };

  return (
    <ConfigProvider theme={monoTheme}>
      <AntApp>
        {role === null ? <LoginScreen onLogin={setRole} /> : workspace[role]}
      </AntApp>
    </ConfigProvider>
  );
}
