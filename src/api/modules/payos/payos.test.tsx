import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App as AntApp } from "antd";
import { ApiError, describeApiError, PAYOS_MASTER_KEY_TEXT, SERVER_ERROR_TEXT } from "../../http/errors";
import { translateValidation } from "../../http/validationText";
import { mockControl } from "../../mock/control";
import { resetMockStates } from "../../mock/store";
import { branchMock } from "../branch/mock";
import PayosLink, { PAYOS_UNLINK_WARNING } from "../../../roles/owner/PayosLink";
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
