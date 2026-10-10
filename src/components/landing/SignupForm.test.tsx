import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  loadPublicPlans: vi.fn(),
  submitRegistration: vi.fn(),
}));

vi.mock("../../api", () => ({
  adminApi: { submitRegistration: api.submitRegistration },
  loadPublicPlans: api.loadPublicPlans,
  showApiError: (show: (text: string) => void, _error: unknown, fallback: string) => show(fallback),
}));

import SignupForm from "./SignupForm";

const plan = {
  id: "plan-standard",
  tier: "STANDARD" as const,
  code: "STANDARD",
  name: "Tiêu chuẩn",
  monthlyPrice: 600_000,
  maxBranches: 5,
  maxAccounts: 30,
  features: { branding: true, multiBranchCompare: true, aiAssistant: false },
};

describe("SignupForm", () => {
  beforeEach(() => {
    api.loadPublicPlans.mockReset().mockResolvedValue([plan]);
    api.submitRegistration.mockReset().mockResolvedValue({ id: "application-1" });
  });

  it("tải gói công khai và gửi requestedPlanId cùng hồ sơ", async () => {
    render(<SignupForm />);

    await screen.findByRole("option", { name: /Tiêu chuẩn/ });
    fireEvent.change(screen.getByLabelText("Tên doanh nghiệp"), { target: { value: "Công ty An Nhiên" } });
    fireEvent.change(screen.getByLabelText("Mã số thuế"), { target: { value: "0312345678" } });
    fireEvent.change(screen.getByLabelText("Địa chỉ trụ sở"), { target: { value: "1 Nguyễn Huệ" } });
    fireEvent.change(screen.getByLabelText("Họ tên người đại diện"), { target: { value: "Nguyễn Văn An" } });
    fireEvent.change(screen.getByLabelText("Email người đại diện"), { target: { value: "an@example.com" } });
    fireEvent.change(screen.getByLabelText("Số điện thoại người đại diện"), { target: { value: "0901234567" } });
    fireEvent.change(screen.getByLabelText("Gói dịch vụ mong muốn"), { target: { value: plan.id } });
    fireEvent.click(screen.getByRole("button", { name: "Nộp hồ sơ đăng ký" }));

    await waitFor(() =>
      expect(api.submitRegistration).toHaveBeenCalledWith({
        businessName: "Công ty An Nhiên",
        taxCode: "0312345678",
        headquartersAddress: "1 Nguyễn Huệ",
        representativeName: "Nguyễn Văn An",
        representativeEmail: "an@example.com",
        representativePhone: "0901234567",
        requestedPlanId: plan.id,
      }),
    );
    expect(await screen.findByText("Hồ sơ của bạn đang chờ duyệt")).toBeTruthy();
  });
});
