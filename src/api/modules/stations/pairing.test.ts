import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../http/errors";
import { mockControl } from "../../mock/control";
import { setScenario } from "../../mock/scenario";
import { mapStation, type RawStation } from "./mapper";
import { stationsMock } from "./mock";
import { BE_PAIRING_CONSUMED, BE_PAIRING_INVALID, describePairingError, extractPairingCode, isPairingCode } from "./pairing";
import { createMockPairingCode } from "./pairingMock";
import { stationsReal } from "./real";

mockControl.latency = [0, 0];
mockControl.failure = null;

describe("mã ghép 6 số", () => {
  it("chỉ lấy chữ số, tối đa 6; hợp lệ khi đúng 6 chữ số", () => {
    expect(extractPairingCode("123 456")).toBe("123456");
    expect(extractPairingCode("mã: 98-76-54-32")).toBe("987654");
    expect(extractPairingCode("abc")).toBe("");
    expect(isPairingCode("123456")).toBe(true);
    for (const bad of ["12345", "1234567", "12345a", "", "12 456"]) expect(isPairingCode(bad), bad).toBe(false);
  });

  it("thông báo lỗi ghép nói rõ các nguyên nhân (BE không phân biệt) và loại màn hình đang ghép", () => {
    const invalid = new ApiError(400, BE_PAIRING_INVALID);
    const forCustomer = describePairingError(invalid, "CUSTOMER_DISPLAY")!;
    expect(forCustomer).toMatch(/sai/);
    expect(forCustomer).toMatch(/hết hạn/);
    expect(forCustomer).toMatch(/đã được dùng/);
    expect(forCustomer).toMatch(/màn hình gọi số/); // mã của loại kia
    expect(describePairingError(invalid, "CALLING_DISPLAY")).toMatch(/mã của màn hình khách/);
    expect(describePairingError(new ApiError(400, BE_PAIRING_CONSUMED), "CUSTOMER_DISPLAY")).toMatch(/vừa được dùng/);
    expect(describePairingError(new ApiError(404, "Active station was not found in your branch"), "CUSTOMER_DISPLAY")).toMatch(/Quầy/);
    expect(describePairingError(new ApiError(500, "x"), "CUSTOMER_DISPLAY")).toBeNull();
    expect(describePairingError(new Error("x"), "CUSTOMER_DISPLAY")).toBeNull();
  });
});

describe("mapper thiết bị: không bao giờ có token", () => {
  it("bỏ token/hash/trường lạ của thiết bị", () => {
    const raw = {
      id: "s1",
      name: "Quầy 1",
      status: "ACTIVE",
      printerConnection: "NONE",
      printerAddress: null,
      displayDevices: [{ id: "d1", type: "CUSTOMER_DISPLAY", name: "Tablet", pairedAt: "2026-10-01T00:00:00.000Z", lastSeenAt: "2026-10-02T00:00:00.000Z", tokenHash: "h", deviceToken: "t0k3n", stationId: "s1" }],
    } as unknown as RawStation;
    const s = mapStation(raw);
    expect(s.devices[0]).toEqual({ id: "d1", type: "CUSTOMER_DISPLAY", name: "Tablet", pairedAt: "2026-10-01T00:00:00.000Z", lastSeenAt: "2026-10-02T00:00:00.000Z" });
    expect(JSON.stringify(s)).not.toMatch(/token|hash|t0k3n/i);
  });
});

