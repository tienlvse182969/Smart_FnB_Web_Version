/** Shared mock data for the Smart F&B tablet prototype. All values are illustrative. */

export type RoleKey = "admin" | "owner" | "branch" | "waiter" | "kitchen";

export const roleMeta: Record<
  RoleKey,
  { label: string; scope: string }
> = {
  admin: { label: "Platform Admin", scope: "Nền tảng" },
  owner: { label: "Owner", scope: "Cơm Tấm Sài Gòn · Toàn chuỗi" },
  branch: { label: "Branch Manager", scope: "Cơm Tấm Sài Gòn · Q1" },
  waiter: { label: "Waiter", scope: "Chi nhánh Quận 1" },
  kitchen: { label: "Kitchen Staff", scope: "Trạm Bếp chính · Q1" },
};

/* ---- Platform Admin ---- */
export type Tenant = {
  id: string;
  name: string;
  plan: "Starter" | "Growth" | "Chain";
  branches: number;
  branchLimit: number;
  status: "active" | "trial" | "suspended" | "expiring";
  mrr: number;
  renews: string;
};

export const tenants: Tenant[] = [
  { id: "T-1042", name: "Cơm Tấm Sài Gòn", plan: "Growth", branches: 4, branchLimit: 6, status: "active", mrr: 3600000, renews: "2026-09-28" },
  { id: "T-1043", name: "Phở Hà Nội 1979", plan: "Chain", branches: 9, branchLimit: 10, status: "expiring", mrr: 8100000, renews: "2026-09-11" },
  { id: "T-1051", name: "Trà Sữa BoBa Lab", plan: "Growth", branches: 5, branchLimit: 6, status: "active", mrr: 4500000, renews: "2026-10-02" },
  { id: "T-1060", name: "Bánh Mì Chảo Cô Ba", plan: "Starter", branches: 2, branchLimit: 2, status: "trial", mrr: 0, renews: "2026-09-14" },
  { id: "T-1062", name: "Cà Phê Muối Đà Lạt", plan: "Growth", branches: 3, branchLimit: 6, status: "suspended", mrr: 2700000, renews: "2026-08-30" },
  { id: "T-1071", name: "Bún Bò O Xuân", plan: "Starter", branches: 2, branchLimit: 2, status: "active", mrr: 1800000, renews: "2026-10-08" },
];

export const planLimits: Record<
  Tenant["plan"],
  { branches: number; staff: number; tables: number; price: number }
> = {
  Starter: { branches: 2, staff: 15, tables: 20, price: 900000 },
  Growth: { branches: 6, staff: 60, tables: 80, price: 900000 },
  Chain: { branches: 10, staff: 150, tables: 200, price: 900000 },
};

export const signupRequests = [
  { id: "R-88", name: "Xôi Xéo Bà Tư", contact: "chi.nguyen@xoixeo.vn", branches: 3, submitted: "2 giờ trước" },
  { id: "R-89", name: "Mì Cay Seoul", contact: "owner@micayseoul.vn", branches: 4, submitted: "hôm nay, 09:12" },
  { id: "R-90", name: "Cháo Sườn Cô Hoa", contact: "hoa@chaosuon.vn", branches: 2, submitted: "hôm qua" },
];

/* ---- Menu · hai tầng ----
 * MenuItem thuộc về CHUỖI (chỉ Owner sửa). Trạng thái bán và số suất là
 * của TỪNG chi nhánh nên nằm ở BranchMenuItem. Sự tồn tại bản ghi
 * BranchMenuItem = món CÓ MẶT ở chi nhánh đó.
 */
export type MenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  activeChain: boolean; // Owner tắt -> mọi chi nhánh đều không bán
};

export type BranchMenuItem = {
  branchId: string;
  menuItemId: string;
  available: boolean; // Branch Manager / bếp bật/tắt cho chi nhánh mình
  remaining: number | null; // suất còn lại hôm nay tại chi nhánh, null = không giới hạn
  sold: number; // đã bán hôm nay tại chi nhánh này — dùng cho "món bán chạy", KHÔNG nhân giá
};

export const menuItems: MenuItem[] = [
  { id: "M-01", name: "Cơm tấm sườn bì chả", category: "Món chính", price: 55000, activeChain: true },
  { id: "M-02", name: "Cơm tấm sườn cây", category: "Món chính", price: 62000, activeChain: true },
  { id: "M-03", name: "Chả trứng hấp", category: "Món thêm", price: 15000, activeChain: true },
  { id: "M-04", name: "Canh khổ qua", category: "Món thêm", price: 20000, activeChain: false },
  { id: "M-05", name: "Trà tắc", category: "Đồ uống", price: 18000, activeChain: true },
  { id: "M-06", name: "Cà phê sữa đá", category: "Đồ uống", price: 25000, activeChain: true },
  { id: "M-07", name: "Rau câu dừa", category: "Tráng miệng", price: 12000, activeChain: true },
];

/* Seed menu theo chi nhánh:
 * - M-02 (Cơm tấm sườn cây) & M-06 (Cà phê sữa đá): KHÔNG có mặt ở Thủ Đức -> 2/3
 * - M-03 (Chả trứng hấp): tắt (available=false) ở đúng chi nhánh Quận 7
 * - M-02 tại Quận 1 chỉ còn 2 suất -> demo sắp hết
 */
