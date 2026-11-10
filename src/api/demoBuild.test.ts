import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { API_MODULES, DEFAULT_MODES } from "./flags";

/** GAP-206: bản build demo phải chạy mọi module ở chế độ `real` (không dữ liệu giả). */
describe("bản build demo dùng API thật", () => {
  it("mặc định mọi module API là real", () => {
    for (const module of API_MODULES) expect(DEFAULT_MODES[module], module).toBe("real");
  });

  it("vercel.json ghim VITE_API_<MODULE>=real cho đủ mọi module (thêm module mới phải thêm vào đây)", () => {
    const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as { build?: { env?: Record<string, string> } };
    const env = vercel.build?.env ?? {};
    for (const module of API_MODULES) expect(env[`VITE_API_${module.toUpperCase()}`], module).toBe("real");
    expect(Object.values(env).filter((value) => value !== "real")).toEqual([]);
  });
});
