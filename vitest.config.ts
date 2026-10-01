import path from "node:path";
import { defineConfig } from "vitest/config";

// Cấu hình test tách khỏi vite.config.ts (file đó nạp plugin của Figma Make, không cần khi test).
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/test/setup.ts"],
    // Test chạy không cần BE: các module đã nối real (mặc định) chuyển sang mock.
    env: { VITE_API_AUTH: "mock", VITE_API_BRANCH: "mock", VITE_API_REPORT: "mock", VITE_API_PLAN: "mock" },
  },
});
