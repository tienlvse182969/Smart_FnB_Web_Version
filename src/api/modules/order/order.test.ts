import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, describeApiError } from "../../http/errors";
import { mockControl } from "../../mock/control";
import { resetMockStates } from "../../mock/store";
import { setScenario } from "../../mock/scenario";
import { MOCK_PROFILES } from "../../mock/data/profiles";
import {
  ORDER_ITEM_STATUS_CODES,
  ORDER_PAYMENT_STATUS_CODES,
  ORDER_STATUS_CODES,
  ORDER_STATUS_FILTER,
  PAYMENT_METHOD_CODES,
  PAYMENT_STATUS_CODES,
  orderItemStatusInfo,
  orderPaymentInfo,
  orderStatusInfo,
  paymentMethodInfo,
  paymentStatusInfo,
} from "./codes";
import { mapActorName, mapOrderDetail, mapOrderPage } from "./mapper";
import { orderMock } from "./mock";
import { buildOrderQueryString, vnDayEndIso, vnDayStartIso } from "./query";
import { orderReal } from "./real";

mockControl.latency = [0, 0];
mockControl.failure = null;

describe("nhãn trạng thái: map ĐỦ mọi giá trị enum của BE (schema.prisma)", () => {
  it("đơn (5.3)", () => {
    expect(ORDER_STATUS_CODES.map((c) => orderStatusInfo(c).label)).toEqual([
      "Khác (PENDING)",
      "Đã thanh toán",
      "Chờ thanh toán",
      "Đang pha",
      "Sẵn sàng",
      "Khác (SERVED)",
      "Hoàn tất",
      "Hoàn tất",
      "Đã huỷ",
    ]);
    expect(orderStatusInfo("PENDING").known).toBe(false);
    expect(orderStatusInfo("DELIVERED")).toMatchObject({ known: true, tone: "neutral" });
    expect(orderStatusInfo("CONFIRMED").tone).toBe("warning");
    expect(orderStatusInfo("READY").tone).toBe("success");
  });

  it("dòng món (5.4)", () => {
    expect(ORDER_ITEM_STATUS_CODES.map((c) => orderItemStatusInfo(c).label)).toEqual([
      "Khác (PENDING)",
      "Chờ pha",
      "Khác (CONFIRMED)",
      "Đang pha",
      "Xong",
      "Khác (SERVED)",
      "Xong",
      "Hết món",
      "Đã huỷ",
    ]);
    expect(orderItemStatusInfo("OUT_OF_STOCK").tone).toBe("error");
  });

  it("hình thức thanh toán: đặc tả chỉ có tiền mặt và QR", () => {
    expect(PAYMENT_METHOD_CODES.map((c) => paymentMethodInfo(c).label)).toEqual(["Tiền mặt", "Khác (CARD)", "Chuyển khoản (QR)", "Khác (E_WALLET)", "Khác (OTHER)"]);
  });

  it("thanh toán (5.5): PENDING phụ thuộc hình thức; FAILED/REFUNDED chưa có trong đặc tả", () => {
    expect(paymentStatusInfo("SUCCESS").label).toBe("Đã thanh toán");
    expect(paymentStatusInfo("PENDING", "CASH").label).toBe("Khởi tạo");
    expect(paymentStatusInfo("PENDING", "BANK_TRANSFER")).toMatchObject({ label: "Chờ chuyển khoản", tone: "warning" });
    expect(PAYMENT_STATUS_CODES.filter((c) => !paymentStatusInfo(c, "CASH").known)).toEqual(["FAILED", "REFUNDED", "PARTIALLY_REFUNDED"]);
  });

  it("thanh toán của cả đơn", () => {
    const pay = (status: string, paymentStatus: string, payments: { method: string; status: string }[] = []) => orderPaymentInfo({ status, paymentStatus, payments }).label;
    expect(pay("SUBMITTED", "PAID")).toBe("Đã thanh toán");
    expect(pay("CONFIRMED", "UNPAID")).toBe("Khởi tạo");
    expect(pay("CONFIRMED", "UNPAID", [{ method: "CASH", status: "PENDING" }])).toBe("Khởi tạo");
    expect(pay("CONFIRMED", "UNPAID", [{ method: "BANK_TRANSFER", status: "PENDING" }])).toBe("Chờ chuyển khoản");
    expect(pay("CANCELLED", "UNPAID")).toBe("Đã huỷ");
    for (const c of ORDER_PAYMENT_STATUS_CODES) expect(typeof pay("CONFIRMED", c)).toBe("string");
    expect(pay("CONFIRMED", "REFUNDED")).toBe("Khác (REFUNDED)");
    expect(pay("CONFIRMED", "PARTIALLY_PAID")).toBe("Khác (PARTIALLY_PAID)");
  });

  it("mã lạ của BE → Khác (<mã>), không ném lỗi", () => {
    expect(orderStatusInfo("WEIRD")).toEqual({ label: "Khác (WEIRD)", tone: "neutral", known: false });
    expect(orderItemStatusInfo("X").label).toBe("Khác (X)");
    expect(paymentMethodInfo("CRYPTO").label).toBe("Khác (CRYPTO)");
    expect(orderPaymentInfo({ status: "CONFIRMED", paymentStatus: "WEIRD", payments: [] }).label).toBe("Khác (WEIRD)");
  });

  it("ô lọc trạng thái đơn chỉ gồm giá trị có trong đặc tả và BE chấp nhận", () => {
    expect(ORDER_STATUS_FILTER.map((o) => o.value)).toEqual(["CONFIRMED", "SUBMITTED", "PREPARING", "READY", "DELIVERED", "CANCELLED"]);
    for (const o of ORDER_STATUS_FILTER) expect(orderStatusInfo(o.value).known).toBe(true);
  });
});

