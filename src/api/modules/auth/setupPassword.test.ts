import { afterEach, describe, expect, it, vi } from "vitest";
import { wrapWithErrorHandling } from "../../define";
import { clearTokens, getAccessToken, getRefreshToken, setSessionExpiredHandler, setTokens } from "../../http/client";
import { ApiError, classifyApiError, setApiErrorHandler } from "../../http/errors";
import { mockControl } from "../../mock/control";
import { SETUP_TOKEN_INVALID } from "./index";
import { authMock } from "./mock";
import { PASSWORD_RULES, failedPasswordRules } from "./passwordRules";
import { authReal } from "./real";

mockControl.latency = [0, 0];
mockControl.failure = null;

describe("luật mật khẩu (theo SetupPasswordDto của BE)", () => {
  it("hợp lệ: 8–128 ký tự, có chữ thường, chữ hoa và chữ số", () => {
    expect(failedPasswordRules("StrongPass123")).toEqual([]);
    expect(failedPasswordRules("Abcdefg1")).toEqual([]);
    expect(failedPasswordRules("A1" + "a".repeat(126))).toEqual([]);
  });

  it("từng luật bị vi phạm riêng lẻ", () => {
    expect(failedPasswordRules("Abc1").map((r) => r.key)).toEqual(["length"]);
    expect(failedPasswordRules("ABCDEFG1").map((r) => r.key)).toEqual(["lower"]);
    expect(failedPasswordRules("abcdefg1").map((r) => r.key)).toEqual(["upper"]);
    expect(failedPasswordRules("Abcdefgh").map((r) => r.key)).toEqual(["digit"]);
    expect(failedPasswordRules("A1" + "a".repeat(127)).map((r) => r.key)).toEqual(["length"]);
  });

  it("chỉ có đúng 4 luật như BE, không luật thêm (ký tự đặc biệt không bắt buộc)", () => {
    expect(PASSWORD_RULES.map((r) => r.key)).toEqual(["length", "lower", "upper", "digit"]);
    expect(failedPasswordRules("Abcdefg1")).toEqual([]);
  });
});

describe("authMock.setupPassword", () => {
  it("token mock-valid: đặt được một lần, lần hai bị từ chối như token đã dùng", async () => {
    await expect(authMock.setupPassword("mock-valid", "StrongPass123")).resolves.toBeUndefined();
    await expect(authMock.setupPassword("mock-valid", "StrongPass123")).rejects.toMatchObject({ code: SETUP_TOKEN_INVALID });
  });

  it("token mock-expired, mock-used và token lạ: cùng lỗi như BE (không phân biệt lý do)", async () => {
    for (const token of ["mock-expired", "mock-used", "khong-ton-tai"]) {
      await expect(authMock.setupPassword(token, "StrongPass123")).rejects.toMatchObject({ status: 401, code: SETUP_TOKEN_INVALID });
    }
  });

  it("mật khẩu yếu bị từ chối 400 với cùng luật, trước cả khi xét token", async () => {
    await expect(authMock.setupPassword("mock-valid", "yeu")).rejects.toMatchObject({ status: 400, details: expect.arrayContaining(["Có chữ hoa"]) });
    await expect(authMock.setupPassword("mock-expired", "yeu")).rejects.toMatchObject({ status: 400 });
  });
});

describe("authReal.setupPassword", () => {
  afterEach(() => vi.unstubAllGlobals());

  const respond = (status: number, body: unknown) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

  it("POST /auth/setup-password công khai (không Bearer), gửi đúng { token, password }", async () => {
    const fetchMock = respond(200, { message: "Password configured successfully" });
    vi.stubGlobal("fetch", fetchMock);
    await authReal.setupPassword("t".repeat(40), "StrongPass123");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/auth\/setup-password$/);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ token: "t".repeat(40), password: "StrongPass123" });
    expect(JSON.stringify(init.headers ?? {})).not.toMatch(/authorization/i);
  });

  it("401 của BE (token sai/hết hạn/đã dùng) → giữ status 401, gắn mã SETUP_TOKEN_INVALID", async () => {
    vi.stubGlobal("fetch", respond(401, { statusCode: 401, message: "Password setup token is invalid or expired" }));
    await expect(authReal.setupPassword("t".repeat(40), "StrongPass123")).rejects.toMatchObject({ status: 401, code: SETUP_TOKEN_INVALID });
  });

  it("đang có phiên: 401 của setupPassword không gọi refresh, không gắn Bearer, không xoá phiên, không báo toàn cục", async () => {
    setTokens("access-dang-co", "refresh-dang-co");
    const fetchMock = respond(401, { statusCode: 401, message: "Password setup token is invalid or expired" });
    vi.stubGlobal("fetch", fetchMock);
    const onGlobalError = vi.fn();
    setApiErrorHandler(onGlobalError);
    const sessionExpired = vi.fn();
    setSessionExpiredHandler(sessionExpired);
    try {
      const api = wrapWithErrorHandling(authReal);
      await expect(api.setupPassword("t".repeat(40), "StrongPass123")).rejects.toMatchObject({ status: 401, code: SETUP_TOKEN_INVALID });
      // Chỉ một request, tới /auth/setup-password, không có /auth/refresh.
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toMatch(/\/auth\/setup-password$/);
      expect(new Headers(init.headers).get("Authorization")).toBeNull();
      // Phiên đang có vẫn còn nguyên, không có thông báo hết phiên/lỗi toàn cục.
      expect(getAccessToken()).toBe("access-dang-co");
      expect(getRefreshToken()).toBe("refresh-dang-co");
      expect(sessionExpired).not.toHaveBeenCalled();
      expect(onGlobalError).not.toHaveBeenCalled();
      expect(classifyApiError(new ApiError(401, "x", [], SETUP_TOKEN_INVALID))).toBe("validation");
      expect(classifyApiError(new ApiError(401, "x"))).toBe("unauthorized");
    } finally {
      setSessionExpiredHandler(() => {});
      setApiErrorHandler(null);
      clearTokens();
    }
  });

  it("400 validate của BE đi tiếp nguyên trạng", async () => {
    vi.stubGlobal("fetch", respond(400, { statusCode: 400, message: ["password must contain a number"] }));
    await expect(authReal.setupPassword("t".repeat(40), "Abcdefgh")).rejects.toMatchObject({ status: 400, details: ["password must contain a number"] });
  });
});
