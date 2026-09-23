/**
 * Chuỗi nhà hàng và Chi nhánh — API thật (api/v1).
 *
 * Kiểu dữ liệu bám theo response thật của backend. Swagger không khai báo
 * schema cho response 200 của nhóm này, nên các trường dưới đây lấy từ payload
 * thực tế đã kiểm chứng.
 */
import { request, ApiError } from "./http";

export type ApiBranchStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";

export interface ApiChainRef {
  id: string;
  code: string;
  name: string;
  status: string;
}

export interface ApiBranch {
  id: string;
  chainId: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  addressLine1: string;
  addressLine2: string | null;
  ward: string | null;
  district: string | null;
  city: string;
  country: string | null;
  timezone: string | null;
  status: ApiBranchStatus;
  createdAt: string;
  updatedAt: string;
  chain: ApiChainRef;
}

export interface ApiOperatingHour {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed?: boolean;
}

export interface ApiBranchDetail extends ApiBranch {
  operatingHours: ApiOperatingHour[];
  specialHours: unknown[];
  areas: unknown[];
}

export interface ApiPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  monthlyPrice: string;
  maxBranches: number;
  maxAccounts: number;
  maxTables: number;
}

export interface ApiQuota {
  resource: "branches" | "accounts" | "tables";
  used: number;
  limit: number;
  remaining: number;
}

export interface ApiChain {
  id: string;
  code: string;
  name: string;
  logoUrl: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  taxCode: string | null;
  headquartersAddress: string | null;
  timezone: string | null;
  currency: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count: { branches: number };
  subscription: { plan: ApiPlan; quotas: ApiQuota[] } | null;
}

export interface CreateBranchInput {
  code: string;
  name: string;
  addressLine1: string;
  city: string;
  phone?: string;
  email?: string;
  addressLine2?: string;
  ward?: string;
  district?: string;
  country?: string;
  timezone?: string;
  openTime?: string;
  closeTime?: string;
}

export type UpdateBranchInput = Partial<Omit<CreateBranchInput, "openTime" | "closeTime">>;

/** Chuỗi mà OWNER đang quản lý. MANAGER và ADMIN gọi sẽ nhận 403. */
export function listChains(): Promise<ApiChain[]> {
  return request<ApiChain[]>("/restaurant-chains");
}

/** OWNER thấy chi nhánh của các chuỗi mình sở hữu; nhân viên chỉ thấy chi nhánh được gán. */
export function listBranches(chainId?: string): Promise<ApiBranch[]> {
  const query = chainId ? `?chainId=${encodeURIComponent(chainId)}` : "";
  return request<ApiBranch[]>(`/branches${query}`);
}

export function getBranch(branchId: string): Promise<ApiBranchDetail> {
  return request<ApiBranchDetail>(`/branches/${branchId}`);
}

export function createBranch(chainId: string, input: CreateBranchInput): Promise<ApiBranch> {
  return request<ApiBranch>(`/restaurant-chains/${chainId}/branches`, {
    method: "POST",
    body: input,
  });
}

export function updateBranch(branchId: string, input: UpdateBranchInput): Promise<ApiBranch> {
  return request<ApiBranch>(`/branches/${branchId}`, { method: "PATCH", body: input });
}

export function updateBranchStatus(branchId: string, status: ApiBranchStatus): Promise<ApiBranch> {
  return request<ApiBranch>(`/branches/${branchId}/status`, {
    method: "PATCH",
    body: { status },
  });
}

interface PlanLimitBody {
  quota?: ApiQuota;
  currentPlan?: ApiPlan;
  suggestedPlans?: (ApiPlan & { priceDifference: string })[];
}

/**
 * Backend trả 409 kèm `error: "PLAN_LIMIT_REACHED"` khi chuỗi đã dùng hết số
 * chi nhánh của gói. Message của backend đã là tiếng Việt và nêu rõ hạn mức,
 * nên chỉ bổ sung gợi ý nâng gói phía sau.
 */
export function describeBranchError(err: unknown): string {
  if (!(err instanceof ApiError)) {
    return err instanceof Error ? err.message : "Không lưu được chi nhánh";
  }

  if (err.code === "PLAN_LIMIT_REACHED") {
    const body = err.body as PlanLimitBody | null;
    const suggestion = body?.suggestedPlans?.[0];
    return suggestion
      ? `${err.message} Gói "${suggestion.name}" cho phép ${suggestion.maxBranches} chi nhánh.`
      : err.message;
  }

  if (err.status === 409) return err.message;
  return err.message;
}
