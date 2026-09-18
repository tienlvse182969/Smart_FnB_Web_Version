import { App, Button, Segmented } from "antd";
import { ChefHat, LogOut } from "lucide-react";
import { useMemo, useState } from "react";
import RoleShell, { type NavItem } from "../../layout/RoleShell";
import type { KitchenQueueItem } from "../../types";
import { kitchenQueue } from "../../services/order.service";
import { NotInShiftScreen } from "../../components/bits";
import { useAppStore } from "../../store";
import TicketCard from "./TicketCard";

const nav: NavItem[] = [{ key: "queue", label: "Hàng đợi món", icon: <ChefHat size={18} /> }];

export default function KitchenApp({ onLogout }: { onLogout: () => void }) {
  const { message, modal } = App.useApp();
  const orderLines = useAppStore((s) => s.orderLines);
  const menuItems = useAppStore((s) => s.menuItems);
  const currentUser = useAppStore((s) => s.currentUser);
  const workSessions = useAppStore((s) => s.workSessions);
  const updateLineStatus = useAppStore((s) => s.updateLineStatus);
  const markLineDone = useAppStore((s) => s.markLineDone);
  const reportSoldOut = useAppStore((s) => s.reportSoldOut);

  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<"all" | KitchenQueueItem["status"]>("all");

  const tickets = useMemo(() => kitchenQueue(orderLines, menuItems), [orderLines, menuItems]);
  const categories = useMemo(() => [...new Set(tickets.map((t) => t.category))], [tickets]);

  const advance = async (orderLineId: string) => {
    const ticket = tickets.find((t) => t.orderLineId === orderLineId);
    if (!ticket) return;
    if (ticket.status === "queued") {
      await updateLineStatus(orderLineId, "cooking");
    } else if (ticket.status === "cooking") {
      // BR-10: bấm "xong" -> dòng món sang awaiting_pickup NGAY, tạo nhiệm vụ
      // bưng món chưa ai nhận, bắn cho mọi waiter đang trong ca qua BroadcastChannel.
      await markLineDone(orderLineId);
    }
  };

  const soldOut = (t: KitchenQueueItem) =>
    modal.confirm({
      title: `Báo hết “${t.name}”?`,
      content:
        "Món sẽ bị đánh dấu hết ở dòng order này và gửi cảnh báo cho Manager cùng mọi waiter của chi nhánh.",
      okText: "Báo hết món",
      cancelText: "Huỷ",
      okButtonProps: { danger: true },
      onOk: async () => {
        await reportSoldOut(t.orderLineId);
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

  // BR-43: chỉ nhận việc/thông báo khi đang trong ca — Manager check-in, không tự check-in.
  const inShift = workSessions.some((w) => w.staffId === currentUser?.id && w.status === "inShift");
  if (!inShift) return <NotInShiftScreen onLogout={onLogout} />;

  const footer = (
    <div style={{ padding: 12 }}>
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
      role="kitchen"
      nav={nav}
      section="queue"
      onSection={() => {}}
      onLogout={onLogout}
      searchPlaceholder="Tìm bàn, món…"
      branchChip={currentUser?.name}
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
                { label: "Xong", value: "awaiting_pickup" },
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
