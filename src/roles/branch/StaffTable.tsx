import { App, Button, Card, Drawer, Input, Select, Table, Tag } from "antd";
import { KeyRound, Lock, Pencil, Plus, Unlock } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { STAFF_ROLE_LABEL, type AccountQuota, type AccountStatus, type StaffEmployee, type StaffInput, type StaffRole } from "../../types";
import { accountApi, modeOf, showApiError } from "../../api";
import { splitName, staffName, validateStaffInput, validateStaffPatch } from "../../api/modules/account/staffRules";
import { formatDateTime } from "../../lib/reportFormat";
import { SectionTitle } from "../../components/bits";
import { useAppStore } from "../../store";
import ActionButton from "../../plan/ActionButton";
import { palette } from "../../theme";
import StaffReasonModal from "./StaffReasonModal";

/** Cùng nhãn với màn Owner quản Manager (`ManagerAccounts.tsx`): INACTIVE = chưa đặt mật khẩu (BE: `UserStatus.INACTIVE` lúc mời). */
const STATUS_LABEL: Record<AccountStatus, string> = { ACTIVE: "Đang hoạt động", SUSPENDED: "Đã khoá", INACTIVE: "Chưa kích hoạt" };
const statusLabel = (code: string) => STATUS_LABEL[code as AccountStatus] ?? `Khác (${code})`;

const EMAIL_NOTE: Record<"SENT" | "PENDING" | "FAILED", string> = {
  SENT: "Email đã được gửi.",
  PENDING: "Email đã xếp hàng nhưng CHƯA gửi (máy chủ chưa cấu hình gửi thư). Dùng \"Gửi lại email\" sau khi cấu hình.",
  FAILED: "Gửi email THẤT BẠI (tài khoản vẫn được tạo). Dùng \"Gửi lại email\" để gửi lại lời mời.",
};

/**
 * BM-01 (#24, real từ 7.4c): Branch Manager quản Cashier/Barista của CHI NHÁNH MÌNH (BR-05, BR-02) qua `/manager/staff*`. Không có
 * mật khẩu: tài khoản mới ở trạng thái "Chưa kích hoạt" và nhận email đặt mật khẩu một lần (24 giờ); "Gửi lại email" cũng dùng để gửi lại
 * lời mời. Khoá/mở khoá và gửi lại email BẮT BUỘC lý do 3–500 ký tự (audit của BE). Cùng khuôn với màn Owner tạo Manager.
 * Dòng hạn mức "Đã dùng X/Y" lấy từ GÓI THẬT (`plan.limits`, quyết định 54); chưa tải được gói → "Chưa tải được hạn mức gói" + Thử lại
 * nhỏ, KHÔNG chặn màn (quyết định 53). Hết hạn gói thì chỉ đọc (ActionButton). Mock (cờ account=mock) giữ banner "Dữ liệu mẫu".
 */
