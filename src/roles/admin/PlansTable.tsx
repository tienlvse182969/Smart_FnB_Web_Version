import { App, Button, Card, Drawer, Input, InputNumber, Table } from "antd";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import type { Plan } from "../../types";
import { createPlan, listPlans, updatePlan } from "../../services";
import { money } from "../../data";
import { SectionTitle } from "../../components/bits";

/** Quản lý gói dịch vụ (mục 4.3.B): giá tháng, maxBranches, maxAccounts, maxTables. */
export default function PlansTable() {
  const { message } = App.useApp();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editing, setEditing] = useState<Plan | "new" | null>(null);

  const load = () => listPlans().then(setPlans);
  useEffect(() => {
    load();
  }, []);

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title="Gói dịch vụ"
        sub="Giá tháng và hạn mức chi nhánh / tài khoản / bàn — áp cho toàn bộ doanh nghiệp dùng gói này"
        extra={
          <Button type="primary" icon={<Plus size={15} />} onClick={() => setEditing("new")}>
            Thêm gói
          </Button>
        }
      />
      <Table<Plan>
        dataSource={plans}
        rowKey="id"
        pagination={false}
        size="middle"
        onRow={(r) => ({ onClick: () => setEditing(r), style: { cursor: "pointer" } })}
        columns={[
          { title: "Gói", dataIndex: "name", render: (v) => <span style={{ fontWeight: 600 }}>{v}</span> },
          { title: "Giá / tháng", dataIndex: "monthlyPrice", align: "right", render: money },
          { title: "Chi nhánh tối đa", dataIndex: "maxBranches", align: "right" },
          { title: "Tài khoản tối đa", dataIndex: "maxAccounts", align: "right" },
          { title: "Bàn tối đa", dataIndex: "maxTables", align: "right" },
        ]}
      />

      <PlanDrawer
        plan={editing}
        onClose={() => setEditing(null)}
        onSave={async (data) => {
          try {
            if (editing === "new") {
              await createPlan(data);
              message.success("Đã tạo gói mới");
            } else if (editing) {
              await updatePlan(editing.id, data);
              message.success("Đã cập nhật gói");
            }
            setEditing(null);
            await load();
          } catch (err) {
            message.error(err instanceof Error ? err.message : "Không lưu được");
          }
        }}
      />
    </Card>
  );
}

function PlanDrawer({
  plan,
  onClose,
  onSave,
}: {
  plan: Plan | "new" | null;
  onClose: () => void;
  onSave: (data: Omit<Plan, "id">) => void;
}) {
  const isNew = plan === "new";
  const existing = isNew ? null : plan;
  const [name, setName] = useState(existing?.name ?? "");
  const [monthlyPrice, setMonthlyPrice] = useState(existing?.monthlyPrice ?? 900_000);
  const [maxBranches, setMaxBranches] = useState(existing?.maxBranches ?? 2);
  const [maxAccounts, setMaxAccounts] = useState(existing?.maxAccounts ?? 15);
  const [maxTables, setMaxTables] = useState(existing?.maxTables ?? 20);

  useEffect(() => {
    setName(existing?.name ?? "");
    setMonthlyPrice(existing?.monthlyPrice ?? 900_000);
    setMaxBranches(existing?.maxBranches ?? 2);
    setMaxAccounts(existing?.maxAccounts ?? 15);
    setMaxTables(existing?.maxTables ?? 20);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  return (
    <Drawer
      title={isNew ? "Thêm gói dịch vụ" : `Sửa gói · ${existing?.name}`}
      open={!!plan}
      onClose={onClose}
      styles={{ wrapper: { width: 400 }, body: { padding: 24 } }}
    >
      <Field label="Tên gói">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Giá / tháng (₫)">
        <InputNumber value={monthlyPrice} onChange={(v) => setMonthlyPrice(v ?? 0)} style={{ width: "100%" }} min={0} step={100_000} />
      </Field>
      <Field label="Số chi nhánh tối đa">
        <InputNumber value={maxBranches} onChange={(v) => setMaxBranches(v ?? 1)} style={{ width: "100%" }} min={1} />
      </Field>
      <Field label="Số tài khoản tối đa">
        <InputNumber value={maxAccounts} onChange={(v) => setMaxAccounts(v ?? 1)} style={{ width: "100%" }} min={1} />
      </Field>
      <Field label="Số bàn tối đa">
        <InputNumber value={maxTables} onChange={(v) => setMaxTables(v ?? 1)} style={{ width: "100%" }} min={1} />
      </Field>
      <Button
        type="primary"
        block
        style={{ marginTop: 8 }}
        onClick={() => onSave({ name: name.trim(), monthlyPrice, maxBranches, maxAccounts, maxTables })}
        disabled={!name.trim()}
      >
        Lưu gói
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
