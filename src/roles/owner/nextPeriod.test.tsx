import { describe, expect, it, vi } from "vitest";
import { App } from "antd";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { addonViolation, computeLimits, maxSellableExtraBranches, type PricingPlan } from "../../lib/subscriptionPricing";
import type { KeepCandidates, NextInvoicePreview } from "../../api/subscriptionSchedule";
import type { ServicePlan } from "../../types";
import NextPeriodPanel, { keepPlan, type NextPeriodAdapter } from "./NextPeriodPanel";

const plan = (over: Partial<ServicePlan>): ServicePlan =>
  ({ description: null, isActive: true, maxTables: 30, extraBranchAccounts: 8, extraAccountPackPrice: 50000, brandingEnabled: false, multiBranchComparisonEnabled: false, ...over }) as ServicePlan;
const BASIC = plan({ id: "basic", code: "BASIC", name: "Cơ bản", monthlyPrice: 590000, maxBranches: 3, maxAccounts: 30, extraBranchPrice: 250000, extraBranchEnabled: true });
const STANDARD = plan({ id: "standard", code: "STANDARD", name: "Tiêu chuẩn", monthlyPrice: 1090000, maxBranches: 6, maxAccounts: 55, extraBranchPrice: 220000, extraBranchEnabled: true });
const ADVANCED = plan({ id: "advanced", code: "ADVANCED", name: "Nâng cao", monthlyPrice: 1690000, maxBranches: 10, maxAccounts: 90, extraBranchPrice: 0, extraBranchEnabled: false });
const CATALOG = [BASIC, STANDARD, ADVANCED];
const P = CATALOG as unknown as PricingPlan[];

describe("tính trước BR-92 ở FE (giống BE)", () => {
  it("4 ví dụ bắt buộc của đặc tả", () => {
    expect(addonViolation(P[0], { extraBranches: 1, accountPacks: 0 }, P)).toBeNull();
    const basic2 = addonViolation(P[0], { extraBranches: 2, accountPacks: 0 }, P);
    expect(basic2 && "suggestedPlan" in basic2 && basic2.suggestedPlan.code).toBe("STANDARD");
    expect(addonViolation(P[1], { extraBranches: 2, accountPacks: 0 }, P)).toBeNull();
    const std3 = addonViolation(P[1], { extraBranches: 3, accountPacks: 0 }, P);
    expect(std3 && "suggestedPlan" in std3 && std3.suggestedPlan.code).toBe("ADVANCED");
    expect(maxSellableExtraBranches(P[0], P)).toBe(1);
    expect(computeLimits(P[0], { extraBranches: 1, accountPacks: 1 })).toEqual({ branchLimit: 4, accountLimit: 43 });
  });

  it("chọn phần được giữ: tài khoản theo chi nhánh bị tạm ngưng, Brand Manager luôn được giữ", () => {
    const candidates: KeepCandidates = {
      owners: 1,
      branches: ["b1", "b2", "b3", "b4"].map((id) => ({ id, code: id, name: id, status: "ACTIVE" })),
      accounts: [
        ...Array.from({ length: 29 }, (_, i) => ({ id: `e${i}`, userId: `u${i}`, name: `NV ${i}`, email: "", role: "CASHIER", status: "ACTIVE", invitationState: null, branchId: "b1", branchName: "b1" })),
        { id: "x", userId: "ux", name: "NV b4", email: "", role: "CASHIER", status: "ACTIVE", invitationState: null, branchId: "b4", branchName: "b4" },
      ],
    };
    const result = keepPlan(candidates, { branchLimit: 3, accountLimit: 30 }, ["b1", "b2", "b3"], []);
    expect(result.branchNeeded).toBe(true);
    expect(result.suspendedBranches.map((b) => b.id)).toEqual(["b4"]);
    expect(result.followers.map((a) => a.id)).toEqual(["x"]);
    expect(result.accountNeeded).toBe(false);
    expect(result.capacity).toBe(29);
    expect(keepPlan(candidates, { branchLimit: 3, accountLimit: 30 }, ["b1", "b2", "b3", "b4"], []).branchOk).toBe(false);
  });
});

const preview = (over: Partial<NextInvoicePreview> = {}): NextInvoicePreview => ({
  plan: BASIC, extraBranches: 0, accountPacks: 0, branchLimit: 3, accountLimit: 30,
  startsAt: "2026-12-27T00:00:00.000Z", endsAt: "2027-01-27T00:00:00.000Z", currentPeriodEndsAt: "2026-12-27T00:00:00.000Z",
  paidUpcoming: false, registered: false, lines: [], total: 590000, ...over,
});

