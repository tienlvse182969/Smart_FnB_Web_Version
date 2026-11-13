import { App, Card, Drawer, Input, Select, Table, Tabs, Tag } from "antd";
import { KeyRound, Lock, Plus, Unlock } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AccountStatus, StaffInvitationInput, ManagerAccount, ManagerPage, StaffAccount } from "../../types";
import { formatDateTime } from "../../lib/reportFormat";
import { accountApi, showApiError } from "../../api";
import ActionButton from "../../plan/ActionButton";
import { useWriteGuard } from "../../plan/useReadOnly";
import { SectionTitle } from "../../components/bits";
import { useAppStore } from "../../store";
import { palette } from "../../theme";
import StaffReasonModal from "../branch/StaffReasonModal";

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<AccountStatus, string> = { ACTIVE: "Đang hoạt động", SUSPENDED: "Đã khoá", INACTIVE: "Chưa kích hoạt" };

/**
 * Brand Manager mời Store Manager qua email, chỉ xem Cashier và Barista.
 * Danh sách, khoá/mở khoá và chuyển chi nhánh Manager dùng BE `/employees`.
 */
export default function ManagerAccounts() {
  const { message, modal } = App.useApp();
  const currentUser = useAppStore((s) => s.currentUser);
  const branches = useAppStore((s) => s.branches);
  const writeGuard = useWriteGuard();
  const tenantId = currentUser?.tenantId ?? null;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AccountStatus | undefined>();
  const [data, setData] = useState<ManagerPage>({ items: [], pagination: { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 } });
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState<StaffAccount[]>([]);
  const [adding, setAdding] = useState(false);
  const [legacyTarget, setLegacyTarget] = useState<{ id: string; name: string; login: string } | null>(null);

  const [reasonFor, setReasonFor] = useState<{ kind: "lock" | "unlock" | "reset"; account: ManagerAccount | StaffAccount } | null>(null);
  const [reasonBusy, setReasonBusy] = useState(false);
  const reasonInFlight = useRef(false);

  const branchName = (id?: string) => branches.find((b) => b.id === id)?.name ?? id ?? "—";

  const loadManagers = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      setData(await accountApi.listManagers(tenantId, { page, limit: PAGE_SIZE, search, status }));
    } catch (err) {
      showApiError(message.error, err, "Không tải được danh sách Store Manager");
    } finally {
      setLoading(false);
    }
  }, [tenantId, page, search, status, message]);

  const loadStaff = useCallback(async () => {
    if (!tenantId) return;
    try {
      setStaff(await accountApi.listStaffAccounts(tenantId));
    } catch (err) {
      showApiError(message.error, err, "Không tải được danh sách nhân viên");
    }
  }, [tenantId, message]);

  useEffect(() => {
    void loadManagers();
  }, [loadManagers]);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  /** Chạy một thao tác ghi: lỗi hiện gọn một thông báo (không vỡ màn hình), xong thì nạp lại danh sách. */
  const run = async (action: () => Promise<void>, failText: string) => {
    try {
      await action();
    } catch (err) {
      showApiError(message.error, err, failText);
    } finally {
      await loadManagers();
    }
  };

  const confirmLock = (m: ManagerAccount | StaffAccount) => setReasonFor({ kind: m.status === "ACTIVE" ? "lock" : "unlock", account: m });
  const confirmReset = (m: ManagerAccount | StaffAccount) => {
    if (!m.email.includes("@")) { setLegacyTarget({ id: m.id, name: m.name, login: m.email }); return; }
    setReasonFor({ kind: "reset", account: m });
  };
  const submitReason = async (reason: string) => {
    if (!reasonFor || reasonInFlight.current) return;
    reasonInFlight.current = true; setReasonBusy(true);
    const { kind, account: m } = reasonFor;
    try {
      if (kind === "reset") {
        const notice = await accountApi.resetManagerPassword(m.id, reason, m.invitationState === "PENDING");
        modal.success({ title: "Đã xử lý yêu cầu email", content: <div data-testid="password-setup-notice">{emailNotice(notice.emailStatus)}<br />Gửi tới {m.email}. Link dùng một lần, hết hạn lúc {formatDateTime(notice.expiresAt)}. Nếu cần gửi lại, đợi ít nhất 60 giây.</div> });
      } else {
        await accountApi.setManagerActive(m.id, kind === "unlock", reason);
        message.success(kind === "lock" ? "Đã khoá tài khoản" : "Đã mở khoá tài khoản");
      }
      setReasonFor(null);
      await Promise.all([loadManagers(), loadStaff()]);
    } catch (err) { showApiError(message.error, err, "Không thực hiện được thao tác"); }
    finally { reasonInFlight.current = false; setReasonBusy(false); }
  };
  const actions = (r: ManagerAccount | StaffAccount) => (
    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
      <ActionButton size="small" icon={<KeyRound size={14} />} disabled={r.invitationState === "CANCELLED" || r.status === "SUSPENDED"} onClick={() => confirmReset(r)}>
        {r.invitationState === "PENDING" ? "Gửi lại lời mời" : "Reset mật khẩu"}
      </ActionButton>
      <ActionButton size="small" icon={r.status === "SUSPENDED" ? <Unlock size={14} /> : <Lock size={14} />} disabled={r.invitationState === "CANCELLED" || r.invitationState === "PENDING" || r.status === "INACTIVE"} onClick={() => confirmLock(r)}>
        {r.status === "SUSPENDED" ? "Mở khoá" : "Khoá"}
      </ActionButton>
    </div>
  );

  const confirmTransfer = (m: ManagerAccount, branchId: string) => {
    if (branchId === m.branchId) return;
    modal.confirm({
      title: `Chuyển ${m.name} sang ${branchName(branchId)}?`,
      content: (
        <div data-testid="confirm-transfer" style={{ fontSize: 13.5, lineHeight: 1.7 }}>
          <b>{m.name}</b>: từ <b>{m.branchName}</b> sang <b>{branchName(branchId)}</b>. Phiên đang đăng nhập bị thu hồi, {m.name} phải đăng nhập lại.
        </div>
      ),
      okText: "Chuyển chi nhánh",
      cancelText: "Huỷ",
      onOk: () =>
        run(async () => {
          await accountApi.reassignManager(m.id, branchId);
          message.success(`Đã chuyển ${m.name} sang ${branchName(branchId)}`);
        }, "Không chuyển được chi nhánh"),
    });
  };

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title="Tài khoản nhân viên"
        sub="Mời Store Manager qua email; xem danh sách Thu ngân và Pha chế của các chi nhánh"
        extra={
          <ActionButton type="primary" icon={<Plus size={15} />} consumes="accounts" data-testid="create-manager" onClick={() => setAdding(true)}>
            Mời Store Manager
          </ActionButton>
        }
      />
      <Tabs
        items={[
          {
            key: "managers",
            label: `Store Manager (${data.pagination.total})`,
            children: (
              <>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                  <Input.Search
                    allowClear
                    placeholder="Tìm theo tên, mã hoặc tài khoản"
                    style={{ maxWidth: 300 }}
                    onSearch={(v) => {
                      setPage(1);
                      setSearch(v);
                    }}
                  />
                  <Select<AccountStatus | "all">
                    style={{ width: 170 }}
                    value={status ?? "all"}
                    onChange={(v) => {
                      setPage(1);
                      setStatus(v === "all" ? undefined : v);
                    }}
                    options={[{ value: "all", label: "Mọi trạng thái" }, ...(Object.keys(STATUS_LABEL) as AccountStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))]}
                  />
                </div>
                <Table<ManagerAccount>
                  dataSource={data.items}
                  rowKey="id"
                  loading={loading}
                  size="middle"
                  scroll={{ x: 860 }}
                  locale={{ emptyText: "Chưa có Store Manager nào khớp" }}
                  pagination={{
                    current: data.pagination.page,
                    pageSize: PAGE_SIZE,
                    total: data.pagination.total,
                    showSizeChanger: false,
                    hideOnSinglePage: true,
                    onChange: setPage,
                  }}
                  columns={[
                    {
                      title: "Tài khoản",
                      dataIndex: "name",
                      render: (v: string, r) => (
                        <div>
                          <div style={{ fontWeight: 600 }}>{v}</div>
                          <div style={{ fontSize: 12, color: palette.textSubtle }}>
                            {r.email} · {r.employeeCode}
                          </div>
                          {(r.emailSendStatus === "FAILED" || r.emailSendStatus === "PENDING") && <Tag color="warning">Chưa gửi được email</Tag>}
                        </div>
                      ),
                    },
                    {
                      title: "Chi nhánh được gán",
                      dataIndex: "branchId",
                      render: (id: string, r) => (
                        <Select
                          value={id}
                          size="small"
                          style={{ width: 190 }}
                          disabled={writeGuard.disabled}
                          onChange={(v) => confirmTransfer(r, v)}
                          options={branches.map((b) => ({ value: b.id, label: b.name }))}
                        />
                      ),
                    },
                    {
                      title: "Trạng thái",
                      dataIndex: "status",
                      render: (s: AccountStatus, r) => (
                        <span
                          style={{
                            background: s === "ACTIVE" ? palette.success.bg : s === "SUSPENDED" ? palette.error.bg : palette.paperSubtle,
                            color: s === "ACTIVE" ? palette.success.text : s === "SUSPENDED" ? palette.error.text : palette.textMuted,
                            padding: "3px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 500,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.invitationState === "CANCELLED" ? "Đã huỷ lời mời" : r.invitationState === "PENDING" ? "Chờ nhận lời mời" : STATUS_LABEL[s]}
                        </span>
                      ),
                    },
                    { title: "Đăng nhập gần nhất", dataIndex: "lastLoginAt", render: (v: string | null) => (v ? formatDateTime(v) : "Chưa từng") },
                    {
                      title: "",
                      key: "act",
                      align: "right",
                      render: (_, r) => actions(r),
                    },
                  ]}
                />
              </>
            ),
          },
          {
            key: "staff",
            label: `Thu ngân & Pha chế (${staff.length})`,
            children: (
              <>
                <Table<StaffAccount>
                  dataSource={staff}
                  rowKey="id"
                  pagination={false}
                  size="middle"
                  columns={[
                    {
                      title: "Tài khoản",
                      dataIndex: "name",
                      render: (v, r) => (
                        <div>
                          <div style={{ fontWeight: 600 }}>{v}</div>
                          <div style={{ fontSize: 12, color: palette.textSubtle }}>{r.email}</div>
                          {(r.emailSendStatus === "FAILED" || r.emailSendStatus === "PENDING") && <Tag color="warning">Chưa gửi được email</Tag>}
                        </div>
                      ),
                    },
                    { title: "Vai trò", dataIndex: "role", render: (r: string) => <Tag>{r}</Tag> },
                    { title: "Chi nhánh", dataIndex: "branchName" },
                    {
                      title: "Trạng thái",
                      dataIndex: "status",
                      render: (s: AccountStatus, r) => <Tag color={s === "ACTIVE" ? "green" : undefined}>{r.invitationState === "CANCELLED" ? "Đã huỷ lời mời" : r.invitationState === "PENDING" ? "Chờ nhận lời mời" : STATUS_LABEL[s]}</Tag>,
                    },
                  ]}
                />
              </>
            ),
          },
        ]}
      />

      <AddAccountDrawer
        open={adding}
        branches={branches}
        onClose={() => setAdding(false)}
        onSave={async (input) => {
          if (!tenantId) return false;
          try {
            const { account: acc, expiresAt, emailStatus } = await accountApi.inviteAccount(tenantId, input);
            setAdding(false);
            modal.success({
              title: "Đã tạo tài khoản Store Manager",
              content: (
                <div data-testid="password-setup-notice" style={{ fontSize: 13.5, lineHeight: 1.8 }}>
                  Tài khoản <b>{acc.email}</b> đang chờ đặt mật khẩu. {emailNotice(emailStatus)} Link hết hạn lúc {formatDateTime(expiresAt)}.
                </div>
              ),
            });
            await loadManagers();
            await loadStaff();
            await useAppStore.getState().loadScope({ silent: true });
            return true;
          } catch (err) {
            showApiError(message.error, err, "Không tạo được — có thể đã vượt hạn mức gói");
            return false;
          }
        }}
      />
      <StaffReasonModal open={!!reasonFor} busy={reasonBusy} kind={reasonFor?.kind ?? "reset"} staffName={reasonFor?.account.name ?? ""} email={reasonFor?.account.email ?? ""} roleLabel="Nhân viên" branchName={reasonFor?.account.branchName ?? ""} pending={reasonFor?.account.invitationState === "PENDING"} onCancel={() => { if (!reasonBusy) setReasonFor(null); }} onSubmit={(reason) => void submitReason(reason)} />
      <LegacyEmailDrawer
        target={legacyTarget}
        onClose={() => setLegacyTarget(null)}
        onSave={async (email, reason) => {
          if (!legacyTarget) return false;
          try {
            const { expiresAt, emailStatus } = await accountApi.attachLegacyEmail(legacyTarget.id, email, reason);
            setLegacyTarget(null);
            modal.success({ title: "Đã chuyển sang đăng nhập bằng email", content: <div style={{ fontSize: 13.5, lineHeight: 1.8 }}>Mật khẩu cũ và các phiên đã bị thu hồi. Link đặt mật khẩu gửi tới <b>{email.trim().toLowerCase()}</b>. {emailNotice(emailStatus)} Hết hạn lúc {formatDateTime(expiresAt)}.</div> });
            await loadManagers();
            return true;
          } catch (err) {
            showApiError(message.error, err, "Không gắn được email cho tài khoản");
            return false;
          }
        }}
      />
    </Card>
  );
}

