/**
 * Lưu mock PayOS qua F5 — CHỈ khi cờ `payos` = mock. Chỉ lưu TRẠNG THÁI (ngày + 4 ký tự cuối để hiện khoá che, như BE `de4f55c` cũng chỉ
 * giữ 4 ký tự cuối), KHÔNG BAO GIỜ lưu khoá đầy đủ (quyết định 30). `smartfnb:mock:payos:v1:<chainId>`; cờ "giả lập Lỗi" của MockPanel ở
 * `smartfnb:mock:payos-error` (chỉ đọc ở dev, quyết định 47). Mọi truy cập bọc try/catch.
 */
import { modeOf } from "../../flags";

export const PAYOS_STORAGE_PREFIX = "smartfnb:mock:payos:v1:";
export const PAYOS_ERROR_FLAG_KEY = "smartfnb:mock:payos-error";
const keyOf = (chainId: string) => PAYOS_STORAGE_PREFIX + chainId;
const enabled = () => modeOf("payos") === "mock";

export interface PersistedPayos {
  linkedAt: string;
  updatedAt: string;
  lastVerifiedAt: string;
  clientIdLast4: string;
  apiKeyLast4: string;
}

const isStr = (v: unknown): v is string => typeof v === "string";

export function loadPersistedPayos(chainId: string): PersistedPayos | null {
  if (!enabled()) return null;
  try {
    const raw = localStorage.getItem(keyOf(chainId));
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<PersistedPayos>;
    if (!d || !isStr(d.linkedAt) || !isStr(d.updatedAt)) return null;
    return {
      linkedAt: d.linkedAt,
      updatedAt: d.updatedAt,
      lastVerifiedAt: isStr(d.lastVerifiedAt) ? d.lastVerifiedAt : d.updatedAt,
      clientIdLast4: isStr(d.clientIdLast4) ? d.clientIdLast4.slice(-4) : "",
      apiKeyLast4: isStr(d.apiKeyLast4) ? d.apiKeyLast4.slice(-4) : "",
    };
  } catch {
    return null;
  }
}

export function savePersistedPayos(chainId: string, value: PersistedPayos | null): void {
  if (!enabled()) return;
  try {
    if (value) {
      const { linkedAt, updatedAt, lastVerifiedAt, clientIdLast4, apiKeyLast4 } = value;
      localStorage.setItem(keyOf(chainId), JSON.stringify({ linkedAt, updatedAt, lastVerifiedAt, clientIdLast4, apiKeyLast4 }));
    } else localStorage.removeItem(keyOf(chainId));
  } catch {
    // bỏ qua
  }
}

export function isPayosErrorSimulated(): boolean {
  if (!import.meta.env.DEV) return false; // production bỏ qua cờ giả lập (quyết định 47)
  try {
    return localStorage.getItem(PAYOS_ERROR_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

export function setPayosErrorSimulated(on: boolean): void {
  if (!import.meta.env.DEV) return;
  try {
    if (on) localStorage.setItem(PAYOS_ERROR_FLAG_KEY, "1");
    else localStorage.removeItem(PAYOS_ERROR_FLAG_KEY);
  } catch {
    // bỏ qua
  }
}

/** Xoá trạng thái PayOS mock đã lưu (mọi chuỗi) và cờ giả lập Lỗi. */
export function clearPersistedPayos(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(PAYOS_STORAGE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem(PAYOS_ERROR_FLAG_KEY);
  } catch {
    // bỏ qua
  }
}
