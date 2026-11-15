/**
 * Phạm vi báo cáo Owner theo gói (OW-08, mục 13.1, BR-08, BR-85).
 *
 * - Cơ bản: xem TỪNG chi nhánh — phạm vi luôn là đúng một chi nhánh (BE trả 403 khi phạm vi có ≥ 2 chi nhánh
 *   mà gói không có "so sánh đa chi nhánh").
 * - Tiêu chuẩn / Nâng cao: thêm "Tất cả chi nhánh" và khối so sánh các chi nhánh.
 * - Chuỗi chỉ có một chi nhánh: không có gì để so sánh, bất kể gói.
 *
 * Đây chỉ là lớp ẩn/khoá giao diện; BE vẫn là nơi chặn thật. Hàm thuần để test không cần React.
 */
import type { ApiBranchStatus } from "../../types";

/** Giá trị chọn "mọi chi nhánh" trong bộ chọn phạm vi. */
export const ALL_BRANCHES = "__all__";

export type ComparisonLock = "plan" | "single-branch" | null;

export interface ReportScopeInput {
  /** Gói có tính năng so sánh đa chi nhánh (FeatureGate `multiBranchCompare`). */
  hasCompare: boolean;
  /** Mã các chi nhánh Owner quản lý, theo thứ tự hiển thị. */
  branchIds: string[];
  /** Lựa chọn hiện tại của người dùng (`ALL_BRANCHES` hoặc mã chi nhánh); có thể không còn hợp lệ. */
  selected: string;
}

export interface ReportScope {
  /** Lựa chọn hợp lệ sau khi ép theo gói (không bao giờ là `ALL_BRANCHES` khi gói không cho). */
  selected: string;
  /** Có hiện lựa chọn "Tất cả chi nhánh" không. */
  canPickAll: boolean;
  /** Tham số `branchIds` gửi BE; `undefined` = mọi chi nhánh Owner quản lý. */
  branchIds: string[] | undefined;
  /** Có hiện khối so sánh các chi nhánh (phạm vi nhiều chi nhánh VÀ gói cho phép). */
  showComparison: boolean;
  /** Vì sao không so sánh được, để hiện đúng ghi chú. `null` khi đang so sánh hoặc đã chọn một chi nhánh có thể so sánh. */
  comparisonLock: ComparisonLock;
}

export function resolveReportScope({ hasCompare, branchIds, selected }: ReportScopeInput): ReportScope {
  if (branchIds.length === 0) {
    return { selected: ALL_BRANCHES, canPickAll: false, branchIds: undefined, showComparison: false, comparisonLock: "single-branch" };
  }
  if (branchIds.length === 1) {
    return { selected: branchIds[0], canPickAll: false, branchIds: [branchIds[0]], showComparison: false, comparisonLock: "single-branch" };
  }
  if (!hasCompare) {
    // Gói Cơ bản: bắt buộc một chi nhánh. Lựa chọn lạ hoặc "tất cả" rơi về chi nhánh đầu.
    const one = branchIds.includes(selected) ? selected : branchIds[0];
    return { selected: one, canPickAll: false, branchIds: [one], showComparison: false, comparisonLock: "plan" };
  }
  if (selected === ALL_BRANCHES || !branchIds.includes(selected)) {
    return { selected: ALL_BRANCHES, canPickAll: true, branchIds: undefined, showComparison: true, comparisonLock: null };
  }
  // Gói có so sánh nhưng đang xem một chi nhánh: khối so sánh chỉ có một dòng nên không hiện.
  return { selected, canPickAll: true, branchIds: [selected], showComparison: false, comparisonLock: null };
}

/** Hậu tố nhãn cho chi nhánh không hoạt động trong bộ chọn (BE vẫn tính doanh thu của chi nhánh đó). */
export function branchStatusSuffix(status: ApiBranchStatus | undefined): string {
  if (status === "MAINTENANCE") return " · Tạm ngưng";
  if (status === "INACTIVE") return " · Đóng cửa";
  return "";
}

/** 403 do gói không có tính năng (BE `PLAN_FEATURE_NOT_ENABLED`, BR-08). */
export function isPlanFeatureError(error: unknown): boolean {
  const e = error as { status?: number; code?: string | null } | null;
  return !!e && e.status === 403 && e.code === "PLAN_FEATURE_NOT_ENABLED";
}

/**
 * Chi nhánh đang có giá riêng (BR-85: so sánh doanh thu kèm ghi chú chi nhánh nào có giá riêng).
 * Đọc từ ma trận giá chi nhánh của BE (OW-16): ô có `priceOverride` khác null. Trả số mục có giá riêng theo chi nhánh.
 */
export function branchesWithOwnPrice(cells: { branchId: string; priceOverride: number | null }[]): Map<string, number> {
  const result = new Map<string, number>();
  for (const cell of cells) {
    if (cell.priceOverride === null) continue;
    result.set(cell.branchId, (result.get(cell.branchId) ?? 0) + 1);
  }
  return result;
}
