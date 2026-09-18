/**
 * Seed dữ liệu demo cho Smart FnB.
 * 2 tenant × 2 chi nhánh × 12 bàn/chi nhánh.
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
  FloorTable,
  MenuItem,
  BranchMenuItem,
  TableSession,
  Order,
  OrderLine,
  Payment,
  LedgerEntry,
  ShiftTemplate,
  ShiftAssignment,
  WorkSession,
  DemoAccount,
} from "../types";
import type { StaffLegacy, AuditEntryLegacy } from "./db";

// =====================================================================
// Plans
// =====================================================================
const PLANS: Plan[] = [
  { id: "plan-starter", name: "Starter", monthlyPrice: 900_000, maxBranches: 2, maxAccounts: 15, maxTables: 20 },
  { id: "plan-growth",  name: "Growth",  monthlyPrice: 2_700_000, maxBranches: 6, maxAccounts: 60, maxTables: 80 },
  { id: "plan-chain",   name: "Chain",   monthlyPrice: 8_100_000, maxBranches: 10, maxAccounts: 150, maxTables: 200 },
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
// Floor Tables — 12 bàn / chi nhánh với khu vực và cặp liền kề
// =====================================================================
function makeTables(branchId: string): FloorTable[] {
  return [
    // Khu Trong nhà: cụm A (A1–A2–A3), cụm B (B1–B2–B3), B4 đứng riêng
    { id: `${branchId}-A1`, branchId, area: "Trong nhà", seats: 4, status: "available", currentSessionId: null, adjacentTableIds: [`${branchId}-A2`] },
    { id: `${branchId}-A2`, branchId, area: "Trong nhà", seats: 4, status: "available", currentSessionId: null, adjacentTableIds: [`${branchId}-A1`, `${branchId}-A3`] },
    { id: `${branchId}-A3`, branchId, area: "Trong nhà", seats: 2, status: "available", currentSessionId: null, adjacentTableIds: [`${branchId}-A2`] },
    { id: `${branchId}-B1`, branchId, area: "Trong nhà", seats: 4, status: "available", currentSessionId: null, adjacentTableIds: [`${branchId}-B2`] },
    { id: `${branchId}-B2`, branchId, area: "Trong nhà", seats: 4, status: "available", currentSessionId: null, adjacentTableIds: [`${branchId}-B1`, `${branchId}-B3`] },
    { id: `${branchId}-B3`, branchId, area: "Trong nhà", seats: 2, status: "available", currentSessionId: null, adjacentTableIds: [`${branchId}-B2`] },
    { id: `${branchId}-B4`, branchId, area: "Trong nhà", seats: 6, status: "available", currentSessionId: null, adjacentTableIds: [] },
    // Khu Sân vườn: cụm C (C1–C2), cụm D (D1–D2), D3 đứng riêng
    { id: `${branchId}-C1`, branchId, area: "Sân vườn", seats: 4, status: "available", currentSessionId: null, adjacentTableIds: [`${branchId}-C2`] },
    { id: `${branchId}-C2`, branchId, area: "Sân vườn", seats: 4, status: "available", currentSessionId: null, adjacentTableIds: [`${branchId}-C1`] },
    { id: `${branchId}-D1`, branchId, area: "Sân vườn", seats: 6, status: "available", currentSessionId: null, adjacentTableIds: [`${branchId}-D2`] },
    { id: `${branchId}-D2`, branchId, area: "Sân vườn", seats: 6, status: "available", currentSessionId: null, adjacentTableIds: [`${branchId}-D1`] },
    { id: `${branchId}-D3`, branchId, area: "Sân vườn", seats: 2, status: "reserved",  currentSessionId: null, adjacentTableIds: [] },
  ];
}

const FLOOR_TABLES: FloorTable[] = [
  ...makeTables(T1_B1),
  ...makeTables(T1_B2),
  ...makeTables(T2_B1),
  ...makeTables(T2_B2),
];

// Alias ngắn để seed session (dùng id cũ format ngắn cho T1_B1)
const t = (s: string) => `${T1_B1}-${s}`; // e.g. t("A1") = "BR-CT-Q1-A1"

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
// TableSessions + Orders + OrderLines (T1_B1 — demo chính)
// =====================================================================
const TABLE_SESSIONS: TableSession[] = [
  // Đang mở
  { id: "S-4471", tenantId: T1, branchId: T1_B1, tableIds: [t("B4")], guests: 5, openedBy: "Võ Hoàng Nam",   openedAt: "12:35", status: "open" },
  { id: "S-4472", tenantId: T1, branchId: T1_B1, tableIds: [t("C2")], guests: 3, openedBy: "Bùi Anh Khoa",   openedAt: "12:41", status: "open" },
  // Bàn ghép B2+B3
  { id: "S-4473", tenantId: T1, branchId: T1_B1, tableIds: [t("B2"), t("B3")], guests: 7, openedBy: "Đặng Mỹ Linh", openedAt: "12:30", status: "open" },
  // Đã trả tiền nhưng chưa đóng bàn
  { id: "S-4470", tenantId: T1, branchId: T1_B1, tableIds: [t("A1")], guests: 3, openedBy: "Đặng Mỹ Linh",   openedAt: "12:05", status: "paid",
    paymentMethod: "cash", collectedBy: "Đặng Mỹ Linh", confirmedBy: "Trần Minh Quân", paidAt: "12:42" },
  // Đã đóng bàn — doanh thu trong ngày (T1_B1)
  { id: "S-P101", tenantId: T1, branchId: T1_B1, tableIds: [t("A2")], guests: 4, openedBy: "Võ Hoàng Nam",   openedAt: "10:15", status: "closed",
    paymentMethod: "qr",   confirmedBy: "Trần Minh Quân", paidAt: "10:48" },
  { id: "S-P102", tenantId: T1, branchId: T1_B1, tableIds: [t("B1")], guests: 6, openedBy: "Đặng Mỹ Linh",  openedAt: "10:40", status: "closed",
    paymentMethod: "cash", collectedBy: "Đặng Mỹ Linh",  confirmedBy: "Lê Thị Hồng",   paidAt: "11:22" },
  { id: "S-P103", tenantId: T1, branchId: T1_B1, tableIds: [t("C1"), t("C2")], guests: 8, openedBy: "Võ Hoàng Nam", openedAt: "11:00", status: "closed",
    paymentMethod: "qr",   confirmedBy: "Lê Thị Hồng", paidAt: "11:58" },
  { id: "S-P104", tenantId: T1, branchId: T1_B1, tableIds: [t("B3")], guests: 6, openedBy: "Đặng Mỹ Linh",  openedAt: "11:20", status: "closed",
    paymentMethod: "qr",   confirmedBy: "Trần Minh Quân", paidAt: "12:12" },
  { id: "S-P105", tenantId: T1, branchId: T1_B1, tableIds: [t("A3")], guests: 3, openedBy: "Võ Hoàng Nam",   openedAt: "11:45", status: "closed",
    paymentMethod: "cash", collectedBy: "Võ Hoàng Nam", confirmedBy: "Trần Minh Quân", paidAt: "12:28" },
  // T1_B2 — đã đóng
  { id: "S-P201", tenantId: T1, branchId: T1_B2, tableIds: [`${T1_B2}-A1`], guests: 4, openedBy: "Bùi Anh Khoa", openedAt: "10:30", status: "closed",
    paymentMethod: "qr",   confirmedBy: "Ngô Gia Bảo", paidAt: "11:05" },
  { id: "S-P202", tenantId: T1, branchId: T1_B2, tableIds: [`${T1_B2}-A2`], guests: 5, openedBy: "Bùi Anh Khoa", openedAt: "11:05", status: "closed",
    paymentMethod: "cash", collectedBy: "Bùi Anh Khoa", confirmedBy: "Ngô Gia Bảo", paidAt: "11:52" },
  { id: "S-P203", tenantId: T1, branchId: T1_B2, tableIds: [`${T1_B2}-B1`], guests: 3, openedBy: "Bùi Anh Khoa", openedAt: "11:30", status: "closed",
    paymentMethod: "qr",   confirmedBy: "Ngô Gia Bảo", paidAt: "12:02" },
  { id: "S-P204", tenantId: T1, branchId: T1_B2, tableIds: [`${T1_B2}-B2`], guests: 2, openedBy: "Bùi Anh Khoa", openedAt: "12:00", status: "closed",
    paymentMethod: "qr",   confirmedBy: "Ngô Gia Bảo", paidAt: "12:32" },
];

const ORDERS: Order[] = [
  { id: "O-1",    tenantId: T1, sessionId: "S-4471", createdBy: "Võ Hoàng Nam",   createdAt: "12:36" },
  { id: "O-2",    tenantId: T1, sessionId: "S-4471", createdBy: "Võ Hoàng Nam",   createdAt: "12:44" },
  { id: "O-3",    tenantId: T1, sessionId: "S-4472", createdBy: "Bùi Anh Khoa",   createdAt: "12:41" },
  { id: "O-4",    tenantId: T1, sessionId: "S-4470", createdBy: "Đặng Mỹ Linh",   createdAt: "12:06" },
  { id: "O-5",    tenantId: T1, sessionId: "S-4473", createdBy: "Đặng Mỹ Linh",   createdAt: "12:31" },
  { id: "O-P101", tenantId: T1, sessionId: "S-P101", createdBy: "Võ Hoàng Nam",   createdAt: "10:16" },
  { id: "O-P102", tenantId: T1, sessionId: "S-P102", createdBy: "Đặng Mỹ Linh",  createdAt: "10:41" },
  { id: "O-P103", tenantId: T1, sessionId: "S-P103", createdBy: "Võ Hoàng Nam",   createdAt: "11:01" },
  { id: "O-P104", tenantId: T1, sessionId: "S-P104", createdBy: "Đặng Mỹ Linh",  createdAt: "11:21" },
  { id: "O-P105", tenantId: T1, sessionId: "S-P105", createdBy: "Võ Hoàng Nam",   createdAt: "11:46" },
  { id: "O-P201", tenantId: T1, sessionId: "S-P201", createdBy: "Bùi Anh Khoa",  createdAt: "10:31" },
  { id: "O-P202", tenantId: T1, sessionId: "S-P202", createdBy: "Bùi Anh Khoa",  createdAt: "11:06" },
  { id: "O-P203", tenantId: T1, sessionId: "S-P203", createdBy: "Bùi Anh Khoa",  createdAt: "11:31" },
  { id: "O-P204", tenantId: T1, sessionId: "S-P204", createdBy: "Bùi Anh Khoa",  createdAt: "12:01" },
];

const ORDER_LINES: OrderLine[] = [
  // O-1 · bàn B4
  { id: "OL-1",  orderId: "O-1", menuItemId: "M-02", name: "Cơm tấm sườn cây",     unitPrice: 62_000, qty: 2, note: "Ít mỡ hành", status: "cooking",  startedAt: "12:40" },
  { id: "OL-2",  orderId: "O-1", menuItemId: "M-03", name: "Chả trứng hấp",        unitPrice: 15_000, qty: 2, status: "queued" },
  { id: "OL-3",  orderId: "O-1", menuItemId: "M-05", name: "Trà tắc",              unitPrice: 18_000, qty: 2, status: "served",   claimedBy: "Võ Hoàng Nam", startedAt: "12:36", doneAt: "12:38" },
  // O-2 · bàn B4 (gọi thêm)
  { id: "OL-4",  orderId: "O-2", menuItemId: "M-07", name: "Rau câu dừa",          unitPrice: 12_000, qty: 2, status: "done",     startedAt: "12:44", doneAt: "12:46" },
  // O-3 · bàn C2
  { id: "OL-5",  orderId: "O-3", menuItemId: "M-01", name: "Cơm tấm sườn bì chả", unitPrice: 55_000, qty: 1, note: "Không cay",  status: "cooking",  startedAt: "12:43" },
  { id: "OL-6",  orderId: "O-3", menuItemId: "M-01", name: "Cơm tấm sườn bì chả", unitPrice: 55_000, qty: 1, status: "queued" },
  { id: "OL-7",  orderId: "O-3", menuItemId: "M-06", name: "Cà phê sữa đá",        unitPrice: 25_000, qty: 2, status: "done",     startedAt: "12:42", doneAt: "12:43" },
  { id: "OL-8",  orderId: "O-3", menuItemId: "M-05", name: "Trà tắc",              unitPrice: 18_000, qty: 1, status: "served",   claimedBy: "Bùi Anh Khoa", startedAt: "12:41", doneAt: "12:42" },
  // O-4 · bàn A1 (phiên đã thanh toán)
  { id: "OL-9",  orderId: "O-4", menuItemId: "M-01", name: "Cơm tấm sườn bì chả", unitPrice: 55_000, qty: 2, status: "served",   claimedBy: "Đặng Mỹ Linh" },
  { id: "OL-10", orderId: "O-4", menuItemId: "M-05", name: "Trà tắc",              unitPrice: 18_000, qty: 2, status: "served",   claimedBy: "Đặng Mỹ Linh" },
  // O-5 · bàn ghép B2+B3
  { id: "OL-11", orderId: "O-5", menuItemId: "M-01", name: "Cơm tấm sườn bì chả", unitPrice: 55_000, qty: 4, note: "1 phần không mỡ hành", status: "cooking", startedAt: "12:33" },
  { id: "OL-12", orderId: "O-5", menuItemId: "M-05", name: "Trà tắc",              unitPrice: 18_000, qty: 4, status: "queued" },
  { id: "OL-13", orderId: "O-5", menuItemId: "M-06", name: "Cà phê sữa đá",        unitPrice: 25_000, qty: 3, status: "done",     startedAt: "12:41", doneAt: "12:45" },
  // Phiên đóng T1_B1
  { id: "OL-P101-1", orderId: "O-P101", menuItemId: "M-01", name: "Cơm tấm sườn bì chả", unitPrice: 55_000, qty: 3, status: "served" },
  { id: "OL-P101-2", orderId: "O-P101", menuItemId: "M-06", name: "Cà phê sữa đá",        unitPrice: 25_000, qty: 3, status: "served" },
  { id: "OL-P101-3", orderId: "O-P101", menuItemId: "M-05", name: "Trà tắc",              unitPrice: 18_000, qty: 1, status: "served" },
  { id: "OL-P102-1", orderId: "O-P102", menuItemId: "M-01", name: "Cơm tấm sườn bì chả", unitPrice: 55_000, qty: 4, status: "served" },
  { id: "OL-P102-2", orderId: "O-P102", menuItemId: "M-02", name: "Cơm tấm sườn cây",     unitPrice: 62_000, qty: 2, status: "served" },
  { id: "OL-P102-3", orderId: "O-P102", menuItemId: "M-05", name: "Trà tắc",              unitPrice: 18_000, qty: 4, status: "served" },
  { id: "OL-P102-4", orderId: "O-P102", menuItemId: "M-07", name: "Rau câu dừa",          unitPrice: 12_000, qty: 2, status: "served" },
  { id: "OL-P103-1", orderId: "O-P103", menuItemId: "M-01", name: "Cơm tấm sườn bì chả", unitPrice: 55_000, qty: 6, status: "served" },
  { id: "OL-P103-2", orderId: "O-P103", menuItemId: "M-02", name: "Cơm tấm sườn cây",     unitPrice: 62_000, qty: 2, status: "served" },
  { id: "OL-P103-3", orderId: "O-P103", menuItemId: "M-05", name: "Trà tắc",              unitPrice: 18_000, qty: 6, status: "served" },
  { id: "OL-P103-4", orderId: "O-P103", menuItemId: "M-06", name: "Cà phê sữa đá",        unitPrice: 25_000, qty: 2, status: "served" },
  { id: "OL-P104-1", orderId: "O-P104", menuItemId: "M-01", name: "Cơm tấm sườn bì chả", unitPrice: 55_000, qty: 5, status: "served" },
  { id: "OL-P104-2", orderId: "O-P104", menuItemId: "M-02", name: "Cơm tấm sườn cây",     unitPrice: 62_000, qty: 1, status: "served" },
  { id: "OL-P104-3", orderId: "O-P104", menuItemId: "M-05", name: "Trà tắc",              unitPrice: 18_000, qty: 5, status: "served" },
  { id: "OL-P104-4", orderId: "O-P104", menuItemId: "M-03", name: "Chả trứng hấp",        unitPrice: 15_000, qty: 1, status: "served" },
  { id: "OL-P105-1", orderId: "O-P105", menuItemId: "M-01", name: "Cơm tấm sườn bì chả", unitPrice: 55_000, qty: 3, status: "served" },
  { id: "OL-P105-2", orderId: "O-P105", menuItemId: "M-06", name: "Cà phê sữa đá",        unitPrice: 25_000, qty: 3, status: "served" },
  // Phiên đóng T1_B2
  { id: "OL-P201-1", orderId: "O-P201", menuItemId: "M-01", name: "Cơm tấm sườn bì chả", unitPrice: 55_000, qty: 3, status: "served" },
  { id: "OL-P201-2", orderId: "O-P201", menuItemId: "M-02", name: "Cơm tấm sườn cây",     unitPrice: 62_000, qty: 1, status: "served" },
  { id: "OL-P201-3", orderId: "O-P201", menuItemId: "M-05", name: "Trà tắc",              unitPrice: 18_000, qty: 3, status: "served" },
  { id: "OL-P202-1", orderId: "O-P202", menuItemId: "M-01", name: "Cơm tấm sườn bì chả", unitPrice: 55_000, qty: 4, status: "served" },
  { id: "OL-P202-2", orderId: "O-P202", menuItemId: "M-02", name: "Cơm tấm sườn cây",     unitPrice: 62_000, qty: 1, status: "served" },
  { id: "OL-P202-3", orderId: "O-P202", menuItemId: "M-05", name: "Trà tắc",              unitPrice: 18_000, qty: 4, status: "served" },
  { id: "OL-P203-1", orderId: "O-P203", menuItemId: "M-01", name: "Cơm tấm sườn bì chả", unitPrice: 55_000, qty: 2, status: "served" },
  { id: "OL-P203-2", orderId: "O-P203", menuItemId: "M-05", name: "Trà tắc",              unitPrice: 18_000, qty: 1, status: "served" },
  { id: "OL-P203-3", orderId: "O-P203", menuItemId: "M-06", name: "Cà phê sữa đá",        unitPrice: 25_000, qty: 1, status: "served" },
  { id: "OL-P204-1", orderId: "O-P204", menuItemId: "M-01", name: "Cơm tấm sườn bì chả", unitPrice: 55_000, qty: 2, status: "served" },
  { id: "OL-P204-2", orderId: "O-P204", menuItemId: "M-05", name: "Trà tắc",              unitPrice: 18_000, qty: 2, status: "served" },
];

// =====================================================================
// Payments (cho các phiên đã đóng)
// =====================================================================
const PAYMENTS: Payment[] = [
  { id: "PAY-9081", tenantId: T1, branchId: T1_B1, sessionId: "S-P101", invoiceCode: "INV-20260917-001", amount: 258_000, method: "qr",   status: "confirmed", confirmedBy: "Trần Minh Quân", createdAt: "10:48", updatedAt: "10:48" },
  { id: "PAY-9082", tenantId: T1, branchId: T1_B1, sessionId: "S-P102", invoiceCode: "INV-20260917-002", amount: 440_000, method: "cash", status: "confirmed", collectedBy: "Đặng Mỹ Linh", confirmedBy: "Lê Thị Hồng", createdAt: "11:22", updatedAt: "11:22" },
  { id: "PAY-9083", tenantId: T1, branchId: T1_B1, sessionId: "S-P103", invoiceCode: "INV-20260917-003", amount: 612_000, method: "qr",   status: "confirmed", confirmedBy: "Lê Thị Hồng", createdAt: "11:58", updatedAt: "11:58" },
  { id: "PAY-9084", tenantId: T1, branchId: T1_B1, sessionId: "S-P104", invoiceCode: "INV-20260917-004", amount: 442_000, method: "qr",   status: "confirmed", confirmedBy: "Trần Minh Quân", createdAt: "12:12", updatedAt: "12:12" },
  { id: "PAY-9085", tenantId: T1, branchId: T1_B1, sessionId: "S-P105", invoiceCode: "INV-20260917-005", amount: 240_000, method: "cash", status: "confirmed", collectedBy: "Võ Hoàng Nam", confirmedBy: "Trần Minh Quân", createdAt: "12:28", updatedAt: "12:28" },
  // Phiên paid đang chờ đóng bàn (A1)
  { id: "PAY-9086", tenantId: T1, branchId: T1_B1, sessionId: "S-4470", invoiceCode: "INV-20260917-006", amount: 146_000, method: "cash", status: "cash_received", collectedBy: "Đặng Mỹ Linh", createdAt: "12:42", updatedAt: "12:42" },
];

// =====================================================================
// Ledger Entries (ví Cơm Tấm Sài Gòn)
// =====================================================================
function holdEntry(id: string, refId: string, amount: number, at: string): LedgerEntry {
  return { id, tenantId: T1, type: "hold", amount, refId, createdAt: at };
}
/**
 * `settle` ghi đúng số tiền QR đã thu (không trừ phí); `fee` là bút toán
 * riêng, dương, trừ ra khỏi số dư khả dụng trong công thức của
 * `wallet.service.ts#getWalletBalance` — không trừ hai lần.
 */