export default function StaffTable() {
  const { message, modal } = App.useApp();
  const chainId = useAppStore((s) => s.chainId);
  const branchId = useAppStore((s) => s.currentBranchId);
  const branches = useAppStore((s) => s.branches);
  const branchName = branches.find((b) => b.id === branchId)?.name ?? "";
  const realAccount = modeOf("account") === "real";
  const sampleOnly = realAccount; // real: hạn mức đọc từ gói thật trong store; mock: từ mock tài khoản
  const plan = useAppStore((s) => s.plan);
  const reloadPlan = useAppStore((s) => s.reloadPlan);

  const [items, setItems] = useState<StaffEmployee[]>([]);
  const [quota, setQuota] = useState<AccountQuota | null>(null);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<StaffRole | undefined>();
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<StaffEmployee | null>(null);
  /** Hộp nhập lý do cho khoá / mở khoá / gửi lại email (BE bắt buộc `reason`). */
  const [reasonFor, setReasonFor] = useState<{ kind: "lock" | "unlock" | "reset"; staff: StaffEmployee } | null>(null);
  const [reasonBusy, setReasonBusy] = useState(false);

  const load = useCallback(async () => {
    if (!chainId || !branchId) return;
    setLoading(true);
    try {
      // Real: số "Đã dùng X/Y" lấy từ GÓI THẬT của BE (`plan.limits`, quyết định 54), không từ mock; danh sách nhân viên vẫn là mock (#24).
      const [page, q] = await Promise.all([
        accountApi.listStaff(chainId, branchId, { role, search }),
        sampleOnly ? Promise.resolve(null) : accountApi.getAccountQuota(chainId),
      ]);
      setItems(page.items);
      setQuota(q);
    } catch (err) {
      showApiError(message.error, err, "Không tải được danh sách nhân viên");
    } finally {
      setLoading(false);
    }
  }, [chainId, branchId, role, search, message, sampleOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Sau mỗi thay đổi tài khoản: nạp lại danh sách và gói (số đã dùng đổi nên nút theo hạn mức phải cập nhật). */
  const refreshAll = async () => {
    await load();
    await useAppStore.getState().loadScope({ silent: true });
  };

  /** Chạy một thao tác ghi: lỗi hiện một thông báo rõ (kèm gói cần nâng khi đủ hạn mức), xong thì nạp lại. */
  const run = async (action: () => Promise<void>, failText: string): Promise<boolean> => {
    try {
      await action();
      return true;
    } catch (err) {
      // Mọi lỗi API đi qua showApiError (câu tiếng Việt, chống trùng); lỗi toàn cục (403, hạn mức, mạng) do ApiErrorBridge báo.
      showApiError(message.error, err, failText);
      return false;
    } finally {
      await refreshAll();
    }
  };

  /** Bước cuối của khoá / mở khoá / gửi lại email: gọi API kèm lý do, rồi đóng hộp nếu thành công. Bấm đúp chỉ gửi 1 request. */
  const submitReason = async (reason: string) => {
    if (!reasonFor || reasonBusy) return;
    const { kind, staff: s } = reasonFor;
    setReasonBusy(true);
    try {
      const ok = await run(
        async () => {
          if (kind === "reset") {
            const { expiresAt, emailStatus } = await accountApi.resetStaffPassword(chainId!, branchId!, s.id, reason);
            modal.success({
              title: s.status === "INACTIVE" ? `Đã gửi lại lời mời kích hoạt cho ${staffName(s)}` : `Đã xếp email đặt lại mật khẩu cho ${staffName(s)}`,
              content: (
                <div data-testid="password-setup-notice" style={{ fontSize: 13.5, lineHeight: 1.8 }}>
                  Đã xếp email đặt mật khẩu tới <b>{s.email}</b>, hiệu lực tới {formatDateTime(expiresAt)}.
                  {emailStatus && <div data-testid="email-status">{EMAIL_NOTE[emailStatus]}</div>}
                </div>
              ),
            });
          } else {
            await accountApi.setStaffActive(chainId!, branchId!, s.id, kind === "unlock", reason);
            message.success(kind === "lock" ? `Đã khoá tài khoản ${staffName(s)}` : `Đã mở khoá tài khoản ${staffName(s)}`);
          }
        },
        kind === "lock" ? "Không khoá được tài khoản" : kind === "unlock" ? "Không mở khoá được tài khoản" : "Không gửi được email đặt mật khẩu",
      );
      if (ok) setReasonFor(null);
    } finally {
      setReasonBusy(false);
    }
  };

  const confirmLock = (s: StaffEmployee) => setReasonFor({ kind: s.status === "SUSPENDED" ? "unlock" : "lock", staff: s });
  const confirmReset = (s: StaffEmployee) => setReasonFor({ kind: "reset", staff: s });

  // Số liệu hạn mức: real = gói thật của BE; mock = mock tài khoản. Real mà chưa tải được gói → dòng báo lỗi nhỏ + Thử lại (quyết định 53).
  const planAccounts = plan?.limits.find((l) => l.resource === "accounts");
  const shown: AccountQuota | null = sampleOnly ? (planAccounts ? { used: planAccounts.used, limit: planAccounts.limit } : null) : quota;
  const limitReached = shown?.limit != null && shown.used >= shown.limit;
  const planUnavailable = sampleOnly && plan?.subscriptionUnavailable === true;

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title="Nhân viên"
        sub="Tài khoản Cashier và Barista của chi nhánh này"
        extra={
          <ActionButton type="primary" icon={<Plus size={15} />} consumes="accounts" data-testid="staff-add" onClick={() => setCreating(true)}>
            Thêm nhân viên
          </ActionButton>
        }
      />
      {!realAccount && (
        <div data-testid="staff-mock-banner" style={{ fontSize: 12.5, color: palette.warning.text, background: palette.paperSubtle, borderRadius: 8, padding: "8px 12px", marginBottom: 14 }}>
          Dữ liệu mẫu (chế độ giả lập). Tài khoản tạo ở đây không có trên máy chủ.
        </div>
      )}
      <div data-testid="staff-quota" style={{ fontSize: 13, marginBottom: 14, color: limitReached ? palette.error.text : palette.textMuted }}>
        {planUnavailable ? (
          // Lỗi đọc gói KHÔNG chặn màn (quyết định 53): nút Thêm vẫn bấm được, BE chặn thật nếu vượt hạn mức; không toast.
          <>
            <span data-testid="staff-quota-unavailable">Chưa tải được hạn mức gói</span>{" "}
            <Button size="small" type="link" data-testid="staff-quota-retry" onClick={() => void reloadPlan()} style={{ padding: 0, height: "auto" }}>
              Thử lại
            </Button>
          </>
        ) : shown ? (
          <>
            Đã dùng <b>{shown.used}{shown.limit != null ? `/${shown.limit}` : ""}</b> tài khoản của gói
            {limitReached ? " — đã đủ hạn mức, không tạo mới hay mở khoá thêm được." : "."}
          </>
        ) : sampleOnly && plan?.noActivePlan ? (
          "Chuỗi chưa có gói đang hoạt động."
        ) : (
          "Đang tải hạn mức…"
        )}
        <div style={{ fontSize: 12, color: palette.textSubtle }}>
          Đếm mọi tài khoản đang hoạt động của cả doanh nghiệp (Owner, Branch Manager, Cashier, Barista); tài khoản đã khoá không tính (đặc tả 13.1).
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <Select<StaffRole | "all">
          style={{ width: 170 }}
          value={role ?? "all"}
          data-testid="staff-role-filter"
          onChange={(v) => setRole(v === "all" ? undefined : v)}
          options={[{ value: "all", label: "Mọi vai trò" }, { value: "CASHIER", label: "Cashier" }, { value: "BARISTA", label: "Barista" }]}
        />
        <Input.Search allowClear placeholder="Tìm theo tên, email, mã" style={{ maxWidth: 300 }} onSearch={setSearch} />
      </div>

      <Table<StaffEmployee>
        dataSource={items}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="middle"
        scroll={{ x: 900 }}
        locale={{ emptyText: "Chưa có nhân viên nào khớp" }}
        columns={[
          {
            title: "Nhân viên",
            render: (_, s) => (
              <div>
                <div style={{ fontWeight: 600 }}>{staffName(s)}</div>
                <div style={{ fontSize: 12, color: palette.textSubtle }}>
                  {s.email} · {s.employeeCode}
                  {s.phone ? ` · ${s.phone}` : ""}
                </div>
              </div>
            ),
          },
          { title: "Vai trò", dataIndex: "role", render: (r: StaffRole) => <Tag>{STAFF_ROLE_LABEL[r]}</Tag> },
          {
            title: "Trạng thái",
            dataIndex: "status",
            render: (st: AccountStatus) => (
              <span
                style={{
                  background: st === "ACTIVE" ? palette.success.bg : st === "SUSPENDED" ? palette.error.bg : palette.paperSubtle,
                  color: st === "ACTIVE" ? palette.success.text : st === "SUSPENDED" ? palette.error.text : palette.textMuted,
                  padding: "3px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                }}
              >
                {statusLabel(st)}
              </span>
            ),
          },
          // BE không trả `lastLoginAt` ở danh sách nhân viên của Manager (#62) nên cột này chỉ có ở mock.
          ...(realAccount ? [] : [{ title: "Đăng nhập gần nhất", dataIndex: "lastLoginAt", render: (v: string | null) => (v ? formatDateTime(v) : "Chưa từng") }]),
          {
            title: "",
            align: "right",
            render: (_, s) => (
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <ActionButton size="small" icon={<Pencil size={13} />} onClick={() => setEditing(s)}>
                  Sửa
                </ActionButton>
                <ActionButton size="small" icon={<KeyRound size={13} />} data-testid={`staff-resend-${s.id}`} onClick={() => confirmReset(s)}>
                  Gửi lại email
                </ActionButton>
                {s.status === "SUSPENDED" ? (
                  <ActionButton size="small" icon={<Unlock size={13} />} consumes="accounts" data-testid={`staff-unlock-${s.id}`} onClick={() => confirmLock(s)}>
                    Mở khoá
                  </ActionButton>
                ) : (
                  <ActionButton size="small" icon={<Lock size={13} />} data-testid={`staff-lock-${s.id}`} onClick={() => confirmLock(s)}>
                    Khoá
                  </ActionButton>
                )}
              </div>
            ),
          },
        ]}
      />

      <CreateDrawer
        open={creating}
        branchName={branchName}
        onClose={() => setCreating(false)}
        onSubmit={(input) =>
          new Promise<void>((resolve) => {
            modal.confirm({
              title: `Tạo tài khoản ${input.firstName} ${input.lastName}?`,
              content: (
                <div data-testid="confirm-staff" style={{ fontSize: 13.5, lineHeight: 1.7 }}>
                  {STAFF_ROLE_LABEL[input.role]} · <b>{input.email}</b> · chi nhánh <b>{branchName}</b>
                  <br />
                  Không có mật khẩu: nhân viên nhận email đặt mật khẩu một lần (hiệu lực 24 giờ). Tài khoản mới tính vào hạn mức gói.
                </div>
              ),
              okText: "Tạo tài khoản",
              cancelText: "Huỷ",
              onCancel: () => resolve(),
              onOk: () =>
                run(async () => {
                  const { staff, expiresAt, emailStatus } = await accountApi.createStaff(chainId!, branchId!, input);
                  setCreating(false);
                  modal.success({
                    title: "Đã tạo tài khoản nhân viên",
                    content: (
                      <div data-testid="password-setup-notice" style={{ fontSize: 13.5, lineHeight: 1.8 }}>
                        Đã xếp email đặt mật khẩu tới <b>{staff.email}</b>, hiệu lực tới {formatDateTime(expiresAt)}.
                        {emailStatus && <div data-testid="email-status">{EMAIL_NOTE[emailStatus]}</div>}
                      </div>
                    ),
                  });
                }, "Không tạo được tài khoản").finally(resolve),
            });
          })
        }
      />
      <StaffReasonModal
        open={!!reasonFor}
        busy={reasonBusy}
        kind={reasonFor?.kind ?? "lock"}
        staffName={reasonFor ? staffName(reasonFor.staff) : ""}
        email={reasonFor?.staff.email ?? ""}
        roleLabel={reasonFor ? STAFF_ROLE_LABEL[reasonFor.staff.role] : ""}
        branchName={branchName}
        pending={reasonFor?.staff.status === "INACTIVE"}
        onCancel={() => !reasonBusy && setReasonFor(null)}
        onSubmit={(reason) => void submitReason(reason)}
      />
      <EditDrawer
        staff={editing}
        realAccount={realAccount}
        onClose={() => setEditing(null)}
        onSubmit={(patch) =>
          new Promise<void>((resolve) => {
            const s = editing!;
            modal.confirm({
              title: `Lưu thay đổi cho ${staffName(s)}?`,
              content: (
                <div data-testid="confirm-staff" style={{ fontSize: 13.5, lineHeight: 1.7 }}>
                  Họ tên: <b>{`${patch.firstName} ${patch.lastName}`}</b>
                  <br />
                  Điện thoại: <b>{patch.phone || "—"}</b>
                </div>
              ),
              okText: "Lưu",
              cancelText: "Huỷ",
              onCancel: () => resolve(),
              onOk: () =>
                run(async () => {
                  await accountApi.updateStaff(chainId!, branchId!, s.id, patch);
                  message.success("Đã cập nhật nhân viên");
                  setEditing(null);
                }, "Không lưu được nhân viên").finally(resolve),
            });
          })
        }
      />
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: palette.textMuted, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function CreateDrawer({ open, branchName, onClose, onSubmit }: { open: boolean; branchName: string; onClose: () => void; onSubmit: (input: StaffInput) => Promise<void> }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<StaffRole>("CASHIER");
  const [employeeCode, setEmployeeCode] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFullName("");
      setEmail("");
      setPhone("");
      setRole("CASHIER");
      setEmployeeCode("");
    }
  }, [open]);

  const input: StaffInput = { ...splitName(fullName), email, phone: phone || undefined, role, employeeCode: employeeCode.trim() };
  const errors = useMemo(() => (fullName || email || phone || employeeCode ? validateStaffInput(input) : []), [fullName, email, phone, role, employeeCode]);
  const canSave = validateStaffInput(input).length === 0 && !saving;

  return (
    <Drawer title="Thêm nhân viên" open={open} onClose={onClose} styles={{ wrapper: { width: 420 }, body: { padding: 24 } }}>
      <div style={{ fontSize: 13, color: palette.textMuted, marginBottom: 18 }}>
        Branch Manager tạo tài khoản Cashier và Barista cho chi nhánh mình. Vai trò quyết lúc tạo. Không đặt mật khẩu: nhân viên nhận email đặt mật khẩu.
      </div>
      <Field label="Họ và tên">
        <Input data-testid="staff-name" value={fullName} maxLength={200} onChange={(e) => setFullName(e.target.value)} placeholder="VD: Nguyễn Văn An" />
      </Field>
      <Field label="Email đăng nhập">
        <Input data-testid="staff-email" value={email} maxLength={255} onChange={(e) => setEmail(e.target.value)} placeholder="VD: an.nguyen@comtam.vn" />
      </Field>
      <Field label="Mã nhân viên">
        <Input data-testid="staff-code" value={employeeCode} maxLength={50} onChange={(e) => setEmployeeCode(e.target.value)} placeholder="VD: CSH-001 (BE tự viết hoa)" />
      </Field>
      <Field label="Điện thoại (tuỳ chọn)">
        <Input data-testid="staff-phone" value={phone} maxLength={20} onChange={(e) => setPhone(e.target.value)} placeholder="+84901234567" />
      </Field>
      <Field label="Vai trò">
        <Select
          style={{ width: "100%" }}
          value={role}
          onChange={setRole}
          data-testid="staff-role"
          options={[{ value: "CASHIER", label: "Cashier (thu ngân)" }, { value: "BARISTA", label: "Barista (pha chế)" }]}
        />
      </Field>
      <Field label="Chi nhánh">
        <Input value={branchName} disabled />
      </Field>
      {errors.length > 0 && (
        <ul data-testid="staff-errors" style={{ margin: "0 0 12px", paddingLeft: 18, color: palette.error.text, fontSize: 12.5 }}>
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      <ActionButton
        type="primary"
        block
        loading={saving}
        disabled={!canSave}
        data-testid="staff-save"
        onClick={async () => {
          setSaving(true);
          try {
            await onSubmit({ ...input, firstName: input.firstName.trim(), lastName: input.lastName.trim(), email: email.trim() });
          } finally {
            setSaving(false);
          }
        }}
      >
        Tạo tài khoản
      </ActionButton>
    </Drawer>
  );
}

function EditDrawer({ staff, realAccount, onClose, onSubmit }: { staff: StaffEmployee | null; realAccount: boolean; onClose: () => void; onSubmit: (patch: { firstName: string; lastName: string; phone: string | null }) => Promise<void> }) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (staff) {
      setFullName(staffName(staff));
      setPhone(staff.phone ?? "");
    }
  }, [staff]);

  const parts = splitName(fullName);
  const errors = staff ? validateStaffPatch({ ...parts, phone: phone.trim() || null }) : [];
  // BE không nhận null ("Null fields are not supported", manager-staff.service.ts:209) nên chưa xoá được số điện thoại đã có (#63).
  if (staff && realAccount && staff.phone && !phone.trim()) errors.push("Chưa xoá được số điện thoại đã có (chờ BE #63). Nhập số mới hoặc để nguyên.");
  return (
    <Drawer title={staff ? `Sửa · ${staffName(staff)}` : ""} open={!!staff} onClose={onClose} styles={{ wrapper: { width: 420 }, body: { padding: 24 } }}>
      {staff && (
        <>
          <Field label="Họ và tên">
            <Input data-testid="staff-edit-name" value={fullName} maxLength={200} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="Điện thoại">
            <Input data-testid="staff-edit-phone" value={phone} maxLength={20} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Email đăng nhập (không đổi được)">
            <Input value={staff.email} disabled />
          </Field>
          <Field label="Vai trò (không đổi được sau khi tạo)">
            <Input value={STAFF_ROLE_LABEL[staff.role]} disabled />
          </Field>
          {errors.length > 0 && (
            <ul data-testid="staff-edit-errors" style={{ margin: "0 0 12px", paddingLeft: 18, color: palette.error.text, fontSize: 12.5 }}>
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          <ActionButton
            type="primary"
            block
            loading={saving}
            disabled={errors.length > 0}
            data-testid="staff-edit-save"
            onClick={async () => {
              setSaving(true);
              try {
                await onSubmit({ ...parts, phone: phone.trim() || null });
              } finally {
                setSaving(false);
              }
            }}
          >
            Lưu
          </ActionButton>
        </>
      )}
    </Drawer>
  );
}
