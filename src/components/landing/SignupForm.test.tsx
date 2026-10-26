import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  submitRegistration: vi.fn(),
}));

vi.mock("../../api", () => ({
  adminApi: { submitRegistration: api.submitRegistration },
  showApiError: (show: (text: string) => void, _error: unknown, fallback: string) => show(fallback),
}));

import SignupForm from "./SignupForm";

describe("SignupForm", () => {
  beforeEach(() => {
    api.submitRegistration.mockReset().mockResolvedValue({ id: "application-1" });
  });

  it("gửi hồ sơ không cần chọn gói và thông báo TRIAL 14 ngày sau duyệt", async () => {
    render(<SignupForm />);

    expect(screen.queryByLabelText("Gói dịch vụ mong muốn")).toBeNull();
    expect(screen.getByText(/14 ngày dùng thử miễn phí/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Tên doanh nghiệp"), { target: { value: "Công ty An Nhiên" } });
    fireEvent.change(screen.getByLabelText("Mã số thuế"), { target: { value: "0312345678" } });
    fireEvent.change(screen.getByLabelText("Địa chỉ trụ sở"), { target: { value: "1 Nguyễn Huệ" } });
    fireEvent.change(screen.getByLabelText("Họ tên người đại diện"), { target: { value: "Nguyễn Văn An" } });
    fireEvent.change(screen.getByLabelText("Email người đại diện"), { target: { value: "an@example.com" } });
    fireEvent.change(screen.getByLabelText("Số điện thoại người đại diện"), { target: { value: "0901234567" } });
    fireEvent.click(screen.getByRole("button", { name: "Nộp hồ sơ đăng ký" }));

    await waitFor(() =>
      expect(api.submitRegistration).toHaveBeenCalledWith({
        businessName: "Công ty An Nhiên",
        taxCode: "0312345678",
        headquartersAddress: "1 Nguyễn Huệ",
        representativeName: "Nguyễn Văn An",
        representativeEmail: "an@example.com",
        representativePhone: "0901234567",
      }),
    );
    expect(await screen.findByText("Hồ sơ của bạn đang chờ duyệt")).toBeTruthy();
    expect(screen.getByText(/email đặt mật khẩu/)).toBeTruthy();
  });
});
