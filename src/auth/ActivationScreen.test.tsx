import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../api/http/client", () => ({ request: api.request }));

import ActivationScreen from "./ActivationScreen";

function renderActivation() {
  render(<MemoryRouter initialEntries={["/activate?token=test-token"]}><ActivationScreen /></MemoryRouter>);
}

describe("ActivationScreen plan choice", () => {
  beforeEach(() => api.request.mockReset());

  it("offers only trial activation for a trial application", async () => {
    api.request.mockResolvedValue({ businessName: "Cafe", representativeEmail: "owner@example.com", approvedPlan: { code: "TRIAL", name: "Dùng thử 14 ngày", monthlyPrice: 0 }, expiresAt: "2026-12-01", trialAvailable: true, activationMode: "TRIAL" });
    renderActivation();
    expect(await screen.findByRole("button", { name: "Kích hoạt dùng thử 14 ngày" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /PayOS/ })).toBeNull();
  });

  it("offers only PayOS for a paid application", async () => {
    api.request.mockResolvedValue({ businessName: "Cafe", representativeEmail: "owner@example.com", approvedPlan: { code: "BASIC", name: "Cơ bản", monthlyPrice: 300000 }, expiresAt: "2026-12-01", trialAvailable: false, activationMode: "PAID" });
    renderActivation();
    expect(await screen.findByRole("button", { name: "Thanh toán tháng đầu qua PayOS" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /dùng thử/ })).toBeNull();
  });
});
