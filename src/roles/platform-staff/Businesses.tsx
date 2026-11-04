import { App, Button, Card, Drawer, Input, Select, Table, Typography } from "antd";
import { useCallback, useEffect, useState } from "react";
import { platformStaffApi } from "../../api/platformStaff";
import { showApiError } from "../../api";
import type { Business, Paginated, ServicePlan } from "../../types";
import { formatDateTime, formatVnd } from "../../lib/reportFormat";
import { Field } from "../admin/adminUi";

export default function PlatformBusinesses() {
  const { message } = App.useApp();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [data, setData] = useState<Paginated<Business>>();
  const [selected, setSelected] = useState<Business>();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<ServicePlan[]>([]);
  const [billing, setBilling] = useState<Awaited<ReturnType<typeof platformStaffApi.getBusinessBilling>>>();
  const [nextPlanId, setNextPlanId] = useState<string>();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await platformStaffApi.listBusinesses({ page, limit: 10, search })); }
    catch (err) { showApiError(message.error, err, "Không tải được doanh nghiệp"); }
    finally { setLoading(false); }
  }, [page, search, message]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void platformStaffApi.listPlans().then(setPlans).catch(() => undefined); }, []);

  const openBusiness = async (row: Business) => {
    setSelected(row); setBilling(undefined); setNote(""); setNextPlanId(undefined);
    try { const [detail, bills] = await Promise.all([platformStaffApi.getBusiness(row.id), platformStaffApi.getBusinessBilling(row.id)]); setSelected(detail); setBilling(bills); }
    catch (err) { showApiError(message.error, err, "Không tải được thông tin hỗ trợ"); }
  };

  const support = async (action: "plan" | "resend" | "recheck", checkoutId?: string) => {
    if (!selected) return;
    if (note.trim().length < 3) { message.warning("Nhập ghi chú ít nhất 3 ký tự"); return; }
    if (action === "plan" && !nextPlanId) { message.warning("Chọn gói kỳ sau"); return; }
    setBusy(true);
    try {
      if (action === "plan") await platformStaffApi.scheduleNextPlan(selected.id, nextPlanId!, note);
      else if (action === "resend") await platformStaffApi.resendInvoice(selected.id, note);
      else await platformStaffApi.recheckPayment(selected.id, checkoutId!, note);
      const [detail, bills] = await Promise.all([platformStaffApi.getBusiness(selected.id), platformStaffApi.getBusinessBilling(selected.id)]);
      setSelected(detail); setBilling(bills); setNote(""); await load(); message.success("Đã ghi nhận thao tác hỗ trợ");
    } catch (err) { showApiError(message.error, err, "Không thực hiện được thao tác hỗ trợ"); }
    finally { setBusy(false); }
  };

  return <Card style={{ borderRadius: 14 }}>
    <Typography.Title level={4}>Doanh nghiệp</Typography.Title>
    <Typography.Paragraph type="secondary">Thông tin gói và mức sử dụng tổng hợp để hỗ trợ khách hàng.</Typography.Paragraph>
    <Input.Search allowClear placeholder="Tìm theo tên hoặc mã doanh nghiệp" style={{ maxWidth: 380, marginBottom: 16 }} onSearch={(value) => { setSearch(value); setPage(1); }} />
    <Table<Business> rowKey="id" loading={loading} dataSource={data?.items ?? []} scroll={{ x: 700 }} onRow={(row) => ({ onClick: () => void openBusiness(row), style: { cursor: "pointer" } })} pagination={{ current: page, pageSize: 10, total: data?.pagination.total ?? 0, showSizeChanger: false, onChange: setPage }} columns={[
      { title: "Doanh nghiệp", render: (_, row) => <><strong>{row.name}</strong><br /><small>{row.code}</small></> },
      { title: "Gói", render: (_, row) => row.subscription?.plan.name ?? "—" },
      { title: "Hết hạn", render: (_, row) => row.subscription ? formatDateTime(row.subscription.expiresAt) : "—" },
      { title: "Chi nhánh", render: (_, row) => row.usage.branchCount },
      { title: "Tài khoản", render: (_, row) => row.usage.accountCount },
      { title: "Đơn tháng này", render: (_, row) => row.usage.monthlyOrderCount },
    ]} />
    <Drawer title={selected?.name ?? "Doanh nghiệp"} open={!!selected} onClose={() => setSelected(undefined)} width={480}>
      {selected && <>
        <Field label="Mã">{selected.code}</Field>
        <Field label="Người đại diện">{selected.representativeName ?? "—"}</Field>
        <Field label="Email">{selected.representativeEmail ?? "—"}</Field>
        <Field label="Điện thoại">{selected.representativePhone ?? "—"}</Field>
        <Field label="Gói hiện tại">{selected.subscription?.plan.name ?? "—"}</Field>
        <Field label="Phí tháng">{selected.subscription ? formatVnd(selected.subscription.monthlyPrice) : "—"}</Field>
        <Field label="Hết hạn">{selected.subscription ? formatDateTime(selected.subscription.expiresAt) : "—"}</Field>
        <Field label="Gói kỳ sau">{selected.subscription?.nextPlan?.name ?? "Giữ gói hiện tại"}</Field>
        <Field label="Số chi nhánh">{selected.usage.branchCount}</Field>
        <Field label="Số tài khoản">{selected.usage.accountCount}</Field>
        <Field label="Số đơn tháng này">{selected.usage.monthlyOrderCount}</Field>
        <div style={{ marginTop: 22, display: "grid", gap: 10 }}>
          <Typography.Title level={5}>Hỗ trợ thuê bao</Typography.Title>
          <Input.TextArea placeholder="Ghi chú hỗ trợ bắt buộc" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000} />
          <Select placeholder="Chọn gói cho kỳ sau" value={nextPlanId} onChange={setNextPlanId} options={plans.filter((p) => p.isActive && p.code !== "TRIAL" && p.id !== selected.subscription?.plan.id).map((p) => ({ value: p.id, label: `${p.name} · ${formatVnd(p.monthlyPrice)}/tháng` }))} />
          <Button loading={busy} onClick={() => void support("plan")}>Đặt gói kỳ sau</Button>
          <Button loading={busy} onClick={() => void support("resend")}>Gửi lại hóa đơn PayOS đang chờ</Button>
        </div>
        <Typography.Title level={5} style={{ marginTop: 24 }}>Lịch sử thanh toán nền tảng</Typography.Title>
        {billing?.checkouts.length ? billing.checkouts.map((checkout) => <div key={checkout.id} style={{ borderTop: "1px solid #eee", padding: "12px 0", fontSize: 13 }}>
          {formatDateTime(checkout.createdAt)} · {formatVnd(Number(checkout.amount))} · <strong>{checkout.status}</strong>
          {checkout.reviewReason && <div>{checkout.reviewReason}</div>}
          <div style={{ marginTop: 6 }}><Button size="small" loading={busy} onClick={() => void support("recheck", checkout.id)}>Kiểm tra lại với PayOS</Button></div>
        </div>) : <Typography.Text type="secondary">Chưa có thanh toán nền tảng.</Typography.Text>}
      </>}
    </Drawer>
  </Card>;
}
