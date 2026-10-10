import { describe, expect, it } from "vitest";
import { matchRoutes } from "react-router-dom";
import { resolveRouteFlags } from "../api/flags";
import { buildRoutes } from "./index";

/** Route cuối cùng khớp là gì: id đường dẫn của route, hoặc "*" khi rơi về route lạ. */
const matched = (flags: Parameters<typeof buildRoutes>[0], path: string) => {
  const m = matchRoutes(buildRoutes(flags), path);
  return m ? m[m.length - 1].route.path : null;
};

describe("cờ tính năng của route công khai (quyết định 91–92)", () => {
  it("mặc định TẮT cả hai", () => {
    expect(resolveRouteFlags({})).toEqual({ orderTracking: false, webCustomerDisplay: false });
    expect(resolveRouteFlags({ VITE_FEATURE_ORDER_TRACKING: "false", VITE_FEATURE_WEB_CUSTOMER_DISPLAY: "1" })).toEqual({ orderTracking: false, webCustomerDisplay: false });
  });

  it("chỉ 'true' mới bật, từng cờ độc lập", () => {
    expect(resolveRouteFlags({ VITE_FEATURE_ORDER_TRACKING: "true" })).toEqual({ orderTracking: true, webCustomerDisplay: false });
    expect(resolveRouteFlags({ VITE_FEATURE_WEB_CUSTOMER_DISPLAY: " TRUE " })).toEqual({ orderTracking: false, webCustomerDisplay: true });
  });

  it("cờ tắt: /t/:token và /display/customer rơi vào route lạ ('*'), như đường dẫn không có thật", () => {
    const off = { orderTracking: false, webCustomerDisplay: false };
    expect(matched(off, "/t/abc123")).toBe("*");
    expect(matched(off, "/display/customer")).toBe("*"); // route con của /display: '*' → về /display/call
    expect(matched(off, "/khong-co-gi-ca")).toBe("*");
  });

  it("cờ bật: route có; màn gọi số /display/call luôn có (quyết định 93)", () => {
    expect(matched({ orderTracking: true, webCustomerDisplay: false }, "/t/abc123")).toBe("/t/:token");
    expect(matched({ orderTracking: false, webCustomerDisplay: true }, "/display/customer")).toBe("customer");
    expect(matched({ orderTracking: false, webCustomerDisplay: false }, "/display/call")).toBe("call");
  });
});
