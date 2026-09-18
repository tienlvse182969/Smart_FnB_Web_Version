import { App, Button, Card, Drawer, Input, Select, Table } from "antd";
import { Clock, MapPin, Plus, Table2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import type { Branch } from "../../types";
import { useAppStore } from "../../store";
import { getFloorTables } from "../../services";

function BranchCard({ b, tableCount, onEdit }: { b: Branch; tableCount: number; onEdit: () => void }) {
  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{b.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#71717a", fontSize: 13, marginTop: 4 }}>
            <MapPin size={14} /> {b.address}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, color: "#71717a", fontSize: 13, marginTop: 4 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Clock size={14} /> {b.openTime}–{b.closeTime}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Table2 size={14} /> {tableCount} bàn
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Users size={14} /> {b.phone}
            </span>
          </div>
        </div>
        <span
          style={{
            background: b.status === "open" ? "#e7f7ec" : "#f4f4f5",
            color: b.status === "open" ? "#0a0a0a" : "#71717a",
            padding: "3px 10px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {b.status === "open" ? "Đang mở cửa" : b.status === "closed" ? "Đóng cửa" : "Tạm ngưng"}
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        <Button size="small" onClick={onEdit}>
          Sửa chi nhánh
        </Button>
      </div>
    </Card>
  );
}

/** OW-01: CRUD chi nhánh — chặn ở service khi vượt maxBranches của gói (BR-23). */
export default function Branches() {
  const { message } = App.useApp();
  const branches = useAppStore((s) => s.branches);
  const createBranch = useAppStore((s) => s.createBranch);
  const updateBranch = useAppStore((s) => s.updateBranch);
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<Branch | "new" | null>(null);

  useEffect(() => {
    Promise.all(branches.map(async (b) => [b.id, (await getFloorTables(b.id)).length] as const)).then((entries) =>
      setTableCounts(Object.fromEntries(entries))
    );
  }, [branches]);

  return (
    <div>
      <SectionHeader onAdd={() => setEditing("new")} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 16 }}>
        {branches.map((b) => (
          <BranchCard key={b.id} b={b} tableCount={tableCounts[b.id] ?? 0} onEdit={() => setEditing(b)} />
        ))}
      </div>

      <BranchDrawer
        branch={editing}
        onClose={() => setEditing(null)}
        onSave={async (data) => {
          try {
            if (editing === "new") {
              await createBranch(data);
              message.success("Đã tạo chi nhánh mới");
            } else if (editing) {
              await updateBranch(editing.id, data);
              message.success("Đã cập nhật chi nhánh");
            }
            setEditing(null);
          } catch (err) {
            message.error(err instanceof Error ? err.message : "Không lưu được — có thể đã vượt hạn mức gói");
          }
        }}
      />
    </div>
  );
}

function SectionHeader({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Chi nhánh</div>
        <div style={{ fontSize: 12.5, color: "#71717a", marginTop: 2 }}>Mỗi chi nhánh có sơ đồ bàn, menu và nhân viên riêng</div>
      </div>
      <Button type="primary" icon={<Plus size={15} />} onClick={onAdd}>
        Thêm chi nhánh
      </Button>
    </div>
  );
}

function BranchDrawer({
  branch,
  onClose,
  onSave,
}: {
  branch: Branch | "new" | null;
  onClose: () => void;
  onSave: (data: { name: string; address: string; phone: string; openTime: string; closeTime: string; status?: "open" | "closed" | "suspended" }) => void;
}) {
  const isNew = branch === "new";
  const existing = isNew ? null : branch;
  const [name, setName] = useState(existing?.name ?? "");
  const [address, setAddress] = useState(existing?.address ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [openTime, setOpenTime] = useState(existing?.openTime ?? "07:00");
  const [closeTime, setCloseTime] = useState(existing?.closeTime ?? "22:00");
  const [status, setStatus] = useState<"open" | "closed" | "suspended">(existing?.status ?? "open");

  useEffect(() => {
    setName(existing?.name ?? "");
    setAddress(existing?.address ?? "");
    setPhone(existing?.phone ?? "");
    setOpenTime(existing?.openTime ?? "07:00");
    setCloseTime(existing?.closeTime ?? "22:00");
    setStatus(existing?.status ?? "open");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch]);

  return (
    <Drawer
      title={isNew ? "Thêm chi nhánh" : `Sửa chi nhánh · ${existing?.name}`}
      open={!!branch}
      onClose={onClose}
      styles={{ wrapper: { width: 420 }, body: { padding: 24 } }}
    >
      <Field label="Tên chi nhánh">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Chi nhánh Quận 10" />
      </Field>
      <Field label="Địa chỉ">
        <Input value={address} onChange={(e) => setAddress(e.target.value)} />
      </Field>
      <Field label="Số điện thoại">
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </Field>
      <Field label="Giờ mở cửa">
        <Input value={openTime} onChange={(e) => setOpenTime(e.target.value)} placeholder="07:00" />
      </Field>
      <Field label="Giờ đóng cửa">
        <Input value={closeTime} onChange={(e) => setCloseTime(e.target.value)} placeholder="22:00" />
      </Field>
      {!isNew && (
        <Field label="Trạng thái">
          <Select
            value={status}
            onChange={setStatus}
            style={{ width: "100%" }}
            options={[
              { value: "open", label: "Đang mở cửa" },
              { value: "closed", label: "Đóng cửa" },
              { value: "suspended", label: "Tạm ngưng" },
            ]}
          />
        </Field>
      )}
      <Button
        type="primary"
        block
        style={{ marginTop: 8 }}
        disabled={!name.trim() || !address.trim()}
        onClick={() => onSave({ name: name.trim(), address: address.trim(), phone: phone.trim(), openTime, closeTime, status: isNew ? undefined : status })}
      >
        {isNew ? "Tạo chi nhánh" : "Lưu thay đổi"}
      </Button>
    </Drawer>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: "#71717a", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}
