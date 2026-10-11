import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearTokens, setTokens } from "./client";
import { ApiError } from "./errors";
import { describeApiError } from "./errors";
import { deviceRequest } from "./deviceClient";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("client thiết bị (quyết định 105)", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    clearTokens();
    setTokens("user-access", "user-refresh");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    clearTokens();
  });

  it("gửi token THIẾT BỊ, không bao giờ gửi token người dùng", async () => {
    fetchMock.mockResolvedValue(json(200, { ok: true }));
    await deviceRequest("/public/calling-display/context", { token: "device-token" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/public\/calling-display\/context$/);
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer device-token");
    expect(JSON.stringify([...(init.headers as Headers).entries()])).not.toContain("user-access");
  });

  it("công khai: không có token thì không có Authorization (tạo mã ghép), thân là JSON", async () => {
    fetchMock.mockResolvedValue(json(201, { code: "123456" }));
    await deviceRequest("/device-pairing/codes", { method: "POST", body: { deviceType: "CALLING_DISPLAY" } });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Headers).has("Authorization")).toBe(false);
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ deviceType: "CALLING_DISPLAY" }));
  });

  it("403/401: ném ApiError giữ status, KHÔNG làm mới phiên, KHÔNG xoá phiên người dùng", async () => {
    fetchMock.mockResolvedValue(json(401, { statusCode: 401, message: "Unauthorized" }));
    await expect(deviceRequest("/public/calling-display/context", { token: "t" })).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockResolvedValue(json(403, { statusCode: 403, message: "Display device token is invalid or revoked" }));
    const err = await deviceRequest("/public/calling-display/context", { token: "t" }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(403);
    expect(localStorage.getItem("smartfnb_access_token")).toBe("user-access");
  });

  it("mất mạng → ApiError status 0; lỗi hiện bằng tiếng Việt, không có tiếng Anh thô", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const net = await deviceRequest("/public/calling-display/context", { token: "t" }).catch((e: unknown) => e);
    expect((net as ApiError).status).toBe(0);
    expect(describeApiError(net)).toBe("Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.");
    fetchMock.mockResolvedValue(json(500, { statusCode: 500, message: "Internal server error" }));
    const server = await deviceRequest("/public/calling-display/context", { token: "t" }).catch((e: unknown) => e);
    expect(describeApiError(server)).toBe("Máy chủ đang gặp sự cố, thử lại sau ít phút.");
    fetchMock.mockResolvedValue(json(400, { statusCode: 400, message: "Could not allocate a pairing code" }));
    const code = await deviceRequest("/device-pairing/codes", { method: "POST", body: {} }).catch((e: unknown) => e);
    expect(describeApiError(code)).toBe("Không tạo được mã ghép, thử lại.");
  });
});
