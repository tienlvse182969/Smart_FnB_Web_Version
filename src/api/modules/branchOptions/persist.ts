/**
 * Mock tuỳ chọn theo chi nhánh lưu qua F5 (5.7c): localStorage `smartfnb:mock:options:branch:v1:<chainId>:<branchId>`.
 * Lưu cờ còn bán của chi nhánh (`optionId` → `isAvailable`). Bọc try/catch; hỏng/rỗng thì dùng dữ liệu sinh sẵn.
 * Khác khoá `smartfnb:mock:options:v1:<chainId>` của module options (Owner), nên có hàm xoá riêng.
 */
export const BRANCH_OPTIONS_STORAGE_PREFIX = "smartfnb:mock:options:branch:v1:";
const keyOf = (chainId: string, branchId: string) => `${BRANCH_OPTIONS_STORAGE_PREFIX}${chainId}:${branchId}`;

export interface PersistedBranchOption {
  optionId: string;
  isAvailable: boolean;
}

export function loadPersistedBranchOptions(chainId: string, branchId: string): PersistedBranchOption[] | null {
  try {
    const raw = localStorage.getItem(keyOf(chainId, branchId));
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return null;
    const rows = data.filter(
      (r): r is PersistedBranchOption => !!r && typeof r === "object" && typeof (r as PersistedBranchOption).optionId === "string" && typeof (r as PersistedBranchOption).isAvailable === "boolean",
    );
    return rows.length > 0 ? rows : null;
  } catch {
    return null;
  }
}

export function savePersistedBranchOptions(chainId: string, branchId: string, rows: PersistedBranchOption[]): void {
  try {
    localStorage.setItem(keyOf(chainId, branchId), JSON.stringify(rows));
  } catch {
    // Đầy bộ nhớ, chế độ riêng tư, bị chặn: bỏ qua, dữ liệu vẫn nằm trong bộ nhớ phiên.
  }
}

/** Xoá mọi dữ liệu mock tuỳ chọn chi nhánh đã lưu (mọi chuỗi, mọi chi nhánh). Dùng cho nút xoá của MockPanel. */
export function clearPersistedBranchOptions(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(BRANCH_OPTIONS_STORAGE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // bỏ qua
  }
}
