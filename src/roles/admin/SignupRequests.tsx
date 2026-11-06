import { App, Card, Drawer, Input, Modal, Select, Table } from "antd";

import { CheckCircle2, X } from "lucide-react";

import { useCallback, useEffect, useState } from "react";

import type {
  Paginated,
  RegistrationApplication,
  RegistrationDetail,
  RegistrationStatus,
} from "../../types";

import { adminApi, showApiError } from "../../api";
import { platformStaffApi, changeApprovedPlan, resendActivation } from "../../api/platformStaff";
import { useAppStore } from "../../store";
import type { ServicePlan } from "../../types";

import ActionButton from "../../plan/ActionButton";

import { SectionTitle } from "../../components/bits";

import { formatDateTime, formatVnd } from "../../lib/reportFormat";

import { palette } from "../../theme";

import { Field, RegistrationChip, dash, dateLabel } from "./adminUi";

const PAGE_SIZE = 10;

const STATUS_OPTIONS: { value: RegistrationStatus | "ALL"; label: string }[] = [
  { value: "PENDING", label: "Chờ duyệt" },

  { value: "APPROVED", label: "Đã duyệt · chờ kích hoạt" },
  { value: "ACTIVATED", label: "Đã kích hoạt" },

  { value: "REJECTED", label: "Bị từ chối" },

  { value: "ALL", label: "Tất cả" },
];

/**
 * PA-01→PA-03: duyệt hồ sơ sẽ cấp TRIAL 14 ngày; từ chối bắt buộc lý do (BR-04).
 */

