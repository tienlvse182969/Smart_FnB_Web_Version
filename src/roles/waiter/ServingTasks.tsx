import { useMemo } from "react";
import { App, Button, Card } from "antd";
import { Bell, Check, HandPlatter, Timer } from "lucide-react";
import { minutesSinceISO } from "../../services/_utils";
import { SectionTitle } from "../../components/bits";
import { useAppStore } from "../../store";

type ServeCard = {
  lineId: string;
  table: string;
  name: string;
  qty: number;
  note?: string;
  waited: number; // phút, tính từ doneAt
};

/** Ngưỡng cảnh báo theo phút chờ bưng (BR-12: 3 phút cảnh báo, 5 phút báo Manager). */
const warnStyle = (waited: number): { border: string; bg: string; tag: string; tagColor: string } => {
  if (waited >= 5)
    return { border: "#ffccc7", bg: "#fff1f0", tag: "#fff1f0", tagColor: "#a8071a" };
  if (waited >= 3)
    return { border: "#ffe1a8", bg: "#fff7e6", tag: "#fff7e6", tagColor: "#7a5b00" };
  return { border: "var(--ant-color-border)", bg: "#fff", tag: "#f4f4f5", tagColor: "#52525b" };
};

/**
 * Việc bưng món (mục 4.6.D, BR-11): mọi waiter đang trong ca thấy chung một
 * hàng đợi — ai bấm "Nhận việc" trước thì thắng; backend (`claimLine`) khoá
 * bằng cách chỉ còn 1 nhiệm vụ chưa ai nhận cho mỗi dòng món.
 */
export default function ServingTasks() {
  const { message } = App.useApp();
  const currentUser = useAppStore((s) => s.currentUser);
  const orderLines = useAppStore((s) => s.orderLines);
  const claimLine = useAppStore((s) => s.claimLine);
  const markLineServed = useAppStore((s) => s.markLineServed);

  const tableLabel = (tableIds?: string[]) =>
    tableIds ? tableIds.map((id) => id.split("-").pop()).join(" + ") : "—";

  // (a) Món đã xong, chờ bưng — toàn chi nhánh, chưa ai nhận.
  const waiting: ServeCard[] = useMemo(
    () =>
      orderLines
        .filter((l) => l.status === "awaiting_pickup" && !l.claimedBy)
        .map((l) => ({
          lineId: l.id,
          table: tableLabel(l.tableIds),
          name: l.name,
          qty: l.qty,
          note: l.note,
          waited: l.doneAt ? minutesSinceISO(l.doneAt) : 0,
        }))
        .sort((a, b) => b.waited - a.waited),
    [orderLines],
  );

  // (b) Việc của tôi — đã nhận, chưa phục vụ.
  const mine: ServeCard[] = useMemo(
    () =>
      orderLines
        .filter((l) => l.status === "awaiting_pickup" && l.claimedBy === currentUser?.name)
        .map((l) => ({
          lineId: l.id,
          table: tableLabel(l.tableIds),
          name: l.name,
          qty: l.qty,
          note: l.note,
          waited: l.doneAt ? minutesSinceISO(l.doneAt) : 0,
        }))
        .sort((a, b) => b.waited - a.waited),
    [orderLines, currentUser?.name],
  );

  const handleClaim = async (c: ServeCard) => {
    try {
      await claimLine(c.lineId);
      message.success(`Đã nhận bưng ${c.name} · bàn ${c.table}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Đã có người nhận");
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
        <SectionTitle title={`Món đã xong, chờ bưng (${waiting.length})`} sub="Toàn chi nhánh · ai nhận trước thì được" />
        {waiting.length === 0 ? (
          <Empty text="Chưa có món nào chờ bưng." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {waiting.map((c) => {
              const w = warnStyle(c.waited);
              return (
                <div key={c.lineId} style={{ border: `1.5px solid ${w.border}`, background: w.bg, borderRadius: 14, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 13, color: "#71717a" }}>Bàn</div>
                      <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{c.table}</div>
                    </div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600, background: w.tag, color: w.tagColor, borderRadius: 999, padding: "4px 10px" }}>
                      <Timer size={14} /> chờ {c.waited}’
                    </span>
                  </div>
                  <div style={{ marginTop: 12, fontSize: 17, fontWeight: 600 }}>
                    <span style={{ fontWeight: 700 }}>×{c.qty}</span> {c.name}
                  </div>
                  {c.note && <div style={{ fontSize: 13, color: "#7a5b00", marginTop: 4 }}>✎ {c.note}</div>}
                  <Button
                    type="primary"
                    size="large"
                    block
                    icon={<Bell size={18} />}
                    style={{ marginTop: 14, height: 48 }}
                    onClick={() => handleClaim(c)}
                  >
                    Nhận việc
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
        <SectionTitle title={`Việc của tôi (${mine.length})`} sub={currentUser?.name ?? ""} />
        {mine.length === 0 ? (
          <Empty text="Bạn chưa nhận việc bưng nào." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {mine.map((c) => {
              const w = warnStyle(c.waited);
              return (
                <div key={c.lineId} style={{ border: `1.5px solid ${w.border}`, background: w.bg, borderRadius: 14, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 17, fontWeight: 600 }}>
                      <span style={{ fontWeight: 700 }}>×{c.qty}</span> {c.name}
                    </div>
                    <span style={{ fontSize: 20, fontWeight: 700 }}>{c.table}</span>
                  </div>
                  {c.note && <div style={{ fontSize: 13, color: "#7a5b00", marginTop: 4 }}>✎ {c.note}</div>}
                  <Button
                    size="large"
                    block
                    icon={<Check size={18} />}
                    style={{ marginTop: 14, height: 48 }}
                    onClick={async () => {
                      await markLineServed(c.lineId);
                      message.success(`Đã phục vụ ${c.name} · bàn ${c.table}`);
                    }}
                  >
                    Đã phục vụ
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{ minHeight: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "#a1a1aa" }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: "#f4f4f5", display: "grid", placeItems: "center", color: "#71717a" }}>
        <HandPlatter size={22} />
      </div>
      <div style={{ fontSize: 13.5 }}>{text}</div>
    </div>
  );
}
