import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockControl } from "../../mock/control";
import { setScenario } from "../../mock/scenario";
import { branchMock } from "../branch/mock";
import { mapManager, mapManagerPage, type RawEmployee } from "./mapper";
import { accountMock } from "./mock";
import { accountReal } from "./real";

mockControl.latency = [0, 0];
mockControl.failure = null;

const raw: RawEmployee = {
  id: "e1",
  employeeCode: "MGR-001",
  firstName: "An",
  lastName: "Nguyen",
  branch: { id: "b1", name: "CN Thảo Điền" },
  user: { email: "an@x.vn", status: "ACTIVE", lastLoginAt: "2026-10-01T03:00:00.000Z", role: { code: "MANAGER" } },
};

describe("mapper Manager — whitelist", () => {
  it("chỉ giữ đúng các trường của ManagerAccount", () => {
    const m = mapManager(raw);
    expect(Object.keys(m).sort()).toEqual(["branchId", "branchName", "email", "employeeCode", "id", "lastLoginAt", "name", "status"]);
    expect(m).toMatchObject({ id: "e1", name: "An Nguyen", email: "an@x.vn", status: "ACTIVE", branchId: "b1", branchName: "CN Thảo Điền" });
  });

  it("bỏ mọi trường lạ, kể cả token, mã băm, điện thoại, ngày vào làm", () => {
    const dirty = {
      ...raw,
      jobTitle: "Quản lý",
      hireDate: "2026-01-01",
      phone: "+84901234567",
      passwordHash: "$argon2id$…",
      user: { ...raw.user, id: "u1", phone: "+84901234567", passwordHash: "$argon2id$…", refreshToken: "r.t.k", setupToken: "tok" },
    } as unknown as RawEmployee;
    const text = JSON.stringify(mapManager(dirty));
    expect(text).not.toMatch(/passwordHash|argon|refreshToken|setupToken|token|phone|84901234567|hireDate|jobTitle|"u1"/i);
  });

  it("trạng thái lạ của BE → INACTIVE (không mở nút khoá); chưa từng đăng nhập → null", () => {
    expect(mapManager({ ...raw, user: { ...raw.user, status: "WEIRD", lastLoginAt: null } })).toMatchObject({ status: "INACTIVE", lastLoginAt: null });
    expect(mapManager({ ...raw, user: { ...raw.user, status: "SUSPENDED" } }).status).toBe("SUSPENDED");
  });

  it("trang: giữ nguyên phân trang của BE", () => {
    const page = mapManagerPage({ items: [raw], pagination: { page: 2, limit: 20, total: 21, totalPages: 2 } });
    expect(page.pagination).toEqual({ page: 2, limit: 20, total: 21, totalPages: 2 });
    expect(page.items).toHaveLength(1);
  });
});

