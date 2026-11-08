import { describe, expect, it } from "vitest";
import { adminRoutes, isWebRole, platformStaffRoutes, roleHomePath } from "./routeConfig";
import { homeRouteFor } from "./guards";

describe("Platform Staff routes", () => {
  it("has its own working area and only registration and aggregate business screens", () => {
    expect(isWebRole("platform-staff")).toBe(true);
    expect(roleHomePath("platform-staff")).toBe("/platform-staff/signups");
    expect(homeRouteFor("platform-staff")).toBe("/platform-staff");
    expect(platformStaffRoutes.map((route) => route.path)).toEqual(["signups", "businesses"]);
    expect(adminRoutes.map((route) => route.path)).toContain("staff");
    expect(adminRoutes.map((route) => route.path)).not.toContain("support");
  });
});
