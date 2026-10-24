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

import ActionButton from "../../plan/ActionButton";

import { SectionTitle } from "../../components/bits";

import { formatDateTime, formatVnd } from "../../lib/reportFormat";

import { palette } from "../../theme";

import { Field, RegistrationChip, dash, dateLabel } from "./adminUi";

const PAGE_SIZE = 10;

const STATUS_OPTIONS: { value: RegistrationStatus | "ALL"; label: string }[] = [
  { value: "PENDING", label: "Chờ duyệt" },

  { value: "APPROVED", label: "Đã duyệt" },

  { value: "REJECTED", label: "Bị từ chối" },

  { value: "ALL", label: "Tất cả" },
];

/**
 * PA-01→PA-03: duyệt hồ sơ sẽ cấp TRIAL 14 ngày; từ chối bắt buộc lý do (BR-04).
 */

export default function SignupRequests() {
  const { message, modal } = App.useApp();

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

      .catch(
        (err) =>
          !cancelled &&
          showApiError(message.error, err, "Không tải được chi tiết hồ sơ"),
      );

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
      <SectionTitle
        title="Hồ sơ đăng ký"
        sub="Duyệt để tạo doanh nghiệp, tài khoản Owner và gói TRIAL 14 ngày; từ chối phải có lý do"
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
            title: "Gói mong muốn",
            render: (_, r) => r.requestedPlan?.name ?? "—",
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
            <Field label="Gói mong muốn">
              {detail.requestedPlan
                ? `${detail.requestedPlan.name} · ${formatVnd(detail.requestedPlan.monthlyPrice)}/tháng`
                : "—"}
            </Field>
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
          onClose={() => setApproving(false)}
          onDone={async (updated) => {
            setApproving(false);

            await afterReview(updated);

            modal.success({
              title: `Đã duyệt "${updated.businessName}"`,

              content: `Đã cấp TRIAL 14 ngày và xếp email đặt mật khẩu tới ${updated.approved?.ownerEmail ?? updated.representativeEmail}.`,
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

  onClose,

  onDone,
}: {
  open: boolean;

  application: RegistrationDetail;

  onClose: () => void;

  onDone: (updated: RegistrationDetail) => void | Promise<void>;
}) {
  const { message } = App.useApp();

  const [saving, setSaving] = useState(false);

  const expiresAt = new Date(Date.now() + 14 * 86_400_000).toISOString();

  const submit = async () => {
    setSaving(true);

    try {
      await onDone(await adminApi.approveRegistration(application.id, {}));
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
      <p>
        Owner sẽ dùng thử gói TRIAL miễn phí trong 14 ngày, với hạn mức giống
        gói BASIC. Owner có thể thanh toán nâng cấp bất cứ lúc nào.
      </p>
      <div
        style={{
          marginTop: 12,
          padding: "10px 14px",
          background: palette.paperSubtle,
          borderRadius: 10,
          fontSize: 13.5,
        }}
      >
        Ngày hết hạn: <b data-testid="approve-expiry">{dateLabel(expiresAt)}</b>
      </div>
      <ActionButton
        type="primary"
        block
        style={{ marginTop: 16 }}
        loading={saving}
        onClick={submit}
      >
        Duyệt và cấp TRIAL 14 ngày
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
      await onDone(
        await adminApi.rejectRegistration(application.id, reason.trim()),
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
