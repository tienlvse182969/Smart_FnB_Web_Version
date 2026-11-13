import { useCallback, useEffect, useState } from "react";
import { Alert, App, Button, Card, Input, Modal, Space, Table, Typography } from "antd";
import { request } from "../api/http/client";
import { ApiError } from "../api/http/errors";
import { modeOf } from "../api/flags";
import { describeApiError, showApiError } from "../api";
import { subscribeOperations } from "../api/realtime/operations";
import { formatDateTime } from "../lib/reportFormat";
import { palette, type StatusColorKey } from "../theme";
import { Chip } from "../roles/admin/adminUi";

export type ResetRequest = {
  id: string;
  status: "PENDING" | "RESET" | "REJECTED" | "EXPIRED";
  createdAt: string;
  expiresAt: string;
  user: { email: string; status: string; role: { code: string }; employee?: { firstName: string; lastName: string } | null; owner?: { firstName: string; lastName: string } | null };
  handledBy?: { email: string } | null;
};

/** Tên vai trò theo đặc tả (mục 2), không hiện mã BE. */
export const RESET_ROLE_LABEL: Record<string, string> = {
  MANAGER: "Store Manager",
  OWNER: "Brand Manager",
  PLATFORM_STAFF: "Platform Staff",
};

const STATUS_LABEL: Record<ResetRequest["status"], { text: string; tone: StatusColorKey }> = {
  PENDING: { text: "Chờ xử lý", tone: "warning" },
  RESET: { text: "Đã đặt lại", tone: "success" },
  REJECTED: { text: "Bị từ chối", tone: "neutral" },
  EXPIRED: { text: "Hết hạn", tone: "neutral" },
};

/** BE trả 409 "Đã được <người> xử lý" khi người khác chốt trước (22.8): hiện nguyên câu đó. */
export const alreadyHandledMessage = (error: unknown): string | null =>
  error instanceof ApiError && error.status === 409 && /^Đã được .+ xử lý$/.test(error.message.trim()) ? error.message.trim() : null;

/**
 * 22.8: danh sách yêu cầu đặt lại mật khẩu cho Brand Manager (của Store Manager), Platform Staff (của Brand Manager) và Platform
 * Admin (của Platform Staff và Brand Manager). Realtime qua `password-reset.*`, badge đếm ở menu, Đặt lại / Từ chối (ghi chú bắt buộc),
 * tài khoản bị khoá chỉ còn Từ chối, người đến sau thấy tên người đã xử lý. Hiện email người xử lý tới khi BE trả họ tên (L3).
 */
