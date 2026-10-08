import type { PayosChannel } from "./index";

/**
 * Thân BE `de4f55c` (`payos-channel.service.ts:44`, `dto/payos-channel.dto.ts:22-41`): chưa liên kết → `{ configured: false }`; đã có kênh →
 * `{ configured: true, id, status, clientIdLast4, apiKeyLast4, lastError, lastVerifiedAt, createdAt, updatedAt }`. Không bao giờ có khoá đầy đủ.
 * `lastError` là câu thô của PayOS (có thể tiếng Anh): web KHÔNG đọc và KHÔNG hiện nó (quyết định 49), nên mapper bỏ qua trường này.
 */
export interface RawPayosChannel {
  configured: boolean;
  id?: string;
  /** `LINKED` | `ERROR` (enum `PayosChannelStatus`). BE cũ không có trường này. */
  status?: string;
  clientIdLast4?: string | null;
  apiKeyLast4?: string | null;
  lastError?: string | null;
  lastVerifiedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

const last4 = (value: string | null | undefined): string | undefined => (typeof value === "string" && value.length > 0 ? value.slice(-4) : undefined);

export function mapPayosChannel(raw: RawPayosChannel): PayosChannel {
  if (!raw.configured) return { status: "unlinked" };
  return {
    status: raw.status === "ERROR" ? "error" : "linked",
    linkedAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    lastVerifiedAt: raw.lastVerifiedAt ?? undefined,
    clientIdLast4: last4(raw.clientIdLast4),
    apiKeyLast4: last4(raw.apiKeyLast4),
  };
}
