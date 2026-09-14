import { useMemo, useState } from "react";
import { App, Button, Card, Input, Segmented } from "antd";
import { Lock, Minus, Pencil, Plus, Send, Trash2, Utensils } from "lucide-react";
import { money } from "../../data";
import { SectionTitle } from "../../components/bits";
import { useWaiter, type CartItem, type WaiterMenuItem } from "./store";

export default function OrderScreen({
  sessionId,
  onSent,
  onGoFloor,
}: {
  sessionId: string | null;
  onSent: () => void;
  onGoFloor: () => void;
}) {
  const store = useWaiter();
  const { message } = App.useApp();
  const session = store.sessions.find((s) => s.id === sessionId && s.status === "open") ?? null;

  const categories = useMemo(() => [...new Set(store.menu.map((m) => m.category))], [store.menu]);
  const [cat, setCat] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);

  if (!session) {
    return (
      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 40 } }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, color: "#a1a1aa" }}>
          <div style={{ width: 52, height: 52, borderRadius: 13, background: "#f4f4f5", display: "grid", placeItems: "center", color: "#71717a" }}>
            <Utensils size={24} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#71717a" }}>Chưa chọn bàn để ghi order</div>
          <Button size="large" type="primary" onClick={onGoFloor}>Về sơ đồ bàn chọn bàn</Button>
        </div>
      </Card>
    );
  }

  const visibleMenu = store.menu.filter((m) => cat === "all" || m.category === cat);

  const addToCart = (m: WaiterMenuItem) => {
    if (!m.available) return;
    setCart((p) => {
      const found = p.find((c) => c.menuItemId === m.id && !c.note);
      if (found) return p.map((c) => (c === found ? { ...c, qty: c.qty + 1 } : c));
      return [...p, { menuItemId: m.id, name: m.name, unitPrice: m.price, qty: 1 }];
    });
  };

  const setQty = (idx: number, qty: number) =>
    setCart((p) => (qty <= 0 ? p.filter((_, i) => i !== idx) : p.map((c, i) => (i === idx ? { ...c, qty } : c))));
  const setNote = (idx: number, note: string) =>
    setCart((p) => p.map((c, i) => (i === idx ? { ...c, note } : c)));

  const cartTotal = cart.reduce((s, c) => s + c.unitPrice * c.qty, 0);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  const send = () => {
    if (cart.length === 0) return;
    const res = store.submitOrder(session.id, cart);
    if (!res.ok) {
      message.error(`Vừa hết suất: ${res.soldOut.join(", ")} — bỏ khỏi giỏ rồi gửi lại`);
      return;
    }
    setCart([]);
    message.success(`Đã gửi bếp ${cartCount} món · bàn ${session.tableIds.join(" + ")}`);
    onSent();
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 7fr) minmax(0, 5fr)", gap: 16, alignItems: "start" }}>
      {/* Trái — menu */}
      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
        <SectionTitle
          title={`Ghi order · bàn ${session.tableIds.join(" + ")}`}
          sub={`${session.guests} khách · đưa tablet cho khách chọn món`}
        />
        <Segmented
          size="large"
          block
          value={cat}
          onChange={(v) => setCat(v as string)}
          options={[{ label: "Tất cả", value: "all" }, ...categories.map((c) => ({ label: c, value: c }))]}
          style={{ marginBottom: 16 }}
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
          {visibleMenu.map((m) => {
            const low = m.remaining !== null && m.remaining <= 5;
            return (
              <button
                key={m.id}
                disabled={!m.available}
                onClick={() => addToCart(m)}
                style={{
                  border: "1.5px solid var(--ant-color-border)",
                  borderRadius: 14,
                  padding: 16,
                  minHeight: 104,
                  background: "#fff",
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  cursor: m.available ? "pointer" : "not-allowed",
                  opacity: m.available ? 1 : 0.45,
                  font: "inherit",
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>{m.name}</div>
                <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10 }}>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{money(m.price)}</span>
                  {!m.available ? (
                    <span style={{ fontSize: 11.5, color: "#a1a1aa" }}>Hết / ngưng</span>
                  ) : low ? (
                    <span style={{ fontSize: 11.5, color: "#7a5b00", background: "#fff7e6", border: "1px solid #ffe1a8", borderRadius: 999, padding: "1px 8px" }}>
                      còn {m.remaining}
                    </span>
                  ) : (
                    <Plus size={18} color="#0a0a0a" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Phải — giỏ + đã gọi */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 0 }}>
        <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Giỏ món ({cartCount})</div>
          {cart.length === 0 ? (
            <div style={{ color: "#a1a1aa", fontSize: 13, padding: "20px 0", textAlign: "center" }}>
              Chạm thẻ món bên trái để thêm.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {cart.map((c, i) => (
                <div key={i} style={{ borderBottom: "1px solid var(--ant-color-border)", paddingBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14.5 }}>{c.name}</div>
                      <div style={{ fontSize: 12.5, color: "#a1a1aa" }}>{money(c.unitPrice)}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Button shape="circle" size="large" icon={<Minus size={16} />} onClick={() => setQty(i, c.qty - 1)} />
                      <span style={{ width: 28, textAlign: "center", fontSize: 17, fontWeight: 700 }}>{c.qty}</span>
                      <Button shape="circle" size="large" type="primary" icon={<Plus size={16} />} onClick={() => setQty(i, c.qty + 1)} />
                    </div>
                  </div>
                  <Input
                    size="large"
                    placeholder="Ghi chú: ít cay, không hành, không rau…"
                    value={c.note ?? ""}
                    onChange={(e) => setNote(i, e.target.value)}
                    style={{ marginTop: 10 }}
                    prefix={<Pencil size={14} color="#a1a1aa" />}
                  />
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 16 }}>
            <span style={{ fontWeight: 600 }}>Tổng giỏ</span>
            <span style={{ fontSize: 22, fontWeight: 700 }}>{money(cartTotal)}</span>
          </div>
          <Button
            type="primary"
            size="large"
            block
            icon={<Send size={18} />}
            disabled={cart.length === 0}
            style={{ marginTop: 14, height: 52, fontSize: 16 }}
            onClick={send}
          >
            Gửi bếp
          </Button>
        </Card>

        <PlacedOrders sessionId={session.id} />
      </div>
    </div>
  );
}

const statusBadge: Record<string, { label: string; bg: string; color: string }> = {
  queued: { label: "Chờ bếp", bg: "#f4f4f5", color: "#52525b" },
  cooking: { label: "Đang làm", bg: "#0a0a0a", color: "#fff" },
  done: { label: "Xong · chờ bưng", bg: "#e7f7ec", color: "#0a0a0a" },
  served: { label: "Đã phục vụ", bg: "#f4f4f5", color: "#a1a1aa" },
};

function PlacedOrders({ sessionId }: { sessionId: string }) {
  const store = useWaiter();
  const { message } = App.useApp();
  const [editing, setEditing] = useState<string | null>(null);
  const [editQty, setEditQty] = useState(1);
  const [editNote, setEditNote] = useState("");

  const lines = store.linesOfSession(sessionId).filter((l) => l.status !== "cancelled");
  if (lines.length === 0) return null;

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Đã gọi trong phiên này</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {lines.map((l) => {
          const b = statusBadge[l.status] ?? statusBadge.served;
          const editable = l.status === "queued";
          const isEditing = editing === l.id;
          return (
            <div key={l.id} style={{ border: "1px solid var(--ant-color-border)", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14.5 }}>
                    {l.name} <span style={{ color: "#a1a1aa", fontWeight: 400 }}>× {l.qty}</span>
                  </div>
                  {l.note && <div style={{ fontSize: 12.5, color: "#a1a1aa" }}>✎ {l.note}</div>}
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: b.bg, color: b.color }}>
                  {b.label}
                </span>
              </div>

              {isEditing ? (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Button shape="circle" icon={<Minus size={15} />} onClick={() => setEditQty((q) => Math.max(1, q - 1))} />
                    <span style={{ width: 28, textAlign: "center", fontWeight: 700 }}>{editQty}</span>
                    <Button shape="circle" type="primary" icon={<Plus size={15} />} onClick={() => setEditQty((q) => q + 1)} />
                    <Input value={editNote} placeholder="Ghi chú" onChange={(e) => setEditNote(e.target.value)} style={{ flex: 1 }} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button
                      type="primary"
                      onClick={() => {
                        store.updateLine(l.id, editQty, editNote);
                        setEditing(null);
                        message.success("Đã cập nhật món");
                      }}
                    >
                      Lưu
                    </Button>
                    <Button onClick={() => setEditing(null)}>Huỷ</Button>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                  {editable ? (
                    <>
                      <Button
                        size="small"
                        icon={<Pencil size={14} />}
                        onClick={() => {
                          setEditing(l.id);
                          setEditQty(l.qty);
                          setEditNote(l.note ?? "");
                        }}
                      >
                        Sửa
                      </Button>
                      <Button
                        size="small"
                        danger
                        icon={<Trash2 size={14} />}
                        onClick={() => {
                          store.cancelLine(l.id);
                          message.success("Đã huỷ món — hoàn lại suất");
                        }}
                      >
                        Huỷ
                      </Button>
                    </>
                  ) : (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#a1a1aa" }}>
                      <Lock size={13} /> Bếp đã nhận · không sửa được
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
