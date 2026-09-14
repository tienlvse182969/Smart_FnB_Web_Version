import { Card } from "antd";
import { Hammer } from "lucide-react";
import type { ReactNode } from "react";

export const page: React.CSSProperties = { padding: 24 };

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
