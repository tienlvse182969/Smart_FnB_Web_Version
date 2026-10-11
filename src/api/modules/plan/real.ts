/**
 * Bản REAL của module plan — gói đang dùng của chuỗi, BE `de4f55c` (#38):
 *  - OWNER: `GET /restaurant-chains` → `subscription` (`branches.service.ts` `listOwnerChains`, đã gọi `getSubscriptionSnapshot`), truyền vào
 *    qua `options.chains` (store đã đọc để lấy tên chuỗi);
 *  - MANAGER: `GET /restaurant-chains/:chainId/subscription` → `{ subscription }` (`chain-subscription.controller.ts:16-34`, vai OWNER và MANAGER,
 *    Manager chỉ đọc chuỗi của chi nhánh mình — `branch-access.service.ts` `assertCanReadChain`). Lỗi đọc KHÔNG ném lên lớp nạp khu vực
 *    (quyết định 53): trả gói rút gọn `subscriptionUnavailable = true`, không toast.
 * `subscription` = `{ status, expiresAt, plan, quotas }` (`plan-quota.service.ts:104-127`): gói hết hạn/tạm ngưng VẪN trả (`status` `EXPIRED`/
 * `SUSPENDED`), `null` chỉ khi chuỗi chưa có gói. Trạng thái và hạn dùng là THẬT (quyết định 52), không lấy từ mock.
 */
import type { ApiSubscription, PlanInfo, PlanLimit, PlanStatus, QuotaResource } from "../../../types";
import { PLAN_TIER_LABEL } from "../../../types";
import { effectiveTier, featuresForTier } from "../../../plan/tiers";
import { request } from "../../http/client";
import { getScenario } from "../../mock/scenario";
import type { GetPlanOptions, PlanApi } from "./index";
import { mockPlanBase } from "./source";

const RESOURCES: QuotaResource[] = ["branches", "accounts"];

/** Nhãn của enum `BusinessSubscriptionStatus` (`prisma/schema.prisma:217-221`). Giá trị lạ → `null` (không coi là hết hạn). */
const STATUS_OF: Record<string, PlanStatus> = { ACTIVE: "active", SUSPENDED: "suspended", EXPIRED: "expired" };

/** `undefined` = chưa biết (Manager lỗi đọc, hoặc không tìm thấy chuỗi); `null` = BE nói chuỗi chưa có gói. */
async function readSubscription(chainId: string, options: GetPlanOptions): Promise<{ sub: ApiSubscription | null | undefined; unavailable: boolean }> {
  if (options.chains) {
    const chain = options.chains.find((c) => c.id === chainId);
    return { sub: chain ? chain.subscription : undefined, unavailable: false };
  }
  try {
    const raw = await request<{ subscription: ApiSubscription | null }>(`/restaurant-chains/${chainId}/subscription`);
    return { sub: raw.subscription ?? null, unavailable: false };
  } catch {
    return { sub: undefined, unavailable: true };
  }
}

export const planReal: PlanApi = {
  async getPlan(chainId: string, options: GetPlanOptions = {}): Promise<PlanInfo> {
    const base = mockPlanBase();
    const { sub, unavailable } = await readSubscription(chainId, options);
    const quotas = sub?.quotas ?? [];
    const limits: PlanLimit[] = quotas
      .filter((q): q is typeof q & { resource: QuotaResource } => RESOURCES.includes(q.resource as QuotaResource))
      .map((q) => ({ resource: q.resource, used: q.used, limit: q.limit, remaining: q.remaining }));

    // Cấp suy từ MÃ gói thật theo quy ước tạm (plan/tiers.ts); mã lạ → coi như Cơ bản. Panel dev (chỉ ở dev) vẫn ghi đè được.
    const realPlan = sub?.plan;
    const tier = getScenario().tier ?? (realPlan ? effectiveTier(realPlan.code) : base.tier);

    // Cờ tính năng: ưu tiên cờ BE lưu trên gói (nhận diện, so sánh đa chi nhánh); chỉ suy từ cấp khi BE không trả
    // (BE cũ) hoặc khi panel dev ghi đè cấp. Cờ AI chưa có ở BE → luôn suy từ mã gói (api-contract-plan #30).
    const features = featuresForTier(tier);
    const overridden = getScenario().tier !== null && getScenario().tier !== undefined;
    const hasBackendFlags = !!realPlan && typeof realPlan.brandingEnabled === "boolean" && typeof realPlan.multiBranchComparisonEnabled === "boolean";
    if (hasBackendFlags && !overridden) {
      features.branding = { ...features.branding, enabled: realPlan.brandingEnabled === true };
      features.multiBranchCompare = { ...features.multiBranchCompare, enabled: realPlan.multiBranchComparisonEnabled === true };
    }

    // Trạng thái và hạn dùng THẬT từ BE (quyết định 52). Ô "Hết hạn" của panel dev (chỉ ở dev) vẫn ép `expired` để thử chế độ chỉ đọc (quyết định 55).
    const status: PlanStatus | null = getScenario().expired ? "expired" : sub?.status ? (STATUS_OF[sub.status] ?? null) : null;

    return {
      chainId,
      tier,
      // Tên gói thật nếu BE có; không thì tên của cấp.
      planName: realPlan?.name ?? PLAN_TIER_LABEL[tier],
      status,
      expiresAt: sub?.expiresAt ?? null,
      // Chuỗi đã đọc được mà `subscription = null`: BE nói chưa có gói đang dùng (quyết định 38).
      noActivePlan: sub === null,
      ...(unavailable && { subscriptionUnavailable: true }),
      limits,
      features,
      // Hai cờ là thật khi BE trả; cờ AI vẫn suy từ mã nên cả khối ghi "real" chỉ khi có cờ BE.
      source: { limits: sub !== undefined ? "real" : "mock", features: hasBackendFlags && !overridden ? "real" : "mock" },
    };
  },
};
