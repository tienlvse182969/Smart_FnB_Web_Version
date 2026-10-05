import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../http/errors";
import { mockControl } from "../../mock/control";
import { setScenario } from "../../mock/scenario";
import { branchMock } from "../branch/mock";
import { BE_DEFAULT_BRANDING, BRAND_COLOR_PRESETS } from "../../../theme";
import { absoluteLogoUrl, mapBranding, serverOrigin, type RawBranding } from "./mapper";
import { resetMockStates } from "../../mock/store";
import { brandingMock } from "./mock";
import { BRANDING_STORAGE_PREFIX, clearPersistedBranding } from "./persist";
import { brandingReal } from "./real";
import { validateBrandingFields, validateLogoFile } from "./validate";

mockControl.latency = [0, 0];
mockControl.failure = null;

const raw = (over: Partial<RawBranding> = {}): RawBranding => ({
  chainId: "c1",
  displayName: "Chuỗi Demo",
  logoUrl: null,
  primaryColor: BE_DEFAULT_BRANDING.primaryColor,
  secondaryColor: BE_DEFAULT_BRANDING.secondaryColor,
  accentColor: BE_DEFAULT_BRANDING.accentColor,
  ...over,
});
// Màu thử lấy từ bộ dựng sẵn trong theme (lint cấm viết mã màu cứng ngoài src/theme).
const RED = BRAND_COLOR_PRESETS[1];
const BLUE = BRAND_COLOR_PRESETS[6];
const GREEN = BRAND_COLOR_PRESETS[4];
const file = (type = "image/png", bytes = 1000, name = "logo.png") => new File([new Uint8Array(bytes)], name, { type });

describe("mapper nhận diện (branding.service.ts:21-25, 114)", () => {
  it("gốc máy chủ = origin của VITE_API_BASE_URL, không có /api/v1", () => {
    expect(serverOrigin("http://localhost:3100/api/v1")).toBe("http://localhost:3100");
    expect(serverOrigin("khong-phai-url")).toBe("");
  });

  it("logoUrl tương đối → tuyệt đối; tuyệt đối/data/blob giữ nguyên; rỗng → undefined", () => {
    const origin = "http://localhost:3100";
    expect(absoluteLogoUrl("/uploads/branding/a.png", origin)).toBe("http://localhost:3100/uploads/branding/a.png");
    expect(absoluteLogoUrl("uploads/branding/a.png", origin)).toBe("http://localhost:3100/uploads/branding/a.png");
    expect(absoluteLogoUrl("https://cdn.example.com/a.png", origin)).toBe("https://cdn.example.com/a.png");
    expect(absoluteLogoUrl("data:image/png;base64,AAA", origin)).toBe("data:image/png;base64,AAA");
    expect(absoluteLogoUrl("blob:http://x/1", origin)).toBe("blob:http://x/1");
    expect(absoluteLogoUrl(null, origin)).toBeUndefined();
    expect(absoluteLogoUrl("", origin)).toBeUndefined();
  });

  it("isCustom: mặc định BE (không phân biệt hoa thường) = false; có logo hoặc khác màu = true", () => {
    expect(mapBranding(raw()).isCustom).toBe(false);
    expect(
      mapBranding(
        raw({
          primaryColor: BE_DEFAULT_BRANDING.primaryColor.toLowerCase(),
          accentColor: BE_DEFAULT_BRANDING.accentColor.toLowerCase(),
          secondaryColor: BE_DEFAULT_BRANDING.secondaryColor.toLowerCase(),
        }),
      ).isCustom,
    ).toBe(false);
    expect(mapBranding(raw({ logoUrl: "/uploads/branding/a.png" })).isCustom).toBe(true);
    expect(mapBranding(raw({ primaryColor: RED })).isCustom).toBe(true);
    expect(mapBranding(raw({ accentColor: BLUE })).isCustom).toBe(true);
    expect(mapBranding(raw({ secondaryColor: GREEN })).isCustom).toBe(true);
  });

  it("whitelist: chỉ giữ trường web cần", () => {
    const b = mapBranding({ ...raw({ logoUrl: "/uploads/branding/a.png" }), id: "x", createdAt: "y" } as RawBranding, "http://localhost:3100");
    expect(Object.keys(b).sort()).toEqual(["accentColor", "displayName", "isCustom", "logoUrl", "primaryColor", "tenantId"]);
    expect(b.logoUrl).toBe("http://localhost:3100/uploads/branding/a.png");
    expect(b.tenantId).toBe("c1");
  });
});

