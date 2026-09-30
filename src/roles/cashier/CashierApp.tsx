import { useEffect, useMemo, useState } from "react";
import { App, Button, Card, Empty, Input, InputNumber, Modal, Segmented, Space, Spin, Table, Tag, Typography } from "antd";
import { Banknote, History, Plus, ShoppingCart, Trash2 } from "lucide-react";
import RoleShell from "../../layout/RoleShell";
import { useAppStore } from "../../store";
import {
  checkoutCounterOrder,
  collectCounterCash,
  getCounterReceipt,
  getCashierContext,
  listTodayCounterOrders,
  reprintCounterReceipt,
  type CashierMenuEntry,
  type CounterOrder,
  type CounterReceipt,
} from "../../services/cashier-api";

type CartLine = {
  key: string;
  entry: CashierMenuEntry;
  optionIds: string[];
  quantity: number;
};

const money = (value: string | number) => `${Number(value).toLocaleString("vi-VN")} ₫`;

export default function CashierApp({ onLogout }: { onLogout: () => void }) {
  const { message } = App.useApp();
  const currentUser = useAppStore((state) => state.currentUser);
  const [context, setContext] = useState<Awaited<ReturnType<typeof getCashierContext>> | null>(null);
  const [order, setOrder] = useState<CounterOrder | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [category, setCategory] = useState("Tất cả");
  const [selecting, setSelecting] = useState<CashierMenuEntry | null>(null);
  const [optionIds, setOptionIds] = useState<string[]>([]);
  const [cashOpen, setCashOpen] = useState(false);
  const [tendered, setTendered] = useState(0);
  const [busy, setBusy] = useState(false);
  const [section, setSection] = useState("pos");
  const [history, setHistory] = useState<CounterOrder[]>([]);
  const [receipt, setReceipt] = useState<CounterReceipt | null>(null);
  const [isReprint, setIsReprint] = useState(false);
  const [reprintReason, setReprintReason] = useState("");

  useEffect(() => {
    getCashierContext().then(setContext).catch((error) => message.error(error.message));
  }, [message]);

  useEffect(() => {
    if (section === "history") listTodayCounterOrders().then(setHistory).catch((error) => message.error(error.message));
  }, [section, message]);

  const categories = useMemo(() => ["Tất cả", ...new Set(context?.menuItems.map((entry) => entry.menuItem.category.name) ?? [])], [context]);
  const menu = context?.menuItems.filter((entry) => category === "Tất cả" || entry.menuItem.category.name === category) ?? [];

  const chooseItem = (entry: CashierMenuEntry) => {
    const defaults = entry.menuItem.optionGroups.flatMap(({ group }) =>
      group.isRequired ? group.options.filter((option) => option.branchAvailability[0]?.isAvailable !== false).slice(0, group.minSelections || 1).map((option) => option.id) : [],
    );
    setOptionIds(defaults);
    setSelecting(entry);
  };

  const addItem = async () => {
    if (!selecting) return;
    const key = `${selecting.menuItem.id}:${[...optionIds].sort().join(",")}`;
    setCart((current) => {
      const found = current.find((line) => line.key === key);
      return found
        ? current.map((line) => line.key === key ? { ...line, quantity: line.quantity + 1 } : line)
        : [...current, { key, entry: selecting, optionIds, quantity: 1 }];
    });
    setSelecting(null);
  };

  const checkout = async () => {
    setBusy(true);
    try {
      const created = await checkoutCounterOrder(cart.map((line) => ({
        menuItemId: line.entry.menuItem.id,
        quantity: line.quantity,
        optionIds: line.optionIds,
      })));
      setOrder(created);
      setTendered(Number(created.totalAmount));
      setCashOpen(true);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không thể chốt đơn");
    } finally { setBusy(false); }
  };

  const payCash = async () => {
    if (!order) return;
    setBusy(true);
    try {
      const result = await collectCounterCash(order.id, tendered);
      setOrder(result.order);
      setCart([]);
      setCashOpen(false);
      setReceipt(await getCounterReceipt(result.order.id));
      setIsReprint(false);
      message.success(`Thanh toán thành công · Số ${result.order.callNumber} · Tiền thừa ${money(result.payment.changeAmount)}`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Thanh toán thất bại");
    } finally { setBusy(false); }
  };

  const newOrder = () => { setOrder(null); setCart([]); setTendered(0); };

  const cartTotal = cart.reduce((sum, line) => {
    const optionTotal = line.entry.menuItem.optionGroups
      .flatMap(({ group }) => group.options)
      .filter((option) => line.optionIds.includes(option.id))
      .reduce((value, option) => value + Number(option.priceDelta), 0);
    return sum + (Number(line.entry.menuItem.price) + optionTotal) * line.quantity;
  }, 0);

  const printReceipt = async () => {
    if (!receipt) return;
    if (isReprint) {
      if (reprintReason.trim().length < 3) return message.error("Vui lòng nhập lý do in lại");
      await reprintCounterReceipt(receipt.orderId, reprintReason);
    }
    window.print();
  };

  return (
    <RoleShell role="cashier" nav={[{ key: "pos", label: "Bán hàng", icon: <ShoppingCart size={18} /> }, { key: "history", label: "Lịch sử hôm nay", icon: <History size={18} /> }]} section={section} onSection={setSection} onLogout={onLogout} branchChip={context?.branch.name ?? currentUser?.name}>
      {section === "history" ? <div style={{ padding: 24 }}><Typography.Title level={3}>Lịch sử đơn hôm nay</Typography.Title><Table rowKey="id" dataSource={history} pagination={false} columns={[{ title: "Số gọi", dataIndex: "callNumber", width: 100 }, { title: "Mã đơn", dataIndex: "orderCode" }, { title: "Trạng thái", dataIndex: "status", render: (value) => <Tag>{value}</Tag> }, { title: "Tổng tiền", dataIndex: "totalAmount", align: "right", render: money }, { title: "", key: "action", render: (_, item) => <Button onClick={async () => { setReceipt(await getCounterReceipt(item.id)); setIsReprint(true); setReprintReason(""); }}>Xem bill</Button> }]} /></div> : <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 420px", gap: 20, padding: 24, height: "100%", overflow: "hidden" }}>
        <section style={{ overflow: "auto" }}>
          <Typography.Title level={3} style={{ marginTop: 0 }}>Tạo đơn tại quầy</Typography.Title>
          <Segmented options={categories} value={category} onChange={(value) => setCategory(String(value))} style={{ marginBottom: 18 }} />
          {!context ? <Spin /> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 14 }}>
            {menu.map((entry) => {
              const available = entry.isAvailable && entry.remainingPortions !== 0;
              return <Card key={entry.menuItem.id} hoverable={available} onClick={() => available && chooseItem(entry)} style={{ opacity: available ? 1 : 0.5, minHeight: 145 }}>
                <Tag>{entry.menuItem.category.name}</Tag>
                <Typography.Title level={5}>{entry.menuItem.name}</Typography.Title>
                <Typography.Text strong>{money(entry.menuItem.price)}</Typography.Text>
                {!available && <div><Tag color="red">Hết món</Tag></div>}
              </Card>;
            })}
          </div>}
        </section>
        <Card title={order?.callNumber ? `Đơn số ${order.callNumber}` : "Đơn hiện tại"} extra={order?.paymentStatus === "PAID" ? <Button onClick={newOrder} icon={<Plus size={16} />}>Đơn mới</Button> : null} styles={{ body: { padding: 0, height: "calc(100vh - 190px)", display: "flex", flexDirection: "column" } }}>
          <div style={{ flex: 1, overflow: "auto", padding: 18 }}>
            {order?.paymentStatus === "PAID" ? order.items.map((item) => <div key={item.id} style={{ padding: "12px 0", borderBottom: "1px solid #eee" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><strong>{item.quantity}× {item.itemName}</strong><span>{money(item.totalPrice)}</span></div>{item.selectedOptions?.length ? <div style={{ color: "#71717a", fontSize: 13 }}>{item.selectedOptions.map((option) => option.name).join(" · ")}</div> : null}</div>) : !cart.length ? <Empty description="Chọn món để bắt đầu" /> : cart.map((line) => <div key={line.key} style={{ padding: "12px 0", borderBottom: "1px solid #eee" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><strong>{line.quantity}× {line.entry.menuItem.name}</strong><span>{money((Number(line.entry.menuItem.price) + line.entry.menuItem.optionGroups.flatMap(({ group }) => group.options).filter((option) => line.optionIds.includes(option.id)).reduce((sum, option) => sum + Number(option.priceDelta), 0)) * line.quantity)}</span></div><div style={{ color: "#71717a", fontSize: 13 }}>{line.entry.menuItem.optionGroups.flatMap(({ group }) => group.options).filter((option) => line.optionIds.includes(option.id)).map((option) => option.name).join(" · ")}</div><Button type="text" danger size="small" icon={<Trash2 size={14} />} onClick={() => setCart((current) => current.filter((item) => item.key !== line.key))}>Xóa</Button></div>)}
          </div>
          <div style={{ borderTop: "1px solid #eee", padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, marginBottom: 14 }}><strong>Tổng cộng</strong><strong>{money(order?.paymentStatus === "PAID" ? order.totalAmount : cartTotal)}</strong></div>
            {order?.paymentStatus === "PAID" ? <Tag color="green">Đã thanh toán · Số gọi món {order.callNumber}</Tag> : <Button block type="primary" size="large" loading={busy} icon={<Banknote size={18} />} disabled={!cart.length} onClick={checkout}>Chốt đơn và thu tiền</Button>}
          </div>
        </Card>
      </div>}
      <Modal open={!!selecting} title={selecting?.menuItem.name} onCancel={() => setSelecting(null)} onOk={addItem} confirmLoading={busy} okText="Thêm vào đơn">
        {selecting?.menuItem.optionGroups.map(({ group }) => <div key={group.id} style={{ marginBottom: 20 }}><Typography.Text strong>{group.name}{group.isRequired ? " *" : ""}</Typography.Text><div style={{ marginTop: 8 }}><Space wrap>{group.options.map((option) => { const active = optionIds.includes(option.id); const available = option.branchAvailability[0]?.isAvailable !== false; return <Button key={option.id} disabled={!available} type={active ? "primary" : "default"} onClick={() => setOptionIds((current) => active ? current.filter((id) => id !== option.id) : group.maxSelections === 1 ? [...current.filter((id) => !group.options.some((candidate) => candidate.id === id)), option.id] : [...current, option.id])}>{option.name}{Number(option.priceDelta) ? ` +${money(option.priceDelta)}` : ""}</Button>; })}</Space></div></div>)}
      </Modal>
      <Modal open={cashOpen} title="Thanh toán tiền mặt" onCancel={() => setCashOpen(false)} onOk={payCash} confirmLoading={busy} okText="Xác nhận đã nhận tiền"><Typography.Paragraph>Tổng cần thu: <strong>{money(order?.totalAmount ?? 0)}</strong></Typography.Paragraph><InputNumber<number> style={{ width: "100%" }} min={Number(order?.totalAmount ?? 0)} step={10000} value={tendered} onChange={(value) => setTendered(value ?? 0)} addonAfter="₫" /><Typography.Paragraph style={{ marginTop: 12 }}>Tiền thừa: <strong>{money(Math.max(0, tendered - Number(order?.totalAmount ?? 0)))}</strong></Typography.Paragraph></Modal>
      <Modal open={!!receipt} title="Bill và phiếu số" onCancel={() => setReceipt(null)} footer={<Button type="primary" onClick={printReceipt}>In</Button>}>{isReprint ? <Input value={reprintReason} onChange={(event) => setReprintReason(event.target.value)} placeholder="Lý do in lại" style={{ marginBottom: 16 }} /> : null}<div className="cashier-receipt">{receipt ? <><Typography.Title level={4}>{receipt.seller.name}</Typography.Title><Typography.Text>{receipt.seller.branchName}</Typography.Text><Typography.Title level={2}>Số {receipt.callNumber}</Typography.Title>{receipt.items.map((item) => <div key={item.id} style={{ display: "flex", justifyContent: "space-between", margin: "10px 0" }}><span>{item.quantity}× {item.itemName}</span><strong>{money(item.totalPrice)}</strong></div>)}<hr /><div style={{ display: "flex", justifyContent: "space-between", fontSize: 18 }}><strong>Tổng</strong><strong>{money(receipt.totalAmount)}</strong></div></> : null}</div></Modal>
    </RoleShell>
  );
}