export const branchMenuItems: BranchMenuItem[] = [
  // Quận 1
  { branchId: "BR-Q1", menuItemId: "M-01", available: true, remaining: null, sold: 128 },
  { branchId: "BR-Q1", menuItemId: "M-02", available: true, remaining: 2, sold: 96 },
  { branchId: "BR-Q1", menuItemId: "M-03", available: true, remaining: null, sold: 74 },
  { branchId: "BR-Q1", menuItemId: "M-04", available: true, remaining: null, sold: 41 },
  { branchId: "BR-Q1", menuItemId: "M-05", available: true, remaining: null, sold: 210 },
  { branchId: "BR-Q1", menuItemId: "M-06", available: true, remaining: null, sold: 188 },
  { branchId: "BR-Q1", menuItemId: "M-07", available: true, remaining: 20, sold: 33 },
  // Quận 7
  { branchId: "BR-Q7", menuItemId: "M-01", available: true, remaining: null, sold: 74 },
  { branchId: "BR-Q7", menuItemId: "M-02", available: true, remaining: 8, sold: 40 },
  { branchId: "BR-Q7", menuItemId: "M-03", available: false, remaining: 5, sold: 22 },
  { branchId: "BR-Q7", menuItemId: "M-04", available: true, remaining: null, sold: 12 },
  { branchId: "BR-Q7", menuItemId: "M-05", available: true, remaining: null, sold: 120 },
  { branchId: "BR-Q7", menuItemId: "M-06", available: true, remaining: null, sold: 95 },
  { branchId: "BR-Q7", menuItemId: "M-07", available: true, remaining: null, sold: 18 },
  // Thủ Đức (không có M-02, M-06)
  { branchId: "BR-TD", menuItemId: "M-01", available: true, remaining: null, sold: 0 },
  { branchId: "BR-TD", menuItemId: "M-03", available: true, remaining: null, sold: 0 },
  { branchId: "BR-TD", menuItemId: "M-04", available: true, remaining: null, sold: 0 },
  { branchId: "BR-TD", menuItemId: "M-05", available: true, remaining: null, sold: 0 },
  { branchId: "BR-TD", menuItemId: "M-07", available: true, remaining: null, sold: 0 },
];

export const getBranchMenuItem = (menuItemId: string, branchId: string) =>
  branchMenuItems.find((b) => b.menuItemId === menuItemId && b.branchId === branchId) ?? null;

/** Số chi nhánh đang có mặt món này (đếm bản ghi BranchMenuItem). */
export const countBranchesOffering = (menuItemId: string) =>
  branchMenuItems.filter((b) => b.menuItemId === menuItemId).length;

/** Món hiện trên menu của một chi nhánh khi: chuỗi còn bật, có mặt tại chi
 * nhánh, đang available và còn suất. */
export const isMenuItemVisible = (menuItemId: string, branchId: string) => {
  const item = menuItems.find((m) => m.id === menuItemId);
  if (!item || !item.activeChain) return false;
  const bmi = getBranchMenuItem(menuItemId, branchId);
  if (!bmi || !bmi.available) return false;
  return bmi.remaining === null || bmi.remaining > 0;
};

export const revenueByHour = [
  { hour: "10h", value: 1.2 }, { hour: "11h", value: 3.8 }, { hour: "12h", value: 6.4 },
  { hour: "13h", value: 4.1 }, { hour: "14h", value: 1.6 }, { hour: "15h", value: 1.1 },
  { hour: "16h", value: 1.4 }, { hour: "17h", value: 2.9 }, { hour: "18h", value: 5.7 },
  { hour: "19h", value: 6.9 }, { hour: "20h", value: 4.3 }, { hour: "21h", value: 2.0 },
];

/* ---- Kitchen ----
 * Bếp đọc thẳng từ OrderLine (đơn vị bếp xử lý). KitchenTicket cũ đã bỏ.
 * kitchenQueue() dựng danh sách hiển thị: join OrderLine → Order → TableSession
 * để lấy số bàn và tính số phút đã chờ. Không nhân đôi dữ liệu.
 */
export type TicketStatus = "queued" | "cooking" | "done";

export type KitchenQueueItem = {
  orderLineId: string;
  table: string; // nhãn bàn, ghép "+" nếu phiên gộp nhiều bàn
  category: string;
  name: string;
  qty: number;
  note?: string;
  status: TicketStatus;
  waited: number; // phút đã chờ, tính từ giờ tạo order
};

/* ---- Cashier ---- */
export type TxStatus = "pending" | "confirmed" | "refund" | "failed";
export type Transaction = {
  id: string;
  branchId: string;
  table: string;
  session: string;
  amount: number;
  method: "VietQR" | "Tiền mặt";
  status: TxStatus;
  time: string;
  note?: string;
};

export const transactions: Transaction[] = [
  { id: "PAY-9081", branchId: "BR-Q1", table: "B4", session: "S-4471", amount: 154000, method: "VietQR", status: "confirmed", time: "12:41" },
  { id: "PAY-9082", branchId: "BR-Q1", table: "C2", session: "S-4472", amount: 165000, method: "VietQR", status: "pending", time: "12:44", note: "Webhook chưa về · chờ 3'" },
  { id: "PAY-9083", branchId: "BR-Q1", table: "A1", session: "S-4470", amount: 55000, method: "Tiền mặt", status: "pending", time: "12:45", note: "Chờ xác nhận tiền mặt" },
  { id: "PAY-9078", branchId: "BR-Q1", table: "A5", session: "S-4468", amount: 240000, method: "VietQR", status: "refund", time: "12:20", note: "Hết món · hoàn 1 phần 62.000₫" },
  { id: "PAY-9075", branchId: "BR-Q1", table: "B2", session: "S-4465", amount: 88000, method: "VietQR", status: "failed", time: "12:08", note: "Sai số tiền · đối soát tay" },
];

/* ---- Audit log (Platform Admin) ---- */
export type AuditEntry = {
  id: string;
  time: string;
  actor: string;
  action: string;
  target: string;
};

export const auditLog: AuditEntry[] = [
  { id: "L-5521", time: "12:44", actor: "admin@platform", action: "Tạm ngưng tenant", target: "Cà Phê Muối Đà Lạt (T-1062)" },
  { id: "L-5519", time: "11:20", actor: "admin@platform", action: "Khởi tạo tenant", target: "Bún Bò O Xuân (T-1071)" },
  { id: "L-5516", time: "10:02", actor: "system", action: "Gia hạn thuê bao", target: "Trà Sữa BoBa Lab (T-1051)" },
  { id: "L-5510", time: "09:12", actor: "admin@platform", action: "Sửa gói dịch vụ", target: "Phở Hà Nội 1979 (T-1043)" },
  { id: "L-5507", time: "hôm qua", actor: "admin@platform", action: "Duyệt đăng ký", target: "Cơm Tấm Sài Gòn (T-1042)" },
];

