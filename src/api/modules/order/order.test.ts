import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, describeApiError, isInlineErrorRoute } from "../../http/errors";
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
      "Cần xử lý",
    ]);
    expect(orderStatusInfo("REQUIRES_ATTENTION")).toMatchObject({ label: "Cần xử lý", tone: "error", known: true });
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
    expect(paymentStatusInfo("AMOUNT_MISMATCH", "BANK_TRANSFER")).toMatchObject({ label: "Lệch số tiền", tone: "error", known: true });
  });

  it("thanh toán của cả đơn", () => {
    const pay = (status: string, paymentStatus: string, payments: { method: string; status: string }[] = []) => orderPaymentInfo({ status, paymentStatus, payments }).label;
    expect(pay("SUBMITTED", "PAID")).toBe("Đã thanh toán");
    expect(pay("CONFIRMED", "UNPAID")).toBe("Khởi tạo");
    expect(pay("CONFIRMED", "UNPAID", [{ method: "CASH", status: "PENDING" }])).toBe("Khởi tạo");
    expect(pay("CONFIRMED", "UNPAID", [{ method: "BANK_TRANSFER", status: "PENDING" }])).toBe("Chờ chuyển khoản");
    expect(pay("CANCELLED", "UNPAID")).toBe("Đã huỷ");
    expect(pay("REQUIRES_ATTENTION", "UNPAID", [{ method: "BANK_TRANSFER", status: "AMOUNT_MISMATCH" }])).toBe("Lệch số tiền");
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
    expect(ORDER_STATUS_FILTER.map((o) => o.value)).toEqual(["CONFIRMED", "SUBMITTED", "PREPARING", "READY", "DELIVERED", "CANCELLED", "REQUIRES_ATTENTION"]);
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
          unitPrice: "50000",
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
    expect(d.lines[0]).toMatchObject({ name: "Trà đào", unitPrice: 50000, quantity: 2, total: 100000, status: "QUEUED", note: "ít đá" });
    expect(d.lines[0].options).toEqual([
      { groupName: "Kích cỡ", name: "L", priceDelta: 10000 },
      { groupName: null, name: "Trân châu", priceDelta: 5000 },
    ]);
    expect(mapOrderDetail(undefined).lines).toEqual([]);
  });

  it("chi tiết: khoản xác nhận thủ công giữ người xác nhận, lý do, số tiền thực nhận, mã giao dịch, thời điểm", () => {
    const d = mapOrderDetail({
      ...rawOrder,
      payments: [
        {
          id: "p9",
          paymentCode: "PAY-9",
          method: "BANK_TRANSFER",
          status: "SUCCESS",
          amount: "75000.00",
          receivedAmount: "80000",
          transactionRef: "FT123",
          confirmationReason: "Webhook không về",
          confirmedAt: "2026-10-08T06:10:00.000Z",
          paidAt: "2026-10-08T06:10:00.000Z",
          createdAt: "2026-10-08T06:00:00.000Z",
          failureReason: null,
          processedBy: { employeeCode: "DEMO-MANAGER-01", firstName: "Bình", lastName: "Quản lý" },
        },
      ],
    });
    expect(d.payments[0]).toEqual({
      id: "p9",
      paymentCode: "PAY-9",
      method: "BANK_TRANSFER",
      status: "SUCCESS",
      amount: 75000,
      receivedAmount: 80000,
      transactionRef: "FT123",
      confirmationReason: "Webhook không về",
      confirmedAt: "2026-10-08T06:10:00.000Z",
      paidAt: "2026-10-08T06:10:00.000Z",
      createdAt: "2026-10-08T06:00:00.000Z",
      failureReason: null,
      processedBy: "Bình Quản lý",
    });
  });

  it("chi tiết: đơn huỷ giữ thời điểm huỷ; không có station/tiền khách đưa (BE chưa trả)", () => {
    const d = mapOrderDetail({ ...rawOrder, status: "CANCELLED", cancelledAt: "2026-10-08T06:30:00.000Z", cancellationReason: "Khách đổi ý", cancelledBy: { employeeCode: "M1", firstName: "Bình", lastName: "Quản lý" } });
    expect(d).toMatchObject({ cancelledAt: "2026-10-08T06:30:00.000Z", cancellationReason: "Khách đổi ý", cancelledBy: "Bình Quản lý" });
    expect(d.payments[0]).not.toHaveProperty("tenderedAmount");
    expect(d).not.toHaveProperty("station");
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
  const respond = (body: unknown, status = 200) => vi.fn().mockImplementation(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

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

  it("xác nhận thủ công: POST /payments/:id/confirm, thân đúng 3 ô của ConfirmPaymentDto, không gửi ô trống", async () => {
    const fetchMock = respond({ id: "p1", status: "SUCCESS", order: {}, tracking: {} });
    vi.stubGlobal("fetch", fetchMock);
    await orderReal.confirmPayment({ chainId: "c", branchId: "b" }, "p1", { reason: "Khách chìa màn hình", receivedAmount: 75000 });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new URL(url).pathname).toMatch(/\/payments\/p1\/confirm$/);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ reason: "Khách chìa màn hình", receivedAmount: 75000 });
    await orderReal.confirmPayment({ chainId: "c", branchId: "b" }, "p1", { reason: "abc", receivedAmount: 80000, transactionRef: "FT123" });
    expect(JSON.parse((fetchMock.mock.calls[1] as [string, RequestInit])[1].body as string)).toEqual({ reason: "abc", receivedAmount: 80000, transactionRef: "FT123" });
  });

  it("xác nhận thủ công: 409 PAYMENT_ALREADY_SETTLED và PAYMENT_AMOUNT_INSUFFICIENT → câu tiếng Việt, lỗi ghi (POST)", async () => {
    vi.stubGlobal("fetch", respond({ statusCode: 409, message: "PAYMENT_ALREADY_SETTLED", error: "Conflict" }, 409));
    const settled = await orderReal.confirmPayment({ chainId: "c", branchId: "b" }, "p1", { reason: "abc", receivedAmount: 1 }).catch((e: unknown) => e);
    expect(settled).toMatchObject({ status: 409, method: "POST" });
    expect(describeApiError(settled)).toBe("Khoản này đã được xác nhận hoặc không còn chờ xác nhận. Đã tải lại đơn.");
    vi.stubGlobal("fetch", respond({ statusCode: 409, error: "PAYMENT_AMOUNT_INSUFFICIENT", message: "Số tiền thực nhận thấp hơn tổng tiền đơn hàng." }, 409));
    const short = await orderReal.confirmPayment({ chainId: "c", branchId: "b" }, "p1", { reason: "abc", receivedAmount: 1 }).catch((e: unknown) => e);
    expect(short).toMatchObject({ status: 409, code: "PAYMENT_AMOUNT_INSUFFICIENT" });
    expect(describeApiError(short)).toBe("Nhận thiếu so với tổng đơn. Không xác nhận được — cần huỷ đơn và ghi khoản phải hoàn.");
  });

  it("xác nhận thủ công: 409 tiền mặt / đơn không còn chờ / 400 thiếu ô → không lộ tiếng Anh", async () => {
    const run = async (status: number, body: unknown) => {
      vi.stubGlobal("fetch", respond(body, status));
      return describeApiError(await orderReal.confirmPayment({ chainId: "c", branchId: "b" }, "p1", { reason: "abc", receivedAmount: 1 }).catch((e: unknown) => e));
    };
    expect(await run(409, { statusCode: 409, message: "Only bank transfers can be confirmed manually", error: "Conflict" })).toBe("Chỉ xác nhận thủ công được khoản chuyển khoản, không xác nhận được tiền mặt.");
    expect(await run(409, { statusCode: 409, message: "Order is no longer awaiting payment", error: "Conflict" })).toMatch(/không còn ở trạng thái chờ thanh toán/);
    expect(await run(400, { statusCode: 400, message: ["receivedAmount must not be less than 0.01", "property foo should not exist"], error: "Bad Request" })).toMatch(/Số tiền thực nhận không được nhỏ hơn 0.01/);
    expect(await run(400, { statusCode: 400, message: "A manual confirmation reason of 3 to 500 characters is required", error: "Bad Request" })).toBe("Lý do xác nhận phải từ 3 đến 500 ký tự.");
  });
});

