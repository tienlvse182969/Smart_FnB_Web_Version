import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App as AntApp } from "antd";
import { adminApi } from "../../api";
import type { Business, BusinessSubscription, SubscriptionState } from "../../types";
import TenantsTable, { TRIAL_LOCK_TEXT } from "./TenantsTable";

vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }));
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

const HOUR = 3_600_000;
const iso = (ms: number) => new Date(ms).toISOString();

function business(id: string, planCode: string, state: SubscriptionState, expiresAt: string): Business {
  const plan = { id: `plan-${planCode}`, code: planCode, name: planCode === "TRIAL" ? "Dùng thử 14 ngày" : "Cơ bản", description: null, monthlyPrice: planCode === "TRIAL" ? 0 : 300000, maxBranches: 2, maxAccounts: 10, maxTables: 30, brandingEnabled: false, multiBranchComparisonEnabled: false, isActive: true };
  const subscription: BusinessSubscription = { state, startsAt: iso(Date.now() - 24 * HOUR), expiresAt, suspendedAt: state === "suspended" ? iso(Date.now() - HOUR) : null, trialStartedAt: planCode === "TRIAL" ? iso(Date.now() - 24 * HOUR) : null, trialEndsAt: planCode === "TRIAL" ? expiresAt : null, trialConvertedAt: null, plan, monthlyPrice: plan.monthlyPrice };
  return { id, code: `BIZ-${id}`, name: `Quán ${id}`, taxCode: null, createdAt: iso(Date.now() - 48 * HOUR), representativeName: "An", representativeEmail: "an@example.com", representativePhone: "0900000000", subscription, owners: [{ id: "o1", ownerCode: "OWN1", name: "An", email: "an@example.com", phone: null, status: "ACTIVE" }], usage: { branchCount: 1, accountCount: 3, tableCount: 0, monthlyOrderCount: 12 } } as unknown as Business;
}

const FIXTURE = (): Business[] => [
  business("t10", "TRIAL", "active", iso(Date.now() + 10 * 24 * HOUR + 3 * HOUR)),
  business("t2", "TRIAL", "active", iso(Date.now() + 2 * 24 * HOUR + 3 * HOUR)),
  business("tlast", "TRIAL", "active", iso(Date.now() + HOUR)),
  business("tend", "TRIAL", "expired", iso(Date.now() - 24 * HOUR)),
  business("tsus", "TRIAL", "suspended", iso(Date.now() + 5 * 24 * HOUR)),
  business("paid", "BASIC", "active", iso(Date.now() + 20 * 24 * HOUR)),
];

beforeEach(() => {
  vi.spyOn(adminApi, "listBusinesses").mockResolvedValue({ items: FIXTURE(), pagination: { page: 1, limit: 10, total: 6, totalPages: 1 } });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const renderTable = async () => {
  render(<AntApp><TenantsTable /></AntApp>);
  await screen.findByText("Quán t10");
};
const rowOf = (name: string) => screen.getByText(name).closest("tr") as HTMLElement;

describe("TenantsTable — gói dùng thử", () => {
  it("cột Gói: TRIAL hiện 'Dùng thử' kèm phụ đề còn bao lâu; gói trả phí giữ tên gói", async () => {
    await renderTable();
    expect(within(rowOf("Quán t10")).getByTestId("tenant-trial-sub").textContent).toBe("còn 10 ngày");
    expect(within(rowOf("Quán t10")).getByTestId("tenant-plan-trial").textContent).toContain("Dùng thử");
    expect(within(rowOf("Quán t2")).getByTestId("tenant-trial-sub").textContent).toBe("còn 2 ngày");
    expect(within(rowOf("Quán tlast")).getByTestId("tenant-trial-sub").textContent).toBe("hết hạn hôm nay");
    expect(within(rowOf("Quán tend")).queryByTestId("tenant-trial-sub")).toBeNull(); // chip "Hết hạn · chỉ đọc" đã nói đủ
    expect(within(rowOf("Quán paid")).queryByTestId("tenant-plan-trial")).toBeNull();
    expect(rowOf("Quán paid").textContent).toContain("Cơ bản");
  });

  it("phụ đề không tô màu (chữ textMuted); màu chỉ do chip trạng thái mang; hết hạn và tạm ngưng không có phụ đề", async () => {
    await renderTable();
    const color = (name: string) => (within(rowOf(name)).getByTestId("tenant-trial-sub") as HTMLElement).style.color;
    const colors = new Set([color("Quán t10"), color("Quán t2"), color("Quán tlast")]);
    expect(colors.size).toBe(1); // cùng một màu cho mọi mức còn hạn
    expect(within(rowOf("Quán t10")).getByTestId("tenant-trial-sub").getAttribute("data-tone")).toBeNull();
    expect(within(rowOf("Quán tend")).queryByTestId("tenant-trial-sub")).toBeNull();
    expect(rowOf("Quán tend").textContent).toContain("Hết hạn");
    expect(within(rowOf("Quán tsus")).queryByTestId("tenant-trial-sub")).toBeNull();
    expect(rowOf("Quán tsus").textContent).toContain("Tạm ngưng");
  });

  it("Gia hạn và Đổi gói bị khoá với TRIAL (cả hết hạn và tạm ngưng), tooltip giải thích; Tạm ngưng / Kích hoạt lại vẫn dùng được", async () => {
    await renderTable();
    for (const name of ["Quán t10", "Quán tend", "Quán tsus"]) {
      fireEvent.click(screen.getByText(name));
      const drawer = await screen.findByRole("dialog");
      const renew = within(drawer).getByRole("button", { name: /Gia hạn/ }) as HTMLButtonElement;
      const change = within(drawer).getByRole("button", { name: /Đổi gói/ }) as HTMLButtonElement;
      expect(renew.disabled).toBe(true);
      expect(change.disabled).toBe(true);
      expect(within(drawer).getAllByTestId("trial-lock")).toHaveLength(2);
      const suspendOrReactivate = within(drawer).getByRole("button", { name: name === "Quán tsus" ? /Kích hoạt lại/ : /Tạm ngưng/ }) as HTMLButtonElement;
      expect(suspendOrReactivate.disabled).toBe(false);
      fireEvent.mouseEnter(within(drawer).getAllByTestId("trial-lock")[0]);
      await waitFor(() => expect(screen.getByText(TRIAL_LOCK_TEXT)).toBeTruthy());
      fireEvent.click(within(drawer).getByRole("button", { name: /close/i }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    }
  });

  it("gói trả phí: Gia hạn và Đổi gói bấm được, không có tooltip khoá", async () => {
    await renderTable();
    fireEvent.click(screen.getByText("Quán paid"));
    const drawer = await screen.findByRole("dialog");
    expect((within(drawer).getByRole("button", { name: /Gia hạn/ }) as HTMLButtonElement).disabled).toBe(false);
    expect((within(drawer).getByRole("button", { name: /Đổi gói/ }) as HTMLButtonElement).disabled).toBe(false);
    expect(within(drawer).queryByTestId("trial-lock")).toBeNull();
  });

  it("TRIAL_LOCK_TEXT đúng câu đã duyệt", () => {
    expect(TRIAL_LOCK_TEXT).toBe("Gói dùng thử không gia hạn hay đổi tay được; chủ chuỗi tự nâng cấp qua thanh toán.");
  });
});