describe("mapper phản hồi BE", () => {
  const rawOrder = {
    id: "o1",
    orderCode: "CTR-1-ABC",
    callNumber: 2,
    type: "COUNTER_PICKUP",
    status: "SUBMITTED",
    paymentStatus: "PAID",
    totalAmount: "280000",
    placedAt: "2026-10-08T05:56:58.497Z",
    paidAt: "2026-10-08T05:56:59.000Z",
    cancelledAt: null,
    cancellationReason: null,
    createdByCashier: { id: "e1", employeeCode: "DEMO-CASHIER-01", firstName: "Lan", lastName: "Thu ngân" },
    createdByWaiter: null,
    payments: [{ id: "p1", paymentCode: "PAY-1", method: "CASH", status: "SUCCESS", amount: "280000", receivedAmount: null, processedBy: { employeeCode: "DEMO-CASHIER-01", firstName: "Lan", lastName: "Thu ngân" } }],
    tableSession: null,
  };

  it("tiền chuỗi → số, họ tên người tạo, thanh toán", () => {
    const page = mapOrderPage({ items: [rawOrder], total: 11, page: 1, limit: 20 }, { page: 1, limit: 20 });
    expect(page).toMatchObject({ total: 11, page: 1, limit: 20 });
    const o = page.items[0];
    expect(o).toMatchObject({ id: "o1", callNumber: 2, total: 280000, status: "SUBMITTED", paymentStatus: "PAID", cashierName: "Lan Thu ngân", placedAt: "2026-10-08T05:56:58.497Z" });
    expect(o.payments[0]).toMatchObject({ method: "CASH", status: "SUCCESS", amount: 280000, receivedAmount: null, processedBy: "Lan Thu ngân" });
  });

  it("thiếu trường không làm vỡ", () => {
    const page = mapOrderPage({ items: [{}] }, { page: 3, limit: 5 });
    expect(page).toMatchObject({ total: 1, page: 3, limit: 5 });
    expect(page.items[0]).toMatchObject({ id: "", callNumber: null, total: 0, payments: [], cashierName: null });
    expect(mapOrderPage(null, { page: 1, limit: 20 })).toEqual({ items: [], total: 0, page: 1, limit: 20 });
    expect(mapOrderPage("lỗi", { page: 1, limit: 20 }).items).toEqual([]);
  });

  it("khoản thanh toán của phiên bàn (v7) gộp vào, bỏ trùng", () => {
    const p = { id: "p1", method: "CASH", status: "SUCCESS", amount: "1" };
    const o = mapOrderPage({ items: [{ ...rawOrder, payments: [p], tableSession: { payments: [p, { id: "p2", method: "BANK_TRANSFER", status: "SUCCESS", amount: "2" }] } }] }, { page: 1, limit: 20 }).items[0];
    expect(o.payments.map((x) => x.id)).toEqual(["p1", "p2"]);
  });

  it("chi tiết: dòng món có tuỳ chọn chụp lúc bán, người huỷ, ghi chú", () => {
    const d = mapOrderDetail({
      ...rawOrder,
      status: "CANCELLED",
      cancellationReason: "Khách đổi ý",
      cancelledBy: { employeeCode: "M1", firstName: "", lastName: "" },
      subtotal: "100000",
      discountAmount: "0",
      taxAmount: "0",
      serviceCharge: "0",
      note: null,
      items: [
        {
          id: "i1",
          itemName: "Trà đào",
          unitPrice: "35000",
          quantity: 2,
          totalPrice: "100000",
          status: "QUEUED",
          specialInstructions: "ít đá",
          selectedOptions: [
            { id: "x", name: "L", groupCode: "SIZE", groupName: "Kích cỡ", priceDelta: "10000" },
            { name: "Trân châu", priceDelta: 5000 },
            "rác",
          ],
        },
      ],
    });
    expect(d).toMatchObject({ subtotal: 100000, cancellationReason: "Khách đổi ý", cancelledBy: "M1" });
    expect(d.lines[0]).toMatchObject({ name: "Trà đào", unitPrice: 35000, quantity: 2, total: 100000, status: "QUEUED", note: "ít đá" });
    expect(d.lines[0].options).toEqual([
      { groupName: "Kích cỡ", name: "L", priceDelta: 10000 },
      { groupName: null, name: "Trân châu", priceDelta: 5000 },
    ]);
    expect(mapOrderDetail(undefined).lines).toEqual([]);
  });

  it("họ tên: thiếu tên thì dùng mã nhân viên", () => {
    expect(mapActorName({ employeeCode: "E1" })).toBe("E1");
    expect(mapActorName(null)).toBeNull();
  });
});

