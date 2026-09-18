import { App, Button, Card, Checkbox, Drawer, Input, InputNumber, Select, Switch, Table } from "antd";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { money } from "../../data";
import type { BranchMenuItem, MenuItem } from "../../types";
import {
  createMenuItem as serviceCreateMenuItem,
  listBranchMenuItems,
  listMenuItems,
  setMenuItemPresence as serviceSetMenuItemPresence,
  updateMenuItem as serviceUpdateMenuItem,
} from "../../services";
import { SectionTitle } from "../../components/bits";
import { useAppStore } from "../../store";

/**
 * PHẦN 0: Owner quản menu qua `types/menu.ts` + service thật (mock/db.ts) —
 * cùng dữ liệu với Waiter/Kitchen/Manager, không còn state cục bộ tách biệt
 * khỏi `data.ts` như trước.
 */
export default function MenuTable() {
  const { message } = App.useApp();
  const currentUser = useAppStore((s) => s.currentUser);
  const branches = useAppStore((s) => s.branches);
  const tenantId = currentUser?.tenantId ?? null;

  const [items, setItems] = useState<MenuItem[]>([]);
  const [bmis, setBmis] = useState<BranchMenuItem[]>([]);
  const [presenceId, setPresenceId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);

  const reload = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const menu = await listMenuItems(tenantId, currentUser?.role ?? "owner");
      const lists = await Promise.all(branches.map((b) => listBranchMenuItems(b.id)));
      setItems(menu);
      setBmis(lists.flat());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, branches.length]);

  const presenceItem = items.find((m) => m.id === presenceId) ?? null;
  const countOffering = (menuItemId: string) => bmis.filter((b) => b.menuItemId === menuItemId).length;

  const toggleChain = async (id: string, activeChain: boolean) => {
    try {
      await serviceUpdateMenuItem(id, { activeChain });
      await reload();
      message.success(activeChain ? "Đã bật món trên toàn chuỗi" : "Đã tắt món — ẩn khỏi menu mọi chi nhánh");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Không cập nhật được");
    }
  };

  const togglePresence = async (menuItemId: string, branchId: string, on: boolean) => {
    const current = bmis.filter((b) => b.menuItemId === menuItemId).map((b) => b.branchId);
    const next = on ? [...current, branchId] : current.filter((id) => id !== branchId);
    try {
      await serviceSetMenuItemPresence(menuItemId, next);
      await reload();
      message.success(on ? "Đã thêm món vào chi nhánh (mặc định tắt bán)" : "Đã gỡ món khỏi chi nhánh");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Không cập nhật được");
    }
  };

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title="Quản lý menu"
        sub="Bật/tắt kinh doanh ở cấp chuỗi — chi nhánh không bật lại được món đã tắt (BR-06)"
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
        loading={loading}
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
                {countOffering(r.id)}/{branches.length}
              </Button>
            ),
          },
          {
            title: "Bật",
            dataIndex: "activeChain",
            align: "center",
            render: (a: boolean, r) => (
              <Switch checked={a} size="small" onChange={(c) => toggleChain(r.id, c)} />
            ),
          },
        ]}
      />

      <PresenceDrawer
        item={presenceItem}
        branches={branches}
        bmis={bmis}
        onToggle={togglePresence}
        onClose={() => setPresenceId(null)}
      />

      <AddItemDrawer
        open={adding}
        branches={branches}
        tenantId={tenantId}
        onClose={() => setAdding(false)}
        onSave={async (item, branchIds) => {
          try {
            const created = await serviceCreateMenuItem(item);
            await serviceSetMenuItemPresence(created.id, branchIds);
            await reload();
            setAdding(false);
            message.success("Đã thêm món vào menu chuỗi");
          } catch (err) {
            message.error(err instanceof Error ? err.message : "Không thêm được món");
          }
        }}
      />
    </Card>
  );
}

function PresenceDrawer({
  item,
  branches,
  bmis,
  onToggle,
  onClose,
}: {
  item: MenuItem | null;
  branches: { id: string; name: string; address: string }[];
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
            Chọn chi nhánh có bán món này. Bỏ chọn sẽ gỡ món khỏi chi nhánh đó. Chi nhánh mới chọn mặc định TẮT bán — Manager/Kitchen tự bật.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {branches.map((b) => {
              const on = bmis.some((x) => x.menuItemId === item.id && x.branchId === b.id);
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
                  <Checkbox checked={on} onChange={(e) => onToggle(item.id, b.id, e.target.checked)} />
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
  branches,
  tenantId,
  onClose,
  onSave,
}: {
  open: boolean;
  branches: { id: string; name: string }[];
  tenantId: string | null;
  onClose: () => void;
  onSave: (item: Omit<MenuItem, "id">, branchIds: string[]) => void;
}) {
  const { message } = App.useApp();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState("Món chính");
  const [price, setPrice] = useState<number | null>(null);
  const [branchIds, setBranchIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) setBranchIds(branches.map((b) => b.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const reset = () => {
    setName("");
    setDescription("");
    setImageUrl("");
    setCategory("Món chính");
    setPrice(null);
  };

  const save = () => {
    if (!tenantId || !name.trim() || price === null) {
      message.error("Nhập tên món và giá");
      return;
    }
    onSave(
      {
        tenantId,
        name: name.trim(),
        description: description.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        category,
        price,
        activeChain: true,
      },
      branchIds
    );
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
      <Field label="Mô tả">
        <Input.TextArea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="VD: Sườn nướng mật ong, cơm tấm, bì, chả" rows={2} />
      </Field>
      <Field label="Ảnh (URL)">
        <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
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
                setBranchIds((p) => (e.target.checked ? [...p, b.id] : p.filter((x) => x !== b.id)))
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
