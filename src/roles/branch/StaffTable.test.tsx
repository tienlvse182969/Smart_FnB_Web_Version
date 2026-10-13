import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App as AntApp } from "antd";
import { ApiError } from "../../api/http/errors";
import { accountApi } from "../../api";
import { mockControl } from "../../api/mock/control";
import { setScenario } from "../../api/mock/scenario";
import { resetMockStates } from "../../api/mock/store";
import { branchMock } from "../../api/modules/branch/mock";
import { useAppStore } from "../../store";
import type { PlanInfo } from "../../types";

mockControl.latency = [0, 0];
mockControl.failure = null;

// Màn chạy ở chế độ "account real" (không banner mẫu, không cột đăng nhập gần nhất); dữ liệu vẫn từ mock vì vitest ép module về mock.
vi.mock("../../api", async (importActual) => {
  const actual = await importActual<typeof import("../../api")>();
  return { ...actual, modeOf: (m: Parameters<typeof actual.modeOf>[0]) => (m === "account" ? "real" : actual.modeOf(m)) };
});

vi.stubGlobal(
  "matchMedia",
  (query: string) => ({ matches: false, media: query, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false }),
);
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

import StaffTable from "./StaffTable";

const plan = (over: Partial<PlanInfo> = {}): PlanInfo => ({
  chainId: "c1",
  tier: "STANDARD",
  planName: "Demo",
  status: "active",
  expiresAt: "2099-12-31T23:59:59.999Z",
  limits: [{ resource: "accounts", used: 7, limit: 20, remaining: 13 }, { resource: "branches", used: 2, limit: 5, remaining: 3 }],
  features: { branding: { enabled: true, requiredTier: "STANDARD" }, multiBranchCompare: { enabled: true, requiredTier: "STANDARD" }, aiAssistant: { enabled: false, requiredTier: "ADVANCED" } },
  source: { limits: "real", features: "real" },
  ...over,
});

