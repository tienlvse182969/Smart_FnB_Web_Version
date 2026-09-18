import { useEffect, useState } from "react";
import { App, Button, Card, InputNumber } from "antd";
import { FastForward, PlayCircle } from "lucide-react";
import { getPlatformConfig, runSettlementForAllTenants, updatePlatformConfig } from "../../services";
import { money } from "../../data";
import { SectionTitle } from "../../components/bits";
import { useAppStore } from "../../store";

/**
 * PA-10: cấu hình nền tảng (phí dịch vụ, thời gian tạm giữ, rút tối thiểu —
 * đổi không hồi tố, BR-37) + chạy job quyết toán thủ công cho demo (mục 6.6).
 */
export default function PlatformSettings() {
  const { message } = App.useApp();
  const currentUser = useAppStore((s) => s.currentUser);
  const [feePercent, setFeePercent] = useState(2.5);
  const [holdHours, setHoldHours] = useState(24);
  const [minWithdraw, setMinWithdraw] = useState(500_000);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [simulatedNow, setSimulatedNow] = useState(() => new Date());

  useEffect(() => {
    getPlatformConfig().then((c) => {
      setFeePercent(c.feePercent);
      setHoldHours(c.holdHours);
      setMinWithdraw(c.minWithdraw);
    });
  }, []);

  const save = async () => {
    if (!currentUser) return;
    setSaving(true);
    try {
      await updatePlatformConfig({ feePercent, holdHours, minWithdraw }, currentUser.email);
      message.success("Đã lưu cấu hình — chỉ áp dụng cho các bút toán từ bây giờ, không hồi tố (BR-37)");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Không lưu được");
    } finally {
      setSaving(false);
    }
  };

  const runSettlement = async () => {
    setRunning(true);
    try {
      const results = await runSettlementForAllTenants(simulatedNow, "admin");
      if (results.length === 0) {
        message.info("Không có bút toán tạm giữ nào đã đủ thời gian để quyết toán");
      } else {
        message.success(
          `Đã quyết toán cho ${results.length} doanh nghiệp: ${results
            .map((r) => `${r.tenant.name} (${money(r.batch.totalAmount)})`)
            .join(", ")}`
        );
      }
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ maxWidth: 620 }}>
      <SectionTitle title="Cấu hình nền tảng" sub="Phí dịch vụ, thời gian tạm giữ, mức rút tối thiểu — đổi không hồi tố" />
      <Card style={{ borderRadius: 14, marginBottom: 16 }} styles={{ body: { padding: 22 } }}>
        <Field label="Phí dịch vụ thanh toán (%)">
          <InputNumber value={feePercent} onChange={(v) => setFeePercent(v ?? 0)} min={0} max={100} step={0.1} style={{ width: "100%" }} />
        </Field>
        <Field label="Thời gian tạm giữ (giờ)">
          <InputNumber value={holdHours} onChange={(v) => setHoldHours(v ?? 0)} min={0} style={{ width: "100%" }} />
        </Field>
        <Field label="Mức rút tối thiểu (₫)">
          <InputNumber value={minWithdraw} onChange={(v) => setMinWithdraw(v ?? 0)} min={0} step={100_000} style={{ width: "100%" }} />
        </Field>
        <Button type="primary" loading={saving} onClick={save}>
          Lưu cấu hình
        </Button>
      </Card>

      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 22 } }}>
        <SectionTitle title="Job quyết toán" sub="Gom các khoản tạm giữ đã đủ thời gian, trừ phí, ghi bút toán quyết toán (BR-36/37/53)" />
        <div style={{ fontSize: 13, color: "#71717a", marginBottom: 14 }}>
          Đồng hồ demo: <b>{simulatedNow.toLocaleString("vi-VN")}</b>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            icon={<FastForward size={14} />}
            onClick={() => setSimulatedNow((d) => new Date(d.getTime() + 24 * 3600_000))}
          >
            Tua thời gian +24h (demo)
          </Button>
          <Button type="primary" icon={<PlayCircle size={14} />} loading={running} onClick={runSettlement}>
            Chạy quyết toán
          </Button>
        </div>
      </Card>
    </div>
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
