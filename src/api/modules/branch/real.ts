/**
 * Bản real của module branch — chuỗi nhà hàng và chi nhánh (api/v1).
 * Kiểu dữ liệu nằm ở `src/types/branch.ts`.
 */
import type {
  ApiBranch,
  ApiBranchDetail,
  ApiBranchStatus,
  ApiChain,
  CreateBranchInput,
  UpdateBranchInput,
} from "../../../types";
import { request } from "../../http/client";
import type { BranchApi } from "./index";

/** Chuỗi mà OWNER đang quản lý. MANAGER và ADMIN gọi sẽ nhận 403. */
function listChains(): Promise<ApiChain[]> {
  return request<ApiChain[]>("/restaurant-chains");
}

/** OWNER thấy chi nhánh của các chuỗi mình sở hữu; nhân viên chỉ thấy chi nhánh được gán. */
function listBranches(chainId?: string): Promise<ApiBranch[]> {
  const query = chainId ? `?chainId=${encodeURIComponent(chainId)}` : "";
  return request<ApiBranch[]>(`/branches${query}`);
}

function getBranch(branchId: string): Promise<ApiBranchDetail> {
  return request<ApiBranchDetail>(`/branches/${branchId}`);
}

function createBranch(chainId: string, input: CreateBranchInput): Promise<ApiBranch> {
  return request<ApiBranch>(`/restaurant-chains/${chainId}/branches`, {
    method: "POST",
    body: input,
  });
}

function updateBranch(branchId: string, input: UpdateBranchInput): Promise<ApiBranch> {
  return request<ApiBranch>(`/branches/${branchId}`, { method: "PATCH", body: input });
}

function updateBranchStatus(branchId: string, status: ApiBranchStatus): Promise<ApiBranch> {
  return request<ApiBranch>(`/branches/${branchId}/status`, {
    method: "PATCH",
    body: { status },
  });
}

export const branchReal: BranchApi = {
  listChains,
  listBranches,
  getBranch,
  createBranch,
  updateBranch,
  updateBranchStatus,
  async archiveBranch(branchId) {
    await request(`/branches/${branchId}`, { method: "DELETE" });
  },
  listOperatingHours: (branchId) => request(`/branches/${branchId}/operating-hours`),
  saveOperatingHour: (branchId, dayOfWeek, input) =>
    request(`/branches/${branchId}/operating-hours/${dayOfWeek}`, { method: "PUT", body: input }),
  listSpecialHours: (branchId) => request(`/branches/${branchId}/special-hours`),
  saveSpecialHour: (branchId, date, input) =>
    request(`/branches/${branchId}/special-hours/${date}`, { method: "PUT", body: input }),
  async deleteSpecialHour(branchId, date) {
    await request(`/branches/${branchId}/special-hours/${date}`, { method: "DELETE" });
  },
  listAreas: (branchId) => request(`/branches/${branchId}/areas`),
  createArea: (branchId, input) => request(`/branches/${branchId}/areas`, { method: "POST", body: input }),
  updateArea: (branchId, areaId, input) => request(`/branches/${branchId}/areas/${areaId}`, { method: "PATCH", body: input }),
  updateAreaStatus: (branchId, areaId, status) =>
    request(`/branches/${branchId}/areas/${areaId}/status`, { method: "PATCH", body: { status } }),
};
