import { App, Card, Drawer, Input, InputNumber, Table } from "antd";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import type { ServicePlan } from "../../types";
import { adminApi, showApiError } from "../../api";
import ActionButton from "../../plan/ActionButton";
import { money } from "../../data";
import { SectionTitle } from "../../components/bits";
import { palette } from "../../theme";

/**
 * Quản lý gói dịch vụ (PA-04). TODO(3.3): thêm mã gói, bật/tắt gói, cấp và cờ tính năng, bỏ số mặc định viết cứng; hiện chỉ đủ để
 * duyệt hồ sơ và đổi gói chọn được gói thật.
 */
export default function PlansTable() {
  const { message } = App.useApp();
  const [plans, setPlans] = useState<ServicePlan[]>([]);
  const [editing, setEditing] = useState<ServicePlan | "new" | null>(null);

  const load = () => adminApi.listPlans().then(setPlans).catch((err) => showApiError(message.error, err, "Không tải được gói"));
  useEffect(() => {
    load();
  }, []);

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title="Gói dịch vụ"
        sub="Giá tháng và hạn mức chi nhánh / tài khoản — áp cho toàn bộ doanh nghiệp dùng gói này"
        extra={
          <ActionButton type="primary" icon={<Plus size={15} />} onClick={() => setEditing("new")}>
            Thêm gói
          </ActionButton>
        }
      />
      <Table<ServicePlan>
        dataSource={plans}
        rowKey="id"
        pagination={false}
        size="middle"
        onRow={(r) => ({ onClick: () => setEditing(r), style: { cursor: "pointer" } })}
        columns={[
          { title: "Gói", dataIndex: "name", render: (v) => <span style={{ fontWeight: 600 }}>{v}</span> },
          { title: "Giá / tháng", dataIndex: "monthlyPrice", align: "right", render: (v: number) => money(v) },
          { title: "Chi nhánh tối đa", dataIndex: "maxBranches", align: "right" },
          { title: "Tài khoản tối đa", dataIndex: "maxAccounts", align: "right" },
        ]}
      />

      <PlanDrawer
        plan={editing}
        onClose={() => setEditing(null)}
        onSave={async (data) => {
          try {
            if (editing === "new") {
              // BE bắt buộc `code` duy nhất: tạm sinh từ tên (3.3 cho nhập).
              const code = data.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
              await adminApi.createPlan({ code, ...data });
              message.success("Đã tạo gói mới");
            } else if (editing) {
              await adminApi.updatePlan(editing.id, data);
              message.success("Đã cập nhật gói");
            }
            setEditing(null);
            await load();
          } catch (err) {
            showApiError(message.error, err, "Không lưu được");
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
  plan: ServicePlan | "new" | null;
  onClose: () => void;
  onSave: (data: Pick<ServicePlan, "name" | "monthlyPrice" | "maxBranches" | "maxAccounts">) => void;
}) {
  const isNew = plan === "new";
  const existing = isNew ? null : plan;
  const [name, setName] = useState(existing?.name ?? "");
  const [monthlyPrice, setMonthlyPrice] = useState(existing?.monthlyPrice ?? 900_000);
  const [maxBranches, setMaxBranches] = useState(existing?.maxBranches ?? 2);
  const [maxAccounts, setMaxAccounts] = useState(existing?.maxAccounts ?? 15);

  useEffect(() => {
    setName(existing?.name ?? "");
    setMonthlyPrice(existing?.monthlyPrice ?? 900_000);
    setMaxBranches(existing?.maxBranches ?? 2);
    setMaxAccounts(existing?.maxAccounts ?? 15);
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
      <ActionButton
        type="primary"
        block
        style={{ marginTop: 8 }}
        onClick={() => onSave({ name: name.trim(), monthlyPrice, maxBranches, maxAccounts })}
        disabled={!name.trim()}
      >
        Lưu gói
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
