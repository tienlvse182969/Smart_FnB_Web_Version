import { App, Card, Drawer, Input, InputNumber, Switch, Table } from "antd";
import { Check, Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { PLAN_TIER_LABEL, type ServicePlan, type ServicePlanInput } from "../../types";
import { adminApi, showApiError } from "../../api";
import ActionButton from "../../plan/ActionButton";
import { FEATURE_KEYS, featuresForTier, suggestPlanCode, tierFromCode } from "../../plan/tiers";
import { FEATURE_LABEL } from "../../plan/FeatureGate";
import { SectionTitle } from "../../components/bits";
import { formatVnd } from "../../lib/reportFormat";
import { palette } from "../../theme";
import { Chip } from "./adminUi";

/**
 * PA-04: quản lý gói (real qua /admin/service-plans). Số liệu (giá, hạn mức) do Admin nhập, không có số mặc định viết cứng (CC-01).
 * `maxTables` là v7 nhưng BE còn bắt buộc → ẩn, gửi giá trị nhỏ nhất BE chấp nhận (xem admin/real.ts). Hai cờ gói
 * (`brandingEnabled`, `multiBranchComparisonEnabled`) đọc/ghi thật; cờ AI và cấp vẫn suy từ mã gói (chờ BE).
 */
export default function PlansTable() {
  const { message, modal } = App.useApp();
  const [plans, setPlans] = useState<ServicePlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<ServicePlan | "new" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPlans(await adminApi.listPlans());
    } catch (err) {
      showApiError(message.error, err, "Không tải được danh sách gói");
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title="Gói dịch vụ"
        sub="Giá tháng và hạn mức chi nhánh / tài khoản — áp cho mọi doanh nghiệp dùng gói này"
        extra={
          <ActionButton type="primary" icon={<Plus size={15} />} onClick={() => setEditing("new")}>
            Thêm gói
          </ActionButton>
        }
      />
      <Table<ServicePlan>
        dataSource={plans}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="middle"
        scroll={{ x: 760 }}
        onRow={(r) => ({ onClick: () => setEditing(r), style: { cursor: "pointer" } })}
        columns={[
          { title: "Gói", dataIndex: "name", render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
          { title: "Mã", dataIndex: "code" },
          { title: "Cấp", render: (_, r) => <TierLabel code={r.code} /> },
          { title: "Giá / tháng", dataIndex: "monthlyPrice", align: "right", render: (v: number) => formatVnd(v) },
          { title: "Chi nhánh tối đa", dataIndex: "maxBranches", align: "right" },
          { title: "Tài khoản tối đa", dataIndex: "maxAccounts", align: "right" },
          { title: "Nhận diện", dataIndex: "brandingEnabled", align: "center", render: (v: boolean) => (v ? <Check size={14} color={palette.success.text} /> : <Minus size={14} color={palette.textSubtle} />) },
          { title: "So sánh chi nhánh", dataIndex: "multiBranchComparisonEnabled", align: "center", render: (v: boolean) => (v ? <Check size={14} color={palette.success.text} /> : <Minus size={14} color={palette.textSubtle} />) },
          { title: "Trạng thái", dataIndex: "isActive", render: (v: boolean) => <Chip tone={v ? "success" : "neutral"}>{v ? "Đang bán" : "Ngừng bán"}</Chip> },
        ]}
      />

      <PlanDrawer
        plan={editing}
        onClose={() => setEditing(null)}
        onSave={(input) =>
          // Mọi thao tác ghi đều qua hộp xác nhận; đóng drawer + nạp lại chỉ khi lưu xong.
          new Promise<void>((resolve) => {
            const creating = editing === "new";
            modal.confirm({
              title: creating ? `Tạo gói "${input.name}"?` : `Lưu thay đổi gói "${input.name}"?`,
              content: (
                <div data-testid="confirm-plan" style={{ fontSize: 13.5, lineHeight: 1.7 }}>
                  Mã <b>{input.code}</b> · {formatVnd(input.monthlyPrice)} / tháng · {input.maxBranches} chi nhánh · {input.maxAccounts} tài khoản
                  <br />
                  Nhận diện thương hiệu: <b>{input.brandingEnabled ? "bật" : "tắt"}</b> · So sánh đa chi nhánh: <b>{input.multiBranchComparisonEnabled ? "bật" : "tắt"}</b>
                  <br />
                  Áp cho mọi doanh nghiệp đang dùng gói này.
                </div>
              ),
              okText: creating ? "Tạo gói" : "Lưu gói",
              cancelText: "Huỷ",
              onCancel: () => resolve(),
              onOk: async () => {
                try {
                  if (creating) {
                    await adminApi.createPlan(input);
                    message.success("Đã tạo gói mới");
                  } else if (editing) {
                    await adminApi.updatePlan(editing.id, input);
                    message.success("Đã cập nhật gói");
                  }
                  setEditing(null);
                  await load();
                } catch (err) {
                  showApiError(message.error, err, "Không lưu được gói");
                } finally {
                  resolve();
                }
              },
            });
          })
        }
      />
    </Card>
  );
}

function TierLabel({ code }: { code: string }) {
  const tier = tierFromCode(code);
  return tier ? <>{PLAN_TIER_LABEL[tier]}</> : <span style={{ color: palette.textSubtle }}>Chưa xếp cấp</span>;
}

const CODE_PATTERN = /^[A-Z0-9_]{2,50}$/;

function PlanDrawer({
  plan,
  onClose,
  onSave,
}: {
  plan: ServicePlan | "new" | null;
  onClose: () => void;
  onSave: (data: ServicePlanInput) => Promise<void>;
}) {
  const isNew = plan === "new";
  const existing = plan && plan !== "new" ? plan : null;
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  const [monthlyPrice, setMonthlyPrice] = useState<number | null>(null);
  const [maxBranches, setMaxBranches] = useState<number | null>(null);
  const [maxAccounts, setMaxAccounts] = useState<number | null>(null);
  const [brandingEnabled, setBrandingEnabled] = useState(false);
  const [comparisonEnabled, setComparisonEnabled] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Mở drawer: nạp từ gói đang sửa; gói mới thì để trống (không có số mặc định viết cứng — CC-01).
  useEffect(() => {
    setName(existing?.name ?? "");
    setCode(existing?.code ?? "");
    setCodeTouched(!!existing);
    setMonthlyPrice(existing?.monthlyPrice ?? null);
    setMaxBranches(existing?.maxBranches ?? null);
    setMaxAccounts(existing?.maxAccounts ?? null);
    setBrandingEnabled(existing?.brandingEnabled ?? false);
    setComparisonEnabled(existing?.multiBranchComparisonEnabled ?? false);
    setIsActive(existing?.isActive ?? true);
  }, [plan]);

  const onName = (value: string) => {
    setName(value);
    // Mã tự gợi ý từ tên cho tới khi Admin tự sửa mã.
    if (!codeTouched) setCode(suggestPlanCode(value));
  };

  const valid =
    !!name.trim() && CODE_PATTERN.test(code) && monthlyPrice !== null && maxBranches !== null && maxBranches >= 1 && maxAccounts !== null && maxAccounts >= 1;

  const tier = tierFromCode(code);
  const derived = featuresForTier(tier ?? "BASIC");

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        code,
        monthlyPrice: monthlyPrice!,
        maxBranches: maxBranches!,
        maxAccounts: maxAccounts!,
        brandingEnabled,
        multiBranchComparisonEnabled: comparisonEnabled,
        isActive,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      title={isNew ? "Thêm gói dịch vụ" : `Sửa gói · ${existing?.name ?? ""}`}
      open={!!plan}
      onClose={onClose}
      styles={{ wrapper: { width: 420 }, body: { padding: 24 } }}
    >
      <Field label="Tên gói">
        <Input value={name} onChange={(e) => onName(e.target.value)} />
      </Field>
      <Field label="Mã gói (BASIC, STANDARD, ADVANCED để xếp cấp)">
        <Input
          value={code}
          onChange={(e) => {
            setCodeTouched(true);
            setCode(e.target.value.toUpperCase());
          }}
          status={code && !CODE_PATTERN.test(code) ? "error" : undefined}
          placeholder="Tự gợi ý từ tên, có thể sửa"
        />
      </Field>
      <Field label="Giá / tháng (₫)">
        <InputNumber value={monthlyPrice} onChange={setMonthlyPrice} style={{ width: "100%" }} min={0} precision={0} />
      </Field>
      <Field label="Số chi nhánh tối đa">
        <InputNumber value={maxBranches} onChange={setMaxBranches} style={{ width: "100%" }} min={1} precision={0} />
      </Field>
      <Field label="Số tài khoản tối đa">
        <InputNumber value={maxAccounts} onChange={setMaxAccounts} style={{ width: "100%" }} min={1} precision={0} />
      </Field>
      <Field label="Đang bán">
        <Switch checked={isActive} onChange={setIsActive} />
      </Field>
      <Field label="Tính năng của gói (BE lưu)">
        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5 }}>
            <Switch checked={brandingEnabled} onChange={setBrandingEnabled} data-testid="plan-branding" />
            {FEATURE_LABEL.branding}
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5 }}>
            <Switch checked={comparisonEnabled} onChange={setComparisonEnabled} data-testid="plan-comparison" />
            {FEATURE_LABEL.multiBranchCompare}
          </label>
        </div>
      </Field>

      <div style={{ background: palette.paperSubtle, borderRadius: 10, padding: "12px 14px", marginBottom: 18 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: palette.textMuted, marginBottom: 2 }}>
          Cấp: {tier ? PLAN_TIER_LABEL[tier] : "Chưa xếp cấp (coi như Cơ bản)"}
        </div>
        <div style={{ fontSize: 11.5, color: palette.textSubtle, marginBottom: 8 }}>Cờ AI suy từ mã gói theo đặc tả 13.1 — chờ BE lưu cờ AI và cấp (api-contract-plan #30)</div>
        {FEATURE_KEYS.filter((key) => key === "aiAssistant").map((key) => (
          <div key={key} data-testid={`plan-feature-${key}`} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "3px 0" }}>
            {derived[key].enabled ? <Check size={14} color={palette.success.text} /> : <Minus size={14} color={palette.textSubtle} />}
            <span style={{ color: derived[key].enabled ? palette.ink : palette.textSubtle }}>{FEATURE_LABEL[key]}</span>
          </div>
        ))}
      </div>

      <ActionButton type="primary" block loading={saving} disabled={!valid} onClick={submit}>
        Lưu gói
      </ActionButton>
    </Drawer>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: palette.textMuted, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}
