/** Ánh xạ chi nhánh giữa hình dạng backend và hình dạng UI đang dùng. */
import type { ApiBranch, ApiBranchStatus } from "../services/branchApi";
import type { Branch, BranchStatus } from "../types";

const UI_STATUS: Record<ApiBranchStatus, BranchStatus> = {
  ACTIVE: "open",
  INACTIVE: "closed",
  MAINTENANCE: "suspended",
};

const API_STATUS: Record<BranchStatus, ApiBranchStatus> = {
  open: "ACTIVE",
  closed: "INACTIVE",
  suspended: "MAINTENANCE",
};

export function toApiStatus(status: BranchStatus): ApiBranchStatus {
  return API_STATUS[status];
}

/**
 * Ghép địa chỉ thành một dòng: số nhà → phường/xã → tỉnh/thành.
 *
 * Bỏ `district` vì Việt Nam đã bỏ cấp quận/huyện từ 01/07/2025. Các bản ghi tạo
 * trong giai đoạn form cũ có `city` bị ghi trùng `addressLine1`; trùng thì chỉ
 * hiện một lần thay vì lặp lại chuỗi giống hệt nhau.
 */
export function formatAddress(branch: Pick<ApiBranch, "addressLine1" | "ward" | "city">): string {
  const parts = [branch.addressLine1, branch.ward, branch.city]
    .map((part) => part?.trim())
    .filter((part): part is string => !!part);
  return [...new Set(parts)].join(", ");
}

/**
 * `tenantId` nhận ID mock để các màn còn chạy mock vẫn lọc được.
 *
 * `openTime`/`closeTime` để rỗng: backend nhận hai trường này lúc tạo nhưng
 * không trả lại trong response chi nhánh (giờ mở cửa nằm ở endpoint
 * operating-hours riêng). UI hiện "—" thay vì bịa giá trị.
 */
export function toUiBranch(branch: ApiBranch, mockTenantId: string | null): Branch {
  return {
    id: branch.id,
    tenantId: mockTenantId ?? branch.chainId,
    name: branch.name,
    address: formatAddress(branch),
    phone: branch.phone ?? "",
    openTime: "",
    closeTime: "",
    status: UI_STATUS[branch.status],
  };
}
