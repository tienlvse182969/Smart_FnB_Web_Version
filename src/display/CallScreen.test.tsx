import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { Socket } from "socket.io-client";
import { ApiError } from "../api/http/errors";
import { clearTokens, setTokens } from "../api/http/client";
import { setSocketFactory } from "../api/realtime/operations";
import { CALLING_DISPLAY_STORAGE_KEY, REVOKED_TEXT } from "../api/device/session";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  context: vi.fn(),
  refreshSession: vi.fn(),
}));

vi.mock("../api/modules/callingDisplay", async (orig) => ({
  ...(await orig<typeof import("../api/modules/callingDisplay")>()),
  createCallingDisplayPairing: mocks.create,
  getCallingDisplayContext: mocks.context,
}));
vi.mock("../api/http/client", async (orig) => ({
  ...(await orig<typeof import("../api/http/client")>()),
  refreshSession: mocks.refreshSession,
}));

import CallScreen from "./CallScreen";
import { callChime } from "./chime";

class FakeSocket {
  handlers = new Map<string, Set<(...a: unknown[]) => void>>();
  io = { on: () => this.io, removeAllListeners: () => this.io };
  disconnected = false;
  constructor(public url: string, public options: Record<string, unknown>) {}
  on(name: string, fn: (...a: unknown[]) => void) {
    if (!this.handlers.has(name)) this.handlers.set(name, new Set());
    this.handlers.get(name)!.add(fn);
    return this;
  }
  fromServer(name: string, ...args: unknown[]) {
    for (const fn of this.handlers.get(name) ?? []) fn(...args);
  }
  removeAllListeners() {
    this.handlers.clear();
    return this;
  }
  disconnect() {
    this.disconnected = true;
    return this;
  }
  connect() {
    return this;
  }
}

const pairingBody = (token = "dev-1") => ({ pairingId: "p1", code: "654321", deviceToken: token, expiresAt: new Date(Date.now() + 5 * 60_000).toISOString() });
const ctx = (ready: number[] = [7], preparing: number[] = [8]) => ({
  branch: { name: "Chi nhánh Test" },
  branding: { displayName: "Quán Test", logoUrl: null, primaryColor: "c1", secondaryColor: "c2", accentColor: "c3" },
  preparing: preparing.map((n) => ({ id: `o${n}`, callNumber: n, status: "PREPARING", submittedAt: "", readyAt: null })),
  ready: ready.map((n) => ({ id: `o${n}`, callNumber: n, status: "READY", submittedAt: "", readyAt: "" })),
  serverTime: "",
});
const forbidden = () => new ApiError(403, "Display device token is invalid or revoked");
const advance = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));
const stored = () => JSON.parse(localStorage.getItem(CALLING_DISPLAY_STORAGE_KEY) ?? "null");

