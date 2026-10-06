import { useCallback, useEffect, useState } from "react";
import { Alert, App, Button, Card, Input, Skeleton, Tag } from "antd";
import { Link2Off, Save } from "lucide-react";
import { describeApiError, payosApi, showApiError, type PayosChannel, type PayosKeysInput, type PayosLinkStatus } from "../../api";
import { SectionTitle } from "../../components/bits";
import { useDirtyGuard } from "../../lib/dirtyGuard";
import ActionButton from "../../plan/ActionButton";
import { useAppStore } from "../../store";
import { palette } from "../../theme";

type KeyField = keyof PayosKeysInput;

const FIELDS: { key: KeyField; label: string }[] = [
  { key: "clientId", label: "Client ID" },
  { key: "apiKey", label: "API Key" },
  { key: "checksumKey", label: "Checksum Key" },
];

const EMPTY: PayosKeysInput = { clientId: "", apiKey: "", checksumKey: "" };

/** Câu xác nhận gỡ liên kết (quyết định 32) — phase6 so đúng câu này. */
export const PAYOS_UNLINK_WARNING = "QR thanh toán ở mọi chi nhánh sẽ ngừng hoạt động cho tới khi liên kết lại.";

const STATUS_VIEW: Record<PayosLinkStatus, { label: string; color: string }> = {
  unlinked: { label: "Chưa liên kết", color: "default" },
  verifying: { label: "Đang kiểm tra", color: "processing" },
  linked: { label: "Đã liên kết", color: "success" },
  error: { label: "Lỗi", color: "error" },
};

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

/**
 * Liên kết PayOS (OW-06, mục 11.3, BR-25): Owner nhập 3 khoá một chiều; sau khi lưu khoá không bao giờ hiện lại.
 * Khoá chỉ nằm trong state của màn này: ô kiểu mật khẩu (có nút hiện/ẩn), `autoComplete="off"`, xoá sạch sau khi lưu thành công, không ghi
 * vào localStorage/sessionStorage, không log, không đưa vào thông báo lỗi (quyết định 30). Cập nhật phải nhập lại đủ 3 khoá (quyết định 31).
 * Thật chỉ có Chưa liên kết / Đã liên kết; "Đang kiểm tra" chỉ chớp trong lúc PUT; "Lỗi" chờ BE (#40, chỉ mock có).
 */
