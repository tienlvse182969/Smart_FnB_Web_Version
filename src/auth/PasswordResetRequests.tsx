import { useCallback, useEffect, useState } from "react";
import { App, Button, Card, Input, Modal, Space, Table, Tag, Typography } from "antd";
import { request } from "../api/http/client";
import { modeOf } from "../api/flags";
import { showApiError } from "../api";
import { subscribeOperations } from "../api/realtime/operations";

type ResetRequest = {
  id: string;
  status: "PENDING" | "RESET" | "REJECTED" | "EXPIRED";
  createdAt: string;
  expiresAt: string;
  user: { email: string; status: string; emailSendStatus?: "PENDING" | "SENT" | "FAILED" | null; role: { code: string }; employee?: { firstName: string; lastName: string } | null; owner?: { firstName: string; lastName: string } | null };
  handledByName?: string | null;
};

type ResolveResult = { status: "RESET" | "REJECTED"; emailStatus?: "PENDING" | "SENT" | "FAILED" | null };
const emailResult = (status?: "PENDING" | "SENT" | "FAILED" | null) => status === "SENT" ? "Đã gửi link đặt mật khẩu" : "Chưa gửi được email. Hãy kiểm tra cấu hình và gửi lại.";

export default function PasswordResetRequests() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<ResetRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<ResetRequest | null>(null);
  const [decision, setDecision] = useState<"approve" | "reject">("approve");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const isMock = modeOf("auth") === "mock";

  const load = useCallback(async () => {
    if (isMock) { setRows([]); return; }
    setLoading(true);
    try { setRows(await request<ResetRequest[]>("/password-reset-requests")); }
    catch (error) { showApiError(message.error, error, "Không tải được yêu cầu đặt lại mật khẩu"); }
    finally { setLoading(false); }
  }, [isMock, message]);

  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 15000); return () => window.clearInterval(timer); }, [load]);
  useEffect(() => {
    if (isMock) return;
    return subscribeOperations({ onEvent: (event) => { if (event.type.startsWith("password-reset.")) void load(); }, onStatus: (status, info) => { if (status === "connected" && info.reconnected) void load(); } });
  }, [isMock, load]);

  const resolve = async (item: ResetRequest, action: "approve" | "reject", rejectionNote?: string) => {
    setBusy(true);
    try {
      const result = await request<ResolveResult>(`/password-reset-requests/${item.id}/${action}`, { method: "POST", ...(action === "reject" ? { body: { note: rejectionNote?.trim() } } : {}) });
      if (action === "approve" && result.emailStatus !== "SENT") message.warning(emailResult(result.emailStatus));
      else message.success(action === "approve" ? emailResult(result.emailStatus) : "Đã từ chối yêu cầu");
      setActive(null); setNote(""); await load();
    } catch (error) { showApiError(message.error, error, "Không xử lý được yêu cầu"); await load(); }
    finally { setBusy(false); }
  };

  const resend = async (item: ResetRequest) => {
    setBusy(true);
    try { const result = await request<{ emailStatus?: "PENDING" | "SENT" | "FAILED" }>(`/password-reset-requests/${item.id}/resend`, { method: "POST" }); if (result.emailStatus === "SENT") message.success("Đã gửi lại link đặt mật khẩu"); else message.warning(emailResult(result.emailStatus)); await load(); }
    catch (error) { showApiError(message.error, error, "Không gửi lại được email"); }
    finally { setBusy(false); }
  };

  return <Card title="Yêu cầu đặt lại mật khẩu" extra={<Button onClick={() => void load()} loading={loading}>Làm mới</Button>}>
    <Typography.Paragraph type="secondary">Xác minh người yêu cầu qua điện thoại hoặc trực tiếp trước khi đặt lại. Link chỉ được gửi tới email của tài khoản.</Typography.Paragraph>
    <Table rowKey="id" dataSource={rows} loading={loading} pagination={{ pageSize: 10 }} columns={[
      { title: "Tài khoản", render: (_, item) => <><strong>{[item.user.owner?.firstName ?? item.user.employee?.firstName, item.user.owner?.lastName ?? item.user.employee?.lastName].filter(Boolean).join(" ") || item.user.email}</strong><div>{item.user.email}</div>{(item.user.emailSendStatus === "FAILED" || item.user.emailSendStatus === "PENDING") && <Tag color="warning">Chưa gửi được email</Tag>}</> },
      { title: "Vai trò", render: (_, item) => item.user.role.code },
      { title: "Gửi lúc", render: (_, item) => new Date(item.createdAt).toLocaleString("vi-VN") },
      { title: "Trạng thái", render: (_, item) => <Tag color={item.status === "PENDING" ? "gold" : item.status === "RESET" ? "green" : "default"}>{item.status === "PENDING" ? "Chờ xử lý" : item.status === "RESET" ? "Đã đặt lại" : item.status === "REJECTED" ? "Từ chối" : "Hết hạn"}</Tag> },
      { title: "Xử lý", render: (_, item) => item.status === "RESET" && item.user.status === "INACTIVE" ? <><Button disabled={busy} onClick={() => void resend(item)}>Gửi lại email</Button><div>{item.handledByName ?? "—"}</div></> : item.status !== "PENDING" ? (item.handledByName ?? "—") : <Space><Button type="primary" disabled={item.user.status !== "ACTIVE"} onClick={() => { setDecision("approve"); setActive(item); }}>Đặt lại</Button><Button danger onClick={() => { setDecision("reject"); setActive(item); setNote(""); }}>Từ chối</Button></Space> },
    ]} />
    <Modal title={`Xử lý yêu cầu của ${active?.user.email ?? ""}`} open={!!active} onCancel={() => setActive(null)} footer={null}>
      {decision === "approve" ? <>
        <Typography.Paragraph>Hãy xác minh danh tính trước khi tiếp tục. Đặt lại sẽ vô hiệu mật khẩu cũ và đăng xuất các phiên đang mở ngay lập tức.</Typography.Paragraph>
        <Button type="primary" loading={busy} onClick={() => active && void resolve(active, "approve")}>Xác nhận đặt lại và gửi email</Button>
      </> : <>
        <Typography.Paragraph>Ghi chú từ chối chỉ lưu nội bộ, không gửi email cho người yêu cầu.</Typography.Paragraph>
        <Input.TextArea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} rows={3} />
        <Button danger disabled={!note.trim()} loading={busy} style={{ marginTop: 12 }} onClick={() => active && void resolve(active, "reject", note)}>Từ chối yêu cầu</Button>
      </>}
    </Modal>
  </Card>;
}
