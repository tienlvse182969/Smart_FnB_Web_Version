import { afterEach, describe, expect, it, vi } from "vitest";
import {
  connectCustomerDisplay,
  createCustomerDisplayPairing,
  DisplayApiError,
  getCustomerDisplayContext,
  resolveDisplayAsset,
} from "./customerDisplay";

const socketListeners = new Map<string, (...args: unknown[]) => void>();
const socket = {
  on: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
    socketListeners.set(event, listener);
    return socket;
  }),
  emit: vi.fn(),
};

vi.mock("socket.io-client", () => ({ io: vi.fn(() => socket) }));

afterEach(() => {
  vi.unstubAllGlobals();
  socketListeners.clear();
  vi.clearAllMocks();
});

describe("customer display API", () => {
  it("creates a customer-display pairing code", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: "123456", deviceToken: "token" }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(createCustomerDisplayPairing()).resolves.toMatchObject({ code: "123456" });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/device-pairing/codes"),
      expect.objectContaining({ body: JSON.stringify({ deviceType: "CUSTOMER_DISPLAY" }) }),
    );
  });

  it("uses the device token when restoring the paired station", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ version: 7 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(getCustomerDisplayContext("screen-token")).resolves.toMatchObject({ version: 7 });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer screen-token");
  });

  it("keeps the HTTP status for an invalid or revoked device token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "revoked" }), { status: 403 })));
    await expect(getCustomerDisplayContext("bad-token")).rejects.toEqual(
      expect.objectContaining<Partial<DisplayApiError>>({ status: 403, message: "revoked" }),
    );
  });

  it("resolves relative branding assets against the API origin", () => {
    expect(resolveDisplayAsset("/uploads/branding/logo.png")).toBe("http://localhost:3100/uploads/branding/logo.png");
  });

  it("requests the latest station snapshot after every socket connection", () => {
    connectCustomerDisplay("screen-token", vi.fn(), vi.fn());

    socketListeners.get("connect")?.();

    expect(socket.emit).toHaveBeenCalledWith("station:sync");
  });
});
