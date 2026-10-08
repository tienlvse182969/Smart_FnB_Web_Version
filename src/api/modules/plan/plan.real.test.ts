import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { describePlan } from "../../../plan/usePlan";
import { computeWriteGuard } from "../../../plan/useReadOnly";
import type { ApiChain, ApiSubscription } from "../../../types";
import { setScenario } from "../../mock/scenario";
import { planReal } from "./real";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const stub = (...responses: Response[]) => {
  const fn = vi.fn();
  responses.forEach((r) => fn.mockResolvedValueOnce(r));
  vi.stubGlobal("fetch", fn);
  return fn;
};
const pathsOf = (fn: ReturnType<typeof vi.fn>) =>
  (fn.mock.calls as [string, RequestInit][]).map(([url, init]) => `${init.method ?? "GET"} ${new URL(url).pathname.replace(/^\/api\/v1/, "")}`);

const SUB = (over: Partial<ApiSubscription> = {}): ApiSubscription => ({
  status: "ACTIVE",
  expiresAt: "2099-12-31T23:59:59.999Z",
  plan: { id: "p", code: "DEMO_OPERATIONS", name: "Demo Operations", description: null, monthlyPrice: "0", maxBranches: 5, maxAccounts: 20, maxTables: 100, brandingEnabled: true, multiBranchComparisonEnabled: true },
  quotas: [
    { resource: "branches", used: 2, limit: 5, remaining: 3 },
    { resource: "accounts", used: 7, limit: 20, remaining: 13 },
    { resource: "tables", used: 8, limit: 100, remaining: 92 },
  ],
  ...over,
});
const chainOf = (subscription: ApiSubscription | null) => ({ id: "c1", subscription }) as unknown as ApiChain;

beforeEach(() => setScenario({ profile: "A", tier: null, expired: false }));
afterEach(() => vi.unstubAllGlobals());

describe("plan real: trạng thái và hạn dùng THẬT (BE de4f55c, #38)", () => {
  it("Owner: đọc status, expiresAt, plan, quotas từ chuỗi đã đọc, KHÔNG gọi thêm request", async () => {
    const fn = stub();
    const plan = await planReal.getPlan("c1", { chains: [chainOf(SUB())] });
    expect(fn).not.toHaveBeenCalled();
    expect(plan).toMatchObject({ planName: "Demo Operations", status: "active", expiresAt: "2099-12-31T23:59:59.999Z", noActivePlan: false });
    expect(plan.limits.map((l) => [l.resource, l.used, l.limit, l.remaining])).toEqual([["branches", 2, 5, 3], ["accounts", 7, 20, 13]]);
    expect(plan.source).toEqual({ limits: "real", features: "real" });
  });

  it("mọi giá trị enum BusinessSubscriptionStatus (ACTIVE, SUSPENDED, EXPIRED) được ánh xạ; EXPIRED/SUSPENDED bật chế độ chỉ đọc", async () => {
    const cases: [string, "active" | "suspended" | "expired", boolean][] = [
      ["ACTIVE", "active", false],
      ["SUSPENDED", "suspended", true],
      ["EXPIRED", "expired", true],
    ];
    for (const [raw, mapped, readOnly] of cases) {
      const plan = await planReal.getPlan("c1", { chains: [chainOf(SUB({ status: raw }))] });
      expect(plan.status).toBe(mapped);
      expect(describePlan(plan).isExpired).toBe(readOnly);
      expect(computeWriteGuard(plan).readOnly).toBe(readOnly);
    }
  });

  it("giá trị status lạ hoặc BE cũ không có status: null, KHÔNG coi là hết hạn", async () => {
    for (const sub of [SUB({ status: "SOMETHING_NEW" }), SUB({ status: undefined, expiresAt: undefined })]) {
      const plan = await planReal.getPlan("c1", { chains: [chainOf(sub)] });
      expect(plan.status).toBeNull();
      expect(describePlan(plan).isExpired).toBe(false);
    }
  });

  it("subscription null (chuỗi chưa có gói): noActivePlan = true", async () => {
    expect((await planReal.getPlan("c1", { chains: [chainOf(null)] })).noActivePlan).toBe(true);
  });

  it("Manager: gọi ĐÚNG GET /restaurant-chains/:chainId/subscription (bọc trong { subscription }), cùng dạng dữ liệu với Owner", async () => {
    const fn = stub(json({ subscription: SUB({ status: "EXPIRED" }) }));
    const plan = await planReal.getPlan("c1");
    expect(pathsOf(fn)).toEqual(["GET /restaurant-chains/c1/subscription"]);
    expect(plan).toMatchObject({ status: "expired", expiresAt: "2099-12-31T23:59:59.999Z", planName: "Demo Operations" });
    expect(plan.limits).toHaveLength(2);
    expect(plan.subscriptionUnavailable).toBeUndefined();
    expect(plan.source.limits).toBe("real");
  });

  it("Manager: BE trả { subscription: null } → noActivePlan", async () => {
    stub(json({ subscription: null }));
    expect((await planReal.getPlan("c1")).noActivePlan).toBe(true);
  });

  it("Manager lỗi đọc (500, 403, mạng): KHÔNG ném lỗi (khu vực vẫn nạp xong), subscriptionUnavailable = true, không báo lỗi toàn cục", async () => {
    for (const make of [() => json({ statusCode: 500, message: "Internal server error" }, 500), () => json({ statusCode: 403, message: "Forbidden" }, 403)]) {
      stub(make());
      const plan = await planReal.getPlan("c1");
      expect(plan.subscriptionUnavailable).toBe(true);
      expect(plan.limits).toEqual([]);
      expect(plan.status).toBeNull();
      expect(plan.expiresAt).toBeNull();
      expect(describePlan(plan).isExpired).toBe(false);
    }
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    expect((await planReal.getPlan("c1")).subscriptionUnavailable).toBe(true);
  });

  it("Manager đạt hạn mức tài khoản → nút Thêm khoá với câu quyết định 54; chưa đạt thì không khoá", async () => {
    const full = SUB({ quotas: [{ resource: "branches", used: 1, limit: 5, remaining: 4 }, { resource: "accounts", used: 20, limit: 20, remaining: 0 }] });
    stub(json({ subscription: full }));
    const plan = await planReal.getPlan("c1");
    const guard = computeWriteGuard(plan, "accounts", "manager");
    expect(guard.disabled).toBe(true);
    expect(guard.reason).toBe("Đã dùng hết tài khoản của gói. Liên hệ chủ chuỗi để nâng gói.");
    expect(computeWriteGuard(plan, "accounts", "owner").reason).toBe("Đã dùng hết tài khoản của gói. Liên hệ quản trị nền tảng để nâng gói.");
    stub(json({ subscription: SUB() }));
    expect(computeWriteGuard(await planReal.getPlan("c1"), "accounts", "manager").disabled).toBe(false);
  });

  it("ô Hết hạn của panel dev (chỉ ở dev) vẫn ép chế độ chỉ đọc ở real, ngày hết hạn vẫn là của BE", async () => {
    setScenario({ expired: true });
    const plan = await planReal.getPlan("c1", { chains: [chainOf(SUB())] });
    expect(plan.status).toBe("expired");
    expect(plan.expiresAt).toBe("2099-12-31T23:59:59.999Z");
  });
});
