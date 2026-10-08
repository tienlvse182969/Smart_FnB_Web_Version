import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App as AntApp } from "antd";
import {
  ApiError,
  describeApiError,
  PAYOS_MASTER_KEY_TEXT,
  PAYOS_UNREACHABLE_TEXT,
  PAYOS_VERIFY_REJECTED_TEXT,
  PAYOS_WEBHOOK_URL_TEXT,
  SERVER_ERROR_TEXT,
} from "../../http/errors";
import { translateValidation } from "../../http/validationText";
import { mockControl } from "../../mock/control";
import { resetMockStates } from "../../mock/store";
import { branchMock } from "../branch/mock";
import PayosLink, { PAYOS_ERROR_NOTE, PAYOS_UNLINK_WARNING } from "../../../roles/owner/PayosLink";
import { resetDirtyGuard } from "../../../lib/dirtyGuard";
import { useAppStore } from "../../../store";
import { mapPayosChannel } from "./mapper";
import { payosMock, resetPayosMock } from "./mock";
import { PAYOS_STORAGE_PREFIX, clearPersistedPayos } from "./persist";
import { payosReal } from "./real";

mockControl.latency = [0, 0];
mockControl.failure = null;

// Khoá GIẢ rõ ràng — không bao giờ dùng khoá PayOS thật trong test.
const FAKE = { clientId: "test-client-id-khong-that", apiKey: "test-api-key-khong-that", checksumKey: "test-checksum-key-khong-that" };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const stub = (...responses: Response[]) => {
  const fn = vi.fn();
  responses.forEach((r) => fn.mockResolvedValueOnce(r));
  fn.mockImplementation(async () => json({ configured: false }));
  vi.stubGlobal("fetch", fn);
  return fn;
};
const calls = (fn: ReturnType<typeof vi.fn>) =>
  (fn.mock.calls as [string, RequestInit][]).map(([url, init]) => ({
    path: new URL(url).pathname.replace(/^\/api\/v1/, ""),
    method: init.method ?? "GET",
    body: init.body,
  }));

describe("mapper PayOS (payos-channel.service.ts:22,38,44)", () => {
  it("configured=false → unlinked; configured=true → linked kèm ngày", () => {
    expect(mapPayosChannel({ configured: false })).toEqual({ status: "unlinked" });
    expect(mapPayosChannel({ configured: true, id: "x", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-02-01T00:00:00.000Z" })).toEqual({
      status: "linked",
      linkedAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
    });
  });
});

describe("real PayOS — fetch giả, không gọi BE", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("GET / PUT / DELETE đúng đường dẫn; PUT body CHỈ 3 trường, đã trim", async () => {
    const fn = stub(json({ configured: false }), json({ configured: true, id: "i", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }), json({ configured: false }));
    await payosReal.getChannel("c1");
    const saved = await payosReal.saveKeys("c1", { clientId: ` ${FAKE.clientId} `, apiKey: FAKE.apiKey, checksumKey: FAKE.checksumKey });
    await payosReal.unlink("c1");
    const [get, put, del] = calls(fn);
    expect(get).toMatchObject({ path: "/restaurant-chains/c1/payos-channel", method: "GET" });
    expect(put).toMatchObject({ path: "/restaurant-chains/c1/payos-channel", method: "PUT" });
    expect(JSON.parse(String(put.body))).toEqual(FAKE);
    expect(Object.keys(JSON.parse(String(put.body))).sort()).toEqual(["apiKey", "checksumKey", "clientId"]);
    expect(del).toMatchObject({ path: "/restaurant-chains/c1/payos-channel", method: "DELETE" });
    expect(saved.status).toBe("linked");
    expect(JSON.stringify(saved)).not.toContain("khong-that");
  });

  it("thiếu một khoá (hoặc toàn khoảng trắng) → chặn trước khi gửi, KHÔNG có request", async () => {
    const fn = stub();
    await expect(payosReal.saveKeys("c1", { ...FAKE, apiKey: "   " })).rejects.toBeInstanceOf(ApiError);
    await expect(payosReal.saveKeys("c1", { clientId: "", apiKey: "", checksumKey: "" })).rejects.toBeInstanceOf(ApiError);
    expect(fn).not.toHaveBeenCalled();
  });

  it("503 PAYOS_MASTER_KEY → câu tiếng Việt (quyết định 34), không lộ câu thô, không chứa khoá", async () => {
    stub(json({ statusCode: 503, message: "PAYOS_MASTER_KEY is not configured" }, 503));
    const err = await payosReal.saveKeys("c1", FAKE).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(describeApiError(err)).toBe(PAYOS_MASTER_KEY_TEXT);
    expect(describeApiError(err)).not.toMatch(/PAYOS_MASTER_KEY|khong-that/);
    expect(describeApiError(new ApiError(503, "Service Unavailable"))).toBe(SERVER_ERROR_TEXT);
    expect(describeApiError(new ApiError(500, "PAYOS_MASTER_KEY is not configured"))).toBe(PAYOS_MASTER_KEY_TEXT);
  });

  it("400 báo ô trống → nhãn Client ID / API Key / Checksum Key, tiếng Việt", () => {
    const text = translateValidation(["clientId should not be empty", "apiKey should not be empty", "checksumKey should not be empty"]).map((i) => i.text).join(" | ");
    expect(text).toContain("Client ID");
    expect(text).toContain("API Key");
    expect(text).toContain("Checksum Key");
  });
});

