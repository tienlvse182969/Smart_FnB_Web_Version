import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App as AntApp } from "antd";
import { ApiError } from "../api/http/errors";
import { authApi } from "../api";
import LoginScreen from "./LoginScreen";

vi.stubGlobal(
  "matchMedia",
  (query: string) => ({ matches: false, media: query, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false }),
);

const openForgot = async () => {
  render(<AntApp><LoginScreen onLogin={() => undefined} /></AntApp>);
  fireEvent.click(screen.getByText("Quên mật khẩu?"));
  return (await screen.findByPlaceholderText("Email tài khoản")) as HTMLInputElement;
};

describe("LoginScreen: Quên mật khẩu (22.8)", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("email hợp lệ được gửi đi (đã gặp lỗi regex mất dấu \\ làm từ chối mọi email)", async () => {
    const send = vi.spyOn(authApi, "requestPasswordReset").mockResolvedValue(undefined as never);
    const input = await openForgot();
    fireEvent.change(input, { target: { value: " Owner.Demo@smartfnb.local " } });
    fireEvent.click(screen.getByText("Gửi yêu cầu"));
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(send).toHaveBeenCalledWith("Owner.Demo@smartfnb.local");
    expect(await screen.findByText("Nếu email đúng, hướng dẫn đặt lại đã được gửi đi.")).toBeTruthy();
  });

  it("email sai định dạng không gọi BE", async () => {
    const send = vi.spyOn(authApi, "requestPasswordReset").mockResolvedValue(undefined as never);
    const input = await openForgot();
    fireEvent.change(input, { target: { value: "khong-hop-le" } });
    fireEvent.click(screen.getByText("Gửi yêu cầu"));
    expect(await screen.findByText("Email không hợp lệ")).toBeTruthy();
    expect(send).not.toHaveBeenCalled();
  });

  it("429 hiện câu chung, không lộ email có tồn tại hay không", async () => {
    vi.spyOn(authApi, "requestPasswordReset").mockRejectedValue(new ApiError(429, "Too many"));
    const input = await openForgot();
    fireEvent.change(input, { target: { value: "a@b.vn" } });
    fireEvent.click(screen.getByText("Gửi yêu cầu"));
    expect(await screen.findByText("Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.")).toBeTruthy();
  });
});
