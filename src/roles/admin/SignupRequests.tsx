import { App, Card, Drawer, Input, InputNumber, Modal, Select, Table } from "antd";
import { CheckCircle2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Paginated, RegistrationApplication, RegistrationDetail, RegistrationStatus, ServicePlan } from "../../types";
import { adminApi, showApiError } from "../../api";
import ActionButton from "../../plan/ActionButton";
import { SectionTitle } from "../../components/bits";
import { formatDateTime, formatVnd } from "../../lib/reportFormat";
import { palette } from "../../theme";
import { Field, RegistrationChip, addMonthsISO, dash, dateLabel } from "./adminUi";

const PAGE_SIZE = 10;

const STATUS_OPTIONS: { value: RegistrationStatus | "ALL"; label: string }[] = [
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Bị từ chối" },
  { value: "ALL", label: "Tất cả" },
];

/**
 * PA-01→PA-03: xử lý hồ sơ đăng ký. Danh sách phân trang/lọc/tìm kiếm phía server; duyệt chọn gói + số tháng
 * (BE tính ngày hết hạn từ lúc duyệt); từ chối bắt buộc lý do (BR-04).
 */
export default function SignupRequests() {
  const { message, modal } = App.useApp();
  const [status, setStatus] = useState<RegistrationStatus | "ALL">("PENDING");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<RegistrationApplication> | null>(null);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RegistrationDetail | null>(null);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(
        await adminApi.listRegistrations({
          page,
          limit: PAGE_SIZE,
          search,
          status: status === "ALL" ? undefined : status,
        }),
      );
    } catch (err) {
      showApiError(message.error, err, "Không tải được danh sách hồ sơ");
    } finally {
      setLoading(false);
    }
  }, [page, search, status, message]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!openId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    adminApi
      .getRegistration(openId)
      .then((d) => !cancelled && setDetail(d))
      .catch((err) => !cancelled && showApiError(message.error, err, "Không tải được chi tiết hồ sơ"));
    return () => {
      cancelled = true;
    };
  }, [openId, message]);

  const afterReview = async (updated: RegistrationDetail) => {
    setDetail(updated);
    await load();
  };

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle title="Hồ sơ đăng ký" sub="Duyệt sinh doanh nghiệp, gói thuê bao, tài khoản Owner và nhận diện mặc định; từ chối phải có lý do" />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <Select
          value={status}
          style={{ width: 150 }}
          options={STATUS_OPTIONS}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        />
        <Input.Search
          allowClear
          placeholder="Tìm theo mã hồ sơ, tên, người đại diện, email, MST"
          style={{ maxWidth: 380 }}
          onSearch={(v) => {
            setSearch(v);
            setPage(1);
          }}
        />
      </div>

      <Table<RegistrationApplication>
        rowKey="id"
        size="middle"
        loading={loading}
        dataSource={data?.items ?? []}
        scroll={{ x: 760 }}
        pagination={{
          current: data?.pagination.page ?? page,
          pageSize: PAGE_SIZE,
          total: data?.pagination.total ?? 0,
          showSizeChanger: false,
          onChange: setPage,
        }}
        onRow={(r) => ({ onClick: () => setOpenId(r.id), style: { cursor: "pointer" } })}
        locale={{ emptyText: "Không có hồ sơ nào" }}
        columns={[
          {
            title: "Doanh nghiệp",
            render: (_, r) => (
              <div>
                <div style={{ fontWeight: 600 }}>{r.businessName}</div>
                <div style={{ fontSize: 12, color: palette.textSubtle }}>{r.applicationCode}</div>
              </div>
            ),
          },
          {
            title: "Người đại diện",
            render: (_, r) => (
              <div>
                <div>{r.representativeName}</div>
                <div style={{ fontSize: 12, color: palette.textSubtle }}>{r.representativeEmail}</div>
              </div>
            ),
          },
          { title: "Gói mong muốn", render: (_, r) => r.requestedPlan?.name ?? "—" },
          { title: "Ngày nộp", dataIndex: "createdAt", render: (v: string) => dateLabel(v) },
          { title: "Trạng thái", dataIndex: "status", render: (s: RegistrationStatus) => <RegistrationChip status={s} /> },
        ]}
      />

      <Drawer
        title={detail?.businessName ?? "Chi tiết hồ sơ"}
        open={!!openId}
        onClose={() => setOpenId(null)}
        styles={{ wrapper: { width: 460 }, body: { padding: 24 } }}
      >
        {detail && (
          <>
            <div style={{ marginBottom: 14 }}>
              <RegistrationChip status={detail.status} />
            </div>
            <Field label="Mã hồ sơ">{detail.applicationCode}</Field>
            <Field label="Mã số thuế">{dash(detail.taxCode)}</Field>
            <Field label="Địa chỉ trụ sở">{dash(detail.headquartersAddress)}</Field>
            <Field label="Người đại diện">{detail.representativeName}</Field>
            <Field label="Email">{detail.representativeEmail}</Field>
            <Field label="Điện thoại">{detail.representativePhone}</Field>
            <Field label="Gói mong muốn">{detail.requestedPlan ? `${detail.requestedPlan.name} · ${formatVnd(detail.requestedPlan.monthlyPrice)}/tháng` : "—"}</Field>
            <Field label="Ngày nộp">{formatDateTime(detail.createdAt)}</Field>
            {detail.reviewedAt && <Field label="Xử lý lúc">{formatDateTime(detail.reviewedAt)}</Field>}
            {detail.reviewedByEmail && <Field label="Người xử lý">{detail.reviewedByEmail}</Field>}
            {detail.status === "REJECTED" && <Field label="Lý do từ chối">{dash(detail.rejectionReason)}</Field>}
            {detail.approved && (
              <>
                <Field label="Doanh nghiệp đã tạo">{`${detail.approved.chainName} (${detail.approved.chainCode})`}</Field>
                <Field label="Gói">{dash(detail.approved.planName)}</Field>
                <Field label="Hết hạn">{dateLabel(detail.approved.expiresAt)}</Field>
                <Field label="Tài khoản Owner">{dash(detail.approved.ownerEmail)}</Field>
              </>
            )}

            {detail.status === "PENDING" && (
              <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
                <ActionButton type="primary" block icon={<CheckCircle2 size={15} />} onClick={() => setApproving(true)}>
                  Duyệt
                </ActionButton>
                <ActionButton block danger icon={<X size={15} />} onClick={() => setRejecting(true)}>
                  Từ chối
                </ActionButton>
              </div>
            )}
          </>
        )}
      </Drawer>

      {detail && (
        <ApproveModal
          open={approving}
          application={detail}
          onClose={() => setApproving(false)}
          onDone={async (updated) => {
            setApproving(false);
            await afterReview(updated);
            modal.success({
              title: `Đã duyệt "${updated.businessName}"`,
              content: `Đã tạo tài khoản Owner và xếp email đặt mật khẩu tới ${updated.approved?.ownerEmail ?? updated.representativeEmail}.`,
            });
          }}
        />
      )}
      {detail && (
        <RejectModal
          open={rejecting}
          application={detail}
          onClose={() => setRejecting(false)}
          onDone={async (updated) => {
            setRejecting(false);
            await afterReview(updated);
            message.success(`Đã từ chối hồ sơ "${updated.businessName}" và xếp email thông báo`);
          }}
        />
      )}
    </Card>
  );
}