/* ---- Manager · Chi nhánh (MG-07) ---- */
export type Branch = {
  id: string;
  name: string;
  address: string;
  hours: string;
  tables: number;
  status: "open" | "closed";
};

export const branches: Branch[] = [
  {
    id: "BR-Q1",
    name: "Chi nhánh Quận 1",
    address: "24 Lê Lợi, P. Bến Nghé, Q1",
    hours: "07:00 – 22:00",
    tables: 24,
    status: "open",
  },
  {
    id: "BR-Q7",
    name: "Chi nhánh Quận 7",
    address: "156 Nguyễn Thị Thập, P. Tân Phú, Q7",
    hours: "07:00 – 22:00",
    tables: 18,
    status: "open",
  },
  {
    id: "BR-TD",
    name: "Chi nhánh Thủ Đức",
    address: "01 Võ Văn Ngân, TP. Thủ Đức",
    hours: "07:00 – 21:30",
    tables: 20,
    status: "closed",
  },
];

/** Đếm nhân viên của một chi nhánh từ bảng Staff (không lưu sẵn). */
export const countStaffByBranch = (branchId: string) => {
  const b = branches.find((x) => x.id === branchId);
  if (!b) return 0;
  const label = b.name.replace("Chi nhánh ", "");
  return staff.filter((s) => s.branch === label).length;
};

/* ---- Manager · Sơ đồ bàn (MG-07) ----
 * FloorTable chỉ giữ trạng thái KHÔNG suy ra được. "Đang phục vụ" suy ra từ
 * TableSession đang mở (getTableState). Số khách / thời gian / tiền lấy từ
 * phiên (getTableInfo), không lưu ở bàn.
 */
export type TableState = "available" | "locked" | "reserved";
/** "paid" = khách đã trả tiền nhưng waiter chưa đóng bàn — vẫn đang ngồi. */
export type TableDisplayState = "serving" | "paid" | TableState;
export type FloorTable = {
  id: string;
  area: string;
  seats: number;
  state: TableState; // "available" | "locked" (bàn hỏng) | "reserved"
  adjacentTableIds: string[]; // bàn liền kề, khai báo tay — đầu vào ghép bàn
};

/* Bàn liền kề khai báo tay: chỉ trong cùng khu vực, không suy ra từ toạ độ.
 * Trong nhà: cụm A1–A2–A3 (ghép 3), cụm A4–A5 (ghép 2), cụm B1–B2–B3 (ghép 3).
 * Sân vườn: cụm C1–C2 (ghép 2); B4 và C3 đứng riêng. */
export const floorTables: FloorTable[] = [
  { id: "A1", area: "Trong nhà", seats: 4, state: "available", adjacentTableIds: ["A2"] },
  { id: "A2", area: "Trong nhà", seats: 4, state: "available", adjacentTableIds: ["A1", "A3"] },
  { id: "A3", area: "Trong nhà", seats: 2, state: "available", adjacentTableIds: ["A2"] },
  { id: "A4", area: "Trong nhà", seats: 2, state: "available", adjacentTableIds: ["A5"] },
  { id: "A5", area: "Trong nhà", seats: 6, state: "locked", adjacentTableIds: ["A4"] },
  { id: "B1", area: "Trong nhà", seats: 4, state: "available", adjacentTableIds: ["B2"] },
  { id: "B2", area: "Trong nhà", seats: 4, state: "available", adjacentTableIds: ["B1", "B3"] },
  { id: "B3", area: "Trong nhà", seats: 2, state: "available", adjacentTableIds: ["B2"] },
  { id: "B4", area: "Sân vườn", seats: 6, state: "available", adjacentTableIds: [] },
  { id: "C1", area: "Sân vườn", seats: 4, state: "available", adjacentTableIds: ["C2"] },
  { id: "C2", area: "Sân vườn", seats: 4, state: "available", adjacentTableIds: ["C1"] },
  { id: "C3", area: "Sân vườn", seats: 2, state: "reserved", adjacentTableIds: [] },
];

/* ---- Manager · Nhân viên (MG-04) ---- */
export type StaffRole = "Manager" | "Waiter" | "Kitchen";
export type Staff = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  branch: string;
  onShift: boolean;
  active: boolean; // false = tài khoản bị khoá (nghỉ việc), khác với check-out
};

export const staff: Staff[] = [
  { id: "E-01", name: "Trần Minh Quân", email: "quan.tran@comtam.vn", role: "Manager", branch: "Quận 1", onShift: true, active: true },
  { id: "E-02", name: "Lê Thị Hồng", email: "hong.le@comtam.vn", role: "Manager", branch: "Quận 1", onShift: true, active: true },
  { id: "E-03", name: "Nguyễn Văn Tú", email: "tu.nguyen@comtam.vn", role: "Kitchen", branch: "Quận 1", onShift: true, active: true },
  { id: "E-04", name: "Phạm Thu Hà", email: "ha.pham@comtam.vn", role: "Kitchen", branch: "Quận 1", onShift: true, active: true },
  { id: "E-05", name: "Võ Hoàng Nam", email: "nam.vo@comtam.vn", role: "Waiter", branch: "Quận 1", onShift: true, active: true },
  { id: "E-06", name: "Đặng Mỹ Linh", email: "linh.dang@comtam.vn", role: "Waiter", branch: "Quận 1", onShift: false, active: true },
  { id: "E-07", name: "Bùi Anh Khoa", email: "khoa.bui@comtam.vn", role: "Waiter", branch: "Quận 7", onShift: true, active: true },
];

/* ---- Manager · Cấu hình thanh toán (MG-05) ---- */
export const bankAccount = {
  bank: "Vietcombank",
  accountName: "CTY TNHH COM TAM SAI GON",
  accountNumber: "0071000456789",
  connected: true,
  webhook: "https://api.smartfnb.vn/hooks/vietqr/BR-Q1",
};

