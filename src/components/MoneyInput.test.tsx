import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import MoneyInput from "./MoneyInput";

afterEach(cleanup);

function Harness({ initial = 0 }: { initial?: number | null }) {
  const [value, setValue] = useState<number | null>(initial);
  return (
    <>
      <MoneyInput data-testid="money" value={value} onChange={setValue} />
      <output data-testid="out">{value === null ? "null" : String(value)}</output>
    </>
  );
}

const input = () => screen.getByTestId("money") as HTMLInputElement;
const out = () => screen.getByTestId("out").textContent;

describe("MoneyInput — ô nhập tiền dùng chung (BR-19)", () => {
  it("hiển thị ngăn nghìn kiểu Việt Nam", () => {
    render(<Harness initial={1250000} />);
    expect(input().value).toBe("1.250.000");
  });

  it("gõ ký tự không phải chữ số (dấu chấm, phẩy, trừ, chữ) bị chặn", () => {
    render(<Harness initial={1000} />);
    for (const key of [".", ",", "-", "e", "a", "+"]) {
      // fireEvent trả false khi sự kiện bị preventDefault.
      expect(fireEvent.keyDown(input(), { key }), `phím ${key}`).toBe(false);
    }
  });

  it("gõ chữ số và phím điều khiển vẫn đi qua", () => {
    render(<Harness initial={1000} />);
    expect(fireEvent.keyDown(input(), { key: "5" })).toBe(true);
    expect(fireEvent.keyDown(input(), { key: "Backspace" })).toBe(true);
    expect(fireEvent.keyDown(input(), { key: "Tab" })).toBe(true);
    expect(fireEvent.keyDown(input(), { key: "v", ctrlKey: true })).toBe(true);
  });

  it("dán số lẻ hoặc số âm bị từ chối nguyên đoạn (không đọc nhầm thành số khác)", () => {
    render(<Harness initial={1000} />);
    const paste = (text: string) => fireEvent.paste(input(), { clipboardData: { getData: () => text } });
    for (const text of ["25,5", "1.5", "25.50", "-1000", "abc"]) expect(paste(text), text).toBe(false);
  });

  it("dán số nguyên (có hoặc không dấu ngăn nghìn) được chấp nhận", () => {
    render(<Harness initial={1000} />);
    const paste = (text: string) => fireEvent.paste(input(), { clipboardData: { getData: () => text } });
    expect(paste("25000")).toBe(true);
    expect(paste("25.000")).toBe(true);
    expect(paste("1.250.000 ₫")).toBe(true);
  });

  it("nhập 25.000 trong ô thì giá trị là 25000 (số nguyên)", () => {
    render(<Harness initial={0} />);
    fireEvent.change(input(), { target: { value: "25.000" } });
    expect(out()).toBe("25000");
  });

  it("giá trị lẻ từ ngoài đưa vào được làm tròn về số nguyên, không âm", () => {
    render(<Harness initial={0} />);
    fireEvent.change(input(), { target: { value: "-5" } });
    expect(Number(out())).toBeGreaterThanOrEqual(0);
    fireEvent.change(input(), { target: { value: "1.234" } });
    expect(Number.isInteger(Number(out()))).toBe(true);
  });
});