function ApproveModal({
  open,
  application,
  onClose,
  onDone,
}: {
  open: boolean;
  application: RegistrationDetail;
  onClose: () => void;
  onDone: (updated: RegistrationDetail) => void | Promise<void>;
}) {
  const { message } = App.useApp();
  const [plans, setPlans] = useState<ServicePlan[]>([]);
  const [planId, setPlanId] = useState<string | undefined>();
  const [months, setMonths] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    adminApi
      .listPlans()
      .then((all) => {
        const active = all.filter((p) => p.isActive);
        setPlans(active);
        const wanted = application.requestedPlan;
        setPlanId(wanted && active.some((p) => p.id === wanted.id) ? wanted.id : active[0]?.id);
      })
      .catch((err) => showApiError(message.error, err, "Không tải được danh sách gói"));
    setMonths(1);
  }, [open, application.requestedPlan, message]);

  const expiresAt = addMonthsISO(new Date(), months);

  const submit = async () => {
    if (!planId) return;
    setSaving(true);
    try {
      await onDone(await adminApi.approveRegistration(application.id, { planId, subscriptionMonths: months }));
    } catch (err) {
      showApiError(message.error, err, "Không duyệt được hồ sơ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Duyệt hồ sơ · ${application.businessName}`} open={open} onCancel={onClose} footer={null} destroyOnHidden>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: palette.textMuted, margin: "8px 0 6px" }}>Gói dịch vụ</div>
      <Select
        style={{ width: "100%" }}
        value={planId}
        onChange={setPlanId}
        placeholder="Chọn gói đang bán"
        options={plans.map((p) => ({ value: p.id, label: `${p.name} · ${formatVnd(p.monthlyPrice)}/tháng · ${p.maxBranches} chi nhánh · ${p.maxAccounts} tài khoản` }))}
      />
      <div style={{ fontSize: 12.5, fontWeight: 600, color: palette.textMuted, margin: "14px 0 6px" }}>Thời hạn ban đầu (tháng, 1–60)</div>
      <InputNumber min={1} max={60} precision={0} value={months} onChange={(v) => setMonths(v ?? 1)} style={{ width: "100%" }} />
      <div style={{ marginTop: 12, padding: "10px 14px", background: palette.paperSubtle, borderRadius: 10, fontSize: 13.5 }}>
        Ngày hết hạn: <b data-testid="approve-expiry">{dateLabel(expiresAt)}</b>
      </div>
      <ActionButton type="primary" block style={{ marginTop: 16 }} loading={saving} disabled={!planId} onClick={submit}>
        Duyệt và tạo tài khoản Owner
      </ActionButton>
    </Modal>
  );
}

function RejectModal({
  open,
  application,
  onClose,
  onDone,
}: {
  open: boolean;
  application: RegistrationDetail;
  onClose: () => void;
  onDone: (updated: RegistrationDetail) => void | Promise<void>;
}) {
  const { message } = App.useApp();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  const submit = async () => {
    setSaving(true);
    try {
      await onDone(await adminApi.rejectRegistration(application.id, reason.trim()));
    } catch (err) {
      showApiError(message.error, err, "Không từ chối được hồ sơ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Từ chối hồ sơ · ${application.businessName}`} open={open} onCancel={onClose} footer={null} destroyOnHidden>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: palette.textMuted, margin: "8px 0 6px" }}>Lý do (bắt buộc)</div>
      <Input.TextArea rows={3} maxLength={1000} showCount value={reason} onChange={(e) => setReason(e.target.value)} />
      <ActionButton danger type="primary" block style={{ marginTop: 16 }} loading={saving} disabled={!reason.trim()} onClick={submit}>
        Từ chối hồ sơ
      </ActionButton>
    </Modal>
  );
}