describe("mock PayOS", () => {
  beforeEach(() => {
    clearPersistedPayos();
    resetPayosMock();
    resetMockStates();
  });

  it("Chưa → lưu → Đã liên kết (giữ ngày liên kết khi cập nhật) → gỡ → Chưa; lưu trữ không có khoá", async () => {
    expect((await payosMock.getChannel("c1")).status).toBe("unlinked");
    const first = await payosMock.saveKeys("c1", FAKE);
    expect(first.status).toBe("linked");
    const again = await payosMock.saveKeys("c1", FAKE);
    expect(again.linkedAt).toBe(first.linkedAt);
    expect((await payosMock.unlink("c1")).status).toBe("unlinked");
    await payosMock.saveKeys("c1", FAKE);
    const stored = Object.keys(localStorage).filter((k) => k.startsWith(PAYOS_STORAGE_PREFIX));
    expect(stored).toHaveLength(1);
    for (const store of [localStorage, sessionStorage]) {
      for (let i = 0; i < store.length; i++) expect(`${store.key(i)}=${store.getItem(store.key(i)!)}`).not.toContain("khong-that");
    }
  });
});

describe("màn PayosLink (mock)", () => {
  let chainId = "";
  beforeEach(async () => {
    clearPersistedPayos();
    resetPayosMock();
    resetMockStates();
    resetDirtyGuard();
    chainId = (await branchMock.listChains())[0].id;
    useAppStore.setState({ chainId });
  });
  afterEach(() => useAppStore.setState({ chainId: null }));

  const mount = () =>
    render(
      <AntApp>
        <PayosLink />
      </AntApp>,
    );
  const type = (id: string, value: string) => fireEvent.change(screen.getByTestId(id), { target: { value } });
  const val = (id: string) => (screen.getByTestId(id) as HTMLInputElement).value;

  it("ô khoá là kiểu mật khẩu, autocomplete off; nhập đủ → Đã liên kết và 3 ô TRỐNG", async () => {
    mount();
    await screen.findByText("Chưa liên kết");
    for (const id of ["payos-clientId", "payos-apiKey", "payos-checksumKey"]) {
      expect(screen.getByTestId(id).getAttribute("type")).toBe("password");
      expect(screen.getByTestId(id).getAttribute("autocomplete")).toBe("off");
    }
    type("payos-clientId", FAKE.clientId);
    type("payos-apiKey", FAKE.apiKey);
    type("payos-checksumKey", FAKE.checksumKey);
    await act(async () => {
      fireEvent.click(screen.getByTestId("payos-save"));
    });
    await waitFor(() => expect(screen.getByTestId("payos-status").textContent).toBe("Đã liên kết"));
    expect(val("payos-clientId")).toBe("");
    expect(val("payos-apiKey")).toBe("");
    expect(val("payos-checksumKey")).toBe("");
    expect(screen.getByTestId("payos-dates")).toBeTruthy();
  });

  it("ô trống → báo từng ô, không lưu", async () => {
    mount();
    await screen.findByText("Chưa liên kết");
    type("payos-clientId", FAKE.clientId);
    await act(async () => {
      fireEvent.click(screen.getByTestId("payos-save"));
    });
    expect(await screen.findByTestId("payos-apiKey-error")).toBeTruthy();
    expect(screen.getByTestId("payos-checksumKey-error")).toBeTruthy();
    expect(screen.queryByTestId("payos-clientId-error")).toBeNull();
    expect(screen.getByTestId("payos-status").textContent).toBe("Chưa liên kết");
  });

  it("câu xác nhận gỡ liên kết đúng quyết định 32", () => {
    expect(PAYOS_UNLINK_WARNING).toBe("QR thanh toán ở mọi chi nhánh sẽ ngừng hoạt động cho tới khi liên kết lại.");
  });
});

