/**
 * TẠM THỜI — cầu nối giữa ID thật của backend và bộ dữ liệu mock.
 *
 * Phân hệ Chuỗi & Chi nhánh đã dùng API thật, nên `chainId`/`branchId` trong
 * store là UUID của backend. Các phân hệ còn lại (menu, orders, tables,
 * payments, wallet, shifts, staff, reports, branding, AI) vẫn đọc mock và lọc
 * theo ID mock (`T-CT`, `BR-CT-Q1`…), nên cần ánh xạ UUID thật về ID mock thì
 * chúng mới có dữ liệu để hiển thị.
 *
 * Quy tắc: chuỗi thật thứ n → tenant mock thứ n; chi nhánh thật thứ n trong
 * một chuỗi → chi nhánh mock thứ n của tenant đó. Danh sách mock ngắn hơn thì
 * quay vòng.
 *
 * XOÁ FILE NÀY khi tất cả các phân hệ trên đã nối API thật. Trong lúc chuyển
 * tiếp, gỡ dần từng lời gọi `toMockTenantId` / `toMockBranchId` mỗi khi một
 * phân hệ được nối xong — đừng viết thêm logic ánh xạ ở nơi khác.
 */
import { T1, T1_B1, T1_B2, T2, T2_B1, T2_B2 } from "../mock/seed";

const MOCK_TENANTS = [T1, T2];
const MOCK_BRANCHES_BY_TENANT: Record<string, string[]> = {
  [T1]: [T1_B1, T1_B2],
  [T2]: [T2_B1, T2_B2],
};

const tenantByChainId = new Map<string, string>();
const mockBranchByRealId = new Map<string, string>();

/**
 * Nạp phạm vi thật vào cầu nối. Gọi lại mỗi lần danh sách chi nhánh đổi để
 * chi nhánh vừa tạo cũng có chỗ đứng trong mock.
 */
export function registerRealScope(
  chainIds: string[],
  branches: { id: string; chainId: string; createdAt: string }[],
): void {
  tenantByChainId.clear();
  mockBranchByRealId.clear();

  const orderedChains = [...new Set(chainIds)];
  orderedChains.forEach((chainId, index) => {
    tenantByChainId.set(chainId, MOCK_TENANTS[index % MOCK_TENANTS.length]);
  });

  // Xếp theo thời điểm tạo để một chi nhánh luôn trỏ tới cùng một chi nhánh
  // mock, kể cả sau khi thêm chi nhánh mới hay backend đổi thứ tự trả về.
  const ordered = [...branches].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const seenPerChain = new Map<string, number>();
  for (const branch of ordered) {
    const tenant = tenantByChainId.get(branch.chainId) ?? MOCK_TENANTS[0];
    const pool = MOCK_BRANCHES_BY_TENANT[tenant];
    const index = seenPerChain.get(branch.chainId) ?? 0;
    seenPerChain.set(branch.chainId, index + 1);
    mockBranchByRealId.set(branch.id, pool[index % pool.length]);
  }
}

export function clearRealScope(): void {
  tenantByChainId.clear();
  mockBranchByRealId.clear();
}

/** UUID chuỗi thật → tenantId mock. ID không nhận ra thì trả nguyên. */
export function toMockTenantId(chainId: string | null): string | null {
  if (!chainId) return null;
  return tenantByChainId.get(chainId) ?? chainId;
}

/** UUID chi nhánh thật → branchId mock. ID không nhận ra thì trả nguyên. */
export function toMockBranchId(branchId: string | null): string | null {
  if (!branchId) return null;
  return mockBranchByRealId.get(branchId) ?? branchId;
}
