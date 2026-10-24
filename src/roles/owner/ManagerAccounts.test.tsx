import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App as AntApp } from "antd";
import { accountApi } from "../../api";
import { useAppStore } from "../../store";
import ManagerAccounts from "./ManagerAccounts";

vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }));
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

beforeEach(() => {
  vi.spyOn(accountApi, "listManagers").mockResolvedValue({ items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } });
  vi.spyOn(accountApi, "listStaffAccounts").mockResolvedValue([]);
  act(() => useAppStore.setState({
    currentUser: { id: "owner", name: "Owner", role: "owner", email: "owner@example.com", tenantId: "chain" } as never,
    chainId: "chain", branches: [{ id: "branch", name: "Branch" }] as never,
    plan: { chainId: "chain", tier: "STANDARD", status: "active", expiresAt: "2099-01-01", limits: [{ resource: "accounts", used: 1, limit: 20, remaining: 19 }], features: {} } as never,
  }));
  vi.spyOn(useAppStore.getState(), "loadScope").mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Owner email invitation form", () => {
  it("has email but no password/username, blocks invalid email and sends only invitation data", async () => {
    const invite = vi.spyOn(accountApi, "inviteAccount").mockResolvedValue({ account: { id: "employee", employeeCode: "EMP", name: "An", email: "an@example.com", status: "INACTIVE", lastLoginAt: null, branchId: "branch", branchName: "Branch", invitationState: "PENDING" }, expiresAt: "2099-01-01T00:00:00Z", emailStatus: "FAILED" });
    render(<AntApp><ManagerAccounts /></AntApp>);
    fireEvent.click(screen.getByTestId("create-manager"));
    await screen.findByTestId("owner-invite-email");
    expect(document.querySelector('input[type="password"]')).toBeNull();
    expect(screen.queryByText(/Tên đăng nhập/)).toBeNull();
    fireEvent.change(screen.getByTestId("owner-invite-name"), { target: { value: "Nguyen An" } });
    fireEvent.change(screen.getByTestId("owner-invite-email"), { target: { value: "invalid" } });
    expect((screen.getByTestId("owner-invite-submit") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByTestId("owner-invite-email"), { target: { value: "An@example.com" } });
    fireEvent.click(screen.getByTestId("owner-invite-submit"));
    await waitFor(() => expect(invite).toHaveBeenCalledTimes(1));
    expect(invite).toHaveBeenCalledWith("chain", { name: "Nguyen An", email: "an@example.com", role: "MANAGER", branchId: "branch" });
    await waitFor(() => expect(screen.getByTestId("password-setup-notice").textContent).toContain("Gửi email thất bại"));
    expect(screen.getByTestId("password-setup-notice").textContent).toContain("đang chờ đặt mật khẩu");
  });
});
