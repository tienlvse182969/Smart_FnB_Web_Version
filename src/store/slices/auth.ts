/**
 * Phiên đăng nhập và phạm vi làm việc (CM-01).
 * `loadScope` nạp phạm vi (chi nhánh), branding, gói; sau đó nạp menu và nhân sự
 * của chi nhánh đang chọn.
 */
import type { AuthUser, Branding, DemoAccount } from "../../types";
import { loginWithPassword, restoreSession, logoutSession, getAuthContext } from "../../services/authApi";
import { clearTokens, setSessionExpiredHandler } from "../../services/http";
import { getDemoAccounts, getTenantBranding, changePassword as serviceChangePassword } from "../../services";
import { listChains, listBranches as apiListBranches } from "../../services/branchApi";
import { registerRealScope, clearRealScope, toMockBranchId, toMockTenantId } from "../../services/mockBridge";
import { seedAll } from "../../mock/seed";
import { broadcast } from "../broadcast";
import { toUiBranch } from "../branchMapping";
import type { AppState, ScopeStatus, SliceCreator } from "../types";

export interface AuthSlice {
  currentUser: AuthUser | null;
  demoAccounts: DemoAccount[];
  isBootstrapped: boolean;
  isLoading: boolean;

  /** Phạm vi thật lấy từ backend sau khi đăng nhập. */
  scopeStatus: ScopeStatus;
  scopeError: string | null;
  /** UUID chuỗi thật. null với ADMIN (không thuộc chuỗi nào). */
  chainId: string | null;
  chainName: string | null;

  bootstrap: () => Promise<void>;
  /** Đăng nhập thật qua backend bằng email + mật khẩu. */
  login: (email: string, password: string) => Promise<AuthUser>;
  /** Đổi mật khẩu tài khoản đang đăng nhập (bắt buộc lần đầu — CM-01). */
  changePassword: (newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Nạp chuỗi + chi nhánh thật của người đang đăng nhập. */
  loadScope: () => Promise<void>;
}

/**
 * StrictMode gọi effect hai lần. Refresh token của backend xoay vòng và chỉ
 * dùng được một lần, nên hai lượt bootstrap song song sẽ làm lượt sau thất bại
 * và đá người dùng ra /login. Giữ đúng một promise duy nhất.
 */
let bootstrapPromise: Promise<void> | null = null;

/** Trạng thái sau khi phiên kết thúc — dùng cho cả đăng xuất ở tab này lẫn tab khác. */
function emptySession(): Partial<AppState> {
  return {
    currentUser: null,
    tenantBranding: null,
    scopeStatus: "idle",
    scopeError: null,
    chainId: null,
    chainName: null,
    plan: null,
    quotas: [],
    apiBranches: [],
    branches: [],
    currentBranchId: null,
    menuItems: [],
    branchMenuItems: [],
    staff: [],
  };
}

export const createAuthSlice: SliceCreator<AuthSlice> = (set, get) => ({
  currentUser: null,
  demoAccounts: [],
  isBootstrapped: false,
  isLoading: false,

  scopeStatus: "idle",
  scopeError: null,
  chainId: null,
  chainName: null,

  bootstrap: async () => {
    if (bootstrapPromise) return bootstrapPromise;
    bootstrapPromise = (async () => {
      seedAll();

      setSessionExpiredHandler(() => {
        void get().logout();
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
          get().loadMenu();
          get().loadStaff();
        }
        if (msg.type === "LOGOUT") {
          // Backend đã thu hồi phiên ở tab vừa đăng xuất; tab này chỉ dọn phía client.
          clearTokens();
          clearRealScope();
          set(emptySession());
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
      await Promise.all([get().loadMenu(), get().loadStaff()]);
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

  logout: async () => {
    // `logoutSession()` thu hồi phiên ở backend rồi xoá cả access lẫn refresh
    // token, nên đã bao gồm việc `clearAccessToken()` của nhánh main làm.
    await logoutSession();
    clearRealScope();
    set(emptySession());
    broadcast.send({ type: "LOGOUT" });
  },
});
