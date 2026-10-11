import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import type { Socket } from "socket.io-client";
import { clearTokens, setTokens } from "../http/client";
import { createRefresher, isOrderEvent, isRelevantToOrder, orderIdsOf, ORDER_EVENT_TYPES } from "./orderRefresh";
import { MAX_AUTO_RECONNECTS, getRealtimeExhausted, getRealtimeStatus, reconnectOperations, setSocketFactory, subscribeOperations, type OperationsEvent, type RealtimeStatus } from "./operations";
import { useOrderRealtime } from "./useOrderRealtime";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ev = (type: string, data?: unknown): OperationsEvent => ({ type, occurredAt: "2026-10-08T00:00:00Z", data });

describe("sự kiện đơn của BE (quyết định 74)", () => {
  it("danh sách đủ các loại sự kiện đổi đơn, dòng món, thanh toán", () => {
    expect([...ORDER_EVENT_TYPES].sort()).toEqual(
      [
        "cashier.order.updated",
        "manager.order.attention-required",
        "payment.confirmed",
        "payment.created",
        "preparation.batch.completed",
        "preparation.batch.started",
        "preparation.item.completed",
        "preparation.item.started",
        "preparation.item.undone",
        "preparation.order.delivered",
        "preparation.order.queued",
      ].sort(),
    );
    expect(isOrderEvent(ev("menu.availability.changed"))).toBe(false);
    expect(isOrderEvent(ev("branding.updated"))).toBe(false);
    expect(isOrderEvent(ev("payment.confirmed"))).toBe(true);
  });

  it("lấy id đơn từ orderId, orderIds, readyOrders", () => {
    expect(orderIdsOf(ev("x", { orderId: "a" }))).toEqual(["a"]);
    expect(orderIdsOf(ev("x", { orderIds: ["a", "b", 3] }))).toEqual(["a", "b"]);
    expect(orderIdsOf(ev("x", { readyOrders: [{ id: "c" }, { id: 5 }, null] }))).toEqual(["c"]);
    expect(orderIdsOf(ev("x", { unitId: "u" }))).toEqual([]);
    expect(orderIdsOf(ev("x"))).toEqual([]);
  });

  it("chi tiết: đơn khác bị bỏ; đúng đơn hoặc payload không nêu đơn thì tải", () => {
    expect(isRelevantToOrder(ev("payment.confirmed", { orderId: "A" }), "A")).toBe(true);
    expect(isRelevantToOrder(ev("payment.confirmed", { orderId: "B" }), "A")).toBe(false);
    expect(isRelevantToOrder(ev("manager.order.attention-required", { orderIds: ["B", "A"] }), "A")).toBe(true);
    expect(isRelevantToOrder(ev("preparation.item.completed", { unitId: "u" }), "A")).toBe(true);
    expect(isRelevantToOrder(ev("payment.confirmed", { id: "pay", status: "SUCCESS" }), "A")).toBe(true);
    expect(isRelevantToOrder(ev("menu.availability.changed", {}), "A")).toBe(false);
    expect(isRelevantToOrder(ev("payment.confirmed", { orderId: "B" }))).toBe(true);
  });
});

