/**
 * Lượt 7.8 (QĐ 132): dải cảnh báo gói sắp hết hạn — ngày theo giờ Việt Nam, 7 ngày cuối, không hiện khi đã hết hạn/tạm ngưng.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { daysUntilExpiry, expiringSoonDays } from "./expiry";
import ExpiringBanner from "./ExpiringBanner";
import { useAppStore } from "../store";

vi.stubGlobal(
  "matchMedia",
  (query: string) => ({ matches: false, media: query, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined }),
);

// 2026-10-13 22:00 giờ VN = 2026-10-13T15:00Z.
const NOW = Date.parse("2026-10-13T15:00:00.000Z");

describe("daysUntilExpiry (ngày theo giờ VN)", () => {
  it("cuối ngày VN hôm nay là còn 0 ngày, dù UTC đã sang ngày khác", () => {
    // 23:59 ngày 13/10 giờ VN = 16:59Z cùng ngày.
    expect(daysUntilExpiry("2026-10-13T16:59:00.000Z", NOW)).toBe(0);
    // 00:30 ngày 14/10 giờ VN = 17:30Z ngày 13 (UTC vẫn là ngày 13): phải là ngày 14 → còn 1 ngày.
    expect(daysUntilExpiry("2026-10-13T17:30:00.000Z", NOW)).toBe(1);
  });

  it("đếm theo ngày lịch, không theo 24 giờ", () => {
    expect(daysUntilExpiry("2026-10-20T02:00:00.000Z", NOW)).toBe(7); // 09:00 ngày 20/10 VN
    expect(daysUntilExpiry("2026-10-21T02:00:00.000Z", NOW)).toBe(8);
    expect(daysUntilExpiry("2026-10-12T02:00:00.000Z", NOW)).toBe(-1);
  });

  it("thiếu hoặc sai hạn → null", () => {
    expect(daysUntilExpiry(null, NOW)).toBeNull();
    expect(daysUntilExpiry("không phải ngày", NOW)).toBeNull();
  });
});

describe("expiringSoonDays", () => {
  it("chỉ 0–7 ngày và gói còn hoạt động", () => {
    expect(expiringSoonDays({ status: "active", expiresAt: "2026-10-20T02:00:00.000Z", now: NOW })).toBe(7);
    expect(expiringSoonDays({ status: "active", expiresAt: "2026-10-21T02:00:00.000Z", now: NOW })).toBeNull();
    expect(expiringSoonDays({ status: "active", expiresAt: "2026-10-12T02:00:00.000Z", now: NOW })).toBeNull();
    expect(expiringSoonDays({ status: "expired", expiresAt: "2026-10-15T02:00:00.000Z", now: NOW })).toBeNull();
    expect(expiringSoonDays({ status: "suspended", expiresAt: "2026-10-15T02:00:00.000Z", now: NOW })).toBeNull();
  });

  it("status null (real chưa trả) mà có hạn thì vẫn báo", () => {
    expect(expiringSoonDays({ status: null, expiresAt: "2026-10-15T02:00:00.000Z", now: NOW })).toBe(2);
  });
});

describe("ExpiringBanner", () => {
  const setPlan = (status: string, expiresAt: string | null) =>
    act(() => useAppStore.setState({ plan: { chainId: "c", tier: "STANDARD", planName: "Demo", status, expiresAt, limits: [], features: {}, source: { limits: "real", features: "real" } } as never }));
  afterEach(() => act(() => useAppStore.setState({ plan: null })));

  it("còn 3 ngày: hiện số ngày, ngày hết hạn dd/MM/yyyy và hướng dẫn gia hạn", () => {
    setPlan("active", "2026-10-16T02:00:00.000Z");
    render(<ExpiringBanner now={NOW} />);
    const text = screen.getByTestId("expiring-banner").textContent ?? "";
    expect(text).toMatch(/còn 3 ngày/);
    expect(text).toMatch(/16\/10\/2026/);
    expect(text).toMatch(/gia hạn/);
  });

  it("hạn trong hôm nay: 'hết hạn trong hôm nay'", () => {
    setPlan("active", "2026-10-13T16:00:00.000Z");
    render(<ExpiringBanner now={NOW} />);
    expect(screen.getByTestId("expiring-banner").textContent).toMatch(/hết hạn trong hôm nay/);
  });

  it("còn 8 ngày, đã hết hạn hoặc tạm ngưng: không hiện", () => {
    for (const [status, at] of [["active", "2026-10-21T02:00:00.000Z"], ["expired", "2026-10-15T02:00:00.000Z"], ["suspended", "2026-10-15T02:00:00.000Z"]] as const) {
      setPlan(status, at);
      const { unmount } = render(<ExpiringBanner now={NOW} />);
      expect(screen.queryByTestId("expiring-banner")).toBeNull();
      unmount();
    }
  });
});
