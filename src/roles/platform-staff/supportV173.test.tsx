import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App as AntApp } from "antd";
import { MemoryRouter } from "react-router-dom";
import { platformStaffApi, mapAwaitingActivation } from "../../api/platformStaff";
import { profileApi } from "../../api/profile";
import { useAppStore } from "../../store";
import PlatformBusinesses from "./Businesses";
import AwaitingActivationTable, { qrLabel } from "./AwaitingActivation";
import ChangePasswordModal from "../../auth/ChangePasswordModal";

vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }));
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const business = {
  id: "biz", code: "B1", name: "Quán A", taxCode: null, status: "ACTIVE", createdAt: "2026-01-01T00:00:00Z",
  representativeName: "An", representativeEmail: "an@example.com", representativePhone: "0900",
  subscription: null, owners: [{ id: "owner-1", ownerCode: "O1", name: "Nguyễn An", email: "bm@example.com", phone: null, status: "ACTIVE" }],
  usage: { branchCount: 1, accountCount: 2, monthlyOrderCount: 3 },
} as never;

describe("Platform Staff resets a Brand Manager password (PS-01, BR-56)", () => {
  it("requires a note, confirms, and calls the staff endpoint for the selected Brand Manager", async () => {
    vi.spyOn(platformStaffApi, "listBusinesses").mockResolvedValue({ items: [business], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } });
    vi.spyOn(platformStaffApi, "listPlans").mockResolvedValue([]);
    vi.spyOn(platformStaffApi, "getBusiness").mockResolvedValue(business);
    vi.spyOn(platformStaffApi, "getBusinessBilling").mockResolvedValue({ subscription: { nextPlanId: null, expiresAt: "2099-01-01" }, checkouts: [] });
    const reset = vi.spyOn(platformStaffApi, "resetOwnerPassword").mockResolvedValue({ ownerId: "owner-1", recipient: "bm@example.com", expiresAt: "2099-01-01T00:00:00Z", emailStatus: "SENT" });
    render(<AntApp><PlatformBusinesses /></AntApp>);
    fireEvent.click(await screen.findByText("Quán A"));
    const section = await screen.findByTestId("bm-reset");
    const submit = within(section).getByTestId("bm-reset-submit") as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(within(section).getByTestId("bm-reset-note"), { target: { value: "Đã gọi xác minh qua số đăng ký" } });
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);
    fireEvent.click(await screen.findByRole("button", { name: "Đặt lại" }));
    await waitFor(() => expect(reset).toHaveBeenCalledWith("owner-1", "Đã gọi xác minh qua số đăng ký"));
  });

  it.each([
    ["FAILED", /Chưa gửi được email/],
    ["PENDING", /đang chờ gửi/],
  ] as const)("does not claim the reset link was sent when email is %s", async (emailStatus, expected) => {
    vi.spyOn(platformStaffApi, "listBusinesses").mockResolvedValue({ items: [business], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } });
    vi.spyOn(platformStaffApi, "listPlans").mockResolvedValue([]);
    vi.spyOn(platformStaffApi, "getBusiness").mockResolvedValue(business);
    vi.spyOn(platformStaffApi, "getBusinessBilling").mockResolvedValue({ subscription: { nextPlanId: null, expiresAt: "2099-01-01" }, checkouts: [] });
    vi.spyOn(platformStaffApi, "resetOwnerPassword").mockResolvedValue({ ownerId: "owner-1", recipient: "bm@example.com", expiresAt: "2099-01-01T00:00:00Z", emailStatus });
    render(<AntApp><PlatformBusinesses /></AntApp>);
    fireEvent.click(await screen.findByText("Quán A"));
    const section = await screen.findByTestId("bm-reset");
    fireEvent.change(within(section).getByTestId("bm-reset-note"), { target: { value: "Đã gọi xác minh qua số đăng ký" } });
    fireEvent.click(within(section).getByTestId("bm-reset-submit"));
    fireEvent.click(await screen.findByRole("button", { name: "Đặt lại" }));
    expect(await screen.findByText(expected)).toBeTruthy();
  });
});

const raw = (over: Record<string, unknown> = {}) => ({
  id: "a1", applicationCode: "A1", businessName: "Quán B", representativeName: "Bình", representativeEmail: "b@example.com", representativePhone: "0901",
  approvedPlan: { id: "basic", code: "BASIC", name: "Cơ bản", monthlyPrice: "299000" },
  activationSentAt: "2026-11-10T08:00:00Z", activationExpiresAt: "2099-01-01T00:00:00Z", activationLastOpenedAt: null, linkExpired: false,
  firstPeriodQr: { created: true, createdAt: "2026-11-11T08:00:00Z", latestStatus: "PENDING", paid: false, needsReview: false, amount: "299000" },
  ...over,
});

