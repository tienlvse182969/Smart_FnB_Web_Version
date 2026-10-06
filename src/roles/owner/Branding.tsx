import { useEffect, useRef, useState } from "react";
import { App, Card, ColorPicker, Input } from "antd";
import { ImageUp, Lock, RotateCcw, Save, Send, Ticket } from "lucide-react";
import { showApiError } from "../../api";
import { validateLogoFile, MAX_DISPLAY_NAME_LENGTH } from "../../api/modules/branding/validate";
import { SectionTitle } from "../../components/bits";
import { useDirtyGuard } from "../../lib/dirtyGuard";
import ActionButton from "../../plan/ActionButton";
import { usePlan } from "../../plan/usePlan";
import { useAppStore } from "../../store";
import {
  BRAND_COLOR_PRESETS,
  PLATFORM_BRAND,
  contrastRatio,
  isDarkEnoughForWhiteText,
  palette,
  pickReadableTextColor,
} from "../../theme";

const sameColor = (a: string | undefined, b: string | undefined) => (a ?? "").toLowerCase() === (b ?? "").toLowerCase();

/**
 * Nhận diện thương hiệu (mục 10, BR-41→BR-44): chỉ Owner sửa được, áp cho mọi tài khoản thuộc doanh nghiệp. Màu trạng thái giữ
 * nguyên (BR-42), Admin, trang đăng nhập và /setup-password không đổi (BR-44, CC-04).
 *
 * - Gói không có nhận diện (Cơ bản): màn vẫn hiện nhưng KHOÁ mọi ô và nút, ghi gói cần nâng; không gọi PUT/POST/DELETE (quyết định 24;
 *   BE chưa chặn, #33).
 * - Chọn logo chỉ xem trước tại chỗ (object URL); tệp chỉ tải lên khi bấm Lưu (quyết định 10, 25).
 */
