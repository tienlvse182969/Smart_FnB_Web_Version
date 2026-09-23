/**
 * Bàn và sơ đồ bàn — API thật (`/api/v1/branches/{branchId}/tables`, `/tables/*`).
 *
 * Phân quyền backend: đọc danh sách thì OWNER, MANAGER và WAITER đều gọi được;
 * tạo, sửa, đổi trạng thái và khai báo liền kề chỉ OWNER và MANAGER. Gọi sang
 * chi nhánh không thuộc phạm vi của mình trả 403.
 *
 * Lưu ý kiểu dữ liệu: Swagger khai `positionX/positionY/width/height` là số,
 * nhưng backend trả **chuỗi** (cột Decimal của Prisma) hoặc `null`. Dùng
 * {@link tablePosition} để đọc an toàn.
 */
import { request } from "./http";

export type ApiTableStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "OUT_OF_SERVICE";

/** Số thập phân backend trả về dạng chuỗi, hoặc null khi chưa đặt vị trí. */
type DecimalLike = string | number | null;

export interface ApiTable {
  id: string;
  branchId: string;
  code: string;
  name: string | null;
  area: string | null;
  floor: number | null;
  capacity: number;
  positionX: DecimalLike;
  positionY: DecimalLike;
  width: DecimalLike;
  height: DecimalLike;
  status: ApiTableStatus;
  isActive: boolean;
  /** Bàn liền kề, dùng cho ghép bàn. Backend giữ quan hệ đối xứng hai chiều. */
  adjacentTableIds: string[];
}

export interface CreateTableInput {
  code: string;
  capacity: number;
  name?: string;
  area?: string;
  floor?: number;
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
}

export type UpdateTableInput = Partial<CreateTableInput>;

/** Sơ đồ bàn của một chi nhánh kèm trạng thái hiện tại. */
export function listTables(branchId: string): Promise<ApiTable[]> {
  return request<ApiTable[]>(`/branches/${branchId}/tables`);
}

export function createTable(branchId: string, input: CreateTableInput): Promise<ApiTable> {
  return request<ApiTable>(`/branches/${branchId}/tables`, { method: "POST", body: input });
}

export function updateTable(tableId: string, input: UpdateTableInput): Promise<ApiTable> {
  return request<ApiTable>(`/tables/${tableId}`, { method: "PATCH", body: input });
}

export function updateTableStatus(tableId: string, status: ApiTableStatus): Promise<ApiTable> {
  return request<ApiTable>(`/tables/${tableId}/status`, { method: "PATCH", body: { status } });
}

/**
 * Ghi đè toàn bộ tập bàn liền kề của một bàn. Backend tự đồng bộ chiều ngược
 * lại, nên không cần gọi thêm cho bàn kia.
 */
export function replaceTableAdjacency(
  branchId: string,
  tableId: string,
  adjacentTableIds: string[],
): Promise<ApiTable> {
  return request<ApiTable>(`/branches/${branchId}/table-adjacency`, {
    method: "PUT",
    body: { tableId, adjacentTableIds },
  });
}

/** Đọc một số thập phân backend trả dạng chuỗi. Trả null nếu chưa đặt. */
export function tablePosition(value: DecimalLike): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
