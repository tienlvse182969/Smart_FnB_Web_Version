import { InputNumber, type InputNumberProps } from "antd";

/** Tối đa của BE cho mọi giá menu (DTO `@Max(99999999999)`). */
export const MAX_MONEY = 99_999_999_999;

/** 25000 → "25.000". */
export const formatMoneyInput = (value: string | number | undefined): string =>
  String(value ?? "").replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");

type Props = Omit<InputNumberProps<number>, "formatter" | "parser" | "precision" | "controls">;

/**
 * Ô nhập tiền dùng chung (BR-19): số nguyên đồng, hiển thị dạng 25.000, chặn ký tự không phải chữ số (nên không nhập được số âm hay
 * số thập phân), mặc định `min` 0. Client chỉ báo lỗi sớm; BE kiểm lại.
 */
export default function MoneyInput({ min = 0, max = MAX_MONEY, step = 1000, onKeyDown, style, ...rest }: Props) {
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
      parser={(value) => Number.parseInt(value?.replace(/\D/g, "") ?? "", 10)}
      onKeyDown={(event) => {
        // Cho phép phím điều khiển (Backspace, Tab, mũi tên, Ctrl+V…); chặn mọi ký tự in được không phải chữ số.
        if (event.key.length === 1 && !/\d/.test(event.key) && !event.ctrlKey && !event.metaKey) event.preventDefault();
        onKeyDown?.(event);
      }}
    />
  );
}