export const money = (v: number) =>
  v.toLocaleString("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

/* ---- Phiên bàn · Order · Dòng món ---- */

/** Một lượt khách dùng bàn, từ lúc ngồi tới khi thanh toán xong. */
export type TableSession = {
  id: string;
  branchId: string;
  tableIds: string[]; // nhiều bàn nếu ghép
  guests: number;
  openedBy: string; // tên waiter mở bàn
  openedAt: string;
  status: "open" | "paid" | "closed" | "cancelled";
  // total: tính bằng calcSessionTotal(), không lưu
  paymentRequested?: boolean; // waiter đã bấm "Báo quầy tính tiền"
  paymentMethod?: "qr" | "cash";
  collectedBy?: string; // tên waiter thu tiền mặt hộ; undefined nếu trả QR
  confirmedBy?: string; // tên Branch Manager xác nhận thanh toán
  paidAt?: string;
};

/** Một lần waiter bấm gửi món. Gọi thêm tạo order mới trong cùng phiên. */
export type Order = {
  id: string;
  sessionId: string;
  createdBy: string;
  createdAt: string;
  // status: suy ra từ các OrderLine bằng getOrderStatus(), không lưu
};
export type OrderStatus = "sent" | "processing" | "done" | "cancelled";

/** Một món trong order — đơn vị bếp xử lý. */
export type OrderLineStatus =
  | "queued"
  | "cooking"
  | "done"
  | "served"
  | "sold-out"
  | "cancelled";
export type OrderLine = {
  id: string;
  orderId: string;
  menuItemId: string;
  name: string; // tên tại thời điểm bán
  unitPrice: number; // giá tại thời điểm bán — không tham chiếu bảng món
  qty: number;
  note?: string; // ghi chú của khách
  status: OrderLineStatus;
  claimedBy?: string; // waiter đã nhận việc bưng món
  startedAt?: string; // lúc bếp bấm bắt đầu làm
  doneAt?: string; // lúc bếp bấm xong — mốc tính thời gian chờ bưng
};

/* --- Phiên đang mở (BR-Q1) --- */
export const tableSessions: TableSession[] = [
  { id: "S-4471", branchId: "BR-Q1", tableIds: ["B4"], guests: 5, openedBy: "Võ Hoàng Nam", openedAt: "12:35", status: "open" },
  { id: "S-4472", branchId: "BR-Q1", tableIds: ["C2"], guests: 3, openedBy: "Bùi Anh Khoa", openedAt: "12:41", status: "open" },
  /* --- Phiên đang mở dùng BÀN GHÉP (B2 + B3) — để thấy khối ghép trên sơ đồ --- */
  { id: "S-4473", branchId: "BR-Q1", tableIds: ["B2", "B3"], guests: 7, openedBy: "Đặng Mỹ Linh", openedAt: "12:30", status: "open" },
  /* --- Phiên đã trả tiền nhưng CHƯA đóng bàn (khách còn ngồi) — hiện "paid" --- */
  { id: "S-4470", branchId: "BR-Q1", tableIds: ["A1"], guests: 3, openedBy: "Đặng Mỹ Linh", openedAt: "12:05", status: "paid", paymentMethod: "cash", collectedBy: "Đặng Mỹ Linh", confirmedBy: "Trần Minh Quân", paidAt: "12:42" },
  /* --- Phiên đã ĐÓNG BÀN (doanh thu trong ngày, không còn chiếm bàn) — BR-Q1 --- */
  { id: "S-P101", branchId: "BR-Q1", tableIds: ["A2"], guests: 4, openedBy: "Võ Hoàng Nam", openedAt: "10:15", status: "closed", paymentMethod: "qr", confirmedBy: "Trần Minh Quân", paidAt: "10:48" },
  { id: "S-P102", branchId: "BR-Q1", tableIds: ["B1"], guests: 6, openedBy: "Đặng Mỹ Linh", openedAt: "10:40", status: "closed", paymentMethod: "cash", collectedBy: "Đặng Mỹ Linh", confirmedBy: "Lê Thị Hồng", paidAt: "11:22" },
  { id: "S-P103", branchId: "BR-Q1", tableIds: ["C1", "C2"], guests: 8, openedBy: "Võ Hoàng Nam", openedAt: "11:00", status: "closed", paymentMethod: "qr", confirmedBy: "Lê Thị Hồng", paidAt: "11:58" },
  { id: "S-P104", branchId: "BR-Q1", tableIds: ["B3"], guests: 6, openedBy: "Đặng Mỹ Linh", openedAt: "11:20", status: "closed", paymentMethod: "qr", confirmedBy: "Trần Minh Quân", paidAt: "12:12" },
  { id: "S-P105", branchId: "BR-Q1", tableIds: ["A3"], guests: 3, openedBy: "Võ Hoàng Nam", openedAt: "11:45", status: "closed", paymentMethod: "cash", collectedBy: "Võ Hoàng Nam", confirmedBy: "Trần Minh Quân", paidAt: "12:28" },
  /* --- Phiên đã đóng bàn — BR-Q7 --- */
  { id: "S-P201", branchId: "BR-Q7", tableIds: ["T1"], guests: 4, openedBy: "Bùi Anh Khoa", openedAt: "10:30", status: "closed", paymentMethod: "qr", confirmedBy: "Ngô Gia Bảo", paidAt: "11:05" },
  { id: "S-P202", branchId: "BR-Q7", tableIds: ["T2"], guests: 5, openedBy: "Bùi Anh Khoa", openedAt: "11:05", status: "closed", paymentMethod: "cash", collectedBy: "Bùi Anh Khoa", confirmedBy: "Ngô Gia Bảo", paidAt: "11:52" },
  { id: "S-P203", branchId: "BR-Q7", tableIds: ["T3"], guests: 3, openedBy: "Bùi Anh Khoa", openedAt: "11:30", status: "closed", paymentMethod: "qr", confirmedBy: "Ngô Gia Bảo", paidAt: "12:02" },
  { id: "S-P204", branchId: "BR-Q7", tableIds: ["T4"], guests: 2, openedBy: "Bùi Anh Khoa", openedAt: "12:00", status: "closed", paymentMethod: "qr", confirmedBy: "Ngô Gia Bảo", paidAt: "12:32" },
  /* --- Phiên đã đóng bàn — BR-TD --- */
  { id: "S-P301", branchId: "BR-TD", tableIds: ["T1"], guests: 2, openedBy: "Nhân viên ca sáng", openedAt: "10:00", status: "closed", paymentMethod: "qr", confirmedBy: "Huỳnh Tấn Phát", paidAt: "10:32" },
  { id: "S-P302", branchId: "BR-TD", tableIds: ["T2"], guests: 3, openedBy: "Nhân viên ca sáng", openedAt: "10:30", status: "closed", paymentMethod: "cash", collectedBy: "Nhân viên ca sáng", confirmedBy: "Huỳnh Tấn Phát", paidAt: "11:04" },
  { id: "S-P303", branchId: "BR-TD", tableIds: ["T3"], guests: 2, openedBy: "Nhân viên ca sáng", openedAt: "11:00", status: "closed", paymentMethod: "qr", confirmedBy: "Huỳnh Tấn Phát", paidAt: "11:35" },
];

export const orders: Order[] = [
  { id: "O-1", sessionId: "S-4471", createdBy: "Võ Hoàng Nam", createdAt: "12:36" },
  { id: "O-2", sessionId: "S-4471", createdBy: "Võ Hoàng Nam", createdAt: "12:44" },
  { id: "O-3", sessionId: "S-4472", createdBy: "Bùi Anh Khoa", createdAt: "12:41" },
  { id: "O-4", sessionId: "S-4470", createdBy: "Đặng Mỹ Linh", createdAt: "12:06" },
  { id: "O-5", sessionId: "S-4473", createdBy: "Đặng Mỹ Linh", createdAt: "12:31" },
  /* Paid sessions — BR-Q1 */
  { id: "O-P101", sessionId: "S-P101", createdBy: "Võ Hoàng Nam", createdAt: "10:16" },
  { id: "O-P102", sessionId: "S-P102", createdBy: "Đặng Mỹ Linh", createdAt: "10:41" },
  { id: "O-P103", sessionId: "S-P103", createdBy: "Võ Hoàng Nam", createdAt: "11:01" },
  { id: "O-P104", sessionId: "S-P104", createdBy: "Đặng Mỹ Linh", createdAt: "11:21" },
  { id: "O-P105", sessionId: "S-P105", createdBy: "Võ Hoàng Nam", createdAt: "11:46" },
  /* Paid sessions — BR-Q7 */
  { id: "O-P201", sessionId: "S-P201", createdBy: "Bùi Anh Khoa", createdAt: "10:31" },
  { id: "O-P202", sessionId: "S-P202", createdBy: "Bùi Anh Khoa", createdAt: "11:06" },
  { id: "O-P203", sessionId: "S-P203", createdBy: "Bùi Anh Khoa", createdAt: "11:31" },
  { id: "O-P204", sessionId: "S-P204", createdBy: "Bùi Anh Khoa", createdAt: "12:01" },
  /* Paid sessions — BR-TD */
  { id: "O-P301", sessionId: "S-P301", createdBy: "Nhân viên ca sáng", createdAt: "10:01" },
  { id: "O-P302", sessionId: "S-P302", createdBy: "Nhân viên ca sáng", createdAt: "10:31" },
  { id: "O-P303", sessionId: "S-P303", createdBy: "Nhân viên ca sáng", createdAt: "11:01" },
];

export const orderLines: OrderLine[] = [
  // O-1 · bàn B4
  { id: "OL-1", orderId: "O-1", menuItemId: "M-02", name: "Cơm tấm sườn cây", unitPrice: 62000, qty: 2, note: "Ít mỡ hành", status: "cooking", startedAt: "12:40" },
  { id: "OL-2", orderId: "O-1", menuItemId: "M-03", name: "Chả trứng hấp", unitPrice: 15000, qty: 2, status: "queued" },
  { id: "OL-3", orderId: "O-1", menuItemId: "M-05", name: "Trà tắc", unitPrice: 18000, qty: 2, status: "served", claimedBy: "Võ Hoàng Nam", startedAt: "12:36", doneAt: "12:38" },
  // O-2 · bàn B4 (gọi thêm)
  { id: "OL-4", orderId: "O-2", menuItemId: "M-07", name: "Rau câu dừa", unitPrice: 12000, qty: 2, status: "done", startedAt: "12:44", doneAt: "12:46" },
  // O-3 · bàn C2
  { id: "OL-5", orderId: "O-3", menuItemId: "M-01", name: "Cơm tấm sườn bì chả", unitPrice: 55000, qty: 1, note: "Không cay", status: "cooking", startedAt: "12:43" },
  { id: "OL-6", orderId: "O-3", menuItemId: "M-01", name: "Cơm tấm sườn bì chả", unitPrice: 55000, qty: 1, status: "queued" },
  { id: "OL-7", orderId: "O-3", menuItemId: "M-06", name: "Cà phê sữa đá", unitPrice: 25000, qty: 2, status: "done", startedAt: "12:42", doneAt: "12:43" },
  { id: "OL-8", orderId: "O-3", menuItemId: "M-05", name: "Trà tắc", unitPrice: 18000, qty: 1, status: "served", claimedBy: "Bùi Anh Khoa", startedAt: "12:41", doneAt: "12:42" },
  // O-4 · bàn A1 (phiên đã thanh toán)
  { id: "OL-9", orderId: "O-4", menuItemId: "M-01", name: "Cơm tấm sườn bì chả", unitPrice: 55000, qty: 2, status: "served", claimedBy: "Đặng Mỹ Linh" },
  { id: "OL-10", orderId: "O-4", menuItemId: "M-05", name: "Trà tắc", unitPrice: 18000, qty: 2, status: "served", claimedBy: "Đặng Mỹ Linh" },
  // O-5 · bàn ghép B2 + B3
  { id: "OL-11", orderId: "O-5", menuItemId: "M-01", name: "Cơm tấm sườn bì chả", unitPrice: 55000, qty: 4, note: "1 phần không mỡ hành", status: "cooking", startedAt: "12:33" },
  { id: "OL-12", orderId: "O-5", menuItemId: "M-05", name: "Trà tắc", unitPrice: 18000, qty: 4, status: "queued" },
  { id: "OL-13", orderId: "O-5", menuItemId: "M-06", name: "Cà phê sữa đá", unitPrice: 25000, qty: 3, status: "done", startedAt: "12:41", doneAt: "12:45" },
  /* O-P101 · S-P101 · BR-Q1 — 258 000 ₫ */
  { id: "OL-P101-1", orderId: "O-P101", menuItemId: "M-01", name: "Cơm tấm sườn bì chả", unitPrice: 55000, qty: 3, status: "served" },
  { id: "OL-P101-2", orderId: "O-P101", menuItemId: "M-06", name: "Cà phê sữa đá", unitPrice: 25000, qty: 3, status: "served" },
  { id: "OL-P101-3", orderId: "O-P101", menuItemId: "M-05", name: "Trà tắc", unitPrice: 18000, qty: 1, status: "served" },
  /* O-P102 · S-P102 · BR-Q1 — 440 000 ₫ */
  { id: "OL-P102-1", orderId: "O-P102", menuItemId: "M-01", name: "Cơm tấm sườn bì chả", unitPrice: 55000, qty: 4, status: "served" },
  { id: "OL-P102-2", orderId: "O-P102", menuItemId: "M-02", name: "Cơm tấm sườn cây", unitPrice: 62000, qty: 2, status: "served" },
  { id: "OL-P102-3", orderId: "O-P102", menuItemId: "M-05", name: "Trà tắc", unitPrice: 18000, qty: 4, status: "served" },
  { id: "OL-P102-4", orderId: "O-P102", menuItemId: "M-07", name: "Rau câu dừa", unitPrice: 12000, qty: 2, status: "served" },
  /* O-P103 · S-P103 · BR-Q1 — 612 000 ₫ */
  { id: "OL-P103-1", orderId: "O-P103", menuItemId: "M-01", name: "Cơm tấm sườn bì chả", unitPrice: 55000, qty: 6, status: "served" },
  { id: "OL-P103-2", orderId: "O-P103", menuItemId: "M-02", name: "Cơm tấm sườn cây", unitPrice: 62000, qty: 2, status: "served" },
  { id: "OL-P103-3", orderId: "O-P103", menuItemId: "M-05", name: "Trà tắc", unitPrice: 18000, qty: 6, status: "served" },
  { id: "OL-P103-4", orderId: "O-P103", menuItemId: "M-06", name: "Cà phê sữa đá", unitPrice: 25000, qty: 2, status: "served" },
  /* O-P104 · S-P104 · BR-Q1 — 442 000 ₫ */
  { id: "OL-P104-1", orderId: "O-P104", menuItemId: "M-01", name: "Cơm tấm sườn bì chả", unitPrice: 55000, qty: 5, status: "served" },
  { id: "OL-P104-2", orderId: "O-P104", menuItemId: "M-02", name: "Cơm tấm sườn cây", unitPrice: 62000, qty: 1, status: "served" },
  { id: "OL-P104-3", orderId: "O-P104", menuItemId: "M-05", name: "Trà tắc", unitPrice: 18000, qty: 5, status: "served" },
  { id: "OL-P104-4", orderId: "O-P104", menuItemId: "M-03", name: "Chả trứng hấp", unitPrice: 15000, qty: 1, status: "served" },
  /* O-P105 · S-P105 · BR-Q1 — 240 000 ₫ */
  { id: "OL-P105-1", orderId: "O-P105", menuItemId: "M-01", name: "Cơm tấm sườn bì chả", unitPrice: 55000, qty: 3, status: "served" },
  { id: "OL-P105-2", orderId: "O-P105", menuItemId: "M-06", name: "Cà phê sữa đá", unitPrice: 25000, qty: 3, status: "served" },
  /* O-P201 · S-P201 · BR-Q7 — 281 000 ₫ */
  { id: "OL-P201-1", orderId: "O-P201", menuItemId: "M-01", name: "Cơm tấm sườn bì chả", unitPrice: 55000, qty: 3, status: "served" },
  { id: "OL-P201-2", orderId: "O-P201", menuItemId: "M-02", name: "Cơm tấm sườn cây", unitPrice: 62000, qty: 1, status: "served" },
  { id: "OL-P201-3", orderId: "O-P201", menuItemId: "M-05", name: "Trà tắc", unitPrice: 18000, qty: 3, status: "served" },
  /* O-P202 · S-P202 · BR-Q7 — 354 000 ₫ */
  { id: "OL-P202-1", orderId: "O-P202", menuItemId: "M-01", name: "Cơm tấm sườn bì chả", unitPrice: 55000, qty: 4, status: "served" },
  { id: "OL-P202-2", orderId: "O-P202", menuItemId: "M-02", name: "Cơm tấm sườn cây", unitPrice: 62000, qty: 1, status: "served" },
  { id: "OL-P202-3", orderId: "O-P202", menuItemId: "M-05", name: "Trà tắc", unitPrice: 18000, qty: 4, status: "served" },
  /* O-P203 · S-P203 · BR-Q7 — 153 000 ₫ */
  { id: "OL-P203-1", orderId: "O-P203", menuItemId: "M-01", name: "Cơm tấm sườn bì chả", unitPrice: 55000, qty: 2, status: "served" },
  { id: "OL-P203-2", orderId: "O-P203", menuItemId: "M-05", name: "Trà tắc", unitPrice: 18000, qty: 1, status: "served" },
  { id: "OL-P203-3", orderId: "O-P203", menuItemId: "M-06", name: "Cà phê sữa đá", unitPrice: 25000, qty: 1, status: "served" },
  /* O-P204 · S-P204 · BR-Q7 — 146 000 ₫ */
  { id: "OL-P204-1", orderId: "O-P204", menuItemId: "M-01", name: "Cơm tấm sườn bì chả", unitPrice: 55000, qty: 2, status: "served" },
  { id: "OL-P204-2", orderId: "O-P204", menuItemId: "M-05", name: "Trà tắc", unitPrice: 18000, qty: 2, status: "served" },
  /* O-P301 · S-P301 · BR-TD — 146 000 ₫ */
  { id: "OL-P301-1", orderId: "O-P301", menuItemId: "M-01", name: "Cơm tấm sườn bì chả", unitPrice: 55000, qty: 2, status: "served" },
  { id: "OL-P301-2", orderId: "O-P301", menuItemId: "M-05", name: "Trà tắc", unitPrice: 18000, qty: 2, status: "served" },
  /* O-P302 · S-P302 · BR-TD — 161 000 ₫ */
  { id: "OL-P302-1", orderId: "O-P302", menuItemId: "M-01", name: "Cơm tấm sườn bì chả", unitPrice: 55000, qty: 2, status: "served" },
  { id: "OL-P302-2", orderId: "O-P302", menuItemId: "M-03", name: "Chả trứng hấp", unitPrice: 15000, qty: 1, status: "served" },
  { id: "OL-P302-3", orderId: "O-P302", menuItemId: "M-05", name: "Trà tắc", unitPrice: 18000, qty: 2, status: "served" },
  /* O-P303 · S-P303 · BR-TD — 73 000 ₫ */
  { id: "OL-P303-1", orderId: "O-P303", menuItemId: "M-01", name: "Cơm tấm sườn bì chả", unitPrice: 55000, qty: 1, status: "served" },
  { id: "OL-P303-2", orderId: "O-P303", menuItemId: "M-05", name: "Trà tắc", unitPrice: 18000, qty: 1, status: "served" },
];

/** Số phút trôi qua từ một mốc "HH:MM" so với giờ hiện tại của ca (demo). */
export const NOW_MINUTES = 12 * 60 + 47; // 12:47
export const minutesSince = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return Math.max(0, NOW_MINUTES - (h * 60 + m));
};

