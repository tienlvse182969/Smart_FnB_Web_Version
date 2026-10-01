/**
 * Bản mock của module admin — cùng shape (kể cả phân trang) và cùng quy tắc nghiệp vụ/lỗi với BE thật; KHÔNG có trường ví.
 * Số liệu gói chỉ là dữ liệu mock (ví dụ đặc tả 13.1); số thật do Admin cấu hình và BE trả về (CC-01).
 */
import type {
  Business,
  PageQuery,
  Paginated,
  RegistrationApplication,
  RegistrationDetail,
  ServicePlan,
} from "../../../types";
import { ApiError } from "../../http/errors";
import { mockDelay } from "../../mock/control";
import { genId, newId, nowISO } from "../../mock/util";
import { deriveSubscriptionState } from "./mapper";
import type { AdminApi } from "./index";

const DAY = 86_400_000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString();

function addMonths(from: Date, months: number): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

let plans: ServicePlan[] = [
  { id: "plan-basic", code: "BASIC", name: "Cơ bản", description: null, monthlyPrice: 300_000, maxBranches: 2, maxAccounts: 10, isActive: true },
  { id: "plan-standard", code: "STANDARD", name: "Tiêu chuẩn", description: null, monthlyPrice: 600_000, maxBranches: 5, maxAccounts: 30, isActive: true },
  { id: "plan-advanced", code: "ADVANCED", name: "Nâng cao", description: null, monthlyPrice: 1_200_000, maxBranches: 10, maxAccounts: 80, isActive: true },
  { id: "plan-legacy", code: "LEGACY", name: "Gói cũ (ngừng bán)", description: null, monthlyPrice: 150_000, maxBranches: 1, maxAccounts: 5, isActive: false },
];

const planById = (id: string): ServicePlan => {
  const plan = plans.find((p) => p.id === id);
  if (!plan) throw new ApiError(404, "Service plan not found");
  return plan;
};

interface SeedBusiness {
  id: string;
  name: string;
  rep: string;
  planId: string;
  expiresInDays: number;
  suspended?: boolean;
  usage: [number, number, number];
}

const SEEDS: SeedBusiness[] = [
  { id: "mock-biz-1", name: "Cà Phê Mộc Nhà", rep: "Nguyễn Chủ Chuỗi", planId: "plan-advanced", expiresInDays: 21, usage: [3, 14, 2310] },
  { id: "mock-biz-2", name: "Trà Sữa BoBa Lab", rep: "Lê Thị Chủ", planId: "plan-basic", expiresInDays: 35, usage: [2, 9, 1480] },
  { id: "mock-biz-3", name: "Trà Chanh Cô Ba", rep: "Trần Văn Ba", planId: "plan-standard", expiresInDays: 3, usage: [4, 18, 1920] },
  { id: "mock-biz-4", name: "Cà Phê Phố Cổ", rep: "Phạm Thị Lan", planId: "plan-basic", expiresInDays: 40, usage: [1, 4, 310] },
  { id: "mock-biz-5", name: "Cà Phê Muối Đà Lạt", rep: "Đỗ Minh Khoa", planId: "plan-standard", expiresInDays: 12, suspended: true, usage: [3, 12, 0] },
  { id: "mock-biz-6", name: "Nước Ép Tươi Mát", rep: "Vũ Thanh Hà", planId: "plan-basic", expiresInDays: -30, usage: [1, 3, 0] },
  { id: "mock-biz-7", name: "Sinh Tố Cô Hoa", rep: "Trần Thị Hoa", planId: "plan-advanced", expiresInDays: 120, usage: [8, 52, 6120] },
];

const slug = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");

