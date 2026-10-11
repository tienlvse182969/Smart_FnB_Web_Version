/**
 * Điều khiển chung cho mọi bản mock: độ trễ giả và giả lập lỗi (mạng, 401, 403, hạn mức, 5xx).
 * Mọi hàm mock gọi `mockDelay()` đầu tiên nên một công tắc ở đây áp cho toàn bộ mock.
 */
import { ApiError } from "../http/errors";
import { notifySessionExpired } from "../http/client";

export type MockFailureKind = "network" | "unauthorized" | "forbidden" | "quota" | "server";

export interface MockFailure {
  kind: MockFailureKind;
  /** Xác suất mỗi lời gọi, 0–1. */
  rate: number;
}

const FAILURE_KEY = "fnb.mock.failure";

/** Lỗi giả đã lưu — chỉ đọc ở dev; production luôn không có lỗi giả (quyết định 47). */
export function loadFailure(): MockFailure | null {
  // `import.meta.env.DEV` viết thẳng tại chỗ (không qua hàm) để bản build thay bằng `false` và bỏ hẳn nhánh đọc storage (quyết định 47).
  if (!import.meta.env.DEV) return null;
  try {
    const raw = localStorage.getItem(FAILURE_KEY);
    return raw ? (JSON.parse(raw) as MockFailure) : null;
  } catch {
    return null;
  }
}

export const mockControl: { latency: [number, number]; failure: MockFailure | null } = {
  latency: [120, 260],
  failure: loadFailure(),
};

export function setMockFailure(failure: MockFailure | null): void {
  mockControl.failure = failure;
  if (!import.meta.env.DEV) return; // production: chỉ giữ trong bộ nhớ, không chạm storage
  try {
    if (failure) localStorage.setItem(FAILURE_KEY, JSON.stringify(failure));
    else localStorage.removeItem(FAILURE_KEY);
  } catch {
    // storage bị chặn — chỉ giữ trong bộ nhớ
  }
}

export function mockError(kind: MockFailureKind): ApiError {
  switch (kind) {
    case "network":
      return new ApiError(0, "Không kết nối được máy chủ (mock).");
    case "unauthorized":
      // Giống bản real: hết phiên thì dọn token và đưa về /login.
      notifySessionExpired();
      return new ApiError(401, "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    case "forbidden":
      return new ApiError(403, "Bạn không có quyền thực hiện thao tác này (mock).");
    case "quota":
      return new ApiError(409, "Đã đạt hạn mức của gói dịch vụ (mock).", [], "PLAN_LIMIT_REACHED");
    default:
      return new ApiError(500, "Máy chủ gặp lỗi (mock).");
  }
}

/** Mỗi hàm mock gọi đầu tiên: chờ một khoảng giả, rồi có thể ném lỗi giả lập. */
export async function mockDelay(): Promise<void> {
  const [min, max] = mockControl.latency;
  const ms = max > min ? min + Math.floor(Math.random() * (max - min + 1)) : min;
  if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms));
  const failure = mockControl.failure;
  if (failure && Math.random() < failure.rate) throw mockError(failure.kind);
}