/** Giờ hiện tại của ca (demo) dạng "HH:MM" — dùng khi ghi mốc thời gian mới. */
export const nowLabel = () =>
  `${String(Math.floor(NOW_MINUTES / 60)).padStart(2, "0")}:${String(NOW_MINUTES % 60).padStart(2, "0")}`;

/**
 * Hàng đợi bếp dựng từ OrderLine: chỉ các dòng bếp cần xử lý
 * (queued / cooking / done), sắp theo thứ tự nhận order (chờ lâu nhất trước).
 */
export function kitchenQueue(branchId = "BR-Q1"): KitchenQueueItem[] {
  const sessionById = new Map(tableSessions.map((s) => [s.id, s]));
  const orderById = new Map(orders.map((o) => [o.id, o]));
  const categoryById = new Map(menuItems.map((m) => [m.id, m.category]));

  const items: KitchenQueueItem[] = [];
  for (const l of orderLines) {
    if (l.status !== "queued" && l.status !== "cooking" && l.status !== "done") continue;
    const order = orderById.get(l.orderId)!;
    const session = sessionById.get(order.sessionId)!;
    if (session.branchId !== branchId) continue;
    items.push({
      orderLineId: l.id,
      table: session.tableIds.join(" + "),
      category: categoryById.get(l.menuItemId) ?? "Khác",
      name: l.name,
      qty: l.qty,
      note: l.note,
      status: l.status,
      waited: minutesSince(order.createdAt),
    });
  }
  return items.sort((a, b) => b.waited - a.waited);
}

