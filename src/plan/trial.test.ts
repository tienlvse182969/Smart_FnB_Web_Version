import { describe, expect, it } from "vitest";
import {
  READ_ONLY_DEFAULT,
  TRIAL_EXPIRED_MANAGER,
  TRIAL_EXPIRED_OWNER,
  getTrialState,
  getTrialStateOf,
  readOnlyReason,
  trialExpiredText,
  trialLabel,
  trialSubtitle,
} from "./trial";

const iso = (ms: number) => new Date(ms).toISOString();
// 2026-10-13 22:00 giờ VN = 15:00Z.
const NOW = Date.parse("2026-10-13T15:00:00.000Z");
const HOUR = 3_600_000;

const trial = (over: Partial<Parameters<typeof getTrialStateOf>[0] & object> = {}) => ({ code: "TRIAL", status: "active" as const, expiresAt: iso(NOW + 10 * 24 * HOUR), ...over });

describe("getTrialStateOf", () => {
  it("không phải gói TRIAL → none (gói trả phí, không có gói, gói đã chuyển)", () => {
    expect(getTrialStateOf(trial({ code: "BASIC" }), NOW)).toEqual({ kind: "none" });
    expect(getTrialStateOf(trial({ code: null }), NOW)).toEqual({ kind: "none" });
    expect(getTrialStateOf(null, NOW)).toEqual({ kind: "none" });
    expect(getTrialStateOf(undefined, NOW)).toEqual({ kind: "none" });
    expect(getTrialStateOf(trial({ code: "STANDARD", status: "expired" }), NOW)).toEqual({ kind: "none" });
  });

  it("mã TRIAL không phân biệt hoa thường và khoảng trắng", () => {
    expect(getTrialStateOf(trial({ code: " trial " }), NOW).kind).toBe("active");
  });

  it("còn hạn: số ngày theo LỊCH giờ Việt Nam", () => {
    // Hạn 09:00 ngày 23/10 VN, hôm nay 22:00 ngày 13/10 VN → 10 ngày lịch.
    expect(getTrialStateOf(trial({ expiresAt: "2026-10-23T02:00:00.000Z" }), NOW)).toEqual({ kind: "active", daysLeft: 10 });
    expect(getTrialStateOf(trial({ expiresAt: "2026-10-16T02:00:00.000Z" }), NOW)).toEqual({ kind: "active", daysLeft: 3 });
    expect(getTrialStateOf(trial({ expiresAt: "2026-10-14T02:00:00.000Z" }), NOW)).toEqual({ kind: "active", daysLeft: 1 });
  });

  it("ngày cuối: hạn 23:59 ngày D thì cả ngày D là lastDay, KHÔNG BAO GIỜ là 'còn 0 ngày'", () => {
    const expiry = "2026-10-13T16:59:00.000Z"; // 23:59 ngày 13/10 giờ VN
    for (const now of [Date.parse("2026-10-12T17:00:00.000Z") /* 00:00 ngày 13 VN */, Date.parse("2026-10-13T03:00:00.000Z"), Date.parse("2026-10-13T16:58:00.000Z")]) {
      expect(getTrialStateOf(trial({ expiresAt: expiry }), now)).toEqual({ kind: "lastDay" });
    }
    expect(JSON.stringify(getTrialStateOf(trial({ expiresAt: expiry }), NOW))).not.toContain("\"daysLeft\":0");
  });

  it("qua mốc hết hạn là hết ngay (kể cả khi status còn active): 23:59:00 → 00:00 ngày kế", () => {
    const expiry = "2026-10-13T16:59:00.000Z";
    expect(getTrialStateOf(trial({ expiresAt: expiry }), Date.parse("2026-10-13T16:59:00.000Z"))).toEqual({ kind: "expired" });
    expect(getTrialStateOf(trial({ expiresAt: expiry }), Date.parse("2026-10-13T17:00:00.000Z"))).toEqual({ kind: "expired" }); // 00:00 ngày 14 VN
    expect(getTrialStateOf(trial({ expiresAt: expiry }), Date.parse("2026-10-13T16:58:59.000Z"))).toEqual({ kind: "lastDay" });
  });

  it("status expired do BE → expired dù ngày còn xa", () => {
    expect(getTrialStateOf(trial({ status: "expired" }), NOW)).toEqual({ kind: "expired" });
  });

  it("SUSPENDED thắng mọi trạng thái dùng thử (còn hạn, ngày cuối, đã hết)", () => {
    expect(getTrialStateOf(trial({ status: "suspended" }), NOW)).toEqual({ kind: "suspended" });
    expect(getTrialStateOf(trial({ status: "suspended", expiresAt: iso(NOW - HOUR) }), NOW)).toEqual({ kind: "suspended" });
    expect(getTrialStateOf(trial({ status: "suspended", expiresAt: iso(NOW + HOUR) }), NOW)).toEqual({ kind: "suspended" });
  });

  it("expiresAt null, rỗng hoặc sai định dạng → còn hạn nhưng KHÔNG có số ngày (không crash, không NaN)", () => {
    for (const bad of [null, undefined, "", "không phải ngày", "2026-13-45"]) {
      const state = getTrialStateOf(trial({ expiresAt: bad }), NOW);
      expect(state).toEqual({ kind: "active", daysLeft: null });
      expect(trialLabel(state)).toEqual({ text: "Dùng thử", tone: "info" });
      expect(JSON.stringify(trialLabel(state))).not.toContain("NaN");
      expect(trialSubtitle(state)).toBeNull();
    }
  });

  it("status null (BE chưa trả) vẫn tính theo hạn", () => {
    expect(getTrialStateOf(trial({ status: null }), NOW).kind).toBe("active");
    expect(getTrialStateOf(trial({ status: null, expiresAt: iso(NOW - 1) }), NOW).kind).toBe("expired");
  });
});

