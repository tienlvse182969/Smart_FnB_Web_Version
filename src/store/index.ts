/**
 * Global Zustand Store cho Smart FnB.
 * Quản lý Auth, Branch context, và Dữ liệu vận hành (bàn, order, menu, thanh toán).
 * Đồng bộ real-time giữa các tab qua BroadcastChannel.
 */
import { create } from "zustand";
import type {
  AuthUser,
  Branding,
  Branch,
  BranchMenuItem,
  CartItem,
  DemoAccount,
  FloorTable,
  MenuItem,
  OrderLineStatus,
  TableSession,
  WorkSession,
} from "../types";
import {
  loginWithPassword,
  restoreSession,
  logoutSession,
} from "../services/authApi";
import { setSessionExpiredHandler } from "../services/http";
import {
  getDemoAccounts,
  getTenantBranding,
  updateBranding as serviceUpdateBranding,
  resetBranding as serviceResetBranding,
  changePassword as serviceChangePassword,
  getFloorTables,
  createTable as serviceCreateTable,
  setTableLocked as serviceSetTableLocked,
  setAdjacent as serviceSetAdjacent,
  listMenuItems,
  listBranchMenuItems,
  updateRemaining as serviceUpdateRemaining,
  listSessions,
  openSession as serviceOpenSession,
  closeSession as serviceCloseSession,
  cancelSession as serviceCancelSession,
  requestPayment as serviceRequestPayment,
  submitOrder as serviceSubmitOrder,
  type SubmitOrderResult,
  updateLineStatus as serviceUpdateLineStatus,
  markLineDone as serviceMarkLineDone,
  reportSoldOut as serviceReportSoldOut,
  claimLine as serviceClaimLine,
  markLineServed as serviceMarkLineServed,
  createPayment as serviceCreatePayment,
  confirmPayment as serviceConfirmPayment,
  toggleBranchMenuItem as serviceToggleBranchMenuItem,
  listBranchOrderLines,
  type BranchOrderLine,
  listStaff,
  createStaffAccount as serviceCreateStaffAccount,
  setStaffShift as serviceSetStaffShift,
  setStaffActive as serviceSetStaffActive,
  type StaffLegacy,
  listWorkSessions,
} from "../services";
import {
  listChains,
  listBranches as apiListBranches,
  createBranch as apiCreateBranch,
  updateBranch as apiUpdateBranch,
  updateBranchStatus as apiUpdateBranchStatus,
  type ApiBranch,
  type ApiPlan,
  type ApiQuota,
} from "../services/branchApi";
import {
  listTables,
  createTable as apiCreateTable,
  updateTableStatus as apiUpdateTableStatus,
  replaceTableAdjacency,
  type ApiTable,
  type ApiTableStatus,
  type CreateTableInput,
} from "../services/tablesApi";
import {
  listBranchPayments,
  confirmPayment as apiConfirmPayment,
  type ApiPayment,
  type ListPaymentsParams,
} from "../services/paymentsApi";
import { getAuthContext } from "../services/authApi";
import { ENABLE_STAFF_APPS } from "../config";
import {
  registerRealScope,
  clearRealScope,
  toMockBranchId,
  toMockTenantId,
} from "../services/mockBridge";
import {
  claimOperationalLine,
  loadOperationalData,
  readyOperationalItem,
  serveOperationalLine,
  startOperationalItem,
  submitOperationalOrder,
  unavailableOperationalItem,
} from "../services/operational-api";
import { seedAll } from "../mock/seed";
import { broadcast } from "./broadcast";
import { toUiBranch, toApiStatus } from "./branchMapping";

export type ScopeStatus = "idle" | "loading" | "ready" | "error";
export type LoadStatus = "idle" | "loading" | "ready" | "error";

/** Địa chỉ gửi lên backend theo hai cấp: không còn `district`. */
export interface BranchFormData {
  code: string;
  name: string;
  addressLine1: string;
  ward: string;
  city: string;
  phone: string;
  openTime?: string;
  closeTime?: string;
}

export interface AppState {
  // Auth state
  currentUser: AuthUser | null;
  tenantBranding: Branding | null;
  demoAccounts: DemoAccount[];
  isBootstrapped: boolean;
  isLoading: boolean;

