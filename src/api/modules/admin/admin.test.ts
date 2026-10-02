import { describe, expect, it, vi } from "vitest";
import { mockControl } from "../../mock/control";
import { adminMock } from "./mock";
import { adminReal, MIN_MAX_TABLES } from "./real";
import {
  mapPlan,
  deriveSubscriptionState,
  mapBusiness,
  mapPage,
  mapRegistration,
  mapRegistrationDetail,
  type RawBusiness,
  type RawRegistration,
} from "./mapper";

mockControl.latency = [0, 0];
mockControl.failure = null;

const WALLET_KEY = /wallet|balance|heldbalance/i;

/** Duyệt toàn bộ khoá (sâu) của một giá trị: trả các khoá nhìn giống dữ liệu ví. */
function walletKeys(value: unknown, path = ""): string[] {
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => [
    ...(WALLET_KEY.test(key) ? [`${path}${key}`] : []),
    ...walletKeys(child, `${path}${key}.`),
  ]);
}

const plan = {
  id: "p1",
  code: "ADVANCED",
  name: "Nâng cao",
  description: null,
  monthlyPrice: "1200000.00",
  maxBranches: 10,
  maxAccounts: 80,
  maxTables: 40,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

// Hình dạng đúng như `businessBaseSelect()` + `addBusinessUsage()` của BE — CÓ ví.
const rawBusiness: RawBusiness = {
  id: "b1",
  code: "BIZ1",
  name: "Cà Phê Mộc",
  taxCode: "0312345678",
  status: "ACTIVE",
  createdAt: "2026-03-01T00:00:00.000Z",
  registrationApplication: {
    representativeName: "Nguyễn A",
    representativeEmail: "a@x.vn",
    representativePhone: "0900000000",
  },
  subscription: {
    status: "ACTIVE",
    monthlyPrice: "1200000.00",
    startsAt: "2026-03-01T00:00:00.000Z",
    expiresAt: "2099-01-01T00:00:00.000Z",
    suspendedAt: null,
    plan,
    events: [{ id: "e1", type: "CREATED" }],
  },
  wallet: { id: "w1", currency: "VND", balance: "98765432.00", heldBalance: "1234.00", status: "ACTIVE" },
  ownerAssignments: [
    {
      owner: {
        id: "o1",
        ownerCode: "OWN1",
        firstName: "Nguyễn",
        lastName: "A",
        user: { id: "u1", email: "a@x.vn", phone: "0900000000", status: "ACTIVE" },
      },
    },
  ],
  usage: { branchCount: 3, accountCount: 14, tableCount: 20, monthlyOrderCount: 2310 },
};

// Hình dạng đúng như `getRegistrationApplication()` — approvedChain có `wallet`.
const rawRegistration: RawRegistration = {
  id: "r1",
  applicationCode: "APP-1",
  businessName: "Trà Đạo",
  taxCode: null,
  representativeName: "Chi",
  representativeEmail: "chi@x.vn",
  representativePhone: "0911111111",
  headquartersAddress: "12 Nguyễn Trãi",
  status: "APPROVED",
  rejectionReason: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  reviewedAt: "2026-09-02T00:00:00.000Z",
  requestedPlan: plan,
  reviewedBy: { id: "admin1", email: "admin@x.vn" },
  ownerUser: { id: "u2", email: "chi@x.vn" },
  approvedChain: {
    id: "c1",
    code: "CHAIN1",
    name: "Trà Đạo",
    status: "ACTIVE",
    subscription: { status: "ACTIVE", monthlyPrice: "1200000.00", startsAt: "2026-09-02T00:00:00.000Z", expiresAt: "2026-10-02T00:00:00.000Z", plan },
    wallet: { id: "w2", currency: "VND", balance: "5550000.00", heldBalance: "777.00" },
    branding: { primaryColor: "x" },
  },
};

describe("mapper — BR-07: không để dữ liệu ví lọt vào web", () => {
  it("fixture đầu vào thật sự có dữ liệu ví", () => {
    expect(walletKeys(rawBusiness).length).toBeGreaterThan(0);
    expect(walletKeys(rawRegistration).length).toBeGreaterThan(0);
  });

  it("doanh nghiệp: kết quả không còn khoá hay giá trị ví nào", () => {
    const mapped = mapBusiness(rawBusiness);
    expect(walletKeys(mapped)).toEqual([]);
    const json = JSON.stringify(mapped);
    expect(json).not.toContain("98765432");
    expect(json).not.toContain("1234.00");
  });

  it("chi tiết hồ sơ: kết quả không còn ví", () => {
    const mapped = mapRegistrationDetail(rawRegistration);
    expect(walletKeys(mapped)).toEqual([]);
    expect(JSON.stringify(mapped)).not.toContain("5550000");
    expect(JSON.stringify(mapRegistration(rawRegistration))).not.toMatch(WALLET_KEY);
  });

  it("danh sách phân trang: map từng phần tử, không ví", () => {
    const page = mapPage({ items: [rawBusiness], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } }, (b) => mapBusiness(b));
    expect(page.pagination.total).toBe(1);
    expect(walletKeys(page)).toEqual([]);
  });

  it("whitelist: trường lạ của BE không được chép sang", () => {
    const withExtra = { ...rawBusiness, internalNote: "bí mật" } as RawBusiness;
    expect(JSON.stringify(mapBusiness(withExtra))).not.toContain("bí mật");
    expect(Object.keys(mapBusiness(rawBusiness)).sort()).toEqual(
      ["code", "createdAt", "id", "name", "owners", "representativeEmail", "representativeName", "representativePhone", "subscription", "taxCode", "usage"].sort(),
    );
  });
});

