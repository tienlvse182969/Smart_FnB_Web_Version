import { beforeEach, describe, expect, it } from "vitest";
import type { StaffInput } from "../../../types";
import { ApiError } from "../../http/errors";
import { mockControl } from "../../mock/control";
import { setScenario } from "../../mock/scenario";
import { resetMockStates } from "../../mock/store";
import { branchMock } from "../branch/mock";
import { accountMock } from "./mock";
import { clearPersistedAccounts } from "./persist";
import { describeAccountError, splitName, staffName, validateStaffInput, validateStaffPatch } from "./staffRules";

mockControl.latency = [0, 0];
mockControl.failure = null;

const staffInput = (n: number, over: Partial<StaffInput> = {}): StaffInput => ({
  firstName: "Nhân",
  lastName: `Viên ${n}`,
  email: `nv${n}@thu.vn`,
  role: "CASHIER",
  ...over,
});

describe("luật nhập nhân viên (theo DTO tạo nhân viên của BE)", () => {
  it("họ tên tách thành firstName/lastName và ghép lại", () => {
    expect(splitName("Nguyễn Văn Tú")).toEqual({ firstName: "Nguyễn", lastName: "Văn Tú" });
    expect(splitName("  An ")).toEqual({ firstName: "An", lastName: "" });
    expect(staffName({ firstName: "Nguyễn", lastName: "Văn Tú" })).toBe("Nguyễn Văn Tú");
  });

  it("hợp lệ và từng lỗi: thiếu họ/tên, email sai, điện thoại sai (8–15 số, + đầu), vai trò", () => {
    expect(validateStaffInput(staffInput(1, { phone: "+84901234567" }))).toEqual([]);
    expect(validateStaffInput({ ...staffInput(1), lastName: "" })[0]).toMatch(/họ và tên/);
    expect(validateStaffInput(staffInput(1, { email: "khong-hop-le" }))).toContain("Email không hợp lệ");
    expect(validateStaffInput(staffInput(1, { email: "" }))).toContain("Nhập email đăng nhập");
    for (const bad of ["123", "abc12345678", "+8490123456789012", "09012 34567"]) expect(validateStaffInput(staffInput(1, { phone: bad })).join(), bad).toMatch(/Điện thoại/);
    expect(validateStaffInput({ ...staffInput(1), role: "MANAGER" as never }).join()).toMatch(/vai trò/);
    expect(validateStaffPatch({ firstName: "A", lastName: "" })[0]).toMatch(/họ và tên/);
    expect(validateStaffPatch({ phone: "12" })[0]).toMatch(/Điện thoại/);
    expect(validateStaffPatch({ phone: "0901234567" })).toEqual([]);
  });
});