function makeBusiness(seed: SeedBusiness, index: number): Business {
  const plan = planById(seed.planId);
  const email = `${slug(seed.rep)}@mock.local`;
  return {
    id: seed.id,
    code: `BIZ${String(index + 1).padStart(4, "0")}`,
    name: seed.name,
    taxCode: `03123456${70 + index}`,
    createdAt: iso(-200 + index * 17),
    representativeName: seed.rep,
    representativeEmail: email,
    representativePhone: `090812${3400 + index}`,
    subscription: {
      state: seed.suspended ? "suspended" : "active",
      startsAt: iso(-90),
      expiresAt: iso(seed.expiresInDays),
      suspendedAt: seed.suspended ? iso(-5) : null,
      plan,
      monthlyPrice: plan.monthlyPrice,
    },
    owners: [{ id: `mock-owner-${index + 1}`, ownerCode: `OWN${String(index + 1).padStart(4, "0")}`, name: seed.rep, email }],
    usage: { branchCount: seed.usage[0], accountCount: seed.usage[1], monthlyOrderCount: seed.usage[2] },
  };
}

let businesses: Business[] = SEEDS.map(makeBusiness);

interface StoredRegistration extends RegistrationDetail {
  /** Trường để tìm kiếm. */
}

const reg = (
  n: number,
  businessName: string,
  rep: string,
  status: RegistrationApplication["status"],
  extra: Partial<StoredRegistration> = {},
): StoredRegistration => ({
  id: `mock-app-${n}`,
  applicationCode: `APP-${String(1000 + n)}MOCK`,
  businessName,
  taxCode: `03123457${String(n).padStart(2, "0")}`,
  representativeName: rep,
  representativeEmail: `${slug(rep)}@mock.local`,
  representativePhone: `091823${4500 + n}`,
  headquartersAddress: `${10 + n} Nguyễn Trãi, Quận 5, TP. Hồ Chí Minh`,
  status,
  rejectionReason: null,
  createdAt: iso(-n),
  reviewedAt: null,
  reviewedByEmail: null,
  requestedPlan: plans[n % 3],
  approved: null,
  ...extra,
});

let registrations: StoredRegistration[] = [
  reg(1, "Trà Đạo Sài Gòn", "Nguyễn Thị Chi", "PENDING"),
  reg(2, "Cà Phê Rang Xay Hùng", "Lê Mạnh Hùng", "PENDING"),
  reg(3, "Sinh Tố Mùa Hè", "Hoàng Văn Nam", "PENDING"),
  reg(4, "Nước Mía Tươi", "Bùi Thị Mai", "PENDING", { taxCode: null }),
  reg(5, "Cà Phê Cóc", "Đặng Quốc Việt", "PENDING"),
  reg(6, "Trà Sữa Mây", "Võ Thanh Tâm", "PENDING"),
  reg(7, "Sinh Tố Cô Hoa Mới", "Trần Thị Hoa", "REJECTED", {
    rejectionReason: "Hồ sơ không hợp lệ — thiếu giấy phép kinh doanh.",
    reviewedAt: iso(-3),
    reviewedByEmail: "admin@mock.local",
  }),
  reg(8, "Quán Nước Bà Tám", "Ngô Thị Tám", "APPROVED", {
    reviewedAt: iso(-10),
    reviewedByEmail: "admin@mock.local",
    approved: {
      chainId: "mock-biz-4",
      chainCode: "BIZ0004",
      chainName: "Cà Phê Phố Cổ",
      planName: "Cơ bản",
      expiresAt: iso(40),
      ownerEmail: "ngo.thi.tam@mock.local",
    },
  }),
];

function paginate<T>(rows: T[], { page = 1, limit = 20 }: PageQuery): Paginated<T> {
  const size = Math.min(100, Math.max(1, limit));
  const start = (Math.max(1, page) - 1) * size;
  return {
    items: rows.slice(start, start + size),
    pagination: { page: Math.max(1, page), limit: size, total: rows.length, totalPages: Math.ceil(rows.length / size) },
  };
}

const matches = (needle: string | undefined, ...fields: (string | null | undefined)[]) => {
  const q = needle?.trim().toLowerCase();
  return !q || fields.some((f) => f?.toLowerCase().includes(q));
};

/** Doanh nghiệp như BE trả: trạng thái hết hạn được tính từ ngày hết hạn, không lưu. */
const view = (b: Business): Business => ({
  ...b,
  subscription: b.subscription
    ? {
        ...b.subscription,
        state: deriveSubscriptionState(
          b.subscription.state === "suspended" ? "SUSPENDED" : "ACTIVE",
          b.subscription.expiresAt,
        ),
      }
    : null,
});