describe("Đã duyệt — chờ kích hoạt (PS-01, 30.3)", () => {
  it("never reports a created QR as paid", () => {
    expect(qrLabel({ created: true, createdAt: null, latestStatus: "PENDING", paid: false, needsReview: false, amount: 1 }).text).toBe("Đã tạo QR, chưa thanh toán");
    expect(qrLabel({ created: false, createdAt: null, latestStatus: null, paid: false, needsReview: false, amount: null }).text).toBe("Chưa tạo QR");
    expect(qrLabel({ created: true, createdAt: null, latestStatus: "PAID", paid: true, needsReview: false, amount: 1 }).text).toMatch(/Đã thanh toán/);
    expect(mapAwaitingActivation(raw() as never).approvedPlan?.monthlyPrice).toBe(299000);
  });

  it("lists link sent/expiry/last opened and QR state, and opens the support drawer on click", async () => {
    const noQr = { created: false, createdAt: null, latestStatus: null, paid: false, needsReview: false, amount: null };
    const list = vi.spyOn(platformStaffApi, "listAwaitingActivation").mockResolvedValue({
      items: [mapAwaitingActivation(raw() as never), mapAwaitingActivation(raw({ id: "a2", businessName: "Quán C", linkExpired: true, firstPeriodQr: noQr }) as never)],
      pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
    });
    const onOpen = vi.fn();
    render(<AntApp><AwaitingActivationTable search="quán" onOpen={onOpen} /></AntApp>);
    expect(await screen.findByText("Quán B")).toBeTruthy();
    expect(list).toHaveBeenCalledWith({ page: 1, limit: 10, search: "quán" });
    expect(screen.getByText("Đã tạo QR, chưa thanh toán")).toBeTruthy();
    expect(screen.getByText("Chưa tạo QR")).toBeTruthy();
    expect(screen.getByText("Link đã hết hạn")).toBeTruthy();
    expect(screen.getAllByText("Chưa mở").length).toBe(2);
    fireEvent.click(screen.getByText("Quán C"));
    expect(onOpen).toHaveBeenCalledWith("a2");
  });
});

describe("Hồ sơ cá nhân (CM-02)", () => {
  const me = {
    id: "u1", email: "bm@example.com", emailEditable: false as const, role: "OWNER", phone: null, profileKind: "OWNER" as const,
    firstName: "Nguyễn", lastName: "An", fullName: "Nguyễn An", dateOfBirth: null, branchName: null, jobTitle: null,
    editableFields: ["firstName", "lastName", "phone", "dateOfBirth"] as ("firstName" | "lastName" | "phone" | "dateOfBirth")[],
  };

  it("edits own name and phone, keeps email read-only and updates the shell name", async () => {
    act(() => useAppStore.setState({ currentUser: { id: "u1", name: "Nguyễn An", email: "bm@example.com", role: "owner", tenantId: "chain" } as never }));
    vi.spyOn(profileApi, "get").mockResolvedValue(me);
    const update = vi.spyOn(profileApi, "update").mockResolvedValue({ ...me, lastName: "Bình", fullName: "Nguyễn Bình", phone: "0901234567" });
    render(<AntApp><MemoryRouter><ChangePasswordModal open onClose={() => undefined} /></MemoryRouter></AntApp>);
    await screen.findByTestId("profile-form");
    expect(screen.queryByDisplayValue("bm@example.com")).toBeNull();
    fireEvent.change(screen.getByTestId("profile-last-name"), { target: { value: "Bình" } });
    fireEvent.change(screen.getByTestId("profile-phone"), { target: { value: "090 123 4567" } });
    fireEvent.click(screen.getByTestId("profile-save"));
    await waitFor(() => expect(update).toHaveBeenCalledWith({ phone: "0901234567", firstName: "Nguyễn", lastName: "Bình", dateOfBirth: null }));
    expect(update.mock.calls[0][0]).not.toHaveProperty("email");
    await waitFor(() => expect(useAppStore.getState().currentUser?.name).toBe("Nguyễn Bình"));
    expect(screen.getByRole("button", { name: "Đổi mật khẩu" })).toBeTruthy();
  });

  it("platform accounts without a profile row only edit phone", async () => {
    vi.spyOn(profileApi, "get").mockResolvedValue({ ...me, role: "PLATFORM_STAFF", profileKind: "NONE", firstName: null, lastName: null, fullName: null, editableFields: ["phone"] });
    const update = vi.spyOn(profileApi, "update").mockResolvedValue({ ...me, profileKind: "NONE", editableFields: ["phone"], fullName: null });
    render(<AntApp><MemoryRouter><ChangePasswordModal open onClose={() => undefined} /></MemoryRouter></AntApp>);
    await screen.findByTestId("profile-form");
    expect(screen.queryByTestId("profile-first-name")).toBeNull();
    expect(screen.getByText(/chỉ cập nhật được số điện thoại/)).toBeTruthy();
    fireEvent.change(screen.getByTestId("profile-phone"), { target: { value: "0901234567" } });
    fireEvent.click(screen.getByTestId("profile-save"));
    await waitFor(() => expect(update).toHaveBeenCalledWith({ phone: "0901234567" }));
  });
});