export default function Branding() {
  const { message, modal } = App.useApp();
  const { hasFeature, requiredTierLabel } = usePlan();
  const locked = !hasFeature("branding");
  const tenantBranding = useAppStore((s) => s.tenantBranding);
  const updateBranding = useAppStore((s) => s.updateBranding);
  const resetBranding = useAppStore((s) => s.resetBranding);
  const reloadBranding = useAppStore((s) => s.reloadBranding);

  const [displayName, setDisplayName] = useState(tenantBranding?.displayName ?? "");
  const [primaryColor, setPrimaryColor] = useState(tenantBranding?.primaryColor ?? PLATFORM_BRAND.primary);
  const [accentColor, setAccentColor] = useState(tenantBranding?.accentColor ?? PLATFORM_BRAND.accent);
  /** Logo vừa chọn, CHƯA tải lên. */
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | undefined>(undefined);

  const savedName = tenantBranding?.displayName ?? "";
  const savedPrimary = tenantBranding?.primaryColor ?? PLATFORM_BRAND.primary;
  const savedAccent = tenantBranding?.accentColor ?? PLATFORM_BRAND.accent;
  const savedLogo = tenantBranding?.logoUrl;
  const shownLogo = logoPreview ?? savedLogo;

  const clearLocalLogo = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = undefined;
    setLogoPreview(undefined);
    setLogoFile(null);
  };

  // Bản đã lưu đổi (sau khi lưu, khôi phục, nạp lại hoặc tab khác lưu) thì ô theo bản mới và bỏ logo đang chờ.
  useEffect(() => {
    if (!tenantBranding) return;
    setDisplayName(tenantBranding.displayName ?? "");
    setPrimaryColor(tenantBranding.primaryColor);
    setAccentColor(tenantBranding.accentColor);
    clearLocalLogo();
  }, [tenantBranding?.primaryColor, tenantBranding?.accentColor, tenantBranding?.displayName, tenantBranding?.logoUrl]);

  // Thu hồi object URL khi rời màn.
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  const dirty = displayName !== savedName || !sameColor(primaryColor, savedPrimary) || !sameColor(accentColor, savedAccent) || !!logoFile;
  // Form nằm ngay trong trang: đăng ký "đang nhập dở" để rời màn / Thử lại được hỏi trước.
  useDirtyGuard(dirty && !locked);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const problem = validateLogoFile(file);
    if (problem) {
      message.error(`${problem} — giữ nguyên logo hiện tại`);
      return;
    }
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setLogoFile(file);
    setLogoPreview(url);
  };

  const handleSave = async () => {
    if (locked) return;
    if (displayName.trim().length > MAX_DISPLAY_NAME_LENGTH) {
      message.error(`Tên hiển thị tối đa ${MAX_DISPLAY_NAME_LENGTH} ký tự`);
      return;
    }
    // Chỉ gửi trường ĐÃ ĐỔI: không đổi gì thì không có lệnh nào (real: chỉ logo = 1 lệnh, chỉ tên/màu = 1 lệnh, cả hai = 2 lệnh).
    const input = {
      ...(displayName.trim() !== savedName && { displayName: displayName.trim() }),
      ...(!sameColor(primaryColor, savedPrimary) && { primaryColor }),
      ...(!sameColor(accentColor, savedAccent) && { accentColor }),
      ...(logoFile && { logoFile }),
    };
    if (Object.keys(input).length === 0) {
      message.info("Chưa có thay đổi nào để lưu");
      return;
    }
    setSaving(true);
    try {
      // BR-43: cảnh báo Owner nếu hệ thống phải tự đổi màu chữ do tương phản thấp.
      const willUseBlackText = !isDarkEnoughForWhiteText(primaryColor);
      await updateBranding(input);
      clearLocalLogo();
      if (willUseBlackText) {
        message.warning(
          `Màu chủ đạo có độ tương phản thấp với chữ trắng (tỷ lệ ${contrastRatio(primaryColor, PLATFORM_BRAND.primaryContrast).toFixed(1)}:1) — đã tự chuyển chữ trên nút chính sang màu đen để dễ đọc (BR-43).`,
          6,
        );
      } else {
        message.success("Đã lưu nhận diện — áp dụng ngay cho mọi tài khoản trong chuỗi");
      }
    } catch (err) {
      showApiError(message.error, err, "Không lưu được");
      // Lỗi giữa chừng (ví dụ logo đã tải mà PUT lỗi): nạp lại từ BE để màn phản ánh đúng những gì đã lưu.
      await reloadBranding().catch(() => undefined);
    } finally {
      setSaving(false);
    }
  };

  const doReset = async () => {
    setSaving(true);
    try {
      await resetBranding();
      clearLocalLogo();
      message.success("Đã khôi phục theme mặc định của nền tảng");
    } catch (err) {
      showApiError(message.error, err, "Không khôi phục được");
      await reloadBranding().catch(() => undefined);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (locked) return;
    modal.confirm({
      title: "Khôi phục nhận diện mặc định?",
      content: (
        <div data-testid="branding-reset-confirm">
          Tên hiển thị, màu chủ đạo, màu nhấn và logo của chuỗi sẽ về mặc định của nền tảng. Logo đã tải lên bị xoá. Mọi tài khoản trong chuỗi thấy giao diện mặc định ở lần điều hướng hoặc đăng nhập kế tiếp.
        </div>
      ),
      okText: "Khôi phục",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: doReset,
    });
  };

  const textOnPrimary = pickReadableTextColor(primaryColor);

  return (
    <div>
      <SectionTitle
        title="Nhận diện thương hiệu"
        sub="Áp dụng cho web Owner và Branch Manager, màn hình phía khách, màn hình gọi số, bill và phiếu số của chuỗi (BR-41)"
      />
      {locked && (
        <div
          data-testid="branding-plan-lock"
          style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: palette.warning.text, background: palette.paperSubtle, borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}
        >
          <Lock size={15} /> Cần gói {requiredTierLabel("branding") ?? "Tiêu chuẩn"} trở lên để tuỳ biến nhận diện. Bạn vẫn xem được cấu hình hiện tại; nâng gói để chỉnh sửa.
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 20, alignItems: "start" }}>
        {/* Form */}
        <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 22 } }}>
          <div data-testid="branding-status" style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
            {tenantBranding?.isCustom ? "Đang dùng nhận diện riêng" : "Đang dùng theme mặc định"}
          </div>
          <div style={{ fontSize: 12.5, color: palette.textMuted, marginBottom: 20 }}>
            {tenantBranding?.isCustom ? "Màu, logo và tên hiển thị của chuỗi" : "Trắng — xám — đen giống hệt Platform Admin"}
          </div>

          <Field label={`Tên hiển thị (tối đa ${MAX_DISPLAY_NAME_LENGTH} ký tự)`}>
            <Input
              data-testid="branding-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={locked}
              placeholder="VD: Cơm Tấm Sài Gòn"
              showCount
            />
          </Field>

          <Field label="Logo (PNG/JPG, tối đa 1MB)">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: 12, background: palette.paper, display: "grid", placeItems: "center", overflow: "hidden", flexShrink: 0 }}>
                {shownLogo ? (
                  <img data-testid="branding-logo-preview" src={shownLogo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <ImageUp size={22} color={palette.textSubtle} />
                )}
              </div>
              <input
                ref={fileInputRef}
                data-testid="branding-logo-input"
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleLogoChange}
                disabled={locked}
                style={{ display: "none" }}
              />
              <ActionButton icon={<ImageUp size={14} />} disabled={locked} data-testid="branding-logo-pick" onClick={() => fileInputRef.current?.click()}>
                Chọn logo
              </ActionButton>
              {logoFile && (
                <span data-testid="branding-logo-pending" style={{ fontSize: 12, color: palette.textMuted }}>
                  {logoFile.name} — chưa tải lên, bấm Lưu để tải
                </span>
              )}
            </div>
          </Field>

          <Field label="Màu chủ đạo">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              {BRAND_COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  data-testid="branding-preset"
                  data-color={c}
                  disabled={locked}
                  onClick={() => setPrimaryColor(c)}
                  title={c}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: c,
                    border: sameColor(c, primaryColor) ? `2px solid ${palette.ink}` : "1px solid var(--ant-color-border)",
                    outline: sameColor(c, primaryColor) ? `2px solid ${palette.surface}` : "none",
                    outlineOffset: -4,
                    cursor: locked ? "not-allowed" : "pointer",
                    opacity: locked ? 0.5 : 1,
                  }}
                />
              ))}
            </div>
            <ColorPicker value={primaryColor} disabled={locked} onChangeComplete={(c) => setPrimaryColor(c.toHexString())} showText />
          </Field>

          <Field label="Màu nhấn">
            <ColorPicker value={accentColor} disabled={locked} onChangeComplete={(c) => setAccentColor(c.toHexString())} showText />
          </Field>

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <ActionButton type="primary" icon={<Save size={14} />} loading={saving} disabled={locked} data-testid="branding-save" onClick={handleSave}>
              Lưu nhận diện
            </ActionButton>
            <ActionButton icon={<RotateCcw size={14} />} loading={saving} disabled={locked} data-testid="branding-reset" onClick={handleReset}>
              Khôi phục mặc định
            </ActionButton>
          </div>
        </Card>

        {/* Live preview — chưa lưu, đổi ngay theo lựa chọn hiện tại */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <PreviewLabel text="Xem trước — chưa lưu" />

          {/* Header web Manager */}
          <Card size="small" style={{ borderRadius: 12, overflow: "hidden" }} styles={{ body: { padding: 0 } }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: primaryColor }}>
              <LogoDot logoUrl={shownLogo} primary={primaryColor} onPrimary={textOnPrimary} />
              <span style={{ color: textOnPrimary, fontSize: 13, fontWeight: 700 }}>{displayName || "Tên chuỗi"}</span>
            </div>
            <div style={{ padding: "10px 16px", fontSize: 11.5, color: palette.textMuted }}>Header web Branch Manager</div>
          </Card>

          {/* Màn hình phía khách */}
          <Card size="small" style={{ borderRadius: 12 }} styles={{ body: { padding: 14 } }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <LogoDot logoUrl={shownLogo} primary={primaryColor} onPrimary={textOnPrimary} dark />
              <span style={{ fontSize: 13, fontWeight: 700 }}>{displayName || "Tên chuỗi"}</span>
            </div>
            <div style={{ fontSize: 11, color: palette.textSubtle, marginBottom: 8 }}>Màn hình phía khách · Quét mã để thanh toán</div>
            <button
              disabled
              style={{
                width: "100%",
                padding: "8px 0",
                borderRadius: 8,
                border: "none",
                background: primaryColor,
                color: textOnPrimary,
                fontSize: 12.5,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Send size={13} /> Thanh toán
            </button>
          </Card>

          {/* Bill in */}
          <Card size="small" style={{ borderRadius: 12 }} styles={{ body: { padding: 14 } }}>
            <div style={{ fontSize: 11, color: palette.textSubtle, marginBottom: 8 }}>Đầu bill in</div>
            <div style={{ border: "1px dashed var(--ant-color-border)", borderRadius: 8, padding: 12, background: palette.surface }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, borderBottom: `2px solid ${primaryColor}`, paddingBottom: 8, marginBottom: 8 }}>
                <LogoDot logoUrl={shownLogo} primary={primaryColor} onPrimary={textOnPrimary} dark small />
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{displayName || "Tên chuỗi"}</span>
              </div>
              <div style={{ fontSize: 10.5, color: palette.textSubtle, lineHeight: 1.8 }}>
                Bill HD-000123
                <br />
                Chi nhánh mẫu · 12:30
              </div>
            </div>
          </Card>

          {/* Phiếu số — chỉ logo và thanh tiêu đề đổi màu, trạng thái giữ màu ngữ nghĩa */}
          <Card size="small" style={{ borderRadius: 12, overflow: "hidden" }} styles={{ body: { padding: 0 } }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: primaryColor }}>
              <LogoDot logoUrl={shownLogo} primary={primaryColor} onPrimary={textOnPrimary} />
              <span style={{ color: textOnPrimary, fontSize: 12.5, fontWeight: 700 }}>{displayName || "Tên chuỗi"}</span>
              <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, color: textOnPrimary, fontSize: 11 }}>
                <Ticket size={13} /> Phiếu số
              </span>
            </div>
            <div style={{ padding: "10px 16px", display: "flex", gap: 8 }}>
              <span style={{ fontSize: 10.5, fontWeight: 600, padding: "3px 8px", borderRadius: 999, background: palette.warning.bg, color: palette.warning.text }}>Chờ pha</span>
              <span style={{ fontSize: 10.5, fontWeight: 600, padding: "3px 8px", borderRadius: 999, background: palette.info.bg, color: palette.info.text }}>Đang pha</span>
              <span style={{ fontSize: 10.5, fontWeight: 600, padding: "3px 8px", borderRadius: 999, background: palette.success.bg, color: palette.success.text }}>Sẵn sàng</span>
            </div>
            <div style={{ padding: "0 16px 10px", fontSize: 10.5, color: palette.textSubtle }}>
              Chỉ logo và thanh tiêu đề đổi màu — màu trạng thái giữ cố định (BR-42)
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function LogoDot({
  logoUrl,
  primary,
  onPrimary,
  dark,
  small,
}: {
  logoUrl?: string;
  /** Màu chủ đạo đang chọn (chưa lưu). */
  primary: string;
  /** Màu chữ trên nền `primary`. */
  onPrimary: string;
  dark?: boolean;
  small?: boolean;
}) {
  const size = small ? 22 : 28;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 7,
        background: dark ? primary : palette.surface,
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {logoUrl ? (
        <img src={logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span style={{ fontSize: small ? 10 : 12, fontWeight: 700, color: dark ? onPrimary : primary }}>F&amp;B</span>
      )}
    </div>
  );
}

function PreviewLabel({ text }: { text: string }) {
  return <div style={{ fontSize: 12.5, fontWeight: 600, color: palette.textMuted }}>{text}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12.5, color: palette.textMuted, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}
