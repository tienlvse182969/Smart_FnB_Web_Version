import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App as AntApp } from "antd";
import { mockControl } from "../../api/mock/control";
import { setScenario } from "../../api/mock/scenario";
import { resetMockStates } from "../../api/mock/store";
import { branchMock } from "../../api/modules/branch/mock";
import { useAppStore } from "../../store";
import type { PlanInfo } from "../../types";
import BranchOperations from "./BranchOperations";

mockControl.latency = [0, 0];
mockControl.failure = null;

vi.stubGlobal(
  "matchMedia",
  (query: string) => ({ matches: false, media: query, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false }),
);
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

const plan = (status: PlanInfo["status"]): PlanInfo => ({
  chainId: "c1",
  tier: "STANDARD",
  planName: "Demo",
  status,
  expiresAt: status === "active" ? "2099-12-31T23:59:59.999Z" : "2020-01-01T00:00:00.000Z",
  limits: [],
  features: { branding: { enabled: true, requiredTier: "STANDARD" }, multiBranchCompare: { enabled: true, requiredTier: "STANDARD" }, aiAssistant: { enabled: false, requiredTier: "ADVANCED" } },
  source: { limits: "real", features: "real" },
});

let branchId = "";
beforeEach(async () => {
  setScenario({ profile: "A", tier: null, expired: false });
  resetMockStates();
  branchId = (await branchMock.listBranches())[0].id;
});
afterEach(() => act(() => useAppStore.setState({ plan: null })));

const mount = (status: PlanInfo["status"]) => {
  act(() => useAppStore.setState({ plan: plan(status) }));
  return render(
    <AntApp>
      <BranchOperations branchId={branchId} onClose={() => undefined} onArchived={async () => undefined} />
    </AntApp>,
  );
};
const tab = async (name: string) => {
  const el = await screen.findByRole("tab", { name });
  fireEvent.click(el);
};

describe("BranchOperations (Owner 'Giờ & khu vực') — chế độ chỉ đọc (quyết định 97)", () => {
  it("gói hoạt động: nút Lưu giờ, Lưu ngày đặc biệt, Thêm khu vực, Lưu trữ mở", async () => {
    mount("active");
    await waitFor(() => expect(screen.getByTestId("hour-save-1")).toBeTruthy());
    expect((screen.getByTestId("hour-save-1") as HTMLButtonElement).disabled).toBe(false);
    await tab("Ngày đặc biệt");
    expect((screen.getByTestId("special-save") as HTMLButtonElement).disabled).toBe(false);
    await tab("Khu vực");
    expect((screen.getByTestId("area-save") as HTMLButtonElement).disabled).toBe(false);
    await tab("Lưu trữ");
    expect((screen.getByTestId("branch-archive") as HTMLButtonElement).disabled).toBe(false);
  });

  it("gói EXPIRED: mọi nút ghi khoá kèm tooltip chỉ đọc; không có thông báo lỗi", async () => {
    mount("expired");
    await waitFor(() => expect(screen.getByTestId("hour-save-1")).toBeTruthy());
    const save = screen.getByTestId("hour-save-1") as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    expect(save.closest('[data-testid="action-guard"]')).toBeTruthy();
    await tab("Ngày đặc biệt");
    expect((screen.getByTestId("special-save") as HTMLButtonElement).disabled).toBe(true);
    await tab("Khu vực");
    expect((screen.getByTestId("area-save") as HTMLButtonElement).disabled).toBe(true);
    await tab("Lưu trữ");
    expect((screen.getByTestId("branch-archive") as HTMLButtonElement).disabled).toBe(true);
    expect(document.querySelectorAll(".ant-message-notice")).toHaveLength(0);
  });

  it("gói tạm ngưng (SUSPENDED) cũng khoá", async () => {
    mount("suspended");
    await waitFor(() => expect(screen.getByTestId("hour-save-1")).toBeTruthy());
    expect((screen.getByTestId("hour-save-1") as HTMLButtonElement).disabled).toBe(true);
  });
});
