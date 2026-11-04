import { useState } from "react";
import { App, Button, Input, Modal } from "antd";
import { useAppStore } from "../store";
import { useNavigate } from "react-router-dom";
import { palette } from "../theme";

/** Đổi mật khẩu tự nguyện — mở từ menu tài khoản (Hồ sơ cá nhân), dùng chung mọi vai trò. */
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

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={<span style={{ fontSize: 17, fontWeight: 700 }}>Hồ sơ cá nhân</span>}
    >
      <div style={{ fontSize: 13, color: palette.textMuted, marginBottom: 4 }}>Họ tên</div>
      <div style={{ fontWeight: 600, marginBottom: 12 }}>{currentUser?.name}</div>
      <div style={{ fontSize: 13, color: palette.textMuted, marginBottom: 4 }}>Email</div>
      <div style={{ fontWeight: 600, marginBottom: 18 }}>{currentUser?.email}</div>

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