export default function PasswordResetRequests() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<ResetRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [active, setActive] = useState<ResetRequest | null>(null);
  const [decision, setDecision] = useState<"approve" | "reject">("approve");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const isMock = modeOf("auth") === "mock";

  const load = useCallback(async () => {
    if (isMock) { setRows([]); return; }
    setLoading(true);
    try {
      setRows(await request<ResetRequest[]>("/password-reset-requests"));
      setLoadError(null);
    } catch (error) {
      setLoadError(describeApiError(error));
    } finally { setLoading(false); }
  }, [isMock]);

  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 15000); return () => window.clearInterval(timer); }, [load]);
  useEffect(() => {
    if (isMock) return;
    return subscribeOperations({ onEvent: (event) => { if (event.type.startsWith("password-reset.")) void load(); }, onStatus: (status, info) => { if (status === "connected" && info.reconnected) void load(); } });
  }, [isMock, load]);

  const resolve = async (item: ResetRequest, action: "approve" | "reject", rejectionNote?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await request(`/password-reset-requests/${item.id}/${action}`, { method: "POST", ...(action === "reject" ? { body: { note: rejectionNote?.trim() } } : {}) });
      message.success(action === "approve" ? "Đã gửi link đặt mật khẩu cho nhân viên" : "Đã từ chối yêu cầu");
      setActive(null); setNote(""); await load();
    } catch (error) {
      const handled = alreadyHandledMessage(error);
      if (handled) { message.warning(handled); setActive(null); setNote(""); }
      else showApiError(message.error, error, "Không xử lý được yêu cầu");
      await load();
    } finally { setBusy(false); }
  };

  const resend = async (item: ResetRequest) => {
    if (busy) return;
    setBusy(true);
    try { await request(`/password-reset-requests/${item.id}/resend`, { method: "POST" }); message.success("Đã gửi lại link đặt mật khẩu"); await load(); }
    catch (error) { showApiError(message.error, error, "Không gửi lại được email"); }
    finally { setBusy(false); }
  };

  const nameOf = (item: ResetRequest) =>
    [item.user.owner?.firstName ?? item.user.employee?.firstName, item.user.owner?.lastName ?? item.user.employee?.lastName].filter(Boolean).join(" ") || item.user.email;

  const actions = (item: ResetRequest) => {
    if (item.status === "RESET" && item.user.status === "INACTIVE") return <Button disabled={busy} onClick={() => void resend(item)}>Gửi lại email</Button>;
    if (item.status !== "PENDING") return <span data-testid="reset-handled-by">{item.handledBy?.email ?? "—"}</span>;
    const locked = item.user.status !== "ACTIVE";
    return (
      <Space direction="vertical" size={4}>
        <Space>
          {!locked && <Button type="primary" disabled={busy} onClick={() => { setDecision("approve"); setActive(item); }}>Đặt lại</Button>}
          <Button danger disabled={busy} onClick={() => { setDecision("reject"); setActive(item); setNote(""); }}>Từ chối</Button>
        </Space>
        {locked && <span data-testid="reset-locked-note" style={{ fontSize: 12, color: palette.textMuted }}>Tài khoản đang bị khoá, chỉ có thể từ chối</span>}
      </Space>
    );
  };

  return <Card title="Yêu cầu đặt lại mật khẩu" extra={<Button onClick={() => void load()} loading={loading}>Làm mới</Button>}>
    <Typography.Paragraph type="secondary">Xác minh người yêu cầu qua điện thoại hoặc trực tiếp trước khi đặt lại. Link chỉ được gửi tới email của tài khoản.</Typography.Paragraph>
    {loadError && (
      <Alert
        data-testid="reset-load-error"
        type="error"
        showIcon
        style={{ marginBottom: 12 }}
        message="Không tải được yêu cầu đặt lại mật khẩu"
        description={loadError}
        action={<Button size="small" onClick={() => void load()}>Thử lại</Button>}
      />
    )}
    <Table rowKey="id" dataSource={rows} loading={loading && rows.length === 0} pagination={{ pageSize: 10, hideOnSinglePage: true }}
      locale={{ emptyText: <span style={{ color: palette.textMuted }}>{loadError ? "Không tải được danh sách" : "Chưa có yêu cầu đặt lại mật khẩu nào"}</span> }}
      columns={[
        { title: "Tài khoản", render: (_, item) => <><strong>{nameOf(item)}</strong><div>{item.user.email}</div></> },
        { title: "Vai trò", render: (_, item) => RESET_ROLE_LABEL[item.user.role.code] ?? item.user.role.code },
        { title: "Gửi lúc", render: (_, item) => formatDateTime(item.createdAt) },
        { title: "Hạn xử lý", render: (_, item) => item.status === "PENDING" ? formatDateTime(item.expiresAt) : "—" },
        { title: "Trạng thái", render: (_, item) => <Chip tone={STATUS_LABEL[item.status].tone}>{STATUS_LABEL[item.status].text}</Chip> },
        { title: "Xử lý", render: (_, item) => actions(item) },
      ]} />
    <Modal title={`Xử lý yêu cầu của ${active?.user.email ?? ""}`} open={!!active} onCancel={() => setActive(null)} footer={null} destroyOnHidden>
      {decision === "approve" ? <>
        <Typography.Paragraph>Hãy xác minh danh tính trước khi tiếp tục. Đặt lại sẽ vô hiệu mật khẩu cũ và đăng xuất các phiên đang mở ngay lập tức.</Typography.Paragraph>
        <Button type="primary" loading={busy} onClick={() => active && void resolve(active, "approve")}>Xác nhận đặt lại và gửi email</Button>
      </> : <>
        <Typography.Paragraph>Ghi chú từ chối chỉ lưu nội bộ, không gửi email cho người yêu cầu.</Typography.Paragraph>
        <Input.TextArea data-testid="reset-reject-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} rows={3} />
        <Button danger disabled={!note.trim()} loading={busy} style={{ marginTop: 12 }} onClick={() => active && void resolve(active, "reject", note)}>Từ chối yêu cầu</Button>
      </>}
    </Modal>
  </Card>;
}