export default function SignupRequests() {
  const { message, modal } = App.useApp();
  const isStaff = useAppStore((s) => s.currentUser?.role === "platform-staff");
  const reviewApi = isStaff ? platformStaffApi : adminApi;
  const basePath = isStaff ? "/platform-staff" : "/admin";
  const [plans, setPlans] = useState<ServicePlan[]>([]);
  const [supportPlanId, setSupportPlanId] = useState<string>();
  const [supportNote, setSupportNote] = useState("");
  const [supportSaving, setSupportSaving] = useState(false);

  useEffect(() => { void reviewApi.listPlans().then(setPlans).catch((err) => showApiError(message.error, err, "Không tải được gói dịch vụ")); }, [isStaff, message]);

  const [status, setStatus] = useState<RegistrationStatus | "ALL">("PENDING");

  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);

  const [data, setData] = useState<Paginated<RegistrationApplication> | null>(
    null,
  );

  const [loading, setLoading] = useState(false);

  const [openId, setOpenId] = useState<string | null>(null);

  const [detail, setDetail] = useState<RegistrationDetail | null>(null);

  const [approving, setApproving] = useState(false);

  const [rejecting, setRejecting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      setData(
        await reviewApi.listRegistrations({
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
  }, [page, search, status, message, isStaff]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!openId) {
      setDetail(null);

      return;
    }

    let cancelled = false;

    reviewApi

      .getRegistration(openId)

      .then((d) => !cancelled && setDetail(d))

      .catch(
        (err) =>
          !cancelled &&
          showApiError(message.error, err, "Không tải được chi tiết hồ sơ"),
      );

    return () => {
      cancelled = true;
    };
  }, [openId, message, isStaff]);

  const support = async (action: "plan" | "resend") => {
    if (!detail) return;
    if (supportNote.trim().length < 3) { message.warning("Nhập ghi chú ít nhất 3 ký tự"); return; }
    if (action === "plan" && !supportPlanId) { message.warning("Chọn gói dịch vụ"); return; }
    setSupportSaving(true);
    try {
      const updated = action === "plan"
        ? await changeApprovedPlan(basePath, detail.id, supportPlanId!, supportNote)
        : await resendActivation(basePath, detail.id, supportNote);
      await afterReview(updated);
      setSupportNote("");
      message.success(action === "plan" ? "Đã đổi gói được duyệt; QR cũ không còn hiệu lực" : "Đã xếp email kích hoạt mới");
    } catch (err) { showApiError(message.error, err, "Không thực hiện được yêu cầu hỗ trợ"); }
    finally { setSupportSaving(false); }
  };

  const afterReview = async (updated: RegistrationDetail) => {
    setDetail(updated);

    await load();
  };

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title="Hồ sơ đăng ký"
        sub="Duyệt gói và gửi liên kết kích hoạt; doanh nghiệp được tạo khi người đăng ký chọn trial hoặc thanh toán"
      />

      <div
        style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}
      >
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
        onRow={(r) => ({
          onClick: () => setOpenId(r.id),
          style: { cursor: "pointer" },
        })}
        locale={{ emptyText: "Không có hồ sơ nào" }}
        columns={[
          {
            title: "Doanh nghiệp",

            render: (_, r) => (
              <div>
                <div style={{ fontWeight: 600 }}>{r.businessName}</div>
                <div style={{ fontSize: 12, color: palette.textSubtle }}>
                  {r.applicationCode}
                </div>
              </div>
            ),
          },

          {
            title: "Người đại diện",

            render: (_, r) => (
              <div>
                <div>{r.representativeName}</div>
                <div style={{ fontSize: 12, color: palette.textSubtle }}>
                  {r.representativeEmail}
                </div>
              </div>
            ),
          },

          {
            title: "Gói được duyệt",
            render: (_, r) => r.approvedPlan?.name ?? r.requestedPlan?.name ?? "Chưa chọn",
          },

          {
            title: "Ngày nộp",
            dataIndex: "createdAt",
            render: (v: string) => dateLabel(v),
          },

          {
            title: "Trạng thái",
            dataIndex: "status",
            render: (s: RegistrationStatus) => <RegistrationChip status={s} />,
          },
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
            <Field label="Địa chỉ trụ sở">
              {dash(detail.headquartersAddress)}
            </Field>
            <Field label="Người đại diện">{detail.representativeName}</Field>
            <Field label="Email">{detail.representativeEmail}</Field>
            <Field label="Điện thoại">{detail.representativePhone}</Field>
            {detail.status === "PENDING" && (
              <Field label="Gói mong muốn">{detail.requestedPlan?.name ?? "Chưa chọn"}</Field>
            )}
            {detail.requestedPlan && (
              <Field label="Gói từng yêu cầu">
                {`${detail.requestedPlan.name} · ${formatVnd(detail.requestedPlan.monthlyPrice)}/tháng`}
              </Field>
            )}
            {detail.approvedPlan && <Field label="Gói đã duyệt">{`${detail.approvedPlan.name} · ${formatVnd(detail.approvedPlan.monthlyPrice)}/tháng`}</Field>}
            {detail.activationExpiresAt && detail.status === "APPROVED" && <Field label="Link hết hạn">{formatDateTime(detail.activationExpiresAt)}</Field>}
            <Field label="Ngày nộp">{formatDateTime(detail.createdAt)}</Field>
            {detail.reviewedAt && (
              <Field label="Xử lý lúc">
                {formatDateTime(detail.reviewedAt)}
              </Field>
            )}
            {detail.reviewedByEmail && (
              <Field label="Người xử lý">{detail.reviewedByEmail}</Field>
            )}
            {detail.status === "REJECTED" && (
              <Field label="Lý do từ chối">
                {dash(detail.rejectionReason)}
              </Field>
            )}
            {detail.approved && (
              <>
                <Field label="Doanh nghiệp đã tạo">{`${detail.approved.chainName} (${detail.approved.chainCode})`}</Field>
                <Field label="Gói">{dash(detail.approved.planName)}</Field>
                <Field label="Hết hạn">
                  {dateLabel(detail.approved.expiresAt)}
                </Field>
                <Field label="Tài khoản Owner">
                  {dash(detail.approved.ownerEmail)}
                </Field>
              </>
            )}
            {detail.status === "APPROVED" && <div style={{ marginTop: 20, display: "grid", gap: 10 }}>
              <strong>Hỗ trợ kích hoạt (PS-01)</strong>
              <Select placeholder="Đổi gói đã duyệt" value={supportPlanId} onChange={setSupportPlanId} options={plans.filter((p) => p.isActive && p.code !== "TRIAL").map((p) => ({ value: p.id, label: `${p.name} · ${formatVnd(p.monthlyPrice)}/tháng` }))} />
              <Input.TextArea placeholder="Ghi chú hỗ trợ bắt buộc" value={supportNote} onChange={(e) => setSupportNote(e.target.value)} maxLength={1000} rows={2} />
              <ActionButton loading={supportSaving} onClick={() => void support("plan")}>Đổi gói được duyệt</ActionButton>
              <ActionButton loading={supportSaving} onClick={() => void support("resend")}>Gửi lại link kích hoạt</ActionButton>
            </div>}
            {detail.supportActions.length > 0 && <div style={{ marginTop: 20 }}><strong>Lịch sử hỗ trợ</strong>{detail.supportActions.map((entry) => <div key={entry.id} style={{ padding: "8px 0", borderBottom: `1px solid ${palette.line}`, fontSize: 12 }}>{formatDateTime(entry.createdAt)} · {entry.actor.email}<br />{entry.note}</div>)}</div>}

            {detail.status === "PENDING" && (
              <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
                <ActionButton
                  type="primary"
                  block
                  icon={<CheckCircle2 size={15} />}
                  onClick={() => setApproving(true)}
                >
                  Duyệt
                </ActionButton>
                <ActionButton
                  block
                  danger
                  icon={<X size={15} />}
                  onClick={() => setRejecting(true)}
                >
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
          plans={plans}
          approve={(planId) => reviewApi.approveRegistration(detail.id, { planId })}
          onClose={() => setApproving(false)}
          onDone={async (updated) => {
            setApproving(false);

            await afterReview(updated);

            modal.success({
              title: `Đã duyệt "${updated.businessName}"`,

              content: `Đã xếp email kích hoạt 7 ngày tới ${updated.representativeEmail}.`,
            });
          }}
        />
      )}
      {detail && (
        <RejectModal
          open={rejecting}
          application={detail}
          reject={(reason) => reviewApi.rejectRegistration(detail.id, reason)}
          onClose={() => setRejecting(false)}
          onDone={async (updated) => {
            setRejecting(false);

            await afterReview(updated);

            message.success(
              `Đã từ chối hồ sơ "${updated.businessName}" và xếp email thông báo`,
            );
          }}
        />
      )}
    </Card>
  );
}