describe("khối lỗi trong trang cho tra cứu đơn", () => {
  it("khớp danh sách và mọi trang chi tiết, không khớp màn khác", () => {
    expect(isInlineErrorRoute("/manager/orders")).toBe(true);
    expect(isInlineErrorRoute("/manager/orders/3c2bb72d-f56a-41f6-a617-c5d3cf4c7c85")).toBe(true);
    expect(isInlineErrorRoute("/manager/orders/needs-attention")).toBe(true);
    expect(isInlineErrorRoute("/manager/staff")).toBe(false);
    expect(isInlineErrorRoute("/manager/ordersx")).toBe(false);
    expect(isInlineErrorRoute("/owner/reports")).toBe(true);
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

  it("chi tiết: đơn xác nhận thủ công, đơn nhiều khoản, đơn tuỳ chọn có đơn giá đã gồm giá cộng thêm", async () => {
    const all = await orderMock.listOrders(scope, { page: 1, limit: 100 });
    const idOf = (suffix: string) => all.items.find((o) => o.id.endsWith(suffix))!.id;
    const manual = await orderMock.getOrder(scope, idOf("scn-manual"));
    expect(manual.payments).toHaveLength(1);
    expect(manual.payments[0]).toMatchObject({ method: "BANK_TRANSFER", status: "SUCCESS", processedBy: "Quản lý mẫu", transactionRef: "FT26100812345", receivedAmount: 80000, amount: 75000 });
    expect(manual.payments[0].confirmationReason).toMatch(/webhook không về/i);
    const multi = await orderMock.getOrder(scope, idOf("scn-multi"));
    expect(multi.payments.map((p) => `${p.method}/${p.status}`)).toEqual(["BANK_TRANSFER/PENDING", "CASH/SUCCESS"]);
    expect(multi.lines).toHaveLength(2);
    const opt = await orderMock.getOrder(scope, idOf("scn-options"));
    expect(opt.lines[0]).toMatchObject({ unitPrice: 50000, quantity: 2, total: 100000, note: "ít đá" });
    expect(opt.lines[0].options.reduce((s, o) => s + o.priceDelta, 0)).toBe(15000);
    const cancelled = (await orderMock.listOrders(scope, { page: 1, limit: 100, status: "CANCELLED" })).items[0];
    const cd = await orderMock.getOrder(scope, cancelled.id);
    expect(cd.cancelledBy).toBeTruthy();
    expect(cd.cancelledAt).toBeTruthy();
  });

  it("chi tiết: id lạ → 404", async () => {
    await expect(orderMock.getOrder(scope, "khong-co")).rejects.toMatchObject({ status: 404 });
  });

  describe("xác nhận thủ công (BM-05)", () => {
    const find = async (suffix: string) => {
      const all = await orderMock.listOrders(scope, { page: 1, limit: 100 });
      return orderMock.getOrder(scope, all.items.find((o) => o.id.endsWith(suffix))!.id);
    };

    it("kịch bản: khoản chờ, lệch số tiền (kèm số nhận), FAILED, đơn Cần xử lý lọc được", async () => {
      const waiting = await find("scn-qr-waiting");
      expect(waiting.payments.map((p) => `${p.method}/${p.status}`)).toEqual(["BANK_TRANSFER/PENDING"]);
      const short = await find("scn-mismatch-short");
      expect(short).toMatchObject({ status: "REQUIRES_ATTENTION", paymentStatus: "UNPAID", total: 75000 });
      expect(short.payments[0]).toMatchObject({ status: "AMOUNT_MISMATCH", receivedAmount: 70000, amount: 75000 });
      expect((await find("scn-mismatch-over")).payments[0]).toMatchObject({ status: "AMOUNT_MISMATCH", receivedAmount: 70000, amount: 65000 });
      expect((await find("scn-qr-failed")).payments[0]).toMatchObject({ status: "FAILED", failureReason: "PAYOS_EXPIRED" });
      const attention = await orderMock.listOrders(scope, { page: 1, limit: 100, status: "REQUIRES_ATTENTION" });
      expect(attention.items.length).toBeGreaterThanOrEqual(2);
      expect(attention.items.every((o) => o.status === "REQUIRES_ATTENTION")).toBe(true);
    });

    it("nhận đủ: khoản SUCCESS kèm người xác nhận, lý do, số nhận; đơn Đã thanh toán có số gọi; GET lại thấy ngay", async () => {
      const order = await find("scn-qr-waiting");
      await orderMock.confirmPayment(scope, order.payments[0].id, { reason: "  Khách chìa màn hình  ", receivedAmount: 75000, transactionRef: "FT999" });
      const after = await orderMock.getOrder(scope, order.id);
      expect(after).toMatchObject({ status: "SUBMITTED", paymentStatus: "PAID" });
      expect(after.callNumber).not.toBeNull();
      expect(after.payments[0]).toMatchObject({ status: "SUCCESS", receivedAmount: 75000, confirmationReason: "Khách chìa màn hình", transactionRef: "FT999", processedBy: "Quản lý mẫu" });
      // Bấm lần hai: 409 PAYMENT_ALREADY_SETTLED
      await expect(orderMock.confirmPayment(scope, order.payments[0].id, { reason: "abc", receivedAmount: 75000 })).rejects.toMatchObject({ status: 409, message: "PAYMENT_ALREADY_SETTLED" });
    });

    it("nhận thiếu → 409 PAYMENT_AMOUNT_INSUFFICIENT, không đổi gì; nhận dư vẫn được", async () => {
      const short = await find("scn-mismatch-short");
      await expect(orderMock.confirmPayment(scope, short.payments[0].id, { reason: "abc", receivedAmount: 70000 })).rejects.toMatchObject({ status: 409, code: "PAYMENT_AMOUNT_INSUFFICIENT" });
      expect((await orderMock.getOrder(scope, short.id)).status).toBe("REQUIRES_ATTENTION");
      const over = await find("scn-mismatch-over");
      await orderMock.confirmPayment(scope, over.payments[0].id, { reason: "Nhận dư 5.000", receivedAmount: 70000 });
      expect((await orderMock.getOrder(scope, over.id)).payments[0]).toMatchObject({ status: "SUCCESS", receivedAmount: 70000 });
    });

    it("tiền mặt → 409; lý do ngắn hoặc thiếu số tiền → 400; khoản không có → 404; đơn huỷ → 409", async () => {
      const cash = await find("scn-cash-waiting");
      await expect(orderMock.confirmPayment(scope, cash.payments[0].id, { reason: "abc", receivedAmount: 65000 })).rejects.toMatchObject({ status: 409, message: expect.stringMatching(/Only bank transfers/) });
      const waiting = await find("scn-qr-waiting");
      await expect(orderMock.confirmPayment(scope, waiting.payments[0].id, { reason: "ab", receivedAmount: 75000 })).rejects.toMatchObject({ status: 400 });
      await expect(orderMock.confirmPayment(scope, waiting.payments[0].id, { reason: "abc", receivedAmount: 0 })).rejects.toMatchObject({ status: 400 });
      await expect(orderMock.confirmPayment(scope, "khong-co", { reason: "abc", receivedAmount: 1 })).rejects.toMatchObject({ status: 404 });
      const cancelled = await find("scn-cancelled-pending");
      await expect(orderMock.confirmPayment(scope, cancelled.payments[0].id, { reason: "abc", receivedAmount: 65000 })).rejects.toMatchObject({ status: 409, message: expect.stringMatching(/no longer awaiting/) });
    });

    it("kịch bản xung đột: webhook về trước → 409 PAYMENT_ALREADY_SETTLED và đơn đã trả không có người xác nhận", async () => {
      const order = await find("scn-qr-conflict");
      await expect(orderMock.confirmPayment(scope, order.payments[0].id, { reason: "abc", receivedAmount: 70000 })).rejects.toMatchObject({ status: 409, message: "PAYMENT_ALREADY_SETTLED" });
      const after = await orderMock.getOrder(scope, order.id);
      expect(after).toMatchObject({ status: "SUBMITTED", paymentStatus: "PAID" });
      expect(after.payments[0].confirmationReason).toBeNull();
    });
  });
});