describe("kiểm theo đặc tả trước khi gửi (quyết định 4)", () => {
  it("logo: chỉ PNG/JPG, ≤ 1 MB, không rỗng", () => {
    expect(validateLogoFile({ type: "image/png", size: 1024 * 1024 })).toBeNull();
    expect(validateLogoFile({ type: "image/jpeg", size: 10 })).toBeNull();
    expect(validateLogoFile({ type: "image/webp", size: 10 })).toMatch(/PNG hoặc JPG/);
    expect(validateLogoFile({ type: "image/gif", size: 10 })).toMatch(/PNG hoặc JPG/);
    expect(validateLogoFile({ type: "image/png", size: 1024 * 1024 + 1 })).toMatch(/1 MB/);
    expect(validateLogoFile({ type: "image/png", size: 0 })).toMatch(/rỗng/);
  });

  it("tên ≤ 50 (sau trim), màu #RRGGBB", () => {
    expect(validateBrandingFields({ displayName: "a".repeat(50), primaryColor: RED, accentColor: BLUE })).toEqual([]);
    expect(validateBrandingFields({ displayName: ` ${"a".repeat(50)} ` })).toEqual([]);
    expect(validateBrandingFields({ displayName: "a".repeat(51) })).toEqual(["Tên hiển thị tối đa 50 ký tự"]);
    expect(validateBrandingFields({ primaryColor: "red" })).toEqual(["Màu chủ đạo phải là mã màu dạng #RRGGBB"]);
    expect(validateBrandingFields({ accentColor: `#${"f".repeat(3)}` })).toEqual(["Màu nhấn phải là mã màu dạng #RRGGBB"]);
  });
});

describe("real branding — fetch giả, không gọi BE", () => {
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

  it("GET: đọc và ánh xạ; 403 (vai trò không đọc được) → null, không ném lỗi", async () => {
    const fn = stub(json(raw({ logoUrl: "/uploads/branding/a.png", primaryColor: RED })));
    const b = await brandingReal.getBranding("c1");
    expect(calls(fn)[0]).toMatchObject({ path: "/restaurant-chains/c1/branding", method: "GET" });
    expect(b?.isCustom).toBe(true);
    expect(b?.logoUrl).toMatch(/\/uploads\/branding\/a\.png$/);
    stub(json({ statusCode: 403, message: "You can only read branding for your assigned chain" }, 403));
    await expect(brandingReal.getBranding("c1")).resolves.toBeNull();
    stub(json({ statusCode: 500, message: "Internal server error" }, 500));
    await expect(brandingReal.getBranding("c1")).rejects.toBeInstanceOf(ApiError);
  });

  it("chỉ đổi tên/màu: ĐÚNG 1 lệnh PUT, body chỉ có trường đã đổi (không logoUrl, không secondaryColor)", async () => {
    const fn = stub(json(raw({ primaryColor: RED })));
    const out = await brandingReal.updateBranding("c1", { primaryColor: RED, displayName: " Quán Mới " });
    expect(calls(fn)).toHaveLength(1);
    expect(calls(fn)[0]).toMatchObject({ path: "/restaurant-chains/c1/branding", method: "PUT", contentType: "application/json" });
    expect(JSON.parse(String(calls(fn)[0].body))).toEqual({ displayName: "Quán Mới", primaryColor: RED });
    expect(out.isCustom).toBe(true);
  });

  it("chỉ logo mới: ĐÚNG 1 lệnh POST multipart, field `file`, KHÔNG đặt Content-Type tay", async () => {
    const fn = stub(json(raw({ logoUrl: "/uploads/branding/n.png" })));
    const logo = file("image/png", 2000, "logo.png");
    const out = await brandingReal.updateBranding("c1", { logoFile: logo });
    const [only] = calls(fn);
    expect(calls(fn)).toHaveLength(1);
    expect(only).toMatchObject({ path: "/restaurant-chains/c1/branding/logo", method: "POST", contentType: null });
    expect(only.body).toBeInstanceOf(FormData);
    expect([...(only.body as FormData).keys()]).toEqual(["file"]);
    expect(((only.body as FormData).get("file") as File).name).toBe("logo.png");
    expect(out.logoUrl).toMatch(/\/uploads\/branding\/n\.png$/);
  });

  it("logo mới + đổi màu: 2 lệnh, THỨ TỰ POST logo rồi PUT; kết quả cuối lấy từ PUT", async () => {
    const fn = stub(json(raw({ logoUrl: "/uploads/branding/n.png" })), json(raw({ logoUrl: "/uploads/branding/n.png", primaryColor: RED })));
    const out = await brandingReal.updateBranding("c1", { logoFile: file(), primaryColor: RED });
    expect(calls(fn).map((c) => `${c.method} ${c.path}`)).toEqual(["POST /restaurant-chains/c1/branding/logo", "PUT /restaurant-chains/c1/branding"]);
    expect(out.primaryColor).toBe(RED);
    expect(out.logoUrl).toMatch(/n\.png$/);
  });

  it("lỗi ở lệnh PUT sau khi tải logo: ném lỗi (nơi gọi nạp lại từ BE); lỗi ở POST thì KHÔNG gửi PUT", async () => {
    const fn = stub(json(raw({ logoUrl: "/uploads/branding/n.png" })), json({ statusCode: 500, message: "Internal server error" }, 500));
    await expect(brandingReal.updateBranding("c1", { logoFile: file(), primaryColor: RED })).rejects.toMatchObject({ status: 500 });
    expect(calls(fn)).toHaveLength(2);
    const fn2 = stub(json({ statusCode: 413, message: "File too large" }, 413));
    await expect(brandingReal.updateBranding("c1", { logoFile: file(), primaryColor: RED })).rejects.toMatchObject({ status: 413 });
    expect(calls(fn2)).toHaveLength(1);
  });

  it("không đổi gì: 0 lệnh ghi (chỉ đọc lại)", async () => {
    const fn = stub(json(raw()));
    await brandingReal.updateBranding("c1", {});
    expect(calls(fn).map((c) => c.method)).toEqual(["GET"]);
  });

  it("sai logo/tên/màu: lỗi 400 tiếng Việt, KHÔNG có request nào", async () => {
    const fn = stub();
    await expect(brandingReal.updateBranding("c1", { logoFile: file("image/gif") })).rejects.toMatchObject({ status: 400, message: "Logo chỉ nhận PNG hoặc JPG" });
    await expect(brandingReal.updateBranding("c1", { logoFile: file("image/png", 1024 * 1024 + 1) })).rejects.toMatchObject({ status: 400 });
    await expect(brandingReal.updateBranding("c1", { displayName: "x".repeat(51) })).rejects.toMatchObject({ status: 400 });
    await expect(brandingReal.updateBranding("c1", { primaryColor: "xanh" })).rejects.toMatchObject({ status: 400 });
    expect(fn).not.toHaveBeenCalled();
  });

  it("DELETE: đặt lại về mặc định, không body; kết quả isCustom = false", async () => {
    const fn = stub(json(raw()));
    const out = await brandingReal.resetBranding("c1");
    expect(calls(fn)[0]).toMatchObject({ path: "/restaurant-chains/c1/branding", method: "DELETE", body: undefined });
    expect(out.isCustom).toBe(false);
  });

  it("không bao giờ gửi logoUrl (BE @IsUrl từ chối đường dẫn tương đối)", async () => {
    const fn = stub(json(raw()), json(raw()));
    await brandingReal.updateBranding("c1", { logoFile: file(), displayName: "A" });
    const put = calls(fn).find((c) => c.method === "PUT");
    expect(JSON.stringify(put?.body)).not.toContain("logoUrl");
  });
});

