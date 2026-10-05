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
import { ApiError, describeApiError, translateBackendMessage } from "../../http/errors";
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
  if (!(err instanceof ApiError)) return describeApiError(err);

  if (err.code === "PLAN_LIMIT_REACHED") {
    const text = translateBackendMessage(err);
    const hint = planUpgradeHint(err);
    return hint ? `${text} ${hint}` : text;
  }

  return describeApiError(err); // luôn tiếng Việt: 5xx → câu chung, 400/404/409 → bảng dịch (errors.ts)
}

/**
 * Gợi ý nâng gói khi hết hạn mức CHI NHÁNH ("Gói X cho phép N chi nhánh."); rỗng với lỗi khác hoặc hạn mức tài khoản.
 * Thông báo hạn mức toàn cục (`ApiErrorBridge`) dùng để chỉ có MỘT thông báo, đủ gợi ý.
 */
export function planUpgradeHint(err: unknown): string {
  if (!(err instanceof ApiError) || err.code !== "PLAN_LIMIT_REACHED") return "";
  const body = err.body as PlanLimitBody | null;
  if (body?.quota?.resource !== "branches") return "";
  const suggestion = body.suggestedPlans?.[0];
  return suggestion ? `Gói "${suggestion.name}" cho phép ${suggestion.maxBranches} chi nhánh.` : "";
}
