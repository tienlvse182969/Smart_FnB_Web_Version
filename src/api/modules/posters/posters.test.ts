/**
 * Áp phích (OW-11, lượt 7.9): quy tắc, mapper, real (đúng DTO BE `4b81e48`), thao tác GHÉP, mock.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Poster } from "../../../types";
import { mockControl } from "../../mock/control";
import { replaceImage, reorder, type PosterPrimitives } from "./compose";
import { mapPoster, mapPosterList } from "./mapper";
import { postersMock, resetPostersMock } from "./mock";
import { postersReal, toPatchBody } from "./real";
import {
  POSTER_LIMITS,
  describePosterRejection,
  enabledInOrder,
  moveOrder,
  nextSlideIndex,
  slideSeconds,
  validatePosterFile,
  validatePosterImage,
  validatePosterTitle,
} from "./rules";

mockControl.latency = [0, 0];
mockControl.failure = null;

const poster = (over: Partial<Poster> = {}): Poster => ({
  id: "p",
  title: "Tên",
  imageUrl: "http://x/y.png",
  enabled: true,
  sortOrder: 0,
  durationSeconds: 8,
  updatedAt: null,
  ...over,
});
const file = (type: string, size: number, name = "a.png") => ({ type, size, name });

describe("giới hạn lấy theo BE 4b81e48 (#82 chờ nhóm chốt)", () => {
  it("một hằng số: 10 áp phích, tên 120, 5 MB, PNG/JPG/WebP", () => {
    expect(POSTER_LIMITS.maxCount).toBe(10);
    expect(POSTER_LIMITS.maxTitle).toBe(120);
    expect(POSTER_LIMITS.maxBytes).toBe(5 * 1024 * 1024);
    expect([...POSTER_LIMITS.types]).toEqual(["image/png", "image/jpeg", "image/webp"]);
    expect(POSTER_LIMITS.defaultSeconds).toBe(8);
  });
});

describe("kiểm tệp ngay khi chọn", () => {
  it("định dạng sai: câu nêu tên tệp và các định dạng nhận", () => {
    const msg = validatePosterFile(file("image/gif", 1000, "anh.gif"), 0)!;
    expect(msg).toMatch(/PNG, JPG hoặc WebP/);
    expect(msg).toMatch(/anh\.gif/);
    expect(validatePosterFile(file("application/pdf", 10), 0)).not.toBeNull();
  });

  it("quá 5 MB: nêu dung lượng thật và giới hạn; đúng 5 MB thì qua", () => {
    const over = validatePosterFile(file("image/png", 5 * 1024 * 1024 + 1), 0)!;
    expect(over).toMatch(/vượt giới hạn 5 MB/);
    expect(over).toMatch(/5\.0 MB/);
    expect(validatePosterFile(file("image/png", 5 * 1024 * 1024), 0)).toBeNull();
  });

  it("tệp rỗng bị chặn", () => {
    expect(validatePosterImage(file("image/jpeg", 0))).toBe("Tệp ảnh rỗng.");
  });

  it("đủ số lượng: chặn trước cả loại tệp, nêu số tối đa", () => {
    const msg = validatePosterFile(file("image/png", 10), POSTER_LIMITS.maxCount)!;
    expect(msg).toMatch(/Đã đủ 10 áp phích/);
    expect(validatePosterFile(file("image/webp", 10), POSTER_LIMITS.maxCount - 1)).toBeNull();
  });

  it("tên: không rỗng, ≤ 120 sau trim", () => {
    expect(validatePosterTitle("   ")).toMatch(/Nhập tên/);
    expect(validatePosterTitle("a".repeat(121))).toMatch(/tối đa 120/);
    expect(validatePosterTitle(`  ${"a".repeat(120)}  `)).toBeNull();
  });
});

describe("thứ tự và vòng xoay", () => {
  const list = [poster({ id: "a", sortOrder: 0 }), poster({ id: "b", sortOrder: 1 }), poster({ id: "c", sortOrder: 2 })];

  it("moveOrder: đổi chỗ hai áp phích, chỉ gửi áp phích đổi sortOrder", () => {
    expect(moveOrder(list, "b", -1)).toEqual([
      { id: "b", sortOrder: 0 },
      { id: "a", sortOrder: 1 },
    ]);
    expect(moveOrder(list, "b", 1)).toEqual([
      { id: "c", sortOrder: 1 },
      { id: "b", sortOrder: 2 },
    ]);
  });

  it("moveOrder: đầu/cuối danh sách hoặc id lạ → không có gì để gửi", () => {
    expect(moveOrder(list, "a", -1)).toEqual([]);
    expect(moveOrder(list, "c", 1)).toEqual([]);
    expect(moveOrder(list, "zzz", 1)).toEqual([]);
  });

  it("moveOrder: sortOrder đang trùng/lệch (sau khi xoá) được chuẩn hoá thành 0..n−1", () => {
    const messy = [poster({ id: "a", sortOrder: 0 }), poster({ id: "b", sortOrder: 0 }), poster({ id: "c", sortOrder: 5 })];
    const patches = moveOrder(messy, "c", -1);
    // mảng mới: a, c, b → chỉ số 0,1,2; a đã 0 nên bỏ qua
    expect(patches).toEqual([
      { id: "c", sortOrder: 1 },
      { id: "b", sortOrder: 2 },
    ]);
  });

  it("enabledInOrder giữ thứ tự mảng và bỏ áp phích tắt", () => {
    const mixed = [poster({ id: "a" }), poster({ id: "b", enabled: false }), poster({ id: "c" })];
    expect(enabledInOrder(mixed).map((p) => p.id)).toEqual(["a", "c"]);
  });

  it("nextSlideIndex quay vòng, an toàn khi rỗng", () => {
    expect(nextSlideIndex(0, 3)).toBe(1);
    expect(nextSlideIndex(2, 3)).toBe(0);
    expect(nextSlideIndex(0, 1)).toBe(0);
    expect(nextSlideIndex(5, 0)).toBe(0);
  });

  it("slideSeconds: mặc định 8, kẹp 3–60", () => {
    expect(slideSeconds(undefined)).toBe(8);
    expect(slideSeconds({ durationSeconds: 12 })).toBe(12);
    expect(slideSeconds({ durationSeconds: 1 })).toBe(3);
    expect(slideSeconds({ durationSeconds: 999 })).toBe(60);
    expect(slideSeconds({ durationSeconds: Number.NaN })).toBe(8);
  });
});

describe("mapper", () => {
  it("ghép gốc máy chủ cho đường dẫn tương đối, bỏ trường lạ", () => {
    const p = mapPoster(
      { id: "1", title: "T", imageUrl: "/uploads/posters/c-1.png", enabled: false, sortOrder: 3, durationSeconds: 12, updatedAt: "2026-10-13T00:00:00.000Z", ...({ chainId: "c", deletedAt: null } as object) },
      "http://localhost:3100",
    );
    expect(p).toEqual({ id: "1", title: "T", imageUrl: "http://localhost:3100/uploads/posters/c-1.png", enabled: false, sortOrder: 3, durationSeconds: 12, updatedAt: "2026-10-13T00:00:00.000Z" });
  });

  it("thiếu trường: mặc định an toàn; bỏ dòng không có id; không phải mảng → rỗng", () => {
    expect(mapPoster({ id: "x" }, "http://h")).toMatchObject({ title: "", imageUrl: "", enabled: true, sortOrder: 0, durationSeconds: 8 });
    expect(mapPosterList([{ id: "a" }, { title: "không id" }, null], "http://h")).toHaveLength(1);
    expect(mapPosterList({ items: [] })).toEqual([]);
  });
});

describe("real — đúng DTO của BE", () => {
  afterEach(() => vi.unstubAllGlobals());
  const respond = (body: unknown, status = 200) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
  const call = (fn: ReturnType<typeof vi.fn>, n = 0) => {
    const [url, init] = fn.mock.calls[n] as [string, RequestInit];
    return { path: new URL(url).pathname, method: init.method, body: init.body };
  };
  const raw = { id: "p1", title: "Poster", imageUrl: "/uploads/posters/c-1.png", enabled: true, sortOrder: 0, durationSeconds: 8 };

  it("liệt kê: GET …/display-posters, ánh xạ", async () => {
    const fn = respond([raw]);
    vi.stubGlobal("fetch", fn);
    const list = await postersReal.listPosters("chain-1");
    expect(call(fn)).toMatchObject({ path: "/api/v1/restaurant-chains/chain-1/display-posters", method: "GET" });
    expect(list[0]).toMatchObject({ id: "p1", enabled: true });
    expect(list[0].imageUrl).toMatch(/\/uploads\/posters\/c-1\.png$/);
  });

  it("tải lên: POST multipart, field `file`, không có trường nào khác", async () => {
    const fn = respond(raw, 201);
    vi.stubGlobal("fetch", fn);
    const f = new File([new Uint8Array(10)], "a.png", { type: "image/png" });
    await postersReal.uploadPoster("chain-1", f);
    const c = call(fn);
    expect(c).toMatchObject({ path: "/api/v1/restaurant-chains/chain-1/display-posters", method: "POST" });
    expect(c.body).toBeInstanceOf(FormData);
    const form = c.body as FormData;
    expect([...form.keys()]).toEqual(["file"]);
    expect((form.get("file") as File).name).toBe("a.png");
  });

  it("tải lên tệp sai định dạng/quá nặng: 400 tiếng Việt, KHÔNG gửi request", async () => {
    const fn = respond(raw, 201);
    vi.stubGlobal("fetch", fn);
    await expect(postersReal.uploadPoster("c", new File([new Uint8Array(4)], "a.gif", { type: "image/gif" }))).rejects.toMatchObject({ status: 400 });
    expect(fn).not.toHaveBeenCalled();
  });

  it("PATCH: chỉ title/enabled/sortOrder, tên được trim, không gửi durationSeconds", async () => {
    const fn = respond(raw);
    vi.stubGlobal("fetch", fn);
    await postersReal.updatePoster("c", "p1", { title: "  Mới  ", enabled: false, sortOrder: 2 });
    expect(call(fn)).toMatchObject({ path: "/api/v1/restaurant-chains/c/display-posters/p1", method: "PATCH" });
    expect(JSON.parse(String(call(fn).body))).toEqual({ title: "Mới", enabled: false, sortOrder: 2 });
    expect(toPatchBody({ enabled: true })).toEqual({ enabled: true });
  });

  it("PATCH tên rỗng: 400, không gửi", async () => {
    const fn = respond(raw);
    vi.stubGlobal("fetch", fn);
    await expect(postersReal.updatePoster("c", "p1", { title: "   " })).rejects.toMatchObject({ status: 400 });
    expect(fn).not.toHaveBeenCalled();
  });

  it("xoá: DELETE …/display-posters/:id", async () => {
    const fn = respond({ deleted: true });
    vi.stubGlobal("fetch", fn);
    await postersReal.deletePoster("c", "p1");
    expect(call(fn)).toMatchObject({ path: "/api/v1/restaurant-chains/c/display-posters/p1", method: "DELETE" });
  });

  it("409 đủ số lượng của BE → ApiError 409 (câu Việt do lớp lỗi dịch)", async () => {
    vi.stubGlobal("fetch", respond({ statusCode: 409, message: "A chain may have at most 10 posters; remove one before uploading", error: "Conflict" }, 409));
    const f = new File([new Uint8Array(10)], "a.png", { type: "image/png" });
    await expect(postersReal.uploadPoster("c", f)).rejects.toMatchObject({ status: 409 });
  });

  it("câu BE → câu tiếng Việt chuyên biệt", () => {
    expect(describePosterRejection(409, "A chain may have at most 10 posters; remove one before uploading")).toMatch(/Đã đủ 10 áp phích/);
    expect(describePosterRejection(413, "File too large")).toMatch(/5 MB/);
    expect(describePosterRejection(400, "Poster must be a JPEG, PNG, or WebP image with a matching file signature")).toMatch(/PNG, JPG hoặc WebP/);
    expect(describePosterRejection(500, "x")).toBeNull();
  });
});

describe("thao tác ghép (BE chưa có endpoint, #82)", () => {
  const make = () => {
    const calls: string[] = [];
    const api: PosterPrimitives = {
      upload: vi.fn(async () => {
        calls.push("POST");
        return poster({ id: "new", title: "Poster", enabled: true, sortOrder: 9 });
      }),
      update: vi.fn(async (_c, id, patch) => {
        calls.push(`PATCH ${id} ${JSON.stringify(patch)}`);
        return poster({ id, ...patch });
      }),
      remove: vi.fn(async (_c, id) => {
        calls.push(`DELETE ${id}`);
      }),
    };
    return { api, calls };
  };

  it("đổi ảnh: POST → PATCH chép tên/bật/vị trí → DELETE cũ, đúng thứ tự", async () => {
    const { api, calls } = make();
    const current = poster({ id: "old", title: "KM tháng 10", enabled: false, sortOrder: 1 });
    const result = await replaceImage(api, "c", current, new File([new Uint8Array(3)], "n.png", { type: "image/png" }));
    expect(calls).toEqual(["POST", `PATCH new ${JSON.stringify({ title: "KM tháng 10", enabled: false, sortOrder: 1 })}`, "DELETE old"]);
    expect(result).toMatchObject({ id: "new", title: "KM tháng 10", enabled: false, sortOrder: 1 });
  });

  it("đổi ảnh: PATCH lỗi thì xoá bản mới, KHÔNG xoá bản cũ, ném lỗi", async () => {
    const { api, calls } = make();
    (api.update as ReturnType<typeof vi.fn>).mockRejectedValueOnce(Object.assign(new Error("boom"), { status: 500 }));
    await expect(replaceImage(api, "c", poster({ id: "old" }), new File([], "n.png"))).rejects.toThrow("boom");
    expect(calls).toEqual(["POST", "DELETE new"]);
  });

  it("đổi ảnh: POST lỗi (đủ số lượng) thì không đụng áp phích cũ", async () => {
    const { api, calls } = make();
    (api.upload as ReturnType<typeof vi.fn>).mockRejectedValueOnce(Object.assign(new Error("full"), { status: 409 }));
    await expect(replaceImage(api, "c", poster({ id: "old" }), new File([], "n.png"))).rejects.toThrow("full");
    expect(calls).toEqual([]);
  });

  it("đổi thứ tự: PATCH sortOrder tuần tự theo mảng", async () => {
    const { api, calls } = make();
    await reorder(api, "c", [
      { id: "b", sortOrder: 0 },
      { id: "a", sortOrder: 1 },
    ]);
    expect(calls).toEqual([`PATCH b ${JSON.stringify({ sortOrder: 0 })}`, `PATCH a ${JSON.stringify({ sortOrder: 1 })}`]);
  });
});

describe("mock", () => {
  beforeEach(() => resetPostersMock());

  it("có sẵn 3 áp phích mẫu (2 bật, 1 tắt), đúng thứ tự", async () => {
    const list = await postersMock.listPosters("c1");
    expect(list.map((p) => p.enabled)).toEqual([true, true, false]);
    expect(list.map((p) => p.sortOrder)).toEqual([0, 1, 2]);
  });

  it("thêm tới đủ giới hạn rồi 409; tệp sai loại 400", async () => {
    const png = new File([new Uint8Array(8)], "a.png", { type: "image/png" });
    for (let i = (await postersMock.listPosters("c1")).length; i < POSTER_LIMITS.maxCount; i++) await postersMock.uploadPoster("c1", png);
    await expect(postersMock.uploadPoster("c1", png)).rejects.toMatchObject({ status: 409 });
    await expect(postersMock.uploadPoster("c2", new File([new Uint8Array(8)], "a.gif", { type: "image/gif" }))).rejects.toMatchObject({ status: 400 });
  });

  it("bật/tắt, đổi tên, xoá, đổi thứ tự", async () => {
    const [a, b] = await postersMock.listPosters("c1");
    await postersMock.updatePoster("c1", a.id, { enabled: false, title: "Đã đổi" });
    await postersMock.reorder("c1", moveOrder(await postersMock.listPosters("c1"), b.id, -1));
    let list = await postersMock.listPosters("c1");
    expect(list[0].id).toBe(b.id);
    expect(list.find((p) => p.id === a.id)).toMatchObject({ enabled: false, title: "Đã đổi" });
    await postersMock.deletePoster("c1", a.id);
    list = await postersMock.listPosters("c1");
    expect(list.find((p) => p.id === a.id)).toBeUndefined();
    await expect(postersMock.updatePoster("c1", a.id, { enabled: true })).rejects.toMatchObject({ status: 404 });
  });
});
