import { useEffect, useRef, useState } from "react";
import { App, Button, Card, ColorPicker, Input } from "antd";
import { ImageUp, RotateCcw, Save, Send, Ticket } from "lucide-react";
import { showApiError } from "../../api";
import { SectionTitle } from "../../components/bits";
import ActionButton from "../../plan/ActionButton";
import FeatureGate from "../../plan/FeatureGate";
import { useAppStore } from "../../store";
import {
  BRAND_COLOR_PRESETS,
  PLATFORM_BRAND,
  contrastRatio,
  isDarkEnoughForWhiteText,
  palette,
  pickReadableTextColor,
} from "../../theme";

const MAX_LOGO_BYTES = 1024 * 1024; // 1MB
const ACCEPTED_TYPES = ["image/png", "image/jpeg"];
const MAX_NAME_LENGTH = 50;

/**
 * Nhận diện thương hiệu (mục 10, BR-41→BR-44): chỉ Owner sửa được, áp cho
 * mọi tài khoản thuộc doanh nghiệp. Màu trạng thái giữ nguyên (BR-42), Admin
 * và trang đăng nhập không đổi (BR-44, CC-04).
 */
export default function Branding() {
  return (
    <FeatureGate feature="branding">
      <BrandingForm />
    </FeatureGate>
  );
}

function BrandingForm() {
  const { message } = App.useApp();
  const tenantBranding = useAppStore((s) => s.tenantBranding);
  const updateBranding = useAppStore((s) => s.updateBranding);
  const resetBranding = useAppStore((s) => s.resetBranding);

  const [displayName, setDisplayName] = useState(tenantBranding?.displayName ?? "");
  const [primaryColor, setPrimaryColor] = useState(tenantBranding?.primaryColor ?? PLATFORM_BRAND.primary);
  const [accentColor, setAccentColor] = useState(tenantBranding?.accentColor ?? PLATFORM_BRAND.accent);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(tenantBranding?.logoUrl);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!tenantBranding) return;
    setDisplayName(tenantBranding.displayName ?? "");
    setPrimaryColor(tenantBranding.primaryColor);
    setAccentColor(tenantBranding.accentColor);
    setLogoUrl(tenantBranding.logoUrl);
  }, [tenantBranding?.primaryColor, tenantBranding?.accentColor, tenantBranding?.displayName, tenantBranding?.logoUrl]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      message.error("Chỉ nhận file PNG hoặc JPG — giữ nguyên logo cũ");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      message.error("Ảnh vượt quá 1MB — giữ nguyên logo cũ");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(reader.result as string);
    reader.onerror = () => message.error("Không đọc được ảnh — giữ nguyên logo cũ");
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (displayName.length > MAX_NAME_LENGTH) {
      message.error(`Tên hiển thị tối đa ${MAX_NAME_LENGTH} ký tự`);
      return;
    }
    setSaving(true);
    try {
      // BR-43: cảnh báo Owner nếu hệ thống phải tự đổi màu chữ do tương phản thấp.
      const willUseBlackText = !isDarkEnoughForWhiteText(primaryColor);
      await updateBranding({ primaryColor, accentColor, displayName: displayName.trim() }); // logo (tệp) đi qua `logoFile` ở bước màn hình kế tiếp
      if (willUseBlackText) {
        message.warning(
          `Màu chủ đạo có độ tương phản thấp với chữ trắng (tỷ lệ ${contrastRatio(primaryColor, PLATFORM_BRAND.primaryContrast).toFixed(1)}:1) — đã tự chuyển chữ trên nút chính sang màu đen để dễ đọc (BR-43).`,
          6
        );
      } else {
        message.success("Đã lưu nhận diện — áp dụng ngay cho mọi tài khoản trong chuỗi");
      }
    } catch (err) {
      showApiError(message.error, err, "Không lưu được");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await resetBranding();
      message.success("Đã khôi phục theme mặc định của nền tảng");
    } catch (err) {
      showApiError(message.error, err, "Không khôi phục được");
    } finally {
      setSaving(false);
    }
  };

  const textOnPrimary = pickReadableTextColor(primaryColor);

  return (
    <div>
      <SectionTitle
        title="Nhận diện thương hiệu"
        sub="Áp dụng cho web Owner và Branch Manager, màn hình phía khách, màn hình gọi số, bill và phiếu số của chuỗi (BR-41)"
      />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 20, alignItems: "start" }}>
        {/* Form */}
        <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 22 } }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
            {tenantBranding?.isCustom ? "Đang dùng nhận diện riêng" : "Đang dùng theme mặc định"}
          </div>
          <div style={{ fontSize: 12.5, color: palette.textMuted, marginBottom: 20 }}>
            {tenantBranding?.isCustom ? "Màu, logo và tên hiển thị của chuỗi" : "Trắng — xám — đen giống hệt Platform Admin"}
          </div>

          <Field label={`Tên hiển thị (tối đa ${MAX_NAME_LENGTH} ký tự)`}>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={MAX_NAME_LENGTH}
              placeholder="VD: Cơm Tấm Sài Gòn"
              showCount
            />
          </Field>

          <Field label="Logo (PNG/JPG, tối đa 1MB)">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: 12, background: palette.paper, display: "grid", placeItems: "center", overflow: "hidden", flexShrink: 0 }}>
                {logoUrl ? (
                  <img src={logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <ImageUp size={22} color={palette.textSubtle} />
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" onChange={handleLogoChange} style={{ display: "none" }} />
              <ActionButton icon={<ImageUp size={14} />} onClick={() => fileInputRef.current?.click()}>
                Tải logo
              </ActionButton>
            </div>
          </Field>

          <Field label="Màu chủ đạo">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              {BRAND_COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => setPrimaryColor(c)}
                  title={c}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: c,
                    border: c.toLowerCase() === primaryColor.toLowerCase() ? `2px solid ${palette.ink}` : "1px solid var(--ant-color-border)",
                    outline: c.toLowerCase() === primaryColor.toLowerCase() ? `2px solid ${palette.surface}` : "none",
                    outlineOffset: -4,
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
            <ColorPicker value={primaryColor} onChangeComplete={(c) => setPrimaryColor(c.toHexString())} showText />
          </Field>

          <Field label="Màu nhấn">
            <ColorPicker value={accentColor} onChangeComplete={(c) => setAccentColor(c.toHexString())} showText />
          </Field>

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <ActionButton type="primary" icon={<Save size={14} />} loading={saving} onClick={handleSave}>
              Lưu nhận diện
            </ActionButton>
            <ActionButton icon={<RotateCcw size={14} />} loading={saving} onClick={handleReset}>
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
              <LogoDot logoUrl={logoUrl} primary={primaryColor} onPrimary={textOnPrimary} />
              <span style={{ color: textOnPrimary, fontSize: 13, fontWeight: 700 }}>{displayName || "Tên chuỗi"}</span>
            </div>
            <div style={{ padding: "10px 16px", fontSize: 11.5, color: palette.textMuted }}>Header web Branch Manager</div>
          </Card>

          {/* Màn hình phía khách */}
          <Card size="small" style={{ borderRadius: 12 }} styles={{ body: { padding: 14 } }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <LogoDot logoUrl={logoUrl} primary={primaryColor} onPrimary={textOnPrimary} dark />
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
                <LogoDot logoUrl={logoUrl} primary={primaryColor} onPrimary={textOnPrimary} dark small />
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
              <LogoDot logoUrl={logoUrl} primary={primaryColor} onPrimary={textOnPrimary} />
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
