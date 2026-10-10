import path from "node:path";
import { defineConfig } from "vitest/config";

// Cấu hình test tách khỏi vite.config.ts (file đó nạp plugin của Figma Make, không cần khi test).
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/test/setup.ts"],
    // Lần dựng bảng antd đầu tiên chậm khi cả bộ test chạy song song (đã gặp "timed out in 5000ms" ở 7.2): một mức chung thay cho cài riêng từng file (quyết định 86).
    testTimeout: 15000,
    // Test chạy không cần BE: các module đã nối real (mặc định) chuyển sang mock.
    env: { VITE_API_AUTH: "mock", VITE_API_BRANCH: "mock", VITE_API_REPORT: "mock", VITE_API_PLAN: "mock", VITE_API_MENU: "mock", VITE_API_ACCOUNT: "mock", VITE_API_STATIONS: "mock", VITE_API_OPTIONS: "mock", VITE_API_BRANDING: "mock", VITE_API_PAYOS: "mock", VITE_API_ORDER: "mock", VITE_API_MANAGER_REPORT: "mock" },
  },
});
