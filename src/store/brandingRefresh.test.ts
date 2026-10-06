import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setApiErrorHandler } from "../api/http/errors";
import { mockControl } from "../api/mock/control";
import { setScenario } from "../api/mock/scenario";
import { branchMock } from "../api/modules/branch/mock";
import { BRANDING_REFRESH_INTERVAL_MS } from "./slices/branding";
import type { Branding } from "../types";
import { useAppStore } from ".";

mockControl.latency = [0, 0];

const stale: Branding = { tenantId: "c1", displayName: "Bản cũ", primaryColor: "stale", accentColor: "stale", isCustom: false };

describe("nạp lại nhận diện khi điều hướng (quyết định 29)", () => {
  let chainId = "";
  const NOW = 1_000_000;
  beforeEach(async () => {
    mockControl.failure = null;
    setScenario({ profile: "A", tier: "STANDARD", expired: false });
    chainId = (await branchMock.listChains())[0].id;
    useAppStore.setState({
      chainId,
      chainName: "Chuỗi",
      currentUser: { id: "u", name: "M", email: "m@x", role: "manager", tenantId: chainId, branchId: null } as never,
      scopeStatus: "ready",
      tenantBranding: stale,
      brandingFetchedAt: 0,
    });
  });
  afterEach(() => {
    mockControl.failure = null;
    setApiErrorHandler(null);
  });

  it("lần đầu gọi BE và áp bản mới; trong 60 giây KHÔNG gọi lại; quá 60 giây gọi lại", async () => {
    const { refreshBrandingOnNavigate } = useAppStore.getState();
    expect(await refreshBrandingOnNavigate("/manager/menu", NOW)).toBe(true);
    expect(useAppStore.getState().tenantBranding).not.toBe(stale);
    expect(useAppStore.getState().brandingFetchedAt).toBe(NOW);
    expect(await refreshBrandingOnNavigate("/manager/staff", NOW + BRANDING_REFRESH_INTERVAL_MS - 1)).toBe(false);
    expect(await refreshBrandingOnNavigate("/manager/stations", NOW + 30_000)).toBe(false);
    expect(await refreshBrandingOnNavigate("/manager/staff", NOW + BRANDING_REFRESH_INTERVAL_MS)).toBe(true);
    expect(useAppStore.getState().brandingFetchedAt).toBe(NOW + BRANDING_REFRESH_INTERVAL_MS);
  });

  it("nạp trùng khoảng 60 giây chỉ đúng 1 lệnh dù điều hướng liên tiếp", async () => {
    const { refreshBrandingOnNavigate } = useAppStore.getState();
    const results = await Promise.all(["/a", "/b", "/c"].map((p, i) => refreshBrandingOnNavigate(p, NOW + i)));
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("lỗi khi nạp lại: im lặng — giữ bản cũ, không ném, không báo toàn cục (không toast), vẫn tính là đã thử", async () => {
    const handler = vi.fn();
    setApiErrorHandler(handler);
    mockControl.failure = { kind: "server", rate: 1 };
    const { refreshBrandingOnNavigate } = useAppStore.getState();
    await expect(refreshBrandingOnNavigate("/manager/menu", NOW)).resolves.toBe(true);
    expect(useAppStore.getState().tenantBranding).toBe(stale);
    expect(handler).not.toHaveBeenCalled();
    // lỗi mạng cũng im lặng
    mockControl.failure = { kind: "network", rate: 1 };
    await expect(refreshBrandingOnNavigate("/manager/staff", NOW + BRANDING_REFRESH_INTERVAL_MS)).resolves.toBe(true);
    expect(useAppStore.getState().tenantBranding).toBe(stale);
    expect(handler).not.toHaveBeenCalled();
  });

  it("Admin, /login, /setup-password, chưa sẵn sàng hoặc chưa có chuỗi: không nạp", async () => {
    const { refreshBrandingOnNavigate } = useAppStore.getState();
    expect(await refreshBrandingOnNavigate("/login", NOW)).toBe(false);
    expect(await refreshBrandingOnNavigate("/setup-password", NOW)).toBe(false);
    useAppStore.setState({ scopeStatus: "loading" });
    expect(await refreshBrandingOnNavigate("/manager/menu", NOW)).toBe(false);
    useAppStore.setState({ scopeStatus: "ready", chainId: null });
    expect(await refreshBrandingOnNavigate("/manager/menu", NOW)).toBe(false);
    useAppStore.setState({ chainId, currentUser: { id: "a", name: "A", email: "a@x", role: "admin", tenantId: null, branchId: null } as never });
    expect(await refreshBrandingOnNavigate("/admin/overview", NOW)).toBe(false);
    expect(useAppStore.getState().tenantBranding).toBe(stale);
  });
});
