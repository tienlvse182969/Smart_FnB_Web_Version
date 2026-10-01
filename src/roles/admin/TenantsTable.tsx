import { App, Card, Drawer, Input, InputNumber, Modal, Progress, Radio, Select, Table } from "antd";
import { Ban, CalendarClock, KeyRound, Layers, Play, Receipt, Repeat, Users } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { Business, Paginated, PlanChangeDirection, ServicePlan } from "../../types";
import { adminApi, showApiError } from "../../api";
import ActionButton from "../../plan/ActionButton";
import { SectionTitle } from "../../components/bits";
import { formatCount, formatDateTime, formatVnd } from "../../lib/reportFormat";
import { palette } from "../../theme";
import { Field, SubscriptionChip, addMonthsISO, dash, dateLabel } from "./adminUi";

const PAGE_SIZE = 10;

type Dialog = "renew" | "plan" | "suspend" | "reactivate" | "reset" | null;

/**
 * PA-05: danh sách/chi tiết doanh nghiệp — chỉ số liệu tổng hợp phục vụ tính phí (BR-07): không menu, món, doanh thu,
 * nhân viên, và không bao giờ hiện ví/số dư (mapper đã bỏ khỏi dữ liệu).
 */
export default function TenantsTable() {
  const { message } = App.useApp();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<Business> | null>(null);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await adminApi.listBusinesses({ page, limit: PAGE_SIZE, search }));
    } catch (err) {
      showApiError(message.error, err, "Không tải được danh sách doanh nghiệp");
    } finally {
      setLoading(false);
    }
  }, [page, search, message]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = data?.items.find((b) => b.id === openId) ?? null;

  /** Sau mỗi thao tác BE trả doanh nghiệp đã cập nhật: nạp lại danh sách để drawer và bảng cùng mới. */
  const afterChange = async (text: string) => {
    setDialog(null);
    await load();
    message.success(text);
  };

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title="Doanh nghiệp thuê bao"
        sub="Chỉ số liệu tổng hợp phục vụ tính phí — không xem menu, món, doanh thu, nhân viên, khoá PayOS (BR-07)"
      />
      <Input.Search
        allowClear
        placeholder="Tìm theo mã, tên, MST, người đại diện"
        style={{ maxWidth: 360, marginBottom: 14 }}
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
      />
      <Table<Business>
        rowKey="id"
        size="middle"
        loading={loading}
        dataSource={data?.items ?? []}
        scroll={{ x: 980 }}
        pagination={{
          current: data?.pagination.page ?? page,
          pageSize: PAGE_SIZE,
          total: data?.pagination.total ?? 0,
          showSizeChanger: false,
          onChange: setPage,
        }}
        onRow={(r) => ({ onClick: () => setOpenId(r.id), style: { cursor: "pointer" } })}
        locale={{ emptyText: "Không có doanh nghiệp nào" }}
        columns={[
          {
            title: "Doanh nghiệp",
            render: (_, r) => (
              <div>
                <div style={{ fontWeight: 600 }}>{r.name}</div>
                <div style={{ fontSize: 12, color: palette.textSubtle }}>{r.code}</div>
              </div>
            ),
          },
          { title: "Người đại diện", render: (_, r) => dash(r.representativeName) },
          { title: "Gói", render: (_, r) => dash(r.subscription?.plan.name) },
          { title: "Trạng thái", render: (_, r) => (r.subscription ? <SubscriptionChip state={r.subscription.state} /> : "—") },
          { title: "Hết hạn", render: (_, r) => dateLabel(r.subscription?.expiresAt) },
          { title: "Chi nhánh", align: "right", render: (_, r) => usageLabel(r.usage.branchCount, r.subscription?.plan.maxBranches) },
          { title: "Tài khoản", align: "right", render: (_, r) => usageLabel(r.usage.accountCount, r.subscription?.plan.maxAccounts) },
          { title: "Đơn trong tháng", align: "right", render: (_, r) => formatCount(r.usage.monthlyOrderCount) },
        ]}
      />

      <Drawer
        title={selected?.name ?? ""}
        open={!!selected}
        onClose={() => setOpenId(null)}
        styles={{ wrapper: { width: 460 }, body: { padding: 24 } }}
      >
        {selected && <Detail business={selected} onDialog={setDialog} />}
      </Drawer>

      {selected?.subscription && (
        <>
          <RenewModal open={dialog === "renew"} business={selected} onClose={() => setDialog(null)} onDone={afterChange} />
          <PlanModal open={dialog === "plan"} business={selected} onClose={() => setDialog(null)} onDone={afterChange} />
          <StatusModal open={dialog === "suspend"} mode="suspend" business={selected} onClose={() => setDialog(null)} onDone={afterChange} />
          <StatusModal open={dialog === "reactivate"} mode="reactivate" business={selected} onClose={() => setDialog(null)} onDone={afterChange} />
          <ResetModal open={dialog === "reset"} business={selected} onClose={() => setDialog(null)} />
        </>
      )}
    </Card>
  );
}