  /** Phạm vi thật lấy từ backend sau khi đăng nhập. */
  scopeStatus: ScopeStatus;
  scopeError: string | null;
  /** UUID chuỗi thật. null với ADMIN (không thuộc chuỗi nào). */
  chainId: string | null;
  chainName: string | null;
  /** Gói dịch vụ và hạn mức — chỉ OWNER đọc được, MANAGER nhận 403 nên để null. */
  plan: ApiPlan | null;
  quotas: ApiQuota[];
  /** Chi nhánh thật, nguyên dạng backend trả về. */
  apiBranches: ApiBranch[];

  /** Sơ đồ bàn thật của chi nhánh đang chọn. */
  apiTables: ApiTable[];
  tablesStatus: LoadStatus;
  tablesError: string | null;

  /** Lịch sử giao dịch thật của chi nhánh đang chọn. */
  branchPayments: ApiPayment[];
  paymentsTotal: number;
  paymentsStatus: LoadStatus;
  paymentsError: string | null;

  // Operational State
  /** Chi nhánh theo hình dạng UI, ánh xạ từ `apiBranches`. */
  branches: Branch[];
  /** UUID chi nhánh thật đang chọn. */
  currentBranchId: string | null;
  tables: FloorTable[];
  sessions: TableSession[];
  menuItems: MenuItem[];
  branchMenuItems: BranchMenuItem[];
  orderLines: BranchOrderLine[];
  staff: StaffLegacy[];
  /** Lượt làm việc hôm nay của chi nhánh — dùng để lọc thông báo theo BR-43 (chỉ người đang inShift). */
  workSessions: WorkSession[];

  // Actions
  bootstrap: () => Promise<void>;
  /** Đăng nhập thật qua backend bằng email + mật khẩu. */
  login: (email: string, password: string) => Promise<AuthUser>;
  /** Đổi mật khẩu tài khoản đang đăng nhập (bắt buộc lần đầu — CM-01). */
  changePassword: (newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  switchBranch: (branchId: string) => Promise<void>;
  refreshOperationalData: () => Promise<void>;
  /** Nạp chuỗi + chi nhánh thật của người đang đăng nhập. */
  loadScope: () => Promise<void>;
  /** Nạp sơ đồ bàn thật của chi nhánh đang chọn. */
  loadTables: () => Promise<void>;
  /** Nạp lịch sử giao dịch thật; bộ lọc theo `createdAt` phía backend. */
  loadPayments: (params?: ListPaymentsParams) => Promise<void>;
  createBranchTable: (input: CreateTableInput) => Promise<void>;
  setTableStatus: (tableId: string, status: ApiTableStatus) => Promise<void>;
  setTableAdjacency: (tableId: string, adjacentTableIds: string[]) => Promise<void>;
  confirmBranchPayment: (paymentId: string) => Promise<void>;

  // Chi nhánh (Owner — mục 4.4.A, OW-01)
  createBranch: (data: BranchFormData) => Promise<void>;
  updateBranch: (id: string, data: Partial<BranchFormData> & { status?: "open" | "closed" | "suspended" }) => Promise<void>;

  // Operations
  openTable: (tableIds: string[], guests: number) => Promise<TableSession>;
  closeSession: (sessionId: string) => Promise<void>;
  /** Huỷ phiên khi khách bỏ về trước khi gọi món (mục 5.4) — chỉ khi chưa có order. */
  cancelSession: (sessionId: string) => Promise<void>;
  submitOrder: (sessionId: string, cart: CartItem[]) => Promise<SubmitOrderResult>;
  updateLineStatus: (
    lineId: string,
    status: Exclude<OrderLineStatus, "done" | "sold_out">
  ) => Promise<void>;
  markLineDone: (lineId: string) => Promise<void>;
  reportSoldOut: (lineId: string) => Promise<void>;
  claimLine: (lineId: string) => Promise<void>;
  markLineServed: (lineId: string) => Promise<void>;
  /** Waiter báo quầy tính tiền — không chọn hình thức (BR-13). */
  requestPayment: (sessionId: string) => Promise<void>;
  /** Branch Manager sinh QR/ghi nhận tiền mặt cho phiên bàn (BR-13). */
  collectPayment: (
    sessionId: string,
    amount: number,
    method: "qr" | "cash",
    collectedBy?: string
  ) => Promise<void>;
  confirmPayment: (paymentId: string) => Promise<void>;
  toggleMenuItemAvailability: (
    menuItemId: string,
    isAvailable: boolean
  ) => Promise<void>;
  /** Branch Manager/Kitchen sửa số suất còn lại của món tại chi nhánh. */
  updateRemainingToday: (menuItemId: string, remainingToday: number | null) => Promise<void>;

  /** Owner lưu nhận diện riêng (BR-28/29) — phát broadcast cho các tab cùng tenant. */
  updateBranding: (data: { primaryColor: string; accentColor: string; displayName: string; logoUrl?: string }) => Promise<void>;
  /** Owner khôi phục về theme đơn sắc mặc định của nền tảng. */
  resetBranding: () => Promise<void>;

  // Sơ đồ bàn (Branch Manager, chế độ Quản trị — mục 4.5.F)
  createFloorTable: (id: string, area: string, seats: number) => Promise<void>;
  toggleTableLock: (tableId: string) => Promise<void>;
  toggleAdjacentTables: (tableIdA: string, tableIdB: string) => Promise<void>;

  // Nhân sự (Branch Manager — mục 4.5.H)
  createStaffAccount: (name: string, email: string, role: "Waiter" | "Kitchen") => Promise<void>;
  setStaffShift: (id: string, onShift: boolean) => Promise<void>;
  setStaffActive: (id: string, active: boolean) => Promise<void>;
}

/**
 * StrictMode gọi effect hai lần. Refresh token của backend xoay vòng và chỉ
 * dùng được một lần, nên hai lượt bootstrap song song sẽ làm lượt sau thất bại
 * và đá người dùng ra /login. Giữ đúng một promise duy nhất.
 */
let bootstrapPromise: Promise<void> | null = null;

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: null,
  tenantBranding: null,
  demoAccounts: [],
  isBootstrapped: false,
  isLoading: false,

