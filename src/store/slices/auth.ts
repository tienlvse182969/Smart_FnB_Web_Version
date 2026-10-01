/**
 * Phiên đăng nhập và phạm vi làm việc (CM-01).
 * `loadScope` nạp phạm vi (chi nhánh), gói, nhận diện; sau đó nạp menu và nhân sự của chi nhánh đang chọn.
 * Chỉ gọi lớp API (`src/api`) — không biết module đang chạy real hay mock.
 */
import type { AuthUser } from "../../types";
import {
  authApi,
  branchApi,
  brandingApi,
  clearTokens,
  planApi,
  setSessionExpiredHandler,
} from "../../api";
import { broadcast } from "../broadcast";
import { toUiBranch } from "../branchMapping";
import type { AppState, ScopeStatus, SliceCreator } from "../types";

export interface AuthSlice {
  currentUser: AuthUser | null;
  isBootstrapped: boolean;
  isLoading: boolean;

  /** Phạm vi thật lấy từ backend sau khi đăng nhập. */
  scopeStatus: ScopeStatus;
  scopeError: string | null;
  /** ID chuỗi (UUID của backend). null với ADMIN (không thuộc chuỗi nào). */
  chainId: string | null;
  chainName: string | null;

  bootstrap: () => Promise<void>;
  /** Đăng nhập qua backend bằng email + mật khẩu. */
  login: (email: string, password: string) => Promise<AuthUser>;
  /** Đổi mật khẩu tài khoản đang đăng nhập (bắt buộc lần đầu — CM-01). */
  changePassword: (newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  /**
   * Nạp chuỗi, chi nhánh, gói và nhận diện của người đang đăng nhập. `silent` = không đưa màn hình về trạng
   * thái "đang tải" (dùng khi chỉ làm mới dữ liệu).
   */
  loadScope: (options?: { silent?: boolean }) => Promise<void>;
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
    apiBranches: [],
    branches: [],
    currentBranchId: null,
    branchMenu: [],
    staff: [],
  };
}

export const createAuthSlice: SliceCreator<AuthSlice> = (set, get) => ({
  currentUser: null,
  isBootstrapped: false,
  isLoading: false,

  scopeStatus: "idle",
  scopeError: null,
  chainId: null,
  chainName: null,

  bootstrap: async () => {
    if (bootstrapPromise) return bootstrapPromise;
    bootstrapPromise = (async () => {
      setSessionExpiredHandler(() => {
        void get().logout();
      });

      // Khôi phục phiên từ refresh token đã lưu — F5 không văng ra /login. Branding chỉ nạp được sau khi
      // biết chuỗi (trong `loadScope`), nên khu vực đã đăng nhập chờ `scopeStatus` rồi mới render.
      const savedUser = await authApi.restoreSession();
      set({ currentUser: savedUser, isBootstrapped: true });

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
          set(emptySession());
        }
        if (msg.type === "BRANDING_UPDATED") {
          const { currentUser, chainId } = get();
          // Chỉ áp lại theme cho tab của ĐÚNG doanh nghiệp vừa đổi nhận diện.
          if (chainId && currentUser?.tenantId === msg.tenantId) {
            brandingApi.getBranding(chainId).then((branding) => {
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
      const user = await authApi.login(email, password);
      set({ currentUser: user, isLoading: false });
      await get().loadScope();
      return user;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  loadScope: async (options = {}) => {
    const { currentUser } = get();
    if (!currentUser) return;

    // ADMIN quản trị nền tảng, không thuộc chuỗi nào — backend trả 403 cho cả
    // /restaurant-chains lẫn /branches, nên không gọi.
    if (currentUser.role === "admin") {
      set({
        scopeStatus: "ready",
        scopeError: null,
        chainId: null,
        chainName: null,
        plan: null,
        tenantBranding: null,
        apiBranches: [],
        branches: [],
        currentBranchId: null,
      });
      return;
    }

    if (!options.silent) set({ scopeStatus: "loading", scopeError: null });
    try {
      // Phạm vi lấy thẳng từ /auth/me: `chainId` cho nhân viên, `chainIds[]`
      // cho OWNER. /branches chỉ còn dùng để lấy DANH SÁCH chi nhánh.
      const auth = await authApi.getContext();
      // Chỉ OWNER đọc được /restaurant-chains — cần cho tên chuỗi, gói và hạn mức.
      const chains = currentUser.role === "owner" ? await branchApi.listChains() : [];
      const apiBranches = await branchApi.listBranches();

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

      // Nhân viên bị khoá vào chi nhánh được gán; Owner giữ lựa chọn hiện tại.
      const realBranchId =
        auth.branchId ?? get().currentBranchId ?? apiBranches[0]?.id ?? null;
      const activeBranchId = apiBranches.some((b) => b.id === realBranchId)
        ? realBranchId
        : (apiBranches[0]?.id ?? null);

      // Nạp gói và nhận diện TRƯỚC khi báo scope sẵn sàng: khu vực đã đăng nhập chỉ render khi đã biết màu
      // của doanh nghiệp và gói đang dùng, tránh nhấp nháy đổi màu (đặc tả 10.5).
      const [plan, tenantBranding] = await Promise.all([
        planApi.getPlan(chainId, { chains: currentUser.role === "owner" ? chains : undefined }),
        brandingApi.getBranding(chainId),
      ]);

      set({
        tenantBranding,
        plan,
        scopeStatus: "ready",
        scopeError: null,
        chainId,
        chainName,
        apiBranches,
        branches: apiBranches.map((b) => toUiBranch(b)),
        currentBranchId: activeBranchId,
        currentUser: {
          ...currentUser,
          tenantId: chainId,
          branchId: activeBranchId,
        },
      });

      await Promise.all([get().loadMenu(), get().loadStaff()]);
    } catch (err) {
      set({
        scopeStatus: "error",
        scopeError: err instanceof Error ? err.message : "Không tải được phạm vi làm việc",
      });
    }
  },

  changePassword: async (newPassword: string) => {
    const { currentUser } = get();
    if (!currentUser) return;
    await authApi.changePassword(newPassword);
    set({ currentUser: { ...currentUser, mustChangePassword: false } });
  },

  logout: async () => {
    // `logout()` thu hồi phiên ở backend rồi xoá cả access lẫn refresh token phía client.
    await authApi.logout();
    set(emptySession());
    broadcast.send({ type: "LOGOUT" });
  },
});
