/**
 * Lớp API: mỗi module một interface + bản real/mock, chọn theo cờ `VITE_API_<MODULE>`. Màn hình và store chỉ
 * import từ đây, không import `real.ts`/`mock.ts`.
 */
import { printFlagTable } from "./flags";

export { authApi, TABLET_ONLY_MESSAGE, NO_WEB_ACCESS_MESSAGE, type AuthApi } from "./modules/auth";
export { branchApi, describeBranchError, type BranchApi } from "./modules/branch";
export { reportApi, type ReportApi } from "./modules/report";
export { planApi, type PlanApi, type GetPlanOptions } from "./modules/plan";
export { menuApi, type MenuApi } from "./modules/menu";
export { optionsApi, type OptionsApi, type OptionGroupInput } from "./modules/options";
export { brandingApi, type BrandingApi, type BrandingInput } from "./modules/branding";
export { accountApi, type AccountApi } from "./modules/account";
export { orderApi, type OrderApi, type ListOrdersParams } from "./modules/order";
export { aiApi, SAMPLE_QUESTIONS, type AiApi } from "./modules/ai";
export { adminApi, type AdminApi } from "./modules/admin";
export { payosApi, type PayosApi, type PayosLinkStatus } from "./modules/payos";

export {
  ApiError,
  classifyApiError,
  describeApiError,
  isQuotaError,
  showApiError,
  setApiErrorHandler,
  type ApiErrorEvent,
  type ApiErrorKind,
} from "./http/errors";
export { clearTokens, setSessionExpiredHandler } from "./http/client";
export { API_MODULES, DEFAULT_MODES, MODES, flagTable, modeOf, type ApiMode, type ApiModule } from "./flags";
export { mockControl, setMockFailure, type MockFailureKind } from "./mock/control";
export { getScenario, setScenario, subscribeScenario, type MockScenario, type MockProfileId } from "./mock/scenario";

printFlagTable();
