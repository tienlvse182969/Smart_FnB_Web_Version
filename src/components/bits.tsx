import { Button, Card } from "antd";
import { Hammer, LogOut, UserX } from "lucide-react";
import type { ReactNode } from "react";

export const page: React.CSSProperties = { padding: 24 };

/**
 * BR-43: chỉ nhân viên đang trong ca (đã check-in, chưa check-out) mới nhận
 * việc/thông báo. Waiter/Kitchen đăng nhập mà chưa được Manager check-in thì
 * chặn hẳn màn hình vận hành, không chỉ ẩn từng thông báo riêng lẻ.
 */
export function NotInShiftScreen({ onLogout }: { onLogout: () => void }) {
  return (
    <div style={{ height: "100vh", display: "grid", placeItems: "center", background: "#fff" }}>
      <div style={{ textAlign: "center", maxWidth: 360, padding: 24 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "#f4f4f5", display: "grid", placeItems: "center", margin: "0 auto 18px", color: "#71717a" }}>
          <UserX size={26} />
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Bạn chưa vào ca</div>
        <div style={{ fontSize: 13.5, color: "#71717a", lineHeight: 1.6, marginBottom: 22 }}>
          Nhờ Branch Manager check-in cho bạn ở quầy trước khi bắt đầu — chỉ nhân viên đang trong ca mới nhận được việc và thông báo (BR-43).
        </div>
        <Button icon={<LogOut size={15} />} onClick={onLogout}>
          Đăng xuất
        </Button>
      </div>
    </div>
  );
}

/** Placeholder for screens that are not built yet. */
export function EmptyState({ title }: { title: string }) {
  return (
    <>
      <SectionTitle title={title} />
      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
        <div
          style={{
            minHeight: 320,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            color: "#a1a1aa",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 13,
              background: "#f4f4f5",
              display: "grid",
              placeItems: "center",
              color: "#71717a",
            }}
          >
            <Hammer size={24} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#71717a" }}>
            Đang xây dựng
          </div>
        </div>
      </Card>
    </>
  );
}

/** Section heading with optional trailing controls. */
export function SectionTitle({
  title,
  sub,
  extra,
}: {
  title: string;
  sub?: string;
  extra?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        marginBottom: 14,
      }}
    >
      <div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
        {sub && <div style={{ fontSize: 12.5, color: "#71717a", marginTop: 2 }}>{sub}</div>}
      </div>
      {extra}
    </div>
  );
}

/** Compact KPI tile in the monochrome style. */
export function StatCard({
  label,
  value,
  hint,
  icon,
  emphasis,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <Card
      styles={{ body: { padding: 18 } }}
      style={{
        borderRadius: 14,
        background: emphasis ? "#0a0a0a" : "#fff",
        color: emphasis ? "#fff" : undefined,
        borderColor: emphasis ? "#0a0a0a" : undefined,
        height: "100%",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          style={{
            fontSize: 12.5,
            color: emphasis ? "rgba(255,255,255,0.6)" : "#71717a",
          }}
        >
          {label}
        </span>
        {icon && (
          <span style={{ color: emphasis ? "rgba(255,255,255,0.75)" : "#a1a1aa" }}>{icon}</span>
        )}
      </div>
      <div style={{ fontSize: 27, fontWeight: 700, marginTop: 10, letterSpacing: -0.5 }}>
        {value}
      </div>
      {hint && (
        <div
          style={{
            fontSize: 12,
            marginTop: 6,
            color: emphasis ? "rgba(255,255,255,0.55)" : "#a1a1aa",
          }}
        >
          {hint}
        </div>
      )}
    </Card>
  );
}
