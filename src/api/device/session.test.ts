import { beforeEach, describe, expect, it } from "vitest";
import { ApiError } from "../http/errors";
import {
  CALLING_DISPLAY_STORAGE_KEY,
  PAIRED_LIVE_POLL_MS,
  PAIRED_POLL_MS,
  RETRY_MAX_MS,
  WAITING_POLL_MS,
  backoffDelay,
  classifyContextFailure,
  isCodeExpired,
  loadPairing,
  nextPollDelay,
  savePairing,
  type StoredPairing,
} from "./session";

const NOW = Date.parse("2026-10-11T10:00:00Z");
const base: StoredPairing = { pairingId: "p", code: "123456", deviceToken: "tok", expiresAt: "2026-10-11T10:05:00Z" };
const forbidden = new ApiError(403, "Display device token is invalid or revoked");

describe("phân loại lỗi đọc ngữ cảnh (quyết định 107)", () => {
  it("đã ghép mà bị 403 → thu hồi (về bước ghép)", () => {
    expect(classifyContextFailure(forbidden, { ...base, paired: true }, NOW)).toBe("revoked");
    // kể cả trong vòng 5 phút đầu sau khi tạo mã: không được nhầm với "đang chờ"
    expect(classifyContextFailure(forbidden, { ...base, paired: true }, NOW - 60_000)).toBe("revoked");
    expect(classifyContextFailure(new ApiError(401, "Unauthorized"), { ...base, paired: true }, NOW)).toBe("revoked");
  });

  it("chưa ghép: 403 khi mã còn hạn là chờ (không hiện lỗi); hết hạn thì tạo mã mới", () => {
    expect(classifyContextFailure(forbidden, base, NOW)).toBe("waiting");
    expect(classifyContextFailure(forbidden, { ...base, paired: false }, NOW)).toBe("waiting");
    expect(classifyContextFailure(forbidden, base, Date.parse("2026-10-11T10:05:01Z"))).toBe("code-expired");
  });

  it("mất mạng, 5xx, lỗi lạ → tạm thời (giữ token)", () => {
    for (const status of [0, 500, 502, 503, 404, 429]) {
      expect(classifyContextFailure(new ApiError(status, "x"), { ...base, paired: true }, NOW)).toBe("transient");
    }
    expect(classifyContextFailure(new TypeError("boom"), { ...base, paired: true }, NOW)).toBe("transient");
  });

  it("hạn mã: so với expiresAt; chuỗi hỏng coi là đã hết hạn", () => {
    expect(isCodeExpired(base, NOW)).toBe(false);
    expect(isCodeExpired({ expiresAt: "2026-10-11T10:00:00Z" }, NOW)).toBe(true);
    expect(isCodeExpired({ expiresAt: "không phải ngày" }, NOW)).toBe(true);
  });

  it("có issuedAt: tính theo thời gian trôi qua, không phụ thuộc đồng hồ máy lệch so với BE", () => {
    // Đồng hồ máy chạy nhanh 1 giờ so với BE: expiresAt (giờ BE) đã "quá khứ" nhưng mã vừa nhận.
    const skewed = { expiresAt: "2026-10-11T10:05:00Z", issuedAt: NOW + 3_600_000 };
    expect(isCodeExpired(skewed, NOW + 3_600_000 + 60_000)).toBe(false);
    expect(isCodeExpired(skewed, NOW + 3_600_000 + 5 * 60_000)).toBe(true);
    expect(classifyContextFailure(forbidden, { ...base, ...skewed }, NOW + 3_600_000 + 1000)).toBe("waiting");
  });
});

describe("giãn cách thử lại (không dồn dập)", () => {
  it("5s, 10s, 20s, 40s rồi dừng ở 60s", () => {
    expect([1, 2, 3, 4, 5, 6, 20].map(backoffDelay)).toEqual([5000, 10000, 20000, 40000, RETRY_MAX_MS, RETRY_MAX_MS, RETRY_MAX_MS]);
  });

  it("nhịp hỏi: chờ ghép 3s; đã ghép 10s, có socket 60s; lỗi thì theo giãn cách", () => {
    expect(nextPollDelay({ failures: 0, paired: false, live: false })).toBe(WAITING_POLL_MS);
    expect(nextPollDelay({ failures: 0, paired: true, live: false })).toBe(PAIRED_POLL_MS);
    expect(nextPollDelay({ failures: 0, paired: true, live: true })).toBe(PAIRED_LIVE_POLL_MS);
    expect(nextPollDelay({ failures: 3, paired: true, live: true })).toBe(20000);
    expect(nextPollDelay({ failures: 2, paired: false, live: false })).toBe(10000);
  });
});

describe("lưu token thiết bị", () => {
  beforeEach(() => localStorage.clear());

  it("lưu rồi đọc lại (F5 vẫn giữ ghép), xoá thì mất", () => {
    savePairing({ ...base, paired: true });
    expect(JSON.parse(localStorage.getItem(CALLING_DISPLAY_STORAGE_KEY) ?? "null")).toMatchObject({ deviceToken: "tok", paired: true });
    expect(loadPairing()).toMatchObject({ deviceToken: "tok", paired: true });
    savePairing(null);
    expect(localStorage.getItem(CALLING_DISPLAY_STORAGE_KEY)).toBeNull();
    expect(loadPairing()).toBeNull();
  });

  it("dữ liệu hỏng hoặc thiếu token → coi như chưa ghép", () => {
    localStorage.setItem(CALLING_DISPLAY_STORAGE_KEY, "{không phải json");
    expect(loadPairing()).toBeNull();
    localStorage.setItem(CALLING_DISPLAY_STORAGE_KEY, JSON.stringify({ code: "123456" }));
    expect(loadPairing()).toBeNull();
  });

  it("không đụng token phiên người dùng", () => {
    localStorage.setItem("smartfnb_access_token", "user");
    savePairing(base);
    savePairing(null);
    expect(localStorage.getItem("smartfnb_access_token")).toBe("user");
  });
});
