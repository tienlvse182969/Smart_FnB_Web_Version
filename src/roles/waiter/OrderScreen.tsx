import { useMemo, useState } from "react";
import { App, Button, Card, Input, Segmented } from "antd";
import { Minus, Pencil, Plus, Send, Utensils } from "lucide-react";
import { money } from "../../data";
import type { BranchMenuItem, CartItem, MenuItem } from "../../types";
import { isSellable } from "../../services/menu.service";
import { SectionTitle } from "../../components/bits";
import { useAppStore } from "../../store";

type MenuTile = {
  id: string;
  name: string;
  category: string;
  price: number;
  sellable: boolean;
  remaining: number | null;
};

function buildMenu(menuItems: MenuItem[], branchMenuItems: BranchMenuItem[]): MenuTile[] {
  const byBranchId = new Map(branchMenuItems.map((b) => [b.menuItemId, b]));
  return menuItems
    .filter((m) => byBranchId.has(m.id)) // chỉ món CÓ MẶT ở chi nhánh này
    .map((m) => {
      const branchItem = byBranchId.get(m.id);
      return {
        id: m.id,
        name: m.name,
        category: m.category,
        price: m.price,
        sellable: isSellable(m, branchItem),
        remaining: branchItem?.remainingToday ?? null,
      };
    });
}

/**
 * Màn order để KHÁCH chạm (waiter cầm tablet đưa khách) — mục 4.6.C.
 * Chỉ hiện tên món, ảnh/danh mục, giá và ghi chú — không có giá vốn, tồn
 * kho nội bộ hay thông tin vận hành khác.
 */
export default function OrderScreen({
  sessionId,
  onSent,
  onGoFloor,
}: {
  sessionId: string | null;
  onSent: () => void;
  onGoFloor: () => void;
}) {
  const { message } = App.useApp();
  const tenantBranding = useAppStore((s) => s.tenantBranding);
  const sessions = useAppStore((s) => s.sessions);
  const menuItems = useAppStore((s) => s.menuItems);
  const branchMenuItems = useAppStore((s) => s.branchMenuItems);
  const submitOrder = useAppStore((s) => s.submitOrder);

  const session = sessions.find((s) => s.id === sessionId && s.status !== "closed" && s.status !== "cancelled") ?? null;

  const menu = useMemo(() => buildMenu(menuItems, branchMenuItems), [menuItems, branchMenuItems]);
  const categories = useMemo(() => [...new Set(menu.map((m) => m.category))], [menu]);
  const [cat, setCat] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [justSoldOut, setJustSoldOut] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

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

  const visibleMenu = menu.filter((m) => cat === "all" || m.category === cat);

  const addToCart = (m: MenuTile) => {
    if (!m.sellable) return;
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

  const send = async () => {
    if (cart.length === 0) return;
    setSending(true);
    try {
      const res = await submitOrder(session.id, cart);
      if (!res.ok) {
        // BR-06/BR-08: chặn cả order, đánh dấu đúng món vừa hết để khách chọn lại.
        setJustSoldOut(new Set(res.soldOut));
        message.error(`Vừa hết: ${res.soldOut.join(", ")} — bỏ khỏi giỏ rồi gửi lại`);
        return;
      }
      setCart([]);
      setJustSoldOut(new Set());
      message.success(`Đã gửi bếp ${cartCount} món · bàn ${session.tableIds.map((id) => id.split("-").pop()).join(" + ")}`);
      onSent();
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 7fr) minmax(0, 5fr)", gap: 16, alignItems: "start" }}>
      {/* Trái — menu, đưa cho khách chạm */}
      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          {tenantBranding?.logoUrl ? (
            <img src={tenantBranding.logoUrl} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: "cover" }} />
          ) : (
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#0a0a0a", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 14 }}>
              {(tenantBranding?.displayName ?? "Smart F&B")[0]}
            </div>
          )}
          <div style={{ fontWeight: 700, fontSize: 16 }}>{tenantBranding?.displayName ?? "Smart F&B"}</div>
        </div>
        <SectionTitle
          title={`Bàn ${session.tableIds.map((id) => id.split("-").pop()).join(" + ")}`}
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
            const flaggedSoldOut = justSoldOut.has(m.name);
            return (
              <button
                key={m.id}
                disabled={!m.sellable}
                onClick={() => addToCart(m)}
                style={{
                  border: flaggedSoldOut ? "1.5px solid #cf1322" : "1.5px solid var(--ant-color-border)",
                  borderRadius: 14,
                  padding: 16,
                  minHeight: 104,
                  background: flaggedSoldOut ? "#fff1f0" : "#fff",
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  cursor: m.sellable ? "pointer" : "not-allowed",
                  opacity: m.sellable ? 1 : 0.45,
                  font: "inherit",
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>{m.name}</div>
                <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10 }}>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{money(m.price)}</span>
                  {!m.sellable ? (
                    <span style={{ fontSize: 11.5, color: "#cf1322" }}>{flaggedSoldOut ? "Vừa hết" : "Hết / ngưng"}</span>
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

      {/* Phải — giỏ + đã gọi trong phiên */}
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
            loading={sending}
            style={{ marginTop: 14, height: 52, fontSize: 16 }}
            onClick={send}
          >
            Hoàn tất gọi món
          </Button>
        </Card>

        <SessionDetail sessionId={session.id} />
      </div>
    </div>
  );
}

const statusBadge: Record<string, { label: string; bg: string; color: string }> = {
  queued: { label: "Chờ bếp", bg: "#f4f4f5", color: "#52525b" },
  cooking: { label: "Đang làm", bg: "#0a0a0a", color: "#fff" },
  awaiting_pickup: { label: "Chờ bưng", bg: "#e7f7ec", color: "#0a0a0a" },
  served: { label: "Đã phục vụ", bg: "#f4f4f5", color: "#a1a1aa" },
  sold_out: { label: "Hết món", bg: "#fff1f0", color: "#cf1322" },
};

/** Mục 4.6.C/6: chi tiết phiên — mọi order (gồm gọi thêm), trạng thái từng dòng, tạm tính. */
function SessionDetail({ sessionId }: { sessionId: string }) {
  const orderLines = useAppStore((s) => s.orderLines);
  const lines = orderLines.filter((l) => l.sessionId === sessionId && l.status !== "cancelled");
  if (lines.length === 0) return null;

  // Nhóm theo orderId, giữ thứ tự gọi trước → gọi thêm.
  const orderIds: string[] = [];
  for (const l of lines) if (!orderIds.includes(l.orderId)) orderIds.push(l.orderId);

  const total = lines
    .filter((l) => l.status !== "sold_out")
    .reduce((sum, l) => sum + l.unitPrice * l.qty, 0);

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Đã gọi trong phiên này</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {orderIds.map((orderId, gi) => (
          <div key={orderId}>
            <div style={{ fontSize: 12, color: "#71717a", fontWeight: 600, marginBottom: 8 }}>
              {gi === 0 ? "Gọi lần đầu" : `Gọi thêm ${gi}`}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {lines
                .filter((l) => l.orderId === orderId)
                .map((l) => {
                  const b = statusBadge[l.status] ?? statusBadge.served;
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
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTop: "1.5px solid #0a0a0a" }}>
        <span style={{ fontWeight: 600 }}>Tạm tính</span>
        <span style={{ fontSize: 20, fontWeight: 700 }}>{money(total)}</span>
      </div>
    </Card>
  );
}
