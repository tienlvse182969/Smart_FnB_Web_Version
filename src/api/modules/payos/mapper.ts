import type { PayosChannel } from "./index";

/** Thân BE (`payos-channel.service.ts:22,38,44`): `{ configured, id?, createdAt?, updatedAt? }` — không bao giờ có khoá. */
export interface RawPayosChannel {
  configured: boolean;
  id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function mapPayosChannel(raw: RawPayosChannel): PayosChannel {
  if (!raw.configured) return { status: "unlinked" };
  return { status: "linked", linkedAt: raw.createdAt, updatedAt: raw.updatedAt };
}
