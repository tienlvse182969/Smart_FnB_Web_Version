import { App, Button, Card, Drawer, Input, Select, Table, Tabs, Tag } from "antd";
import { KeyRound, Lock, Plus, Unlock } from "lucide-react";
import { useEffect, useState } from "react";
import type { DemoAccount } from "../../types";
import { DEFAULT_PASSWORD } from "../../types";
import { accountApi } from "../../api";
import ActionButton from "../../plan/ActionButton";
import { SectionTitle } from "../../components/bits";
import { useAppStore } from "../../store";
import { palette } from "../../theme";

/** OW-05/06: Owner tạo/khoá/reset mật khẩu/chuyển chi nhánh cho Branch Manager. */
export default function ManagerAccounts() {
  const { message, modal } = App.useApp();
  const currentUser = useAppStore((s) => s.currentUser);
  const branches = useAppStore((s) => s.branches);
  const tenantId = currentUser?.tenantId ?? null;

  const [managers, setManagers] = useState<DemoAccount[]>([]);
  const [staff, setStaff] = useState<DemoAccount[]>([]);
  const [adding, setAdding] = useState(false);

  const branchName = (id?: string) => branches.find((b) => b.id === id)?.name ?? id ?? "—";

  const load = async () => {
    if (!tenantId) return;
    setManagers(await accountApi.listManagers(tenantId));
    setStaff(await accountApi.listStaffAccounts(tenantId));
  };

  useEffect(() => {
    load();
  }, [tenantId]);

  const toggleActive = async (a: DemoAccount) => {
    await accountApi.setActive(a.id, !a.active);
    message.success(!a.active ? `Đã mở khoá tài khoản ${a.name}` : `Đã khoá tài khoản ${a.name}`);
    await load();
  };

  const doReset = async (a: DemoAccount) => {
    await accountApi.resetPassword(a.id);
    modal.success({
      title: `Đã đặt lại mật khẩu ${a.name}`,
      content: (
        <div style={{ fontSize: 13.5, lineHeight: 1.8 }}>
          Email: <b>{a.email}</b>
          <br />
          Mật khẩu tạm mới: <b>{DEFAULT_PASSWORD}</b> (bắt đổi ở lần đăng nhập tới)
        </div>
      ),
    });
  };

  const changeBranch = async (a: DemoAccount, branchId: string) => {
    await accountApi.reassignBranch(a.id, branchId);
    message.success(`Đã chuyển ${a.name} sang ${branchName(branchId)}`);
    await load();
  };

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title="Tài khoản quản lý"
        sub="Một chi nhánh có thể có nhiều Branch Manager để trực ca — không phải một người làm cả ngày"
        extra={
          <ActionButton type="primary" icon={<Plus size={15} />} consumes="accounts" onClick={() => setAdding(true)}>
            Thêm tài khoản
          </ActionButton>
        }
      />
      <Tabs
        items={[
          {
            key: "managers",
            label: `Branch Manager (${managers.length})`,
            children: (
              <Table<DemoAccount>
                dataSource={managers}
                rowKey="id"
                pagination={false}
                size="middle"
                columns={[
                  {
                    title: "Tài khoản",
                    dataIndex: "name",
                    render: (v, r) => (
                      <div>
                        <div style={{ fontWeight: 600 }}>{v}</div>
                        <div style={{ fontSize: 12, color: palette.textSubtle }}>{r.email}</div>
                      </div>
                    ),
                  },
                  {
                    title: "Chi nhánh được gán",
                    dataIndex: "branchId",
                    render: (id: string, r) => (
                      <Select
                        value={id}
                        size="small"
                        style={{ width: 190 }}
                        onChange={(v) => changeBranch(r, v)}
                        options={branches.map((b) => ({ value: b.id, label: b.name }))}
                      />
                    ),
                  },
                  {
                    title: "Trạng thái",
                    dataIndex: "active",
                    render: (active: boolean) => (
                      <span style={{ background: active ? palette.success.bg : palette.error.bg, color: active ? palette.success.text : palette.error.text, padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" }}>
                        {active ? "Đang hoạt động" : "Đã khoá"}
                      </span>
                    ),
                  },
                  {
                    title: "",
                    key: "act",
                    align: "right",
                    render: (_, r) => (
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <ActionButton size="small" icon={<KeyRound size={14} />} onClick={() => doReset(r)}>
                          Reset mật khẩu
                        </ActionButton>
                        {r.active ? (
                          <ActionButton size="small" icon={<Lock size={14} />} onClick={() => toggleActive(r)}>
                            Khoá
                          </ActionButton>
                        ) : (
                          <ActionButton size="small" icon={<Unlock size={14} />} onClick={() => toggleActive(r)}>
                            Mở khoá
                          </ActionButton>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            ),
          },
          {
            key: "staff",
            label: `Thu ngân & Pha chế (${staff.length}) · chỉ xem`,
            children: (
              <Table<DemoAccount>
                dataSource={staff}
                rowKey="id"
                pagination={false}
                size="middle"
                columns={[
                  {
                    title: "Tài khoản",
                    dataIndex: "name",
                    render: (v, r) => (
                      <div>
                        <div style={{ fontWeight: 600 }}>{v}</div>
                        <div style={{ fontSize: 12, color: palette.textSubtle }}>{r.email}</div>
                      </div>
                    ),
                  },
                  { title: "Vai trò", dataIndex: "role", render: (r: string) => <Tag>{r === "cashier" ? "Cashier" : "Barista"}</Tag> },
                  { title: "Chi nhánh", dataIndex: "branchId", render: (id: string) => branchName(id) },
                  {
                    title: "Trạng thái",
                    dataIndex: "active",
                    render: (active: boolean) => (active ? <Tag color="green">Đang hoạt động</Tag> : <Tag>Đã khoá</Tag>),
                  },
                ]}
              />
            ),
          },
        ]}
      />

      <AddAccountDrawer
        open={adding}
        branches={branches}
        onClose={() => setAdding(false)}
        onSave={async (name, email, branchId) => {
          if (!tenantId) return;
          try {
            const acc = await accountApi.createManager(tenantId, branchId, name, email);
            setAdding(false);
            modal.success({
              title: "Đã tạo tài khoản Branch Manager",
              content: (
                <div style={{ fontSize: 13.5, lineHeight: 1.8 }}>
                  Email: <b>{acc.email}</b>
                  <br />
                  Mật khẩu tạm: <b>{DEFAULT_PASSWORD}</b> (bắt đổi ở lần đăng nhập đầu)
                </div>
              ),
            });
            await load();
          } catch (err) {
            message.error(err instanceof Error ? err.message : "Không tạo được — có thể đã vượt hạn mức gói");
          }
        }}
      />
    </Card>
  );
}

function AddAccountDrawer({
  open,
  branches,
  onClose,
  onSave,
}: {
  open: boolean;
  branches: { id: string; name: string }[];
  onClose: () => void;
  onSave: (name: string, email: string, branchId: string) => void;
}) {
  const { message } = App.useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [branchId, setBranchId] = useState(branches[0]?.id);

  useEffect(() => {
    if (open) setBranchId(branches[0]?.id);
  }, [open]);

  const reset = () => {
    setName("");
    setEmail("");
  };

  const save = () => {
    if (!name.trim() || !email.trim() || !branchId) {
      message.error("Nhập tên, email và chọn chi nhánh");
      return;
    }
    onSave(name.trim(), email.trim(), branchId);
    reset();
  };

  return (
    <Drawer
      title="Thêm tài khoản Branch Manager"
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      styles={{ wrapper: { width: 420 }, body: { padding: 24 } }}
    >
      <Field label="Họ tên">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Nguyễn Văn A" />
      </Field>
      <Field label="Email đăng nhập">
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ten@comtam.vn" />
      </Field>
      <Field label="Chi nhánh được gán">
        <Select value={branchId} onChange={setBranchId} style={{ width: "100%" }} options={branches.map((b) => ({ value: b.id, label: b.name }))} />
      </Field>
      <ActionButton type="primary" block style={{ marginTop: 8 }} onClick={save}>
        Tạo tài khoản
      </ActionButton>
    </Drawer>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: palette.textMuted, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}