function usageLabel(used: number, limit: number | undefined) {
  return limit ? `${used}/${limit}` : String(used);
}

function LimitRow({ icon, label, used, limit }: { icon: ReactNode; label: string; used: number; limit: number }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 6 }}>
        <span style={{ color: palette.textMuted, display: "flex", alignItems: "center", gap: 7 }}>
          {icon} {label}
        </span>
        <span style={{ fontWeight: 600 }}>
          {used}/{limit}
        </span>
      </div>
      <Progress percent={limit ? (used / limit) * 100 : 0} showInfo={false} size="small" strokeColor={palette.brandPrimary} railColor={palette.line} />
    </div>
  );
}

function Detail({ business, onDialog }: { business: Business; onDialog: (d: Dialog) => void }) {
  const sub = business.subscription;
  return (
    <>
      <div style={{ marginBottom: 14 }}>{sub ? <SubscriptionChip state={sub.state} /> : "Chưa có thuê bao"}</div>
      <Field label="Mã doanh nghiệp">{business.code}</Field>
      <Field label="Mã số thuế">{dash(business.taxCode)}</Field>
      <Field label="Người đại diện">{dash(business.representativeName)}</Field>
      <Field label="Email">{dash(business.representativeEmail)}</Field>
      <Field label="Điện thoại">{dash(business.representativePhone)}</Field>
      <Field label="Tạo lúc">{formatDateTime(business.createdAt)}</Field>

      {sub && (
        <>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: palette.textMuted, margin: "18px 0 12px" }}>GÓI VÀ HẠN MỨC</div>
          <Field label="Gói">{sub.plan.name}</Field>
          <Field label="Phí thuê bao / tháng">{formatVnd(sub.monthlyPrice)}</Field>
          <Field label="Hết hạn">{dateLabel(sub.expiresAt)}</Field>
          {sub.state !== "active" && (
            <div style={{ background: palette.paperSubtle, borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: palette.textStrong, margin: "10px 0" }}>
              Doanh nghiệp đang ở chế độ chỉ đọc — không khoá cứng, không xoá dữ liệu (BR-09).
            </div>
          )}
          <div style={{ marginTop: 10 }}>
            <LimitRow icon={<Layers size={15} />} label="Chi nhánh" used={business.usage.branchCount} limit={sub.plan.maxBranches} />
            <LimitRow icon={<Users size={15} />} label="Tài khoản" used={business.usage.accountCount} limit={sub.plan.maxAccounts} />
            <Field label="Đơn trong tháng">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Receipt size={14} /> {formatCount(business.usage.monthlyOrderCount)}
              </span>
            </Field>
          </div>
        </>
      )}

      {sub && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
          <ActionButton type="primary" block icon={<CalendarClock size={16} />} onClick={() => onDialog("renew")}>
            Gia hạn
          </ActionButton>
          <ActionButton block icon={<Repeat size={16} />} onClick={() => onDialog("plan")}>
            Đổi gói
          </ActionButton>
          {sub.state === "suspended" ? (
            <ActionButton block icon={<Play size={16} />} onClick={() => onDialog("reactivate")}>
              Kích hoạt lại
            </ActionButton>
          ) : (
            <ActionButton block danger icon={<Ban size={16} />} onClick={() => onDialog("suspend")}>
              Tạm ngưng (chỉ đọc)
            </ActionButton>
          )}
          <ActionButton block icon={<KeyRound size={16} />} disabled={business.owners.length === 0} onClick={() => onDialog("reset")}>
            Đặt lại mật khẩu Owner
          </ActionButton>
        </div>
      )}
    </>
  );
}

type DialogProps = {
  open: boolean;
  business: Business;
  onClose: () => void;
};

const label = (text: string) => <div style={{ fontSize: 12.5, fontWeight: 600, color: palette.textMuted, margin: "8px 0 6px" }}>{text}</div>;

