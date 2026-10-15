import { describe, expect, it } from "vitest";
import { ApiError, classifyApiError, describeApiError, translateBackendMessage } from "./errors";

describe("BE 8a315ad: lỗi mới", () => {
  it("đăng nhập sai (username/email) có câu tiếng Việt cụ thể, không rơi về câu chung", () => {
    const err = new ApiError(401, "Invalid username/email or password");
    expect(translateBackendMessage(err)).toBe("Email/tên đăng nhập hoặc mật khẩu không đúng.");
    expect(describeApiError(err)).toBe("Email/tên đăng nhập hoặc mật khẩu không đúng.");
  });

  it("429 PASSWORD_SETUP_ATTEMPTS_EXCEEDED nói rõ khoá 15 phút, không phải 'chờ một phút'", () => {
    const err = new ApiError(429, "Quá nhiều lần thử. Vui lòng yêu cầu liên kết mới.", [], "PASSWORD_SETUP_ATTEMPTS_EXCEEDED");
    const text = describeApiError(err);
    expect(text).toContain("15 phút");
    expect(text).not.toContain("một phút");
  });

  it("429 không mã vẫn là câu chờ một phút (ghép màn hình)", () => {
    expect(describeApiError(new ApiError(429, "Too many pairing code requests"))).toContain("một phút");
  });

  it("403 PLAN_FEATURE_NOT_ENABLED được xếp loại hạn mức/gói (BR-08)", () => {
    const err = new ApiError(403, "Gói hiện tại không hỗ trợ so sánh nhiều chi nhánh.", [], "PLAN_FEATURE_NOT_ENABLED");
    expect(classifyApiError(err)).toBe("quota");
  });
});
