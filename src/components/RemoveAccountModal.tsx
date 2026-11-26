import { useEffect, useState } from "react";
import { Alert, Input, Modal, Skeleton, Typography } from "antd";
import { describeApiError } from "../api";
import type { AccountRemovalMode, AccountRemovalPreview } from "../types";

/**
 * Xoá tài khoản không còn dùng, dùng chung cho Brand Manager (Store Manager), Store Manager (thu ngân, pha chế)
 * và Platform Admin (Platform Staff). Hỏi BE trước để nói rõ sẽ XOÁ HẲN hay ẨN DANH; lý do bắt buộc (audit).
 */
export default function RemoveAccountModal({
  target,
  loadPreview,
  submit,
  onClose,
  onRemoved,
}: {
  /** null = đóng. `label` là tên hoặc email hiển thị trong hộp thoại. */
  target: { id: string; label: string } | null;
  loadPreview: (id: string) => Promise<AccountRemovalPreview>;
  submit: (id: string, reason: string) => Promise<{ mode: AccountRemovalMode }>;
  onClose: () => void;
  onRemoved: (mode: AccountRemovalMode) => void;
}) {
  const [preview, setPreview] = useState<AccountRemovalPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPreview(null);
    setError(null);
    setReason("");
    if (!target) return;
    let alive = true;
    loadPreview(target.id).then(
      (result) => alive && setPreview(result),
      (err) => alive && setError(describeApiError(err)),
    );
    return () => {
      alive = false;
    };
  }, [target, loadPreview]);

  const confirm = async () => {
    if (!target || !preview?.allowed || reason.trim().length < 3) return;
    setSaving(true);
    try {
      const { mode } = await submit(target.id, reason.trim());
      onRemoved(mode);
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Xoá tài khoản"
      open={!!target}
      onCancel={onClose}
      onOk={() => void confirm()}
      okText={preview?.mode === "ANONYMIZE" ? "Ẩn danh và xoá" : "Xoá hẳn"}
      okButtonProps={{ danger: true, disabled: !preview?.allowed || reason.trim().length < 3, "data-testid": "remove-account-confirm" } as never}
      confirmLoading={saving}
      destroyOnHidden
    >
      <div data-testid="remove-account">
        <Typography.Paragraph style={{ marginBottom: 12 }}>
          Tài khoản <b>{target?.label}</b>
        </Typography.Paragraph>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}
        {!preview && !error && <Skeleton active paragraph={{ rows: 2 }} />}
        {preview && !preview.allowed && (
          <Alert
            data-testid="remove-account-blocked"
            type="warning"
            showIcon
            message="Chưa xoá được"
            description="Tài khoản vẫn đang dùng. Hãy khoá tài khoản (hoặc huỷ lời mời) trước, rồi mới xoá."
          />
        )}
        {preview?.allowed && (
          <>
            <Alert
              data-testid={`remove-account-mode-${preview.mode}`}
              type={preview.mode === "DELETE" ? "info" : "warning"}
              showIcon
              message={preview.mode === "DELETE" ? "Sẽ xoá hẳn" : "Sẽ ẩn danh"}
              description={
                preview.mode === "DELETE"
                  ? "Tài khoản chưa từng đăng nhập và chưa có dữ liệu nào. Hệ thống xoá hẳn tài khoản; email này có thể được mời lại."
                  : "Tài khoản đã có dữ liệu (đơn, thanh toán, chấm công hoặc thao tác). Hệ thống giữ lại để lịch sử và sổ sách vẫn đúng, nhưng xoá email, số điện thoại, tên và chặn đăng nhập vĩnh viễn. Trên báo cáo người này hiện là “Tài khoản đã xoá”. Email được giải phóng để dùng lại."
              }
              style={{ marginBottom: 12 }}
            />
            <Typography.Text strong>Lý do (bắt buộc)</Typography.Text>
            <Input.TextArea
              data-testid="remove-account-reason"
              rows={3}
              maxLength={500}
              showCount
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="VD: nhân viên đã nghỉ việc / mời nhầm email"
              style={{ marginTop: 6 }}
            />
            <Typography.Paragraph type="secondary" style={{ fontSize: 12.5, marginTop: 8, marginBottom: 0 }}>
              Không hoàn tác được. Thao tác được ghi vào nhật ký kèm người xoá, thời điểm và email đã che.
            </Typography.Paragraph>
          </>
        )}
      </div>
    </Modal>
  );
}