let chainId = "";
let branchId = "";
beforeEach(async () => {
  setScenario({ profile: "A", tier: null, expired: false });
  resetMockStates();
  chainId = (await branchMock.listChains())[0].id;
  const branches = await branchMock.listBranches();
  branchId = branches[0].id;
  act(() =>
    useAppStore.setState({
      chainId,
      currentBranchId: branchId,
      branches: [],
      currentUser: { id: "m", name: "M", email: "m@x", role: "manager", tenantId: chainId, branchId } as never,
      reloadPlan: vi.fn(async () => undefined),
      plan: plan(),
    }),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  act(() => useAppStore.setState({ plan: null, chainId: null, currentUser: null }));
});

const mount = () =>
  render(
    <AntApp>
      <StaffTable />
    </AntApp>,
  );
const set = (testId: string, value: string) => fireEvent.change(screen.getByTestId(testId), { target: { value } });
const rowsLoaded = () => waitFor(() => expect(document.querySelectorAll(".ant-table-tbody tr.ant-table-row").length).toBeGreaterThan(0));
/** Dòng đầu tiên chưa khoá (mock lưu qua F5 nên các ca trước có thể đã khoá một số tài khoản). */
const firstRowId = async () => (await accountApi.listStaff(chainId, branchId)).items.find((s) => s.status !== "SUSPENDED")!.id;
const confirmBtn = (text: string) => {
  const btn = [...document.querySelectorAll(".ant-modal-confirm button")].find((b) => b.textContent?.trim() === text);
  if (!btn) throw new Error(`không có nút "${text}" trong hộp xác nhận`);
  return btn as HTMLButtonElement;
};

describe("màn Nhân viên của Manager — tài khoản thật qua email (#24)", () => {
  it("không còn banner dữ liệu mẫu, có cột 'Đăng nhập gần nhất' (#62, BE fb7cae9); nhãn trạng thái tiếng Việt", async () => {
    mount();
    await rowsLoaded();
    expect(screen.queryByTestId("staff-mock-banner")).toBeNull();
    const heads = [...document.querySelectorAll(".ant-table-thead th")].map((t) => t.textContent?.trim());
    expect(heads).toContain("Đăng nhập gần nhất");
    expect(document.body.textContent).toMatch(/Đang hoạt động|Chưa kích hoạt|Đã khoá/);
    expect(document.body.textContent).not.toMatch(/Chờ đặt mật khẩu/);
  });

  it("tạo: form có Mã nhân viên, email sai bị chặn, gửi đúng input (không mật khẩu), hiện trạng thái email", async () => {
    const spy = vi.spyOn(accountApi, "createStaff");
    mount();
    await rowsLoaded();
    fireEvent.click(screen.getByTestId("staff-add"));
    await waitFor(() => expect(screen.getByTestId("staff-name")).toBeTruthy());
    expect(screen.getByTestId("staff-code")).toBeTruthy();
    expect(document.querySelector('input[type="password"]')).toBeNull();
    set("staff-name", "Trần Thị Bình");
    set("staff-email", "khong-hop-le");
    set("staff-code", "CSH-900");
    await waitFor(() => expect(screen.getByTestId("staff-errors").textContent).toMatch(/Email không hợp lệ/));
    expect((screen.getByTestId("staff-save") as HTMLButtonElement).disabled).toBe(true);
    set("staff-email", "binh.moi@thu.vn");
    await waitFor(() => expect((screen.getByTestId("staff-save") as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByTestId("staff-save"));
    await waitFor(() => expect(document.querySelector(".ant-modal-confirm")).toBeTruthy());
    expect(document.querySelector(".ant-modal-confirm")?.textContent).toMatch(/Không có mật khẩu/);
    fireEvent.click(confirmBtn("Tạo tài khoản"));
    await waitFor(() => expect(screen.getByTestId("password-setup-notice")).toBeTruthy());
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][2]).toMatchObject({ firstName: "Trần", lastName: "Thị Bình", email: "binh.moi@thu.vn", role: "CASHIER", employeeCode: "CSH-900" });
    expect(Object.keys(spy.mock.calls[0][2])).not.toContain("password");
    expect(screen.getByTestId("email-status").textContent).toMatch(/Email đã được gửi/);
  });

  it("tạo: 409 email trùng → câu tiếng Việt (không tiếng Anh thô)", async () => {
    vi.spyOn(accountApi, "createStaff").mockRejectedValueOnce(new ApiError(409, "Email, phone or employee code already exists", [], null, null));
    mount();
    await rowsLoaded();
    fireEvent.click(screen.getByTestId("staff-add"));
    await waitFor(() => expect(screen.getByTestId("staff-name")).toBeTruthy());
    set("staff-name", "Lê Văn Cường");
    set("staff-email", "trung@thu.vn");
    set("staff-code", "CSH-901");
    await waitFor(() => expect((screen.getByTestId("staff-save") as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByTestId("staff-save"));
    await waitFor(() => expect(document.querySelector(".ant-modal-confirm")).toBeTruthy());
    fireEvent.click(confirmBtn("Tạo tài khoản"));
    await waitFor(() => expect(document.body.textContent).toMatch(/Email, số điện thoại hoặc mã nhân viên đã tồn tại/));
    expect(document.body.textContent).not.toMatch(/already exists/);
  });

  it("khoá: hộp xác nhận bắt buộc lý do ≥ 3 ký tự; gửi kèm lý do; bấm đúp chỉ 1 request", async () => {
    const spy = vi.spyOn(accountApi, "setStaffActive");
    mount();
    await rowsLoaded();
    const id = await firstRowId();
    fireEvent.click(screen.getByTestId(`staff-lock-${id}`));
    await waitFor(() => expect(screen.getByTestId("staff-reason")).toBeTruthy());
    expect(document.querySelector(".ant-modal-container")?.contains(screen.getByTestId("staff-reason"))).toBe(true);
    const ok = () => screen.getByTestId("staff-reason-ok") as HTMLButtonElement;
    expect(ok().disabled).toBe(true);
    set("staff-reason", "ab");
    expect(ok().disabled).toBe(true);
    set("staff-reason", "Nghỉ việc từ hôm nay");
    expect(ok().disabled).toBe(false);
    fireEvent.click(ok());
    fireEvent.click(ok());
    await waitFor(() => expect(document.body.textContent).toMatch(/Đã khoá tài khoản/));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]).toEqual([chainId, branchId, id, false, "Nghỉ việc từ hôm nay"]);
  });

  it("gửi lại email: cần lý do, gọi resetStaffPassword kèm lý do, hiện hạn link và trạng thái gửi", async () => {
    const spy = vi.spyOn(accountApi, "resetStaffPassword");
    mount();
    await rowsLoaded();
    const id = await firstRowId();
    fireEvent.click(screen.getByTestId(`staff-resend-${id}`));
    await waitFor(() => expect(screen.getByTestId("staff-reason")).toBeTruthy());
    expect(document.body.textContent).toMatch(/GỬI EMAIL THẬT/);
    set("staff-reason", "Nhân viên chưa nhận được thư");
    fireEvent.click(screen.getByTestId("staff-reason-ok"));
    await waitFor(() => expect(screen.getByTestId("password-setup-notice")).toBeTruthy());
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][3]).toBe("Nhân viên chưa nhận được thư");
    expect(screen.getByTestId("email-status").textContent).toMatch(/Email đã được gửi/);
  });

  it("lỗi 400 của BE hiện theo ô tiếng Việt, hộp lý do còn mở", async () => {
    vi.spyOn(accountApi, "setStaffActive").mockRejectedValueOnce(new ApiError(400, "reason must be longer than or equal to 3 characters", ["reason must be longer than or equal to 3 characters"]));
    mount();
    await rowsLoaded();
    const id = await firstRowId();
    fireEvent.click(screen.getByTestId(`staff-lock-${id}`));
    await waitFor(() => expect(screen.getByTestId("staff-reason")).toBeTruthy());
    set("staff-reason", "Lý do hợp lệ");
    fireEvent.click(screen.getByTestId("staff-reason-ok"));
    await waitFor(() => expect(document.body.textContent).toMatch(/Lý do phải có ít nhất 3 ký tự/));
    expect(screen.getByTestId("staff-reason")).toBeTruthy();
  });

  it("gói hết hạn (chỉ đọc): Thêm, Sửa, Gửi lại email, Khoá đều bị khoá", async () => {
    act(() => useAppStore.setState({ plan: plan({ status: "expired" }) }));
    mount();
    await rowsLoaded();
    expect((screen.getByTestId("staff-add") as HTMLButtonElement).disabled).toBe(true);
    const rowButtons = [...document.querySelectorAll(".ant-table-tbody button")] as HTMLButtonElement[];
    expect(rowButtons.length).toBeGreaterThan(0);
    expect(rowButtons.every((b) => b.disabled)).toBe(true);
  });

  it("đã khoá: nút Mở khoá cũng hỏi lý do và gửi active=true kèm lý do", async () => {
    const id = await firstRowId();
    await accountApi.setStaffActive(chainId, branchId, id, false);
    const spy = vi.spyOn(accountApi, "setStaffActive");
    mount();
    await rowsLoaded();
    fireEvent.click(await screen.findByTestId(`staff-unlock-${id}`));
    await waitFor(() => expect(screen.getByTestId("staff-reason")).toBeTruthy());
    expect(within(document.body).getAllByText(/Mở khoá tài khoản/).length).toBeGreaterThan(0);
    set("staff-reason", "Quay lại làm việc");
    fireEvent.click(screen.getByTestId("staff-reason-ok"));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy.mock.calls[0]).toEqual([chainId, branchId, id, true, "Quay lại làm việc"]);
  });
});
