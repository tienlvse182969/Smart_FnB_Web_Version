import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, reportApiError, resetErrorDedupe, setApiErrorHandler, showApiError } from "../../http/errors";
import { describeBranchError, planUpgradeHint } from "./index";

const planLimit = (resource: "branches" | "accounts") =>
  new ApiError(409, "Gói Cơ bản chỉ cho phép 1 chi nhánh.", [], "PLAN_LIMIT_REACHED", {
    quota: { resource, used: 1, limit: 1, remaining: 0 },
    suggestedPlans: [{ name: "Tiêu chuẩn", maxBranches: 5, priceDifference: "0" }],
  });

/** Giả lập đường của màn Branches: lớp API báo toàn cục (`reportApiError`), rồi màn gọi `showApiError(message.error, err)`. */
function flow(err: ApiError) {
  const toast = vi.fn();
  const global = vi.fn();
  setApiErrorHandler(global);
  reportApiError(err);
  showApiError(toast, err);
  return { toast, global };
}

describe("Branches: một lỗi, một thông báo", () => {
  beforeEach(() => {
    resetErrorDedupe();
    setApiErrorHandler(null);
  });

  it.each([
    ["403", new ApiError(403, "Forbidden resource")],
    ["mất mạng", new ApiError(0, "Failed to fetch")],
    ["401", new ApiError(401, "Unauthorized")],
  ])("%s: thông báo toàn cục báo, màn không báo thêm", (_name, err) => {
    const { toast, global } = flow(err as ApiError);
    expect(global).toHaveBeenCalledTimes(1);
    expect(toast).not.toHaveBeenCalled();
  });

  it("lỗi 400 không qua thông báo toàn cục: màn hiện đúng một câu tiếng Việt", () => {
    const { toast, global } = flow(new ApiError(400, "Branch code already exists"));
    expect(global).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it("hết hạn mức chi nhánh: một thông báo toàn cục, gợi ý gói nằm trong gợi ý đó, màn không báo thêm", () => {
    const err = planLimit("branches");
    const { toast, global } = flow(err);
    expect(global).toHaveBeenCalledTimes(1);
    expect(toast).not.toHaveBeenCalled();
    expect(planUpgradeHint(err)).toBe('Gói "Tiêu chuẩn" cho phép 5 chi nhánh.');
    expect(describeBranchError(err)).toContain('Gói "Tiêu chuẩn" cho phép 5 chi nhánh.');
  });

  it("hạn mức tài khoản không có gợi ý số chi nhánh", () => {
    expect(planUpgradeHint(planLimit("accounts"))).toBe("");
  });
});