describe("stationsMock — ghép và thu hồi (BR-45)", () => {
  const branchId = "branch-pairing-test";
  let stationId = "";
  beforeEach(async () => {
    setScenario({ profile: "A", tier: null, expired: false });
    stationId = (await stationsMock.listStations(branchId)).find((s) => s.name === "Quầy 2")!.id;
  });
  afterEach(() => setScenario({ expired: false }));

  it("mã đúng: ghép được, thiết bị hiện trong quầy, không có token", async () => {
    const { code } = createMockPairingCode("CUSTOMER_DISPLAY");
    const r = await stationsMock.pairCustomerDisplay(branchId, stationId, code, " Tablet mới ");
    expect(Object.keys(r)).toEqual(["deviceId"]);
    const station = (await stationsMock.listStations(branchId)).find((s) => s.id === stationId)!;
    expect(station.devices).toHaveLength(1);
    expect(station.devices[0]).toMatchObject({ id: r.deviceId, type: "CUSTOMER_DISPLAY", name: "Tablet mới" });
    expect(JSON.stringify(station)).not.toMatch(/token|hash/i);
  });

  it("mã sai, hết hạn, đã dùng, sai loại: cùng một lỗi 400 như BE, không tạo thiết bị", async () => {
    const wrongType = createMockPairingCode("CALLING_DISPLAY").code;
    const expired = createMockPairingCode("CUSTOMER_DISPLAY", { expired: true }).code;
    const used = createMockPairingCode("CUSTOMER_DISPLAY").code;
    const good = await stationsMock.pairCustomerDisplay(branchId, stationId, used);
    for (const code of ["000000", expired, used, wrongType]) {
      await expect(stationsMock.pairCustomerDisplay(branchId, stationId, code)).rejects.toMatchObject({ status: 400, message: BE_PAIRING_INVALID });
    }
    // Các lần thất bại không đổi gì: thiết bị của quầy vẫn là máy ghép thành công đầu tiên.
    expect((await stationsMock.listStations(branchId)).find((s) => s.id === stationId)!.devices.map((d) => d.id)).toEqual([good.deviceId]);
    // ngược lại: mã của màn hình khách đem ghép màn hình gọi số
    const customerCode = createMockPairingCode("CUSTOMER_DISPLAY").code;
    await expect(stationsMock.pairCallingDisplay(branchId, customerCode)).rejects.toMatchObject({ status: 400, message: BE_PAIRING_INVALID });
  });

  it("BR-45: ghép màn khách thứ hai vào quầy đã có màn hình thì máy cũ tự bị thu hồi (mỗi quầy một màn hình khách)", async () => {
    const first = await stationsMock.pairCustomerDisplay(branchId, stationId, createMockPairingCode("CUSTOMER_DISPLAY").code, "Máy cũ");
    const second = await stationsMock.pairCustomerDisplay(branchId, stationId, createMockPairingCode("CUSTOMER_DISPLAY").code, "Máy mới");
    const devices = (await stationsMock.listStations(branchId)).find((s) => s.id === stationId)!.devices;
    expect(devices.map((d) => d.id)).toEqual([second.deviceId]);
    expect(devices[0].name).toBe("Máy mới");
    await expect(stationsMock.revokeDevice(branchId, first.deviceId)).rejects.toMatchObject({ status: 404 }); // máy cũ đã bị thu hồi
  });

  it("thu hồi: xoá thiết bị; id lạ → 404; quầy không đang dùng/không có → 404", async () => {
    const { deviceId } = await stationsMock.pairCustomerDisplay(branchId, stationId, createMockPairingCode("CUSTOMER_DISPLAY").code);
    await stationsMock.revokeDevice(branchId, deviceId);
    expect((await stationsMock.listStations(branchId)).find((s) => s.id === stationId)!.devices).toHaveLength(0);
    await expect(stationsMock.revokeDevice(branchId, "khong-co")).rejects.toMatchObject({ status: 404, message: "Active display device was not found in your branch" });
    await expect(stationsMock.pairCustomerDisplay(branchId, "khong-co", createMockPairingCode("CUSTOMER_DISPLAY").code)).rejects.toMatchObject({ status: 404 });
  });

  it("màn hình gọi số: ghép bằng mã loại CALLING_DISPLAY, ghép máy mới thay máy cũ, thu hồi được; không có hàm liệt kê (#28)", async () => {
    const a = await stationsMock.pairCallingDisplay(branchId, createMockPairingCode("CALLING_DISPLAY").code, "TV 1");
    const b = await stationsMock.pairCallingDisplay(branchId, createMockPairingCode("CALLING_DISPLAY").code, "TV 2");
    await expect(stationsMock.revokeDevice(branchId, a.deviceId)).rejects.toMatchObject({ status: 404 });
    await stationsMock.revokeDevice(branchId, b.deviceId);
    expect(Object.keys(stationsMock).some((k) => /callingDisplays|listDisplayDevices/i.test(k))).toBe(false);
  });

  it("hết hạn gói: mọi thao tác ghép/thu hồi bị chặn (chỉ đọc), vẫn xem được quầy", async () => {
    const code = createMockPairingCode("CUSTOMER_DISPLAY").code;
    setScenario({ expired: true });
    await expect(stationsMock.pairCustomerDisplay(branchId, stationId, code)).rejects.toMatchObject({ status: 403, code: "SUBSCRIPTION_READ_ONLY" });
    await expect(stationsMock.pairCallingDisplay(branchId, createMockPairingCode("CALLING_DISPLAY").code)).rejects.toMatchObject({ status: 403 });
    await expect(stationsMock.revokeDevice(branchId, "x")).rejects.toMatchObject({ status: 403 });
    expect((await stationsMock.listStations(branchId)).length).toBeGreaterThan(0);
  });
});

describe("stationsReal — ghép và thu hồi đúng DTO của BE", () => {
  afterEach(() => vi.unstubAllGlobals());
  const respond = (body: unknown) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } }));
  const call = (fn: ReturnType<typeof vi.fn>) => {
    const [url, init] = fn.mock.calls[0] as [string, RequestInit];
    return { path: new URL(url).pathname, method: init.method, body: init.body ? JSON.parse(String(init.body)) : undefined };
  };

  it("ghép màn khách: POST /stations/pair-customer-display {stationId, code, deviceName}; chỉ trả deviceId", async () => {
    const fetchMock = respond({ deviceId: "d1", stationId: "s1", branchId: "b1", deviceToken: "KHONG-DUOC-LOT" });
    vi.stubGlobal("fetch", fetchMock);
    const r = await stationsReal.pairCustomerDisplay("b1", "s1", "123456", " Tablet ");
    expect(call(fetchMock)).toMatchObject({ method: "POST", body: { stationId: "s1", code: "123456", deviceName: "Tablet" } });
    expect(call(fetchMock).path).toMatch(/\/stations\/pair-customer-display$/);
    expect(r).toEqual({ deviceId: "d1" });
  });

  it("ghép màn gọi số: POST /stations/pair-calling-display {code}; không gửi deviceName rỗng", async () => {
    const fetchMock = respond({ deviceId: "d2", branchId: "b1" });
    vi.stubGlobal("fetch", fetchMock);
    await stationsReal.pairCallingDisplay("b1", "654321", "  ");
    expect(call(fetchMock).body).toEqual({ code: "654321" });
    expect(call(fetchMock).path).toMatch(/\/stations\/pair-calling-display$/);
  });

  it("thu hồi: DELETE /display-devices/{id}", async () => {
    const fetchMock = respond({ revoked: true });
    vi.stubGlobal("fetch", fetchMock);
    await stationsReal.revokeDevice("b1", "d9");
    expect(call(fetchMock)).toMatchObject({ method: "DELETE" });
    expect(call(fetchMock).path).toMatch(/\/display-devices\/d9$/);
  });
});
