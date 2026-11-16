import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { expect, it } from "vitest"
import readMenuExcel from "./readMenuExcel"

it("reads the downloadable workbook and preserves Vietnamese names and VND prices", async () => {
  const bytes = Uint8Array.from(readFileSync(resolve("public/menu-mau.xlsx")))
  const file = new File([bytes], "menu-mau.xlsx")
  Object.defineProperty(file, "arrayBuffer", { value: async () => bytes.buffer })
  expect(await readMenuExcel(file)).toEqual([
    { category: "Cà phê", name: "Cà phê sữa đá", price: 35000, description: "Cà phê pha với sữa đặc" },
    { category: "Trà", name: "Trà đào", price: 40000, description: "" },
  ])
})
