import { describe, expect, it } from "vitest"
import { buildRoutes } from "./index"
import { ownerRoutes, roleBasePath, roleHomePath } from "./routeConfig"

describe("Brand Manager routes", () => {
  it("uses the new public URL while keeping the internal owner role", () => {
    expect(roleBasePath("owner")).toBe("/brand-manager")
    expect(roleHomePath("owner")).toBe("/brand-manager/reports")
  })

  it("removes OW-09 and exposes advanced menu use cases", () => {
    expect(
      ownerRoutes.some(
        (route) => route.code === "OW-09" || route.path === "ai",
      ),
    ).toBe(false)
    expect(
      ownerRoutes.find((route) => route.path === "menu/advanced")?.code,
    ).toBe("OW-14 · OW-15 · OW-16")
    expect(
      ownerRoutes.find((route) => route.path === "menu/import")?.code,
    ).toBe("OW-12")
  })

  it("keeps a compatibility redirect for old owner URLs", () => {
    const paths = buildRoutes({
      orderTracking: false,
      webCustomerDisplay: false,
    }).map((route) => route.path)
    expect(paths).toContain("/owner/*")
  })
})
