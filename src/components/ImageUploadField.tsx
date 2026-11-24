import { useEffect, useState } from "react";
import { App, Input } from "antd";
import { ImageOff, Upload } from "lucide-react";
import ActionButton from "../plan/ActionButton";
import { palette } from "../theme";

/** Định dạng và dung lượng BE chấp nhận cho ảnh menu (món, topping, combo): `menu-image.ts`. */
export const MENU_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MENU_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** Ảnh thu nhỏ; ảnh lỗi hoặc chưa có thì hiện biểu tượng mặc định. */
export function ImageThumb({ url, size, testId = "thumb" }: { url: string | null; size: number; testId?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  const box = { width: size, height: size, borderRadius: 8, background: palette.paper, display: "grid", placeItems: "center", overflow: "hidden", flexShrink: 0 } as const;
  return (
    <div style={box} data-testid={failed || !url ? `${testId}-fallback` : `${testId}-image`}>
      {url && !failed ? (
        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setFailed(true)} />
      ) : (
        <ImageOff size={Math.round(size / 2.4)} color={palette.textSubtle} />
      )}
    </div>
  );
}

/**
 * Chọn ảnh từ máy (giống phần ảnh món): xem trước ngay, ảnh chỉ được tải lên khi nơi gọi bấm Lưu.
 * `url`/`onUrlChange` có mặt thì hiện thêm ô dán URL (bị khoá khi đã chọn tệp).
 */
export default function ImageUploadField({
  label,
  file,
  onFileChange,
  currentUrl,
  url,
  onUrlChange,
  hint,
}: {
  /** Tên trường, dùng làm nhãn truy cập của ô chọn tệp (vd. "Ảnh topping"). */
  label: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  /** Ảnh đã lưu, hiện khi chưa chọn tệp mới và không có ô URL. */
  currentUrl?: string | null;
  url?: string;
  onUrlChange?: (value: string) => void;
  hint: string;
}) {
  const { message } = App.useApp();
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const choose = (picked: File | undefined) => {
    if (!picked) return;
    if (!(MENU_IMAGE_TYPES as readonly string[]).includes(picked.type)) {
      message.error("Chỉ chọn ảnh JPEG, PNG hoặc WebP");
      return;
    }
    if (picked.size > MENU_IMAGE_MAX_BYTES) {
      message.error("Ảnh không được vượt quá 5 MB");
      return;
    }
    onFileChange(picked);
  };

  const shown = preview || (onUrlChange ? url?.trim() : currentUrl) || null;

  return (
    <>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <ImageThumb url={shown} size={56} testId="upload-thumb" />
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", border: `1px solid ${palette.textSubtle}`, borderRadius: 8, cursor: "pointer" }}>
          <Upload size={15} /> {file ? "Đổi ảnh" : "Tải ảnh từ máy"}
          <input
            type="file"
            aria-label={label}
            accept={MENU_IMAGE_TYPES.join(",")}
            style={{ display: "none" }}
            onChange={(e) => {
              choose(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        {file && <ActionButton size="small" onClick={() => onFileChange(null)}>Bỏ chọn</ActionButton>}
      </div>
      <div style={{ fontSize: 12, color: palette.textSubtle, marginTop: 6 }}>{hint}</div>
      {onUrlChange && (
        <Input value={url} maxLength={500} disabled={!!file} onChange={(e) => onUrlChange(e.target.value)} placeholder="Hoặc dán URL ảnh https://…" style={{ marginTop: 8 }} />
      )}
    </>
  );
}
