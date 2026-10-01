/**
 * Seed dữ liệu demo cho Smart FnB.
 * 2 tenant × 2 chi nhánh.
 * Gọi seedAll() một lần duy nhất khi khởi động app.
 */
import { db } from "./db";
import { createDefaultBranding } from "../theme";
import type {
  Plan,
  Tenant,
  Branding,
  RegistrationRequest,
  Branch,
  MenuItem,
  BranchMenuItem,
  DemoAccount,
} from "../types";
import type { StaffLegacy } from "./db";

// =====================================================================
// Plans
// =====================================================================
const PLANS: Plan[] = [
  { id: "plan-starter", name: "Starter", monthlyPrice: 900_000, maxBranches: 2, maxAccounts: 15 },
  { id: "plan-growth",  name: "Growth",  monthlyPrice: 2_700_000, maxBranches: 6, maxAccounts: 60 },
  { id: "plan-chain",   name: "Chain",   monthlyPrice: 8_100_000, maxBranches: 10, maxAccounts: 150 },
];

// =====================================================================
// Tenant 1 — Cơm Tấm Sài Gòn (cam ấm)
// =====================================================================
const T1 = "T-CT";  // tenantId
const T1_B1 = "BR-CT-Q1"; // Chi nhánh Quận 1
const T1_B2 = "BR-CT-Q7"; // Chi nhánh Quận 7

// Tenant 2 — Phở Bắc 1979 (xanh lá đậm)
const T2 = "T-PH";
const T2_B1 = "BR-PH-HBT"; // Hai Bà Trưng
const T2_B2 = "BR-PH-TD";  // Thủ Đức

const TENANTS: Tenant[] = [
  {
    id: T1,
    name: "Cơm Tấm Sài Gòn",
    planId: "plan-growth",
    status: "active",
    renewsAt: "2026-10-15",
    createdAt: "2025-03-01",
  },
  {
    id: T2,
    name: "Phở Bắc 1979",
    planId: "plan-chain",
    status: "active",
    renewsAt: "2026-09-28",
    createdAt: "2024-11-20",
  },
  // Thêm tenant cũ cho admin page
  { id: "T-1043", name: "Trà Sữa BoBa Lab",     planId: "plan-growth",  status: "active",    renewsAt: "2026-10-02", createdAt: "2025-01-10" },
  { id: "T-1060", name: "Bánh Mì Chảo Cô Ba",   planId: "plan-starter", status: "active",    renewsAt: "2026-09-14", createdAt: "2026-08-14" },
  { id: "T-1062", name: "Cà Phê Muối Đà Lạt",   planId: "plan-growth",  status: "suspended", renewsAt: "2026-08-30", createdAt: "2025-05-20" },
  { id: "T-1071", name: "Bún Bò O Xuân",         planId: "plan-starter", status: "active",    renewsAt: "2026-10-08", createdAt: "2026-07-01" },
];

// Mặc định MỌI tenant dùng đúng theme đơn sắc của nền tảng (isCustom: false).
// Owner tự đổi màu trong màn "Nhận diện thương hiệu" thì mới lệch khỏi mono (BR-28/29).
const BRANDINGS: Branding[] = [
  createDefaultBranding(T1, "Cơm Tấm Sài Gòn"),
  createDefaultBranding(T2, "Phở Bắc 1979"),
  createDefaultBranding("T-1043", "Trà Sữa BoBa Lab"),
  createDefaultBranding("T-1060", "Bánh Mì Chảo Cô Ba"),
  createDefaultBranding("T-1062", "Cà Phê Muối Đà Lạt"),
  createDefaultBranding("T-1071", "Bún Bò O Xuân"),
];

