import { Card } from "antd";
import { money } from "../../data";
import { SectionTitle } from "../../components/bits";
import { useAppStore } from "../../store";

/**
 * Doanh thu chi nhánh theo hình thức thanh toán — dữ liệu thật từ `payments`
 * (mock/db.ts), thay cho biểu đồ giờ giả lập trước đây (không có dữ liệu
 * theo giờ thật trong mô hình mới).
 */
export default function RevenueChart() {
  const branches = useAppStore((s) => s.branches);
  const currentBranchId = useAppStore((s) => s.currentBranchId);
  const payments = useAppStore((s) => s.payments);

  const branchName = branches.find((b) => b.id === currentBranchId)?.name ?? "";
  const confirmed = payments.filter((p) => p.status === "confirmed");
  const qrTotal = confirmed.filter((p) => p.method === "qr").reduce((s, p) => s + p.amount, 0);
  const cashTotal = confirmed.filter((p) => p.method === "cash").reduce((s, p) => s + p.amount, 0);
  const max = Math.max(qrTotal, cashTotal, 1);

  const bars = [
    { label: "Chuyển khoản QR", value: qrTotal },
    { label: "Tiền mặt", value: cashTotal },
  ];

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle title="Doanh thu theo hình thức thanh toán" sub={`${branchName} · hôm nay`} />
      <div style={{ display: "flex", alignItems: "flex-end", gap: 24, height: 168, marginTop: 8, paddingLeft: 8 }}>
        {bars.map((b) => (
          <div key={b.label} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ height: 140, display: "flex", alignItems: "flex-end" }}>
              <div
                title={money(b.value)}
                style={{
                  width: "100%",
                  height: `${(b.value / max) * 100}%`,
                  minHeight: b.value > 0 ? 4 : 0,
                  background: b.value === max ? "#0a0a0a" : "#d4d4d8",
                  borderRadius: "5px 5px 0 0",
                  transition: "height .3s",
                }}
              />
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6 }}>{money(b.value)}</div>
            <div style={{ fontSize: 11, color: "#a1a1aa" }}>{b.label}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