describe("mapper — dữ liệu", () => {
  it("tiền đi qua parseAmount (chuỗi thập phân → số)", () => {
    const b = mapBusiness(rawBusiness);
    expect(b.subscription?.monthlyPrice).toBe(1_200_000);
    expect(b.subscription?.plan.monthlyPrice).toBe(1_200_000);
  });

  it("owner có id để đặt lại mật khẩu, tên ghép từ họ tên; bỏ tableCount", () => {
    const b = mapBusiness(rawBusiness);
    expect(b.owners).toEqual([{ id: "o1", ownerCode: "OWN1", name: "Nguyễn A", email: "a@x.vn" }]);
    expect(b.usage).toEqual({ branchCount: 3, accountCount: 14, monthlyOrderCount: 2310 });
  });

  it("hồ sơ đã duyệt có thông tin doanh nghiệp đã tạo và email Owner", () => {
    const d = mapRegistrationDetail(rawRegistration);
    expect(d.approved).toMatchObject({ chainCode: "CHAIN1", planName: "Nâng cao", ownerEmail: "chi@x.vn" });
    expect(d.reviewedByEmail).toBe("admin@x.vn");
  });
});

describe("trạng thái thuê bao — BE chưa ghi EXPIRED nên web tự tính", () => {
  const now = new Date("2026-10-01T00:00:00.000Z");
  it("ACTIVE nhưng quá hạn → expired", () => {
    expect(deriveSubscriptionState("ACTIVE", "2026-09-30T00:00:00.000Z", now)).toBe("expired");
  });
  it("ACTIVE còn hạn → active", () => {
    expect(deriveSubscriptionState("ACTIVE", "2026-10-02T00:00:00.000Z", now)).toBe("active");
  });
  it("SUSPENDED giữ nguyên dù quá hạn hay chưa", () => {
    expect(deriveSubscriptionState("SUSPENDED", "2026-09-01T00:00:00.000Z", now)).toBe("suspended");
    expect(deriveSubscriptionState("SUSPENDED", "2027-01-01T00:00:00.000Z", now)).toBe("suspended");
  });
  it("EXPIRED của BE (nếu có) → expired", () => {
    expect(deriveSubscriptionState("EXPIRED", "2027-01-01T00:00:00.000Z", now)).toBe("expired");
  });
});