const REGISTRATION_REQUESTS: RegistrationRequest[] = [
  {
    id: "R-88", businessName: "Xôi Xéo Bà Tư", taxCode: "0312345671", address: "12 Nguyễn Trãi, Q.5, TP.HCM",
    contactEmail: "chi.nguyen@xoixeo.vn",  contactName: "Nguyễn Thị Chi", contactPhone: "0908123456",
    estimatedBranches: 3, submittedAt: "2026-09-17T12:00:00", status: "pending",
  },
  {
    id: "R-89", businessName: "Mì Cay Seoul", taxCode: "0312345672", address: "88 Lê Văn Sỹ, Q.3, TP.HCM",
    contactEmail: "owner@micayseoul.vn",   contactName: "Lê Mạnh Hùng", contactPhone: "0918234567",
    estimatedBranches: 4, submittedAt: "2026-09-17T09:12:00", status: "pending",
  },
  {
    id: "R-90", businessName: "Cháo Sườn Cô Hoa", taxCode: "0312345673", address: "45 Phan Xích Long, Q. Phú Nhuận, TP.HCM",
    contactEmail: "hoa@chaosuon.vn",       contactName: "Trần Thị Hoa", contactPhone: "0928345678",
    estimatedBranches: 2, submittedAt: "2026-09-16T14:30:00", status: "rejected",
    rejectReason: "Hồ sơ không hợp lệ — thiếu giấy phép kinh doanh.",
  },
];

// =====================================================================
// Branches
// =====================================================================
const BRANCHES: Branch[] = [
  // Cơm Tấm Sài Gòn
  {
    id: T1_B1, tenantId: T1, name: "Chi nhánh Quận 1",
    address: "24 Lê Lợi, P. Bến Nghé, Q.1, TP.HCM",
    phone: "028 3825 1234", openTime: "07:00", closeTime: "22:00", status: "open",
  },
  {
    id: T1_B2, tenantId: T1, name: "Chi nhánh Quận 7",
    address: "156 Nguyễn Thị Thập, P. Tân Phú, Q.7, TP.HCM",
    phone: "028 3771 5678", openTime: "07:00", closeTime: "22:00", status: "open",
  },
  // Phở Bắc 1979
  {
    id: T2_B1, tenantId: T2, name: "Chi nhánh Hai Bà Trưng",
    address: "15 Bà Triệu, P. Hàng Bài, Q. Hai Bà Trưng, Hà Nội",
    phone: "024 3943 2345", openTime: "06:00", closeTime: "22:00", status: "open",
  },
  {
    id: T2_B2, tenantId: T2, name: "Chi nhánh Thủ Đức",
    address: "01 Võ Văn Ngân, P. Bình Thọ, TP. Thủ Đức, TP.HCM",
    phone: "028 3896 7890", openTime: "06:30", closeTime: "21:30", status: "closed",
  },
];

// =====================================================================
// Menu — Cơm Tấm Sài Gòn (T1)
// =====================================================================
const MENU_T1: MenuItem[] = [
  { id: "M-01", tenantId: T1, name: "Cơm tấm sườn bì chả",  category: "Món chính",   price: 55_000, activeChain: true },
  { id: "M-02", tenantId: T1, name: "Cơm tấm sườn cây",     category: "Món chính",   price: 62_000, activeChain: true },
  { id: "M-03", tenantId: T1, name: "Chả trứng hấp",        category: "Món thêm",    price: 15_000, activeChain: true },
  { id: "M-04", tenantId: T1, name: "Canh khổ qua",         category: "Món thêm",    price: 20_000, activeChain: false },
  { id: "M-05", tenantId: T1, name: "Trà tắc",              category: "Đồ uống",     price: 18_000, activeChain: true },
  { id: "M-06", tenantId: T1, name: "Cà phê sữa đá",        category: "Đồ uống",     price: 25_000, activeChain: true },
  { id: "M-07", tenantId: T1, name: "Rau câu dừa",          category: "Tráng miệng", price: 12_000, activeChain: true },
];

// Menu — Phở Bắc 1979 (T2)
const MENU_T2: MenuItem[] = [
  { id: "P-01", tenantId: T2, name: "Phở bò tái chín",      category: "Món chính",   price: 65_000, activeChain: true },
  { id: "P-02", tenantId: T2, name: "Phở gà",               category: "Món chính",   price: 60_000, activeChain: true },
  { id: "P-03", tenantId: T2, name: "Bún bò Huế",           category: "Món chính",   price: 70_000, activeChain: true },
  { id: "P-04", tenantId: T2, name: "Giò heo hầm",          category: "Món thêm",    price: 30_000, activeChain: true },
  { id: "P-05", tenantId: T2, name: "Nước chanh tươi",      category: "Đồ uống",     price: 20_000, activeChain: true },
  { id: "P-06", tenantId: T2, name: "Trà đá",               category: "Đồ uống",     price: 5_000,  activeChain: true },
];

