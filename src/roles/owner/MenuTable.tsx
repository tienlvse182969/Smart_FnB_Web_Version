import { App, Button, Card, Checkbox, Drawer, Input, InputNumber, Select, Switch, Table } from "antd";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import {
  branches,
  branchMenuItems as bmiSeed,
  menuItems as menuSeed,
  money,
  type BranchMenuItem,
  type MenuItem,
} from "../../data";
import { SectionTitle } from "../../components/bits";

export default function MenuTable() {
  const { message } = App.useApp();
  const [items, setItems] = useState<MenuItem[]>(menuSeed);
  const [bmis, setBmis] = useState<BranchMenuItem[]>(bmiSeed);
  const [presenceId, setPresenceId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const branchCount = branches.length;

  const presenceItem = items.find((m) => m.id === presenceId) ?? null;
  const countOffering = (menuItemId: string) =>
    bmis.filter((b) => b.menuItemId === menuItemId).length;

  const toggle = (id: string, activeChain: boolean) => {
    setItems((p) => p.map((m) => (m.id === id ? { ...m, activeChain } : m)));
    message.success(
      activeChain ? "Đã bật món trên toàn chuỗi" : "Đã tắt món — ẩn khỏi menu mọi chi nhánh",
    );
  };

  const togglePresence = (menuItemId: string, branchId: string, on: boolean) => {
    setBmis((p) => {
      const exists = p.some((b) => b.menuItemId === menuItemId && b.branchId === branchId);
      if (on && !exists) {
        return [...p, { branchId, menuItemId, available: true, remaining: null, sold: 0 }];
      }
      if (!on && exists) {
        return p.filter((b) => !(b.menuItemId === menuItemId && b.branchId === branchId));
      }
      return p;
    });
    message.success(
      on
        ? "Đã thêm món vào chi nhánh"
        : "Đã gỡ món khỏi chi nhánh — mất dữ liệu bán tại chi nhánh đó",
    );
  };

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title="Quản lý menu"
        sub="Bật/tắt kinh doanh ở cấp chuỗi — chi nhánh không bật lại được món đã tắt"
        extra={
          <Button type="primary" icon={<Plus size={15} />} onClick={() => setAdding(true)}>
            Thêm món
          </Button>
        }
      />
      <Table<MenuItem>
        dataSource={items}
        rowKey="id"
        pagination={false}
        size="middle"
        columns={[
          {
            title: "Món",
            dataIndex: "name",
            render: (v, r) => (
              <div>
                <div style={{ fontWeight: 600 }}>{v}</div>
                <div style={{ fontSize: 12, color: "#a1a1aa" }}>{r.category}</div>
              </div>
            ),
          },
          { title: "Giá", dataIndex: "price", align: "right", render: (v) => money(v) },
          {
            title: "Có mặt tại",
            key: "presence",
            align: "center",
            render: (_, r) => (
              <Button size="small" onClick={() => setPresenceId(r.id)}>
                {countOffering(r.id)}/{branchCount}
              </Button>
            ),
          },
          {
            title: "Bật",
            dataIndex: "activeChain",
            align: "center",
            render: (a: boolean, r) => (
              <Switch checked={a} size="small" onChange={(c) => toggle(r.id, c)} />
            ),
          },
        ]}
      />

      <PresenceDrawer
        item={presenceItem}
        bmis={bmis}
        onToggle={togglePresence}
        onClose={() => setPresenceId(null)}
      />

      <AddItemDrawer
        open={adding}
        existingIds={items.map((m) => m.id)}
        onClose={() => setAdding(false)}
        onSave={(item, branchIds) => {
          setItems((p) => [...p, item]);
          setBmis((p) => [
            ...p,
            ...branchIds.map((branchId) => ({
              branchId,
              menuItemId: item.id,
              available: true,
              remaining: null,
              sold: 0,
            })),
          ]);
          setAdding(false);
          message.success("Đã thêm món vào menu chuỗi");
        }}
      />
    </Card>
  );
}

