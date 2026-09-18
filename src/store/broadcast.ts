/**
 * BroadcastChannel sync giữa các tab trình duyệt.
 * Cho phép multi-tab (ví dụ Waiter mở bàn ở tab 1, Kitchen thấy order ở tab 2).
 */

const CHANNEL_NAME = "smartfnb_channel";

export type BroadcastMessage =
  | { type: "SYNC_STATE"; payload: Partial<Record<string, any>> }
  | { type: "REFETCH_ALL" }
  /** Owner đã lưu/khôi phục nhận diện — chỉ tab của CÙNG tenantId cần áp lại theme. */
  | { type: "BRANDING_UPDATED"; tenantId: string };

class StoreBroadcast {
  private channel: BroadcastChannel | null = null;
  private listeners: ((msg: BroadcastMessage) => void)[] = [];

  constructor() {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
        this.listeners.forEach((listener) => listener(event.data));
      };
    }
  }

  public send(msg: BroadcastMessage) {
    try {
      this.channel?.postMessage(msg);
    } catch {
      // Ignore broadcast errors in unsupported environments
    }
  }

  public subscribe(listener: (msg: BroadcastMessage) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}

export const broadcast = new StoreBroadcast();
