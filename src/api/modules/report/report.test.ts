import { afterEach, describe, expect, it, vi } from "vitest";
import { buildQuery, reportReal } from "./real";
import { reportMock } from "./mock";

const ok = (body: unknown = {}) => new Response(JSON.stringify(body), { status: 200 });

function stubFetch(body: unknown = {}) {
  const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(ok(body)));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const urlOf = (fetchMock: ReturnType<typeof stubFetch>) => String(fetchMock.mock.calls[0][0]);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buildQuery", () => {
  it("bỏ giá trị rỗng, lặp khoá cho mảng chi nhánh", () => {
    expect(buildQuery({ from: "2026-10-01", to: "", branchIds: ["a", "b"], limit: undefined })).toBe(
      "?from=2026-10-01&branchIds=a&branchIds=b",
    );
    expect(buildQuery({})).toBe("");
  });
});

describe("reportReal — ba endpoint báo cáo mới (OW-08)", () => {
  it("doanh thu theo hình thức thanh toán gọi /reports/payment-methods với khoảng ngày và chi nhánh", async () => {
    const fetchMock = stubFetch({ range: {}, methods: [], branches: [] });
    await reportReal.getPaymentMethods({ from: "2026-10-01", to: "2026-10-07", branchIds: ["b1"] });
    expect(urlOf(fetchMock)).toContain("/reports/payment-methods?from=2026-10-01&to=2026-10-07&branchIds=b1");
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe("GET");
  });

  it("top combo và top topping gửi limit", async () => {
    const combos = stubFetch({ range: {}, items: [] });
    await reportReal.getTopCombos({ from: "2026-10-01", to: "2026-10-07", limit: 10 });
    expect(urlOf(combos)).toContain("/reports/top-combos?from=2026-10-01&to=2026-10-07&limit=10");

    const toppings = stubFetch({ range: {}, items: [] });
    await reportReal.getTopToppings({ limit: 5 });
    expect(urlOf(toppings)).toContain("/reports/top-toppings?limit=5");
  });

  it("ba endpoint cũ vẫn đúng đường dẫn", async () => {
    const a = stubFetch();
    await reportReal.getRevenueComparison({ branchIds: ["b1", "b2"] });
    expect(urlOf(a)).toContain("/reports/revenue/comparison?branchIds=b1&branchIds=b2");
    const b = stubFetch();
    await reportReal.getRevenueTimeseries({ granularity: "week" });
    expect(urlOf(b)).toContain("/reports/revenue/timeseries?granularity=week");
    const c = stubFetch();
    await reportReal.getTopItems({ limit: 10 });
    expect(urlOf(c)).toContain("/reports/top-items?limit=10");
  });
});

describe("huỷ request khi đổi bộ lọc", () => {
  it("signal đi vào fetch và KHÔNG lọt vào query string", async () => {
    const fetchMock = stubFetch();
    const controller = new AbortController();
    await reportReal.getRevenueComparison({ from: "2026-10-01", signal: controller.signal });
    expect(urlOf(fetchMock)).not.toContain("signal");
    expect((fetchMock.mock.calls[0][1] as RequestInit).signal).toBe(controller.signal);
  });

  it("request bị huỷ ném lại lỗi huỷ, không đổi thành lỗi mất kết nối", async () => {
    const controller = new AbortController();
    const abortError = new DOMException("Aborted", "AbortError");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => {
        controller.abort();
        return Promise.reject(abortError);
      }),
    );
    await expect(reportReal.getTopItems({ signal: controller.signal })).rejects.toBe(abortError);
  });
});

describe("reportMock — shape của ba endpoint mới", () => {
  it("trả rỗng đúng shape, không bịa số", async () => {
    const methods = await reportMock.getPaymentMethods({});
    expect(methods.methods).toEqual([]);
    expect(Array.isArray(methods.branches)).toBe(true);
    expect((await reportMock.getTopCombos({})).items).toEqual([]);
    expect((await reportMock.getTopToppings({})).items).toEqual([]);
  });
});