describe("BE de4f55c (#40): mapper, khoá che, câu lỗi xác minh", () => {
  afterEach(() => vi.unstubAllGlobals());
  const LINKED = {
    configured: true,
    id: "i",
    status: "LINKED",
    clientIdLast4: "03eb",
    apiKeyLast4: "1f86",
    lastError: null,
    lastVerifiedAt: "2026-10-06T07:30:00.000Z",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-06T07:30:00.000Z",
  };

  it("mapper đủ trường: LINKED → linked kèm 4 ký tự cuối và lastVerifiedAt; ERROR → error; BE cũ không có status → linked", () => {
    expect(mapPayosChannel(LINKED)).toEqual({
      status: "linked",
      linkedAt: LINKED.createdAt,
      updatedAt: LINKED.updatedAt,
      lastVerifiedAt: LINKED.lastVerifiedAt,
      clientIdLast4: "03eb",
      apiKeyLast4: "1f86",
    });
    expect(mapPayosChannel({ ...LINKED, status: "ERROR", lastError: "Invalid signature from PayOS" }).status).toBe("error");
    expect(mapPayosChannel({ configured: true, createdAt: LINKED.createdAt }).status).toBe("linked");
  });

  it("ERROR không lộ lastError: kết quả ánh xạ không chứa câu thô của PayOS", () => {
    const out = mapPayosChannel({ ...LINKED, status: "ERROR", lastError: "Invalid signature from PayOS" });
    expect(JSON.stringify(out)).not.toMatch(/Invalid signature|lastError/);
  });

  it("khoá che chỉ giữ tối đa 4 ký tự cuối dù BE trả dài hơn; rỗng/null → không có", () => {
    const out = mapPayosChannel({ ...LINKED, clientIdLast4: "0123456789ab", apiKeyLast4: "" });
    expect(out.clientIdLast4).toBe("89ab");
    expect(out.apiKeyLast4).toBeUndefined();
  });

  it("PUT 422/502/503×2: đúng câu quyết định 50, không lộ câu thô, giữ method PUT", async () => {
    const cases: [number, string, string][] = [
      [422, "Invalid webhook url from PayOS", PAYOS_VERIFY_REJECTED_TEXT],
      [502, "PayOS is temporarily unavailable", PAYOS_UNREACHABLE_TEXT],
      [503, "PAYOS_WEBHOOK_BASE_URL is not configured", PAYOS_WEBHOOK_URL_TEXT],
      [503, "PAYOS_MASTER_KEY is not configured", PAYOS_MASTER_KEY_TEXT],
    ];
    for (const [status, message, expected] of cases) {
      stub(json({ statusCode: status, message }, status));
      const err = await payosReal.saveKeys("c1", FAKE).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(status);
      expect((err as ApiError).method).toBe("PUT");
      const text = describeApiError(err);
      expect(text).toBe(expected);
      expect(text).not.toMatch(/PayOS is temporarily|Invalid webhook|PAYOS_|khong-that/);
    }
    expect(PAYOS_WEBHOOK_URL_TEXT).toBe("Máy chủ chưa sẵn sàng liên kết PayOS (thiếu địa chỉ nhận thông báo). Vui lòng liên hệ quản trị hệ thống.");
    expect(PAYOS_VERIFY_REJECTED_TEXT).toBe("PayOS không chấp nhận bộ khoá này. Kiểm tra lại Client ID, API key và Checksum key.");
    expect(PAYOS_UNREACHABLE_TEXT).toBe("Không kết nối được PayOS lúc này. Vui lòng thử lại sau ít phút.");
    // 502/503 ở nơi khác vẫn là câu chung
    expect(describeApiError(new ApiError(502, "Bad Gateway"))).toBe(SERVER_ERROR_TEXT);
  });
});

