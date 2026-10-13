import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, translateBackendMessage } from "../../http/errors";
import { mockControl } from "../../mock/control";
import { setScenario } from "../../mock/scenario";
import { resetMockStates } from "../../mock/store";
import { postersMock, resetMockPosters } from "./mock";
import { POSTERS_STORAGE_PREFIX, clearPersistedPosters } from "./persist";
import { mapPoster, postersReal, type RawPoster } from "./real";
import {
  MAX_POSTERS,
  MAX_POSTER_BYTES,
  comparePosters,
  validatePosterDuration,
  validatePosterFile,
  validatePosterPatch,
  validatePosterSortOrder,
  validatePosterTitle,
} from "./validate";

mockControl.latency = [0, 0];
mockControl.failure = null;

const file = (type = "image/png", bytes = 1000, name = "poster.png") => new File([new Uint8Array(bytes)], name, { type });

const raw = (over: Partial<RawPoster> = {}): RawPoster => ({
  id: "p1",
  chainId: "c1",
  title: "Poster",
  imageUrl: "/uploads/posters/c1-a.png",
  enabled: true,
  sortOrder: 0,
  durationSeconds: 8,
  createdAt: "2026-10-13T11:14:32.000Z",
  updatedAt: "2026-10-13T11:14:32.000Z",
  ...over,
});

describe("kiểm poster (theo BE display-posters)", () => {
  it("nhận PNG/JPG/WebP ≤ 5 MB; từ chối loại khác, quá lớn, rỗng", () => {
    expect(validatePosterFile(file("image/png"))).toBeNull();
    expect(validatePosterFile(file("image/jpeg"))).toBeNull();
    expect(validatePosterFile(file("image/webp"))).toBeNull();
    expect(validatePosterFile(file("image/gif"))).toMatch(/PNG, JPG hoặc WebP/);
    expect(validatePosterFile({ type: "image/png", size: MAX_POSTER_BYTES })).toBeNull();
    expect(validatePosterFile({ type: "image/png", size: MAX_POSTER_BYTES + 1 })).toMatch(/5 MB/);
    expect(validatePosterFile({ type: "image/png", size: 0 })).toMatch(/rỗng/);
  });

  it("tên 1–120 ký tự sau khi cắt khoảng trắng", () => {
    expect(validatePosterTitle(undefined)).toBeNull();
    expect(validatePosterTitle("a".repeat(120))).toBeNull();
    expect(validatePosterTitle("a".repeat(121))).toMatch(/120/);
    expect(validatePosterTitle("   ")).toMatch(/không được để trống/);
    expect(validatePosterTitle("")).toMatch(/không được để trống/);
  });

  it("thời lượng là số nguyên 3–60; thứ tự là số nguyên 0–10000", () => {
    expect(validatePosterDuration(undefined)).toBeNull();
    for (const ok of [3, 8, 60]) expect(validatePosterDuration(ok)).toBeNull();
    for (const bad of [2, 61, 7.5, Number.NaN]) expect(validatePosterDuration(bad)).toMatch(/3 đến 60/);
    for (const ok of [0, 5, 10000]) expect(validatePosterSortOrder(ok)).toBeNull();
    for (const bad of [-1, 10001, 1.5]) expect(validatePosterSortOrder(bad)).toMatch(/0 đến 10000/);
  });

  it("sửa rỗng bị từ chối (BE trả 400); có ít nhất một trường hợp lệ thì qua", () => {
    expect(validatePosterPatch({})).toMatch(/ít nhất một trường/);
    expect(validatePosterPatch({ enabled: false })).toBeNull();
    expect(validatePosterPatch({ durationSeconds: 90 })).toMatch(/3 đến 60/);
  });

  it("sắp theo sortOrder, rồi createdAt, rồi id (như BE)", () => {
    const a = { id: "b", sortOrder: 1, createdAt: "2026-10-13T10:00:00Z" };
    const b = { id: "a", sortOrder: 1, createdAt: "2026-10-13T11:00:00Z" };
    const c = { id: "c", sortOrder: 0, createdAt: "2026-10-13T12:00:00Z" };
    const d = { id: "a", sortOrder: 1, createdAt: "2026-10-13T10:00:00Z" };
    // c (sortOrder 0) trước; trong sortOrder 1: cùng 10:00 thì theo id (d "a" trước a "b"), rồi b (11:00).
    expect([a, b, c, d].sort(comparePosters)).toEqual([c, d, a, b]);
  });
});

describe("dịch thông báo BE sang tiếng Việt", () => {
  const t = (status: number, message: string) => translateBackendMessage(new ApiError(status, message));
  it("409 vượt số poster, 404, 400 tệp", () => {
    expect(t(409, "A chain may have at most 10 posters; remove one before uploading")).toMatch(/đủ số poster tối đa/);
    expect(t(404, "Poster not found in this chain")).toMatch(/Không tìm thấy poster/);
    expect(t(400, "Poster must not exceed 5 MB")).toBe("Poster tối đa 5 MB.");
    expect(t(400, "A poster file is required")).toBe("Chưa chọn tệp poster.");
    expect(t(400, "Poster must be a JPEG, PNG, or WebP image with a matching file signature")).toMatch(/JPEG, PNG hoặc WebP/);
  });
});

