import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import PairingCodeInput from "./PairingCodeInput";

function Harness({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <PairingCodeInput value={value} onChange={setValue} />
      <output data-testid="value">{value}</output>
    </>
  );
}

const digit = (i: number) => screen.getByTestId(`pair-digit-${i}`) as HTMLInputElement;
const value = () => screen.getByTestId("value").textContent;

describe("PairingCodeInput (mã ghép 6 số)", () => {
  it("có đúng 6 ô; gõ từng số thì điền và nhảy sang ô kế", () => {
    render(<Harness />);
    expect(screen.getAllByLabelText(/Chữ số \d của mã ghép/)).toHaveLength(6);
    fireEvent.change(digit(0), { target: { value: "1" } });
    expect(value()).toBe("1");
    expect(document.activeElement).toBe(digit(1));
    fireEvent.change(digit(1), { target: { value: "2" } });
    fireEvent.change(digit(2), { target: { value: "3" } });
    expect(value()).toBe("123");
    expect(digit(0).value).toBe("1");
  });

  it("chỉ nhận chữ số: chữ cái và ký tự khác bị bỏ", () => {
    render(<Harness />);
    fireEvent.change(digit(0), { target: { value: "a" } });
    expect(value()).toBe("");
    fireEvent.change(digit(0), { target: { value: "-" } });
    expect(value()).toBe("");
    fireEvent.change(digit(0), { target: { value: "7" } });
    expect(value()).toBe("7");
  });

  it("dán cả mã (kể cả có khoảng trắng hay chữ) điền đủ 6 ô và cắt thừa", () => {
    render(<Harness />);
    fireEvent.paste(digit(0), { clipboardData: { getData: () => "123 456" } });
    expect(value()).toBe("123456");
    fireEvent.paste(digit(3), { clipboardData: { getData: () => "mã: 98-76-54-32" } });
    expect(value()).toBe("987654");
    fireEvent.paste(digit(0), { clipboardData: { getData: () => "abc" } });
    expect(value()).toBe("987654"); // dán không có số nào thì giữ nguyên
  });

  it("Backspace ở ô trống lùi về ô trước và xoá số ở đó; xoá ô đang có số", () => {
    render(<Harness initial="12" />);
    fireEvent.keyDown(digit(2), { key: "Backspace" });
    expect(value()).toBe("1");
    expect(document.activeElement).toBe(digit(1));
    fireEvent.change(digit(0), { target: { value: "" } });
    expect(value()).toBe("");
  });

  it("ô đã có số: gõ số mới thay thế, không quá 6 số", () => {
    render(<Harness initial="123456" />);
    fireEvent.change(digit(5), { target: { value: "9" } });
    expect(value()).toBe("123459");
    fireEvent.change(digit(5), { target: { value: "98" } });
    expect(value()).toBe("123459");
  });
});
