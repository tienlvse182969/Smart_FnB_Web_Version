import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

// Node có thể tạo một `localStorage` rỗng nhưng không có Storage API khi
// `--localstorage-file` không hợp lệ. Dùng bản in-memory ổn định cho jsdom.
const storageValues = new Map<string, string>();
const testStorage = {
    get length() { return storageValues.size; },
    clear: () => storageValues.clear(),
    getItem: (key: string) => storageValues.get(String(key)) ?? null,
    key: (index: number) => [...storageValues.keys()][index] ?? null,
    removeItem: (key: string) => storageValues.delete(String(key)),
    setItem: (key: string, value: string) => storageValues.set(String(key), String(value)),
};

function ensureLocalStorage() {
  if (typeof globalThis.localStorage?.getItem === "function" && typeof globalThis.localStorage?.setItem === "function") return;
  const storage = typeof globalThis.sessionStorage?.getItem === "function" ? globalThis.sessionStorage : testStorage;
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
}

ensureLocalStorage();
beforeEach(ensureLocalStorage);

// Đồng hồ cố định cho TOÀN BỘ bộ test: dữ liệu mock (đơn theo ngày, hạn dùng, khoảng ngày báo cáo) phụ thuộc "bây giờ", nên test
// không được phụ thuộc giờ chạy. Chỉ giả `Date`; setTimeout/độ trễ mock vẫn chạy thật. Đặt TEST_NOW=<ISO> để thử giờ khác.
vi.useFakeTimers({ toFake: ["Date"] });
vi.setSystemTime(new Date(process.env.TEST_NOW ?? "2026-10-15T10:30:00+07:00"));

// Không bật globals nên Testing Library không tự dọn DOM sau mỗi test.
afterEach(() => cleanup());