describe("real posters — fetch giả, không gọi BE", () => {
  afterEach(() => vi.unstubAllGlobals());
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  const stub = (...responses: Response[]) => {
    const fn = vi.fn();
    responses.forEach((r) => fn.mockResolvedValueOnce(r));
    fn.mockImplementation(async () => json(raw()));
    vi.stubGlobal("fetch", fn);
    return fn;
  };
  const calls = (fn: ReturnType<typeof vi.fn>) =>
    (fn.mock.calls as [string, RequestInit][]).map(([url, init]) => ({
      path: new URL(url).pathname.replace(/^\/api\/v1/, ""),
      method: init.method ?? "GET",
      body: init.body,
      contentType: new Headers(init.headers).get("content-type"),
    }));

  it("ánh xạ: imageUrl tương đối → tuyệt đối; giữ nguyên title, enabled, sortOrder, durationSeconds", () => {
    const p = mapPoster(raw({ imageUrl: "/uploads/posters/x.webp", sortOrder: 3, durationSeconds: 15, title: "Matcha" }), "http://localhost:3100");
    expect(p).toMatchObject({ imageUrl: "http://localhost:3100/uploads/posters/x.webp", sortOrder: 3, durationSeconds: 15, title: "Matcha", enabled: true });
  });

  it("GET: đúng route display-posters, sắp theo thứ tự xoay vòng của BE", async () => {
    const fn = stub(json([raw({ id: "b", sortOrder: 1 }), raw({ id: "a", sortOrder: 0 }), raw({ id: "c", sortOrder: 1, createdAt: "2026-10-13T09:00:00.000Z" })]));
    const list = await postersReal.listPosters("c1");
    expect(calls(fn)[0]).toMatchObject({ path: "/restaurant-chains/c1/display-posters", method: "GET" });
    expect(list.map((p) => p.id)).toEqual(["a", "c", "b"]);
    expect(list[0].imageUrl).toMatch(/\/uploads\/posters\/c1-a\.png$/);
  });

  it("POST: multipart, field `file` DUY NHẤT, không đặt Content-Type tay", async () => {
    const fn = stub(json(raw({ id: "n1" }), 201));
    const out = await postersReal.addPoster("c1", { file: file("image/jpeg", 2000, "a.jpg") });
    const [only] = calls(fn);
    expect(calls(fn)).toHaveLength(1);
    expect(only).toMatchObject({ path: "/restaurant-chains/c1/display-posters", method: "POST", contentType: null });
    expect(only.body).toBeInstanceOf(FormData);
    expect([...(only.body as FormData).keys()]).toEqual(["file"]);
    expect(out.id).toBe("n1");
  });

  it("POST sai tệp: 400 tiếng Việt, KHÔNG có request nào", async () => {
    const fn = stub();
    await expect(postersReal.addPoster("c1", { file: file("image/gif") })).rejects.toMatchObject({ status: 400 });
    await expect(postersReal.addPoster("c1", { file: file("image/png", MAX_POSTER_BYTES + 1) })).rejects.toMatchObject({ status: 400 });
    expect(fn).not.toHaveBeenCalled();
  });

  it("POST vượt 10 poster: BE trả 409, lỗi được ném lại với status 409", async () => {
    stub(json({ statusCode: 409, message: "A chain may have at most 10 posters; remove one before uploading" }, 409));
    await expect(postersReal.addPoster("c1", { file: file() })).rejects.toMatchObject({ status: 409 });
  });

  it("PATCH: chỉ gửi khoá có mặt (tên đã cắt khoảng trắng), đúng route và phương thức", async () => {
    const fn = stub(json(raw({ durationSeconds: 20, title: "Khuyến mãi" })));
    const out = await postersReal.updatePoster("c1", "p1", { title: " Khuyến mãi ", durationSeconds: 20 });
    expect(calls(fn)[0]).toMatchObject({ path: "/restaurant-chains/c1/display-posters/p1", method: "PATCH", contentType: "application/json" });
    expect(JSON.parse(String(calls(fn)[0].body))).toEqual({ title: "Khuyến mãi", durationSeconds: 20 });
    expect(out.durationSeconds).toBe(20);
    await postersReal.updatePoster("c1", "p1", { enabled: false });
    expect(JSON.parse(String(calls(fn)[1].body))).toEqual({ enabled: false });
    await postersReal.updatePoster("c1", "p1", { sortOrder: 0 });
    expect(JSON.parse(String(calls(fn)[2].body))).toEqual({ sortOrder: 0 });
  });

  it("PATCH rỗng, tên rỗng, thời lượng ngoài 3–60: 400, KHÔNG có request nào", async () => {
    const fn = stub();
    await expect(postersReal.updatePoster("c1", "p1", {})).rejects.toMatchObject({ status: 400 });
    await expect(postersReal.updatePoster("c1", "p1", { title: "  " })).rejects.toMatchObject({ status: 400 });
    await expect(postersReal.updatePoster("c1", "p1", { durationSeconds: 2 })).rejects.toMatchObject({ status: 400 });
    expect(fn).not.toHaveBeenCalled();
  });

  it("DELETE: chấp nhận thân `{ deleted: true }` của BE, không body gửi đi", async () => {
    const fn = stub(json({ deleted: true }));
    await expect(postersReal.deletePoster("c1", "p1")).resolves.toBeUndefined();
    expect(calls(fn)[0]).toMatchObject({ path: "/restaurant-chains/c1/display-posters/p1", method: "DELETE", body: undefined });
  });

  it("403 chỉ đọc (hết hạn) được ném lại", async () => {
    stub(json({ statusCode: 403, message: "The business subscription is read-only; renew it before making this change" }, 403));
    await expect(postersReal.deletePoster("c1", "p1")).rejects.toMatchObject({ status: 403 });
  });
});