function settleEntry(id: string, refId: string, grossAmount: number, fee: number, at: string): LedgerEntry[] {
  return [
    { id: `${id}-settle`, tenantId: T1, type: "settle", amount: grossAmount, refId, createdAt: at },
    { id: `${id}-fee`,    tenantId: T1, type: "fee",    amount: fee,         refId, note: `Phí dịch vụ thanh toán 2.5%`, createdAt: at },
  ];
}

const LEDGER_ENTRIES: LedgerEntry[] = [
  // Mốc cố định trong quá khứ xa (không phải "10:48" — Date không parse được
  // giờ ngắn) để job quyết toán luôn thấy các khoản này đã đủ holdHours,
  // bấm "Chạy quyết toán" ở màn Admin ra kết quả ngay, không cần chờ thật.
  holdEntry("LE-001", "PAY-9081", 258_000, "2024-01-01T10:48:00.000Z"),
  holdEntry("LE-002", "PAY-9082", 440_000, "2024-01-01T11:22:00.000Z"),
  holdEntry("LE-003", "PAY-9083", 612_000, "2024-01-01T11:58:00.000Z"),
  holdEntry("LE-004", "PAY-9084", 442_000, "2024-01-01T12:12:00.000Z"),
  holdEntry("LE-005", "PAY-9085", 240_000, "2024-01-01T12:28:00.000Z"),
  // Settle ngày hôm qua (demo)
  ...settleEntry("LE-010", "PAY-8800", 1_500_000, 37_500, "2026-09-16T09:00:00"),
  ...settleEntry("LE-020", "PAY-8801", 2_200_000, 55_000, "2026-09-16T09:00:00"),
];

