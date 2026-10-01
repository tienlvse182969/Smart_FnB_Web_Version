/**
 * Ánh xạ response thật của BE `/admin/*` sang kiểu của web — theo WHITELIST: chỉ lấy từng trường cần dùng, KHÔNG
 * spread response. Nhờ vậy dữ liệu ví (`wallet`, `balance`, `heldBalance`) mà BE còn trả kèm không bao giờ vào
 * state hay giao diện (BR-07). Tiền đi qua `parseAmount` (BE trả chuỗi thập phân).
 */
import { parseAmount } from "../../../lib/reportFormat";
import type {
  Business,
  BusinessOwner,
  BusinessSubscription,
  Paginated,
  Pagination,
  RegistrationApplication,
  RegistrationDetail,
  ServicePlan,
  SubscriptionState,
} from "../../../types";

// ---- Hình dạng response thô của BE (chỉ để gõ kiểu cho mapper và fixture test; có cả trường ví) ----

export interface RawPlan {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  monthlyPrice: string | number;
  maxBranches: number;
  maxAccounts: number;
  maxTables?: number;
  isActive: boolean;
}

interface RawWallet {
  id?: string;
  currency?: string;
  balance?: string | number;
  heldBalance?: string | number;
  status?: string;
}

export interface RawSubscription {
  status: "ACTIVE" | "SUSPENDED" | "EXPIRED";
  monthlyPrice: string | number;
  startsAt: string;
  expiresAt: string;
  suspendedAt?: string | null;
  plan: RawPlan;
  events?: unknown[];
}

export interface RawRegistration {
  id: string;
  applicationCode: string;
  businessName: string;
  taxCode?: string | null;
  representativeName: string;
  representativeEmail: string;
  representativePhone: string;
  headquartersAddress?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  requestedPlan?: RawPlan | null;
  reviewedBy?: { id: string; email: string } | null;
  ownerUser?: { id?: string; email: string } | null;
  approvedChain?: {
    id: string;
    code: string;
    name: string;
    status?: string;
    subscription?: RawSubscription | null;
    wallet?: RawWallet | null;
    branding?: unknown;
  } | null;
}

export interface RawBusiness {
  id: string;
  code: string;
  name: string;
  taxCode?: string | null;
  status?: string;
  createdAt: string;
  registrationApplication?: {
    representativeName?: string;
    representativeEmail?: string;
    representativePhone?: string;
  } | null;
  subscription?: RawSubscription | null;
  wallet?: RawWallet | null;
  ownerAssignments?: {
    owner: {
      id: string;
      ownerCode: string;
      firstName: string;
      lastName: string;
      user: { id?: string; email: string; phone?: string | null; status?: string };
    };
  }[];
  usage?: { branchCount?: number; accountCount?: number; tableCount?: number; monthlyOrderCount?: number };
}

export interface RawPage<T> {
  items: T[];
  pagination: Pagination;
}

// ---- Mapper ----

export function mapPlan(raw: RawPlan): ServicePlan {
  return {
    id: raw.id,
    code: raw.code,
    name: raw.name,
    description: raw.description ?? null,
    monthlyPrice: parseAmount(raw.monthlyPrice),
    maxBranches: raw.maxBranches,
    maxAccounts: raw.maxAccounts,
    isActive: raw.isActive,
  };
}

/**
 * Trạng thái thuê bao hiển thị. TODO(BE): BE không bao giờ ghi `EXPIRED` (không có code nào ghi), nên `ACTIVE`
 * mà đã quá `expiresAt` thì web tự coi là "Hết hạn" (đặc tả 5.2: hết hạn là trạng thái tính từ ngày hết hạn).
 */
export function deriveSubscriptionState(
  status: RawSubscription["status"],
  expiresAt: string,
  now: Date = new Date(),
): SubscriptionState {
  if (status === "SUSPENDED") return "suspended";
  if (status === "EXPIRED") return "expired";
  return new Date(expiresAt).getTime() < now.getTime() ? "expired" : "active";
}

export function mapSubscription(raw: RawSubscription, now?: Date): BusinessSubscription {
  return {
    state: deriveSubscriptionState(raw.status, raw.expiresAt, now),
    startsAt: raw.startsAt,
    expiresAt: raw.expiresAt,
    suspendedAt: raw.suspendedAt ?? null,
    plan: mapPlan(raw.plan),
    monthlyPrice: parseAmount(raw.monthlyPrice),
  };
}

export function mapRegistration(raw: RawRegistration): RegistrationApplication {
  return {
    id: raw.id,
    applicationCode: raw.applicationCode,
    businessName: raw.businessName,
    taxCode: raw.taxCode ?? null,
    representativeName: raw.representativeName,
    representativeEmail: raw.representativeEmail,
    representativePhone: raw.representativePhone,
    headquartersAddress: raw.headquartersAddress ?? null,
    status: raw.status,
    rejectionReason: raw.rejectionReason ?? null,
    createdAt: raw.createdAt,
    reviewedAt: raw.reviewedAt ?? null,
    reviewedByEmail: raw.reviewedBy?.email ?? null,
    requestedPlan: raw.requestedPlan ? mapPlan(raw.requestedPlan) : null,
  };
}

export function mapRegistrationDetail(raw: RawRegistration): RegistrationDetail {
  const chain = raw.approvedChain;
  return {
    ...mapRegistration(raw),
    approved: chain
      ? {
          chainId: chain.id,
          chainCode: chain.code,
          chainName: chain.name,
          planName: chain.subscription?.plan.name ?? null,
          expiresAt: chain.subscription?.expiresAt ?? null,
          ownerEmail: raw.ownerUser?.email ?? null,
        }
      : null,
  };
}

function mapOwner(raw: NonNullable<RawBusiness["ownerAssignments"]>[number]): BusinessOwner {
  const { owner } = raw;
  return {
    id: owner.id,
    ownerCode: owner.ownerCode,
    name: `${owner.firstName} ${owner.lastName}`.trim(),
    email: owner.user.email,
  };
}

export function mapBusiness(raw: RawBusiness, now?: Date): Business {
  return {
    id: raw.id,
    code: raw.code,
    name: raw.name,
    taxCode: raw.taxCode ?? null,
    createdAt: raw.createdAt,
    representativeName: raw.registrationApplication?.representativeName ?? null,
    representativeEmail: raw.registrationApplication?.representativeEmail ?? null,
    representativePhone: raw.registrationApplication?.representativePhone ?? null,
    subscription: raw.subscription ? mapSubscription(raw.subscription, now) : null,
    owners: (raw.ownerAssignments ?? []).map(mapOwner),
    usage: {
      branchCount: raw.usage?.branchCount ?? 0,
      accountCount: raw.usage?.accountCount ?? 0,
      monthlyOrderCount: raw.usage?.monthlyOrderCount ?? 0,
    },
  };
}

export function mapPage<R, T>(raw: RawPage<R>, map: (item: R) => T): Paginated<T> {
  return {
    items: raw.items.map(map),
    pagination: {
      page: raw.pagination.page,
      limit: raw.pagination.limit,
      total: raw.pagination.total,
      totalPages: raw.pagination.totalPages,
    },
  };
}