function RenewModal({ open, business, onClose, onDone }: DialogProps & { onDone: (text: string) => Promise<void> }) {
  const { message } = App.useApp();
  const [months, setMonths] = useState(1);
  const [saving, setSaving] = useState(false);
  const current = business.subscription ? new Date(business.subscription.expiresAt) : new Date();
  // BE: cộng từ ngày hết hạn hiện tại nếu còn hạn, ngược lại từ hôm nay.
  const next = addMonthsISO(current > new Date() ? current : new Date(), months);

  useEffect(() => {
    if (open) setMonths(1);
  }, [open]);

  const submit = async () => {
    setSaving(true);
    try {
      const updated = await adminApi.renewBusiness(business.id, { months });
      await onDone(`Đã gia hạn tới ${dateLabel(updated.subscription?.expiresAt)}`);
    } catch (err) {
      showApiError(message.error, err, "Không gia hạn được");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Gia hạn · ${business.name}`} open={open} onCancel={onClose} footer={null} destroyOnHidden>
      {label("Số tháng gia hạn (1–60)")}
      <InputNumber min={1} max={60} precision={0} value={months} onChange={(v) => setMonths(v ?? 1)} style={{ width: "100%" }} />
      <div style={{ marginTop: 12, padding: "10px 14px", background: palette.paperSubtle, borderRadius: 10, fontSize: 13.5 }}>
        Hết hạn hiện tại: {dateLabel(business.subscription?.expiresAt)}
        <br />
        Hết hạn mới: <b data-testid="renew-expiry">{dateLabel(next)}</b>
      </div>
      <ActionButton type="primary" block style={{ marginTop: 16 }} loading={saving} onClick={submit}>
        Gia hạn
      </ActionButton>
    </Modal>
  );
}

function PlanModal({ open, business, onClose, onDone }: DialogProps & { onDone: (text: string) => Promise<void> }) {
  const { message } = App.useApp();
  const [plans, setPlans] = useState<ServicePlan[]>([]);
  const [planId, setPlanId] = useState<string | undefined>();
  const [pick, setPick] = useState<PlanChangeDirection>("UPGRADE");
  const [saving, setSaving] = useState(false);
  const sub = business.subscription;

  useEffect(() => {
    if (!open) return;
    setPlanId(undefined);
    adminApi
      .listPlans()
      .then((all) => setPlans(all.filter((p) => p.isActive && p.id !== sub?.plan.id)))
      .catch((err) => showApiError(message.error, err, "Không tải được danh sách gói"));
  }, [open, sub?.plan.id, message]);

  const target = plans.find((p) => p.id === planId);
  // Hướng đổi suy từ giá; bằng giá thì Admin tự chọn Nâng/Hạ.
  const sameThePrice = !!target && !!sub && target.monthlyPrice === sub.monthlyPrice;
  const direction: PlanChangeDirection | null = !target || !sub
    ? null
    : sameThePrice
      ? pick
      : target.monthlyPrice > sub.monthlyPrice
        ? "UPGRADE"
        : "DOWNGRADE";

  const submit = async () => {
    if (!planId || !direction) return;
    setSaving(true);
    try {
      // TODO(BE, lệch BR-11): BE trả 409 khi hạ gói mà đang vượt hạn mức gói mới; đặc tả BR-11 cho phép hạ gói, chỉ chặn tạo mới.
      await adminApi.changeBusinessPlan(business.id, { planId, direction });
      await onDone("Đã đổi gói dịch vụ");
    } catch (err) {
      showApiError(message.error, err, "Không đổi được gói");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Đổi gói · ${business.name}`} open={open} onCancel={onClose} footer={null} destroyOnHidden>
      <div style={{ fontSize: 13.5, marginBottom: 8 }}>
        Gói hiện tại: <b>{sub?.plan.name}</b> · {formatVnd(sub?.monthlyPrice ?? 0)}/tháng
      </div>
      {label("Gói mới")}
      <Select
        style={{ width: "100%" }}
        value={planId}
        onChange={setPlanId}
        placeholder="Chọn gói"
        options={plans.map((p) => ({ value: p.id, label: `${p.name} · ${formatVnd(p.monthlyPrice)}/tháng · ${p.maxBranches} chi nhánh · ${p.maxAccounts} tài khoản` }))}
      />
      {sameThePrice && (
        <div style={{ marginTop: 12 }}>
          {label("Hai gói cùng giá — đây là nâng hay hạ gói?")}
          <Radio.Group value={pick} onChange={(e) => setPick(e.target.value)}>
            <Radio value="UPGRADE">Nâng gói</Radio>
            <Radio value="DOWNGRADE">Hạ gói</Radio>
          </Radio.Group>
        </div>
      )}
      {direction && (
        <div style={{ marginTop: 12, fontSize: 13, color: palette.textMuted }}>
          {direction === "UPGRADE" ? "Nâng gói" : "Hạ gói"} — dữ liệu hiện có được giữ nguyên.
        </div>
      )}
      <ActionButton type="primary" block style={{ marginTop: 16 }} loading={saving} disabled={!planId} onClick={submit}>
        Đổi gói
      </ActionButton>
    </Modal>
  );
}

