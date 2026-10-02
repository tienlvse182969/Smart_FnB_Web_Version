import { afterEach, describe, expect, it, vi } from "vitest";
import { mapStaff, type RawEmployee } from "./mapper";
import { accountReal } from "./real";

const emp = (id: string, role: string, extra: Record<string, unknown> = {}): RawEmployee =>
  ({
    id,
    employeeCode: `E-${id}`,
    firstName: "Lan",
    lastName: "Thu ngân",
    branch: { id: "b1", name: "CN Nguyễn Huệ" },
    user: { email: `${id}@x.vn`, status: "ACTIVE", lastLoginAt: null, role: { code: role } },
    ...extra,
  }) as RawEmployee;

describe("Owner xem Cashier/Barista (OW-05) — mapper whitelist", () => {
  it("chỉ giữ trường cần, có vai trò Cashier/Barista, KHÔNG có lastLoginAt", () => {
    const s = mapStaff(emp("e1", "CASHIER"))!;
    expect(Object.keys(s).sort()).toEqual(["branchId", "branchName", "email", "employeeCode", "id", "name", "role", "status"]);
    expect(s).toMatchObject({ role: "Cashier", name: "Lan Thu ngân", branchName: "CN Nguyễn Huệ", status: "ACTIVE" });
    expect(mapStaff(emp("e2", "BARISTA"))!.role).toBe("Barista");
  });

  it("vai trò khác (Manager, Waiter, Kitchen) bị bỏ; trường lạ không lọt", () => {
    for (const role of ["MANAGER", "WAITER", "KITCHEN"]) expect(mapStaff(emp("x", role))).toBeNull();
    const dirty = emp("e3", "CASHIER", { passwordHash: "$argon2id$", phone: "+84901234567", user: { email: "a@x.vn", status: "ACTIVE", lastLoginAt: null, role: { code: "CASHIER" }, refreshToken: "tok" } });
    expect(JSON.stringify(mapStaff(dirty))).not.toMatch(/argon|passwordHash|phone|84901234567|refreshToken|tok/);
  });
});

describe("accountReal.listStaffAccounts — GET /employees cho CASHIER và BARISTA", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("gọi hai vai trò, đi hết các trang, chỉ GET", async () => {
    const calls: { url: string; method?: string }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        calls.push({ url, method: init?.method });
        const u = new URL(url);
        const role = u.searchParams.get("role")!;
        const page = Number(u.searchParams.get("page"));
        const items = role === "CASHIER" ? [emp(`c${page}`, "CASHIER")] : [emp("b1", "BARISTA")];
        const totalPages = role === "CASHIER" ? 2 : 1;
        return new Response(JSON.stringify({ items, pagination: { page, limit: 100, total: items.length, totalPages } }), { status: 200, headers: { "Content-Type": "application/json" } });
      }),
    );
    const list = await accountReal.listStaffAccounts("c");
    expect(list.map((s) => `${s.role}:${s.id}`)).toEqual(["Cashier:c1", "Cashier:c2", "Barista:b1"]);
    expect(calls.every((c) => (c.method ?? "GET") === "GET")).toBe(true);
    expect(calls.map((c) => new URL(c.url).searchParams.get("role") + "/" + new URL(c.url).searchParams.get("page"))).toEqual(["CASHIER/1", "CASHIER/2", "BARISTA/1"]);
  });
});
