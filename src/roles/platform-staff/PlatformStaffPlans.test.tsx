import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App as AntApp } from "antd";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/http/errors";
import { platformStaffApi } from "../../api/platformStaff";
import { platformStaffRoutes } from "../../router/routeConfig";
import PlatformStaffPlans from "./PlatformStaffPlans";

vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false }));
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const plan = (over = {}) => ({
  id: "p1",
  code: "BASIC",
  name: "Cơ bản",
  description: null,
  monthlyPrice: 590000,
  maxBranches: 3,
  maxAccounts: 30,
  brandingEnabled: false,
  multiBranchComparisonEnabled: false,
  isActive: true,
  ...over,
});
const mount = () =>
  render(
    <AntApp>
      <PlatformStaffPlans />
    </AntApp>,
  );

describe("Platform Staff xem gói (PA-04, chỉ đọc)", () => {
  it("hiện giá và hạn mức, KHÔNG có nút thêm hay sửa gói", async () => {
    vi.spyOn(platformStaffApi, "listPlans").mockResolvedValue([plan() as never]);
    mount();
    await waitFor(() => expect(screen.getByText("Cơ bản")).toBeTruthy());
    expect(document.body.textContent).toMatch(/590\.000/);
    expect(screen.queryByRole("button", { name: /Thêm|Sửa|Lưu/ })).toBeNull();
  });

  it("danh sách rỗng hiện trạng thái rỗng", async () => {
    vi.spyOn(platformStaffApi, "listPlans").mockResolvedValue([]);
    mount();
    await waitFor(() => expect(document.body.textContent).toMatch(/Chưa có gói dịch vụ nào/));
  });

  it("lỗi tải: báo lỗi và có nút Thử lại; thử lại nạp lại", async () => {
    const spy = vi
      .spyOn(platformStaffApi, "listPlans")
      .mockRejectedValueOnce(new ApiError(500, "x"))
      .mockResolvedValueOnce([plan() as never]);
    mount();
    await waitFor(() => expect(screen.getByTestId("staff-plans-error")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(screen.getByText("Cơ bản")).toBeTruthy());
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("403: thông báo quyền, không vỡ trang, không có nút Thử lại", async () => {
    vi.spyOn(platformStaffApi, "listPlans").mockRejectedValue(new ApiError(403, "Forbidden"));
    mount();
    await waitFor(() => expect(document.body.textContent).toMatch(/chưa có quyền/));
    expect(screen.queryByRole("button", { name: "Thử lại" })).toBeNull();
  });

  it("có trong menu Platform Staff với mã PA-04", () => {
    expect(platformStaffRoutes.find((r) => r.path === "plans")?.code).toBe("PA-04");
  });
});
