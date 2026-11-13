/**
 * Bản FE của phép tính thuê bao v17.1 (13.1, 31.2, BR-91, BR-92) — CHỈ để tính trước và khoá nút.
 * BE (`subscription-limits.ts`) tính lại độc lập và là nơi chặn thật.
 */
export const ACCOUNT_PACK_SIZE = 5;
export const MAX_ACCOUNT_PACKS = 4;
export const MAX_TOTAL_BRANCHES = 10;

export interface PricingPlan {
  id: string;
  code: string;
  name: string;
  monthlyPrice: number;
  maxBranches: number;
  maxAccounts: number;
  extraBranchPrice: number;
  extraBranchAccounts: number;
  extraAccountPackPrice: number;
  extraBranchEnabled: boolean;
  isActive?: boolean;
}

export interface AddonSelection {
  extraBranches: number;
  accountPacks: number;
}

export type AddonViolation =
  | { error: "INVALID_ADDON_QUANTITY" | "ADDON_NOT_SOLD" | "MAX_BRANCHES_EXCEEDED"; message: string }
  | { error: "ADDON_UPGRADE_BETTER"; message: string; suggestedPlan: Pick<PricingPlan, "id" | "code" | "name" | "monthlyPrice" | "maxBranches">; selectionTotal: number };

const vnd = (value: number) => `${Math.round(value).toLocaleString("vi-VN")}đ`;
const isPaid = (plan: Pick<PricingPlan, "code" | "monthlyPrice">) => plan.code !== "TRIAL" && Number(plan.monthlyPrice) > 0;

export function computeLimits(plan: PricingPlan, selection: AddonSelection) {
  return {
    branchLimit: plan.maxBranches + selection.extraBranches,
    accountLimit: plan.maxAccounts + selection.extraBranches * plan.extraBranchAccounts + selection.accountPacks * ACCOUNT_PACK_SIZE,
  };
}

export function selectionTotal(plan: PricingPlan, selection: AddonSelection) {
  return Number(plan.monthlyPrice) + selection.extraBranches * plan.extraBranchPrice + selection.accountPacks * plan.extraAccountPackPrice;
}

function cheapestWithBranches(plan: PricingPlan, catalog: PricingPlan[], needed: number) {
  return catalog
    .filter((c) => c.id !== plan.id && c.isActive !== false && isPaid(c) && c.maxBranches >= needed)
    .sort((a, b) => Number(a.monthlyPrice) - Number(b.monthlyPrice) || a.maxBranches - b.maxBranches)[0];
}

/** `null` khi được phép mua; ngược lại lý do và (BR-92) gói nên nâng. */
export function addonViolation(plan: PricingPlan, selection: AddonSelection, catalog: PricingPlan[]): AddonViolation | null {
  const { extraBranches, accountPacks } = selection;
  if (!Number.isInteger(extraBranches) || extraBranches < 0 || !Number.isInteger(accountPacks) || accountPacks < 0 || accountPacks > MAX_ACCOUNT_PACKS)
    return { error: "INVALID_ADDON_QUANTITY", message: `Tối đa ${MAX_ACCOUNT_PACKS} gói tài khoản mỗi kỳ.` };
  if ((extraBranches || accountPacks) && !isPaid(plan)) return { error: "ADDON_NOT_SOLD", message: "Gói dùng thử không có mua thêm." };
  if (accountPacks && plan.extraAccountPackPrice <= 0) return { error: "ADDON_NOT_SOLD", message: `Gói ${plan.name} không bán gói tài khoản.` };
  if (extraBranches && (!plan.extraBranchEnabled || plan.extraBranchPrice <= 0)) return { error: "ADDON_NOT_SOLD", message: `Gói ${plan.name} không bán thêm chi nhánh.` };
  if (plan.maxBranches + extraBranches > MAX_TOTAL_BRANCHES) return { error: "MAX_BRANCHES_EXCEEDED", message: `Tổng số chi nhánh không vượt quá ${MAX_TOTAL_BRANCHES}.` };
  if (extraBranches) {
    const better = cheapestWithBranches(plan, catalog, plan.maxBranches + extraBranches);
    const total = Number(plan.monthlyPrice) + extraBranches * plan.extraBranchPrice;
    if (better && total >= Number(better.monthlyPrice))
      return {
        error: "ADDON_UPGRADE_BETTER",
        message: `${plan.name} + ${extraBranches} chi nhánh = ${vnd(total)}, bằng hoặc cao hơn gói ${better.name} (${vnd(Number(better.monthlyPrice))}). Hãy nâng lên ${better.name}.`,
        suggestedPlan: { id: better.id, code: better.code, name: better.name, monthlyPrice: Number(better.monthlyPrice), maxBranches: better.maxBranches },
        selectionTotal: total,
      };
  }
  return null;
}

export function maxSellableExtraBranches(plan: PricingPlan, catalog: PricingPlan[]) {
  let allowed = 0;
  for (let n = 1; plan.maxBranches + n <= MAX_TOTAL_BRANCHES; n++) {
    if (addonViolation(plan, { extraBranches: n, accountPacks: 0 }, catalog)) break;
    allowed = n;
  }
  return allowed;
}
