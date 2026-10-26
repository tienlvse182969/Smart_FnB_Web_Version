import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, describeApiError, isReadOnlyError, readOnlyText, setReadOnlyTextResolver } from "../api";
import { buildFeatures } from "../api/modules/plan/source";
import { PLAN_RELOAD_COOLDOWN_MS, resetPlanReloadGuard } from "../store/slices/plan";
import { useAppStore } from "../store";
import type { PlanInfo, RoleKey } from "../types";
import ExpiringBanner from "./ExpiringBanner";
import { bumpPlanClock, useTrialState } from "./planClock";
import ReadOnlyBanner from "./ReadOnlyBanner";
import TrialBadge, { isAwaitingPayment } from "./TrialBadge";
import { TRIAL_EXPIRED_MANAGER, TRIAL_EXPIRED_OWNER, trialExpiredText } from "./trial";
import { computeWriteGuard } from "./useReadOnly";

vi.stubGlobal(
  "matchMedia",
  (query: string) => ({ matches: false, media: query, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined }),
);

const HOUR = 3_600_000;
const NOW = Date.parse("2026-10-13T15:00:00.000Z"); // 22:00 ngày 13/10 giờ VN
const iso = (ms: number) => new Date(ms).toISOString();

function trialPlan(over: Partial<PlanInfo> = {}): PlanInfo {
  return {
    chainId: "c1",
    planCode: "TRIAL",
    tier: "BASIC",
    planName: "Dùng thử 14 ngày",
    status: "active",
    expiresAt: iso(NOW + 10 * 24 * HOUR),
    limits: [],
    features: buildFeatures("BASIC"),
    source: { limits: "real", features: "real" },
    ...over,
  };
}

const setState = (plan: PlanInfo | null, role: RoleKey = "owner", chainId: string | null = "c1") =>
  act(() => {
    useAppStore.setState({ plan, chainId, scopeStatus: "ready", currentUser: { id: "u", name: "U", role, email: "u@x", tenantId: "c1" } as never });
  });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  resetPlanReloadGuard();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  setReadOnlyTextResolver(null);
  act(() => useAppStore.setState({ plan: null, chainId: null, scopeStatus: "idle", currentUser: null }));
});

const badge = (path = "/owner/plan") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <TrialBadge />
    </MemoryRouter>,
  );