const findBusiness = (id: string): Business => {
  const found = businesses.find((b) => b.id === id);
  if (!found) throw new ApiError(404, "Business not found");
  return found;
};

const findRegistration = (id: string): StoredRegistration => {
  const found = registrations.find((r) => r.id === id);
  if (!found) throw new ApiError(404, "Registration application not found");
  return found;
};

export const adminMock: AdminApi = {
  async listRegistrations({ status, ...page } = {}) {
    await mockDelay();
    const rows = registrations
      .filter((r) => !status || r.status === status)
      .filter((r) => matches(page.search, r.applicationCode, r.businessName, r.representativeName, r.representativeEmail, r.taxCode))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return paginate(rows.map(({ approved: _a, ...r }) => r as RegistrationApplication), page);
  },

  async getRegistration(id) {
    await mockDelay();
    return { ...findRegistration(id) };
  },

  async approveRegistration(id, { planId, subscriptionMonths }) {
    await mockDelay();
    const app = findRegistration(id);
    if (app.status !== "PENDING") throw new ApiError(409, "Only a pending application can be approved");
    if (subscriptionMonths < 1 || subscriptionMonths > 60) throw new ApiError(400, "subscriptionMonths must be between 1 and 60");
    const plan = planId ? planById(planId) : app.requestedPlan;
    if (!plan) throw new ApiError(400, "Chọn gói dịch vụ");
    if (!plan.isActive) throw new ApiError(404, "Service plan not found");
    if (businesses.some((b) => b.owners.some((o) => o.email === app.representativeEmail))) {
      throw new ApiError(409, "Representative email already belongs to an account");
    }

    const expiresAt = addMonths(new Date(), subscriptionMonths).toISOString();
    const business: Business = {
      id: genId("mock-biz"),
      code: `BIZ${String(businesses.length + 1).padStart(4, "0")}`,
      name: app.businessName,
      taxCode: app.taxCode,
      createdAt: nowISO(),
      representativeName: app.representativeName,
      representativeEmail: app.representativeEmail,
      representativePhone: app.representativePhone,
      subscription: { state: "active", startsAt: nowISO(), expiresAt, suspendedAt: null, plan, monthlyPrice: plan.monthlyPrice },
      owners: [{ id: genId("mock-owner"), ownerCode: `OWN${newId().toUpperCase()}`, name: app.representativeName, email: app.representativeEmail }],
      usage: { branchCount: 0, accountCount: 1, monthlyOrderCount: 0 },
    };
    businesses = [business, ...businesses];
    app.status = "APPROVED";
    app.reviewedAt = nowISO();
    app.reviewedByEmail = "admin@mock.local";
    app.approved = {
      chainId: business.id,
      chainCode: business.code,
      chainName: business.name,
      planName: plan.name,
      expiresAt,
      ownerEmail: app.representativeEmail,
    };
    // Giả lập xếp email đặt mật khẩu — BE chỉ xếp vào emailOutbox.
    console.info(`[mock] Xếp email đặt mật khẩu Owner tới ${app.representativeEmail}`);
    return { ...app };
  },

  async rejectRegistration(id, reason) {
    await mockDelay();
    if (!reason.trim()) throw new ApiError(400, "reason should not be empty");
    const app = findRegistration(id);
    if (app.status !== "PENDING") throw new ApiError(409, "Only a pending application can be rejected");
    app.status = "REJECTED";
    app.rejectionReason = reason.trim();
    app.reviewedAt = nowISO();
    app.reviewedByEmail = "admin@mock.local";
    return { ...app };
  },

  async submitRegistration(input) {
    await mockDelay();
    const n = registrations.length + 1;
    const app = reg(n, input.businessName, input.representativeName, "PENDING", {
      taxCode: input.taxCode ?? null,
      representativeEmail: input.representativeEmail,
      representativePhone: input.representativePhone,
      headquartersAddress: input.headquartersAddress ?? null,
      requestedPlan: input.requestedPlanId ? planById(input.requestedPlanId) : null,
      createdAt: nowISO(),
    });
    registrations = [app, ...registrations];
    const { approved: _a, ...plain } = app;
    return plain;
  },

  async listBusinesses(page = {}) {
    await mockDelay();
    const rows = businesses
      .filter((b) => matches(page.search, b.code, b.name, b.taxCode, b.representativeName))
      .map(view);
    return paginate(rows, page);
  },

  async getBusiness(id) {
    await mockDelay();
    return view(findBusiness(id));
  },

  async renewBusiness(id, { months }) {
    await mockDelay();
    const b = findBusiness(id);
    if (!b.subscription) throw new ApiError(404, "Subscription not found");
    if (months < 1 || months > 60) throw new ApiError(400, "months must be between 1 and 60");
    const current = new Date(b.subscription.expiresAt);
    b.subscription.expiresAt = addMonths(current > new Date() ? current : new Date(), months).toISOString();
    return view(b);
  },

  async changeBusinessPlan(id, { planId, direction }) {
    await mockDelay();
    const b = findBusiness(id);
    const sub = b.subscription;
    if (!sub) throw new ApiError(404, "Subscription not found");
    const target = planById(planId);
    if (!target.isActive) throw new ApiError(404, "Service plan not found");
    if (sub.plan.id === target.id) throw new ApiError(400, "Business already uses this service plan");
    if (direction === "UPGRADE" && target.monthlyPrice < sub.monthlyPrice) {
      throw new ApiError(400, "Target plan price is lower; use DOWNGRADE");
    }
    if (direction === "DOWNGRADE") {
      if (target.monthlyPrice > sub.monthlyPrice) throw new ApiError(400, "Target plan price is higher; use UPGRADE");
      // BE chặn hạ gói khi đang vượt hạn mức gói mới (lệch BR-11: hạ gói chỉ chặn tạo mới).
      if (b.usage.branchCount > target.maxBranches || b.usage.accountCount > target.maxAccounts) {
        throw new ApiError(409, "Current usage exceeds one or more limits of the target plan");
      }
    }
    sub.plan = target;
    sub.monthlyPrice = target.monthlyPrice;
    return view(b);
  },

  async suspendBusiness(id, _reason) {
    await mockDelay();
    const b = findBusiness(id);
    if (!b.subscription) throw new ApiError(404, "Subscription not found");
    if (b.subscription.state === "suspended") throw new ApiError(409, "Business is already suspended");
    b.subscription.state = "suspended";
    b.subscription.suspendedAt = nowISO();
    return view(b);
  },

  async reactivateBusiness(id, _reason) {
    await mockDelay();
    const b = findBusiness(id);
    if (!b.subscription) throw new ApiError(404, "Subscription not found");
    if (b.subscription.state !== "suspended") throw new ApiError(409, "Business is not suspended");
    if (new Date(b.subscription.expiresAt) <= new Date()) {
      throw new ApiError(409, "Renew the expired subscription before reactivation");
    }
    b.subscription.state = "active";
    b.subscription.suspendedAt = null;
    return view(b);
  },

  async resetOwnerPassword(ownerId) {
    await mockDelay();
    if (!businesses.some((b) => b.owners.some((o) => o.id === ownerId))) throw new ApiError(404, "Owner account not found");
    return { ownerId, expiresAt: new Date(Date.now() + DAY).toISOString() };
  },

  async listPlans() {
    await mockDelay();
    return plans.map((p) => ({ ...p }));
  },

  async createPlan(input) {
    await mockDelay();
    if (plans.some((p) => p.code === input.code)) throw new ApiError(409, "Service plan code already exists");
    const plan: ServicePlan = { id: genId("plan"), description: input.description ?? null, isActive: input.isActive ?? true, ...input };
    plans = [...plans, plan];
    return { ...plan };
  },

  async updatePlan(id, input) {
    await mockDelay();
    const idx = plans.findIndex((p) => p.id === id);
    if (idx === -1) throw new ApiError(404, "Service plan not found");
    plans[idx] = { ...plans[idx], ...input, description: input.description ?? plans[idx].description };
    return { ...plans[idx] };
  },
};
