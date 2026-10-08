/**
 * Kịch bản mock đang chạy: doanh nghiệp mock nào (A hay B), và ghi đè gói/hết hạn để thử khoá
 * tính năng và chế độ chỉ đọc. Lưu localStorage; panel dev (chỉ chạy ở `vite dev`) đổi giá trị này.
 */
import type { PlanTier } from "../../types";

export type MockProfileId = "A" | "B";

export interface MockScenario {
  profile: MockProfileId;
  /** null = dùng gói mặc định của doanh nghiệp mock. */
  tier: PlanTier | null;
  expired: boolean;
}

const KEY = "fnb.mock.scenario";
const DEFAULT: MockScenario = { profile: "A", tier: null, expired: false };

let current: MockScenario = loadScenario();
const listeners = new Set<() => void>();

/** Đọc kịch bản đã lưu — chỉ ở dev; production luôn trả mặc định (quyết định 47). */
export function loadScenario(): MockScenario {
  // `import.meta.env.DEV` viết thẳng tại chỗ để bản build bỏ hẳn nhánh đọc storage (quyết định 47).
  if (!import.meta.env.DEV) return { ...DEFAULT };
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT, ...(JSON.parse(raw) as Partial<MockScenario>) } : { ...DEFAULT };
  } catch {
    return { ...DEFAULT };
  }
}

export function getScenario(): MockScenario {
  return current;
}

export function setScenario(patch: Partial<MockScenario>): void {
  current = { ...current, ...patch };
  if (import.meta.env.DEV) {
    try {
      localStorage.setItem(KEY, JSON.stringify(current));
    } catch {
      // ignore
    }
  }
  listeners.forEach((fn) => fn());
}

export function subscribeScenario(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