describe("mock posters — phản chiếu BE", () => {
  beforeEach(() => {
    clearPersistedPosters();
    resetMockPosters();
    resetMockStates();
    setScenario({ profile: "A", tier: "STANDARD", expired: false });
  });

  it("chuỗi mới chưa có poster", async () => {
    expect(await postersMock.listPosters("c1")).toEqual([]);
  });

  it("thêm: tên mặc định, 8 giây, bật, sortOrder = số poster hiện có; lưu qua lần đọc kế tiếp", async () => {
    const a = await postersMock.addPoster("c1", { file: file() });
    const b = await postersMock.addPoster("c1", { file: file("image/jpeg") });
    expect(a).toMatchObject({ title: "Poster", enabled: true, durationSeconds: 8, sortOrder: 0 });
    expect(b.sortOrder).toBe(1);
    expect(a.imageUrl).toMatch(/^data:/);
    expect((await postersMock.listPosters("c1")).map((p) => p.id)).toEqual([a.id, b.id]);
    expect(localStorage.getItem(`${POSTERS_STORAGE_PREFIX}c1`)).not.toBeNull();
  });

  it("poster của chuỗi này không lẫn sang chuỗi khác", async () => {
    await postersMock.addPoster("c1", { file: file() });
    expect(await postersMock.listPosters("c2")).toEqual([]);
  });

  it("tệp sai: 400; đủ 10 poster: 409", async () => {
    await expect(postersMock.addPoster("c1", { file: file("image/gif") })).rejects.toMatchObject({ status: 400 });
    for (let i = 0; i < MAX_POSTERS; i++) await postersMock.addPoster("c1", { file: file() });
    await expect(postersMock.addPoster("c1", { file: file() })).rejects.toMatchObject({ status: 409 });
  });

  it("PATCH đổi tên, bật/tắt, thời lượng, thứ tự; sửa rỗng, tên rỗng, ngoài khoảng, không tồn tại đều bị từ chối", async () => {
    const a = await postersMock.addPoster("c1", { file: file() });
    expect(await postersMock.updatePoster("c1", a.id, { title: " Matcha ", enabled: false, durationSeconds: 15, sortOrder: 7 })).toMatchObject({
      title: "Matcha",
      enabled: false,
      durationSeconds: 15,
      sortOrder: 7,
    });
    await expect(postersMock.updatePoster("c1", a.id, {})).rejects.toMatchObject({ status: 400 });
    await expect(postersMock.updatePoster("c1", a.id, { title: "" })).rejects.toMatchObject({ status: 400 });
    await expect(postersMock.updatePoster("c1", a.id, { durationSeconds: 61 })).rejects.toMatchObject({ status: 400 });
    await expect(postersMock.updatePoster("c1", "khong-co", { enabled: true })).rejects.toMatchObject({ status: 404 });
  });

  it("danh sách theo sortOrder; PATCH sortOrder chỉ đổi một dòng (không dịch dòng khác)", async () => {
    const a = await postersMock.addPoster("c1", { file: file() });
    const b = await postersMock.addPoster("c1", { file: file() });
    await postersMock.updatePoster("c1", a.id, { sortOrder: 5 });
    const list = await postersMock.listPosters("c1");
    expect(list.map((p) => [p.id, p.sortOrder])).toEqual([[b.id, 1], [a.id, 5]]);
  });

  it("xoá không đánh số lại, nên thêm sau đó có thể trùng sortOrder", async () => {
    const a = await postersMock.addPoster("c1", { file: file() });
    const b = await postersMock.addPoster("c1", { file: file() });
    await postersMock.deletePoster("c1", a.id);
    const c = await postersMock.addPoster("c1", { file: file() });
    expect(c.sortOrder).toBe(b.sortOrder);
    // Hoà sortOrder thì BE xếp theo createdAt rồi id; hai poster có thể cùng mili giây nên chỉ kiểm tập hợp.
    expect((await postersMock.listPosters("c1")).map((p) => p.id).sort()).toEqual([b.id, c.id].sort());
    await expect(postersMock.deletePoster("c1", a.id)).rejects.toMatchObject({ status: 404 });
  });
});
