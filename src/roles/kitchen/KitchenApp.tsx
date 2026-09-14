import { App, Button, Segmented } from "antd";
import { ChefHat, LogOut } from "lucide-react";
import { useMemo, useState } from "react";
import RoleShell, { type NavItem } from "../../layout/RoleShell";
import { kitchenQueue, nowLabel, orderLines, type KitchenQueueItem, type TicketStatus } from "../../data";
import TicketCard from "./TicketCard";

const nav: NavItem[] = [{ key: "queue", label: "Hàng đợi món", icon: <ChefHat size={18} /> }];

export default function KitchenApp({ onLogout }: { onLogout: () => void }) {
  const { message, modal } = App.useApp();
  const [tickets, setTickets] = useState<KitchenQueueItem[]>(() => kitchenQueue());
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<"all" | TicketStatus>("all");

  const categories = useMemo(
    () => [...new Set(kitchenQueue().map((t) => t.category))],
    [],
  );

  const advance = (orderLineId: string) => {
    // Ghi mốc thời gian riêng của dòng món: bắt đầu làm / làm xong.
    const line = orderLines.find((l) => l.id === orderLineId);
    if (line) {
      if (line.status === "queued") {
        line.status = "cooking";
        line.startedAt = nowLabel();
      } else if (line.status === "cooking") {
        line.status = "done";
        line.doneAt = nowLabel();
      }
    }
    setTickets((p) =>
      p.map((t) =>
        t.orderLineId === orderLineId
          ? { ...t, status: t.status === "queued" ? "cooking" : "done" }
          : t,
      ),
    );
  };

  const soldOut = (t: KitchenQueueItem) =>
    modal.confirm({
      title: `Báo hết “${t.name}”?`,
      content:
        "Món sẽ bị ẩn khỏi menu toàn chi nhánh và waiter của bàn được cảnh báo để đổi món hoặc hoàn tiền.",
      okText: "Báo hết món",
      cancelText: "Huỷ",
      okButtonProps: { danger: true },
      onOk: () => {
        setTickets((p) => p.filter((x) => x.orderLineId !== t.orderLineId));
        message.warning(`Đã báo hết ${t.name} — cảnh báo bàn ${t.table}`);
      },
    });

  const visible = useMemo(
    () =>
      tickets.filter(
        (t) =>
          (category === "all" || t.category === category) &&
          (status === "all" || t.status === status),
      ),
    [tickets, category, status],
  );

  const footer = (
    <div style={{ padding: 12 }}>
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
      role="kitchen"
      nav={nav}
      section="queue"
      onSection={() => {}}
      onLogout={onLogout}
      searchPlaceholder="Tìm bàn, món…"
      footer={footer}
    >
      <div style={{ padding: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: "#0a0a0a",
                display: "grid",
                placeItems: "center",
              }}
            >
              <ChefHat size={24} color="#fff" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20, fontWeight: 700 }}>Hàng đợi bếp</span>
                <span
                  style={{
                    background: "#e7f7ec",
                    color: "#0a0a0a",
                    padding: "2px 10px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  ● Đã check-in ca
                </span>
              </div>
              <div style={{ color: "#71717a", fontSize: 13.5 }}>
                {tickets.length} món · sắp theo thứ tự nhận order
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <Segmented
              size="large"
              value={category}
              onChange={(v) => setCategory(v as string)}
              options={[
                { label: "Tất cả món", value: "all" },
                ...categories.map((c) => ({ label: c, value: c })),
              ]}
            />
            <Segmented
              size="large"
              value={status}
              onChange={(v) => setStatus(v as typeof status)}
              options={[
                { label: "Tất cả", value: "all" },
                { label: "Chờ", value: "queued" },
                { label: "Đang làm", value: "cooking" },
                { label: "Xong", value: "done" },
              ]}
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 16,
          }}
        >
          {visible.map((t) => (
            <TicketCard key={t.orderLineId} ticket={t} onAdvance={advance} onSoldOut={soldOut} />
          ))}
        </div>
      </div>
    </RoleShell>
  );
}