describe("bộ làm tươi: gom, tab ẩn, nối lại, huỷ", () => {
  let visible = true;
  const run = vi.fn();
  const make = (orderId?: string) => createRefresher({ run, isVisible: () => visible, orderId, delayMs: 40 });
  beforeEach(() => {
    visible = true;
    run.mockClear();
  });

  it("nhiều sự kiện trong cửa sổ gom → đúng 1 lần tải", async () => {
    const r = make();
    for (let i = 0; i < 6; i++) r.onEvent(ev("payment.confirmed", { orderId: `o${i}` }));
    await sleep(120);
    expect(run).toHaveBeenCalledTimes(1);
    r.onEvent(ev("preparation.order.delivered", { orderId: "o1" }));
    await sleep(120);
    expect(run).toHaveBeenCalledTimes(2);
    r.dispose();
  });

  it("sự kiện không phải đơn, hoặc của đơn khác (chi tiết) → không tải", async () => {
    const r = make("A");
    r.onEvent(ev("menu.availability.changed", {}));
    r.onEvent(ev("payment.confirmed", { orderId: "B" }));
    await sleep(100);
    expect(run).not.toHaveBeenCalled();
    r.onEvent(ev("payment.confirmed", { orderId: "A" }));
    await sleep(100);
    expect(run).toHaveBeenCalledTimes(1);
    r.dispose();
  });

  it("tab ẩn: không tải; hiện lại tải đúng 1 lần, lần hiện sau không tải nữa", async () => {
    const r = make();
    visible = false;
    r.onEvent(ev("payment.confirmed", { orderId: "a" }));
    r.onEvent(ev("preparation.order.delivered", { orderId: "a" }));
    await sleep(100);
    expect(run).not.toHaveBeenCalled();
    r.onVisibilityChange();
    expect(run).not.toHaveBeenCalled();
    visible = true;
    r.onVisibilityChange();
    await sleep(100);
    expect(run).toHaveBeenCalledTimes(1);
    r.onVisibilityChange();
    await sleep(100);
    expect(run).toHaveBeenCalledTimes(1);
    r.dispose();
  });

  it("tab bị ẩn đúng lúc hết hạn gom: không tải, nhớ để tải khi hiện lại", async () => {
    const r = make();
    r.onEvent(ev("payment.confirmed", { orderId: "a" }));
    visible = false;
    await sleep(100);
    expect(run).not.toHaveBeenCalled();
    visible = true;
    r.onVisibilityChange();
    await sleep(100);
    expect(run).toHaveBeenCalledTimes(1);
    r.dispose();
  });

  it("nối lại → tải 1 lần (kể cả nhiều lần báo liên tiếp)", async () => {
    const r = make();
    r.onReconnect();
    r.onReconnect();
    await sleep(100);
    expect(run).toHaveBeenCalledTimes(1);
    r.dispose();
  });

  it("dispose huỷ lần tải đang chờ và bỏ qua sự kiện sau đó", async () => {
    const r = make();
    r.onEvent(ev("payment.confirmed", { orderId: "a" }));
    r.dispose();
    r.onEvent(ev("payment.confirmed", { orderId: "a" }));
    await sleep(120);
    expect(run).not.toHaveBeenCalled();
  });
});

/** Bộ quản lý (`socket.io`) giả: nơi socket.io phát `reconnect_failed` khi hết `reconnectionAttempts`. */
class FakeManager {
  handlers = new Map<string, Set<() => void>>();
  on(name: string, fn: () => void) {
    if (!this.handlers.has(name)) this.handlers.set(name, new Set());
    this.handlers.get(name)!.add(fn);
    return this;
  }
  emit(name: string) {
    for (const fn of this.handlers.get(name) ?? []) fn();
  }
  removeAllListeners() {
    this.handlers.clear();
    return this;
  }
  count() {
    return [...this.handlers.values()].reduce((n, set) => n + set.size, 0);
  }
}

/** Socket giả: ghi lại người nghe, cho phép phát sự kiện từ "máy chủ". */
class FakeSocket {
  handlers = new Map<string, Set<(...args: never[]) => void>>();
  io = new FakeManager();
  disconnected = false;
  removed = false;
  connectCalls = 0;
  constructor(public url: string, public options: Record<string, unknown>) {}
  on(name: string, fn: (...args: never[]) => void) {
    if (!this.handlers.has(name)) this.handlers.set(name, new Set());
    this.handlers.get(name)!.add(fn);
    return this;
  }
  emitFromServer(name: string, ...args: unknown[]) {
    for (const fn of this.handlers.get(name) ?? []) (fn as (...a: unknown[]) => void)(...args);
  }
  removeAllListeners() {
    this.handlers.clear();
    this.removed = true;
    return this;
  }
  disconnect() {
    this.disconnected = true;
    return this;
  }
  connect() {
    this.connectCalls++;
    return this;
  }
  listenerCount() {
    return [...this.handlers.values()].reduce((n, set) => n + set.size, 0);
  }
}

