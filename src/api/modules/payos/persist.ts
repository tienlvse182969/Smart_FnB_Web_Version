/**
 * Lưu mock PayOS qua F5 — CHỈ khi cờ `payos` = mock. Chỉ lưu TRẠNG THÁI (đã liên kết hay chưa + ngày), KHÔNG BAO GIỜ lưu khoá
 * (quyết định 30). `smartfnb:mock:payos:v1:<chainId>`; cờ "giả lập Lỗi" của MockPanel ở `smartfnb:mock:payos-error`.
 * Mọi truy cập bọc try/catch.
 */
import { modeOf } from "../../flags";

export const PAYOS_STORAGE_PREFIX = "smartfnb:mock:payos:v1:";
export const PAYOS_ERROR_FLAG_KEY = "smartfnb:mock:payos-error";
const keyOf = (chainId: string) => PAYOS_STORAGE_PREFIX + chainId;
const enabled = () => modeOf("payos") === "mock";

export interface PersistedPayos {
  linkedAt: string;
  updatedAt: string;
}

export function loadPersistedPayos(chainId: string): PersistedPayos | null {
  if (!enabled()) return null;
  try {
    const raw = localStorage.getItem(keyOf(chainId));
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<PersistedPayos>;
    if (!data || typeof data.linkedAt !== "string" || typeof data.updatedAt !== "string") return null;
    return { linkedAt: data.linkedAt, updatedAt: data.updatedAt };
  } catch {
    return null;
  }
}

export function savePersistedPayos(chainId: string, value: PersistedPayos | null): void {
  if (!enabled()) return;
  try {
    if (value) localStorage.setItem(keyOf(chainId), JSON.stringify({ linkedAt: value.linkedAt, updatedAt: value.updatedAt }));
    else localStorage.removeItem(keyOf(chainId));
  } catch {
    // bỏ qua
  }
}

export function isPayosErrorSimulated(): boolean {
  try {
    return localStorage.getItem(PAYOS_ERROR_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

export function setPayosErrorSimulated(on: boolean): void {
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