describe("mock admin — cùng shape và quy tắc với BE, không ví", () => {
  it("danh sách hồ sơ phân trang, lọc trạng thái, tìm kiếm", async () => {
    const all = await adminMock.listRegistrations({ page: 1, limit: 2 });
    expect(all.items).toHaveLength(2);
    expect(all.pagination).toMatchObject({ page: 1, limit: 2 });
    expect(all.pagination.totalPages).toBe(Math.ceil(all.pagination.total / 2));
    const pending = await adminMock.listRegistrations({ status: "PENDING", limit: 100 });
    expect(pending.items.every((r) => r.status === "PENDING")).toBe(true);
    const found = await adminMock.listRegistrations({ search: "rang xay", limit: 100 });
    expect(found.items.map((r) => r.businessName)).toEqual(["Cà Phê Rang Xay Hùng"]);
    expect(walletKeys(all)).toEqual([]);
  });

  it("duyệt: ngày hết hạn = hôm nay + số tháng, sinh doanh nghiệp + Owner; không duyệt lại được", async () => {
    const before = (await adminMock.listBusinesses({ limit: 100 })).pagination.total;
    const app = (await adminMock.listRegistrations({ status: "PENDING", limit: 1 })).items[0];
    const planId = (await adminMock.listPlans()).find((p) => p.isActive)!.id;
    const done = await adminMock.approveRegistration(app.id, { planId, subscriptionMonths: 3 });
    expect(done.status).toBe("APPROVED");
    expect(done.approved?.ownerEmail).toBe(app.representativeEmail);
    const months = (new Date(done.approved!.expiresAt!).getTime() - Date.now()) / (86_400_000 * 30);
    expect(months).toBeGreaterThan(2.8);
    expect(months).toBeLessThan(3.2);
    expect((await adminMock.listBusinesses({ limit: 100 })).pagination.total).toBe(before + 1);
    await expect(adminMock.approveRegistration(app.id, { planId, subscriptionMonths: 1 })).rejects.toMatchObject({ status: 409 });
    await expect(adminMock.approveRegistration("mock-app-2", { planId, subscriptionMonths: 61 })).rejects.toMatchObject({ status: 400 });
  });

  it("từ chối bắt buộc lý do", async () => {
    const app = (await adminMock.listRegistrations({ status: "PENDING", limit: 1 })).items[0];
    await expect(adminMock.rejectRegistration(app.id, "  ")).rejects.toMatchObject({ status: 400 });
    const rejected = await adminMock.rejectRegistration(app.id, "Thiếu giấy phép");
    expect(rejected).toMatchObject({ status: "REJECTED", rejectionReason: "Thiếu giấy phép" });
  });

  it("doanh nghiệp: có người đại diện, usage, trạng thái hết hạn tính từ ngày; không ví", async () => {
    const page = await adminMock.listBusinesses({ limit: 100 });
    const expired = page.items.find((b) => b.name === "Nước Ép Tươi Mát")!;
    expect(expired.subscription?.state).toBe("expired");
    expect(page.items.find((b) => b.name === "Cà Phê Muối Đà Lạt")?.subscription?.state).toBe("suspended");
    expect(page.items[0].representativeName).toBeTruthy();
    expect(page.items[0].usage.monthlyOrderCount).toBeGreaterThanOrEqual(0);
    expect(walletKeys(page)).toEqual([]);
    expect((await adminMock.listBusinesses({ search: "mộc" })).items.length).toBeGreaterThan(0);
  });

  it("gia hạn cộng từ ngày hết hạn nếu còn hạn, từ hôm nay nếu đã hết", async () => {
    const live = (await adminMock.listBusinesses({ limit: 100 })).items.find((b) => b.name === "Cà Phê Mộc Nhà")!;
    const renewed = await adminMock.renewBusiness(live.id, { months: 2 });
    const diff = new Date(renewed.subscription!.expiresAt).getTime() - new Date(live.subscription!.expiresAt).getTime();
    expect(diff / 86_400_000).toBeGreaterThan(55);
    const dead = (await adminMock.listBusinesses({ limit: 100 })).items.find((b) => b.name === "Nước Ép Tươi Mát")!;
    const back = await adminMock.renewBusiness(dead.id, { months: 1 });
    expect(back.subscription?.state).toBe("active");
    expect(new Date(back.subscription!.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("đổi gói: hướng phải khớp giá; hạ gói khi vượt hạn mức → 409 (lệch BR-11)", async () => {
    const items = (await adminMock.listBusinesses({ limit: 100 })).items;
    const biz = items.find((b) => b.name === "Sinh Tố Cô Hoa")!; // Nâng cao, 8 chi nhánh
    const plans = await adminMock.listPlans();
    const basic = plans.find((p) => p.code === "BASIC")!;
    const standard = plans.find((p) => p.code === "STANDARD")!;
    await expect(adminMock.changeBusinessPlan(biz.id, { planId: basic.id, direction: "UPGRADE" })).rejects.toMatchObject({ status: 400 });
    await expect(adminMock.changeBusinessPlan(biz.id, { planId: basic.id, direction: "DOWNGRADE" })).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining("exceeds"),
    });
    const small = items.find((b) => b.name === "Cà Phê Phố Cổ")!; // Cơ bản, 1 chi nhánh
    const up = await adminMock.changeBusinessPlan(small.id, { planId: standard.id, direction: "UPGRADE" });
    expect(up.subscription?.plan.code).toBe("STANDARD");
  });

  it("tạm ngưng / kích hoạt lại; kích hoạt khi đã hết hạn phải gia hạn trước", async () => {
    const items = (await adminMock.listBusinesses({ limit: 100 })).items;
    const biz = items.find((b) => b.name === "Trà Chanh Cô Ba")!;
    const suspended = await adminMock.suspendBusiness(biz.id, "Nợ phí");
    expect(suspended.subscription?.state).toBe("suspended");
    await expect(adminMock.suspendBusiness(biz.id, "lại")).rejects.toMatchObject({ status: 409 });
    expect((await adminMock.reactivateBusiness(biz.id)).subscription?.state).toBe("active");
  });

  it("đặt lại mật khẩu Owner: trả hạn hiệu lực, không có mật khẩu", async () => {
    const biz = (await adminMock.listBusinesses({ limit: 100 })).items[0];
    const result = await adminMock.resetOwnerPassword(biz.owners[0].id);
    expect(Object.keys(result).sort()).toEqual(["expiresAt", "ownerId"]);
    expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
    await expect(adminMock.resetOwnerPassword("không-có")).rejects.toMatchObject({ status: 404 });
  });
});

describe("adminReal — gói dịch vụ khớp DTO của BE dfe8100", () => {
  const respond = (body: unknown) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } }));
  const input = { code: "PRO", name: "Pro", monthlyPrice: 500000, maxBranches: 5, maxAccounts: 30, brandingEnabled: true, multiBranchComparisonEnabled: false, isActive: true };

  it("tạo gói: POST kèm hai cờ bắt buộc và maxTables = giá trị nhỏ nhất BE chấp nhận (không hiện trên form)", async () => {
    const fetchMock = respond({ ...input, id: "p1", description: null, monthlyPrice: "500000.00", maxTables: 1 });
    vi.stubGlobal("fetch", fetchMock);
    const plan = await adminReal.createPlan(input);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new URL(url).pathname).toMatch(/\/admin\/service-plans$/);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toMatchObject({ ...input, maxTables: MIN_MAX_TABLES });
    expect(MIN_MAX_TABLES).toBe(1);
    expect(plan).toMatchObject({ brandingEnabled: true, multiBranchComparisonEnabled: false });
    vi.unstubAllGlobals();
  });

  it("sửa gói: PATCH không gửi maxTables, có gửi hai cờ", async () => {
    const fetchMock = respond({ ...input, id: "p1", description: null, monthlyPrice: "500000.00", maxTables: 7 });
    vi.stubGlobal("fetch", fetchMock);
    await adminReal.updatePlan("p1", input);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new URL(url).pathname).toMatch(/\/admin\/service-plans\/p1$/);
    expect(init.method).toBe("PATCH");
    const body = JSON.parse(String(init.body));
    expect(body).not.toHaveProperty("maxTables");
    expect(body).toMatchObject({ brandingEnabled: true, multiBranchComparisonEnabled: false });
    vi.unstubAllGlobals();
  });

  it("đọc gói: hai cờ từ BE; BE cũ không có cờ thì coi như tắt", () => {
    expect(mapPlan({ ...plan, brandingEnabled: true, multiBranchComparisonEnabled: true })).toMatchObject({ brandingEnabled: true, multiBranchComparisonEnabled: true });
    expect(mapPlan(plan)).toMatchObject({ brandingEnabled: false, multiBranchComparisonEnabled: false });
  });
});