describe("<TrialBadge> (Owner)", () => {
  it("còn nhiều ngày: 'Dùng thử · còn X ngày' màu info, bấm tới Gói của tôi", () => {
    setState(trialPlan({ expiresAt: "2026-10-23T02:00:00.000Z" }));
    badge();
    const el = screen.getByTestId("trial-badge");
    expect(el.textContent).toBe("Dùng thử · còn 10 ngày");
    expect(el.getAttribute("data-tone")).toBe("info");
    expect(el.getAttribute("href")).toBe("/owner/plan");
  });

  it("còn ≤ 3 ngày: đổi sang warning; vẫn đọc được bằng chữ", () => {
    setState(trialPlan({ expiresAt: "2026-10-15T02:00:00.000Z" }));
    badge();
    expect(screen.getByTestId("trial-badge").textContent).toBe("Dùng thử · còn 2 ngày");
    expect(screen.getByTestId("trial-badge").getAttribute("data-tone")).toBe("warning");
  });

  it("ngày cuối: 'Dùng thử · hết hạn hôm nay' (warning), không bao giờ 'còn 0 ngày'", () => {
    setState(trialPlan({ expiresAt: "2026-10-13T16:59:00.000Z" }));
    badge();
    expect(screen.getByTestId("trial-badge").textContent).toBe("Dùng thử · hết hạn hôm nay");
    expect(screen.getByTestId("trial-badge").textContent).not.toMatch(/0 ngày/);
  });

  it("đã hết: 'Dùng thử đã hết' (error), dù BE chưa báo status expired nhưng mốc đã qua", () => {
    setState(trialPlan({ status: "expired" }));
    badge();
    expect(screen.getByTestId("trial-badge").textContent).toBe("Dùng thử đã hết");
    expect(screen.getByTestId("trial-badge").getAttribute("data-tone")).toBe("error");
  });

  it("tạm ngưng, gói trả phí, đã chuyển gói, chưa có gói → không có nhãn", () => {
    for (const plan of [trialPlan({ status: "suspended" }), trialPlan({ planCode: "BASIC" }), trialPlan({ planCode: "STANDARD", planName: "Tiêu chuẩn" }), trialPlan({ noActivePlan: true }), null]) {
      setState(plan);
      const view = badge();
      expect(screen.queryByTestId("trial-badge")).toBeNull();
      view.unmount();
    }
  });

  it("expiresAt null: chỉ 'Dùng thử', không có số ngày, không NaN", () => {
    setState(trialPlan({ expiresAt: null }));
    badge();
    expect(screen.getByTestId("trial-badge").textContent).toBe("Dùng thử");
  });

  it("gói của chuỗi khác với chuỗi đang chọn thì bỏ qua (đổi chuỗi không để lại nhãn cũ)", () => {
    setState(trialPlan({ chainId: "chuoi-cu" }), "owner", "c1");
    badge();
    expect(screen.queryByTestId("trial-badge")).toBeNull();
    cleanup();
    setState(trialPlan({ chainId: "c1" }), "owner", "c1");
    badge();
    expect(screen.getByTestId("trial-badge")).toBeTruthy();
  });

  it("vừa quay về từ PayOS (webhook chưa về): gói còn TRIAL đã hết nhưng nhãn không nói 'đã hết'", () => {
    setState(trialPlan({ status: "expired" }));
    badge("/owner/plan?checkout=abc");
    expect(screen.getByTestId("trial-badge").textContent).toBe("Đang chờ PayOS xác nhận");
    cleanup();
    badge("/owner/plan?checkout=abc&cancelled=1");
    expect(screen.getByTestId("trial-badge").textContent).toBe("Dùng thử đã hết");
    cleanup();
    badge("/owner/menu?checkout=abc");
    expect(screen.getByTestId("trial-badge").textContent).toBe("Dùng thử đã hết");
  });

  it("isAwaitingPayment chỉ đúng ở /owner/plan có checkout và chưa huỷ", () => {
    expect(isAwaitingPayment("/owner/plan", "?checkout=1")).toBe(true);
    expect(isAwaitingPayment("/owner/plan", "?checkout=1&cancelled=1")).toBe(false);
    expect(isAwaitingPayment("/owner/plan", "")).toBe(false);
    expect(isAwaitingPayment("/owner/branches", "?checkout=1")).toBe(false);
  });
});

describe("nhãn và dải cảnh báo cùng nguồn số ngày", () => {
  it("còn 5 ngày: nhãn và dải cùng nói 5; còn 10 ngày: nhãn có, dải chưa (chỉ ≤ 7 ngày)", () => {
    setState(trialPlan({ expiresAt: "2026-10-18T02:00:00.000Z" }));
    render(
      <MemoryRouter>
        <TrialBadge />
        <ExpiringBanner />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("trial-badge").textContent).toContain("còn 5 ngày");
    expect(screen.getByTestId("expiring-banner").textContent).toContain("còn 5 ngày");
    cleanup();

    setState(trialPlan({ expiresAt: "2026-10-23T02:00:00.000Z" }));
    render(
      <MemoryRouter>
        <TrialBadge />
        <ExpiringBanner />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("trial-badge").textContent).toContain("còn 10 ngày");
    expect(screen.queryByTestId("expiring-banner")).toBeNull();
  });

  it("ngày cuối: dải ghi 'hết hạn trong hôm nay'; Owner có nút Nâng cấp, Manager không có nút và được dặn liên hệ chủ chuỗi", () => {
    setState(trialPlan({ expiresAt: "2026-10-13T16:59:00.000Z" }), "owner");
    render(<ExpiringBanner />);
    expect(screen.getByTestId("expiring-banner").textContent).toContain("hết hạn trong hôm nay");
    expect(screen.getByTestId("upgrade-button").getAttribute("href")).toBe("/owner/plan");
    cleanup();

    setState(trialPlan({ expiresAt: "2026-10-13T16:59:00.000Z" }), "manager");
    render(<ExpiringBanner />);
    expect(screen.queryByTestId("upgrade-button")).toBeNull();
    expect(screen.getByTestId("expiring-banner").textContent).toContain("Liên hệ chủ chuỗi để nâng cấp");
  });

  it("gói trả phí giữ nguyên câu cũ của dải cảnh báo", () => {
    setState(trialPlan({ planCode: "BASIC", expiresAt: "2026-10-18T02:00:00.000Z" }));
    render(<ExpiringBanner />);
    expect(screen.getByTestId("expiring-banner").textContent).toContain("Gói dịch vụ sắp hết hạn: còn 5 ngày");
    expect(screen.queryByTestId("upgrade-button")).toBeNull();
  });
});

