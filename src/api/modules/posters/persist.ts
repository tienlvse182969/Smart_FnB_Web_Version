/**
 * Lưu mock poster qua F5 — CHỈ khi cờ `posters` = mock (như `branding/persist.ts`). localStorage `smartfnb:mock:posters:v2:<chainId>` (v2: theo mô hình BE, `sortOrder`/`durationSeconds`);
 * mọi truy cập bọc try/catch. Ảnh là data URL nên có thể vượt hạn mức localStorage: khi đó chỉ giữ trong bộ nhớ phiên.
 */
import type { Poster } from "../../../types";
import { modeOf } from "../../flags";

export const POSTERS_STORAGE_PREFIX = "smartfnb:mock:posters:v2:";
const keyOf = (chainId: string) => POSTERS_STORAGE_PREFIX + chainId;
const enabled = () => modeOf("posters") === "mock";

const isPoster = (p: unknown): p is Poster => {
  const o = p as Partial<Poster> | null;
  return !!o && typeof o.id === "string" && typeof o.imageUrl === "string" && typeof o.title === "string" && typeof o.enabled === "boolean" && typeof o.sortOrder === "number" && typeof o.durationSeconds === "number";
};

export function loadPersistedPosters(chainId: string): Poster[] | null {
  if (!enabled()) return null;
  try {
    const raw = localStorage.getItem(keyOf(chainId));
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data) || !data.every(isPoster)) return null;
    return data;
  } catch {
    return null;
  }
}

export function savePersistedPosters(chainId: string, posters: Poster[]): void {
  if (!enabled()) return;
  try {
    localStorage.setItem(keyOf(chainId), JSON.stringify(posters));
  } catch {
    // Đầy bộ nhớ, chế độ riêng tư, bị chặn: bỏ qua, dữ liệu vẫn nằm trong bộ nhớ phiên.
  }
}

/** Xoá mọi poster mock đã lưu (mọi chuỗi). Dùng cho nút xoá dữ liệu mock của MockPanel. */
export function clearPersistedPosters(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(POSTERS_STORAGE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // bỏ qua
  }
}