// =====================================================================
// Staff legacy (dùng cho các màn manager/owner cũ)
// =====================================================================
// LƯU Ý: id của Manager/Kitchen/Waiter demo (E-01/E-03/E-05) trùng với id
// DemoAccount tương ứng (ACC-manager/ACC-kitchen/ACC-waiter) — bắt buộc phải
// khớp vì WorkSession/ShiftAssignment gắn vào `staffId`, và màn hình chặn
// "chưa vào ca" so `staffId` với `currentUser.id` (BR-43). Nhân viên còn lại
// (E-02, E-04, E-06→E-08) chỉ có trong roster, không có tài khoản đăng nhập.
const STAFF_LEGACY: StaffLegacy[] = [
  { id: "ACC-manager", tenantId: T1, branchId: T1_B1, name: "Trần Minh Quân",  email: "manager@comtam.vn",    role: "Manager", onShift: true,  active: true },
  { id: "E-02", tenantId: T1, branchId: T1_B1, name: "Lê Thị Hồng",    email: "hong.le@comtam.vn",    role: "Manager", onShift: true,  active: true },
  { id: "ACC-kitchen", tenantId: T1, branchId: T1_B1, name: "Nguyễn Văn Tú",  email: "kitchen@comtam.vn",    role: "Kitchen", onShift: true,  active: true },
  { id: "E-04", tenantId: T1, branchId: T1_B1, name: "Phạm Thu Hà",    email: "ha.pham@comtam.vn",    role: "Kitchen", onShift: true,  active: true },
  { id: "ACC-waiter", tenantId: T1, branchId: T1_B1, name: "Võ Hoàng Nam",   email: "waiter@comtam.vn",     role: "Waiter",  onShift: true,  active: true },
  { id: "E-06", tenantId: T1, branchId: T1_B1, name: "Đặng Mỹ Linh",  email: "linh.dang@comtam.vn",  role: "Waiter",  onShift: false, active: true },
  { id: "E-07", tenantId: T1, branchId: T1_B2, name: "Bùi Anh Khoa",  email: "khoa.bui@comtam.vn",   role: "Waiter",  onShift: true,  active: true },
  { id: "E-08", tenantId: T1, branchId: T1_B2, name: "Ngô Gia Bảo",   email: "bao.ngo@comtam.vn",    role: "Manager", onShift: true,  active: true },
];