describe("<ReadOnlyBanner> với gói dùng thử", () => {
  const expired = () => trialPlan({ status: "expired", expiresAt: "2026-10-12T05:00:00.000Z" });

  it("Owner: câu nâng cấp ở Gói của tôi và nút Nâng cấp", () => {
    setState(expired(), "owner");
    render(<ReadOnlyBanner />);
    const text = screen.getByTestId("read-only-banner").textContent ?? "";
    expect(text).toContain("Dùng thử đã hết vào ngày 12/10/2026 — chế độ chỉ đọc");
    expect(text).toContain(TRIAL_EXPIRED_OWNER);
    expect(screen.getByTestId("upgrade-button")).toBeTruthy();
  });

  it("Manager: liên hệ chủ chuỗi, không có nút", () => {
    setState(expired(), "manager");
    render(<ReadOnlyBanner />);
    expect(screen.getByTestId("read-only-banner").textContent).toContain(TRIAL_EXPIRED_MANAGER);
    expect(screen.queryByTestId("upgrade-button")).toBeNull();
  });

  it("TRIAL bị tạm ngưng: chỉ nói về tạm ngưng, không nhắc dùng thử, không nút nâng cấp", () => {
    setState(trialPlan({ status: "suspended" }), "owner");
    render(<ReadOnlyBanner />);
    const text = screen.getByTestId("read-only-banner").textContent ?? "";
    expect(text).toContain("tạm ngưng");
    expect(text).not.toMatch(/dùng thử/i);
    expect(screen.queryByTestId("upgrade-button")).toBeNull();
  });

  it("gói trả phí hết hạn giữ câu cũ; đã chuyển gói không còn dấu vết dùng thử", () => {
    setState(trialPlan({ planCode: "BASIC", status: "expired", expiresAt: "2026-10-12T05:00:00.000Z" }), "owner");
    render(<ReadOnlyBanner />);
    const text = screen.getByTestId("read-only-banner").textContent ?? "";
    expect(text).toContain("Gói đã hết hạn từ 12/10/2026");
    expect(text).toContain("Liên hệ quản trị nền tảng để gia hạn");
    expect(text).not.toMatch(/dùng thử/i);
  });
});

describe("câu khoá nút và câu lỗi theo vai", () => {
  const expired = trialPlan({ status: "expired", expiresAt: "2026-10-12T05:00:00.000Z" });

  it("computeWriteGuard: tooltip của nút ghi theo vai khi TRIAL hết", () => {
    expect(computeWriteGuard(expired, undefined, "owner").reason).toBe(TRIAL_EXPIRED_OWNER);
    expect(computeWriteGuard(expired, undefined, "manager").reason).toBe(TRIAL_EXPIRED_MANAGER);
    expect(computeWriteGuard(trialPlan({ planCode: "BASIC", status: "expired" }), undefined, "owner").reason).toMatch(/Liên hệ quản trị nền tảng để gia hạn/);
  });

  it("403 'read-only' và 403 'not active' đều là lỗi chỉ đọc, hiện câu tiếng Việt theo vai (không câu tiếng Anh, không 'không đủ quyền')", () => {
    const readOnly = new ApiError(403, "The business subscription is read-only; renew it before making this change");
    const notActive = new ApiError(403, "The business subscription is not active");
    const staffNotActive = new ApiError(403, "Business subscription is not active");
    expect(isReadOnlyError(readOnly) && isReadOnlyError(notActive) && isReadOnlyError(staffNotActive)).toBe(true);
    expect(isReadOnlyError(new ApiError(403, "Only an assigned OWNER can manage this chain"))).toBe(false);

    setReadOnlyTextResolver(() => trialExpiredText(useAppStore.getState().plan, useAppStore.getState().currentUser?.role));
    setState(expired, "owner");
    expect(describeApiError(notActive)).toBe(TRIAL_EXPIRED_OWNER);
    expect(describeApiError(readOnly)).toBe(TRIAL_EXPIRED_OWNER);
    setState(expired, "manager");
    expect(describeApiError(notActive)).toBe(TRIAL_EXPIRED_MANAGER);
    for (const err of [readOnly, notActive]) expect(describeApiError(err)).not.toMatch(/subscription|không đủ quyền/i);
  });

  it("chưa đăng ký hàm theo ngữ cảnh hoặc gói không phải dùng thử → câu chung cũ", () => {
    expect(readOnlyText()).toMatch(/chế độ chỉ đọc/);
    setReadOnlyTextResolver(() => trialExpiredText(useAppStore.getState().plan, "owner"));
    setState(trialPlan({ planCode: "BASIC", status: "expired" }), "owner");
    expect(readOnlyText()).toMatch(/gói hết hạn hoặc tạm ngưng/);
  });
});