describe("mock nhân viên của Manager (BM-01, chờ BE #24)", () => {
  let chainId = "";
  let branchIds: string[] = [];
  beforeEach(async () => {
    setScenario({ profile: "A", tier: "ADVANCED", expired: false });
    resetMockStates();
    clearPersistedAccounts();
    chainId = (await branchMock.listChains())[0].id;
    branchIds = (await branchMock.listBranches(chainId)).map((b) => b.id);
  });

  it("chỉ thấy nhân viên chi nhánh mình; Manager không sửa/khoá nhân viên chi nhánh khác (404)", async () => {
    const mine = await accountMock.listStaff(chainId, branchIds[0]);
    const other = await accountMock.listStaff(chainId, branchIds[1]);
    expect(mine.items.length).toBeGreaterThan(0);
    expect(mine.items.every((s) => s.branchId === branchIds[0])).toBe(true);
    expect(mine.items.every((s) => s.role === "CASHIER" || s.role === "BARISTA")).toBe(true);
    const foreign = other.items[0].id;
    await expect(accountMock.setStaffActive(chainId, branchIds[0], foreign, false)).rejects.toMatchObject({ status: 404 });
    await expect(accountMock.updateStaff(chainId, branchIds[0], foreign, { phone: "0901234567" })).rejects.toMatchObject({ status: 404 });
    await expect(accountMock.resetStaffPassword(chainId, branchIds[0], foreign)).rejects.toMatchObject({ status: 404 });
  });

  it("tạo Cashier và Barista: không mật khẩu, trạng thái chờ đặt mật khẩu (INACTIVE), có thông báo email 24 giờ", async () => {
    const cashier = await accountMock.createStaff(chainId, branchIds[0], staffInput(1, { phone: "0901234567" }));
    const barista = await accountMock.createStaff(chainId, branchIds[0], staffInput(2, { role: "BARISTA" }));
    expect(cashier.staff).toMatchObject({ role: "CASHIER", status: "INACTIVE", branchId: branchIds[0], phone: "0901234567", lastLoginAt: null });
    expect(barista.staff.role).toBe("BARISTA");
    expect(JSON.stringify(cashier)).not.toMatch(/password|mật khẩu/i);
    expect(new Date(cashier.expiresAt).getTime() - Date.now()).toBeGreaterThan(23 * 3_600_000);
    const listed = (await accountMock.listStaff(chainId, branchIds[0])).items.map((s) => s.id);
    expect(listed).toEqual(expect.arrayContaining([cashier.staff.id, barista.staff.id]));
  });

  it("email trùng → 409; dữ liệu sai → 400", async () => {
    await accountMock.createStaff(chainId, branchIds[0], staffInput(1));
    await expect(accountMock.createStaff(chainId, branchIds[0], staffInput(9, { email: "NV1@thu.vn" }))).rejects.toMatchObject({ status: 409 });
    await expect(accountMock.createStaff(chainId, branchIds[1], staffInput(10, { email: "owner.a@mock.local" }))).rejects.toMatchObject({ status: 409 }); // trùng tài khoản mẫu
    await expect(accountMock.createStaff(chainId, branchIds[0], staffInput(11, { email: "sai" }))).rejects.toMatchObject({ status: 400 });
  });

  it("sửa họ tên và điện thoại; email và vai trò giữ nguyên", async () => {
    const { staff } = await accountMock.createStaff(chainId, branchIds[0], staffInput(1));
    const updated = await accountMock.updateStaff(chainId, branchIds[0], staff.id, { firstName: "Trần", lastName: "Văn Bình", phone: "0912345678" });
    expect(updated).toMatchObject({ firstName: "Trần", lastName: "Văn Bình", phone: "0912345678", email: staff.email, role: "CASHIER" });
    expect((await accountMock.updateStaff(chainId, branchIds[0], staff.id, { phone: null })).phone).toBeNull();
    await expect(accountMock.updateStaff(chainId, branchIds[0], staff.id, { phone: "abc" })).rejects.toMatchObject({ status: 400 });
  });

  it("khoá rồi mở khoá; gửi lại email chỉ trả hạn link và không đổi trạng thái", async () => {
    const { staff } = await accountMock.createStaff(chainId, branchIds[0], staffInput(1));
    const notice = await accountMock.resetStaffPassword(chainId, branchIds[0], staff.id);
    expect(Object.keys(notice)).toEqual(["expiresAt"]);
    expect((await accountMock.listStaff(chainId, branchIds[0], { search: "nv1@" })).items[0].status).toBe("INACTIVE");
    await accountMock.setStaffActive(chainId, branchIds[0], staff.id, false);
    expect((await accountMock.listStaff(chainId, branchIds[0], { status: "SUSPENDED" })).items.map((s) => s.id)).toContain(staff.id);
    await accountMock.setStaffActive(chainId, branchIds[0], staff.id, true);
    expect((await accountMock.listStaff(chainId, branchIds[0], { search: "nv1@" })).items[0].status).toBe("INACTIVE");
  });

  it("lọc vai trò và tìm kiếm", async () => {
    await accountMock.createStaff(chainId, branchIds[0], staffInput(1, { role: "BARISTA" }));
    const baristas = (await accountMock.listStaff(chainId, branchIds[0], { role: "BARISTA" })).items;
    expect(baristas.length).toBeGreaterThan(0);
    expect(baristas.every((s) => s.role === "BARISTA")).toBe(true);
    expect((await accountMock.listStaff(chainId, branchIds[0], { search: "nv1@thu" })).items).toHaveLength(1);
  });

  it("hạn mức: đủ thì chặn TẠO MỚI và chặn MỞ KHOÁ; khoá một người thì tạo được tiếp; báo kèm tên gói cần nâng", async () => {
    setScenario({ tier: "BASIC" }); // tối đa 10 tài khoản đang hoạt động
    // Hạ số đang dùng xuống dưới hạn mức bằng cách khoá bớt (khoá không tính): Manager của các chi nhánh và nhân viên chi nhánh khác.
    const managers = (await accountMock.listManagers(chainId)).items;
    for (const m of managers) await accountMock.setManagerActive(m.id, false);
    for (const b of branchIds.slice(1)) for (const s of (await accountMock.listStaff(chainId, b)).items) await accountMock.setStaffActive(chainId, b, s.id, false);
    const home = branchIds[0];
    let quota = await accountMock.getAccountQuota(chainId);
    expect(quota.limit).toBe(10);
    expect(quota.used).toBeLessThan(10);

    // Tạo cho tới khi đủ hạn mức.
    let n = 100;
    const created: string[] = [];
    while ((await accountMock.getAccountQuota(chainId)).used < 10) created.push((await accountMock.createStaff(chainId, home, staffInput(n++))).staff.id);
    quota = await accountMock.getAccountQuota(chainId);
    expect(quota).toEqual({ used: 10, limit: 10 });

    // Đủ hạn mức: tạo mới bị chặn, báo gói cần nâng.
    const blocked = await accountMock.createStaff(chainId, home, staffInput(n++)).catch((e) => e);
    expect(blocked).toMatchObject({ status: 409, code: "PLAN_LIMIT_REACHED" });
    const message = describeAccountError(blocked)!;
    expect(message).toContain("Cơ bản");
    expect(message).toMatch(/Tiêu chuẩn/);
    expect(message).toMatch(/30 tài khoản/);

    // Khoá một người (không tính nữa) → tạo được thêm một người.
    await accountMock.setStaffActive(chainId, home, created[0], false);
    expect((await accountMock.getAccountQuota(chainId)).used).toBe(9);
    const again = (await accountMock.createStaff(chainId, home, staffInput(n++))).staff.id;
    expect((await accountMock.getAccountQuota(chainId)).used).toBe(10);

    // Lại đủ hạn mức → MỞ KHOÁ người vừa khoá cũng bị chặn.
    await expect(accountMock.setStaffActive(chainId, home, created[0], true)).rejects.toMatchObject({ status: 409, code: "PLAN_LIMIT_REACHED" });
    // Khoá thêm một người thì mở khoá được.
    await accountMock.setStaffActive(chainId, home, again, false);
    await accountMock.setStaffActive(chainId, home, created[0], true);
    expect((await accountMock.getAccountQuota(chainId)).used).toBe(10);
  });

  it("gói cao nhất đủ hạn mức: báo 'đây đã là gói cao nhất'", () => {
    const top = new ApiError(409, "Gói Nâng cao chỉ cho phép 80 tài khoản.", [], "PLAN_LIMIT_REACHED", { suggestedPlans: [] });
    expect(describeAccountError(top)).toMatch(/gói cao nhất/);
    expect(describeAccountError(new ApiError(409, "Email, phone, or employee code already exists"))).toMatch(/Email này đã được dùng/);
    expect(describeAccountError(new Error("x"))).toBeNull(); // không phải ApiError → dùng thông báo chung
  });

  it("hết hạn gói: mọi thao tác ghi bị chặn (chỉ đọc), vẫn xem được", async () => {
    const { staff } = await accountMock.createStaff(chainId, branchIds[0], staffInput(1));
    setScenario({ expired: true });
    await expect(accountMock.createStaff(chainId, branchIds[0], staffInput(2))).rejects.toMatchObject({ status: 403, code: "SUBSCRIPTION_READ_ONLY" });
    await expect(accountMock.updateStaff(chainId, branchIds[0], staff.id, { phone: null })).rejects.toMatchObject({ status: 403 });
    await expect(accountMock.setStaffActive(chainId, branchIds[0], staff.id, false)).rejects.toMatchObject({ status: 403 });
    await expect(accountMock.resetStaffPassword(chainId, branchIds[0], staff.id)).rejects.toMatchObject({ status: 403 });
    expect((await accountMock.listStaff(chainId, branchIds[0])).items.length).toBeGreaterThan(0);
  });

  it("lưu qua F5: tải lại (bỏ state bộ nhớ) vẫn còn nhân viên, không sinh nhân sự mẫu trùng; xoá dữ liệu mock thì mất", async () => {
    const { staff } = await accountMock.createStaff(chainId, branchIds[0], staffInput(1));
    await accountMock.setStaffActive(chainId, branchIds[0], staff.id, false);
    const before = (await accountMock.listStaff(chainId, branchIds[0])).items.length;
    resetMockStates();
    const after = (await accountMock.listStaff(chainId, branchIds[0])).items;
    expect(after.length).toBe(before);
    expect(after.find((s) => s.id === staff.id)).toMatchObject({ status: "SUSPENDED" });
    clearPersistedAccounts();
    resetMockStates();
    expect((await accountMock.listStaff(chainId, branchIds[0])).items.some((s) => s.id === staff.id)).toBe(false);
  });
});
