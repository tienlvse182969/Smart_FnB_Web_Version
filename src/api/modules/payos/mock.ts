import { ApiError } from "../../http/errors";
import { mockDelay } from "../../mock/control";
import { assertMockWritable } from "../../mock/guards";
import { isPayosErrorSimulated, loadPersistedPayos, savePersistedPayos, type PersistedPayos } from "./persist";
import type { PayosApi, PayosChannel } from "./index";

/** Bộ nhớ phiên; khi cờ = mock thì localStorage là "máy chủ" (đọc lại mỗi lần, sống qua F5). Khoá KHÔNG được giữ ở đâu cả. */
const linked = new Map<string, PersistedPayos | null>();

/** Chỉ cho test: quên bộ nhớ phiên. */
export function resetPayosMock(): void {
  linked.clear();
}

function current(chainId: string): PersistedPayos | null {
  const saved = loadPersistedPayos(chainId);
  if (saved) linked.set(chainId, saved);
  return linked.get(chainId) ?? saved ?? null;
}

function toChannel(value: PersistedPayos | null): PayosChannel {
  if (!value) return { status: "unlinked" };
  // Mock có đủ 4 trạng thái: "Lỗi" bật từ MockPanel (BE thật chưa có ô này, #40).
  return { status: isPayosErrorSimulated() ? "error" : "linked", linkedAt: value.linkedAt, updatedAt: value.updatedAt };
}

export const payosMock: PayosApi = {
  async getChannel(chainId) {
    await mockDelay();
    return toChannel(current(chainId));
  },
  async saveKeys(chainId, keys) {
    await mockDelay();
    assertMockWritable();
    const missing = (["clientId", "apiKey", "checksumKey"] as const).filter((k) => !keys[k]?.trim());
    if (missing.length) throw new ApiError(400, "Chưa nhập đủ 3 khoá PayOS.", missing.map((k) => `${k} should not be empty`));
    const now = new Date().toISOString();
    const prev = current(chainId);
    const next: PersistedPayos = { linkedAt: prev?.linkedAt ?? now, updatedAt: now };
    linked.set(chainId, next);
    savePersistedPayos(chainId, next);
    return toChannel(next);
  },
  async unlink(chainId) {
    await mockDelay();
    assertMockWritable();
    linked.set(chainId, null);
    savePersistedPayos(chainId, null);
    return { status: "unlinked" };
  },
};
