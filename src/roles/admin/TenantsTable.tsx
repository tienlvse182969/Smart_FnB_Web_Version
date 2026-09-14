import { App, Button, Card, Drawer, Progress, Table, Tag } from "antd";
import {
  Ban,
  CalendarClock,
  Layers,
  Play,
  Table2,
  Users,
} from "lucide-react";
import { useState } from "react";
import { money, planLimits, tenants as seed, type Tenant } from "../../data";
import { SectionTitle } from "../../components/bits";

const statusTag: Record<Tenant["status"], { label: string; color: string; bg: string }> = {
  active: { label: "Đang hoạt động", color: "#0a0a0a", bg: "#e7f7ec" },
  trial: { label: "Dùng thử", color: "#0a0a0a", bg: "#eef0ff" },
  expiring: { label: "Sắp hết hạn", color: "#0a0a0a", bg: "#fff3d6" },
  suspended: { label: "Tạm ngưng", color: "#fff", bg: "#0a0a0a" },
};

function LimitRow({ icon, label, used, limit }: { icon: React.ReactNode; label: string; used: number; limit: number }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 6 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7, color: "#52525b" }}>
          {icon} {label}
        </span>
        <span style={{ fontWeight: 600 }}>
          {used}/{limit}
        </span>
      </div>
      <Progress percent={(used / limit) * 100} showInfo={false} size="small" strokeColor="#0a0a0a" railColor="#ececee" />
    </div>
  );
}

export default function TenantsTable() {
  const { message } = App.useApp();
  const [tenants, setTenants] = useState<Tenant[]>(seed);
  const [openId, setOpenId] = useState<string | null>(null);
  const sel = tenants.find((t) => t.id === openId) ?? null;

  const setStatus = (id: string, status: Tenant["status"], msg: string) => {
    setTenants((p) => p.map((t) => (t.id === id ? { ...t, status } : t)));
    message.success(msg);
  };

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title="Doanh nghiệp thuê bao"
        sub="Chỉ số liệu tổng hợp phục vụ tính phí — không xem chi tiết đơn hàng của tenant (BR-15)"
      />
      <Table<Tenant>
        dataSource={tenants}
        rowKey="id"
        pagination={false}
        size="middle"
        onRow={(r) => ({ onClick: () => setOpenId(r.id), style: { cursor: "pointer" } })}
        columns={[
          {
            title: "Doanh nghiệp",
            dataIndex: "name",
            render: (v, r) => (
              <div>
                <div style={{ fontWeight: 600 }}>{v}</div>
                <div style={{ fontSize: 12, color: "#a1a1aa" }}>{r.id}</div>
              </div>
            ),
          },
          { title: "Gói", dataIndex: "plan", render: (v) => <Tag>{v}</Tag> },
          {
            title: "Chi nhánh",
            dataIndex: "branches",
            render: (v, r) => (
              <div style={{ width: 96 }}>
                <div style={{ fontSize: 12.5, marginBottom: 4 }}>
                  {v}/{r.branchLimit}
                </div>
                <Progress percent={(v / r.branchLimit) * 100} showInfo={false} size="small" strokeColor="#0a0a0a" railColor="#ececee" />
              </div>
            ),
          },
          { title: "MRR", dataIndex: "mrr", align: "right", render: (v) => money(v) },
          {
            title: "Trạng thái",
            dataIndex: "status",
            render: (s: Tenant["status"]) => (
              <span
                style={{
                  background: statusTag[s].bg,
                  color: statusTag[s].color,
                  padding: "3px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                }}
              >
                {statusTag[s].label}
              </span>
            ),
          },
        ]}
      />

      <Drawer
        title={sel ? sel.name : ""}
        open={!!sel}
        onClose={() => setOpenId(null)}
        styles={{ wrapper: { width: 420 }, body: { padding: 24 } }}
      >
        {sel && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <Tag>{sel.plan}</Tag>
              <span
                style={{
                  background: statusTag[sel.status].bg,
                  color: statusTag[sel.status].color,
                  padding: "1px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {statusTag[sel.status].label}
              </span>
            </div>

            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#71717a", marginBottom: 14 }}>
              HẠN MỨC GÓI DỊCH VỤ
            </div>
            <LimitRow icon={<Layers size={15} />} label="Chi nhánh" used={sel.branches} limit={planLimits[sel.plan].branches} />
            <LimitRow icon={<Users size={15} />} label="Nhân viên" used={Math.round(planLimits[sel.plan].staff * 0.6)} limit={planLimits[sel.plan].staff} />
            <LimitRow icon={<Table2 size={15} />} label="Bàn" used={Math.round(planLimits[sel.plan].tables * 0.55)} limit={planLimits[sel.plan].tables} />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "14px 0",
                borderTop: "1px solid var(--ant-color-border)",
                marginTop: 8,
              }}
            >
              <span style={{ color: "#71717a", display: "flex", alignItems: "center", gap: 7 }}>
                <CalendarClock size={15} /> Gia hạn kế tiếp
              </span>
              <span style={{ fontWeight: 600 }}>{sel.renews}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0 0 18px" }}>
              <span style={{ color: "#71717a" }}>Phí thuê bao / tháng</span>
              <span style={{ fontWeight: 600 }}>{money(sel.mrr)}</span>
            </div>

            {sel.status === "suspended" && (
              <div
                style={{
                  background: "#fafafa",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 12.5,
                  color: "#52525b",
                  marginBottom: 16,
                }}
              >
                Tenant đang ở chế độ chỉ đọc — không khoá cứng, không xoá dữ liệu (BR-12).
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Button
                type="primary"
                block
                icon={<CalendarClock size={16} />}
                onClick={() => setStatus(sel.id, "active", `Đã gia hạn thuê bao ${sel.name} thêm 1 tháng`)}
              >
                Gia hạn thuê bao
              </Button>
              {sel.status === "suspended" ? (
                <Button block icon={<Play size={16} />} onClick={() => setStatus(sel.id, "active", `Đã kích hoạt lại ${sel.name}`)}>
                  Kích hoạt lại
                </Button>
              ) : (
                <Button block danger icon={<Ban size={16} />} onClick={() => setStatus(sel.id, "suspended", `Đã tạm ngưng ${sel.name} (chế độ chỉ đọc)`)}>
                  Tạm ngưng (chỉ đọc)
                </Button>
              )}
            </div>
          </>
        )}
      </Drawer>
    </Card>
  );
}
