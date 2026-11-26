import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App as AntApp } from "antd";
import RemoveAccountModal from "./RemoveAccountModal";
import { accountApi } from "../api";
import { useAppStore } from "../store";
import ManagerAccounts from "../roles/owner/ManagerAccounts";
import { request } from "../api/http/client";
import type { AccountRemovalPreview } from "../types";

vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }));
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
vi.mock("../api/http/client", async (original) => ({ ...(await original<typeof import("../api/http/client")>()), request: vi.fn() }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.mocked(request).mockReset(); });

const target = { id: "e1", label: "Lan · lan@example.com" };

function mount(preview: AccountRemovalPreview, submit = vi.fn().mockResolvedValue({ mode: preview.mode })) {
  const onRemoved = vi.fn();
  render(<AntApp><RemoveAccountModal target={target} loadPreview={async () => preview} submit={submit} onClose={() => undefined} onRemoved={onRemoved} /></AntApp>);
  return { submit, onRemoved };
}
const confirmButton = () => screen.getByTestId("remove-account-confirm") as HTMLButtonElement;

describe("Xoá tài khoản — hộp xác nhận", () => {
  it("never-used account: says it will be deleted, needs a reason, then reports the mode", async () => {
    const { submit, onRemoved } = mount({ mode: "DELETE", allowed: true, blockedReason: null });
    await screen.findByTestId("remove-account-mode-DELETE");
    expect(screen.getByText(/email này có thể được mời lại/)).toBeTruthy();
    expect(confirmButton().disabled).toBe(true);
    fireEvent.change(screen.getByTestId("remove-account-reason"), { target: { value: "Mời nhầm email" } });
    expect(confirmButton().disabled).toBe(false);
    fireEvent.click(confirmButton());
    await waitFor(() => expect(submit).toHaveBeenCalledWith("e1", "Mời nhầm email"));
    expect(onRemoved).toHaveBeenCalledWith("DELETE");
  });

  it("account with history: says it will be anonymized and what happens to reports", async () => {
    mount({ mode: "ANONYMIZE", allowed: true, blockedReason: null });
    await screen.findByTestId("remove-account-mode-ANONYMIZE");
    expect(screen.getByText(/Tài khoản đã xoá/)).toBeTruthy();
    expect(screen.getByText("Ẩn danh và xoá")).toBeTruthy();
  });

  it("account still in use: explains to lock first and cannot be confirmed", async () => {
    const { submit } = mount({ mode: "ANONYMIZE", allowed: false, blockedReason: "Lock the account" });
    await screen.findByTestId("remove-account-blocked");
    expect(screen.queryByTestId("remove-account-reason")).toBeNull();
    expect(confirmButton().disabled).toBe(true);
    expect(submit).not.toHaveBeenCalled();
  });
});

describe("Brand Manager — nút Xoá ở danh sách Store Manager", () => {
  it("only locked accounts or cancelled invitations can be removed, through the shared dialog", async () => {
    const base = { employeeCode: "SM", lastLoginAt: null, branchId: "branch", branchName: "Branch" };
    vi.spyOn(accountApi, "listManagers").mockResolvedValue({
      items: [
        { ...base, id: "active", name: "Đang làm", email: "a@x.vn", status: "ACTIVE", invitationState: "ACCEPTED" },
        { ...base, id: "locked", name: "Đã nghỉ", email: "b@x.vn", status: "SUSPENDED", invitationState: "ACCEPTED" },
        { ...base, id: "cancelled", name: "Mời nhầm", email: "c@x.vn", status: "INACTIVE", invitationState: "CANCELLED" },
      ],
      pagination: { page: 1, limit: 20, total: 3, totalPages: 1 },
    } as never);
    vi.spyOn(accountApi, "listStaffAccounts").mockResolvedValue([]);
    const preview = vi.spyOn(accountApi, "managerRemovalPreview").mockResolvedValue({ mode: "ANONYMIZE", allowed: true, blockedReason: null });
    act(() => useAppStore.setState({
      currentUser: { id: "owner", name: "Owner", role: "owner", email: "owner@x.vn", tenantId: "chain" } as never,
      chainId: "chain", branches: [{ id: "branch", name: "Branch" }] as never,
      plan: { chainId: "chain", tier: "STANDARD", status: "active", expiresAt: "2099-01-01", limits: [{ resource: "accounts", used: 1, limit: 20, remaining: 19 }], features: {} } as never,
    }));
    render(<AntApp><ManagerAccounts /></AntApp>);
    await screen.findByTestId("remove-manager-locked");
    expect(screen.getByTestId("remove-manager-cancelled")).toBeTruthy();
    expect(screen.queryByTestId("remove-manager-active")).toBeNull();
    fireEvent.click(screen.getByTestId("remove-manager-locked"));
    await waitFor(() => expect(preview).toHaveBeenCalledWith("locked"));
    expect(await screen.findByTestId("remove-account-mode-ANONYMIZE")).toBeTruthy();
  });
});

describe("API xoá tài khoản", () => {
  it("calls the role-scoped BE routes with the reason", async () => {
    vi.mocked(request).mockResolvedValue({ mode: "DELETE" });
    const { accountReal } = await import("../api/modules/account/real");
    await accountReal.managerRemovalPreview("e1");
    await accountReal.removeManager("e1", "Đã nghỉ việc");
    await accountReal.staffRemovalPreview("c", "b", "s1");
    await accountReal.removeStaff("c", "b", "s1", "Đã nghỉ việc");
    expect(vi.mocked(request).mock.calls.map((c) => [c[0], (c[1] as { method?: string } | undefined)?.method ?? "GET"])).toEqual([
      ["/employees/e1/removal", "GET"],
      ["/employees/e1/remove", "POST"],
      ["/manager/staff/s1/removal", "GET"],
      ["/manager/staff/s1/remove", "POST"],
    ]);
    expect(vi.mocked(request).mock.calls[1][1]).toMatchObject({ body: { reason: "Đã nghỉ việc" } });
  });
});
