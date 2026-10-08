import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App as AntApp } from "antd";
import { mockControl } from "../../api/mock/control";
import { setScenario } from "../../api/mock/scenario";
import { resetMockStates } from "../../api/mock/store";
import { branchMock } from "../../api/modules/branch/mock";
import { useAppStore } from "../../store";
import type { PlanInfo } from "../../types";

// Ép module `account` về real để màn Nhân viên chạy nhánh "dòng hạn mức theo gói thật" (vitest mặc định ép mock).
vi.mock("../../api", async (importActual) => {
  const actual = await importActual<typeof import("../../api")>();
  return { ...actual, modeOf: (m: Parameters<typeof actual.modeOf>[0]) => (m === "account" ? "real" : actual.modeOf(m)) };
});

import StaffTable from "./StaffTable";

mockControl.latency = [0, 0];
mockControl.failure = null;

const plan = (over: Partial<PlanInfo> = {}, accounts = { used: 7, limit: 20 }): PlanInfo => ({
  chainId: "c1",
  tier: "STANDARD",
  planName: "Demo Operations",
  status: "active",
  expiresAt: "2099-12-31T23:59:59.999Z",
  limits: [
    { resource: "branches", used: 2, limit: 5, remaining: 3 },
    { resource: "accounts", used: accounts.used, limit: accounts.limit, remaining: Math.max(0, accounts.limit - accounts.used) },
  ],
  features: { branding: { enabled: true, requiredTier: "STANDARD" }, multiBranchCompare: { enabled: true, requiredTier: "STANDARD" }, aiAssistant: { enabled: false, requiredTier: "ADVANCED" } },
  source: { limits: "real", features: "real" },
  ...over,
});

// jsdom không có matchMedia/ResizeObserver mà bảng và ô chọn của antd cần.
vi.stubGlobal(
  "matchMedia",
  (query: string) => ({ matches: false, media: query, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false }),
);
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

let reloadPlan = vi.fn(async () => undefined);
beforeEach(async () => {
  setScenario({ profile: "A", tier: null, expired: false });
  resetMockStates();
  const chainId = (await branchMock.listChains())[0].id;
  const branches = await branchMock.listBranches();
  reloadPlan = vi.fn(async () => undefined);
  act(() =>
    useAppStore.setState({
      chainId,
      currentBranchId: branches[0].id,
      branches: [],
      currentUser: { id: "m", name: "M", email: "m@x", role: "manager", tenantId: chainId, branchId: branches[0].id } as never,
      reloadPlan,
    }),
  );
});
afterEach(() => act(() => useAppStore.setState({ plan: null, chainId: null, currentUser: null })));

const mount = (p: PlanInfo) => {
  act(() => useAppStore.setState({ plan: p }));
  return render(
    <AntApp>
      <StaffTable />
    </AntApp>,
  );
};
const quotaText = () => screen.getByTestId("staff-quota").textContent ?? "";
const addButton = () => screen.getByTestId("staff-add") as HTMLButtonElement;

describe("màn Nhân viên của Manager dùng gói thật (quyết định 53, 54)", () => {
  it("real: 'Đã dùng 7/20 tài khoản của gói' từ gói BE, KHÔNG còn '(số liệu mẫu)', nút Thêm mở", async () => {
    mount(plan());
    await waitFor(() => expect(quotaText()).toContain("Đã dùng 7/20 tài khoản của gói"));
    expect(quotaText()).not.toContain("số liệu mẫu");
    expect(quotaText()).not.toContain("đã đủ hạn mức");
    expect(addButton().disabled).toBe(false);
  });

  it("đạt hạn mức (20/20): báo 'đã đủ hạn mức' và nút Thêm KHOÁ", async () => {
    mount(plan({}, { used: 20, limit: 20 }));
    await waitFor(() => expect(quotaText()).toContain("Đã dùng 20/20 tài khoản của gói"));
    expect(quotaText()).toContain("đã đủ hạn mức");
    expect(addButton().disabled).toBe(true);
  });

  it("chưa tải được gói: 'Chưa tải được hạn mức gói' + Thử lại nhỏ; nút Thêm VẪN bấm được; Thử lại gọi reloadPlan; không toast", async () => {
    mount(plan({ subscriptionUnavailable: true, limits: [], status: null, expiresAt: null }));
    expect(screen.getByTestId("staff-quota-unavailable").textContent).toBe("Chưa tải được hạn mức gói");
    expect(addButton().disabled).toBe(false);
    expect(document.querySelectorAll(".ant-message-notice, .ant-notification-notice")).toHaveLength(0);
    fireEvent.click(screen.getByTestId("staff-quota-retry"));
    expect(reloadPlan).toHaveBeenCalledTimes(1);
  });

  it("gói không còn ACTIVE (EXPIRED): nút Thêm khoá theo cơ chế chỉ đọc có sẵn (quyết định 55)", async () => {
    mount(plan({ status: "expired" }));
    await waitFor(() => expect(quotaText()).toContain("Đã dùng 7/20"));
    expect(addButton().disabled).toBe(true);
  });
});