describe("tự cập nhật không cần F5", () => {
  it("useTrialState tính lại số ngày khi đồng hồ nhích (qua nửa đêm), không polling", () => {
    setState(trialPlan({ expiresAt: "2026-10-16T02:00:00.000Z" }));
    const { result } = renderHook(() => useTrialState());
    expect(result.current).toEqual({ kind: "active", daysLeft: 3 });
    // Qua nửa đêm VN: 00:30 ngày 14/10 giờ VN = 17:30Z ngày 13.
    vi.setSystemTime(Date.parse("2026-10-13T17:30:00.000Z"));
    expect(result.current).toEqual({ kind: "active", daysLeft: 3 }); // chưa có sự kiện thì chưa vẽ lại
    act(() => bumpPlanClock());
    expect(result.current).toEqual({ kind: "active", daysLeft: 2 });
    // Quá mốc hết hạn.
    vi.setSystemTime(Date.parse("2026-10-16T03:00:00.000Z"));
    act(() => bumpPlanClock());
    expect(result.current).toEqual({ kind: "expired" });
  });

  it("refreshPlanIfStale: mốc đã qua mà gói còn active thì nạp lại gói ĐÚNG MỘT lần (chống lặp), chưa qua mốc thì không nạp", async () => {
    const reload = vi.fn().mockResolvedValue(undefined);
    act(() => useAppStore.setState({ reloadPlan: reload }));
    setState(trialPlan({ expiresAt: iso(NOW + HOUR) }));
    await useAppStore.getState().refreshPlanIfStale();
    expect(reload).not.toHaveBeenCalled();

    setState(trialPlan({ expiresAt: iso(NOW - HOUR), status: "active" }));
    await useAppStore.getState().refreshPlanIfStale();
    await useAppStore.getState().refreshPlanIfStale();
    await useAppStore.getState().refreshPlanIfStale();
    expect(reload).toHaveBeenCalledTimes(1);

    vi.setSystemTime(NOW + PLAN_RELOAD_COOLDOWN_MS + 1);
    await useAppStore.getState().refreshPlanIfStale();
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it("refreshPlanIfStale không làm gì khi BE đã báo expired/suspended hoặc không đọc được hạn", async () => {
    const reload = vi.fn().mockResolvedValue(undefined);
    act(() => useAppStore.setState({ reloadPlan: reload }));
    for (const plan of [trialPlan({ status: "expired", expiresAt: iso(NOW - HOUR) }), trialPlan({ status: "suspended", expiresAt: iso(NOW - HOUR) }), trialPlan({ expiresAt: null })]) {
      setState(plan);
      await useAppStore.getState().refreshPlanIfStale();
    }
    expect(reload).not.toHaveBeenCalled();
  });

  it("refreshPlanAfterReadOnly: 403 lúc ghi mà gói còn active → nạp lại một lần, nhiều 403 liên tiếp không tạo vòng request", async () => {
    const reload = vi.fn().mockResolvedValue(undefined);
    act(() => useAppStore.setState({ reloadPlan: reload }));
    setState(trialPlan());
    await Promise.all([1, 2, 3, 4, 5].map(() => useAppStore.getState().refreshPlanAfterReadOnly()));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("refreshPlanAfterReadOnly: gói đã ghi nhận hết hạn thì không nạp lại", async () => {
    const reload = vi.fn().mockResolvedValue(undefined);
    act(() => useAppStore.setState({ reloadPlan: reload }));
    setState(trialPlan({ status: "expired" }));
    await useAppStore.getState().refreshPlanAfterReadOnly();
    expect(reload).not.toHaveBeenCalled();
  });
});
