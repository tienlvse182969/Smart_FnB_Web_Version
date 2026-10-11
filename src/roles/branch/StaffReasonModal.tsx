import { useEffect, useState } from "react";
import { Alert, Button, Input, Modal } from "antd";
import { STAFF_REASON_MAX, validateStaffReason } from "../../api/modules/account/staffRules";
import { palette } from "../../theme";

interface Props {
  open: boolean;
  /** Đang gọi API: khoá nút (bấm đúp chỉ gửi 1 request) và không cho đóng. */
  busy: boolean;
  kind: "lock" | "unlock" | "reset";
  staffName: string;
  email: string;
  roleLabel: string;
  branchName: string;
  /** Tài khoản chưa kích hoạt (INACTIVE): "gửi lại email" là gửi lại lời mời. */
  pending: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
}

/**
 * Hộp xác nhận kèm LÝ DO cho khoá / mở khoá / gửi lại email của Branch Manager (BM-01). BE bắt buộc `reason` 3–500 ký tự
 * (`ManagerStaffStatusDto`, `ManagerResetPasswordDto`, `manager.dto.ts:40-60`) và ghi vào nhật ký. Hộp nằm trong `.ant-modal-container`
 * nên `DirtyWatcher` tự coi là form nhập dở.
 */
export default function StaffReasonModal({ open, busy, kind, staffName, email, roleLabel, branchName, pending, onCancel, onSubmit }: Props) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setTouched(false);
    }
  }, [open, kind, email]);

  const error = validateStaffReason(reason);
  const title =
    kind === "lock"
      ? `Khoá tài khoản ${staffName}?`
      : kind === "unlock"
        ? `Mở khoá tài khoản ${staffName}?`
        : pending
          ? `Gửi lại lời mời kích hoạt cho ${staffName}?`
          : `Gửi lại email đặt mật khẩu cho ${staffName}?`;
  const okText = kind === "lock" ? "Khoá tài khoản" : kind === "unlock" ? "Mở khoá" : "Gửi email";

  return (
    <Modal
      open={open}
      title={title}
      onCancel={onCancel}
      maskClosable={false}
      destroyOnHidden
      footer={[
        <Button key="cancel" disabled={busy} onClick={onCancel} data-testid="staff-reason-cancel">
          Huỷ
        </Button>,
        <Button
          key="ok"
          type="primary"
          danger={kind === "lock"}
          loading={busy}
          disabled={busy || !!error}
          onClick={() => {
            setTouched(true);
            if (!error && !busy) onSubmit(reason.trim());
          }}
          data-testid="staff-reason-ok"
        >
          {okText}
        </Button>,
      ]}
    >
      <div data-testid="confirm-staff" style={{ fontSize: 13.5, lineHeight: 1.7, marginBottom: 12 }}>
        <b>{staffName}</b> · {roleLabel} · chi nhánh <b>{branchName}</b> ({email})
        <br />
        {kind === "lock" && "Các phiên đang đăng nhập bị thu hồi và nhân viên không đăng nhập được nữa. Tài khoản khoá không tính vào hạn mức gói."}
        {kind === "unlock" && "Tài khoản đăng nhập được trở lại và tính lại vào hạn mức gói; nếu gói đã đủ tài khoản thì không mở khoá được."}
        {kind === "reset" &&
          (pending ? (
            <>Email gửi tới <b>{email}</b>. Link kích hoạt dùng một lần, hiệu lực 24 giờ; lời mời cũ không còn dùng được.</>
          ) : (
            <>Email gửi tới <b>{email}</b>. Link dùng một lần, hiệu lực 24 giờ; các phiên đang đăng nhập của {staffName} sẽ bị thu hồi.</>
          ))}
      </div>
      {kind === "reset" && <Alert type="info" showIcon style={{ marginBottom: 12 }} message="Thao tác này GỬI EMAIL THẬT tới địa chỉ trên." />}
      <label htmlFor="staff-reason" style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
        Lý do (ghi vào nhật ký) <span style={{ color: palette.error.text }}>*</span>
      </label>
      <Input.TextArea
        id="staff-reason"
        data-testid="staff-reason"
        rows={3}
        maxLength={STAFF_REASON_MAX}
        showCount
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        onBlur={() => setTouched(true)}
        status={touched && error ? "error" : undefined}
      />
      {touched && error && (
        <div data-testid="staff-reason-error" style={{ color: palette.error.text, fontSize: 13, marginTop: 4 }}>
          {error}
        </div>
      )}
    </Modal>
  );
}
