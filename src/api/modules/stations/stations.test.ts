import { afterEach, describe, expect, it, vi } from "vitest";
import { mockControl } from "../../mock/control";
import { setScenario } from "../../mock/scenario";
import { mapStation, type RawStation } from "./mapper";
import { stationsMock } from "./mock";
import { stationsReal } from "./real";
import { isIpv4, isMac, toCreateBody, validateStationInput } from "./rules";

mockControl.latency = [0, 0];
mockControl.failure = null;

describe("kiểm IPv4 và MAC (BE chỉ kiểm không rỗng, web kiểm định dạng)", () => {
  it("IPv4: hợp lệ, có hoặc không có cổng", () => {
    for (const ok of ["192.168.1.50", "10.0.0.1", "0.0.0.0", "255.255.255.255", "192.168.1.50:9100", "1.2.3.4:1", "1.2.3.4:65535", " 192.168.1.50 "]) expect(isIpv4(ok), ok).toBe(true);
  });

  it("IPv4: sai", () => {
    for (const bad of ["", "192.168.1", "192.168.1.256", "192.168.1.50.1", "192.168.01.50", "a.b.c.d", "192.168.1.50:0", "192.168.1.50:65536", "192.168.1.50:", "192.168.1.50:99999", "::1", "my-printer.local"])
      expect(isIpv4(bad), bad).toBe(false);
  });

  it("MAC: XX:XX:XX:XX:XX:XX (hoa hay thường)", () => {
    for (const ok of ["AA:BB:CC:DD:EE:FF", "aa:bb:cc:dd:ee:ff", "00:1A:2b:3C:4d:5E"]) expect(isMac(ok), ok).toBe(true);
    for (const bad of ["", "AA:BB:CC:DD:EE", "AA-BB-CC-DD-EE-FF", "AABBCCDDEEFF", "GG:BB:CC:DD:EE:FF", "AA:BB:CC:DD:EE:FF:00", "A:B:C:D:E:F"]) expect(isMac(bad), bad).toBe(false);
  });
});

describe("validateStationInput", () => {
  const ok = { name: "Quầy 3", printerConnection: "NONE" as const };

  it("tên bắt buộc, tối đa 100 ký tự, không trùng tên trong chi nhánh", () => {
    expect(validateStationInput(ok)).toEqual([]);
    expect(validateStationInput({ ...ok, name: "   " })).toEqual(["Nhập tên quầy"]);
    expect(validateStationInput({ ...ok, name: "x".repeat(101) })).toEqual(["Tên quầy tối đa 100 ký tự"]);
    expect(validateStationInput({ ...ok, name: " Quầy 1 " }, [{ name: "Quầy 1" }])).toEqual(["Tên quầy đã có trong chi nhánh"]);
  });

  it("WiFi cần IPv4, Bluetooth cần MAC; Không khai báo thì không cần địa chỉ", () => {
    expect(validateStationInput({ ...ok, printerConnection: "WIFI" })).toEqual(["Nhập địa chỉ IP của máy in"]);
    expect(validateStationInput({ ...ok, printerConnection: "WIFI", printerAddress: "192.168.1.999" })[0]).toMatch(/IP không hợp lệ/);
    expect(validateStationInput({ ...ok, printerConnection: "WIFI", printerAddress: "192.168.1.50:9100" })).toEqual([]);
    expect(validateStationInput({ ...ok, printerConnection: "BLUETOOTH" })).toEqual(["Nhập địa chỉ MAC của máy in"]);
    expect(validateStationInput({ ...ok, printerConnection: "BLUETOOTH", printerAddress: "AA:BB:CC" })[0]).toMatch(/MAC không hợp lệ/);
    expect(validateStationInput({ ...ok, printerConnection: "BLUETOOTH", printerAddress: "aa:bb:cc:dd:ee:ff" })).toEqual([]);
    expect(validateStationInput({ ...ok, printerConnection: "NONE", printerAddress: "bất kỳ" })).toEqual([]);
  });

  it("thân POST: đúng DTO, không gửi địa chỉ khi không có máy in, MAC viết hoa", () => {
    expect(toCreateBody({ name: " Quầy 1 ", printerConnection: "NONE", printerAddress: "bỏ qua" })).toEqual({ name: "Quầy 1", printerConnection: "NONE" });
    expect(toCreateBody({ name: "Q", printerConnection: "WIFI", printerAddress: " 192.168.1.50:9100 " })).toEqual({ name: "Q", printerConnection: "WIFI", printerAddress: "192.168.1.50:9100" });
    expect(toCreateBody({ name: "Q", printerConnection: "BLUETOOTH", printerAddress: "aa:bb:cc:dd:ee:ff" }).printerAddress).toBe("AA:BB:CC:DD:EE:FF");
  });
});