/* ---- Hàm suy dẫn (không lưu field) ---- */

const openSessionForTable = (tableId: string) =>
  tableSessions.find((s) => s.status === "open" && s.tableIds.includes(tableId)) ?? null;

/** Phiên đang CHIẾM bàn: khách còn ngồi khi phiên "open" HOẶC "paid"
 * (đã trả nhưng chưa đóng bàn). Chỉ "closed"/"cancelled" mới trả bàn về trống. */
const occupyingSessionForTable = (tableId: string) =>
  tableSessions.find(
    (s) => (s.status === "open" || s.status === "paid") && s.tableIds.includes(tableId),
  ) ?? null;

/** Tổng tiền phiên = Σ(unitPrice × qty), bỏ dòng "cancelled" / "sold-out". */
export function calcSessionTotal(sessionId: string): number {
  const orderIds = new Set(orders.filter((o) => o.sessionId === sessionId).map((o) => o.id));
  return orderLines
    .filter((l) => orderIds.has(l.orderId))
    .filter((l) => l.status !== "cancelled" && l.status !== "sold-out")
    .reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
}

/** Trạng thái hiển thị của bàn: phiên "open" -> "serving", "paid" -> "paid"
 * (còn ngồi, chờ đóng bàn), ngược lại lấy state gốc. */