describe("kết nối socket dùng chung (operations.ts)", () => {
  let sockets: FakeSocket[] = [];
  beforeEach(() => {
    sockets = [];
    clearTokens();
    setTokens("token-1", "refresh-1");
    setSocketFactory((url, options) => {
      const s = new FakeSocket(url, options);
      sockets.push(s);
      return s as unknown as Socket;
    });
  });
  afterEach(() => {
    setSocketFactory(null);
    clearTokens();
  });

  it("một kết nối cho nhiều người nghe; đóng khi người cuối rời; không rò listener", () => {
    const events: string[] = [];
    const off1 = subscribeOperations({ onEvent: (e) => events.push("1:" + e.type) });
    const off2 = subscribeOperations({ onEvent: (e) => events.push("2:" + e.type) });
    expect(sockets).toHaveLength(1);
    expect(sockets[0].url).toMatch(/\/operations$/);
    sockets[0].emitFromServer("operations.updated", ev("payment.confirmed"));
    expect(events).toEqual(["1:payment.confirmed", "2:payment.confirmed"]);
    off1();
    expect(sockets[0].disconnected).toBe(false);
    off2();
    expect(sockets[0].disconnected).toBe(true);
    expect(sockets[0].removed).toBe(true);
    expect(sockets[0].listenerCount()).toBe(0);
    expect(getRealtimeStatus()).toBe("disconnected");
  });

  it("token là HÀM: mỗi lần nối lấy token mới nhất sau khi phiên được làm mới", () => {
    const off = subscribeOperations({ onEvent: () => undefined });
    const auth = sockets[0].options.auth as (cb: (d: { token: string | null }) => void) => void;
    const seen: (string | null)[] = [];
    auth((d) => seen.push(d.token));
    setTokens("token-2", "refresh-2");
    auth((d) => seen.push(d.token));
    expect(seen).toEqual(["token-1", "token-2"]);
    off();
  });

  it("trạng thái: connecting → connected (operations.connected) → disconnected; nối lại báo reconnected", () => {
    const log: string[] = [];
    const off = subscribeOperations({ onEvent: () => undefined, onStatus: (s, i) => log.push(`${s}${i.reconnected ? "*" : ""}`) });
    const s = sockets[0];
    expect(log).toEqual(["connecting"]);
    s.emitFromServer("operations.connected", {});
    s.emitFromServer("disconnect", "transport close");
    s.emitFromServer("operations.connected", {});
    expect(log).toEqual(["connecting", "connected", "disconnected", "connected*"]);
    off();
  });

  it("không có token thì không mở socket", () => {
    clearTokens();
    const log: RealtimeStatus[] = [];
    const off = subscribeOperations({ onEvent: () => undefined, onStatus: (s) => log.push(s) });
    expect(sockets).toHaveLength(0);
    off();
  });

  it("giới hạn 5 lần tự nối lại; hết lượt (reconnect_failed) → 'disconnected' kèm exhausted, báo đúng 1 lần", () => {
    const log: string[] = [];
    const off = subscribeOperations({ onEvent: () => undefined, onStatus: (s, i) => log.push(`${s}${i.exhausted ? "!" : ""}`) });
    const s = sockets[0];
    expect(MAX_AUTO_RECONNECTS).toBe(5);
    expect(s.options.reconnectionAttempts).toBe(5);
    s.emitFromServer("operations.connected", {});
    s.emitFromServer("disconnect", "transport close");
    expect(getRealtimeExhausted()).toBe(false);
    s.io.emit("reconnect_failed");
    s.io.emit("reconnect_failed");
    expect(getRealtimeExhausted()).toBe(true);
    expect(getRealtimeStatus()).toBe("disconnected");
    expect(log).toEqual(["connecting", "connected", "disconnected", "disconnected!"]);
    off();
    expect(getRealtimeExhausted()).toBe(false);
  });

  it("reconnectOperations: về 'connecting' ngay, làm mới phiên, mở socket mới; nối được thì báo reconnected; socket cũ đóng sạch", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ accessToken: "token-2", refreshToken: "refresh-2" }), { status: 200, headers: { "Content-Type": "application/json" } })));
    const log: string[] = [];
    const off = subscribeOperations({ onEvent: () => undefined, onStatus: (s, i) => log.push(`${s}${i.reconnected ? "*" : ""}${i.exhausted ? "!" : ""}`) });
    const first = sockets[0];
    first.emitFromServer("operations.connected", {});
    first.emitFromServer("disconnect", "transport close");
    first.io.emit("reconnect_failed");
    expect(log.at(-1)).toBe("disconnected!");
    reconnectOperations();
    expect(getRealtimeStatus()).toBe("connecting");
    expect(getRealtimeExhausted()).toBe(false);
    expect(log.at(-1)).toBe("connecting");
    expect(first.disconnected).toBe(true);
    expect(first.listenerCount()).toBe(0);
    expect(first.io.count()).toBe(0);
    await waitFor(() => expect(sockets).toHaveLength(2));
    const second = sockets[1];
    expect((second.options.auth as (cb: (d: { token: string | null }) => void) => void)).toBeTypeOf("function");
    second.emitFromServer("operations.connected", {});
    expect(log.at(-1)).toBe("connected*");
    expect(getRealtimeStatus()).toBe("connected");
    off();
    expect(second.disconnected).toBe(true);
    vi.unstubAllGlobals();
  });

  it("reconnectOperations khi phiên làm mới thất bại: vẫn mở socket mới, không ném lỗi", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("mạng")));
    const off = subscribeOperations({ onEvent: () => undefined });
    sockets[0].io.emit("reconnect_failed");
    reconnectOperations();
    await waitFor(() => expect(sockets).toHaveLength(2));
    off();
    vi.unstubAllGlobals();
  });

  it("reconnectOperations khi không còn người nghe: không làm gì", () => {
    reconnectOperations();
    expect(sockets).toHaveLength(0);
  });
});

