/**
 * Lưu mock tuỳ chọn qua F5 (4.4) — CHỈ module options, CHỈ khi cờ `options` = mock; bỏ khi options có `real.ts`.
 * localStorage `smartfnb:mock:options:v1:<chainId>`; mọi truy cập bọc try/catch, đọc lỗi hoặc rỗng thì dùng dữ liệu sinh sẵn.
 * Liên kết tới món không còn trên danh sách món thật được GIỮ nguyên ở đây; chỗ hiển thị tự bỏ qua, không xoá.
 */
import type { ItemOptionConfig, OptionGroup } from "../../../types";
import { modeOf } from "../../flags";

export const OPTIONS_STORAGE_PREFIX = "smartfnb:mock:options:v1:";
const keyOf = (chainId: string) => OPTIONS_STORAGE_PREFIX + chainId;

export interface PersistedOptions {
  groups: OptionGroup[];
  itemOptions: ItemOptionConfig[];
}

const enabled = () => modeOf("options") === "mock";

export function loadPersistedOptions(chainId: string): PersistedOptions | null {
  if (!enabled()) return null;
  try {
    const raw = localStorage.getItem(keyOf(chainId));
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<PersistedOptions>;
    if (!data || !Array.isArray(data.groups) || !Array.isArray(data.itemOptions) || data.groups.length === 0) return null;
    return { groups: data.groups, itemOptions: data.itemOptions };
  } catch {
    return null;
  }
}

export function savePersistedOptions(chainId: string, data: PersistedOptions): void {
  if (!enabled()) return;
  try {
    localStorage.setItem(keyOf(chainId), JSON.stringify(data));
  } catch {
    // Đầy bộ nhớ, chế độ riêng tư, bị chặn: bỏ qua, dữ liệu vẫn nằm trong bộ nhớ phiên.
  }
}

/** Xoá mọi dữ liệu mock tuỳ chọn đã lưu (mọi chuỗi). Dùng cho nút xoá dữ liệu mock của MockPanel. */
export function clearPersistedOptions(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(OPTIONS_STORAGE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // bỏ qua
  }
}
