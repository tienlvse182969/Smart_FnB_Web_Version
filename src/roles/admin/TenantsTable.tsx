import { App, Button, Card, Collapse, Drawer, Progress, Select, Table, Tag } from "antd";
import { Ban, CalendarClock, KeyRound, Layers, Play, Users, Wallet as WalletIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { LedgerEntry, LedgerEntryType, Plan, Tenant, TenantStatus } from "../../types";
import { DEFAULT_PASSWORD } from "../../types";
import {
  changeTenantPlan,
  countTenantAccounts,
  getDemoAccounts,
  getWalletBalance,
  listBranches,
  listLedger,
  listPlans,
  listTenants,
  renewTenant,
  resetPassword,
  setTenantStatus,
  type WalletBalance,
} from "../../services";
import { money } from "../../data";
import { SectionTitle } from "../../components/bits";

const statusTag: Record<TenantStatus, { label: string; color: string; bg: string }> = {
  active: { label: "Đang hoạt động", color: "#0a0a0a", bg: "#e7f7ec" },
  expired: { label: "Hết hạn · chỉ đọc", color: "#0a0a0a", bg: "#fff3d6" },
  suspended: { label: "Tạm ngưng · chỉ đọc", color: "#fff", bg: "#0a0a0a" },
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

/**
 * PA-05→PA-07: danh sách/chi tiết doanh nghiệp — chỉ số liệu tổng hợp (BR-21:
 * không hiện menu, món, doanh thu tiền mặt, nội dung đơn hàng).
 */
export default function TenantsTable() {
  const { message, modal } = App.useApp();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [branchCounts, setBranchCounts] = useState<Record<string, number>>({});
  const [accountCounts, setAccountCounts] = useState<Record<string, number>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const sel = tenants.find((t) => t.id === openId) ?? null;
  const selPlan = sel ? plans.find((p) => p.id === sel.planId) : null;

  const LEDGER_TYPE_LABEL: Record<LedgerEntryType, string> = {
    hold: "Tạm giữ",
    settle: "Quyết toán",
    fee: "Phí",
    refund: "Hoàn tiền (GĐ2)",
    withdraw_hold: "Giữ để rút",
    withdraw_release: "Trả lại",
    withdraw_paid: "Đã chuyển",
  };

  useEffect(() => {
    if (!openId) {
      setWalletBalance(null);
      setLedger([]);
      return;
    }
    getWalletBalance(openId, "admin").then(setWalletBalance);
    listLedger(openId, "admin").then((entries) => setLedger(entries.slice(0, 20)));
  }, [openId]);

  const load = async () => {
    const [tenantList, planList] = await Promise.all([listTenants(), listPlans()]);
    setTenants(tenantList);
    setPlans(planList);
    const branchEntries = await Promise.all(
      tenantList.map(async (t) => [t.id, (await listBranches(t.id)).length] as const)
    );
    setBranchCounts(Object.fromEntries(branchEntries));
    const accountEntries = await Promise.all(
      tenantList.map(async (t) => [t.id, await countTenantAccounts(t.id)] as const)
    );
    setAccountCounts(Object.fromEntries(accountEntries));
  };

  useEffect(() => {
    load();
  }, []);

  const doSetStatus = async (id: string, status: TenantStatus, msg: string) => {
    await setTenantStatus(id, status);
    message.success(msg);
    await load();
  };

  const doRenew = async (id: string) => {
    const t = await renewTenant(id);
    message.success(`Đã gia hạn tới ${t.renewsAt}`);
    await load();
  };

  const doChangePlan = async (id: string, planId: string) => {
    await changeTenantPlan(id, planId);
    message.success("Đã đổi gói dịch vụ");
    await load();
  };

  const doResetOwnerPassword = async (tenantId: string) => {
    const accounts = await getDemoAccounts();
    const owner = accounts.find((a) => a.tenantId === tenantId && a.role === "owner");
    if (!owner) {
      message.error("Không tìm thấy tài khoản Owner của doanh nghiệp này");
      return;
    }
    await resetPassword(owner.id);
    modal.success({
      title: `Đã đặt lại mật khẩu Owner`,
      content: (
        <div style={{ fontSize: 13.5, lineHeight: 1.8 }}>
          Email: <b>{owner.email}</b>
          <br />
          Mật khẩu tạm mới: <b>{DEFAULT_PASSWORD}</b> (bắt đổi ở lần đăng nhập tới)
        </div>
      ),
    });
  };

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title="Doanh nghiệp thuê bao"
        sub="Chỉ số liệu tổng hợp phục vụ tính phí — không xem menu, món, doanh thu tiền mặt, nội dung đơn hàng (BR-21)"
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
          {
            title: "Gói",
            dataIndex: "planId",
            render: (id: string) => <Tag>{plans.find((p) => p.id === id)?.name ?? id}</Tag>,
          },
          {
            title: "Chi nhánh",
            key: "branches",
            render: (_, r) => {
              const plan = plans.find((p) => p.id === r.planId);
              const used = branchCounts[r.id] ?? 0;
              const limit = plan?.maxBranches ?? 1;
              return (
                <div style={{ width: 96 }}>
                  <div style={{ fontSize: 12.5, marginBottom: 4 }}>{used}/{limit}</div>
                  <Progress percent={(used / limit) * 100} showInfo={false} size="small" strokeColor="#0a0a0a" railColor="#ececee" />
                </div>
              );
            },
          },
          {
            title: "Trạng thái",
            dataIndex: "status",
            render: (s: TenantStatus) => (
              <span style={{ background: statusTag[s].bg, color: statusTag[s].color, padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" }}>
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
        styles={{ wrapper: { width: 440 }, body: { padding: 24 } }}
      >
        {sel && selPlan && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, alignItems: "center" }}>
              <Select
                size="small"
                value={sel.planId}
                style={{ width: 160 }}
                onChange={(v) => doChangePlan(sel.id, v)}
                options={plans.map((p) => ({ value: p.id, label: p.name }))}
              />
              <span style={{ background: statusTag[sel.status].bg, color: statusTag[sel.status].color, padding: "1px 10px", borderRadius: 999, fontSize: 12, fontWeight: 500 }}>
                {statusTag[sel.status].label}
              </span>
            </div>

            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#71717a", marginBottom: 14 }}>HẠN MỨC GÓI DỊCH VỤ</div>
            <LimitRow icon={<Layers size={15} />} label="Chi nhánh" used={branchCounts[sel.id] ?? 0} limit={selPlan.maxBranches} />
            <LimitRow icon={<Users size={15} />} label="Tài khoản" used={accountCounts[sel.id] ?? 0} limit={selPlan.maxAccounts} />

            <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderTop: "1px solid var(--ant-color-border)", marginTop: 8 }}>
              <span style={{ color: "#71717a", display: "flex", alignItems: "center", gap: 7 }}>
                <CalendarClock size={15} /> Gia hạn kế tiếp
              </span>
              <span style={{ fontWeight: 600 }}>{sel.renewsAt}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0 0 18px" }}>
              <span style={{ color: "#71717a" }}>Phí thuê bao / tháng</span>
              <span style={{ fontWeight: 600 }}>{money(selPlan.monthlyPrice)}</span>
            </div>

            <Collapse
              ghost
              style={{ marginBottom: 16 }}
              items={[
                {
                  key: "wallet",
                  label: (
                    <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 600, color: "#52525b" }}>
                      <WalletIcon size={15} /> Ví & sổ cái (chỉ xem — Admin không sửa được số dư)
                    </span>
                  ),
                  children: (
                    <>
                      <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 12.5 }}>
                        <div>Tạm giữ: <b>{money(walletBalance?.heldBalance ?? 0)}</b></div>
                        <div>Khả dụng: <b>{money(walletBalance?.availableBalance ?? 0)}</b></div>
                        <div>Chờ rút: <b>{money(walletBalance?.pendingWithdraw ?? 0)}</b></div>
                      </div>
                      <Table<LedgerEntry>
                        dataSource={ledger}
                        rowKey="id"
                        size="small"
                        pagination={false}
                        columns={[
                          { title: "Thời gian", dataIndex: "createdAt", render: (v) => new Date(v).toLocaleString("vi-VN") },
                          { title: "Loại", dataIndex: "type", render: (t: LedgerEntryType) => LEDGER_TYPE_LABEL[t] },
                          { title: "Số tiền", dataIndex: "amount", align: "right", render: money },
                        ]}
                      />
                    </>
                  ),
                },
              ]}
            />

            {(sel.status === "suspended" || sel.status === "expired") && (
              <div style={{ background: "#fafafa", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "#52525b", marginBottom: 16 }}>
                Tenant đang ở chế độ chỉ đọc — không khoá cứng, không xoá dữ liệu (BR-22). Owner vẫn rút được số dư khả dụng trong ví.
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Button type="primary" block icon={<CalendarClock size={16} />} onClick={() => doRenew(sel.id)}>
                Gia hạn thuê bao thêm 1 tháng
              </Button>
              {sel.status === "suspended" || sel.status === "expired" ? (
                <Button block icon={<Play size={16} />} onClick={() => doSetStatus(sel.id, "active", `Đã kích hoạt lại ${sel.name}`)}>
                  Kích hoạt lại
                </Button>
              ) : (
                <Button block danger icon={<Ban size={16} />} onClick={() => doSetStatus(sel.id, "suspended", `Đã tạm ngưng ${sel.name} (chế độ chỉ đọc)`)}>
                  Tạm ngưng (chỉ đọc)
                </Button>
              )}
              <Button block icon={<KeyRound size={16} />} onClick={() => doResetOwnerPassword(sel.id)}>
                Đặt lại mật khẩu Owner
              </Button>
            </div>
          </>
        )}
      </Drawer>
    </Card>
  );
}
