import { App, Button, Card, Drawer, Input, Select, Table, Tag } from "antd";
import { Lock, LogIn, LogOut, Plus, Unlock } from "lucide-react";
import { useMemo, useState } from "react";
import {
  branchShortName,
  currentBranchId,
  staff as seed,
  type Staff,
  type StaffRole,
} from "../../data";
import { SectionTitle } from "../../components/bits";

const roleTag: Record<StaffRole, { label: string; black?: boolean }> = {
  Manager: { label: "Manager", black: true },
  Waiter: { label: "Waiter" },
  Kitchen: { label: "Kitchen" },
};

export default function StaffTable() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<Staff[]>(seed);
  const [adding, setAdding] = useState(false);
  const label = branchShortName(currentBranchId);

  const branchRows = rows.filter((s) => s.branch === label);

  const nextId = useMemo(() => {
    const nums = rows
      .map((r) => Number(r.id.replace("E-", "")))
      .filter((n) => !Number.isNaN(n));
    const n = (nums.length ? Math.max(...nums) : 0) + 1;
    return `E-${String(n).padStart(2, "0")}`;
  }, [rows]);

  const setShift = (id: string, on: boolean) => {
    setRows((p) => p.map((s) => (s.id === id ? { ...s, onShift: on } : s)));
    message.success(on ? "Đã check-in — hệ thống ghi nhận có mặt" : "Đã check-out");
  };

  const setActive = (id: string, active: boolean) => {
    setRows((p) => p.map((s) => (s.id === id ? { ...s, active } : s)));
    message.success(active ? "Đã mở khoá tài khoản" : "Đã khoá tài khoản — nhân viên không đăng nhập được");
  };

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title="Nhân viên"
        sub="Check-in để hệ thống biết ai đang có mặt mà bắn thông báo — không phải để chấm công"
        extra={
          <Button type="primary" icon={<Plus size={15} />} onClick={() => setAdding(true)}>
            Thêm nhân viên
          </Button>
        }
      />
      <Table<Staff>
        dataSource={branchRows}
        rowKey="id"
        pagination={false}
        size="middle"
        columns={[
          {
            title: "Nhân viên",
            dataIndex: "name",
            render: (v, r) => (
              <div>
                <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                  {v}
                  {!r.active && <Tag color="red">Đã khoá</Tag>}
                </div>
                <div style={{ fontSize: 12, color: "#52525b" }}>{r.email}</div>
                <div style={{ fontSize: 11, color: "#a1a1aa" }}>{r.id}</div>
              </div>
            ),
          },
          {
            title: "Vai trò",
            dataIndex: "role",
            render: (r: StaffRole) =>
              roleTag[r].black ? <Tag color="black">{roleTag[r].label}</Tag> : <Tag>{roleTag[r].label}</Tag>,
          },
          {
            title: "Có mặt",
            dataIndex: "onShift",
            align: "center",
            render: (on: boolean) =>
              on ? (
                <Tag color="black">Đang trong ca</Tag>
              ) : (
                <Tag>Vắng mặt</Tag>
              ),
          },
          {
            title: "",
            key: "act",
            align: "right",
            render: (_, r) => (
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                {r.onShift ? (
                  <Button size="small" icon={<LogOut size={14} />} onClick={() => setShift(r.id, false)}>
                    Check-out
                  </Button>
                ) : (
                  <Button
                    size="small"
                    type="primary"
                    disabled={!r.active}
                    icon={<LogIn size={14} />}
                    onClick={() => setShift(r.id, true)}
                  >
                    Check-in
                  </Button>
                )}
                {r.active ? (
                  <Button
                    size="small"
                    danger
                    icon={<Lock size={14} />}
                    onClick={() => setActive(r.id, false)}
                  >
                    Khoá
                  </Button>
                ) : (
                  <Button
                    size="small"
                    icon={<Unlock size={14} />}
                    onClick={() => setActive(r.id, true)}
                  >
                    Mở khoá
                  </Button>
                )}
              </div>
            ),
          },
        ]}
      />

      <AddStaffDrawer
        open={adding}
        nextId={nextId}
        branchLabel={label}
        onClose={() => setAdding(false)}
        onSave={(s) => {
          setRows((p) => [...p, s]);
          setAdding(false);
          message.success("Đã tạo tài khoản nhân viên");
        }}
      />
    </Card>
  );
}

function AddStaffDrawer({
  open,
  nextId,
  branchLabel,
  onClose,
  onSave,
}: {
  open: boolean;
  nextId: string;
  branchLabel: string;
  onClose: () => void;
  onSave: (s: Staff) => void;
}) {
  const { message } = App.useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<StaffRole, "Manager">>("Waiter");

  const reset = () => {
    setName("");
    setEmail("");
    setRole("Waiter");
  };

  const save = () => {
    if (!name.trim()) {
      message.error("Nhập tên nhân viên");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      message.error("Nhập email hợp lệ để nhân viên đăng nhập");
      return;
    }
    onSave({ id: nextId, name: name.trim(), email: email.trim(), role, branch: branchLabel, onShift: false, active: true });
    reset();
  };

  return (
    <Drawer
      title="Thêm nhân viên"
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      styles={{ wrapper: { width: 420 }, body: { padding: 24 } }}
    >
      <div style={{ fontSize: 13, color: "#71717a", marginBottom: 18 }}>
        Branch Manager chỉ tạo được tài khoản Waiter và Kitchen. Vai trò quyết lúc tạo, không đổi giữa chừng.
      </div>
      <Field label="Họ tên">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Nguyễn Văn A" />
      </Field>
      <Field label="Email đăng nhập">
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="VD: a.nguyen@comtam.vn"
          type="email"
        />
      </Field>
      <Field label="Vai trò">
        <Select
          value={role}
          onChange={setRole}
          style={{ width: "100%" }}
          options={[
            { value: "Waiter", label: "Waiter" },
            { value: "Kitchen", label: "Kitchen" },
          ]}
        />
      </Field>
      <Field label="Chi nhánh">
        <Input value={branchLabel} disabled />
      </Field>
      <Button type="primary" block style={{ marginTop: 8 }} onClick={save}>
        Tạo tài khoản
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