describe("mapper quầy — whitelist", () => {
  const raw: RawStation = {
    id: "s1",
    name: "Quầy 1",
    status: "ACTIVE",
    printerConnection: "WIFI",
    printerAddress: "192.168.1.50",
    displayDevices: [{ id: "d1", type: "CUSTOMER_DISPLAY", name: null, pairedAt: "2026-10-01T00:00:00.000Z", lastSeenAt: null }],
  };

  it("chỉ giữ trường cần; có danh sách thiết bị đã ghép", () => {
    const s = mapStation(raw);
    expect(Object.keys(s).sort()).toEqual(["devices", "id", "name", "printerAddress", "printerConnection", "status"]);
    expect(s.devices).toEqual([{ id: "d1", type: "CUSTOMER_DISPLAY", name: null, pairedAt: "2026-10-01T00:00:00.000Z", lastSeenAt: null }]);
  });

  it("bỏ trường lạ: branchId, cartVersion, ngày, và mọi token thiết bị", () => {
    const dirty = {
      ...raw,
      branchId: "b1",
      cartVersion: 7,
      createdAt: "x",
      updatedAt: "y",
      displayDevices: [{ ...raw.displayDevices![0], tokenHash: "abc123", deviceToken: "secret-token", stationId: "s1", branchId: "b1" }],
    } as unknown as RawStation;
    const text = JSON.stringify(mapStation(dirty));
    expect(text).not.toMatch(/tokenHash|deviceToken|secret-token|abc123|cartVersion|branchId|createdAt|updatedAt|stationId/);
  });

  it("thiếu danh sách thiết bị → rỗng; trạng thái hay kiểu máy in lạ → an toàn", () => {
    expect(mapStation({ ...raw, displayDevices: undefined }).devices).toEqual([]);
    expect(mapStation({ ...raw, status: "WEIRD", printerConnection: "USB" })).toMatchObject({ status: "INACTIVE", printerConnection: "NONE" });
  });
});

describe("stationsReal — đúng endpoint /stations của BE", () => {
  afterEach(() => vi.unstubAllGlobals());
  const respond = (body: unknown, status = 200) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

  it("danh sách: GET /stations, map đủ", async () => {
    const fetchMock = respond([{ id: "s1", name: "Quầy 1", status: "ACTIVE", printerConnection: "NONE", printerAddress: null, displayDevices: [], cartVersion: 3 }]);
    vi.stubGlobal("fetch", fetchMock);
    const list = await stationsReal.listStations("b1");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new URL(url).pathname).toMatch(/\/stations$/);
    expect(init.method).toBe("GET");
    expect(list).toHaveLength(1);
    expect(list[0]).not.toHaveProperty("cartVersion");
  });

  it("tạo: POST /stations đúng CreateStationDto", async () => {
    const fetchMock = respond({ id: "s2", name: "Quầy 2", status: "ACTIVE", printerConnection: "BLUETOOTH", printerAddress: "AA:BB:CC:DD:EE:FF" });
    vi.stubGlobal("fetch", fetchMock);
    const s = await stationsReal.createStation("b1", { name: " Quầy 2 ", printerConnection: "BLUETOOTH", printerAddress: "aa:bb:cc:dd:ee:ff" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new URL(url).pathname).toMatch(/\/stations$/);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ name: "Quầy 2", printerConnection: "BLUETOOTH", printerAddress: "AA:BB:CC:DD:EE:FF" });
    expect(s).toMatchObject({ id: "s2", status: "ACTIVE", devices: [] });
  });
});

describe("stationsMock — cùng quy tắc BE", () => {
  it("tạo quầy ACTIVE; trùng tên → 409; WiFi/Bluetooth thiếu địa chỉ → 400; hết hạn → chỉ đọc", async () => {
    setScenario({ profile: "A", tier: null, expired: false });
    const branchId = "branch-stations-test";
    const before = await stationsMock.listStations(branchId);
    expect(before.length).toBeGreaterThanOrEqual(2);
    const created = await stationsMock.createStation(branchId, { name: "Quầy Mới", printerConnection: "WIFI", printerAddress: "192.168.1.60:9100" });
    expect(created).toMatchObject({ status: "ACTIVE", printerConnection: "WIFI", printerAddress: "192.168.1.60:9100", devices: [] });
    expect((await stationsMock.listStations(branchId)).map((s) => s.id)).toContain(created.id);
    await expect(stationsMock.createStation(branchId, { name: "Quầy Mới", printerConnection: "NONE" })).rejects.toMatchObject({ status: 409 });
    await expect(stationsMock.createStation(branchId, { name: "Quầy Khác", printerConnection: "BLUETOOTH", printerAddress: "  " })).rejects.toMatchObject({ status: 400 });

    setScenario({ expired: true });
    await expect(stationsMock.createStation(branchId, { name: "Quầy Hết Hạn", printerConnection: "NONE" })).rejects.toMatchObject({ status: 403, code: "SUBSCRIPTION_READ_ONLY" });
    expect((await stationsMock.listStations(branchId)).length).toBeGreaterThan(0); // vẫn đọc được
    setScenario({ expired: false });
  });
});