describe("khoảng ngày theo giờ Việt Nam và chuỗi truy vấn", () => {
  it("đầu và cuối ngày giờ Việt Nam, có múi giờ +07:00", () => {
    expect(vnDayStartIso("2026-10-08")).toBe("2026-10-08T00:00:00.000+07:00");
    expect(vnDayEndIso("2026-10-08")).toBe("2026-10-08T23:59:59.999+07:00");
  });

  it("qua nửa đêm UTC: 00:00 giờ VN là 17:00 UTC ngày hôm trước", () => {
    expect(new Date(vnDayStartIso("2026-10-08")).toISOString()).toBe("2026-10-07T17:00:00.000Z");
    expect(new Date(vnDayEndIso("2026-10-08")).toISOString()).toBe("2026-10-08T16:59:59.999Z");
    // Đơn lúc 23:30 giờ VN ngày 8 (16:30 UTC) vẫn nằm trong ngày 8; đơn 00:10 giờ VN ngày 9 (17:10 UTC ngày 8) thì không.
    const end = new Date(vnDayEndIso("2026-10-08")).getTime();
    expect(Date.parse("2026-10-08T16:30:00Z")).toBeLessThanOrEqual(end);
    expect(Date.parse("2026-10-08T17:10:00Z")).toBeGreaterThan(end);
  });

  it("luôn có type=COUNTER_PICKUP, page, limit; tham số rỗng không gửi", () => {
    const params = new URLSearchParams(buildOrderQueryString({ page: 1, limit: 20 }));
    expect([...params.keys()].sort()).toEqual(["limit", "page", "type"]);
    expect(params.get("type")).toBe("COUNTER_PICKUP");
    const empty = new URLSearchParams(buildOrderQueryString({ page: 1, limit: 20, orderCode: "   ", status: "", paymentStatus: undefined }));
    expect([...empty.keys()].sort()).toEqual(["limit", "page", "type"]);
  });

  it("gửi đủ bộ lọc, cắt khoảng trắng mã đơn, kẹp limit ≤ 100 và page ≥ 1", () => {
    const params = new URLSearchParams(
      buildOrderQueryString({
        from: vnDayStartIso("2026-10-02"),
        to: vnDayEndIso("2026-10-08"),
        callNumber: 1,
        orderCode: "  CTR-1  ",
        status: "CANCELLED",
        paymentStatus: "UNPAID",
        paymentMethod: "CASH",
        page: 0,
        limit: 500,
      }),
    );
    expect(Object.fromEntries(params)).toEqual({
      type: "COUNTER_PICKUP",
      from: "2026-10-02T00:00:00.000+07:00",
      to: "2026-10-08T23:59:59.999+07:00",
      callNumber: "1",
      orderCode: "CTR-1",
      status: "CANCELLED",
      paymentStatus: "UNPAID",
      paymentMethod: "CASH",
      page: "1",
      limit: "100",
    });
  });
});

describe("orderReal — đúng endpoint /manager/orders", () => {
  afterEach(() => vi.unstubAllGlobals());
  const respond = (body: unknown, status = 200) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

  it("danh sách: chỉ GET, kèm type=COUNTER_PICKUP", async () => {
    const fetchMock = respond({ items: [], total: 0, page: 2, limit: 5 });
    vi.stubGlobal("fetch", fetchMock);
    const page = await orderReal.listOrders({ chainId: "c", branchId: "b" }, { page: 2, limit: 5, callNumber: 1 });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new URL(url).pathname).toMatch(/\/manager\/orders$/);
    expect(new URL(url).searchParams.get("type")).toBe("COUNTER_PICKUP");
    expect(new URL(url).searchParams.get("callNumber")).toBe("1");
    expect(init.method).toBe("GET");
    expect(page).toEqual({ items: [], total: 0, page: 2, limit: 5 });
  });

  it("chi tiết: GET /manager/orders/:id", async () => {
    const fetchMock = respond({ id: "o1", orderCode: "CTR-1", items: [] });
    vi.stubGlobal("fetch", fetchMock);
    const d = await orderReal.getOrder({ chainId: "c", branchId: "b" }, "o1");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new URL(url).pathname).toMatch(/\/manager\/orders\/o1$/);
    expect(init.method).toBe("GET");
    expect(d.id).toBe("o1");
  });
});

