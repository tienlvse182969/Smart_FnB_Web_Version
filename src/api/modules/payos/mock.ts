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
  // Cùng dạng với real (BE `de4f55c`): khoá che, `lastVerifiedAt`. "Lỗi" giả lập bằng ô của MockPanel (chỉ ở dev) để thử màn khi PayOS từ chối.
  return {
    status: isPayosErrorSimulated() ? "error" : "linked",
    linkedAt: value.linkedAt,
    updatedAt: value.updatedAt,
    lastVerifiedAt: value.lastVerifiedAt,
    clientIdLast4: value.clientIdLast4 || undefined,
    apiKeyLast4: value.apiKeyLast4 || undefined,
  };
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
    // Như BE: chỉ giữ 4 ký tự cuối của Client ID và API key (checksum key không giữ gì); khoá đầy đủ không được lưu ở đâu.
    const next: PersistedPayos = {
      linkedAt: prev?.linkedAt ?? now,
      updatedAt: now,
      lastVerifiedAt: now,
      clientIdLast4: keys.clientId.trim().slice(-4),
      apiKeyLast4: keys.apiKey.trim().slice(-4),
    };
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
