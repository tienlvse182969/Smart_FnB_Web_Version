import { App, Button, Card, Tag } from "antd";
import { CheckCircle2, QrCode } from "lucide-react";
import { bankAccount } from "../../data";
import { SectionTitle } from "../../components/bits";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "12px 0",
        borderBottom: "1px solid var(--ant-color-border)",
        fontSize: 14,
      }}
    >
      <span style={{ color: "#71717a" }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

export default function PaymentConfig() {
  const { message } = App.useApp();
  return (
    <div style={{ maxWidth: 620 }}>
      <SectionTitle
        title="Tài khoản nhận thanh toán"
        sub="Tài khoản này áp dụng cho toàn bộ chi nhánh của chuỗi · webhook ngân hàng tự đối soát (BR-05)"
      />
      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 22 } }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 11,
              background: "#0a0a0a",
              display: "grid",
              placeItems: "center",
            }}
          >
            <QrCode size={22} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{bankAccount.bank}</div>
            <div style={{ fontSize: 12.5, color: "#71717a" }}>VietQR · Toàn chuỗi</div>
          </div>
          {bankAccount.connected && (
            <Tag color="black" icon={<CheckCircle2 size={13} />} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              Đã kết nối
            </Tag>
          )}
        </div>

        <Row label="Chủ tài khoản" value={bankAccount.accountName} />
        <Row label="Số tài khoản" value={bankAccount.accountNumber} />
        <Row label="Webhook đối soát" value={<span style={{ fontSize: 12, color: "#52525b" }}>{bankAccount.webhook}</span>} />

        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <Button type="primary" onClick={() => message.info("Cập nhật tài khoản nhận tiền")}>
            Cập nhật tài khoản
          </Button>
          <Button onClick={() => message.success("Đã gửi giao dịch thử — webhook phản hồi 200 OK")}>
            Kiểm tra webhook
          </Button>
        </div>
      </Card>
    </div>
  );
}