// =====================================================================
// ShiftTemplates + WorkSessions
// =====================================================================
const SHIFT_TEMPLATES: ShiftTemplate[] = [
  { id: "ST-01", tenantId: T1, branchId: T1_B1, name: "Ca sáng", startTime: "07:00", endTime: "14:00", active: true },
  { id: "ST-02", tenantId: T1, branchId: T1_B1, name: "Ca chiều", startTime: "14:00", endTime: "22:00", active: true },
  { id: "ST-03", tenantId: T1, branchId: T1_B2, name: "Ca sáng", startTime: "07:00", endTime: "14:00", active: true },
];

// Phân ca hôm nay (2026-09-17) — khớp 3 lượt đang inShift bên dưới.
const SHIFT_ASSIGNMENTS: ShiftAssignment[] = [
  { id: "SA-01", tenantId: T1, branchId: T1_B1, staffId: "ACC-manager", shiftTemplateId: "ST-01", date: "2026-09-17" },
  { id: "SA-02", tenantId: T1, branchId: T1_B1, staffId: "ACC-kitchen", shiftTemplateId: "ST-01", date: "2026-09-17" },
  { id: "SA-03", tenantId: T1, branchId: T1_B1, staffId: "ACC-waiter", shiftTemplateId: "ST-01", date: "2026-09-17" },
  { id: "SA-04", tenantId: T1, branchId: T1_B1, staffId: "E-06", shiftTemplateId: "ST-02", date: "2026-09-17" },
  // Tuần trước (thứ Năm 2026-09-10) — dữ liệu demo cho nút "Sao chép tuần trước".
  { id: "SA-11", tenantId: T1, branchId: T1_B1, staffId: "ACC-manager", shiftTemplateId: "ST-01", date: "2026-09-10" },
  { id: "SA-12", tenantId: T1, branchId: T1_B1, staffId: "ACC-waiter", shiftTemplateId: "ST-01", date: "2026-09-10" },
  { id: "SA-13", tenantId: T1, branchId: T1_B1, staffId: "E-06", shiftTemplateId: "ST-02", date: "2026-09-10" },
];

