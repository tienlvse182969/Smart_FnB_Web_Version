import { App, Button, Card, Drawer, Input, Switch, Table, TimePicker } from "antd";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import type { ShiftTemplate } from "../../types";
import { createShiftTemplate, listShiftTemplates, setShiftTemplateActive, updateShiftTemplate } from "../../services";
import { SectionTitle } from "../../components/bits";
import { useAppStore } from "../../store";

/** Ca mẫu (mục 4.5.H, BR-47): tên, giờ bắt đầu/kết thúc trong cùng ngày, bật/tắt. */
export default function ShiftTemplates() {
  const { message } = App.useApp();
  const currentUser = useAppStore((s) => s.currentUser);
  const currentBranchId = useAppStore((s) => s.currentBranchId);
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [editing, setEditing] = useState<ShiftTemplate | "new" | null>(null);

  const load = () => {
    if (currentBranchId) listShiftTemplates(currentBranchId).then(setTemplates);
  };
  useEffect(load, [currentBranchId]);

  const toggleActive = async (t: ShiftTemplate, active: boolean) => {
    await setShiftTemplateActive(t.id, active);
    message.success(active ? "Đã bật ca mẫu" : "Đã tắt ca mẫu");
    load();
  };

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title="Ca mẫu"
        sub="Khung giờ làm việc lặp lại của chi nhánh — dùng để phân ca theo ngày"
        extra={
          <Button type="primary" icon={<Plus size={15} />} onClick={() => setEditing("new")}>
            Thêm ca mẫu
          </Button>
        }
      />
      <Table<ShiftTemplate>
        dataSource={templates}
        rowKey="id"
        pagination={false}
        size="middle"
        onRow={(r) => ({ onClick: () => setEditing(r), style: { cursor: "pointer" } })}
        columns={[
          { title: "Tên ca", dataIndex: "name", render: (v) => <span style={{ fontWeight: 600 }}>{v}</span> },
          { title: "Bắt đầu", dataIndex: "startTime" },
          { title: "Kết thúc", dataIndex: "endTime" },
          {
            title: "Bật",
            dataIndex: "active",
            align: "center",
            render: (active: boolean, r) => (
              <Switch checked={active} size="small" onChange={(c) => toggleActive(r, c)} onClick={(_, e) => e.stopPropagation()} />
            ),
          },
        ]}
      />

      <TemplateDrawer
        template={editing}
        onClose={() => setEditing(null)}
        onSave={async (data) => {
          if (!currentUser?.tenantId || !currentBranchId) return;
          try {
            if (editing === "new") {
              await createShiftTemplate(currentUser.tenantId, currentBranchId, data.name, data.startTime, data.endTime);
              message.success("Đã tạo ca mẫu");
            } else if (editing) {
              await updateShiftTemplate(editing.id, data);
              message.success("Đã cập nhật ca mẫu");
            }
            setEditing(null);
            load();
          } catch (err) {
            message.error(err instanceof Error ? err.message : "Không lưu được");
          }
        }}
      />
    </Card>
  );
}

function TemplateDrawer({
  template,
  onClose,
  onSave,
}: {
  template: ShiftTemplate | "new" | null;
  onClose: () => void;
  onSave: (data: { name: string; startTime: string; endTime: string }) => void;
}) {
  const existing = template === "new" ? null : template;
  const [name, setName] = useState(existing?.name ?? "");
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(
    existing ? [dayjs(existing.startTime, "HH:mm"), dayjs(existing.endTime, "HH:mm")] : null
  );

  useEffect(() => {
    setName(existing?.name ?? "");
    setRange(existing ? [dayjs(existing.startTime, "HH:mm"), dayjs(existing.endTime, "HH:mm")] : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  const save = () => {
    if (!name.trim() || !range) return;
    onSave({ name: name.trim(), startTime: range[0].format("HH:mm"), endTime: range[1].format("HH:mm") });
  };

  return (
    <Drawer
      title={template === "new" ? "Thêm ca mẫu" : `Sửa ca mẫu · ${existing?.name}`}
      open={!!template}
      onClose={onClose}
      styles={{ wrapper: { width: 380 }, body: { padding: 24 } }}
    >
      <Field label="Tên ca">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Ca sáng" />
      </Field>
      <Field label="Giờ bắt đầu — kết thúc (cùng ngày)">
        <TimePicker.RangePicker
          format="HH:mm"
          value={range}
          onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)}
          style={{ width: "100%" }}
        />
      </Field>
      <Button type="primary" block style={{ marginTop: 8 }} disabled={!name.trim() || !range} onClick={save}>
        Lưu ca mẫu
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