  scopeStatus: "idle",
  scopeError: null,
  chainId: null,
  chainName: null,
  plan: null,
  quotas: [],
  apiBranches: [],

  apiTables: [],
  tablesStatus: "idle",
  tablesError: null,
  branchPayments: [],
  paymentsTotal: 0,
  paymentsStatus: "idle",
  paymentsError: null,

  branches: [],
  currentBranchId: null,
  tables: [],
  sessions: [],
  menuItems: [],
  branchMenuItems: [],
  orderLines: [],
  staff: [],
  workSessions: [],

  bootstrap: async () => {
    if (bootstrapPromise) return bootstrapPromise;
    bootstrapPromise = (async () => {
      seedAll();

      setSessionExpiredHandler(() => {
        void useAppStore.getState().logout();
      });

      // Khôi phục phiên từ refresh token đã lưu — F5 không văng ra /login.
      const savedUser = await restoreSession();

      // `restoreSession()` đã tự kiểm tra refresh token, nên không cần chốt
      // `hasAccessToken()` như nhánh main — web không còn lưu `smartfnb_auth_user`.
      const demoAccs = await getDemoAccounts();
      let branding: Branding | null = null;
      if (savedUser?.tenantId) {
        branding = await getTenantBranding(savedUser.tenantId);
      }

      set({
        demoAccounts: demoAccs,
        currentUser: savedUser,
        tenantBranding: branding,
        isBootstrapped: true,
      });

      if (savedUser) {
        await get().loadScope();
      }

      // Subscribe to cross-tab broadcast
      broadcast.subscribe((msg) => {
        if (msg.type === "REFETCH_ALL") {
          get().refreshOperationalData();
        }
        if (msg.type === "BRANDING_UPDATED") {
          const { currentUser } = get();
          // Chỉ áp lại theme cho tab của ĐÚNG tenant vừa đổi nhận diện.
          if (currentUser?.tenantId === msg.tenantId) {
            getTenantBranding(msg.tenantId).then((branding) => {
              set({ tenantBranding: branding });
            });
          }
        }
      });
    })();
    return bootstrapPromise;
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const user = await loginWithPassword(email, password);
      set({ currentUser: user, isLoading: false });
      await get().loadScope();
      return user;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  loadScope: async () => {
    const { currentUser } = get();
    if (!currentUser) return;

    // ADMIN quản trị nền tảng, không thuộc chuỗi nào — backend trả 403 cho cả
    // /restaurant-chains lẫn /branches, nên không gọi.
    if (currentUser.role === "admin") {
      clearRealScope();
      set({
        scopeStatus: "ready",
        scopeError: null,
        chainId: null,
        chainName: null,
        plan: null,
        quotas: [],
        apiBranches: [],
        branches: [],
        currentBranchId: null,
      });
      return;
    }

    set({ scopeStatus: "loading", scopeError: null });
    try {
      // Phạm vi lấy thẳng từ /auth/me: `chainId` cho nhân viên, `chainIds[]`
      // cho OWNER. /branches chỉ còn dùng để lấy DANH SÁCH chi nhánh, không
      // còn phải suy ngược ra chuỗi từ đó nữa.
      const auth = await getAuthContext();
      // Chỉ OWNER đọc được /restaurant-chains — cần cho tên chuỗi, gói và hạn mức.
      const chains = currentUser.role === "owner" ? await listChains() : [];
      const apiBranches = await apiListBranches();

      // Owner có thể được gán nhiều chuỗi. Chưa có bộ chọn chuỗi, nên lấy
      // chuỗi đầu tiên CÓ chi nhánh đang hoạt động — chuỗi rỗng hoặc đã đóng
      // hết chi nhánh sẽ chỉ dẫn tới màn hình trắng.
      const ownedChainIds = auth.chainIds.length
        ? auth.chainIds
        : chains.map((chain) => chain.id);
      const chainIdWithActiveBranch = ownedChainIds.find((id) =>
        apiBranches.some((branch) => branch.chainId === id && branch.status === "ACTIVE"),
      );

      const chainId =
        auth.chainId ?? chainIdWithActiveBranch ?? ownedChainIds[0] ?? apiBranches[0]?.chainId ?? null;

      if (!chainId) {
        throw new Error(
          currentUser.role === "owner"
            ? "Tài khoản chưa được gán chuỗi nhà hàng nào."
            : "Tài khoản chưa được gán chi nhánh nào.",
        );
      }

      const primaryChain = chains.find((chain) => chain.id === chainId);
      const chainName =
        primaryChain?.name ??
        apiBranches.find((branch) => branch.chainId === chainId)?.chain.name ??
        null;

      const chainIds = ownedChainIds.length ? ownedChainIds : [chainId];
      registerRealScope(chainIds, apiBranches);

      const mockTenantId = toMockTenantId(chainId);
      // Nhân viên bị khoá vào chi nhánh được gán; Owner giữ lựa chọn hiện tại.
      const realBranchId =
        auth.branchId ?? get().currentBranchId ?? apiBranches[0]?.id ?? null;
      const activeBranchId = apiBranches.some((b) => b.id === realBranchId)
        ? realBranchId
        : (apiBranches[0]?.id ?? null);

      set({
        scopeStatus: "ready",
        scopeError: null,
        chainId,
        chainName,
        plan: primaryChain?.subscription?.plan ?? null,
        quotas: primaryChain?.subscription?.quotas ?? [],
        apiBranches,
        branches: apiBranches.map((b) => toUiBranch(b, toMockTenantId(b.chainId))),
        currentBranchId: activeBranchId,
        currentUser: {
          ...currentUser,
          tenantId: mockTenantId,
          branchId: toMockBranchId(activeBranchId),
        },
      });

      set({ tenantBranding: await getTenantBranding(mockTenantId) });
      await Promise.all([
        get().refreshOperationalData(),
        get().loadTables(),
        get().loadPayments(),
      ]);
    } catch (err) {
      clearRealScope();
      set({
        scopeStatus: "error",
        scopeError: err instanceof Error ? err.message : "Không tải được phạm vi làm việc",
      });
    }
  },

  changePassword: async (newPassword: string) => {
    const { currentUser } = get();
    if (!currentUser) return;
    await serviceChangePassword(currentUser.id, newPassword);
    set({ currentUser: { ...currentUser, mustChangePassword: false } });
  },

  loadTables: async () => {
    const branchId = get().currentBranchId;
    if (!branchId) {
      set({ apiTables: [], tablesStatus: "ready", tablesError: null });
      return;
    }
    set({ tablesStatus: "loading", tablesError: null });
    try {
      set({ apiTables: await listTables(branchId), tablesStatus: "ready" });
    } catch (err) {
      set({
        apiTables: [],
        tablesStatus: "error",
        tablesError: err instanceof Error ? err.message : "Không tải được sơ đồ bàn",
      });
    }
  },

  loadPayments: async (params = {}) => {
    const branchId = get().currentBranchId;
    if (!branchId) {
      set({ branchPayments: [], paymentsTotal: 0, paymentsStatus: "ready", paymentsError: null });
      return;
    }
    set({ paymentsStatus: "loading", paymentsError: null });
    try {
      const page = await listBranchPayments(branchId, { limit: 100, ...params });
      set({ branchPayments: page.items, paymentsTotal: page.total, paymentsStatus: "ready" });
    } catch (err) {
      set({
        branchPayments: [],
        paymentsTotal: 0,
        paymentsStatus: "error",
        paymentsError: err instanceof Error ? err.message : "Không tải được lịch sử giao dịch",
      });
    }
  },

  createBranchTable: async (input) => {
    const branchId = get().currentBranchId;
    if (!branchId) throw new Error("Chưa chọn chi nhánh");
    await apiCreateTable(branchId, input);
    await get().loadTables();
  },

  setTableStatus: async (tableId, status) => {
    await apiUpdateTableStatus(tableId, status);
    await get().loadTables();
  },

  setTableAdjacency: async (tableId, adjacentTableIds) => {
    const branchId = get().currentBranchId;
    if (!branchId) throw new Error("Chưa chọn chi nhánh");
    await replaceTableAdjacency(branchId, tableId, adjacentTableIds);
    await get().loadTables();
  },

  confirmBranchPayment: async (paymentId) => {
    await apiConfirmPayment(paymentId);
    await get().loadPayments();
  },

  createBranch: async (data) => {
    const { chainId } = get();
    if (!chainId) throw new Error("Chưa xác định được chuỗi nhà hàng");

    await apiCreateBranch(chainId, {
      code: data.code,
      name: data.name,
      addressLine1: data.addressLine1,
      ward: data.ward || undefined,
      city: data.city,
      phone: data.phone || undefined,
      openTime: data.openTime || undefined,
      closeTime: data.closeTime || undefined,
    });

    await get().loadScope();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  updateBranch: async (id, data) => {
    const { status, ...fields } = data;
    const patch = {
      ...(fields.code !== undefined ? { code: fields.code } : {}),
      ...(fields.name !== undefined ? { name: fields.name } : {}),
      ...(fields.phone !== undefined ? { phone: fields.phone } : {}),
      ...(fields.addressLine1 !== undefined ? { addressLine1: fields.addressLine1 } : {}),
      ...(fields.ward !== undefined ? { ward: fields.ward } : {}),
      ...(fields.city !== undefined ? { city: fields.city } : {}),
    };
    if (Object.keys(patch).length) await apiUpdateBranch(id, patch);
    if (status) await apiUpdateBranchStatus(id, toApiStatus(status));

    await get().loadScope();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  logout: async () => {
    // `logoutSession()` thu hồi phiên ở backend rồi xoá cả access lẫn refresh
    // token, nên đã bao gồm việc `clearAccessToken()` của nhánh main làm.
    await logoutSession();
    clearRealScope();
    set({
      currentUser: null,
      tenantBranding: null,
      scopeStatus: "idle",
      scopeError: null,
      chainId: null,
      chainName: null,
      plan: null,
      quotas: [],
      apiBranches: [],
      apiTables: [],
      tablesStatus: "idle",
      tablesError: null,
      branchPayments: [],
      paymentsTotal: 0,
      paymentsStatus: "idle",
      paymentsError: null,
      branches: [],
      currentBranchId: null,
      tables: [],
      sessions: [],
      orderLines: [],
      staff: [],
      workSessions: [],
    });
  },

  switchBranch: async (branchId: string) => {
    const { currentUser } = get();
    set({
      currentBranchId: branchId,
      currentUser: currentUser ? { ...currentUser, branchId: toMockBranchId(branchId) } : null,
    });
    await Promise.all([get().refreshOperationalData(), get().loadTables(), get().loadPayments()]);
  },

  refreshOperationalData: async () => {
    const { currentUser, currentBranchId } = get();
    if (!currentUser) return;

    // Luồng Waiter/Kitchen của nhánh main. Đăng nhập hiện tại không đặt
    // `apiBacked` nên nhánh này không chạy — giữ lại để bật lại dễ khi mở
    // lại hai phân hệ đó trên web.
    if (currentUser.apiBacked) {
      const data = await loadOperationalData(currentUser);
      set({ ...data, currentBranchId: currentUser.branchId });
      return;
    }

    // Chi nhánh giờ lấy từ API thật (loadScope), không đọc mock nữa. Các phân
    // hệ bên dưới còn mock nên phải đổi sang ID mock qua cầu nối.
    const activeBranchId = toMockBranchId(currentBranchId);

    let tables: FloorTable[] = [];
    let sessions: TableSession[] = [];
    let menu: MenuItem[] = [];
    let branchMenu: BranchMenuItem[] = [];
    let lines: BranchOrderLine[] = [];
    let staff: StaffLegacy[] = [];
    let workSessions: WorkSession[] = [];

    if (currentUser.tenantId) {
      menu = await listMenuItems(currentUser.tenantId, currentUser.role);
    }

    if (activeBranchId) {
      branchMenu = await listBranchMenuItems(activeBranchId);
      lines = await listBranchOrderLines(activeBranchId, currentUser.role);
      staff = await listStaff(activeBranchId);
      workSessions = await listWorkSessions(activeBranchId);

      // Bàn và phiên bàn dạng mock giờ chỉ phục vụ màn Waiter/Kitchen — hai
      // phân hệ đã chuyển sang tablet và đang bị ẩn sau cờ. Màn Branch Manager
      // đọc bàn thật qua `apiTables`; thanh toán mock đã bỏ hẳn vì
      // `branchPayments` lấy từ API thật.
      if (ENABLE_STAFF_APPS) {
        tables = await getFloorTables(activeBranchId);
        sessions = await listSessions(activeBranchId);
      }
    }

    set({
      tables,
      sessions,
      menuItems: menu,
      branchMenuItems: branchMenu,
      orderLines: lines,
      staff,
      workSessions,
    });
  },

  openTable: async (tableIds: string[], guests: number) => {
    const { currentUser, currentBranchId } = get();
    if (!currentUser || !currentUser.tenantId || !currentBranchId) {
      throw new Error("Chưa đăng nhập hoặc chưa chọn chi nhánh");
    }

    const session = await serviceOpenSession(
      currentUser.tenantId!,
      currentBranchId!,
      tableIds,
      guests,
      currentUser.name
    );

    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
    return session;
  },

  closeSession: async (sessionId: string) => {
    await serviceCloseSession(sessionId);
    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  cancelSession: async (sessionId: string) => {
    await serviceCancelSession(sessionId);
    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  submitOrder: async (sessionId: string, cart: CartItem[]) => {
    const { currentUser, currentBranchId } = get();
    if (!currentUser || (!currentUser.apiBacked && (!currentUser.tenantId || !currentBranchId))) {
      throw new Error("Chưa xác thực");
    }

    if (currentUser.apiBacked) {
      const result = await submitOperationalOrder(sessionId, cart);
      await get().refreshOperationalData();
      return result;
    }

    const result = await serviceSubmitOrder(
      currentUser.tenantId!,
      currentBranchId!,
      sessionId,
      currentUser.name,
      cart
    );

    if (result.ok) {
      await get().refreshOperationalData();
      broadcast.send({ type: "REFETCH_ALL" });
    }
    return result;
  },

  updateLineStatus: async (
    lineId: string,
    status: Exclude<OrderLineStatus, "done" | "sold_out">
  ) => {
    if (get().currentUser?.apiBacked) {
      if (status !== "cooking") throw new Error("Chuyển trạng thái này chưa được API hỗ trợ");
      await startOperationalItem(lineId);
      await get().refreshOperationalData();
      return;
    }
    await serviceUpdateLineStatus(lineId, status);
    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  markLineDone: async (lineId: string) => {
    const { currentUser, currentBranchId } = get();
    if (!currentUser) return;
    if (currentUser.apiBacked) {
      await readyOperationalItem(lineId);
      await get().refreshOperationalData();
      return;
    }
    if (!currentUser.tenantId || !currentBranchId) return;

    await serviceMarkLineDone(lineId, currentUser.tenantId, currentBranchId);
    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  reportSoldOut: async (lineId: string) => {
    const { currentUser, currentBranchId } = get();
    if (!currentUser) return;
    if (currentUser.apiBacked) {
      await unavailableOperationalItem(lineId);
      await get().refreshOperationalData();
      return;
    }
    if (!currentUser.tenantId || !currentBranchId) return;

    await serviceReportSoldOut(lineId, currentUser.tenantId, currentBranchId, currentUser.name);
    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  claimLine: async (lineId: string) => {
    const { currentUser } = get();
    if (!currentUser) return;

    if (currentUser.apiBacked) {
      await claimOperationalLine(lineId);
      await get().refreshOperationalData();
      return;
    }

    await serviceClaimLine(lineId, currentUser.name);

    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  markLineServed: async (lineId: string) => {
    if (get().currentUser?.apiBacked) {
      await serveOperationalLine(lineId);
      await get().refreshOperationalData();
      return;
    }
    await serviceMarkLineServed(lineId);
    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  requestPayment: async (sessionId: string) => {
    await serviceRequestPayment(sessionId);
    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  collectPayment: async (
    sessionId: string,
    amount: number,
    method: "qr" | "cash",
    collectedBy?: string
  ) => {
    const { currentUser, currentBranchId } = get();
    if (!currentUser || !currentUser.tenantId || !currentBranchId) return;

    await serviceCreatePayment(
      currentUser.tenantId,
      currentBranchId,
      sessionId,
      amount,
      method,
      currentUser.role,
      collectedBy
    );

    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  confirmPayment: async (paymentId: string) => {
    const { currentUser } = get();
    if (!currentUser) return;

    await serviceConfirmPayment(paymentId, currentUser.name, currentUser.role);
    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  toggleMenuItemAvailability: async (
    menuItemId: string,
    isAvailable: boolean
  ) => {
    const { currentBranchId, currentUser } = get();
    if (!currentBranchId || !currentUser) return;

    await serviceToggleBranchMenuItem(currentBranchId, menuItemId, isAvailable, currentUser.role);
    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  updateRemainingToday: async (menuItemId: string, remainingToday: number | null) => {
    const { currentBranchId, currentUser } = get();
    if (!currentBranchId || !currentUser) return;

    await serviceUpdateRemaining(currentBranchId, menuItemId, remainingToday, currentUser.role);
    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  createFloorTable: async (id: string, area: string, seats: number) => {
    const { currentBranchId } = get();
    if (!currentBranchId) return;

    await serviceCreateTable(currentBranchId, id, area, seats);
    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  toggleTableLock: async (tableId: string) => {
    const { tables } = get();
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    await serviceSetTableLocked(tableId, table.status !== "locked");
    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  toggleAdjacentTables: async (tableIdA: string, tableIdB: string) => {
    const { tables } = get();
    const a = tables.find((t) => t.id === tableIdA);
    if (!a) return;
    const linked = a.adjacentTableIds.includes(tableIdB);

    await serviceSetAdjacent(tableIdA, tableIdB, !linked);
    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  createStaffAccount: async (name: string, email: string, role: "Waiter" | "Kitchen") => {
    const { currentUser, currentBranchId } = get();
    if (!currentUser?.tenantId || !currentBranchId) return;

    await serviceCreateStaffAccount(currentUser.tenantId, currentBranchId, name, email, role);
    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  setStaffShift: async (id: string, onShift: boolean) => {
    await serviceSetStaffShift(id, onShift);
    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  setStaffActive: async (id: string, active: boolean) => {
    await serviceSetStaffActive(id, active);
    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  updateBranding: async (data) => {
    const { currentUser } = get();
    if (!currentUser?.tenantId) return;

    const branding = await serviceUpdateBranding(currentUser.tenantId, data, currentUser.email);
    set({ tenantBranding: branding });
    broadcast.send({ type: "BRANDING_UPDATED", tenantId: currentUser.tenantId });
  },

  resetBranding: async () => {
    const { currentUser } = get();
    if (!currentUser?.tenantId) return;

    const branding = await serviceResetBranding(currentUser.tenantId, currentUser.email);
    set({ tenantBranding: branding });
    broadcast.send({ type: "BRANDING_UPDATED", tenantId: currentUser.tenantId });
  },
}));
