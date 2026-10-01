import { act, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "../store";
import type { PlanInfo, PlanTier } from "../types";
import { buildFeatures } from "../api/modules/plan/source";
import ActionButton from "./ActionButton";
import FeatureGate from "./FeatureGate";
import ReadOnlyBanner from "./ReadOnlyBanner";
import { computeWriteGuard } from "./useReadOnly";
import { describePlan, usePlan } from "./usePlan";

const NAMES: Record<PlanTier, string> = { BASIC: "Cơ bản", STANDARD: "Tiêu chuẩn", ADVANCED: "Nâng cao" };

function makePlan(tier: PlanTier, over: Partial<PlanInfo> = {}): PlanInfo {
  return {
    chainId: "c1",
    tier,
    planName: NAMES[tier],
    status: "active",
    expiresAt: "2026-12-01T00:00:00.000Z",
    limits: [
      { resource: "branches", used: 2, limit: 2, remaining: 0 },
      { resource: "accounts", used: 4, limit: 10, remaining: 6 },
    ],
    features: buildFeatures(tier),
    source: { limits: "real", features: "mock" },
    ...over,
  };
}

const setPlan = (plan: PlanInfo | null) => act(() => useAppStore.setState({ plan, scopeStatus: "ready" }));

beforeEach(() => setPlan(null));
afterEach(() => useAppStore.setState({ plan: null, scopeStatus: "idle" }));

describe("describePlan / usePlan", () => {
  it("trả cấp, tên, hạn mức, mức đã dùng, hạn dùng", () => {
    const v = describePlan(makePlan("STANDARD"));
    expect(v.tier).toBe("STANDARD");
    expect(v.tierLabel).toBe("Tiêu chuẩn");
    expect(v.planName).toBe("Tiêu chuẩn");
    expect(v.expiresAt).toBe("2026-12-01T00:00:00.000Z");
    expect(v.limitOf("accounts")).toMatchObject({ used: 4, limit: 10, remaining: 6 });
    expect(v.isLimitReached("branches")).toBe(true);
    expect(v.isLimitReached("accounts")).toBe(false);
    expect(v.isExpired).toBe(false);
  });

  it("cờ tính năng theo cấp: Cơ bản không có gì, Tiêu chuẩn có nhận diện + so sánh, Nâng cao có thêm AI", () => {
    const basic = describePlan(makePlan("BASIC"));
    expect([basic.hasFeature("branding"), basic.hasFeature("multiBranchCompare"), basic.hasFeature("aiAssistant")]).toEqual([false, false, false]);
    const standard = describePlan(makePlan("STANDARD"));
    expect([standard.hasFeature("branding"), standard.hasFeature("multiBranchCompare"), standard.hasFeature("aiAssistant")]).toEqual([true, true, false]);
    const advanced = describePlan(makePlan("ADVANCED"));
    expect([advanced.hasFeature("branding"), advanced.hasFeature("multiBranchCompare"), advanced.hasFeature("aiAssistant")]).toEqual([true, true, true]);
  });

  it("requiredTierLabel cho thẻ khoá", () => {
    const v = describePlan(makePlan("BASIC"));
    expect(v.requiredTierLabel("aiAssistant")).toBe("Nâng cao");
    expect(v.requiredTierLabel("branding")).toBe("Tiêu chuẩn");
  });

  it("hết hạn và tạm ngưng đều là chế độ chỉ đọc", () => {
    expect(describePlan(makePlan("ADVANCED", { status: "expired" })).isExpired).toBe(true);
    expect(describePlan(makePlan("ADVANCED", { status: "suspended" })).isExpired).toBe(true);
    expect(describePlan(makePlan("ADVANCED", { status: "active" })).isExpired).toBe(false);
  });

  it("chưa biết gói thì không khoá (BE vẫn chặn thật)", () => {
    const v = describePlan(null);
    expect(v.hasFeature("aiAssistant")).toBe(true);
    expect(v.isExpired).toBe(false);
    expect(v.tier).toBeNull();
  });

  it("hook đọc gói từ store", () => {
    const { result } = renderHook(() => usePlan());
    expect(result.current.plan).toBeNull();
    setPlan(makePlan("ADVANCED"));
    expect(result.current.tier).toBe("ADVANCED");
    expect(result.current.hasFeature("aiAssistant")).toBe(true);
    setPlan(makePlan("BASIC"));
    expect(result.current.hasFeature("aiAssistant")).toBe(false);
  });
});

describe("<FeatureGate>", () => {
  const renderGate = () =>
    render(
      <FeatureGate feature="aiAssistant">
        <div>nội dung AI</div>
      </FeatureGate>,
    );

  it("gói có tính năng → hiện nội dung", () => {
    setPlan(makePlan("ADVANCED"));
    renderGate();
    expect(screen.getByText("nội dung AI")).toBeTruthy();
    expect(screen.queryByTestId("feature-lock")).toBeNull();
  });

  it("gói thiếu → hiện thẻ khoá kèm tên gói cần nâng, KHÔNG ẩn hẳn", () => {
    setPlan(makePlan("STANDARD"));
    renderGate();
    expect(screen.queryByText("nội dung AI")).toBeNull();
    const lock = screen.getByTestId("feature-lock");
    expect(lock.textContent).toContain("Trợ lý AI");
    expect(lock.textContent).toContain("Nâng cao");
    expect(lock.textContent).toContain("Tiêu chuẩn"); // gói hiện tại
  });

  it("đổi gói thì khoá/mở theo", () => {
    setPlan(makePlan("BASIC"));
    renderGate();
    expect(screen.getByTestId("feature-lock")).toBeTruthy();
    setPlan(makePlan("ADVANCED"));
    expect(screen.queryByTestId("feature-lock")).toBeNull();
    expect(screen.getByText("nội dung AI")).toBeTruthy();
  });

  it("nhận diện: khoá ở Cơ bản, mở từ Tiêu chuẩn", () => {
    const gate = () =>
      render(
        <FeatureGate feature="branding">
          <div>form nhận diện</div>
        </FeatureGate>,
      );
    setPlan(makePlan("BASIC"));
    const first = gate();
    expect(first.getByTestId("feature-lock").textContent).toContain("Tiêu chuẩn");
    first.unmount();
    setPlan(makePlan("STANDARD"));
    expect(gate().getByText("form nhận diện")).toBeTruthy();
  });
});

describe("chế độ chỉ đọc", () => {
  it("computeWriteGuard: hết hạn chặn mọi thao tác ghi kèm lý do", () => {
    const g = computeWriteGuard(makePlan("ADVANCED", { status: "expired" }));
    expect(g.readOnly).toBe(true);
    expect(g.disabled).toBe(true);
    expect(g.reason).toContain("chỉ đọc");
  });

  it("computeWriteGuard: hết hạn mức chỉ chặn thao tác tạo tiêu thụ hạn mức đó", () => {
    const plan = makePlan("BASIC");
    expect(computeWriteGuard(plan, "branches")).toMatchObject({ disabled: true, readOnly: false });
    expect(computeWriteGuard(plan, "accounts").disabled).toBe(false);
    expect(computeWriteGuard(plan).disabled).toBe(false);
  });

  it("<ActionButton> tự vô hiệu hoá kèm vỏ tooltip khi hết hạn", () => {
    setPlan(makePlan("ADVANCED", { status: "expired" }));
    render(<ActionButton>Thêm chi nhánh</ActionButton>);
    const button = screen.getByRole("button", { name: /Thêm chi nhánh/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(screen.getByTestId("action-guard")).toBeTruthy();
  });

  it("<ActionButton> hoạt động bình thường khi gói còn hạn", () => {
    setPlan(makePlan("ADVANCED"));
    render(<ActionButton>Thêm chi nhánh</ActionButton>);
    const button = screen.getByRole("button", { name: /Thêm chi nhánh/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(screen.queryByTestId("action-guard")).toBeNull();
  });

  it("<ActionButton consumes> khoá khi hết hạn mức, vẫn mở với hạn mức còn", () => {
    setPlan(makePlan("BASIC"));
    const a = render(<ActionButton consumes="branches">Thêm chi nhánh</ActionButton>);
    expect((a.getByRole("button") as HTMLButtonElement).disabled).toBe(true);
    a.unmount();
    const b = render(<ActionButton consumes="accounts">Thêm tài khoản</ActionButton>);
    expect((b.getByRole("button") as HTMLButtonElement).disabled).toBe(false);
  });

  it("banner chỉ hiện khi hết hạn", () => {
    setPlan(makePlan("ADVANCED"));
    const a = render(<ReadOnlyBanner />);
    expect(a.queryByTestId("read-only-banner")).toBeNull();
    a.unmount();
    setPlan(makePlan("ADVANCED", { status: "expired" }));
    expect(render(<ReadOnlyBanner />).getByTestId("read-only-banner").textContent).toContain("chỉ đọc");
  });
});