export default function PayosLink() {
  const { message, modal } = App.useApp();
  const chainId = useAppStore((s) => s.chainId);
  const [channel, setChannel] = useState<PayosChannel | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [keys, setKeys] = useState<PayosKeysInput>(EMPTY);
  const [shown, setShown] = useState<Record<KeyField, boolean>>({ clientId: false, apiKey: false, checksumKey: false });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<KeyField, string>>>({});
  const [verifying, setVerifying] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!chainId) return;
    setLoadError(null);
    try {
      setChannel(await payosApi.getChannel(chainId));
    } catch (err) {
      setChannel(null);
      setLoadError(describeApiError(err));
    }
  }, [chainId]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = FIELDS.some((f) => keys[f.key] !== "");
  useDirtyGuard(dirty);

  const status: PayosLinkStatus = verifying ? "verifying" : (channel?.status ?? "unlinked");
  const isLinked = channel?.status === "linked" || channel?.status === "error";

  const handleSave = async () => {
    if (!chainId || busy) return;
    const errors: Partial<Record<KeyField, string>> = {};
    for (const f of FIELDS) if (!keys[f.key].trim()) errors[f.key] = `Nhập ${f.label}`;
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return; // không gửi request
    setBusy(true);
    setVerifying(true);
    try {
      const next = await payosApi.saveKeys(chainId, keys);
      setChannel(next);
      setKeys(EMPTY); // khoá không được nằm lại trong bộ nhớ giao diện
      setShown({ clientId: false, apiKey: false, checksumKey: false });
      message.success(isLinked ? "Đã cập nhật khoá PayOS" : "Đã liên kết PayOS");
    } catch (err) {
      showApiError(message.error, err, "Không lưu được khoá PayOS");
    } finally {
      setVerifying(false);
      setBusy(false);
    }
  };

  const doUnlink = async () => {
    if (!chainId) return;
    setBusy(true);
    try {
      setChannel(await payosApi.unlink(chainId));
      setKeys(EMPTY);
      message.success("Đã gỡ liên kết PayOS");
    } catch (err) {
      showApiError(message.error, err, "Không gỡ được liên kết");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleUnlink = () => {
    modal.confirm({
      title: "Gỡ liên kết PayOS?",
      content: <div data-testid="payos-unlink-confirm">{PAYOS_UNLINK_WARNING}</div>,
      okText: "Gỡ liên kết",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: doUnlink,
    });
  };

  return (
    <div>
      <SectionTitle title="Liên kết PayOS" sub="Tài khoản PayOS của doanh nghiệp nhận tiền cho mọi chi nhánh (BR-25). Khoá được mã hoá và không bao giờ hiện lại sau khi lưu." />
      {loadError && (
        <Alert
          data-testid="payos-load-error"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="Không tải được trạng thái liên kết PayOS"
          description={loadError}
          action={
            <Button size="small" onClick={() => void load()}>
              Thử lại
            </Button>
          }
        />
      )}
      <Card style={{ borderRadius: 14, maxWidth: 560 }} styles={{ body: { padding: 22 } }}>
        {!channel && !loadError ? (
          <Skeleton active paragraph={{ rows: 3 }} />
        ) : channel ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Trạng thái</span>
              <Tag data-testid="payos-status" color={STATUS_VIEW[status].color} style={{ margin: 0 }}>
                {STATUS_VIEW[status].label}
              </Tag>
            </div>
            {isLinked && (
              <div data-testid="payos-dates" style={{ fontSize: 12.5, color: palette.textMuted, marginBottom: 16 }}>
                Liên kết lúc {formatDate(channel.linkedAt)} · Cập nhật lúc {formatDate(channel.updatedAt)}
              </div>
            )}
            {channel.status === "error" && (
              <Alert type="warning" showIcon style={{ marginBottom: 14 }} message="Kết nối PayOS đang lỗi. Nhập lại đủ 3 khoá để liên kết lại." />
            )}
            <div style={{ fontSize: 13, color: palette.textMuted, margin: "14px 0" }}>
              {isLinked ? "Cập nhật khoá: nhập lại đủ cả 3 khoá (khoá cũ không hiện lại để bạn sửa từng ô)." : "Nhập 3 khoá lấy từ trang quản trị PayOS."}
            </div>
            {FIELDS.map((f) => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }} htmlFor={`payos-${f.key}`}>
                  {f.label}
                </label>
                <Input.Password
                  id={`payos-${f.key}`}
                  data-testid={`payos-${f.key}`}
                  value={keys[f.key]}
                  autoComplete="off"
                  status={fieldErrors[f.key] ? "error" : undefined}
                  disabled={busy}
                  onChange={(e) => {
                    setKeys((k) => ({ ...k, [f.key]: e.target.value }));
                    if (fieldErrors[f.key]) setFieldErrors((errs) => ({ ...errs, [f.key]: undefined }));
                  }}
                  visibilityToggle={{ visible: shown[f.key], onVisibleChange: (v) => setShown((s) => ({ ...s, [f.key]: v })) }}
                />
                {fieldErrors[f.key] && (
                  <div data-testid={`payos-${f.key}-error`} style={{ color: palette.error.text, fontSize: 12, marginTop: 4 }}>
                    {fieldErrors[f.key]}
                  </div>
                )}
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <ActionButton type="primary" icon={<Save size={14} />} loading={busy} data-testid="payos-save" onClick={() => void handleSave()}>
                {isLinked ? "Cập nhật khoá" : "Lưu và liên kết"}
              </ActionButton>
              {isLinked && (
                <ActionButton icon={<Link2Off size={14} />} disabled={busy} data-testid="payos-unlink" onClick={handleUnlink}>
                  Gỡ liên kết
                </ActionButton>
              )}
            </div>
          </>
        ) : null}
      </Card>
    </div>
  );
}