describe("useOrderRealtime", () => {
  let sockets: FakeSocket[] = [];
  beforeEach(() => {
    sockets = [];
    clearTokens();
    setTokens("token-1", "refresh-1");
    setSocketFactory((url, options) => {
      const s = new FakeSocket(url, options);
      sockets.push(s);
      return s as unknown as Socket;
    });
  });
  afterEach(() => {
    setSocketFactory(null);
    clearTokens();
  });

  function Harness({ onRefresh, orderId, enabled = true, onStatus }: { onRefresh: () => void; orderId?: string; enabled?: boolean; onStatus?: (s: RealtimeStatus) => void }) {
    const { status, exhausted, reconnect } = useOrderRealtime(onRefresh, { orderId, enabled });
    onStatus?.(status);
    return (
      <div>
        <div data-testid="s">{status}</div>
        <div data-testid="x">{String(exhausted)}</div>
        {status === "disconnected" && exhausted && (
          <button data-testid="reconnect" onClick={reconnect}>
            Kết nối lại
          </button>
        )}
      </div>
    );
  }

  it("sự kiện đơn → onRefresh 1 lần sau khi gom 500 ms; sự kiện khác thì không", async () => {
    const onRefresh = vi.fn();
    const view = render(<Harness onRefresh={onRefresh} />);
    const s = sockets[0];
    act(() => s.emitFromServer("operations.connected", {}));
    act(() => {
      for (let i = 0; i < 5; i++) s.emitFromServer("operations.updated", ev("payment.confirmed", { orderId: `o${i}` }));
      s.emitFromServer("operations.updated", ev("menu.availability.changed", {}));
    });
    expect(onRefresh).not.toHaveBeenCalled();
    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1), { timeout: 2000 });
    await sleep(700);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it("nối lại sau khi mất kết nối → tải lại đúng 1 lần; lần nối đầu tiên không tải", async () => {
    const onRefresh = vi.fn();
    const view = render(<Harness onRefresh={onRefresh} />);
    const s = sockets[0];
    act(() => s.emitFromServer("operations.connected", {}));
    await sleep(700);
    expect(onRefresh).not.toHaveBeenCalled();
    act(() => s.emitFromServer("disconnect", "transport close"));
    expect(view.getByTestId("s").textContent).toBe("disconnected");
    act(() => s.emitFromServer("operations.connected", {}));
    expect(view.getByTestId("s").textContent).toBe("connected");
    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1), { timeout: 2000 });
    await sleep(700);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it("chi tiết đơn A: sự kiện của đơn B không tải lại", async () => {
    const onRefresh = vi.fn();
    const view = render(<Harness onRefresh={onRefresh} orderId="A" />);
    const s = sockets[0];
    act(() => s.emitFromServer("operations.connected", {}));
    act(() => s.emitFromServer("operations.updated", ev("preparation.order.delivered", { orderId: "B" })));
    await sleep(800);
    expect(onRefresh).not.toHaveBeenCalled();
    act(() => s.emitFromServer("operations.updated", ev("preparation.order.delivered", { orderId: "A" })));
    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1), { timeout: 2000 });
    view.unmount();
  });

  it("rời màn: huỷ đăng ký, đóng socket, không còn listener; lần tải đang chờ bị huỷ", async () => {
    const onRefresh = vi.fn();
    const view = render(<Harness onRefresh={onRefresh} />);
    const s = sockets[0];
    act(() => s.emitFromServer("operations.connected", {}));
    act(() => s.emitFromServer("operations.updated", ev("payment.confirmed", { orderId: "a" })));
    view.unmount();
    expect(s.disconnected).toBe(true);
    expect(s.listenerCount()).toBe(0);
    await sleep(800);
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("hết lượt tự nối → 'Mất kết nối' kèm nút; bấm nút → 'connecting', nối được thì tải lại đúng 1 lần, không toast", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ accessToken: "t2", refreshToken: "r2" }), { status: 200, headers: { "Content-Type": "application/json" } })));
    const onRefresh = vi.fn();
    const view = render(<Harness onRefresh={onRefresh} />);
    const first = sockets[0];
    act(() => first.emitFromServer("operations.connected", {}));
    act(() => first.emitFromServer("disconnect", "transport close"));
    expect(view.queryByTestId("reconnect")).toBeNull(); // còn đang tự nối: chưa có nút
    act(() => first.io.emit("reconnect_failed"));
    expect(view.getByTestId("s").textContent).toBe("disconnected");
    expect(view.getByTestId("x").textContent).toBe("true");
    fireEvent.click(view.getByTestId("reconnect"));
    expect(view.getByTestId("s").textContent).toBe("connecting");
    expect(view.getByTestId("x").textContent).toBe("false");
    expect(view.queryByTestId("reconnect")).toBeNull();
    await waitFor(() => expect(sockets).toHaveLength(2));
    await sleep(700);
    expect(onRefresh).not.toHaveBeenCalled(); // chưa nối được thì chưa tải
    act(() => sockets[1].emitFromServer("operations.connected", {}));
    expect(view.getByTestId("s").textContent).toBe("connected");
    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1), { timeout: 2000 });
    await sleep(700);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll(".ant-message-notice, .ant-notification-notice")).toHaveLength(0);
    view.unmount();
    vi.unstubAllGlobals();
  });

  it("nối lại thất bại tiếp: hết lượt lần nữa → nút hiện lại", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("mạng")));
    const view = render(<Harness onRefresh={() => undefined} />);
    act(() => sockets[0].io.emit("reconnect_failed"));
    fireEvent.click(view.getByTestId("reconnect"));
    await waitFor(() => expect(sockets).toHaveLength(2));
    expect(view.queryByTestId("reconnect")).toBeNull();
    act(() => sockets[1].io.emit("reconnect_failed"));
    expect(view.getByTestId("reconnect")).toBeTruthy();
    view.unmount();
    vi.unstubAllGlobals();
  });

  it("enabled=false (mock): không mở socket", () => {
    const view = render(<Harness onRefresh={() => undefined} enabled={false} />);
    expect(sockets).toHaveLength(0);
    expect(view.getByTestId("s").textContent).toBe("disconnected");
    view.unmount();
  });

  it("tab ẩn: sự kiện không tải; hiện lại (visibilitychange) tải 1 lần", async () => {
    const onRefresh = vi.fn();
    const view = render(<Harness onRefresh={onRefresh} />);
    const s = sockets[0];
    act(() => s.emitFromServer("operations.connected", {}));
    const state = vi.spyOn(document, "visibilityState", "get");
    state.mockReturnValue("hidden");
    act(() => s.emitFromServer("operations.updated", ev("payment.confirmed", { orderId: "a" })));
    await sleep(800);
    expect(onRefresh).not.toHaveBeenCalled();
    state.mockReturnValue("visible");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1), { timeout: 2000 });
    state.mockRestore();
    view.unmount();
  });
});