const WORK_SESSIONS: WorkSession[] = [
  { id: "WS-001", tenantId: T1, branchId: T1_B1, staffId: "ACC-manager", shiftAssignmentId: "SA-01", status: "inShift", offSchedule: false, autoClosed: false, checkedInAt: "2026-09-17T07:05:00" },
  { id: "WS-002", tenantId: T1, branchId: T1_B1, staffId: "ACC-kitchen", shiftAssignmentId: "SA-02", status: "inShift", offSchedule: false, autoClosed: false, checkedInAt: "2026-09-17T07:10:00" },
  { id: "WS-003", tenantId: T1, branchId: T1_B1, staffId: "ACC-waiter", shiftAssignmentId: "SA-03", status: "inShift", offSchedule: false, autoClosed: false, checkedInAt: "2026-09-17T07:00:00" },
];

// =====================================================================
// Audit log legacy
// =====================================================================
const AUDIT_LOG: AuditEntryLegacy[] = [
  { id: "L-5521", tenantId: null, time: "12:44", actor: "admin@platform.vn", action: "Tạm ngưng tenant",  target: "Cà Phê Muối Đà Lạt (T-1062)" },
  { id: "L-5519", tenantId: null, time: "11:20", actor: "admin@platform.vn", action: "Khởi tạo tenant",   target: "Bún Bò O Xuân (T-1071)" },
  { id: "L-5516", tenantId: null, time: "10:02", actor: "system",            action: "Gia hạn thuê bao",  target: "Trà Sữa BoBa Lab (T-1043)" },
  { id: "L-5510", tenantId: null, time: "09:12", actor: "admin@platform.vn", action: "Sửa gói dịch vụ",  target: "Phở Hà Nội 1979 (T-1043)" },
  { id: "L-5507", tenantId: null, time: "hôm qua", actor: "admin@platform.vn", action: "Duyệt đăng ký", target: "Cơm Tấm Sài Gòn (T-CT)" },
];

