import { App, Card, Drawer, Input, Select, Table, Tabs, Tag } from "antd";
import { KeyRound, Lock, Plus, Unlock } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { AccountStatus, ManagerAccount, ManagerPage, StaffAccount } from "../../types";
import { formatDateTime } from "../../lib/reportFormat";
import { accountApi, modeOf, showApiError } from "../../api";
import ActionButton from "../../plan/ActionButton";
import { useWriteGuard } from "../../plan/useReadOnly";
import { SectionTitle } from "../../components/bits";
import { useAppStore } from "../../store";
import { palette } from "../../theme";

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<AccountStatus, string> = { ACTIVE: "Đang hoạt động", SUSPENDED: "Đã khoá", INACTIVE: "Chưa kích hoạt" };

/**
 * OW-05: Owner quản Branch Manager — danh sách phân trang/tìm kiếm/lọc, khoá/mở khoá, gửi lại email đặt mật khẩu,
 * chuyển chi nhánh (BE `/employees`, real). Mọi thao tác ghi đều qua hộp xác nhận. Tạo Manager chờ BE (#23) ở chế độ real.
 * Cashier/Barista: Owner chỉ XEM (OW-05), đọc thật `GET /employees?role=CASHIER|BARISTA`.
 */
export default function ManagerAccounts() {
  const { message, modal } = App.useApp();
  const currentUser = useAppStore((s) => s.currentUser);
  const branches = useAppStore((s) => s.branches);
  const writeGuard = useWriteGuard();
  const tenantId = currentUser?.tenantId ?? null;
  const realManagers = modeOf("account") === "real";

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AccountStatus | undefined>();
  const [data, setData] = useState<ManagerPage>({ items: [], pagination: { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 } });
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState<StaffAccount[]>([]);
  const [adding, setAdding] = useState(false);

  const branchName = (id?: string) => branches.find((b) => b.id === id)?.name ?? id ?? "—";

  const loadManagers = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      setData(await accountApi.listManagers(tenantId, { page, limit: PAGE_SIZE, search, status }));
    } catch (err) {
      showApiError(message.error, err, "Không tải được danh sách Manager");
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

  const confirmLock = (m: ManagerAccount) => {
    const locking = m.status === "ACTIVE";
    modal.confirm({
      title: locking ? `Khoá tài khoản ${m.name}?` : `Mở khoá tài khoản ${m.name}?`,
      content: (
        <div data-testid="confirm-lock" style={{ fontSize: 13.5, lineHeight: 1.7 }}>
          <b>{m.name}</b> · chi nhánh <b>{m.branchName}</b> ({m.email})
          <br />
          {locking ? "Các phiên đang đăng nhập của tài khoản này sẽ bị thu hồi và không đăng nhập được nữa." : "Tài khoản đăng nhập được trở lại."}
        </div>
      ),
      okText: locking ? "Khoá tài khoản" : "Mở khoá",
      okButtonProps: { danger: locking },
      cancelText: "Huỷ",
      onOk: () =>
        run(async () => {
          await accountApi.setManagerActive(m.id, !locking);
          message.success(locking ? `Đã khoá tài khoản ${m.name}` : `Đã mở khoá tài khoản ${m.name}`);
        }, locking ? "Không khoá được tài khoản" : "Không mở khoá được tài khoản"),
    });
  };

  const confirmReset = (m: ManagerAccount) => {
    modal.confirm({
      title: `Gửi lại email đặt mật khẩu cho ${m.name}?`,
      content: (
        <div data-testid="confirm-reset" style={{ fontSize: 13.5, lineHeight: 1.7 }}>
          Email gửi tới <b>{m.email}</b>. Link dùng một lần, hiệu lực 24 giờ; các phiên đang đăng nhập của {m.name} sẽ bị thu hồi.
        </div>
      ),
      okText: "Gửi email",
      cancelText: "Huỷ",
      onOk: () =>
        run(async () => {
          const { expiresAt } = await accountApi.resetManagerPassword(m.id);
          modal.success({
            title: `Đã xếp email đặt lại mật khẩu cho ${m.name}`,
            content: (
              <div data-testid="password-setup-notice" style={{ fontSize: 13.5, lineHeight: 1.8 }}>
                Email gửi tới <b>{m.email}</b>, hiệu lực tới {formatDateTime(expiresAt)}. Các phiên đang đăng nhập đã bị thu hồi.
              </div>
            ),
          });
        }, "Không gửi được email đặt mật khẩu"),
    });
  };

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
        title="Tài khoản quản lý"
        sub="Một chi nhánh có thể có nhiều Branch Manager để trực ca — không phải một người làm cả ngày"
        extra={
          <ActionButton type="primary" icon={<Plus size={15} />} consumes="accounts" disabled={realManagers} data-testid="create-manager" onClick={() => setAdding(true)}>
            Thêm tài khoản
          </ActionButton>
        }
      />
      {realManagers && (
        <div data-testid="create-manager-note" style={{ fontSize: 12.5, color: palette.warning.text, background: palette.paperSubtle, borderRadius: 8, padding: "8px 12px", marginBottom: 14 }}>
          Chờ BE gửi email thay vì đặt mật khẩu (api-contract-plan #23) — chưa tạo được Manager ở chế độ này.
        </div>
      )}
      <Tabs
        items={[
          {
            key: "managers",
            label: `Branch Manager (${data.pagination.total})`,
            children: (
              <>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                  <Input.Search
                    allowClear
                    placeholder="Tìm theo tên, mã hoặc email"
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
                  locale={{ emptyText: "Chưa có Manager nào khớp" }}
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
                      render: (s: AccountStatus) => (
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
                          {STATUS_LABEL[s]}
                        </span>
                      ),
                    },
                    { title: "Đăng nhập gần nhất", dataIndex: "lastLoginAt", render: (v: string | null) => (v ? formatDateTime(v) : "Chưa từng") },
                    {
                      title: "",
                      key: "act",
                      align: "right",
                      render: (_, r) => (
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <ActionButton size="small" icon={<KeyRound size={14} />} onClick={() => confirmReset(r)}>
                            Reset mật khẩu
                          </ActionButton>
                          {r.status === "SUSPENDED" ? (
                            <ActionButton size="small" icon={<Unlock size={14} />} onClick={() => confirmLock(r)}>
                              Mở khoá
                            </ActionButton>
                          ) : (
                            <ActionButton size="small" icon={<Lock size={14} />} disabled={r.status !== "ACTIVE"} onClick={() => confirmLock(r)}>
                              Khoá
                            </ActionButton>
                          )}
                        </div>
                      ),
                    },
                  ]}
                />
              </>
            ),
          },
          {
            key: "staff",
            label: `Thu ngân & Pha chế (${staff.length}) · chỉ xem`,
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
                        </div>
                      ),
                    },
                    { title: "Vai trò", dataIndex: "role", render: (r: string) => <Tag>{r}</Tag> },
                    { title: "Chi nhánh", dataIndex: "branchName" },
                    {
                      title: "Trạng thái",
                      dataIndex: "status",
                      render: (s: AccountStatus) => (s === "ACTIVE" ? <Tag color="green">{STATUS_LABEL[s]}</Tag> : <Tag>{STATUS_LABEL[s]}</Tag>),
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
        onSave={async (name, email, branchId) => {
          if (!tenantId) return;
          try {
            const { account: acc, expiresAt } = await accountApi.createManager(tenantId, branchId, name, email);
            setAdding(false);
            modal.success({
              title: "Đã tạo tài khoản Branch Manager",
              content: (
                <div data-testid="password-setup-notice" style={{ fontSize: 13.5, lineHeight: 1.8 }}>
                  Đã xếp email đặt mật khẩu tới <b>{acc.email}</b>, hiệu lực tới {formatDateTime(expiresAt)}.
                </div>
              ),
            });
            await loadManagers();
          } catch (err) {
            showApiError(message.error, err, "Không tạo được — có thể đã vượt hạn mức gói");
          }
        }}
      />
    </Card>
  );
}

