import { App, Button, Card, Drawer, Input, Select, Table } from "antd";
import { Lock, Plus, Unlock } from "lucide-react";
import { useMemo, useState } from "react";
import {
  branches,
  branchManagerAccounts as seed,
  type BranchManagerAccount,
} from "../../data";
import { SectionTitle } from "../../components/bits";

const branchName = (id: string) =>
  branches.find((b) => b.id === id)?.name ?? id;

export default function ManagerAccounts() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<BranchManagerAccount[]>(seed);
  const [adding, setAdding] = useState(false);

  const nextId = useMemo(() => {
    const nums = rows
      .map((r) => Number(r.id.replace("BM-", "")))
      .filter((n) => !Number.isNaN(n));
    const n = (nums.length ? Math.max(...nums) : 0) + 1;
    return `BM-${String(n).padStart(2, "0")}`;
  }, [rows]);

  const setStatus = (id: string, status: BranchManagerAccount["status"], msg: string) => {
    setRows((p) => p.map((r) => (r.id === id ? { ...r, status } : r)));
    message.success(msg);
  };

  const changeBranch = (id: string, branchId: string) => {
    setRows((p) => p.map((r) => (r.id === id ? { ...r, branchId } : r)));
    message.success(`Đã đổi chi nhánh sang ${branchName(branchId)}`);
  };

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title="Tài khoản quản lý"
        sub="Một chi nhánh có thể có nhiều Branch Manager để trực ca — không phải một người làm cả ngày"
        extra={
          <Button type="primary" icon={<Plus size={15} />} onClick={() => setAdding(true)}>
            Thêm tài khoản
          </Button>
        }
      />
      <Table<BranchManagerAccount>
        dataSource={rows}
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
                <div style={{ fontSize: 12, color: "#a1a1aa" }}>{r.email}</div>
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
                onChange={(v) => changeBranch(r.id, v)}
                options={branches.map((b) => ({ value: b.id, label: b.name }))}
              />
            ),
          },
          {
            title: "Trạng thái",
            dataIndex: "status",
            render: (s: BranchManagerAccount["status"]) => (
              <span
                style={{
                  background: s === "active" ? "#e7f7ec" : "#0a0a0a",
                  color: s === "active" ? "#0a0a0a" : "#fff",
                  padding: "3px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                }}
              >
                {s === "active" ? "Đang hoạt động" : "Đã khoá"}
              </span>
            ),
          },
          {
            title: "",
            key: "act",
            align: "right",
            render: (_, r) =>
              r.status === "active" ? (
                <Button
                  size="small"
                  icon={<Lock size={14} />}
                  onClick={() => setStatus(r.id, "locked", `Đã khoá tài khoản ${r.name}`)}
                >
                  Khoá
                </Button>
              ) : (
                <Button
                  size="small"
                  icon={<Unlock size={14} />}
                  onClick={() => setStatus(r.id, "active", `Đã mở khoá tài khoản ${r.name}`)}
                >
                  Mở khoá
                </Button>
              ),
          },
        ]}
      />

      <AddAccountDrawer
        open={adding}
        nextId={nextId}
        onClose={() => setAdding(false)}
        onSave={(acc) => {
          setRows((p) => [...p, acc]);
          setAdding(false);
          message.success("Đã tạo tài khoản Branch Manager");
        }}
      />
    </Card>
  );
}

function AddAccountDrawer({
  open,
  nextId,
  onClose,
  onSave,
}: {
  open: boolean;
  nextId: string;
  onClose: () => void;
  onSave: (acc: BranchManagerAccount) => void;
}) {
  const { message } = App.useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [branchId, setBranchId] = useState(branches[0].id);

  const reset = () => {
    setName("");
    setEmail("");
    setBranchId(branches[0].id);
  };

  const save = () => {
    if (!name.trim() || !email.trim()) {
      message.error("Nhập tên và email");
      return;
    }
    onSave({ id: nextId, name: name.trim(), email: email.trim(), branchId, status: "active" });
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
        <Select
          value={branchId}
          onChange={setBranchId}
          style={{ width: "100%" }}
          options={branches.map((b) => ({ value: b.id, label: b.name }))}
        />
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