function PresenceDrawer({
  item,
  bmis,
  onToggle,
  onClose,
}: {
  item: MenuItem | null;
  bmis: BranchMenuItem[];
  onToggle: (menuItemId: string, branchId: string, on: boolean) => void;
  onClose: () => void;
}) {
  return (
    <Drawer
      title={item ? `Có mặt tại · ${item.name}` : ""}
      open={!!item}
      onClose={onClose}
      styles={{ wrapper: { width: 420 }, body: { padding: 24 } }}
    >
      {item && (
        <>
          <div style={{ fontSize: 13, color: "#71717a", marginBottom: 18 }}>
            Chọn chi nhánh có bán món này. Bỏ chọn sẽ gỡ món khỏi chi nhánh đó.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {branches.map((b) => {
              const on = bmis.some(
                (x) => x.menuItemId === item.id && x.branchId === b.id,
              );
              return (
                <label
                  key={b.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 0",
                    borderBottom: "1px solid var(--ant-color-border)",
                    cursor: "pointer",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{b.name}</div>
                    <div style={{ fontSize: 12, color: "#a1a1aa" }}>{b.address}</div>
                  </div>
                  <Checkbox
                    checked={on}
                    onChange={(e) => onToggle(item.id, b.id, e.target.checked)}
                  />
                </label>
              );
            })}
          </div>
        </>
      )}
    </Drawer>
  );
}

function AddItemDrawer({
  open,
  existingIds,
  onClose,
  onSave,
}: {
  open: boolean;
  existingIds: string[];
  onClose: () => void;
  onSave: (item: MenuItem, branchIds: string[]) => void;
}) {
  const { message } = App.useApp();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Món chính");
  const [price, setPrice] = useState<number | null>(null);
  const [branchIds, setBranchIds] = useState<string[]>(branches.map((b) => b.id));

  const nextId = useMemo(() => {
    const nums = existingIds
      .map((id) => Number(id.replace("M-", "")))
      .filter((n) => !Number.isNaN(n));
    const n = (nums.length ? Math.max(...nums) : 0) + 1;
    return `M-${String(n).padStart(2, "0")}`;
  }, [existingIds]);

  const reset = () => {
    setName("");
    setCategory("Món chính");
    setPrice(null);
    setBranchIds(branches.map((b) => b.id));
  };

  const save = () => {
    if (!name.trim() || price === null) {
      message.error("Nhập tên món và giá");
      return;
    }
    onSave({ id: nextId, name: name.trim(), category, price, activeChain: true }, branchIds);
    reset();
  };

  return (
    <Drawer
      title="Thêm món vào menu chuỗi"
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      styles={{ wrapper: { width: 420 }, body: { padding: 24 } }}
    >
      <Field label="Tên món">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Cơm tấm sườn nướng" />
      </Field>
      <Field label="Danh mục">
        <Select
          value={category}
          onChange={setCategory}
          style={{ width: "100%" }}
          options={["Món chính", "Món thêm", "Đồ uống", "Tráng miệng"].map((c) => ({ value: c, label: c }))}
        />
      </Field>
      <Field label="Giá (₫)">
        <InputNumber
          value={price}
          onChange={setPrice}
          style={{ width: "100%" }}
          min={0}
          step={1000}
          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
          parser={(v) => Number((v ?? "").replace(/\./g, ""))}
        />
      </Field>
      <Field label="Chi nhánh có bán món này">
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
          {branches.map((b) => (
            <Checkbox
              key={b.id}
              checked={branchIds.includes(b.id)}
              onChange={(e) =>
                setBranchIds((p) =>
                  e.target.checked ? [...p, b.id] : p.filter((x) => x !== b.id),
                )
              }
            >
              {b.name}
            </Checkbox>
          ))}
        </div>
      </Field>
      <Button type="primary" block style={{ marginTop: 8 }} onClick={save}>
        Lưu món
      </Button>
    </Drawer>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: "#71717a", marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  );
}
