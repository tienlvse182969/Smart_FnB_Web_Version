import { afterEach, describe, expect, it, vi } from "vitest";
import { describeApiError } from "../../http/errors";
import { accountReal } from "./real";

const respond = (body: unknown, status = 200) =>
  vi.fn().mockImplementation(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
const call = (fn: ReturnType<typeof vi.fn>, i = 0) => {
  const [url, init] = fn.mock.calls[i] as [string, RequestInit];
  return { path: new URL(url).pathname.replace(/^\/api\/v1/, ""), search: new URL(url).searchParams, method: init.method, body: init.body ? JSON.parse(init.body as string) : undefined };
};

const RAW = {
  id: "e1",
  branchId: "b1",
  employeeCode: "CSH-001",
  firstName: "An",
  lastName: "Nguyễn",
  jobTitle: null,
  dateOfBirth: null,
  hireDate: "2026-10-01T00:00:00.000Z",
  status: "ACTIVE",
  user: { id: "u1", email: "an@thu.vn", phone: "0901234567", status: "INACTIVE", role: { code: "CASHIER" } },
};

afterEach(() => vi.unstubAllGlobals());

describe("accountReal — Cashier/Barista của Manager qua /manager/staff* (#24)", () => {
  it("danh sách: GET /manager/staff, trang phẳng, vai trò từ user.role, INACTIVE = chưa kích hoạt, không lastLoginAt", async () => {
    const fn = respond({ items: [RAW, { ...RAW, id: "e2", user: { ...RAW.user, role: { code: "BARISTA" }, status: "ACTIVE" } }], total: 2, page: 1, limit: 100 });
    vi.stubGlobal("fetch", fn);
    const page = await accountReal.listStaff("c", "b", { role: "CASHIER", search: " an " });
    const c = call(fn);
    expect(c).toMatchObject({ path: "/manager/staff", method: "GET" });
    expect(c.search.get("role")).toBe("CASHIER");
    expect(c.search.get("search")).toBe("an");
    expect(c.search.get("limit")).toBe("100");
    expect(page.items.map((s) => `${s.role}/${s.status}`)).toEqual(["CASHIER/INACTIVE", "BARISTA/ACTIVE"]);
    expect(page.items[0]).toMatchObject({ email: "an@thu.vn", phone: "0901234567", employeeCode: "CSH-001", lastLoginAt: null });
    expect(page.pagination).toEqual({ page: 1, limit: 100, total: 2, totalPages: 1 });
  });

  it("tạo: POST /manager/staff, thân đúng ManagerCreateStaffDto — KHÔNG mật khẩu, KHÔNG branchId, ô trống không gửi", async () => {
    const fn = respond({ ...RAW, invitationExpiresAt: "2026-10-12T00:00:00.000Z", emailStatus: "FAILED" }, 201);
    vi.stubGlobal("fetch", fn);
    const r = await accountReal.createStaff("c", "b", { firstName: " An ", lastName: "Nguyễn", email: " an@thu.vn ", role: "CASHIER", employeeCode: " csh-001 " });
    const c = call(fn);
    expect(c).toMatchObject({ path: "/manager/staff", method: "POST" });
    expect(c.body).toEqual({ email: "an@thu.vn", role: "CASHIER", employeeCode: "csh-001", firstName: "An", lastName: "Nguyễn" });
    expect(Object.keys(c.body)).not.toContain("password");
    expect(Object.keys(c.body)).not.toContain("branchId");
    expect(r).toMatchObject({ expiresAt: "2026-10-12T00:00:00.000Z", emailStatus: "FAILED", staff: { id: "e1", status: "INACTIVE" } });
    await accountReal.createStaff("c", "b", { firstName: "B", lastName: "C", email: "b@thu.vn", role: "BARISTA", employeeCode: "B1", phone: "0901234567" });
    expect(call(fn, 1).body.phone).toBe("0901234567");
  });

  it("tạo: 409 email trùng, 409 hạn mức, 400 theo ô → câu tiếng Việt", async () => {
    const run = async (status: number, body: unknown) => {
      vi.stubGlobal("fetch", respond(body, status));
      return accountReal.createStaff("c", "b", { firstName: "A", lastName: "B", email: "a@b.vn", role: "CASHIER", employeeCode: "X" }).catch((e: unknown) => e);
    };
    expect(describeApiError(await run(409, { statusCode: 409, message: "Email, phone or employee code already exists", error: "Conflict" }))).toBe("Email, số điện thoại hoặc mã nhân viên đã tồn tại.");
    const limit = await run(409, { statusCode: 409, error: "PLAN_LIMIT_REACHED", message: "Đã hết hạn mức tài khoản. Liên hệ Owner để nâng gói." });
    expect(limit).toMatchObject({ status: 409, code: "PLAN_LIMIT_REACHED", method: "POST" });
    expect(describeApiError(limit)).toMatch(/Đã hết hạn mức tài khoản/);
    expect(describeApiError(await run(409, { statusCode: 409, message: "Subscription is not active", error: "Conflict" }))).toMatch(/không còn hiệu lực/);
    expect(describeApiError(await run(400, { statusCode: 400, message: ["employeeCode must be shorter than or equal to 50 characters", "email must be an email"], error: "Bad Request" }))).toBe("Mã nhân viên tối đa 50 ký tự; Email không hợp lệ.");
  });

  it("sửa: PATCH /manager/staff/:id chỉ gửi họ tên và điện thoại; không bao giờ gửi null", async () => {
    const fn = respond(RAW);
    vi.stubGlobal("fetch", fn);
    await accountReal.updateStaff("c", "b", "e1", { firstName: "Bình", lastName: "Trần", phone: "0912345678" });
    expect(call(fn)).toMatchObject({ path: "/manager/staff/e1", method: "PATCH", body: { firstName: "Bình", lastName: "Trần", phone: "0912345678" } });
    await accountReal.updateStaff("c", "b", "e1", { firstName: "Bình", lastName: "Trần", phone: null });
    expect(call(fn, 1).body).toEqual({ firstName: "Bình", lastName: "Trần" });
  });

  it("khoá / mở khoá: PATCH /manager/staff/:id/status {status, reason}; thiếu lý do thì KHÔNG gửi request", async () => {
    const fn = respond(RAW);
    vi.stubGlobal("fetch", fn);
    await accountReal.setStaffActive("c", "b", "e1", false, "  Nghỉ việc  ");
    expect(call(fn)).toMatchObject({ path: "/manager/staff/e1/status", method: "PATCH", body: { status: "SUSPENDED", reason: "Nghỉ việc" } });
    await accountReal.setStaffActive("c", "b", "e1", true, "Quay lại làm");
    expect(call(fn, 1).body).toEqual({ status: "ACTIVE", reason: "Quay lại làm" });
    await expect(accountReal.setStaffActive("c", "b", "e1", false)).rejects.toMatchObject({ status: 400 });
    await expect(accountReal.setStaffActive("c", "b", "e1", false, "ab")).rejects.toMatchObject({ status: 400 });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("gửi lại email: POST /manager/staff/:id/reset-password {reason}, trả hạn và trạng thái gửi; thiếu lý do thì không gửi", async () => {
    const fn = respond({ message: "queued", employeeId: "e1", expiresAt: "2026-10-12T00:00:00.000Z", emailStatus: "SENT" });
    vi.stubGlobal("fetch", fn);
    const r = await accountReal.resetStaffPassword("c", "b", "e1", "Nhân viên báo không nhận được thư");
    expect(call(fn)).toMatchObject({ path: "/manager/staff/e1/reset-password", method: "POST", body: { reason: "Nhân viên báo không nhận được thư" } });
    expect(r).toEqual({ expiresAt: "2026-10-12T00:00:00.000Z", emailStatus: "SENT" });
    await expect(accountReal.resetStaffPassword("c", "b", "e1", "")).rejects.toMatchObject({ status: 400 });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
