/**
 * Lượt 7.7c (QĐ 126–131, BE `7d7f2dc`): lớp lỗi đọc `body.code`, #75 (tiền về sau QR hết hạn có đường xử lý), #27/#34 sửa quầy,
 * #28 danh sách màn hình, #62–#64 nhân viên, #68–#71 màn gọi số, #29.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { toApiError } from "./http/client";
import { ApiError, describeApiError, TOO_MANY_REQUESTS_TEXT } from "./http/errors";
import { describePairingError } from "./modules/stations/pairing";
import { classifyContextFailure, type StoredPairing } from "./device/session";
import { fitToCapacity } from "../display/callBoard";
import { confirmableTransfer, isLateAfterExpiry } from "./modules/order/manualConfirm";
import { cancelTarget, refundAmountFor } from "./modules/order/paidCancel";
import { branchDeviceState, mapBranchDevice, mapStation } from "./modules/stations/mapper";
import { toPatchBody, validateStationPatch } from "./modules/stations/rules";
import { stationsMock } from "./modules/stations/mock";
import { mapStaffEmployee, type RawStaff } from "./modules/account/mapper";
import { canCancelInvite, invitationLabel } from "../roles/branch/StaffTable";
import { mockControl } from "./mock/control";
import type { OrderPaymentRecord } from "../types";

mockControl.latency = [0, 0];
mockControl.failure = null;

describe("lớp lỗi đọc body.code (QĐ 126)", () => {
  it("ưu tiên code > error > message; error dạng tên HTTP không phải mã", () => {
    expect(toApiError(409, { code: "STATION_NAME_ALREADY_EXISTS", message: "A station…" }).code).toBe("STATION_NAME_ALREADY_EXISTS");
    expect(toApiError(409, { statusCode: 409, error: "PAYMENT_ALREADY_SETTLED", message: "Payment…" }).code).toBe("PAYMENT_ALREADY_SETTLED");
    expect(toApiError(409, { code: "A_CODE", error: "B_CODE", message: "x" }).code).toBe("A_CODE");
    expect(toApiError(400, { error: "Bad Request", message: "x" }).code).toBeNull();
  });

  it("câu tiếng Việt theo mã, không tiếng Anh thô", () => {
    const station = toApiError(409, { code: "STATION_NAME_ALREADY_EXISTS", message: "A station with this name already exists in the branch" });
    expect(describeApiError(station)).toBe("Tên quầy đã có trong chi nhánh. Chọn tên khác.");
    for (const code of ["PAIRING_CODE_INVALID", "PAIRING_CODE_USED", "PAIRING_CODE_EXPIRED"]) {
      const text = describeApiError(toApiError(400, { code, message: "Pairing code …" }));
      expect(text).toMatch(/Mã ghép/);
      expect(text).not.toMatch(/Pairing/);
    }
    for (const code of ["DEVICE_TOKEN_MISSING", "DEVICE_TOKEN_INVALID", "DEVICE_TOKEN_REVOKED", "DEVICE_TOKEN_EXPIRED"]) {
      const text = describeApiError(toApiError(403, { code, message: "Display device token …" }));
      expect(text).toMatch(/ghép lại/);
      expect(text).not.toMatch(/Display device/);
    }
  });

  it("403 thiếu quyền (không mã) vẫn là câu thiếu quyền; 429 có câu riêng", () => {
    expect(describeApiError(toApiError(403, { message: "Forbidden resource" }))).toBe("Bạn không đủ quyền thực hiện thao tác này.");
    expect(describeApiError(new ApiError(429, "Too many pairing code requests"))).toBe(TOO_MANY_REQUESTS_TEXT);
  });

  it("hộp ghép: câu theo mã, sai loại nêu loại màn hình", () => {
    const err = (code: string) => toApiError(400, { code, message: "Pairing code …" });
    expect(describePairingError(err("PAIRING_CODE_EXPIRED"), "CUSTOMER_DISPLAY")).toMatch(/hết hạn/);
    expect(describePairingError(err("PAIRING_CODE_USED"), "CUSTOMER_DISPLAY")).toMatch(/đã được dùng/);
    expect(describePairingError(err("PAIRING_CODE_INVALID"), "CUSTOMER_DISPLAY")).toMatch(/màn hình gọi số/);
    expect(describePairingError(err("PAIRING_CODE_INVALID"), "CALLING_DISPLAY")).toMatch(/màn hình khách/);
  });

  it("màn TV: token REVOKED/EXPIRED → quay về bước ghép (kể cả khi chưa đánh dấu paired)", () => {
    const pairing = { pairingId: "p", code: "123456", deviceToken: "t", expiresAt: new Date(Date.now() + 60_000).toISOString(), paired: false, issuedAt: Date.now() } as StoredPairing;
    expect(classifyContextFailure(toApiError(403, { code: "DEVICE_TOKEN_EXPIRED", message: "x" }), pairing)).toBe("revoked");
    expect(classifyContextFailure(toApiError(403, { code: "DEVICE_TOKEN_REVOKED", message: "x" }), pairing)).toBe("revoked");
    // chưa ghép + token sai/thiếu: tiếp tục chờ
    expect(classifyContextFailure(toApiError(403, { code: "DEVICE_TOKEN_INVALID", message: "x" }), pairing)).toBe("waiting");
  });
});

describe("#71: '+N số khác' dùng tổng BE", () => {
  it("BE chỉ trả 30 số nhưng tổng 42 → hiện +N theo tổng, kể cả khi 30 số vừa ô", () => {
    const items = Array.from({ length: 6 }, (_, i) => i);
    expect(fitToCapacity(items, 8)).toEqual({ shown: items, hidden: 0 });
    expect(fitToCapacity(items, 8, 12)).toEqual({ shown: items, hidden: 6 });
    expect(fitToCapacity(Array.from({ length: 30 }, (_, i) => i), 8, 42)).toMatchObject({ hidden: 35 }); // 7 số hiện + "+35 số khác"
  });

  it("thiếu tổng (BE cũ) hoặc tổng nhỏ hơn số đang có: như trước", () => {
    expect(fitToCapacity([1, 2, 3], 8, undefined)).toEqual({ shown: [1, 2, 3], hidden: 0 });
    expect(fitToCapacity([1, 2, 3], 8, 2)).toEqual({ shown: [1, 2, 3], hidden: 0 });
  });
});

describe("#75: tiền về sau QR hết hạn có đường xử lý (BE 7d7f2dc)", () => {
  const late: OrderPaymentRecord = {
    id: "p-late",
    paymentCode: "PAY-L",
    method: "BANK_TRANSFER",
    status: "REQUIRES_ATTENTION",
    amount: 75000,
    receivedAmount: 75000,
    transactionRef: null,
    confirmationReason: null,
    confirmedAt: null,
    paidAt: "2026-10-13T03:00:00.000Z",
    createdAt: "2026-10-13T02:50:00.000Z",
    failureReason: "PAYMENT_RECEIVED_AFTER_EXPIRY",
    processedBy: null,
  };
  const order = { status: "REQUIRES_ATTENTION", paymentStatus: "UNPAID", payments: [late], refunds: [] };

  it("nhận biết khoản muộn; khoản REQUIRES_ATTENTION lý do khác thì không", () => {
    expect(isLateAfterExpiry(late)).toBe(true);
    expect(isLateAfterExpiry({ ...late, failureReason: null })).toBe(false);
    expect(isLateAfterExpiry({ ...late, status: "SUCCESS" })).toBe(false);
  });

  it("xác nhận thủ công: đơn UNPAID + REQUIRES_ATTENTION + khoản muộn → có nút; thiếu failureReason → không", () => {
    expect(confirmableTransfer(order)?.id).toBe("p-late");
    expect(confirmableTransfer({ ...order, payments: [{ ...late, failureReason: null }] })).toBeNull();
    expect(confirmableTransfer({ ...order, status: "CANCELLED" })).toBeNull();
    expect(confirmableTransfer({ ...order, payments: [{ ...late, method: "CASH" }] })).toBeNull();
  });

  it("huỷ đơn: kind 'late', cả đơn, hoàn đúng số đã nhận; không cho chọn dòng", () => {
    const target = cancelTarget({ ...order, refunds: [] });
    expect(target).toMatchObject({ kind: "late", paymentId: "p-late", received: 75000, balance: 75000 });
    expect(refundAmountFor(target!, [{ id: "l1", total: 20000 } as never], ["l1"])).toBe(75000);
  });

  it("khoản chuyển khoản lệch tiền vẫn ưu tiên và vẫn 'mismatch'", () => {
    const mismatch: OrderPaymentRecord = { ...late, id: "p-mis", status: "AMOUNT_MISMATCH", failureReason: null, receivedAmount: 60000 };
    expect(cancelTarget({ ...order, payments: [mismatch] })).toMatchObject({ kind: "mismatch", received: 60000 });
    expect(confirmableTransfer({ ...order, payments: [mismatch, late] })?.id).toBe("p-mis");
  });
});

describe("#27/#34: sửa quầy", () => {
  it("toPatchBody: chỉ trường đổi, tên trim, không gửi địa chỉ khi NONE, MAC viết hoa", () => {
    expect(toPatchBody({ name: "  Quầy A " })).toEqual({ name: "Quầy A" });
    expect(toPatchBody({ status: "INACTIVE" })).toEqual({ status: "INACTIVE" });
    expect(toPatchBody({ printerConnection: "NONE", printerAddress: "1.2.3.4" })).toEqual({ printerConnection: "NONE" });
    expect(toPatchBody({ printerConnection: "BLUETOOTH", printerAddress: "aa:bb:cc:dd:ee:ff" })).toEqual({ printerConnection: "BLUETOOTH", printerAddress: "AA:BB:CC:DD:EE:FF" });
  });

  it("validateStationPatch: trùng tên chỉ với quầy KHÁC; giữ nguyên tên mình thì hợp lệ", () => {
    const stations = [{ id: "a", name: "Quầy 1" }, { id: "b", name: "Quầy 2" }];
    expect(validateStationPatch(stations[0], { name: "Quầy 1", printerConnection: "NONE" }, stations)).toEqual([]);
    expect(validateStationPatch(stations[0], { name: "Quầy 2", printerConnection: "NONE" }, stations)).toEqual(["Tên quầy đã có trong chi nhánh"]);
    expect(validateStationPatch(stations[0], { name: "Quầy 1", printerConnection: "WIFI", printerAddress: "abc" }, stations)[0]).toMatch(/IP không hợp lệ/);
  });

  describe("mock PATCH", () => {
    beforeEach(() => undefined);
    afterEach(() => undefined);
    it("đổi tên, ngừng dùng, trùng tên → 409 STATION_NAME_ALREADY_EXISTS", async () => {
      const branch = "b-7d7f2dc";
      const [one, two] = await stationsMock.listStations(branch);
      const renamed = await stationsMock.updateStation(branch, one.id, { name: "Quầy mới" });
      expect(renamed.name).toBe("Quầy mới");
      const off = await stationsMock.updateStation(branch, one.id, { status: "INACTIVE" });
      expect(off.status).toBe("INACTIVE");
      await expect(stationsMock.updateStation(branch, two.id, { name: "Quầy mới" })).rejects.toMatchObject({ status: 409, code: "STATION_NAME_ALREADY_EXISTS" });
      // `two` chưa có máy in: đổi sang WiFi mà thiếu địa chỉ → 400 như BE.
      await expect(stationsMock.updateStation(branch, two.id, { printerConnection: "WIFI" })).rejects.toMatchObject({ status: 400 });
    });
  });
});

describe("#28: danh sách màn hình của chi nhánh", () => {
  it("mapBranchDevice giữ quầy, hạn token, thu hồi; không chép trường lạ (token)", () => {
    const d = mapBranchDevice({
      id: "d1",
      type: "CALLING_DISPLAY",
      name: "TV",
      station: null,
      pairedAt: "2026-10-11T08:46:13.582Z",
      lastSeenAt: null,
      tokenExpiresAt: "2026-11-10T08:46:13.582Z",
      revokedAt: null,
      ...({ tokenHash: "secret" } as object),
    } as never);
    expect(d).toEqual({ id: "d1", type: "CALLING_DISPLAY", name: "TV", stationName: null, pairedAt: "2026-10-11T08:46:13.582Z", lastSeenAt: null, tokenExpiresAt: "2026-11-10T08:46:13.582Z", revokedAt: null });
    expect(JSON.stringify(d)).not.toMatch(/secret/);
  });

  it("trạng thái: thu hồi > hết hạn > đang dùng", () => {
    const now = Date.parse("2026-10-13T00:00:00.000Z");
    expect(branchDeviceState({ revokedAt: "2026-10-12T00:00:00.000Z", tokenExpiresAt: "2026-11-10T00:00:00.000Z" }, now)).toBe("REVOKED");
    expect(branchDeviceState({ revokedAt: null, tokenExpiresAt: "2026-10-01T00:00:00.000Z" }, now)).toBe("EXPIRED");
    expect(branchDeviceState({ revokedAt: null, tokenExpiresAt: "2026-11-10T00:00:00.000Z" }, now)).toBe("ACTIVE");
    expect(branchDeviceState({ revokedAt: null, tokenExpiresAt: null }, now)).toBe("ACTIVE");
  });

  it("mapStation vẫn whitelist (không token)", () => {
    expect(mapStation({ id: "s", name: "Q", status: "ACTIVE", printerConnection: "NONE", printerAddress: null, ...({ tokenHash: "x" } as object) } as never)).not.toHaveProperty("tokenHash");
  });
});

describe("#62/#63/#64: nhân viên", () => {
  const raw = (over: Partial<RawStaff> = {}, user: Partial<RawStaff["user"]> = {}): RawStaff => ({
    id: "e1",
    branchId: "b",
    employeeCode: "C1",
    firstName: "An",
    lastName: "Nguyễn",
    user: { email: "a@x.vn", phone: null, status: "ACTIVE", role: { code: "CASHIER" }, ...user },
    ...over,
  });

  it("mapStaffEmployee đọc lastLoginAt và trạng thái lời mời", () => {
    const s = mapStaffEmployee(raw({ invitationStatus: "INVITED", invitationExpiresAt: "2026-10-14T00:00:00.000Z" }, { status: "INACTIVE", lastLoginAt: null }))!;
    expect(s).toMatchObject({ lastLoginAt: null, invitationStatus: "INVITED", invitationExpiresAt: "2026-10-14T00:00:00.000Z" });
    expect(mapStaffEmployee(raw({}, { lastLoginAt: "2026-10-12T01:00:00.000Z" }))!.lastLoginAt).toBe("2026-10-12T01:00:00.000Z");
    expect(mapStaffEmployee(raw({ invitationStatus: "WEIRD" }))!.invitationStatus).toBeNull();
  });

  it("nhãn tách 'Chưa kích hoạt (đã mời)', 'Lời mời hết hạn', 'Đã ngừng'; chỉ INACTIVE", () => {
    expect(invitationLabel({ status: "INACTIVE", invitationStatus: "INVITED" })).toBe("Chưa kích hoạt (đã mời)");
    expect(invitationLabel({ status: "INACTIVE", invitationStatus: "INVITATION_EXPIRED" })).toBe("Lời mời hết hạn");
    expect(invitationLabel({ status: "INACTIVE", invitationStatus: "DEACTIVATED" })).toBe("Đã ngừng");
    expect(invitationLabel({ status: "INACTIVE", invitationStatus: null })).toBeNull();
    expect(invitationLabel({ status: "ACTIVE", invitationStatus: "ACTIVE" })).toBeNull();
  });

  it("nút Huỷ lời mời chỉ khi INACTIVE còn lời mời (còn hạn hoặc hết hạn)", () => {
    expect(canCancelInvite({ status: "INACTIVE", invitationStatus: "INVITED" })).toBe(true);
    expect(canCancelInvite({ status: "INACTIVE", invitationStatus: "INVITATION_EXPIRED" })).toBe(true);
    expect(canCancelInvite({ status: "INACTIVE", invitationStatus: "DEACTIVATED" })).toBe(false);
    expect(canCancelInvite({ status: "ACTIVE", invitationStatus: "ACTIVE" })).toBe(false);
  });
});