function emailNotice(status?: "SENT" | "PENDING" | "FAILED") {
  return status === "SENT" ? "Email đã được gửi." : status === "FAILED" ? "Gửi email thất bại; tài khoản vẫn đã tạo. Hãy gửi lại lời mời sau khi kiểm tra cấu hình." : "Email chưa được xác nhận gửi. Kiểm tra cấu hình và gửi lại lời mời nếu cần.";
}

function AddAccountDrawer({ open, branches, onClose, onSave }: {
  open: boolean; branches: { id: string; name: string }[]; onClose: () => void;
  onSave: (input: StaffInvitationInput) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [branchId, setBranchId] = useState<string>();
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const [touched, setTouched] = useState(false);
  useEffect(() => { if (open) { setName(""); setEmail(""); setBranchId(branches[0]?.id); setTouched(false); } }, [open]);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const valid = name.trim().length > 0 && name.trim().length <= 200 && emailValid && !!branchId;
  const save = async () => {
    setTouched(true);
    if (!valid || inFlight.current) return;
    inFlight.current = true; setSaving(true);
    try { await onSave({ name: name.trim(), email: email.trim().toLowerCase(), role: "MANAGER", branchId: branchId! }); }
    finally { inFlight.current = false; setSaving(false); }
  };
  return (
    <Drawer title="Mời Store Manager qua email" open={open} onClose={() => { if (!saving) onClose(); }} maskClosable={!saving} closable={!saving} styles={{ wrapper: { width: 420, maxWidth: "100vw" }, body: { padding: 24 } }}>
      <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <Field label="Họ tên"><Input aria-label="Họ tên" data-testid="owner-invite-name" value={name} maxLength={200} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Email nhận lời mời">
          <Input aria-label="Email nhận lời mời" type="email" data-testid="owner-invite-email" value={email} maxLength={255} onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched(true)} status={touched && !emailValid ? "error" : undefined} aria-describedby="owner-invite-email-help" autoComplete="email" />
          <div id="owner-invite-email-help" role={touched && !emailValid ? "alert" : undefined} style={{ fontSize: 12, marginTop: 4, color: touched && !emailValid ? palette.error.text : palette.textMuted }}>{touched && !emailValid ? "Nhập email hợp lệ." : "Nhân viên nhận link đặt mật khẩu dùng một lần, hiệu lực 24 giờ."}</div>
        </Field>
        <Field label="Chi nhánh được gán"><Select aria-label="Chi nhánh được gán" value={branchId} onChange={setBranchId} style={{ width: "100%" }} options={branches.map((b) => ({ value: b.id, label: b.name }))} /></Field>
        <p style={{ color: palette.textMuted }}>Tài khoản chưa đăng nhập được cho tới khi nhân viên đặt mật khẩu. Lời mời đang chờ vẫn tính vào hạn mức gói.</p>
        <ActionButton htmlType="submit" type="primary" block loading={saving} disabled={!valid || saving} data-testid="owner-invite-submit">Gửi lời mời</ActionButton>
      </form>
    </Drawer>
  );
}

