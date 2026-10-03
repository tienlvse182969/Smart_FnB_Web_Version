import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { PAIRING_CODE_LENGTH, extractPairingCode } from "../api/modules/stations/pairing";
import { palette } from "../theme";

/**
 * Nhập mã ghép 6 số: sáu ô, chỉ nhận chữ số, tự nhảy ô, Backspace lùi ô, dán cả mã ("123 456", "mã: 123456") là điền đủ.
 * `value` là chuỗi chữ số 0–6 ký tự; `onChange` luôn nhận chuỗi đã lọc.
 */
export default function PairingCodeInput({ value, onChange, disabled }: { value: string; onChange: (code: string) => void; disabled?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const focus = (i: number) => refs.current[Math.max(0, Math.min(PAIRING_CODE_LENGTH - 1, i))]?.focus();
  const digits = Array.from({ length: PAIRING_CODE_LENGTH }, (_, i) => value[i] ?? "");

  const setFrom = (index: number, typed: string) => {
    const incoming = extractPairingCode(typed);
    if (!incoming) {
      // Xoá ô hiện tại (ký tự không phải số bị bỏ qua, nên chỉ xoá khi người dùng thật sự xoá).
      if (typed === "") onChange((value.slice(0, index) + value.slice(index + 1)).slice(0, PAIRING_CODE_LENGTH));
      return;
    }
    const next = (value.slice(0, index) + incoming + value.slice(index + 1)).slice(0, PAIRING_CODE_LENGTH);
    onChange(next);
    focus(Math.min(index + incoming.length, PAIRING_CODE_LENGTH - 1));
  };

  const onKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      e.preventDefault();
      onChange(value.slice(0, index - 1) + value.slice(index));
      focus(index - 1);
    } else if (e.key === "ArrowLeft") focus(index - 1);
    else if (e.key === "ArrowRight") focus(index + 1);
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = extractPairingCode(e.clipboardData.getData("text"));
    if (!pasted) return;
    onChange(pasted);
    focus(pasted.length >= PAIRING_CODE_LENGTH ? PAIRING_CODE_LENGTH - 1 : pasted.length);
  };

  return (
    <div data-testid="pairing-code-input" style={{ display: "flex", gap: 8 }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          data-testid={`pair-digit-${i}`}
          aria-label={`Chữ số ${i + 1} của mã ghép`}
          inputMode="numeric"
          autoComplete="one-time-code"
          disabled={disabled}
          value={d}
          onChange={(e) => setFrom(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
          onFocus={(e) => e.target.select()}
          style={{
            width: 44,
            height: 52,
            textAlign: "center",
            fontSize: 22,
            fontWeight: 600,
            borderRadius: 10,
            border: `1px solid ${d ? palette.brandPrimary : palette.line}`,
            background: palette.surface,
            color: palette.ink,
            outline: "none",
          }}
        />
      ))}
    </div>
  );
}