describe("getTrialState (PlanInfo)", () => {
  const plan = (over: Record<string, unknown> = {}) => ({ planCode: "TRIAL", status: "active" as const, expiresAt: iso(NOW + 5 * 24 * HOUR), noActivePlan: false, ...over });

  it("đọc planCode/status/expiresAt; noActivePlan hoặc không có gói → none", () => {
    expect(getTrialState(plan(), NOW).kind).toBe("active");
    expect(getTrialState(plan({ noActivePlan: true }), NOW)).toEqual({ kind: "none" });
    expect(getTrialState(null, NOW)).toEqual({ kind: "none" });
    expect(getTrialState(plan({ planCode: undefined }), NOW)).toEqual({ kind: "none" });
  });
});

describe("nhãn và màu ngữ nghĩa", () => {
  it("còn nhiều ngày: info; còn 3 ngày trở xuống: warning", () => {
    expect(trialLabel({ kind: "active", daysLeft: 10 })).toEqual({ text: "Dùng thử · còn 10 ngày", tone: "info" });
    expect(trialLabel({ kind: "active", daysLeft: 4 })).toEqual({ text: "Dùng thử · còn 4 ngày", tone: "info" });
    expect(trialLabel({ kind: "active", daysLeft: 3 })).toEqual({ text: "Dùng thử · còn 3 ngày", tone: "warning" });
    expect(trialLabel({ kind: "active", daysLeft: 1 })).toEqual({ text: "Dùng thử · còn 1 ngày", tone: "warning" });
  });

  it("ngày cuối: warning, hết hạn hôm nay; đã hết: error", () => {
    expect(trialLabel({ kind: "lastDay" })).toEqual({ text: "Dùng thử · hết hạn hôm nay", tone: "warning" });
    expect(trialLabel({ kind: "expired" })).toEqual({ text: "Dùng thử đã hết", tone: "error" });
  });

  it("không phải dùng thử hoặc đang tạm ngưng → không có nhãn (tạm ngưng không nói gì về dùng thử)", () => {
    expect(trialLabel({ kind: "none" })).toBeNull();
    expect(trialLabel({ kind: "suspended" })).toBeNull();
    expect(trialSubtitle({ kind: "none" })).toBeNull();
    expect(trialSubtitle({ kind: "suspended" })).toBeNull();
  });

  it("phụ đề của Admin chỉ là chữ (không màu); đã hết, tạm ngưng, không có số ngày thì không có phụ đề", () => {
    expect(trialSubtitle({ kind: "active", daysLeft: 10 })).toBe("còn 10 ngày");
    expect(trialSubtitle({ kind: "active", daysLeft: 2 })).toBe("còn 2 ngày");
    expect(trialSubtitle({ kind: "lastDay" })).toBe("hết hạn hôm nay");
    expect(trialSubtitle({ kind: "expired" })).toBeNull();
    expect(trialSubtitle({ kind: "active", daysLeft: null })).toBeNull();
  });
});

describe("câu báo chỉ đọc theo vai", () => {
  const plan = (over: Record<string, unknown> = {}) => ({ planCode: "TRIAL", status: "expired" as const, expiresAt: iso(NOW - 24 * HOUR), noActivePlan: false, ...over });

  it("TRIAL đã hết: Owner được dặn nâng cấp ở Gói của tôi, Manager được dặn liên hệ chủ chuỗi", () => {
    expect(readOnlyReason(plan(), "owner", NOW)).toBe(TRIAL_EXPIRED_OWNER);
    expect(readOnlyReason(plan(), "manager", NOW)).toBe(TRIAL_EXPIRED_MANAGER);
    expect(TRIAL_EXPIRED_OWNER).toBe("Thời gian dùng thử đã hết. Nâng cấp gói ở trang Gói của tôi để tiếp tục thay đổi dữ liệu.");
    expect(TRIAL_EXPIRED_MANAGER).toBe("Thời gian dùng thử của chuỗi đã hết. Liên hệ chủ chuỗi để nâng cấp.");
  });

  it("gói trả phí, TRIAL tạm ngưng, vai khác → câu cũ", () => {
    expect(readOnlyReason(plan({ planCode: "BASIC" }), "owner", NOW)).toBe(READ_ONLY_DEFAULT);
    expect(readOnlyReason(plan({ status: "suspended" }), "owner", NOW)).toBe(READ_ONLY_DEFAULT);
    expect(readOnlyReason(plan(), "admin", NOW)).toBe(READ_ONLY_DEFAULT);
    expect(readOnlyReason(null, "owner", NOW)).toBe(READ_ONLY_DEFAULT);
    expect(trialExpiredText(plan({ planCode: "BASIC" }), "owner", NOW)).toBeNull();
  });
});