/**
 * BR-54/BR-56: Brand Manager never sets or sees a Store Manager password. A legacy username-only
 * account is moved to email login: the person receives a one-time link and sets their own password.
 */
function LegacyEmailDrawer({ target, onClose, onSave }: { target: { id: string; name: string; login: string } | null; onClose: () => void; onSave: (email: string, reason: string) => Promise<boolean> }) {
  const { message } = App.useApp();
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const reset = () => { setEmail(""); setReason(""); };
  return (
    <Drawer title={`Chuyển sang đăng nhập email: ${target?.name ?? ""}`} open={!!target} onClose={() => { reset(); onClose(); }} styles={{ wrapper: { width: 420 }, body: { padding: 24 } }}>
      <p style={{ color: palette.textMuted, marginTop: 0 }}>Tài khoản <b>{target?.login}</b> được tạo trước khi có đăng nhập bằng email nên không nhận được link đặt mật khẩu. Nhập email thật của Store Manager: mật khẩu cũ và mọi phiên bị thu hồi, hệ thống gửi link đặt mật khẩu dùng một lần (24 giờ) tới email này.</p>
      <Field label="Email của Store Manager">
        <Input data-testid="legacy-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="off" />
      </Field>
      <Field label="Lý do (bắt buộc)">
        <Input.TextArea data-testid="legacy-reason" rows={2} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} />
      </Field>
      <ActionButton type="primary" block loading={saving} onClick={() => {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { message.error("Nhập email hợp lệ"); return; }
        if (reason.trim().length < 3) { message.error("Nhập lý do ít nhất 3 ký tự"); return; }
        setSaving(true);
        void onSave(email, reason.trim()).then((ok) => { if (ok) reset(); }).finally(() => setSaving(false));
      }}>Gửi link đặt mật khẩu</ActionButton>
    </Drawer>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: palette.textMuted, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}