function AddAccountDrawer({
  open,
  branches,
  onClose,
  onSave,
}: {
  open: boolean;
  branches: { id: string; name: string }[];
  onClose: () => void;
  onSave: (name: string, email: string, branchId: string) => void;
}) {
  const { message } = App.useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [branchId, setBranchId] = useState(branches[0]?.id);

  useEffect(() => {
    if (open) setBranchId(branches[0]?.id);
  }, [open]);

  const reset = () => {
    setName("");
    setEmail("");
  };

  const save = () => {
    if (!name.trim() || !email.trim() || !branchId) {
      message.error("Nhập tên, email và chọn chi nhánh");
      return;
    }
    onSave(name.trim(), email.trim(), branchId);
    reset();
  };

  return (
    <Drawer
      title="Thêm tài khoản Branch Manager"
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      styles={{ wrapper: { width: 420 }, body: { padding: 24 } }}
    >
      <Field label="Họ tên">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Nguyễn Văn A" />
      </Field>
      <Field label="Email đăng nhập">
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ten@comtam.vn" />
      </Field>
      <Field label="Chi nhánh được gán">
        <Select value={branchId} onChange={setBranchId} style={{ width: "100%" }} options={branches.map((b) => ({ value: b.id, label: b.name }))} />
      </Field>
      <ActionButton type="primary" block style={{ marginTop: 8 }} onClick={save}>
        Tạo tài khoản
      </ActionButton>
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
