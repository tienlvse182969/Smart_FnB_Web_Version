import { useState } from "react";
import { App, Button, Input, Modal } from "antd";
import { useAppStore } from "../store";

/**
 * CM-01: bắt đổi mật khẩu ở lần đăng nhập đầu tiên cho mọi vai trò mới tạo
 * (Owner, Manager, Waiter, Kitchen). Không có nút "Huỷ" — modal ở lại cho
 * tới khi đổi xong.
 */
export default function ForceChangePasswordModal() {
  const { message } = App.useApp();
  const currentUser = useAppStore((s) => s.currentUser);
  const changePassword = useAppStore((s) => s.changePassword);
  const [value, setValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  if (!currentUser?.mustChangePassword) return null;

  const submit = async () => {
    if (value.trim().length < 6) {
      message.error("Mật khẩu phải từ 6 ký tự trở lên");
      return;
    }
    if (value !== confirm) {
      message.error("Xác nhận mật khẩu không khớp");
      return;
    }
    setBusy(true);
    try {
      await changePassword(value);
      message.success("Đã đổi mật khẩu");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      closable={false}
      maskClosable={false}
      keyboard={false}
      footer={null}
      title={<span style={{ fontSize: 17, fontWeight: 700 }}>Đổi mật khẩu để tiếp tục</span>}
    >
      <div style={{ fontSize: 13, color: "#71717a", marginBottom: 16 }}>
        Tài khoản của bạn đang dùng mật khẩu tạm — hãy đặt mật khẩu mới trước khi vào hệ thống.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        <Input.Password
          size="large"
          placeholder="Mật khẩu mới (từ 6 ký tự)"
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
