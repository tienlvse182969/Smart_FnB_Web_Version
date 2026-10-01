/** Module branch — chuỗi nhà hàng và chi nhánh. */
import type {
  ApiBranch,
  ApiBranchDetail,
  ApiBranchStatus,
  ApiChain,
  ApiPlan,
  ApiQuota,
  CreateBranchInput,
  UpdateBranchInput,
} from "../../../types";
import { ApiError } from "../../http/errors";
import { defineApi } from "../../define";
import { branchMock } from "./mock";
import { branchReal } from "./real";

export interface BranchApi {
  /** Chuỗi mà OWNER đang quản lý. MANAGER và ADMIN nhận 403. */
  listChains(): Promise<ApiChain[]>;
  /** OWNER thấy chi nhánh các chuỗi mình sở hữu; nhân viên chỉ thấy chi nhánh được gán. */
  listBranches(chainId?: string): Promise<ApiBranch[]>;
  getBranch(branchId: string): Promise<ApiBranchDetail>;
  createBranch(chainId: string, input: CreateBranchInput): Promise<ApiBranch>;
  updateBranch(branchId: string, input: UpdateBranchInput): Promise<ApiBranch>;
  updateBranchStatus(branchId: string, status: ApiBranchStatus): Promise<ApiBranch>;
}

export const branchApi = defineApi<BranchApi>("branch", { real: branchReal, mock: branchMock });

interface PlanLimitBody {
  quota?: ApiQuota;
  currentPlan?: ApiPlan;
  suggestedPlans?: (ApiPlan & { priceDifference: string })[];
}

/**
 * Backend trả 409 kèm `error: "PLAN_LIMIT_REACHED"` khi chuỗi đã dùng hết số chi nhánh của gói. Message
 * của backend đã là tiếng Việt và nêu rõ hạn mức, nên chỉ bổ sung gợi ý nâng gói phía sau.
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

  return err.message;
}
