import { InputNumber, type InputNumberProps } from "antd";
import { MAX_MONEY, formatMoneyInput, parseMoneyText, sanitizeMoneyDigits } from "../lib/money";

export { MAX_MONEY, formatMoneyInput };

type Props = Omit<InputNumberProps<number>, "formatter" | "parser" | "precision" | "controls">;

/**
 * Ô nhập tiền dùng chung (BR-19, BR-84): số nguyên đồng, hiển thị dạng 25.000, không nhập được số âm hay số lẻ, mặc định `min` 0.
 * - Gõ: chặn mọi ký tự in được không phải chữ số.
 * - Dán: đoạn có phần thập phân hoặc dấu âm ("25,5", "1.5", "-1000") bị từ chối nguyên đoạn, không bị đọc nhầm thành số khác.
 * Quy tắc đọc/kiểm nằm ở `lib/money.ts`. Client chỉ báo lỗi sớm; BE kiểm lại.
 */
export default function MoneyInput({ min = 0, max = MAX_MONEY, step = 1000, onKeyDown, onPaste, style, ...rest }: Props) {
  return (
    <InputNumber<number>
      {...rest}
      min={min}
      max={max}
      step={step}
      precision={0}
      inputMode="numeric"
      style={{ width: "100%", ...style }}
      formatter={(value) => formatMoneyInput(value)}
      parser={(value) => Number.parseInt(sanitizeMoneyDigits(value ?? ""), 10)}
      onKeyDown={(event) => {
        // Cho phép phím điều khiển (Backspace, Tab, mũi tên, Ctrl+V…); chặn mọi ký tự in được không phải chữ số.
        if (event.key.length === 1 && !/\d/.test(event.key) && !event.ctrlKey && !event.metaKey) event.preventDefault();
        onKeyDown?.(event);
      }}
      onPaste={(event) => {
        const pasted = event.clipboardData.getData("text");
        if (pasted.trim() !== "" && parseMoneyText(pasted) === null) event.preventDefault();
        onPaste?.(event);
      }}
    />
  );
}