const MENU_ITEMS: MenuItem[] = [...MENU_T1, ...MENU_T2];

// =====================================================================
// BranchMenuItem — Trạng thái món tại từng chi nhánh
// =====================================================================
const BRANCH_MENU_ITEMS: BranchMenuItem[] = [
  // T1_B1 (Q1) — tất cả món, M-02 sắp hết suất
  { branchId: T1_B1, menuItemId: "M-01", isAvailable: true,  remainingToday: null, soldToday: 128 },
  { branchId: T1_B1, menuItemId: "M-02", isAvailable: true,  remainingToday: 2,    soldToday: 96  },
  { branchId: T1_B1, menuItemId: "M-03", isAvailable: true,  remainingToday: null, soldToday: 74  },
  { branchId: T1_B1, menuItemId: "M-04", isAvailable: true,  remainingToday: null, soldToday: 41  },
  { branchId: T1_B1, menuItemId: "M-05", isAvailable: true,  remainingToday: null, soldToday: 210 },
  { branchId: T1_B1, menuItemId: "M-06", isAvailable: true,  remainingToday: null, soldToday: 188 },
  { branchId: T1_B1, menuItemId: "M-07", isAvailable: true,  remainingToday: 20,   soldToday: 33  },
  // T1_B2 (Q7) — M-03 tắt
  { branchId: T1_B2, menuItemId: "M-01", isAvailable: true,  remainingToday: null, soldToday: 74  },
  { branchId: T1_B2, menuItemId: "M-02", isAvailable: true,  remainingToday: 8,    soldToday: 40  },
  { branchId: T1_B2, menuItemId: "M-03", isAvailable: false, remainingToday: 5,    soldToday: 22  },
  { branchId: T1_B2, menuItemId: "M-04", isAvailable: true,  remainingToday: null, soldToday: 12  },
  { branchId: T1_B2, menuItemId: "M-05", isAvailable: true,  remainingToday: null, soldToday: 120 },
  { branchId: T1_B2, menuItemId: "M-06", isAvailable: true,  remainingToday: null, soldToday: 95  },
  { branchId: T1_B2, menuItemId: "M-07", isAvailable: true,  remainingToday: null, soldToday: 18  },
  // T2_B1 (Hai Bà Trưng)
  { branchId: T2_B1, menuItemId: "P-01", isAvailable: true,  remainingToday: null, soldToday: 95  },
  { branchId: T2_B1, menuItemId: "P-02", isAvailable: true,  remainingToday: null, soldToday: 62  },
  { branchId: T2_B1, menuItemId: "P-03", isAvailable: true,  remainingToday: 10,   soldToday: 44  },
  { branchId: T2_B1, menuItemId: "P-04", isAvailable: true,  remainingToday: null, soldToday: 38  },
  { branchId: T2_B1, menuItemId: "P-05", isAvailable: true,  remainingToday: null, soldToday: 110 },
  { branchId: T2_B1, menuItemId: "P-06", isAvailable: true,  remainingToday: null, soldToday: 200 },
  // T2_B2 (Thủ Đức) — chi nhánh đóng, soldToday=0
  { branchId: T2_B2, menuItemId: "P-01", isAvailable: true,  remainingToday: null, soldToday: 0   },
  { branchId: T2_B2, menuItemId: "P-02", isAvailable: true,  remainingToday: null, soldToday: 0   },
  { branchId: T2_B2, menuItemId: "P-03", isAvailable: false, remainingToday: null, soldToday: 0   },
  { branchId: T2_B2, menuItemId: "P-04", isAvailable: true,  remainingToday: null, soldToday: 0   },
  { branchId: T2_B2, menuItemId: "P-05", isAvailable: true,  remainingToday: null, soldToday: 0   },
  { branchId: T2_B2, menuItemId: "P-06", isAvailable: true,  remainingToday: null, soldToday: 0   },
];