function StatusModal({
  open,
  mode,
  business,
  onClose,
  onDone,
}: DialogProps & { mode: "suspend" | "reactivate"; onDone: (text: string) => Promise<void> }) {
  const { message } = App.useApp();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const suspend = mode === "suspend";

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  const submit = async () => {
    setSaving(true);
    try {
      if (suspend) await adminApi.suspendBusiness(business.id, reason.trim());
      else await adminApi.reactivateBusiness(business.id, reason.trim() || undefined);
      await onDone(suspend ? `Đã tạm ngưng ${business.name} (chế độ chỉ đọc)` : `Đã kích hoạt lại ${business.name}`);
    } catch (err) {
      showApiError(message.error, err, suspend ? "Không tạm ngưng được" : "Không kích hoạt lại được");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`${suspend ? "Tạm ngưng" : "Kích hoạt lại"} · ${business.name}`}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      {suspend && (
        <div style={{ fontSize: 13, color: palette.textMuted, marginBottom: 6 }}>
          Doanh nghiệp chuyển sang chế độ chỉ đọc; các phiên đăng nhập của họ bị thu hồi.
        </div>
      )}
      {label(suspend ? "Lý do (bắt buộc)" : "Lý do (tuỳ chọn)")}
      <Input.TextArea rows={3} maxLength={500} showCount value={reason} onChange={(e) => setReason(e.target.value)} />
      <ActionButton
        type="primary"
        danger={suspend}
        block
        style={{ marginTop: 16 }}
        loading={saving}
        // Đặc tả 5.2: tạm ngưng kèm lý do — BE cho tuỳ chọn nhưng web bắt buộc.
        disabled={suspend && !reason.trim()}
        onClick={submit}
      >
        {suspend ? "Tạm ngưng" : "Kích hoạt lại"}
      </ActionButton>
    </Modal>
  );
}

function ResetModal({ open, business, onClose }: DialogProps) {
  const { message, modal } = App.useApp();
  const [ownerId, setOwnerId] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setOwnerId(business.owners[0]?.id);
  }, [open, business.owners]);

  const owner = business.owners.find((o) => o.id === ownerId);

  const submit = async () => {
    if (!owner) return;
    setSaving(true);
    try {
      const result = await adminApi.resetOwnerPassword(owner.id);
      onClose();
      modal.success({
        title: "Đã xếp email đặt lại mật khẩu",
        content: `Email gửi tới ${owner.email}, hiệu lực tới ${formatDateTime(result.expiresAt)}.`,
      });
    } catch (err) {
      showApiError(message.error, err, "Không đặt lại được mật khẩu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Đặt lại mật khẩu Owner" open={open} onCancel={onClose} footer={null} destroyOnHidden>
      <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>
        Hệ thống thu hồi các phiên đang đăng nhập của Owner và xếp một email đặt mật khẩu mới (dùng một lần, hiệu lực 24 giờ). Thao tác này không hiện mật
        khẩu.
      </div>
      {business.owners.length > 1 && (
        <>
          {label("Chọn Owner")}
          <Select
            style={{ width: "100%" }}
            value={ownerId}
            onChange={setOwnerId}
            options={business.owners.map((o) => ({ value: o.id, label: `${o.name} · ${o.email}` }))}
          />
        </>
      )}
      {owner && (
        <div style={{ marginTop: 12, padding: "10px 14px", background: palette.paperSubtle, borderRadius: 10, fontSize: 13.5 }}>
          Owner: <b>{owner.name}</b> · {owner.email}
        </div>
      )}
      <ActionButton type="primary" danger block style={{ marginTop: 16 }} loading={saving} disabled={!owner} onClick={submit}>
        Xác nhận đặt lại mật khẩu
      </ActionButton>
    </Modal>
  );
}
