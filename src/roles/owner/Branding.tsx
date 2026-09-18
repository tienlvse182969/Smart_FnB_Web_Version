import { useEffect, useRef, useState } from "react";
import { App, Button, Card, ColorPicker, Input } from "antd";
import { ChefHat, ImageUp, RotateCcw, Save, Send } from "lucide-react";
import { SectionTitle } from "../../components/bits";
import { useAppStore } from "../../store";
import { BRAND_COLOR_PRESETS, contrastRatio, ink, pickReadableTextColor } from "../../theme";

const MAX_LOGO_BYTES = 1024 * 1024; // 1MB
const ACCEPTED_TYPES = ["image/png", "image/jpeg"];
const MAX_NAME_LENGTH = 50;

/**
 * Nhận diện thương hiệu (mục 10, BR-28→BR-32): chỉ Owner sửa được, áp cho
 * mọi tài khoản thuộc doanh nghiệp — Branch Manager/Waiter đổi toàn bộ,
 * Kitchen chỉ đổi header/logo (thẻ món giữ nguyên STATUS_COLORS), Admin
 * không đổi (BR-32).
 */
export default function Branding() {
  const { message } = App.useApp();
  const tenantBranding = useAppStore((s) => s.tenantBranding);
  const updateBranding = useAppStore((s) => s.updateBranding);
  const resetBranding = useAppStore((s) => s.resetBranding);

  const [displayName, setDisplayName] = useState(tenantBranding?.displayName ?? "");
  const [primaryColor, setPrimaryColor] = useState(tenantBranding?.primaryColor ?? ink);
  const [accentColor, setAccentColor] = useState(tenantBranding?.accentColor ?? "#71717a");
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
      // BR-31: cảnh báo Owner nếu hệ thống phải tự đổi màu chữ do tương phản thấp.
      const willUseBlackText = pickReadableTextColor(primaryColor) === "#000000";
      await updateBranding({ primaryColor, accentColor, displayName: displayName.trim(), logoUrl });
      if (willUseBlackText) {
        message.warning(
          `Màu chủ đạo có độ tương phản thấp với chữ trắng (tỷ lệ ${contrastRatio(primaryColor, "#ffffff").toFixed(1)}:1) — đã tự chuyển chữ trên nút chính sang màu đen để dễ đọc (BR-31).`,
          6
        );
      } else {
        message.success("Đã lưu nhận diện — áp dụng ngay cho mọi tài khoản trong chuỗi");
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Không lưu được");
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
      message.error(err instanceof Error ? err.message : "Không khôi phục được");
    } finally {
      setSaving(false);
    }
  };

  const textOnPrimary = pickReadableTextColor(primaryColor);

  return (
    <div>
      <SectionTitle
        title="Nhận diện thương hiệu"
        sub="Áp dụng cho mọi màn hình Owner, Branch Manager, Waiter và đầu màn Kitchen của chuỗi (BR-28/29)"
      />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 20, alignItems: "start" }}>
        {/* Form */}
        <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 22 } }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
            {tenantBranding?.isCustom ? "Đang dùng nhận diện riêng" : "Đang dùng theme mặc định"}
          </div>
          <div style={{ fontSize: 12.5, color: "#71717a", marginBottom: 20 }}>
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
              <div style={{ width: 56, height: 56, borderRadius: 12, background: "#f4f4f5", display: "grid", placeItems: "center", overflow: "hidden", flexShrink: 0 }}>
                {logoUrl ? (
                  <img src={logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <ImageUp size={22} color="#a1a1aa" />
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" onChange={handleLogoChange} style={{ display: "none" }} />
              <Button icon={<ImageUp size={14} />} onClick={() => fileInputRef.current?.click()}>
                Tải logo
              </Button>
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
                    border: c.toLowerCase() === primaryColor.toLowerCase() ? "2px solid #0a0a0a" : "1px solid var(--ant-color-border)",
                    outline: c.toLowerCase() === primaryColor.toLowerCase() ? "2px solid #fff" : "none",
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
            <Button type="primary" icon={<Save size={14} />} loading={saving} onClick={handleSave}>
              Lưu nhận diện
            </Button>
            <Button icon={<RotateCcw size={14} />} loading={saving} onClick={handleReset}>
              Khôi phục mặc định
            </Button>
          </div>
        </Card>

        {/* Live preview — chưa lưu, đổi ngay theo lựa chọn hiện tại */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <PreviewLabel text="Xem trước — chưa lưu" />

          {/* Header web Manager */}
          <Card size="small" style={{ borderRadius: 12, overflow: "hidden" }} styles={{ body: { padding: 0 } }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "#0a0a0a" }}>
              <LogoDot logoUrl={logoUrl} />
              <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{displayName || "Tên chuỗi"}</span>
            </div>
            <div style={{ padding: "10px 16px", fontSize: 11.5, color: "#71717a" }}>Header web Branch Manager</div>
          </Card>

          {/* Waiter tablet order */}
          <Card size="small" style={{ borderRadius: 12 }} styles={{ body: { padding: 14 } }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <LogoDot logoUrl={logoUrl} dark />
              <span style={{ fontSize: 13, fontWeight: 700 }}>{displayName || "Tên chuỗi"}</span>
            </div>
            <div style={{ fontSize: 11, color: "#a1a1aa", marginBottom: 8 }}>Màn order tablet · Waiter</div>
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
              <Send size={13} /> Hoàn tất gọi món
            </button>
          </Card>

          {/* Đầu hoá đơn in */}
          <Card size="small" style={{ borderRadius: 12 }} styles={{ body: { padding: 14 } }}>
            <div style={{ fontSize: 11, color: "#a1a1aa", marginBottom: 8 }}>Đầu hoá đơn in</div>
            <div style={{ border: "1px dashed var(--ant-color-border)", borderRadius: 8, padding: 12, background: "#fff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, borderBottom: `2px solid ${primaryColor}`, paddingBottom: 8, marginBottom: 8 }}>
                <LogoDot logoUrl={logoUrl} dark small />
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{displayName || "Tên chuỗi"}</span>
              </div>
              <div style={{ fontSize: 10.5, color: "#a1a1aa", lineHeight: 1.8 }}>
                Hoá đơn HD-000123
                <br />
                Bàn A1 · 12:30
              </div>
            </div>
          </Card>

          {/* Kitchen — chỉ đổi header/logo, thẻ món giữ nguyên màu ngữ nghĩa */}
          <Card size="small" style={{ borderRadius: 12, overflow: "hidden" }} styles={{ body: { padding: 0 } }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "#0a0a0a" }}>
              <LogoDot logoUrl={logoUrl} />
              <span style={{ color: "#fff", fontSize: 12.5, fontWeight: 700 }}>{displayName || "Tên chuỗi"}</span>
              <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, color: "rgba(255,255,255,0.6)", fontSize: 11 }}>
                <ChefHat size={13} /> Bếp
              </span>
            </div>
            <div style={{ padding: "10px 16px", display: "flex", gap: 8 }}>
              <span style={{ fontSize: 10.5, fontWeight: 600, padding: "3px 8px", borderRadius: 999, background: "#FFFBE6", color: "#D46B08" }}>Chờ</span>
              <span style={{ fontSize: 10.5, fontWeight: 600, padding: "3px 8px", borderRadius: 999, background: "#E6F4FF", color: "#0958D9" }}>Đang làm</span>
              <span style={{ fontSize: 10.5, fontWeight: 600, padding: "3px 8px", borderRadius: 999, background: "#F6FFED", color: "#389E0D" }}>Xong</span>
            </div>
            <div style={{ padding: "0 16px 10px", fontSize: 10.5, color: "#a1a1aa" }}>
              Chỉ header đổi màu — thẻ món giữ màu ngữ nghĩa cố định (BR-30)
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function LogoDot({ logoUrl, dark, small }: { logoUrl?: string; dark?: boolean; small?: boolean }) {
  const size = small ? 22 : 28;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 7,
        background: dark ? "#0a0a0a" : "#fff",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {logoUrl ? (
        <img src={logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span style={{ fontSize: small ? 10 : 12, fontWeight: 700, color: dark ? "#fff" : "#0a0a0a" }}>F&amp;B</span>
      )}
    </div>
  );
}

function PreviewLabel({ text }: { text: string }) {
  return <div style={{ fontSize: 12.5, fontWeight: 600, color: "#71717a" }}>{text}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12.5, color: "#71717a", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}