describe("lỗi 400 của tra cứu đơn → tiếng Việt", () => {
  it("from ≥ to", () => {
    expect(describeApiError(new ApiError(400, "from must be earlier than to"))).toBe("Ngày bắt đầu phải trước ngày kết thúc.");
  });

  it("tham số sai theo từng ô (class-validator)", () => {
    const text = describeApiError(new ApiError(400, "Bad Request", ["limit must not be greater than 100", "callNumber must be an integer number", "status must be one of the following values: PENDING, SUBMITTED"]));
    expect(text).toMatch(/Số dòng mỗi trang/);
    expect(text).toMatch(/Số gọi/);
    expect(text).toMatch(/Trạng thái/);
    expect(text).not.toMatch(/must|integer|following/i);
  });
});

describe("orderMock — cùng hình dạng BE", () => {
  const profile = MOCK_PROFILES.A;
  const scope = { chainId: profile.chainId, branchId: profile.branches[0].id };

  beforeEach(() => {
    resetMockStates();
    setScenario({ profile: "A", tier: null, expired: false });
  });

  it("phân trang: tổng không đổi, trang cuối ngắn, mới nhất trước", async () => {
    const first = await orderMock.listOrders(scope, { page: 1, limit: 20 });
    expect(first.total).toBeGreaterThan(40);
    expect(first.items).toHaveLength(20);
    const times = first.items.map((o) => o.placedAt!);
    expect([...times].sort().reverse()).toEqual(times);
    const last = await orderMock.listOrders(scope, { page: Math.ceil(first.total / 20), limit: 20 });
    expect(last.items.length).toBe(first.total - 20 * (Math.ceil(first.total / 20) - 1));
  });

  it("có đủ các trạng thái và đơn kèm tuỳ chọn/topping (quyết định 67)", async () => {
    const all = await orderMock.listOrders(scope, { page: 1, limit: 100 });
    const statuses = new Set<string>();
    let page = 1;
    for (;;) {
      const p = await orderMock.listOrders(scope, { page, limit: 100 });
      p.items.forEach((o) => statuses.add(o.status));
      if (page * 100 >= p.total) break;
      page++;
    }
    for (const s of ["CONFIRMED", "SUBMITTED", "PREPARING", "READY", "DELIVERED", "CANCELLED"]) expect(statuses.has(s), s).toBe(true);
    expect(all.total).toBeGreaterThan(0);
    const withOptions = await orderMock.listOrders(scope, { page: 1, limit: 100, status: "DELIVERED" });
    const detail = await orderMock.getOrder(scope, withOptions.items.find((o) => o.id.endsWith("scn-options"))!.id);
    expect(detail.lines[0].options.map((o) => o.groupName)).toEqual(["Kích cỡ", "Mức đường", "Topping"]);
  });

  it("lọc: trạng thái, thanh toán, hình thức, số gọi, mã đơn, khoảng thời gian", async () => {
    const waiting = await orderMock.listOrders(scope, { page: 1, limit: 100, status: "CONFIRMED" });
    expect(waiting.items.length).toBeGreaterThanOrEqual(2);
    expect(waiting.items.every((o) => o.status === "CONFIRMED")).toBe(true);
    const unpaid = await orderMock.listOrders(scope, { page: 1, limit: 100, paymentStatus: "UNPAID" });
    expect(unpaid.items.every((o) => o.paymentStatus === "UNPAID")).toBe(true);
    const qr = await orderMock.listOrders(scope, { page: 1, limit: 100, paymentMethod: "BANK_TRANSFER" });
    expect(qr.items.every((o) => o.payments.some((p) => p.method === "BANK_TRANSFER"))).toBe(true);
    const call900 = await orderMock.listOrders(scope, { page: 1, limit: 100, callNumber: 900 });
    expect(call900.items.map((o) => o.callNumber)).toEqual([900]);
    const code = call900.items[0].orderCode;
    expect((await orderMock.listOrders(scope, { page: 1, limit: 100, orderCode: code.toLowerCase() })).items.map((o) => o.id)).toContain(call900.items[0].id);
    const nothing = await orderMock.listOrders(scope, { page: 1, limit: 20, from: "2000-01-01T00:00:00.000+07:00", to: "2000-01-02T00:00:00.000+07:00" });
    expect(nothing).toMatchObject({ items: [], total: 0 });
  });

  it("chi tiết: id lạ → 404", async () => {
    await expect(orderMock.getOrder(scope, "khong-co")).rejects.toMatchObject({ status: 404 });
  });
});