describe("mock branding — cùng giao diện, logo là data URL", () => {
  let chainId = "";
  beforeEach(async () => {
    setScenario({ profile: "A", tier: "STANDARD", expired: false });
    chainId = (await branchMock.listChains())[0].id;
  });

  it("lưu màu/tên/logo; chỉ trường đã đổi thay đổi; khôi phục mặc định", async () => {
    const saved = await brandingMock.updateBranding(chainId, { primaryColor: BLUE, displayName: "Quán X", logoFile: file("image/png", 100) });
    expect(saved).toMatchObject({ primaryColor: BLUE, displayName: "Quán X", isCustom: true });
    expect(saved.logoUrl).toMatch(/^data:/);
    const again = await brandingMock.updateBranding(chainId, { accentColor: GREEN });
    expect(again).toMatchObject({ primaryColor: BLUE, accentColor: GREEN, displayName: "Quán X" });
    expect(again.logoUrl).toMatch(/^data:/);
    const reset = await brandingMock.resetBranding(chainId);
    expect(reset.isCustom).toBe(false);
    expect(reset.logoUrl).toBeUndefined();
  });

  it("lưu qua F5: sau 'tải lại' (ChainState mới) nhận diện đã lưu vẫn còn; Khôi phục mặc định cũng sống qua F5; xoá dữ liệu mock dọn sạch", async () => {
    await brandingMock.updateBranding(chainId, { primaryColor: BLUE, displayName: "Quán F5" });
    expect(localStorage.getItem(`${BRANDING_STORAGE_PREFIX}${chainId}`)).toContain("Quán F5");
    resetMockStates();
    expect(await brandingMock.getBranding(chainId)).toMatchObject({ primaryColor: BLUE, displayName: "Quán F5", isCustom: true });
    await brandingMock.resetBranding(chainId);
    resetMockStates();
    expect((await brandingMock.getBranding(chainId))?.isCustom).toBe(false);
    clearPersistedBranding();
    expect(localStorage.getItem(`${BRANDING_STORAGE_PREFIX}${chainId}`)).toBeNull();
    localStorage.setItem(`${BRANDING_STORAGE_PREFIX}${chainId}`, "{không phải json");
    resetMockStates();
    await expect(brandingMock.getBranding(chainId)).resolves.toMatchObject({ tenantId: chainId });
  });

  it("mock cũng chặn logo sai định dạng / quá cỡ và tên quá dài", async () => {
    await expect(brandingMock.updateBranding(chainId, { logoFile: file("image/webp") })).rejects.toMatchObject({ status: 400 });
    await expect(brandingMock.updateBranding(chainId, { displayName: "x".repeat(51) })).rejects.toMatchObject({ status: 400 });
  });
});
