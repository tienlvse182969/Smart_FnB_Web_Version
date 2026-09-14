import { App, Button, Card } from "antd";
import { CheckCircle2, X } from "lucide-react";
import { signupRequests } from "../../data";
import { SectionTitle } from "../../components/bits";

export default function SignupRequests() {
  const { message } = App.useApp();
  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title="Đăng ký chờ duyệt"
        sub="Duyệt để khởi tạo tenant & tài khoản Manager gốc"
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {signupRequests.map((r) => (
          <div
            key={r.id}
            style={{
              border: "1px solid var(--ant-color-border)",
              borderRadius: 12,
              padding: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 600 }}>{r.name}</div>
              <span style={{ fontSize: 12, color: "#a1a1aa" }}>{r.submitted}</span>
            </div>
            <div style={{ fontSize: 12.5, color: "#71717a", margin: "4px 0 12px" }}>
              {r.contact} · {r.branches} chi nhánh dự kiến
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button
                type="primary"
                size="small"
                icon={<CheckCircle2 size={15} />}
                onClick={() => message.success(`Đã khởi tạo tenant cho ${r.name}`)}
              >
                Duyệt
              </Button>
              <Button
                size="small"
                icon={<X size={15} />}
                onClick={() => message.info(`Đã từ chối ${r.id}`)}
              >
                Từ chối
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
