import { useEffect, useState } from "react";
import { App, Button, Divider, Input, Modal } from "antd";
import { useAppStore } from "../store";
import { useNavigate } from "react-router-dom";
import { palette } from "../theme";
import { profileApi, type MyProfile } from "../api/profile";
import { showApiError } from "../api";

const PHONE = /^(\+84|0)\d{9,10}$/;

/**
 * Hồ sơ cá nhân (CM-02) — mở từ menu tài khoản, dùng chung mọi vai trò web. Mỗi người chỉ sửa hồ sơ của chính mình
 * (BE lấy id từ token). Email là định danh đăng nhập nên chỉ xem. Đổi mật khẩu giữ nguyên như trước.
 */
export default function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { message } = App.useApp();
  const currentUser = useAppStore((s) => s.currentUser);
  const changePassword = useAppStore((s) => s.changePassword);
  const logout = useAppStore((s) => s.logout);
  const navigate = useNavigate();
  const [current, setCurrent] = useState("");
  const [value, setValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [profileError, setProfileError] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [saving, setSaving] = useState(false);

  const fill = (p: MyProfile) => {
    setProfile(p);
    setFirstName(p.firstName ?? "");
    setLastName(p.lastName ?? "");
    setPhone(p.phone ?? "");
    setDob(p.dateOfBirth ?? "");
  };

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setProfileError(false);
    profileApi.get().then((p) => { if (alive) fill(p); }).catch(() => { if (alive) setProfileError(true); });
    return () => { alive = false; };
  }, [open]);

  const canEdit = (field: MyProfile["editableFields"][number]) => !!profile?.editableFields.includes(field);

  const saveProfile = async () => {
    if (!profile) return;
    const normalizedPhone = phone.replace(/[\s.-]/g, "");
    if (normalizedPhone && !PHONE.test(normalizedPhone)) { message.error("Số điện thoại không hợp lệ"); return; }
    if (canEdit("firstName") && !firstName.trim()) { message.error("Nhập họ"); return; }
    setSaving(true);
    try {
      const next = await profileApi.update({
        phone: normalizedPhone || null,
        ...(canEdit("firstName") ? { firstName, lastName, dateOfBirth: dob || null } : {}),
      });
      fill(next);
      if (next.fullName) useAppStore.setState((s) => ({ currentUser: s.currentUser ? { ...s.currentUser, name: next.fullName! } : s.currentUser }));
      message.success("Đã cập nhật hồ sơ");
    } catch (err) {
      showApiError(message.error, err, "Không cập nhật được hồ sơ");
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    if (value.length < 8 || !/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/[0-9]/.test(value)) {
      message.error("Mật khẩu mới cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số");
      return;
    }
    if (value !== confirm) {
      message.error("Xác nhận mật khẩu không khớp");
      return;
    }
    setBusy(true);
    try {
      await changePassword(current, value);
      await logout();
      message.success("Đã đổi mật khẩu. Vui lòng đăng nhập lại.");
      setCurrent("");
      setValue("");
      setConfirm("");
      onClose();
      navigate("/login");
    } finally {
      setBusy(false);
    }
  };

  const label = (text: string) => <div style={{ fontSize: 13, color: palette.textMuted, marginBottom: 4 }}>{text}</div>;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={<span style={{ fontSize: 17, fontWeight: 700 }}>Hồ sơ cá nhân</span>}
    >
      {label("Email đăng nhập")}
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{profile?.email ?? currentUser?.email}</div>
      <div style={{ fontSize: 12, color: palette.textMuted, marginBottom: 14 }}>
        Email dùng để đăng nhập và nhận link đặt mật khẩu nên không đổi tại đây. Cần đổi email, hãy liên hệ cấp trên trực tiếp.
      </div>

      {profileError && (
        <>
          {label("Họ tên")}
          <div style={{ fontWeight: 600, marginBottom: 12 }}>{currentUser?.name}</div>
          <div style={{ fontSize: 12.5, color: palette.textMuted, marginBottom: 12 }}>Không tải được hồ sơ để chỉnh sửa.</div>
        </>
      )}

      {profile && (
        <div data-testid="profile-form" style={{ display: "grid", gap: 10, marginBottom: 6 }}>
          {canEdit("firstName") ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>{label("Họ")}<Input data-testid="profile-first-name" value={firstName} maxLength={100} onChange={(e) => setFirstName(e.target.value)} /></div>
              <div>{label("Tên")}<Input data-testid="profile-last-name" value={lastName} maxLength={100} onChange={(e) => setLastName(e.target.value)} /></div>
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: palette.textMuted }}>
              Tài khoản nền tảng không có hồ sơ họ tên trong hệ thống; chỉ cập nhật được số điện thoại.
            </div>
          )}
          <div>{label("Số điện thoại")}<Input data-testid="profile-phone" value={phone} maxLength={16} placeholder="VD: 0901234567" onChange={(e) => setPhone(e.target.value)} /></div>
          {canEdit("dateOfBirth") && (
            <div>{label("Ngày sinh")}<Input data-testid="profile-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} /></div>
          )}
          {profile.branchName && <div style={{ fontSize: 12.5, color: palette.textMuted }}>Chi nhánh: {profile.branchName}</div>}
          <Button data-testid="profile-save" loading={saving} onClick={() => void saveProfile()}>Lưu hồ sơ</Button>
        </div>
      )}

      <Divider style={{ margin: "16px 0" }} />
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Đổi mật khẩu</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        <Input.Password size="large" placeholder="Mật khẩu hiện tại" value={current} onChange={(e) => setCurrent(e.target.value)} />
        <Input.Password
          size="large"
          placeholder="Mật khẩu mới (từ 8 ký tự)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Input.Password
          size="large"
          placeholder="Nhập lại mật khẩu mới"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      <Button type="primary" size="large" block loading={busy} onClick={submit}>
        Đổi mật khẩu
      </Button>
    </Modal>
  );
}
