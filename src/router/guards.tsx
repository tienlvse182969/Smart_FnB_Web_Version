import { Navigate } from "react-router-dom";
import { useAppStore } from "../store";
import type { RoleKey } from "../types";

interface RoleGuardProps {
  allowedRoles: RoleKey[];
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { currentUser, isBootstrapped } = useAppStore();

  if (!isBootstrapped) {
    return (
      <div
        style={{
          height: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#fff",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 36,
              height: 36,
              border: "3px solid #e4e4e7",
              borderTopColor: "#0a0a0a",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <div style={{ color: "#71717a", fontSize: 14 }}>Đang tải hệ thống...</div>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(currentUser.role)) {
    // Redirect to their respective workspace
    const roleRoutes: Record<RoleKey, string> = {
      admin: "/admin",
      owner: "/owner",
      manager: "/manager",
      waiter: "/waiter",
      kitchen: "/kitchen",
    };
    return <Navigate to={roleRoutes[currentUser.role] || "/login"} replace />;
  }

  return <>{children}</>;
}