describe("màn PayosLink theo BE de4f55c", () => {
  let chainId = "";
  beforeEach(async () => {
    clearPersistedPayos();
    resetPayosMock();
    resetMockStates();
    resetDirtyGuard();
    chainId = (await branchMock.listChains())[0].id;
    useAppStore.setState({ chainId });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    useAppStore.setState({ chainId: null });
  });

  const mount = () =>
    render(
      <AntApp>
        <PayosLink />
      </AntApp>,
    );
  const text = (id: string) => screen.getByTestId(id).textContent ?? "";
  const linkedChannel = {
    status: "linked" as const,
    linkedAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-06T07:30:00.000Z",
    lastVerifiedAt: "2026-10-06T07:30:00.000Z",
    clientIdLast4: "03eb",
    apiKeyLast4: "1f86",
  };

  it("Đã liên kết: hiện 'Client ID ••••03eb', 'API key ••••1f86' (không có checksum key) và thời điểm xác minh theo giờ Việt Nam", async () => {
    vi.spyOn(payosMock, "getChannel").mockResolvedValue(linkedChannel);
    mount();
    await screen.findByText("Đã liên kết");
    expect(text("payos-mask-clientId")).toBe("Client ID ••••03eb");
    expect(text("payos-mask-apiKey")).toBe("API key ••••1f86");
    expect(screen.queryByTestId("payos-mask-checksumKey")).toBeNull();
    // 07:30 UTC = 14:30 giờ Việt Nam
    expect(text("payos-verified")).toBe("Xác minh gần nhất: 06/10/2026 14:30");
  });

  it("Lỗi: hiện câu quyết định 49, không có câu thô của PayOS", async () => {
    vi.spyOn(payosMock, "getChannel").mockResolvedValue({ ...linkedChannel, status: "error" });
    mount();
    await waitFor(() => expect(screen.getByTestId("payos-status").textContent).toBe("Lỗi"));
    expect(text("payos-error-note")).toBe("PayOS từ chối khi tạo QR gần nhất. Kiểm tra lại khoá và lưu lại.");
    expect(PAYOS_ERROR_NOTE).toBe("PayOS từ chối khi tạo QR gần nhất. Kiểm tra lại khoá và lưu lại.");
    expect(document.body.textContent).not.toMatch(/Invalid|signature|lastError/i);
  });

  it("Đang kiểm tra trong lúc PUT: nút Lưu và Gỡ khoá, bấm lần hai không gửi thêm; xong thì 'Đã liên kết' + khoá che, ô trống", async () => {
    vi.spyOn(payosMock, "getChannel").mockResolvedValue(linkedChannel);
    let release: (c: typeof linkedChannel) => void = () => undefined;
    const save = vi.spyOn(payosMock, "saveKeys").mockImplementation(() => new Promise((res) => (release = res)));
    mount();
    await screen.findByText("Đã liên kết");
    for (const id of ["payos-clientId", "payos-apiKey", "payos-checksumKey"]) fireEvent.change(screen.getByTestId(id), { target: { value: `${FAKE.clientId}` } });
    await act(async () => {
      fireEvent.click(screen.getByTestId("payos-save"));
    });
    await waitFor(() => expect(screen.getByTestId("payos-status").textContent).toBe("Đang kiểm tra"));
    expect((screen.getByTestId("payos-unlink") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId("payos-save") as HTMLButtonElement).className).toMatch(/loading/);
    await act(async () => {
      fireEvent.click(screen.getByTestId("payos-save"));
    });
    expect(save).toHaveBeenCalledTimes(1);
    await act(async () => {
      release({ ...linkedChannel, clientIdLast4: "that", apiKeyLast4: "that" });
    });
    await waitFor(() => expect(screen.getByTestId("payos-status").textContent).toBe("Đã liên kết"));
    expect(text("payos-mask-clientId")).toBe("Client ID ••••that");
    for (const id of ["payos-clientId", "payos-apiKey", "payos-checksumKey"]) expect((screen.getByTestId(id) as HTMLInputElement).value).toBe("");
  });

  it("lưu qua màn (mock) rồi quét storage: không có khoá giả, chỉ có 4 ký tự cuối", async () => {
    mount();
    await screen.findByText("Chưa liên kết");
    fireEvent.change(screen.getByTestId("payos-clientId"), { target: { value: FAKE.clientId } });
    fireEvent.change(screen.getByTestId("payos-apiKey"), { target: { value: FAKE.apiKey } });
    fireEvent.change(screen.getByTestId("payos-checksumKey"), { target: { value: FAKE.checksumKey } });
    await act(async () => {
      fireEvent.click(screen.getByTestId("payos-save"));
    });
    await waitFor(() => expect(screen.getByTestId("payos-status").textContent).toBe("Đã liên kết"));
    expect(text("payos-mask-clientId")).toBe("Client ID ••••that");
    for (const store of [localStorage, sessionStorage]) {
      for (let i = 0; i < store.length; i++) {
        const entry = `${store.key(i)}=${store.getItem(store.key(i)!)}`;
        expect(entry).not.toContain("khong-that");
        expect(entry).not.toContain("test-checksum");
      }
    }
  });
});
