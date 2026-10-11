/**
 * Lớp API: mỗi module một interface + bản real/mock, chọn theo cờ `VITE_API_<MODULE>`. Màn hình và store chỉ
 * import từ đây, không import `real.ts`/`mock.ts`.
 */
import { printFlagTable } from "./flags";

export { authApi, TABLET_ONLY_MESSAGE, NO_WEB_ACCESS_MESSAGE, type AuthApi } from "./modules/auth";
export { branchApi, describeBranchError, planUpgradeHint, type BranchApi } from "./modules/branch";
export { reportApi, type ReportApi } from "./modules/report";
export { planApi, type PlanApi, type GetPlanOptions } from "./modules/plan";
export { menuApi, SKU_PATTERN, suggestSku, type MenuApi } from "./modules/menu";
export { optionsApi, type OptionsApi, type OptionGroupInput } from "./modules/options";
export { branchOptionsApi, groupBranchOptions, type BranchOptionsApi } from "./modules/branchOptions";
export { brandingApi, type BrandingApi, type BrandingInput } from "./modules/branding";
export { accountApi, type AccountApi } from "./modules/account";
export { stationsApi, type StationsApi } from "./modules/stations";
export { isIpv4, isMac, validateStationInput } from "./modules/stations/rules";
export { orderApi, type OrderApi, type OrderScope } from "./modules/order";
export { managerReportApi, type ManagerReportApi, type ManagerReportScope } from "./modules/managerReport";
export { aiApi, SAMPLE_QUESTIONS, type AiApi } from "./modules/ai";
export { adminApi, type AdminApi } from "./modules/admin";
export { payosApi, type PayosApi, type PayosChannel, type PayosKeysInput, type PayosLinkStatus } from "./modules/payos";

export {
  ApiError,
  classifyApiError,
  describeApiError,
  isQuotaError,
  isReadOnlyError,
  READ_ONLY_TEXT,
  SERVER_ERROR_TEXT,
  translateBackendMessage,
  showApiError,
  setApiErrorHandler,
  type ApiErrorEvent,
  type ApiErrorKind,
} from "./http/errors";
export { clearTokens, setSessionExpiredHandler } from "./http/client";
export { API_MODULES, DEFAULT_MODES, MODES, flagTable, modeOf, type ApiMode, type ApiModule } from "./flags";
export { getPublicPlans, loadPublicPlans, type PublicPlan } from "./publicPlans";
export { mockControl, setMockFailure, type MockFailureKind } from "./mock/control";
export { getScenario, setScenario, subscribeScenario, type MockScenario, type MockProfileId } from "./mock/scenario";

printFlagTable();