export function getTableState(tableId: string): TableDisplayState {
  const s = occupyingSessionForTable(tableId);
  if (s) return s.status === "paid" ? "paid" : "serving";
  return floorTables.find((t) => t.id === tableId)?.state ?? "available";
}

/** Thông tin bàn đang có khách (open hoặc paid), null nếu bàn trống. */
export function getTableInfo(
  tableId: string,
): { guests: number; elapsedMinutes: number; amount: number } | null {
  const session = occupyingSessionForTable(tableId);
  if (!session) return null;
  return {
    guests: session.guests,
    elapsedMinutes: minutesSince(session.openedAt),
    amount: calcSessionTotal(session.id),
  };
}

/** Trạng thái order suy ra từ các OrderLine của nó. */
export function getOrderStatus(orderId: string): OrderStatus {
  const lines = orderLines.filter((l) => l.orderId === orderId);
  if (lines.length === 0) return "sent";
  if (lines.every((l) => l.status === "cancelled")) return "cancelled";
  const active = lines.filter((l) => l.status !== "cancelled" && l.status !== "sold-out");
  if (active.length > 0 && active.every((l) => l.status === "served")) return "done";
  if (active.some((l) => l.status === "cooking" || l.status === "done")) return "processing";
  return "sent";
}

/** "Bếp làm xong": mọi dòng còn hiệu lực đã "done" trở đi (done hoặc served). */
export function isOrderCooked(orderId: string, lines = orderLines): boolean {
  const active = lines.filter(
    (l) => l.orderId === orderId && l.status !== "cancelled" && l.status !== "sold-out",
  );
  return active.length > 0 && active.every((l) => l.status === "done" || l.status === "served");
}

