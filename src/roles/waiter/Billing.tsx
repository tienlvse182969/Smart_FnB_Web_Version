import { useEffect, useState } from "react";
import { App, Button, Card } from "antd";
import { BellRing, DoorClosed, Info, ReceiptText } from "lucide-react";
import { money, type TableSession } from "../../data";
import { SectionTitle } from "../../components/bits";
import { useWaiter } from "./store";

export default function Billing({ initialSessionId }: { initialSessionId: string | null }) {
  const store = useWaiter();
  const billable = store.sessions.filter((s) => s.status === "open" || s.status === "paid");
  const [selId, setSelId] = useState<string | null>(initialSessionId ?? billable[0]?.id ?? null);

  useEffect(() => {
    if (initialSessionId) setSelId(initialSessionId);
  }, [initialSessionId]);

  const sel = billable.find((s) => s.id === selId) ?? null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 5fr) minmax(0, 7fr)", gap: 16, alignItems: "start" }}>
      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Bàn đang có khách ({billable.length})</div>
        {billable.length === 0 ? (
          <div style={{ fontSize: 13, color: "#a1a1aa", padding: "24px 0", textAlign: "center" }}>
            Không có bàn nào cần tính tiền.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {billable.map((s) => {
              const active = s.id === selId;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelId(s.id)}
                  style={{
                    textAlign: "left",
                    cursor: "pointer",
                    border: `1.5px solid ${active ? "#0a0a0a" : "var(--ant-color-border)"}`,
                    background: active ? "#fafafa" : "#fff",
                    borderRadius: 12,
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    font: "inherit",
                  }}
                >
                  <div style={{ minWidth: 64 }}>
                    <div style={{ fontSize: 19, fontWeight: 700 }}>{s.tableIds.join(" + ")}</div>
                    <div style={{ fontSize: 12, color: "#a1a1aa" }}>{s.guests} khách</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{money(store.sessionTotal(s.id))}</div>
                    <div style={{ fontSize: 12, color: "#71717a" }}>{s.id} · mở {s.openedAt}</div>
                  </div>
                  {s.status === "paid" ? (
                    <Tag bg="#e7f7ec" color="#0a0a0a">Đã thanh toán</Tag>
                  ) : s.paymentRequested ? (
                    <Tag bg="#fff7e6" color="#7a5b00">Chờ thanh toán</Tag>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <BillPanel session={sel} />
    </div>
  );
}

function Tag({ children, bg, color }: { children: React.ReactNode; bg: string; color: string }) {
  return (
    <span style={{ fontSize: 11.5, fontWeight: 600, background: bg, color, borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function BillPanel({ session }: { session: TableSession | null }) {
  const store = useWaiter();
  const { message } = App.useApp();

  if (!session) {
    return (
      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 22 } }}>
        <div style={{ minHeight: 240, display: "grid", placeItems: "center", color: "#a1a1aa", fontSize: 13 }}>
          Chọn một bàn để xem hoá đơn.
        </div>
      </Card>
    );
  }

  const orders = store.ordersOfSession(session.id);
  const groups = orders
    .map((o) => ({
      orderId: o.id,
      createdAt: o.createdAt,
      lines: store.lines.filter((l) => l.orderId === o.id && l.status !== "cancelled" && l.status !== "sold-out"),
    }))
    .filter((g) => g.lines.length > 0);
  const total = store.sessionTotal(session.id);
  const paid = session.status === "paid";

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 22 } }}>
      <SectionTitle
        title={`Hoá đơn · bàn ${session.tableIds.join(" + ")}`}
        sub={`Phiên ${session.id} · ${session.guests} khách · mở ${session.openedAt}`}
      />

      <div style={{ border: "1px solid var(--ant-color-border)", borderRadius: 12, overflow: "hidden" }}>
        {groups.map((group, gi) => (
          <div key={group.orderId}>
            <div style={{ background: "#fafafa", padding: "8px 16px", fontSize: 12, color: "#71717a", fontWeight: 600, borderTop: gi === 0 ? "none" : "1px solid var(--ant-color-border)" }}>
              {gi === 0 ? "Gọi lần đầu" : `Gọi thêm ${gi}`} · {group.createdAt}
            </div>
            {group.lines.map((l) => (
              <div key={l.id} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "11px 16px", borderTop: "1px solid var(--ant-color-border)", fontSize: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>
                    {l.name} <span style={{ color: "#a1a1aa", fontWeight: 400 }}>× {l.qty}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "#a1a1aa" }}>
                    {money(l.unitPrice)}
                    {l.note ? ` · ${l.note}` : ""}
                  </div>
                </div>
                <div style={{ fontWeight: 600 }}>{money(l.unitPrice * l.qty)}</div>
              </div>
            ))}
          </div>
        ))}
        {groups.length === 0 && (
          <div style={{ padding: "20px 16px", color: "#a1a1aa", fontSize: 13 }}>Bàn chưa gọi món nào.</div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 16px", borderTop: "1.5px solid #0a0a0a" }}>
          <span style={{ fontWeight: 600 }}>Tổng cộng</span>
          <span style={{ fontSize: 22, fontWeight: 700 }}>{money(total)}</span>
        </div>
      </div>

      {/* Waiter chỉ báo quầy / đóng bàn — KHÔNG sinh QR, xác nhận tiền, in, sửa giá. */}
      {paid ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, fontSize: 13, color: "#52525b", background: "#e7f7ec", borderRadius: 10, padding: "10px 14px" }}>
            <Info size={16} />
            Quầy đã xác nhận thanh toán
            {session.paymentMethod ? ` · ${session.paymentMethod === "qr" ? "chuyển khoản QR" : "tiền mặt"}` : ""}
            {session.confirmedBy ? ` · ${session.confirmedBy}` : ""}
          </div>
          <Button
            type="primary"
            size="large"
            block
            icon={<DoorClosed size={18} />}
            style={{ marginTop: 12, height: 50, fontSize: 15 }}
            onClick={() => {
              store.closeTable(session.id);
              message.success(`Đã đóng bàn ${session.tableIds.join(" + ")} — bàn về trống`);
            }}
          >
            Đóng bàn
          </Button>
        </>
      ) : session.paymentRequested ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, fontSize: 13.5, color: "#7a5b00", background: "#fff7e6", border: "1px solid #ffe1a8", borderRadius: 10, padding: "12px 14px" }}>
          <BellRing size={17} />
          Đã báo quầy — chờ Branch Manager sinh QR / xác nhận tiền. Waiter mang QR ra bàn hoặc thu tiền mặt hộ.
        </div>
      ) : (
        <Button
          type="primary"
          size="large"
          block
          icon={<ReceiptText size={18} />}
          disabled={groups.length === 0}
          style={{ marginTop: 16, height: 50, fontSize: 15 }}
          onClick={() => {
            store.requestPayment(session.id);
            message.success("Đã báo quầy tính tiền");
          }}
        >
          Báo quầy tính tiền
        </Button>
      )}
    </Card>
  );
}
