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

/** Ghép các mảnh địa chỉ của backend thành một dòng cho UI. */
export function formatAddress(branch: ApiBranch): string {
  return [branch.addressLine1, branch.addressLine2, branch.ward, branch.district, branch.city]
    .filter((part) => part && part.trim())
    .join(", ");
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