/** "Waiter đã bưng xong": mọi dòng còn hiệu lực đã "served". */
export function isOrderServed(orderId: string, lines = orderLines): boolean {
  const active = lines.filter(
    (l) => l.orderId === orderId && l.status !== "cancelled" && l.status !== "sold-out",
  );
  return active.length > 0 && active.every((l) => l.status === "served");
}

/* ====================================================================
 * Phân quyền theo chi nhánh (Bước 3)
 * ==================================================================== */

/** Chi nhánh Branch Manager đang đăng nhập. Tạm hardcode Quận 1. */
export const currentBranchId = "BR-Q1";

/** Tên rút gọn của chi nhánh, ví dụ "Chi nhánh Quận 1" -> "Quận 1". */
export const branchShortName = (branchId: string) =>
  branches.find((b) => b.id === branchId)?.name.replace("Chi nhánh ", "") ?? branchId;

/** Tài khoản Branch Manager — một chi nhánh có thể có nhiều tài khoản (trực ca). */
export type BranchManagerAccount = {
  id: string;
  name: string;
  email: string;
  branchId: string;
  status: "active" | "locked";
};

export const branchManagerAccounts: BranchManagerAccount[] = [
  { id: "BM-01", name: "Trần Minh Quân", email: "quan.tran@comtam.vn", branchId: "BR-Q1", status: "active" },
  { id: "BM-02", name: "Lê Thị Hồng", email: "hong.le@comtam.vn", branchId: "BR-Q1", status: "active" },
  { id: "BM-03", name: "Ngô Gia Bảo", email: "bao.ngo@comtam.vn", branchId: "BR-Q7", status: "active" },
  { id: "BM-04", name: "Huỳnh Tấn Phát", email: "phat.huynh@comtam.vn", branchId: "BR-TD", status: "locked" },
];

/** Lượt khách hôm nay theo chi nhánh — số liệu ngày, không suy ra từ dữ liệu order. */
export const guestsTodayByBranch: Record<string, number> = {
  "BR-Q1": 342,
  "BR-Q7": 210,
  "BR-TD": 0,
};

/* ---- Số liệu suy dẫn cho dashboard ---- */

/**
 * Doanh thu của một chi nhánh = tổng calcSessionTotal() của các phiên đã trả tiền
 * (status "paid" đang chờ đóng bàn, HOẶC "closed" đã đóng). Dùng unitPrice tại
 * thời điểm bán, không phụ thuộc giá hiện tại.
 */
export function calcBranchRevenue(branchId: string): number {
  return tableSessions
    .filter((s) => s.branchId === branchId && (s.status === "paid" || s.status === "closed"))
    .reduce((sum, s) => sum + calcSessionTotal(s.id), 0);
}

/** Doanh thu toàn chuỗi = cộng dồn mọi chi nhánh. */
export function calcChainRevenue(): number {
  return branches.reduce((sum, b) => sum + calcBranchRevenue(b.id), 0);
}

/** Doanh thu hôm nay của chi nhánh (alias). */
export const branchRevenueToday = calcBranchRevenue;

/** Doanh thu hôm nay toàn chuỗi (alias). */
export const chainRevenueToday = calcChainRevenue;

/** Món bán chạy nhất tại một chi nhánh (dựa trên sold của BranchMenuItem). */
export function bestSellerBranch(branchId: string): { name: string; sold: number } | null {
  const nameById = new Map(menuItems.map((m) => [m.id, m.name]));
  const rows = branchMenuItems.filter((b) => b.branchId === branchId && b.sold > 0);
  if (rows.length === 0) return null;
  const top = rows.reduce((a, b) => (b.sold > a.sold ? b : a));
  return { name: nameById.get(top.menuItemId) ?? top.menuItemId, sold: top.sold };
}

/** Món bán chạy nhất toàn chuỗi (gộp sold mọi chi nhánh). */
export function bestSellerChain(): { name: string; sold: number } | null {
  const nameById = new Map(menuItems.map((m) => [m.id, m.name]));
  const totals = new Map<string, number>();
  for (const b of branchMenuItems) {
    totals.set(b.menuItemId, (totals.get(b.menuItemId) ?? 0) + b.sold);
  }
  let best: { id: string; sold: number } | null = null;
  for (const [id, sold] of totals) {
    if (!best || sold > best.sold) best = { id, sold };
  }
  return best ? { name: nameById.get(best.id) ?? best.id, sold: best.sold } : null;
}

/** So sánh doanh thu hôm nay giữa các chi nhánh (triệu ₫) — cho biểu đồ Owner. */
export const revenueComparison = () =>
  branches.map((b) => ({
    name: branchShortName(b.id),
    value: Math.round((calcBranchRevenue(b.id) / 1_000_000) * 10) / 10,
  }));

/** Nhân viên thuộc một chi nhánh. */
export const staffByBranch = (branchId: string) =>
  staff.filter((s) => s.branch === branchShortName(branchId));

/** Phiên bàn của một chi nhánh, lọc thêm theo trạng thái nếu truyền vào. */
export const sessionsForBranch = (branchId: string, status?: TableSession["status"]) =>
  tableSessions.filter(
    (s) => s.branchId === branchId && (status ? s.status === status : true),
  );

/** Số bàn đang phục vụ tại chi nhánh (gộp cả bàn ghép). */
export const servingTableCount = (branchId: string) =>
  sessionsForBranch(branchId, "open").reduce((n, s) => n + s.tableIds.length, 0);

/** Số món đang chờ bếp xử lý (queued / cooking) tại chi nhánh. */
export const pendingKitchenCount = (branchId: string) =>
  kitchenQueue(branchId).filter((t) => t.status === "queued" || t.status === "cooking").length;

/** Chi tiết hoá đơn của một phiên: gộp mọi order, bỏ dòng cancelled/sold-out. */
export function getSessionBill(
  sessionId: string,
): { orderId: string; createdAt: string; lines: OrderLine[] }[] {
  return orders
    .filter((o) => o.sessionId === sessionId)
    .map((o) => ({
      orderId: o.id,
      createdAt: o.createdAt,
      lines: orderLines.filter(
        (l) => l.orderId === o.id && l.status !== "cancelled" && l.status !== "sold-out",
      ),
    }))
    .filter((g) => g.lines.length > 0);
}
