import { App, Button, Card, Drawer, Input, Select, Table, Tag } from "antd";
import { Lock, Plus, Unlock } from "lucide-react";
import { useState } from "react";
import type { StaffLegacy } from "../../services";
import { DEFAULT_PASSWORD } from "../../types";
import { SectionTitle } from "../../components/bits";
import { useAppStore } from "../../store";

const roleTag: Record<StaffLegacy["role"], { label: string; black?: boolean }> = {
  Manager: { label: "Manager", black: true },
  Waiter: { label: "Waiter" },
  Kitchen: { label: "Kitchen" },
};

/**
 * Nhân sự chi nhánh (BM-01). Màn hình tạo/khoá tài khoản thu ngân và pha chế sẽ
 * dựng lại theo v9 ở giai đoạn sau; hiện chỉ giữ danh sách mock.
 */
export default function StaffTable() {
  const { message, modal } = App.useApp();
  const branches = useAppStore((s) => s.branches);
  const currentBranchId = useAppStore((s) => s.currentBranchId);
  const staff = useAppStore((s) => s.staff);
  const createStaffAccount = useAppStore((s) => s.createStaffAccount);
  const setStaffActive = useAppStore((s) => s.setStaffActive);
  const [adding, setAdding] = useState(false);

  const branchName = branches.find((b) => b.id === currentBranchId)?.name ?? "";

  const toggleActive = async (r: StaffLegacy, active: boolean) => {
    await setStaffActive(r.id, active);
    message.success(active ? "Đã mở khoá tài khoản" : "Đã khoá tài khoản — nhân viên không đăng nhập được");
  };

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title="Nhân viên"
        sub="Tài khoản nhân viên của chi nhánh"
        extra={
          <Button type="primary" icon={<Plus size={15} />} onClick={() => setAdding(true)}>
            Thêm nhân viên
          </Button>
        }
      />
      <Table<StaffLegacy>
        dataSource={staff}
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
            render: (r: StaffLegacy["role"]) =>
              roleTag[r].black ? <Tag color="black">{roleTag[r].label}</Tag> : <Tag>{roleTag[r].label}</Tag>,
          },
          {
            title: "",
            key: "act",
            align: "right",
            render: (_, r) => (
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                {r.active ? (
                  <Button size="small" danger icon={<Lock size={14} />} onClick={() => toggleActive(r, false)}>
                    Khoá
                  </Button>
                ) : (
                  <Button size="small" icon={<Unlock size={14} />} onClick={() => toggleActive(r, true)}>
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
        branchLabel={branchName}
        onClose={() => setAdding(false)}
        onSave={async (name, email, role) => {
          await createStaffAccount(name, email, role);
          setAdding(false);
          modal.success({
            title: "Đã tạo tài khoản nhân viên",
            content: (
              <div style={{ fontSize: 13.5, lineHeight: 1.8 }}>
                Email: <b>{email}</b>
                <br />
                Mật khẩu tạm: <b>{DEFAULT_PASSWORD}</b> (bắt đổi ở lần đăng nhập đầu)
              </div>
            ),
          });
        }}
      />
    </Card>
  );
}

function AddStaffDrawer({
  open,
  branchLabel,
  onClose,
  onSave,
}: {
  open: boolean;
  branchLabel: string;
  onClose: () => void;
  onSave: (name: string, email: string, role: "Waiter" | "Kitchen") => void;
}) {
  const { message } = App.useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"Waiter" | "Kitchen">("Waiter");

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
    onSave(name.trim(), email.trim(), role);
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