function ApproveModal({
  open,

  application,
  plans,
  approve,

  onClose,

  onDone,
}: {
  open: boolean;

  application: RegistrationDetail;
  plans: ServicePlan[];
  approve: (planId: string) => Promise<RegistrationDetail>;

  onClose: () => void;

  onDone: (updated: RegistrationDetail) => void | Promise<void>;
}) {
  const { message } = App.useApp();

  const [saving, setSaving] = useState(false);

  const [planId, setPlanId] = useState<string | undefined>(application.requestedPlan?.id);
  useEffect(() => { if (open) setPlanId(application.requestedPlan?.id); }, [open, application.id, application.requestedPlan?.id]);

  const submit = async () => {
    setSaving(true);

    try {
      if (!planId) { message.warning("Chọn gói dịch vụ"); return; }
      await onDone(await approve(planId));
    } catch (err) {
      showApiError(message.error, err, "Không duyệt được hồ sơ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Duyệt hồ sơ · ${application.businessName}`}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      <p>Chọn gói duyệt. Người đăng ký sẽ nhận link 7 ngày để chọn dùng thử Basic hoặc thanh toán tháng đầu qua PayOS. Doanh nghiệp và Owner được tạo khi kích hoạt.</p>
      <Select style={{ width: "100%" }} placeholder="Gói dịch vụ" value={planId} onChange={setPlanId} options={plans.filter((p) => p.isActive && p.code !== "TRIAL").map((p) => ({ value: p.id, label: `${p.name} · ${formatVnd(p.monthlyPrice)}/tháng` }))} />
      <div
        style={{
          marginTop: 12,
          padding: "10px 14px",
          background: palette.paperSubtle,
          borderRadius: 10,
          fontSize: 13.5,
        }}
      >
        Link kích hoạt có hiệu lực 7 ngày kể từ khi duyệt.
      </div>
      <ActionButton
        type="primary"
        block
        style={{ marginTop: 16 }}
        loading={saving}
        onClick={submit}
      >
        Duyệt và gửi link kích hoạt
      </ActionButton>
    </Modal>
  );
}

function RejectModal({
  open,

  application,
  reject,

  onClose,

  onDone,
}: {
  open: boolean;

  application: RegistrationDetail;
  reject: (reason: string) => Promise<RegistrationDetail>;

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
      await onDone(
        await reject(reason.trim()),
      );
    } catch (err) {
      showApiError(message.error, err, "Không từ chối được hồ sơ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Từ chối hồ sơ · ${application.businessName}`}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      <div
        style={{
          fontSize: 12.5,
          fontWeight: 600,
          color: palette.textMuted,
          margin: "8px 0 6px",
        }}
      >
        Lý do (bắt buộc)
      </div>
      <Input.TextArea
        rows={3}
        maxLength={1000}
        showCount
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <ActionButton
        danger
        type="primary"
        block
        style={{ marginTop: 16 }}
        loading={saving}
        disabled={!reason.trim()}
        onClick={submit}
      >
        Từ chối hồ sơ
      </ActionButton>
    </Modal>
  );
}