// =====================================================================
// Demo accounts
// =====================================================================
const DEMO_ACCOUNTS: DemoAccount[] = [
  { id: "ACC-admin",   role: "admin",   name: "Platform Admin",   email: "admin@platform.vn",  password: "demo1234", mustChangePassword: false, active: true, label: "Platform Admin",   scope: "Nền tảng",                      tenantId: undefined, branchId: undefined },
  { id: "ACC-owner",   role: "owner",   name: "Nguyễn Chủ Chuỗi", email: "owner@comtam.vn",    password: "demo1234", mustChangePassword: false, active: true, label: "Owner",            scope: "Cơm Tấm Sài Gòn · Toàn chuỗi", tenantId: T1,        branchId: undefined },
  { id: "ACC-manager", role: "manager", name: "Trần Minh Quân",   email: "manager@comtam.vn",  password: "demo1234", mustChangePassword: false, active: true, label: "Branch Manager",   scope: "Cơm Tấm Sài Gòn · Quận 1",     tenantId: T1,        branchId: T1_B1 },
  { id: "ACC-waiter",  role: "waiter",  name: "Võ Hoàng Nam",     email: "waiter@comtam.vn",   password: "demo1234", mustChangePassword: false, active: true, label: "Waiter",           scope: "Chi nhánh Quận 1",             tenantId: T1,        branchId: T1_B1 },
  { id: "ACC-kitchen", role: "kitchen", name: "Nguyễn Văn Tú",    email: "kitchen@comtam.vn",  password: "demo1234", mustChangePassword: false, active: true, label: "Kitchen Staff",    scope: "Trạm bếp · Quận 1",             tenantId: T1,        branchId: T1_B1 },
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
  db.floorTables         = FLOOR_TABLES;
  db.menuItems           = MENU_ITEMS;
  db.branchMenuItems     = BRANCH_MENU_ITEMS;
  db.tableSessions       = TABLE_SESSIONS;
  db.orders              = ORDERS;
  db.orderLines          = ORDER_LINES;
  db.payments            = PAYMENTS;
  db.ledgerEntries       = LEDGER_ENTRIES;
  db.shiftTemplates      = SHIFT_TEMPLATES;
  db.shiftAssignments    = SHIFT_ASSIGNMENTS;
  db.workSessions        = WORK_SESSIONS;
  db.staffLegacy         = STAFF_LEGACY;
  db.auditLog            = AUDIT_LOG;
  db.demoAccounts        = DEMO_ACCOUNTS;
}

// Tenant constants export (dùng trong service/store)
export { T1, T1_B1, T1_B2, T2, T2_B1, T2_B2 };
