/**
 * Mock tài khoản lưu qua F5 (5.4), giống mock tuỳ chọn ở 4.4: localStorage `smartfnb:mock:accounts:v1:<chainId>`, bọc try/catch,
 * hỏng/rỗng thì dùng dữ liệu sinh sẵn. Hàm mock chỉ chạy khi màn đang dùng mock nên không cần kiểm cờ module.
 * Lưu cả danh sách nhân sự đã sinh (`staffSeeded`) để tải lại không sinh trùng.
 */
import type { DemoAccount } from "../../../types";

export const ACCOUNTS_STORAGE_PREFIX = "smartfnb:mock:accounts:v1:";
const keyOf = (chainId: string) => ACCOUNTS_STORAGE_PREFIX + chainId;

export interface PersistedAccounts {
  accounts: DemoAccount[];
  staffSeeded: string[];
}

export function loadPersistedAccounts(chainId: string): PersistedAccounts | null {
  try {
    const raw = localStorage.getItem(keyOf(chainId));
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<PersistedAccounts>;
    if (!data || !Array.isArray(data.accounts) || !Array.isArray(data.staffSeeded) || data.accounts.length === 0) return null;
    return { accounts: data.accounts, staffSeeded: data.staffSeeded };
  } catch {
    return null;
  }
}

export function savePersistedAccounts(chainId: string, data: PersistedAccounts): void {
  try {
    localStorage.setItem(keyOf(chainId), JSON.stringify(data));
  } catch {
    // Đầy bộ nhớ, chế độ riêng tư, bị chặn: bỏ qua, dữ liệu vẫn nằm trong bộ nhớ phiên.
  }
}

/** Xoá mọi dữ liệu mock tài khoản đã lưu (mọi chuỗi). Dùng cho nút xoá dữ liệu mock của MockPanel. */
export function clearPersistedAccounts(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(ACCOUNTS_STORAGE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // bỏ qua
  }
}
