import { App, Button, Card, Input, Modal, Space, Table, Tag, Typography } from "antd";
import { useCallback, useEffect, useState } from "react";
import { request } from "../../api/http/client";
import { showApiError } from "../../api";
import { formatDateTime } from "../../lib/reportFormat";

type Staff = { id: string; email: string; status: "ACTIVE" | "INACTIVE" | "SUSPENDED"; staffInvitationState: string | null; emailVerifiedAt: string | null; invitationExpiresAt: string | null; createdAt: string; lastLoginAt: string | null };
type EmailResult = { emailStatus: "SENT" | "PENDING" | "FAILED" };

export default function PlatformStaffAccounts() {
  const { message, modal } = App.useApp();
  const [rows, setRows] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await request<Staff[]>("/admin/platform-staff-accounts")); }
    catch (err) { showApiError(message.error, err, "Không tải được tài khoản Staff"); }
    finally { setLoading(false); }
  }, [message]);
  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    if (!email.trim() || note.trim().length < 3) { message.warning("Nhập email và ghi chú ít nhất 3 ký tự"); return; }
    setBusy(true);
    try { const result = await request<EmailResult>("/admin/platform-staff-accounts", { method: "POST", body: { email: email.trim(), note: note.trim() } }); setOpen(false); setEmail(""); setNote(""); if (result.emailStatus === "SENT") message.success("Đã gửi link đặt mật khẩu cho Staff"); else message.warning("Đã tạo tài khoản nhưng email chưa gửi thành công. Hãy gửi lại link."); await load(); }
    catch (err) { showApiError(message.error, err, "Không tạo được tài khoản"); }
    finally { setBusy(false); }
  };

  const act = (staff: Staff, action: "lock" | "unlock" | "reset-password") => {
    let value = "";
    modal.confirm({ title: action === "lock" ? "Khóa tài khoản" : action === "unlock" ? "Mở khóa tài khoản" : staff.emailVerifiedAt ? "Gửi link đặt lại mật khẩu" : "Gửi lại link đặt mật khẩu", content: <><p>{staff.email}</p><Input.TextArea placeholder="Ghi chú bắt buộc" onChange={(e) => { value = e.target.value; }} /></>, onOk: async () => {
      if (value.trim().length < 3) { message.warning("Nhập ghi chú ít nhất 3 ký tự"); throw new Error("Missing note"); }
      try { const result = await request<EmailResult>(`/admin/platform-staff-accounts/${staff.id}/${action}`, { method: "POST", body: { note: value.trim() } }); if (action === "reset-password" && result.emailStatus !== "SENT") message.warning("Link đã được tạo nhưng email chưa gửi thành công. Hãy thử gửi lại."); else message.success(action === "reset-password" ? "Đã gửi link đặt mật khẩu" : "Đã cập nhật tài khoản"); await load(); }
      catch (err) { showApiError(message.error, err, "Không cập nhật được tài khoản"); throw err; }
    } });
  };

  return <Card style={{ borderRadius: 14 }}>
    <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 16 }}>
      <div><Typography.Title level={4} style={{ marginBottom: 0 }}>Platform Staff</Typography.Title><Typography.Text type="secondary">Admin mời qua email; Staff tự đặt mật khẩu trước khi đăng nhập.</Typography.Text></div>
      <Button type="primary" onClick={() => setOpen(true)}>Tạo tài khoản</Button>
    </Space>
    <Table<Staff> rowKey="id" loading={loading} dataSource={rows} pagination={{ pageSize: 10 }} scroll={{ x: 700 }} columns={[
      { title: "Email", dataIndex: "email" },
      { title: "Trạng thái", render: (_, row) => <Tag color={row.status === "ACTIVE" ? "green" : row.status === "INACTIVE" ? "gold" : "red"}>{row.status === "ACTIVE" ? "Hoạt động" : row.status === "INACTIVE" ? "Chờ xác nhận" : "Đã khóa"}</Tag> },
      { title: "Xác nhận email", render: (_, row) => row.emailVerifiedAt ? `Đã xác nhận · ${formatDateTime(row.emailVerifiedAt)}` : `Chờ đặt mật khẩu · hạn ${row.invitationExpiresAt ? formatDateTime(row.invitationExpiresAt) : "—"}` },
      { title: "Đăng nhập gần nhất", render: (_, row) => row.lastLoginAt ? formatDateTime(row.lastLoginAt) : "—" },
      { title: "Thao tác", render: (_, row) => <Space><Button size="small" onClick={() => act(row, row.status === "SUSPENDED" ? "unlock" : "lock")}>{row.status === "SUSPENDED" ? "Mở khóa" : "Khóa"}</Button><Button size="small" disabled={row.status === "SUSPENDED"} onClick={() => act(row, "reset-password")}>{row.emailVerifiedAt ? "Đặt lại mật khẩu" : "Gửi lại link"}</Button></Space> },
    ]} />
    <Modal title="Tạo Platform Staff" open={open} onCancel={() => setOpen(false)} onOk={() => void create()} confirmLoading={busy} okText="Tạo và gửi email">
      <Input placeholder="Email Staff" value={email} onChange={(e) => setEmail(e.target.value)} style={{ marginBottom: 12 }} />
      <Input.TextArea placeholder="Ghi chú tạo tài khoản" value={note} onChange={(e) => setNote(e.target.value)} />
    </Modal>
  </Card>;
}