describe("màn hình gọi số (quyết định 105–108)", () => {
  let sockets: FakeSocket[] = [];
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    sockets = [];
    mocks.create.mockReset();
    mocks.context.mockReset();
    mocks.refreshSession.mockReset().mockResolvedValue("x");
    localStorage.clear();
    clearTokens();
    setTokens("user-access", "user-refresh");
    setSocketFactory((url, options) => {
      const s = new FakeSocket(url, options);
      sockets.push(s);
      return s as unknown as Socket;
    });
  });
  afterEach(() => {
    cleanup();
    setSocketFactory(null);
    clearTokens();
    vi.useRealTimers();
  });

  it("chưa ghép: tạo mã và hiện; 403 khi chờ KHÔNG hiện lỗi; ghép xong vào bảng số, socket dùng token thiết bị", async () => {
    mocks.create.mockResolvedValue(pairingBody());
    mocks.context.mockRejectedValueOnce(forbidden()).mockRejectedValueOnce(forbidden()).mockResolvedValue(ctx());
    render(<CallScreen />);
    await advance(10);
    expect(screen.getByTestId("call-pairing-code").textContent).toBe("654321");
    expect(stored()).toMatchObject({ deviceToken: "dev-1", paired: false });
    expect(screen.queryByTestId("call-error")).toBeNull();
    expect(mocks.create).toHaveBeenCalledTimes(1);
    await advance(3000); // lần hỏi thứ 2 vẫn 403: vẫn chờ
    expect(screen.queryByTestId("call-error")).toBeNull();
    expect(screen.getByTestId("call-pairing-code").textContent).toBe("654321");
    await advance(3000); // lần 3 thành công
    expect(screen.getByText("ĐANG CHUẨN BỊ")).toBeTruthy();
    expect(screen.getByText("Quán Test")).toBeTruthy();
    expect(stored()).toMatchObject({ deviceToken: "dev-1", paired: true });
    expect(sockets).toHaveLength(1);
    expect(sockets[0].url).toMatch(/\/operations$/);
    const auth = sockets[0].options.auth as (cb: (d: { token: string | null }) => void) => void;
    let sent: string | null = null;
    auth((d) => (sent = d.token));
    expect(sent).toBe("dev-1"); // token thiết bị, không phải "user-access"
    expect(mocks.refreshSession).not.toHaveBeenCalled();
  });

  it("F5 khi đã ghép: dùng lại token, không tạo mã mới, không hiện mã cũ trong lúc nạp", async () => {
    localStorage.setItem(CALLING_DISPLAY_STORAGE_KEY, JSON.stringify({ ...pairingBody("dev-9"), paired: true }));
    mocks.context.mockResolvedValue(ctx());
    render(<CallScreen />);
    expect(screen.queryByTestId("call-pairing-code")).toBeNull();
    expect(screen.getByTestId("call-loading")).toBeTruthy();
    await advance(10);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.context).toHaveBeenCalledWith("dev-9");
    expect(screen.getByText("MỜI NHẬN MÓN")).toBeTruthy();
  });

  it("bị thu hồi (403 khi đã ghép): về bước ghép với câu tiếng Việt, xoá token cũ, tạo mã mới, đóng socket", async () => {
    localStorage.setItem(CALLING_DISPLAY_STORAGE_KEY, JSON.stringify({ ...pairingBody("dev-old"), paired: true }));
    mocks.context.mockResolvedValueOnce(ctx());
    mocks.create.mockResolvedValue({ ...pairingBody("dev-new"), code: "111222" });
    render(<CallScreen />);
    await advance(10);
    expect(screen.getByText("MỜI NHẬN MÓN")).toBeTruthy();
    expect(sockets).toHaveLength(1);
    mocks.context.mockRejectedValue(forbidden());
    act(() => sockets[0].fromServer("operations.updated", { type: "calling.order.ready", occurredAt: "" }));
    await advance(700); // gom 500 ms rồi tải lại
    expect(screen.getByTestId("call-notice").textContent).toBe(REVOKED_TEXT);
    expect(sockets[0].disconnected).toBe(true);
    await advance(10);
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("call-pairing-code").textContent).toBe("111222");
    expect(stored()).toMatchObject({ deviceToken: "dev-new", paired: false });
    expect(document.body.textContent).not.toMatch(/Display device|revoked|Forbidden/i);
  });

  it("socket bị máy chủ ngắt: kiểm tra bằng REST ngay, không làm mới phiên người dùng", async () => {
    localStorage.setItem(CALLING_DISPLAY_STORAGE_KEY, JSON.stringify({ ...pairingBody("dev-2"), paired: true }));
    mocks.context.mockResolvedValue(ctx());
    mocks.create.mockResolvedValue(pairingBody("dev-3"));
    render(<CallScreen />);
    await advance(10);
    act(() => sockets[0].fromServer("operations.connected", {}));
    expect(screen.getByTestId("call-status").getAttribute("data-status")).toBe("connected");
    const before = mocks.context.mock.calls.length;
    mocks.context.mockRejectedValue(forbidden());
    act(() => sockets[0].fromServer("disconnect", "io server disconnect"));
    await advance(10);
    expect(mocks.context.mock.calls.length).toBe(before + 1);
    expect(screen.getByTestId("call-notice")).toBeTruthy();
    expect(mocks.refreshSession).not.toHaveBeenCalled();
  });

  it("mất mạng: câu tiếng Việt, giữ token, thử lại 5s → 10s → 20s → 40s (không dồn dập)", async () => {
    localStorage.setItem(CALLING_DISPLAY_STORAGE_KEY, JSON.stringify({ ...pairingBody("dev-5"), paired: true }));
    mocks.context.mockRejectedValue(new ApiError(0, "Failed to fetch"));
    render(<CallScreen />);
    await advance(10);
    expect(mocks.context).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("call-error").textContent).toBe("Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.");
    expect(stored()).toMatchObject({ deviceToken: "dev-5", paired: true });
    await advance(4900);
    expect(mocks.context).toHaveBeenCalledTimes(1);
    await advance(100); // t = 5s
    expect(mocks.context).toHaveBeenCalledTimes(2);
    await advance(9900);
    expect(mocks.context).toHaveBeenCalledTimes(2);
    await advance(100); // t = 15s
    expect(mocks.context).toHaveBeenCalledTimes(3);
    await advance(20_000); // t = 35s
    expect(mocks.context).toHaveBeenCalledTimes(4);
    await advance(40_000); // t = 75s
    expect(mocks.context).toHaveBeenCalledTimes(5);
  });

  it("5xx hiện câu chung tiếng Việt; tạo mã lỗi cũng giãn cách và hiện tiếng Việt", async () => {
    mocks.create.mockRejectedValue(new ApiError(500, "Internal server error"));
    render(<CallScreen />);
    await advance(10);
    expect(screen.getByTestId("call-error").textContent).toBe("Máy chủ đang gặp sự cố, thử lại sau ít phút.");
    expect(mocks.create).toHaveBeenCalledTimes(1);
    await advance(5000);
    expect(mocks.create).toHaveBeenCalledTimes(2);
    await advance(9000);
    expect(mocks.create).toHaveBeenCalledTimes(2);
    await advance(1000);
    expect(mocks.create).toHaveBeenCalledTimes(3);
  });

  it("số vừa sang 'Mời nhận': nhấn mạnh đúng số mới ~10 giây, một âm, lần nạp đầu không nhấn mạnh (QĐ 112)", async () => {
    const ring = vi.spyOn(callChime, "ring").mockReturnValue(true);
    localStorage.setItem(CALLING_DISPLAY_STORAGE_KEY, JSON.stringify({ ...pairingBody("dev-7"), paired: true }));
    mocks.context.mockResolvedValue(ctx([7], [12, 13]));
    render(<CallScreen />);
    await advance(10);
    expect(ring).not.toHaveBeenCalled();
    expect(document.querySelectorAll('[data-testid="call-cell"][data-lit="true"]')).toHaveLength(0);
    mocks.context.mockResolvedValue(ctx([7, 12, 13], []));
    act(() => sockets[0].fromServer("operations.updated", { type: "calling.order.ready", occurredAt: "" }));
    await advance(700);
    const lit = [...document.querySelectorAll('[data-testid="call-cell"][data-lit="true"]')].map((e) => e.getAttribute("data-number"));
    expect(lit.sort()).toEqual(["12", "13"]);
    expect(document.querySelector('[data-testid="call-cell"][data-number="7"]')?.getAttribute("data-lit")).toBe("false");
    expect(ring).toHaveBeenCalledTimes(1);
    await advance(10_000);
    expect(document.querySelectorAll('[data-testid="call-cell"][data-lit="true"]')).toHaveLength(0);
    ring.mockRestore();
  });

  it("mất kết nối: GIỮ bảng số cuối, hiện 'Mất kết nối, đang thử lại', không xoá trắng (QĐ 114)", async () => {
    localStorage.setItem(CALLING_DISPLAY_STORAGE_KEY, JSON.stringify({ ...pairingBody("dev-8"), paired: true }));
    mocks.context.mockResolvedValueOnce(ctx([7], [12]));
    render(<CallScreen />);
    await advance(10);
    expect(screen.queryByTestId("call-offline")).toBeNull();
    mocks.context.mockRejectedValue(new ApiError(0, "Failed to fetch"));
    act(() => sockets[0].fromServer("operations.updated", { type: "calling.order.ready", occurredAt: "" }));
    await advance(700);
    expect(screen.getByTestId("call-offline").textContent).toBe("Mất kết nối, đang thử lại");
    expect([...document.querySelectorAll('[data-testid="call-cell"]')].map((e) => e.getAttribute("data-number")).sort()).toEqual(["12", "7"]);
    expect(screen.getByText("MỜI NHẬN MÓN")).toBeTruthy();
  });

  it("chưa ghép: sau 3 mã hết hạn liên tiếp thì 5 phút mới tạo mã, có nút 'Chạm để lấy mã mới' (QĐ 113)", async () => {
    mocks.create.mockImplementation(async () => pairingBody());
    mocks.context.mockRejectedValue(forbidden());
    render(<CallScreen />);
    await advance(10);
    expect(mocks.create).toHaveBeenCalledTimes(1);
    // (act chỉ xả effect khi thoát, nên mỗi lần hết hạn cần thêm một bước ngắn để bộ đếm "tạo mã" chạy)
    await advance(5 * 60_000 + 4000); // mã 1 hết hạn (phát hiện ở lượt hỏi 3s kế tiếp)
    await advance(10); // → mã 2
    expect(mocks.create).toHaveBeenCalledTimes(2);
    await advance(5 * 60_000 + 4000); // mã 2 hết hạn
    await advance(10); // → mã 3
    expect(mocks.create).toHaveBeenCalledTimes(3);
    expect(screen.queryByTestId("call-refetch")).toBeNull();
    await advance(5 * 60_000 + 4000); // mã 3 hết hạn: lần thứ 3 liên tiếp → giãn nhịp
    await advance(10);
    expect(mocks.create).toHaveBeenCalledTimes(3);
    expect(screen.getByTestId("call-refetch").textContent).toBe("Chạm để lấy mã mới");
    await advance(4 * 60_000);
    expect(mocks.create).toHaveBeenCalledTimes(3);
    await act(async () => {
      screen.getByTestId("call-refetch").click();
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(mocks.create).toHaveBeenCalledTimes(4);
    expect(screen.getByTestId("call-pairing-code").textContent).toBe("654321");
  });

  it("rời màn hình: huỷ mọi bộ đếm, đóng socket, không gọi API nữa", async () => {
    localStorage.setItem(CALLING_DISPLAY_STORAGE_KEY, JSON.stringify({ ...pairingBody("dev-6"), paired: true }));
    mocks.context.mockResolvedValue(ctx());
    const view = render(<CallScreen />);
    await advance(10);
    expect(sockets).toHaveLength(1);
    const calls = mocks.context.mock.calls.length;
    view.unmount();
    expect(sockets[0].disconnected).toBe(true);
    await advance(180_000);
    expect(mocks.context.mock.calls.length).toBe(calls);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
