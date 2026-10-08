import { describe, expect, it } from "vitest";
import { cleanCallNumber, defaultFilters, filtersToSearch, hasExtraFilters, isDefaultFilters, parseFilters, toOrderQuery } from "./orderFilters";

const TODAY = "2026-10-08";

describe("bộ lọc tra cứu đơn ↔ URL (quyết định 68, 69)", () => {
  it("mặc định: 7 ngày gần nhất giờ Việt Nam, 20 dòng, trang 1", () => {
    expect(defaultFilters(TODAY)).toEqual({ from: "2026-10-02", to: "2026-10-08", callNumber: "", orderCode: "", status: "", payment: "", method: "", page: 1, limit: 20 });
    expect(parseFilters("", TODAY)).toEqual(defaultFilters(TODAY));
  });

  it("vòng tròn bộ lọc → URL → bộ lọc", () => {
    const f = { from: "2026-09-01", to: "2026-09-30", callNumber: "12", orderCode: "CTR-9", status: "CANCELLED", payment: "UNPAID", method: "CASH", page: 3, limit: 50 };
    const search = filtersToSearch(f, TODAY).toString();
    expect(parseFilters(search, TODAY)).toEqual(f);
  });

  it("URL chỉ giữ tham số khác mặc định", () => {
    expect(filtersToSearch(defaultFilters(TODAY), TODAY).toString()).toBe("");
    expect(filtersToSearch({ ...defaultFilters(TODAY), status: "READY" }, TODAY).toString()).toBe("status=READY");
    expect(filtersToSearch({ ...defaultFilters(TODAY), page: 2 }, TODAY).toString()).toBe("page=2");
  });

  it("tham số hỏng hoặc lạ bị bỏ qua, về mặc định cho riêng tham số đó", () => {
    const f = parseFilters("from=hôm-qua&to=2026-10-08&callNumber=abc&status=FOO&payment=PAID&method=BITCOIN&page=-3&limit=7&lạ=1&orderCode=%20%20X%20", TODAY);
    expect(f).toEqual({ ...defaultFilters(TODAY), payment: "PAID", orderCode: "X" });
    expect(parseFilters("page=0", TODAY).page).toBe(1);
    expect(parseFilters("page=2.5", TODAY).page).toBe(1);
    expect(parseFilters("limit=101", TODAY).limit).toBe(20);
    expect(parseFilters("limit=100", TODAY).limit).toBe(100);
  });

  it("khoảng ngày: ngày không tồn tại hoặc từ > đến → cả khoảng về mặc định", () => {
    const base = defaultFilters(TODAY);
    expect(parseFilters("from=2026-02-30&to=2026-03-05", TODAY)).toMatchObject({ from: base.from, to: base.to });
    expect(parseFilters("from=2026-10-09&to=2026-10-01", TODAY)).toMatchObject({ from: base.from, to: base.to });
    expect(parseFilters("from=2026-10-08&to=2026-10-08", TODAY)).toMatchObject({ from: "2026-10-08", to: "2026-10-08" });
  });

  it("số gọi chỉ nhận số nguyên dương trong giới hạn BE", () => {
    expect(cleanCallNumber(" 12 ")).toBe("12");
    expect(cleanCallNumber("007")).toBe("7");
    for (const bad of ["", "0", "-1", "1.5", "abc", "12a", "2147483648", "99999999999"]) expect(cleanCallNumber(bad), bad).toBe("");
  });

  it("toOrderQuery: ngày giờ Việt Nam → ISO có múi giờ, số gọi là số, rỗng không có", () => {
    const q = toOrderQuery({ ...defaultFilters(TODAY), callNumber: "1", status: "CANCELLED" });
    expect(q).toEqual({ from: "2026-10-02T00:00:00.000+07:00", to: "2026-10-08T23:59:59.999+07:00", callNumber: 1, status: "CANCELLED", page: 1, limit: 20 });
    expect(toOrderQuery(defaultFilters(TODAY))).not.toHaveProperty("callNumber");
  });

  it("hasExtraFilters / isDefaultFilters", () => {
    expect(hasExtraFilters(defaultFilters(TODAY))).toBe(false);
    expect(hasExtraFilters({ ...defaultFilters(TODAY), method: "CASH" })).toBe(true);
    expect(isDefaultFilters(defaultFilters(TODAY), TODAY)).toBe(true);
    expect(isDefaultFilters({ ...defaultFilters(TODAY), limit: 50 }, TODAY)).toBe(false);
  });
});
