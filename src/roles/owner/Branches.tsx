import { App, Button, Card } from "antd";
import { Clock, MapPin, Plus, Table2, Users } from "lucide-react";
import { branches, countStaffByBranch, type Branch } from "../../data";
import { SectionTitle } from "../../components/bits";

function BranchCard({ b }: { b: Branch }) {
  const { message } = App.useApp();
  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{b.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#71717a", fontSize: 13, marginTop: 4 }}>
            <MapPin size={14} /> {b.address}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, color: "#71717a", fontSize: 13, marginTop: 4 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Clock size={14} /> {b.hours}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Table2 size={14} /> {b.tables} bàn
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Users size={14} /> {countStaffByBranch(b.id)} nhân viên
            </span>
          </div>
        </div>
        <span
          style={{
            background: b.status === "open" ? "#e7f7ec" : "#f4f4f5",
            color: b.status === "open" ? "#0a0a0a" : "#71717a",
            padding: "3px 10px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {b.status === "open" ? "Đang mở cửa" : "Đóng cửa"}
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        <Button size="small" onClick={() => message.info(`Sửa ${b.name}`)}>
          Sửa chi nhánh
        </Button>
      </div>
    </Card>
  );
}

export default function Branches() {
  const { message } = App.useApp();
  return (
    <div>
      <SectionTitle
        title="Chi nhánh"
        sub="Mỗi chi nhánh có sơ đồ bàn, menu và nhân viên riêng"
        extra={
          <Button type="primary" icon={<Plus size={15} />} onClick={() => message.info("Tạo chi nhánh mới")}>
            Thêm chi nhánh
          </Button>
        }
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 16 }}>
        {branches.map((b) => (
          <BranchCard key={b.id} b={b} />
        ))}
      </div>
    </div>
  );
}
