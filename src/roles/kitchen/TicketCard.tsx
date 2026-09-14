import { Button } from "antd";
import { Ban, Check, Flame, Timer } from "lucide-react";
import { type KitchenQueueItem, type TicketStatus } from "../../data";

const statusLabel: Record<TicketStatus, string> = {
  queued: "Trong hàng đợi",
  cooking: "Đang làm",
  done: "Xong · chờ bưng",
};

export default function TicketCard({
  ticket,
  onAdvance,
  onSoldOut,
}: {
  ticket: KitchenQueueItem;
  onAdvance: (id: string) => void;
  onSoldOut: (t: KitchenQueueItem) => void;
}) {
  const t = ticket;
  const cooking = t.status === "cooking";
  const done = t.status === "done";

  return (
    <div
      style={{
        border: `1.5px solid ${cooking ? "#0a0a0a" : "var(--ant-color-border)"}`,
        background: done ? "#fafafa" : "#fff",
        borderRadius: 16,
        padding: 18,
        opacity: done ? 0.85 : 1,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1 }}>
          Bàn {t.table}
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: "4px 10px",
            borderRadius: 999,
            background: cooking ? "#0a0a0a" : "#f4f4f5",
            color: cooking ? "#fff" : "#52525b",
          }}
        >
          {statusLabel[t.status]}
        </span>
      </div>

      <div style={{ marginTop: 14, display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 22, fontWeight: 700 }}>×{t.qty}</span>
        <span style={{ fontSize: 19, fontWeight: 500 }}>{t.name}</span>
      </div>
      {t.note && (
        <div
          style={{
            marginTop: 8,
            fontSize: 14.5,
            background: "#fff7e6",
            border: "1px solid #ffe1a8",
            color: "#7a5b00",
            padding: "6px 10px",
            borderRadius: 8,
          }}
        >
          ✎ {t.note}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 16,
          margin: "14px 0",
          fontSize: 13.5,
          color: "#71717a",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Timer size={16} /> đã chờ {t.waited} phút
        </span>
        <span style={{ color: "#a1a1aa" }}>· {t.category}</span>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {!done && (
          <Button
            type="primary"
            size="large"
            block
            icon={cooking ? <Check size={18} /> : <Flame size={18} />}
            onClick={() => onAdvance(t.orderLineId)}
          >
            {cooking ? "Xong" : "Bắt đầu làm"}
          </Button>
        )}
        {done && (
          <Button size="large" block disabled icon={<Check size={18} />}>
            Đã báo waiter bưng
          </Button>
        )}
        {!done && (
          <Button size="large" icon={<Ban size={18} />} onClick={() => onSoldOut(t)} title="Báo hết món" />
        )}
      </div>
    </div>
  );
}
