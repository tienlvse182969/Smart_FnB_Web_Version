import { App, Button, Card, Drawer, Input, Select, Table, Typography } from "antd";
import { palette } from "../../theme";
import { useCallback, useEffect, useState } from "react";
import { platformStaffApi } from "../../api/platformStaff";
import { showApiError } from "../../api";
import type { Business, Paginated, ServicePlan } from "../../types";
import { formatDateTime, formatVnd } from "../../lib/reportFormat";
import { Field, SubscriptionChip, dash, dateLabel } from "../admin/adminUi";
import { SectionTitle } from "../../components/bits";

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

  const canResend = billing?.checkouts.some((checkout) => checkout.status === "PENDING" && !!checkout.checkoutUrl && Date.now() - new Date(checkout.createdAt).getTime() < 15 * 60_000) ?? false;

  return <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
    <SectionTitle title="Doanh nghiệp thuê bao" sub="Thông tin gói và mức sử dụng tổng hợp để hỗ trợ khách hàng" />
    <Input.Search allowClear placeholder="Tìm theo mã hoặc tên doanh nghiệp" style={{ maxWidth: 360, marginBottom: 14 }} onSearch={(value) => { setSearch(value); setPage(1); }} />
    <Table<Business> rowKey="id" size="middle" loading={loading} dataSource={data?.items ?? []} scroll={{ x: 980 }} onRow={(row) => ({ onClick: () => void openBusiness(row), style: { cursor: "pointer" } })} locale={{ emptyText: "Không có doanh nghiệp nào" }} pagination={{ current: data?.pagination.page ?? page, pageSize: 10, total: data?.pagination.total ?? 0, showSizeChanger: false, onChange: setPage }} columns={[
      { title: "Doanh nghiệp", render: (_, row) => <><strong>{row.name}</strong><br /><small>{row.code}</small></> },
      { title: "Người đại diện", render: (_, row) => dash(row.representativeName) },
      { title: "Gói", render: (_, row) => dash(row.subscription?.plan.name) },
      { title: "Trạng thái", render: (_, row) => row.subscription ? <SubscriptionChip state={row.subscription.state} /> : "—" },
      { title: "Hết hạn", render: (_, row) => dateLabel(row.subscription?.expiresAt) },
      { title: "Chi nhánh", align: "right", render: (_, row) => `${row.usage.branchCount}/${row.subscription?.plan.maxBranches ?? "—"}` },
      { title: "Tài khoản", align: "right", render: (_, row) => `${row.usage.accountCount}/${row.subscription?.plan.maxAccounts ?? "—"}` },
      { title: "Đơn trong tháng", align: "right", render: (_, row) => row.usage.monthlyOrderCount },
    ]} />
    <Drawer title={selected?.name ?? "Doanh nghiệp"} open={!!selected} onClose={() => { setSelected(undefined); setBilling(undefined); }} styles={{ wrapper: { width: 480 }, body: { padding: 24 } }}>
      {selected && <>
        <div style={{ marginBottom: 14 }}>{selected.subscription ? <SubscriptionChip state={selected.subscription.state} /> : "Chưa có thuê bao"}</div>
        <Field label="Mã doanh nghiệp">{selected.code}</Field>
        <Field label="Mã số thuế">{dash(selected.taxCode)}</Field>
        <Field label="Người đại diện">{dash(selected.representativeName)}</Field>
        <Field label="Email">{dash(selected.representativeEmail)}</Field>
        <Field label="Điện thoại">{dash(selected.representativePhone)}</Field>
        <Field label="Tạo lúc">{formatDateTime(selected.createdAt)}</Field>
        <Typography.Text type="secondary" style={{ display: "block", margin: "18px 0 12px", fontWeight: 600, fontSize: 12 }}>GÓI VÀ HẠN MỨC</Typography.Text>
        <Field label="Gói hiện tại">{dash(selected.subscription?.plan.name)}</Field>
        <Field label="Phí tháng">{selected.subscription ? formatVnd(selected.subscription.monthlyPrice) : "—"}</Field>
        <Field label="Hết hạn">{dateLabel(selected.subscription?.expiresAt)}</Field>
        <Field label="Gói kỳ sau">{selected.subscription?.nextPlan?.name ?? "Giữ gói hiện tại"}</Field>
        <Field label="Chi nhánh">{selected.usage.branchCount}/{selected.subscription?.plan.maxBranches ?? "—"}</Field>
        <Field label="Tài khoản">{selected.usage.accountCount}/{selected.subscription?.plan.maxAccounts ?? "—"}</Field>
        <Field label="Số đơn tháng này">{selected.usage.monthlyOrderCount}</Field>
        <div style={{ marginTop: 22, display: "grid", gap: 10 }}>
          <Typography.Title level={5}>Hỗ trợ thuê bao</Typography.Title>
          <Input.TextArea placeholder="Ghi chú hỗ trợ bắt buộc" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000} />
          <Select placeholder="Chọn gói cho kỳ sau" value={nextPlanId} onChange={setNextPlanId} options={plans.filter((p) => p.isActive && p.code !== "TRIAL" && p.id !== selected.subscription?.plan.id).map((p) => ({ value: p.id, label: `${p.name} · ${formatVnd(p.monthlyPrice)}/tháng` }))} />
          <Button loading={busy} disabled={!selected.subscription || !nextPlanId || note.trim().length < 3} onClick={() => void support("plan")}>Đặt gói kỳ sau</Button>
          <Button loading={busy} disabled={!canResend || note.trim().length < 3} onClick={() => void support("resend")}>Gửi lại hóa đơn PayOS đang chờ</Button>
        </div>
        <Typography.Title level={5} style={{ marginTop: 24 }}>Lịch sử thanh toán nền tảng</Typography.Title>
        {billing?.checkouts.length ? billing.checkouts.map((checkout) => <div key={checkout.id} style={{ borderTop: `1px solid ${palette.line}`, padding: "12px 0", fontSize: 13 }}>
          {formatDateTime(checkout.createdAt)} · {formatVnd(Number(checkout.amount))} · <strong>{checkout.status}</strong>
          {checkout.reviewReason && <div>{checkout.reviewReason}</div>}
          <div style={{ marginTop: 6 }}><Button size="small" loading={busy} disabled={note.trim().length < 3 || !["PENDING", "NEEDS_REVIEW"].includes(checkout.status)} onClick={() => void support("recheck", checkout.id)}>Kiểm tra lại với PayOS</Button></div>
        </div>) : <Typography.Text type="secondary">Chưa có thanh toán nền tảng.</Typography.Text>}
      </>}
    </Drawer>
  </Card>;
}