// =====================================================================
// Staff legacy (nhân sự chi nhánh — vai trò Waiter/Kitchen còn lại sẽ bỏ ở bước đổi RoleKey)
// =====================================================================
// id của Manager demo trùng id DemoAccount tương ứng (ACC-manager). Nhân viên còn lại
// chỉ có trong roster, không có tài khoản đăng nhập.
const STAFF_LEGACY: StaffLegacy[] = [
  { id: "ACC-manager", tenantId: T1, branchId: T1_B1, name: "Trần Minh Quân",  email: "manager@comtam.vn",    role: "Manager", active: true },
  { id: "E-02", tenantId: T1, branchId: T1_B1, name: "Lê Thị Hồng",    email: "hong.le@comtam.vn",    role: "Manager", active: true },
  { id: "ACC-kitchen", tenantId: T1, branchId: T1_B1, name: "Nguyễn Văn Tú",  email: "kitchen@comtam.vn",    role: "Kitchen", active: true },
  { id: "E-04", tenantId: T1, branchId: T1_B1, name: "Phạm Thu Hà",    email: "ha.pham@comtam.vn",    role: "Kitchen", active: true },
  { id: "ACC-waiter", tenantId: T1, branchId: T1_B1, name: "Võ Hoàng Nam",   email: "waiter@comtam.vn",     role: "Waiter",  active: true },
  { id: "E-06", tenantId: T1, branchId: T1_B1, name: "Đặng Mỹ Linh",  email: "linh.dang@comtam.vn",  role: "Waiter",  active: true },
  { id: "E-07", tenantId: T1, branchId: T1_B2, name: "Bùi Anh Khoa",  email: "khoa.bui@comtam.vn",   role: "Waiter",  active: true },
  { id: "E-08", tenantId: T1, branchId: T1_B2, name: "Ngô Gia Bảo",   email: "bao.ngo@comtam.vn",    role: "Manager", active: true },
];

// =====================================================================
// Demo accounts
// =====================================================================
const DEMO_ACCOUNTS: DemoAccount[] = [
  { id: "ACC-admin",   role: "admin",   name: "Platform Admin",   email: "admin@platform.vn",  password: "demo1234", mustChangePassword: false, active: true, label: "Platform Admin",   scope: "Nền tảng",                      tenantId: undefined, branchId: undefined },
  { id: "ACC-owner",   role: "owner",   name: "Nguyễn Chủ Chuỗi", email: "owner@comtam.vn",    password: "demo1234", mustChangePassword: false, active: true, label: "Owner",            scope: "Cơm Tấm Sài Gòn · Toàn chuỗi", tenantId: T1,        branchId: undefined },
  { id: "ACC-manager", role: "manager", name: "Trần Minh Quân",   email: "manager@comtam.vn",  password: "demo1234", mustChangePassword: false, active: true, label: "Branch Manager",   scope: "Cơm Tấm Sài Gòn · Quận 1",     tenantId: T1,        branchId: T1_B1 },
  { id: "ACC-waiter",  role: "waiter",  name: "Waiter Demo",       email: "waiter.demo@smartfnb.local",  password: "demo1234", mustChangePassword: false, active: true, label: "Waiter",        scope: "Backend demo branch", tenantId: T1, branchId: T1_B1 },
  { id: "ACC-kitchen", role: "kitchen", name: "Kitchen Demo",      email: "kitchen.demo@smartfnb.local", password: "demo1234", mustChangePassword: false, active: true, label: "Kitchen Staff", scope: "Backend demo branch", tenantId: T1, branchId: T1_B1 },
];

// =====================================================================
// Seed function
// =====================================================================
let _seeded = false;

export function seedAll() {
  if (_seeded) return;
  _seeded = true;

  db.plans               = PLANS;
  db.tenants             = TENANTS;
  db.brandings           = BRANDINGS;
  db.registrationRequests = REGISTRATION_REQUESTS;
  db.branches            = BRANCHES;
  db.menuItems           = MENU_ITEMS;
  db.branchMenuItems     = BRANCH_MENU_ITEMS;
  db.staffLegacy         = STAFF_LEGACY;
  db.demoAccounts        = DEMO_ACCOUNTS;
}

// Tenant constants export (dùng trong service/store)
export { T1, T1_B1, T1_B2, T2, T2_B1, T2_B2 };