describe("accountReal — gọi đúng endpoint /employees của BE", () => {
  beforeEach(() => vi.unstubAllGlobals());
  afterEach(() => vi.unstubAllGlobals());

  const respond = (body: unknown, status = 200) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
  const call = (fn: ReturnType<typeof vi.fn>) => {
    const [url, init] = fn.mock.calls[0] as [string, RequestInit];
    return { url, method: init.method, body: init.body ? JSON.parse(String(init.body)) : undefined };
  };

  it("danh sách: GET /employees?role=MANAGER kèm trang, tìm kiếm, trạng thái, chi nhánh", async () => {
    const fetchMock = respond({ items: [raw], pagination: { page: 2, limit: 20, total: 21, totalPages: 2 } });
    vi.stubGlobal("fetch", fetchMock);
    const page = await accountReal.listManagers("c1", { page: 2, search: " an ", status: "SUSPENDED", branchId: "b1" });
    const { url, method } = call(fetchMock);
    expect(method).toBe("GET");
    const query = new URL(url).searchParams;
    expect(new URL(url).pathname).toMatch(/\/employees$/);
    expect(Object.fromEntries(query)).toEqual({ role: "MANAGER", page: "2", limit: "20", search: "an", status: "SUSPENDED", branchId: "b1" });
    expect(page.items[0].name).toBe("An Nguyen");
  });

  it("khoá = PATCH /employees/{id}/status {status:SUSPENDED}; mở khoá = ACTIVE", async () => {
    const lock = respond({ id: "u", email: "x", status: "SUSPENDED" });
    vi.stubGlobal("fetch", lock);
    await accountReal.setManagerActive("e1", false);
    expect(call(lock)).toMatchObject({ method: "PATCH", body: { status: "SUSPENDED" } });
    expect(call(lock).url).toMatch(/\/employees\/e1\/status$/);
    const unlock = respond({ id: "u", email: "x", status: "ACTIVE" });
    vi.stubGlobal("fetch", unlock);
    await accountReal.setManagerActive("e1", true);
    expect(call(unlock).body).toEqual({ status: "ACTIVE" });
  });

  it("gửi lại email = POST /employees/{id}/reset-password, chỉ trả expiresAt (không token)", async () => {
    const fetchMock = respond({ message: "A password setup link has been sent to the manager", expiresAt: "2026-10-03T00:00:00.000Z", setupToken: "tok" });
    vi.stubGlobal("fetch", fetchMock);
    const notice = await accountReal.resetManagerPassword("e1");
    expect(call(fetchMock)).toMatchObject({ method: "POST" });
    expect(call(fetchMock).url).toMatch(/\/employees\/e1\/reset-password$/);
    expect(notice).toEqual({ expiresAt: "2026-10-03T00:00:00.000Z" });
  });

  it("chuyển chi nhánh = PATCH /employees/{id}/branch {branchId}", async () => {
    const fetchMock = respond(raw);
    vi.stubGlobal("fetch", fetchMock);
    await accountReal.reassignManager("e1", "b2");
    expect(call(fetchMock)).toMatchObject({ method: "PATCH", body: { branchId: "b2" } });
    expect(call(fetchMock).url).toMatch(/\/employees\/e1\/branch$/);
  });

  it("tạo Manager ở chế độ real bị từ chối 501 và KHÔNG gửi request nào (chờ BE #23)", async () => {
    const fetchMock = respond({});
    vi.stubGlobal("fetch", fetchMock);
    await expect(accountReal.createManager("c1", "b1", "A", "a@x.vn")).rejects.toMatchObject({ status: 501, message: expect.stringContaining("#23") });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("accountMock — Manager", () => {
  let chainId = "";
  beforeEach(async () => {
    setScenario({ profile: "A", tier: null, expired: false });
    chainId = (await branchMock.listChains())[0].id;
  });

  it("danh sách phân trang, tìm kiếm, lọc theo trạng thái; mỗi dòng có tên chi nhánh", async () => {
    const all = await accountMock.listManagers(chainId);
    expect(all.items.length).toBeGreaterThan(0);
    expect(all.items.every((m) => m.branchName && m.branchName !== "—")).toBe(true);
    const one = await accountMock.listManagers(chainId, { limit: 1, page: 1 });
    expect(one.items).toHaveLength(1);
    expect(one.pagination).toMatchObject({ page: 1, limit: 1, total: all.pagination.total });
    const hit = await accountMock.listManagers(chainId, { search: all.items[0].email.slice(0, 6) });
    expect(hit.items.map((m) => m.id)).toContain(all.items[0].id);
    expect((await accountMock.listManagers(chainId, { status: "SUSPENDED" })).items).toHaveLength(0);
  });

  it("khoá/mở khoá đổi trạng thái; gửi lại email chỉ trả expiresAt và không đổi trạng thái; chuyển chi nhánh", async () => {
    const [m] = (await accountMock.listManagers(chainId)).items;
    await accountMock.setManagerActive(m.id, false);
    expect((await accountMock.listManagers(chainId, { status: "SUSPENDED" })).items.map((x) => x.id)).toContain(m.id);
    const notice = await accountMock.resetManagerPassword(m.id);
    expect(Object.keys(notice)).toEqual(["expiresAt"]);
    expect((await accountMock.listManagers(chainId, { status: "SUSPENDED" })).items.map((x) => x.id)).toContain(m.id);
    await accountMock.setManagerActive(m.id, true);
    const branches = (await branchMock.listBranches(chainId)).map((b) => b.id);
    const other = branches.find((b) => b !== m.branchId)!;
    await accountMock.reassignManager(m.id, other);
    expect((await accountMock.listManagers(chainId, { branchId: other })).items.map((x) => x.id)).toContain(m.id);
  });

  it("tạo Manager: INACTIVE (chưa đặt mật khẩu), có thông báo email, không có mật khẩu", async () => {
    const branchId = (await branchMock.listBranches(chainId))[0].id;
    const { account, expiresAt } = await accountMock.createManager(chainId, branchId, "Manager Thử", "thu@mock.local");
    expect(account).toMatchObject({ status: "INACTIVE", email: "thu@mock.local", branchId });
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(JSON.stringify(account)).not.toMatch(/password|mật khẩu/i);
  });
});