function mount(adapter: NextPeriodAdapter) {
  return render(<App><NextPeriodPanel adapter={adapter} catalog={CATALOG} /></App>);
}

describe("NextPeriodPanel", () => {
  it("khoá nút và gợi ý nâng gói khi Cơ bản mua thêm 2 chi nhánh (BR-92); không gọi API lưu", async () => {
    const save = vi.fn();
    mount({ preview: async () => preview(), candidates: async () => ({ owners: 1, branches: [], accounts: [] }), save });
    const input = await screen.findByTestId("next-extra-branches");
    fireEvent.change(input.tagName === "INPUT" ? input : input.querySelector("input")!, { target: { value: "2" } });
    fireEvent.blur(input.tagName === "INPUT" ? input : input.querySelector("input")!);
    await screen.findByTestId("next-violation");
    expect(screen.getByTestId("next-violation").textContent).toContain("Tiêu chuẩn");
    expect((screen.getByTestId("next-save") as HTMLButtonElement).disabled).toBe(true);
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByTestId("next-starts").textContent).toBe("27/12/2026");
  });

  it("hạ hạn mức dưới số đang dùng thì mở bước chọn phần được giữ và gửi keepBranchIds", async () => {
    const save = vi.fn(async (_input: unknown) => preview({ registered: true, extraBranches: 0 }));
    const candidates: KeepCandidates = { owners: 1, branches: ["b1", "b2", "b3", "b4"].map((id) => ({ id, code: id, name: `CN ${id}`, status: "ACTIVE" })), accounts: [] };
    mount({ preview: async () => preview({ extraBranches: 1, branchLimit: 4, accountLimit: 38, total: 840000 }), candidates: async () => candidates, save });
    const input = await screen.findByTestId("next-extra-branches");
    fireEvent.change(input.tagName === "INPUT" ? input : input.querySelector("input")!, { target: { value: "0" } });
    fireEvent.blur(input.tagName === "INPUT" ? input : input.querySelector("input")!);
    fireEvent.click(screen.getByTestId("next-save"));
    await screen.findByTestId("keep-modal");
    expect(screen.getByTestId("keep-summary").textContent).toContain("CN b4 tạm ngưng");
    expect(screen.getByTestId("keep-summary").textContent).toContain("27/12/2026");
    fireEvent.click(screen.getByText("Xác nhận đăng ký"));
    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(save.mock.calls[0][0]).toMatchObject({ extraBranches: 0, keepBranchIds: ["b1", "b2", "b3"] });
  });

  it("không báo 'đã kích hoạt' khi kỳ tới đã trả sớm: ghi rõ ngày hiệu lực", async () => {
    mount({
      preview: async () => preview({ paidUpcoming: true, upcomingPaid: { plan: STANDARD, extraBranches: 0, accountPacks: 0, branchLimit: 6, accountLimit: 55, startsAt: "2026-12-27T00:00:00.000Z", endsAt: "2027-01-27T00:00:00.000Z" } }),
      candidates: async () => ({ owners: 1, branches: [], accounts: [] }),
      save: vi.fn(),
    });
    const panel = await screen.findByTestId("next-period");
    expect(panel.textContent).toContain("chỉ có hiệu lực từ 27/12/2026");
    expect(panel.textContent).not.toMatch(/đã kích hoạt/i);
  });
});

describe("NextPeriodPanel — tải kỳ tới", () => {
  it("lỗi tải hiện thông báo kèm Thử lại, bấm Thử lại tải lại và hiện panel (31.4)", async () => {
    const previewFn = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValue(preview());
    mount({ preview: previewFn, candidates: vi.fn(), save: vi.fn() });
    await waitFor(() => expect(screen.getByTestId("next-load-error")).toBeTruthy());
    fireEvent.click(screen.getByText("Thử lại"));
    await waitFor(() => expect(screen.getByTestId("next-period")).toBeTruthy());
    expect(previewFn).toHaveBeenCalledTimes(2);
  });

  it("đang tải hiện khung chờ, không để trống", () => {
    mount({ preview: () => new Promise(() => undefined), candidates: vi.fn(), save: vi.fn() });
    expect(screen.getByTestId("next-loading")).toBeTruthy();
  });
});
