// Kiểm tra trình duyệt thật cho Giai đoạn 7 (Manager xử lý đơn): khối `orders` = Tra cứu đơn (BM-04, 7.1). Khối sau thêm ở 7.2–7.6.
//   node scripts/browser/phase7.mjs --mode=mock --only=orders   # dev server 5173 với VITE_API_*=mock (gồm ORDER, AUTH), AUTH_MODE=mock
//   node scripts/browser/phase7.mjs --mode=real --only=orders   # dev server 5173 cờ mặc định: CHỈ ĐỌC, BE local có "Quầy 1" và 11 đơn (docs 7.0b)
//     Real: mọi request GHI bị chặn ở CDP (kỳ vọng 0 request ghi, vì màn chỉ có GET). Ca "trả lời giả" dùng `tab.readOverride`
//     (GET /manager/orders nhận body do script dựng, KHÔNG tới BE) để thử mã trạng thái lạ.
//   Dữ liệu real kỳ vọng: 11 đơn COUNTER_PICKUP của Nguyễn Huệ (8 SUBMITTED/PAID, 1 DELIVERED/PAID, 1 CONFIRMED/UNPAID, 1 CANCELLED/UNPAID).
import { readFileSync } from "node:fs";
import { check, cli, closeTab, newTab, results, sleep, SESSION_ALLOW } from "./cdp.mjs";

const CLI = cli();
const MODE = CLI.mode ?? "mock";
const REAL = MODE === "real";
const BLOCKS = ["orders"];
if (CLI.only && !CLI.only.every((n) => BLOCKS.includes(n))) {
  console.log(`--only hỗ trợ: ${BLOCKS.join(", ")} (nhận được: ${CLI.only.join(",")})`);
  process.exit(2);
}
const want = (n) => !CLI.only || CLI.only.includes(n);
const J = JSON.stringify;
const tab = await newTab("about:blank", REAL ? "real" : "mock");
const q = (expr) => tab.eval(expr);
if (REAL) await tab.blockWrites(SESSION_ALLOW);

const tid = (id) => `document.querySelector('[data-testid=${J(id)}]')`;
const has = (id) => q(`!!${tid(id)}`);
const spaGo = async (to) => {
  await q(`(() => { history.pushState({}, "", ${J(to)}); dispatchEvent(new PopStateEvent("popstate")); })()`);
  await sleep(700);
};
const loc = () => q(`location.pathname + location.search`);
const ROWS = `document.querySelectorAll(".ant-table-tbody > tr.ant-table-row")`;
const rowCount = () => q(`${ROWS}.length`);
const rowTexts = () => q(`[...${ROWS}].map((r) => r.innerText.replace(/\\s+/g, " ").trim())`);
const totalText = () => q(`${tid("order-total")}?.innerText ?? ""`);
const toasts = () => q(`[...document.querySelectorAll(".ant-message-notice, .ant-notification-notice")].map((e) => e.textContent).join(" | ")`);
/** Chờ bảng ổn định: hết quay và có số tổng. */
const settle = async (ms = 12000) => {
  await sleep(450); // cho yêu cầu mới kịp bắt đầu (bảng cũ còn hiện "đơn" trong lúc chờ)
  await tab.waitFor(`!document.querySelector(".ant-spin-spinning") && (${tid("order-total")}?.innerText ?? "").includes("đơn") || ${tid("order-error")}`, ms, "bảng đơn nạp xong");
  await sleep(250);
};
const freshLogin = async () => {
  await tab.goto("/login");
  await tab.clearStorage();
  await tab.goto("/login");
  await tab.login("manager");
  await tab.waitFor(`location.pathname.startsWith("/manager")`, 20000, "vào /manager");
  await tab.waitFor(`document.querySelector(".ant-layout-sider")`, 15000, "shell manager");
  await sleep(900);
};
const goOrders = async (search = "") => {
  await spaGo("/manager/dashboard");
  await spaGo("/manager/orders" + search);
  await settle();
};
const setInput = (id, value) =>
  q(`(() => { const el = ${tid(id)}; const input = el.matches("input") ? el : el.querySelector("input");
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, ${J(value)}); input.dispatchEvent(new Event("input", { bubbles: true })); })()`);
const clickTid = (id) => q(`(() => { const el = ${tid(id)}; if (!el) return false; el.click(); return true })()`);
const pickSelect = async (rootExpr, text) => {
  await q(`(() => { const root = ${rootExpr}; const sel = root.querySelector(".ant-select-content, .ant-select-selector") ?? root; sel.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); })()`);
  await sleep(350);
  // Dấu * cuối = khớp phần đầu (ô cỡ trang của antd: "50 / page" hay "50 / trang" tuỳ ngôn ngữ).
  const ok = await q(`(() => { const t = ${J(text)}; const o = [...document.querySelectorAll(".ant-select-item-option")].find((e) => t.endsWith("*") ? e.textContent.trim().startsWith(t.slice(0, -1)) : e.textContent.trim() === t); if (!o) return false; o.click(); return true })()`);
  await sleep(500);
  return ok;
};
const reload = async () => {
  await tab.send("Page.reload");
  await sleep(1200);
  await tab.waitFor(`document.readyState === "complete"`, 20000, "tải lại trang");
  await tab.waitFor(`document.querySelector(".ant-layout-sider")`, 30000, "shell sau F5");
  await settle(20000);
};
const chips = () => q(`[...${ROWS}].map((r) => [...r.querySelectorAll("td")].slice(4, 7).map((c) => c.innerText.trim()))`);
const vnDay = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(d);
const vnDayMinus = (n) => vnDay(new Date(Date.now() - n * 86_400_000));
const RAW_CODES = /CONFIRMED|SUBMITTED|PREPARING|DELIVERED|CANCELLED|UNPAID|BANK_TRANSFER|COUNTER_PICKUP|\bPAID\b/;
const listCalls = () => tab.requests.filter((r) => r.method === "GET" && /\/manager\/orders\?/.test(r.url));

/** Đọc BE bằng GET (chỉ đọc) để đối chiếu; đăng nhập bằng .env của BE (không in mật khẩu). */
async function readBe() {
  const env = Object.fromEntries(
    readFileSync("C:/Capstone_Project/BE_FnB/SmartFnBBackend/.env", "utf8")
      .split(/\r?\n/)
      .filter((l) => /^[A-Z_]+=/.test(l))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^["']|["']$/g, "")]),
  );
  const base = "http://localhost:3100/api/v1";
  const login = await (await fetch(base + "/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: J({ email: "manager.demo@smartfnb.local", password: env.SEED_DEMO_PASSWORD }) })).json();
  const get = async (path) => {
    const r = await fetch(base + path, { headers: { Authorization: `Bearer ${login.accessToken}` } });
    return { status: r.status, body: await r.json().catch(() => null) };
  };
  return { get };
}

try {
  if (want("orders")) {
    await freshLogin();

    if (!REAL) {
      // ---- mock ----------------------------------------------------------------------------------------------------
      await goOrders();
      check("Mock · Tra cứu đơn: không còn placeholder, có bộ lọc và bảng", (await has("order-filters")) && (await has("order-table")), await loc());
      check("Mock · Mặc định: 20 dòng, URL sạch, tổng có chữ 'đơn'", (await rowCount()) === 20 && (await loc()) === "/manager/orders" && /đơn$/.test(await totalText()), `${await rowCount()} · ${await totalText()}`);
      const head = await q(`[...document.querySelectorAll(".ant-table-thead th")].map((t) => t.innerText.trim()).filter(Boolean)`);
      check("Mock · Cột: Số gọi, Mã đơn, Thời gian đặt, Tổng tiền, Trạng thái đơn, Thanh toán, Hình thức, Thu ngân", J(head) === J(["Số gọi", "Mã đơn", "Thời gian đặt", "Tổng tiền", "Trạng thái đơn", "Thanh toán", "Hình thức", "Thu ngân"]), J(head));
      const body = (await rowTexts()).join(" ");
      check("Mock · Không hiện mã tiếng Anh của BE; tiền dạng ₫; thời gian dd/MM/yyyy HH:mm", !RAW_CODES.test(body) && /₫/.test(body) && /\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/.test(body), body.slice(0, 160));

      // Từng trạng thái đơn: lọc ra đúng nhãn.
      for (const [value, label] of [["CONFIRMED", "Chờ thanh toán"], ["SUBMITTED", "Đã thanh toán"], ["PREPARING", "Đang pha"], ["READY", "Sẵn sàng"], ["DELIVERED", "Hoàn tất"], ["CANCELLED", "Đã huỷ"]]) {
        await goOrders();
        const ok = await pickSelect(tid("order-status"), label);
        await settle();
        const cells = (await chips()).map((c) => c[0]);
        check(`Mock · Lọc trạng thái '${label}': URL status=${value}, mọi dòng đúng nhãn`, ok && (await loc()) === `/manager/orders?status=${value}` && cells.length > 0 && cells.every((c) => c === label), `${cells.length} dòng · ${await loc()}`);
      }
      await goOrders();
      await pickSelect(tid("order-payment"), "Chưa thanh toán");
      await settle();
      const unpaid = (await chips()).map((c) => c[1]);
      check("Mock · Lọc 'Chưa thanh toán': mọi dòng là Khởi tạo / Chờ chuyển khoản / Đã huỷ", unpaid.length > 0 && unpaid.every((c) => ["Khởi tạo", "Chờ chuyển khoản", "Đã huỷ"].includes(c)), J([...new Set(unpaid)]));
      await goOrders();
      await pickSelect(tid("order-method"), "Chuyển khoản (QR)");
      await settle();
      const methods = (await chips()).map((c) => c[2]);
      check("Mock · Lọc hình thức 'Chuyển khoản (QR)': mọi dòng đúng", methods.length > 0 && methods.every((c) => c === "Chuyển khoản (QR)"), J([...new Set(methods)]));

      // Số gọi, mã đơn.
      await goOrders();
      await setInput("order-call", "9a0b0");
      check("Mock · Ô Số gọi chỉ nhận số ('9a0b0' → '900')", (await q(`${tid("order-call")}.value`)) === "900");
      const callsBefore = listCalls().length;
      await clickTid("order-search");
      await settle();
      check("Mock · Số gọi 900: URL callNumber=900, đúng 1 đơn", (await loc()) === "/manager/orders?callNumber=900" && (await rowCount()) === 1, await loc());
      const oneRow = (await rowTexts())[0];
      await goOrders();
      await setInput("order-code", "  CTR  ");
      await sleep(600);
      check("Mock · Gõ mã đơn chưa bấm Tìm: URL chưa đổi", (await loc()) === "/manager/orders");
      await clickTid("order-search");
      await settle();
      check("Mock · Tìm mã đơn (cắt khoảng trắng): URL orderCode=CTR", (await loc()) === "/manager/orders?orderCode=CTR" && (await rowCount()) > 0, await loc());
      void callsBefore;

      // Phân trang, F5, cỡ trang.
      await goOrders();
      const total = Number((await totalText()).replace(/\D/g, ""));
      await q(`document.querySelector(".ant-pagination-item-2").click()`);
      await settle();
      check("Mock · Sang trang 2: URL page=2, 20 dòng", (await loc()) === "/manager/orders?page=2" && (await rowCount()) === 20 && total > 40, `${await loc()} · tổng ${total}`);
      const page2 = (await rowTexts())[0];
      await reload();
      check("Mock · F5 giữ nguyên trang 2 (cùng dòng đầu, trang 2 đang chọn)", (await loc()) === "/manager/orders?page=2" && (await rowTexts())[0] === page2 && (await q(`document.querySelector(".ant-pagination-item-active")?.innerText`)) === "2");
      check("Mock · Phân trang có ô chọn cỡ trang", (await q(`document.querySelectorAll(".ant-pagination-options .ant-select").length`)) === 1);
      await pickSelect(`document.querySelector(".ant-pagination-options .ant-select")`, "50 /*");
      await settle();
      check("Mock · Đổi cỡ trang 50: về trang 1, URL limit=50, 50 dòng", (await loc()) === "/manager/orders?limit=50" && (await rowCount()) === 50, `${await loc()} · ${await rowCount()}`);

      // Lọc đổi → về trang 1.
      await goOrders("?page=2");
      await pickSelect(tid("order-status"), "Đã thanh toán");
      await settle();
      check("Mock · Đổi bộ lọc khi đang ở trang 2: về trang 1 (URL không còn page)", !/page=/.test(await loc()) && /status=SUBMITTED/.test(await loc()), await loc());
      await reload();
      check("Mock · F5 giữ bộ lọc trạng thái", /status=SUBMITTED/.test(await loc()) && (await q(`document.querySelector('[data-testid="order-status"]').innerText`)).includes("Đã thanh toán"));

      // Xoá bộ lọc.
      await goOrders("?status=CANCELLED&callNumber=1&orderCode=CTR&payment=PAID&method=CASH&limit=50&page=1");
      check("Mock · Nạp bộ lọc từ URL vào các ô", (await q(`${tid("order-call")}.value`)) === "1" && (await q(`${tid("order-code")}.value`)) === "CTR");
      await clickTid("order-clear");
      await settle();
      check("Mock · Xoá bộ lọc: URL về /manager/orders, các ô trống, 20 dòng", (await loc()) === "/manager/orders" && (await q(`${tid("order-call")}.value`)) === "" && (await q(`${tid("order-code")}.value`)) === "" && (await rowCount()) === 20);

      // URL hỏng.
      await goOrders("?from=abc&status=FOO&page=-2&limit=7&callNumber=xx&lạ=1");
      check("Mock · URL hỏng: bỏ qua, về mặc định, không lỗi, không toast", (await rowCount()) === 20 && (await toasts()) === "" && !(await has("order-error")));

      // Rỗng.
      await goOrders("?from=2000-01-01&to=2000-01-02");
      check("Mock · Khoảng ngày không có đơn: 'Không có đơn trong khoảng thời gian này'", /Không có đơn trong khoảng thời gian này/.test(await q(`document.body.innerText`)) && (await rowCount()) === 0);
      await goOrders("?from=2000-01-01&to=2000-01-02&callNumber=5");
      check("Mock · Rỗng khi có bộ lọc: 'Không có đơn nào khớp bộ lọc'", /Không có đơn nào khớp bộ lọc/.test(await q(`document.body.innerText`)));

      // Bấm dòng.
      await goOrders("?callNumber=900");
      const id = await q(`document.querySelector(".ant-table-tbody > tr.ant-table-row").getAttribute("data-row-key")`);
      await q(`document.querySelector(".ant-table-tbody > tr.ant-table-row").click()`);
      await sleep(900);
      check("Mock · Bấm dòng: sang đúng /manager/orders/:id", (await q(`location.pathname`)) === `/manager/orders/${id}`, await loc());
      void oneRow;
    } else {
      // ---- real (chỉ đọc) -------------------------------------------------------------------------------------------
      const be = await readBe();
      const beAll = (await be.get("/manager/orders?type=COUNTER_PICKUP&limit=100")).body;
      const expectTotal = beAll.total;
      const byStatus = (s) => beAll.items.filter((o) => o.status === s);
      tab.requests.length = 0;
      await goOrders();
      check("Real · Không còn placeholder; mặc định hiện đủ đơn của BE", (await has("order-table")) && (await rowCount()) === expectTotal && (await totalText()) === `${expectTotal} đơn`, `${await rowCount()} dòng · BE ${expectTotal}`);
      check("Real · Mặc định là 11 đơn của dữ liệu mẫu 7.0b", expectTotal === 11, String(expectTotal));
      const calls = listCalls();
      const sample = calls[calls.length - 1]?.url ?? "";
      console.log("   MẪU GET:", sample.replace(/^https?:\/\/[^/]+/, ""));
      const u = new URL(sample || "http://x/");
      check("Real · GET /manager/orders có type=COUNTER_PICKUP, page=1, limit=20", u.searchParams.get("type") === "COUNTER_PICKUP" && u.searchParams.get("page") === "1" && u.searchParams.get("limit") === "20", u.search);
      check(
        "Real · from/to là ISO +07:00: từ 00:00 ngày đầu (hôm nay − 6) đến 23:59:59.999 hôm nay giờ Việt Nam",
        u.searchParams.get("from") === `${vnDayMinus(6)}T00:00:00.000+07:00` && u.searchParams.get("to") === `${vnDay()}T23:59:59.999+07:00`,
        `${u.searchParams.get("from")} → ${u.searchParams.get("to")}`,
      );
      check("Real · MỌI GET /manager/orders của khối đều có type=COUNTER_PICKUP (kiểm lại ở cuối khối)", calls.every((r) => new URL(r.url).searchParams.get("type") === "COUNTER_PICKUP"));

      const body = (await rowTexts()).join(" ");
      check("Real · Nhãn tiếng Việt, không lộ mã BE; tiền ₫", !RAW_CODES.test(body) && /Chờ thanh toán/.test(body) && /Đã thanh toán/.test(body) && /Hoàn tất/.test(body) && /Đã huỷ/.test(body) && /₫/.test(body));
      const cashierCells = await q(`[...${ROWS}].map((r) => r.querySelectorAll("td")[7].innerText.trim())`);
      check("Real · Thu ngân là họ tên (Lan Thu ngân), không phải mã", cashierCells.every((c) => c === "Lan Thu ngân"), J([...new Set(cashierCells)]));
      const first = beAll.items[0];
      const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(first.placedAt)).replace(",", "");
      check("Real · Thời gian đặt giờ Việt Nam khớp BE", (await rowTexts())[0].includes(fmt), `${fmt} ⊂ ${(await rowTexts())[0].slice(0, 60)}`);

      // Lọc.
      await pickSelect(tid("order-status"), "Đã huỷ");
      await settle();
      check("Real · Lọc 'Đã huỷ' → 1 đơn (status=CANCELLED)", (await rowCount()) === 1 && byStatus("CANCELLED").length === 1 && /status=CANCELLED/.test(await loc()), await loc());
      await goOrders();
      await pickSelect(tid("order-status"), "Chờ thanh toán");
      await settle();
      check("Real · Lọc 'Chờ thanh toán' → 1 đơn (chưa trả)", (await rowCount()) === 1 && byStatus("CONFIRMED").length === 1 && (await chips())[0][1] === "Khởi tạo", J(await chips()));
      await goOrders();
      await pickSelect(tid("order-status"), "Hoàn tất");
      await settle();
      check("Real · Lọc 'Hoàn tất' → 1 đơn (đã giao)", (await rowCount()) === 1 && byStatus("DELIVERED").length === 1);
      await goOrders();
      await pickSelect(tid("order-payment"), "Đã thanh toán");
      await settle();
      check("Real · Lọc thanh toán 'Đã thanh toán' → 9 đơn", (await rowCount()) === beAll.items.filter((o) => o.paymentStatus === "PAID").length && (await rowCount()) === 9);
      await goOrders();
      await pickSelect(tid("order-method"), "Tiền mặt");
      await settle();
      check("Real · Lọc hình thức 'Tiền mặt' → 9 đơn", (await rowCount()) === 9, String(await rowCount()));
      await goOrders();
      await pickSelect(tid("order-method"), "Chuyển khoản (QR)");
      await settle();
      check("Real · Lọc hình thức 'Chuyển khoản (QR)' → 0 đơn (chưa có đơn QR), câu rỗng đúng", (await rowCount()) === 0 && /Không có đơn nào khớp bộ lọc/.test(await q(`document.body.innerText`)));
      await goOrders();
      await setInput("order-call", "1");
      await clickTid("order-search");
      await settle();
      const rowsCall1 = await rowTexts();
      check("Real · Số gọi 1 → đúng đơn có tổng 65.000 ₫ (CTR-…55E81C)", rowsCall1.length === 1 && /65\.000/.test(rowsCall1[0]) && /55E81C/.test(rowsCall1[0]) && (await loc()) === "/manager/orders?callNumber=1", rowsCall1[0]);
      await clickTid("order-clear");
      await settle();
      await setInput("order-code", "55e81c");
      await clickTid("order-search");
      await settle();
      check("Real · Mã đơn 55e81c (không phân biệt hoa thường) → 1 đơn", (await rowCount()) === 1);

      // Phân trang: tối thiểu 20 dòng/trang nên trang 2 của 11 đơn rỗng → màn tự về trang cuối.
      await goOrders("?page=2");
      check("Real · ?page=2 khi chỉ có 11 đơn: về trang cuối (URL không còn page), 11 dòng", (await rowCount()) === 11 && (await loc()) === "/manager/orders", await loc());
      const p3 = (await be.get("/manager/orders?type=COUNTER_PICKUP&limit=5&page=3")).body;
      check("Real · Hợp đồng BE (GET): limit=5 trang 3 → 1 dòng, total 11", p3.items.length === 1 && p3.total === 11, `${p3.items.length}/${p3.total}`);
      await reload();
      check("Real · F5 giữ nguyên (11 dòng)", (await rowCount()) === 11);

      // Khoảng ngày xa: không có đơn.
      await goOrders("?from=2020-01-01&to=2020-01-31");
      check("Real · Khoảng ngày xa: 'Không có đơn trong khoảng thời gian này'", /Không có đơn trong khoảng thời gian này/.test(await q(`document.body.innerText`)) && (await rowCount()) === 0);

      // Trả lời giả: mã lạ → "Khác (<mã>)".
      const fake = (status, paymentStatus, payments = []) => ({
        id: "00000000-0000-4000-8000-0000000000" + status.length.toString().padStart(2, "0"),
        orderCode: "CTR-FAKE-" + status,
        callNumber: null,
        type: "COUNTER_PICKUP",
        status,
        paymentStatus,
        totalAmount: "35000",
        placedAt: new Date().toISOString(),
        paidAt: null,
        cancelledAt: null,
        cancellationReason: null,
        createdByCashier: { id: "e", employeeCode: "DEMO-CASHIER-01", firstName: "Lan", lastName: "Thu ngân" },
        createdByWaiter: null,
        payments,
        tableSession: null,
        items: [{ id: "i", itemName: "Trà đào", unitPrice: "35000", quantity: 1, totalPrice: "45000", status: "QUEUED", selectedOptions: [{ id: "o", name: "L", groupCode: "SIZE", groupName: "Kích cỡ", priceDelta: "10000" }] }],
      });
      tab.readOverride = {
        match: /\/manager\/orders\?/,
        body: J({
          items: [
            fake("WEIRD_STATUS", "UNPAID"),
            fake("PENDING", "UNPAID"),
            fake("CONFIRMED", "UNPAID", [{ id: "p", paymentCode: "P", method: "BANK_TRANSFER", status: "PENDING", amount: "35000" }]),
            fake("SERVED", "PARTIALLY_PAID", [{ id: "p2", paymentCode: "P2", method: "CARD", status: "SUCCESS", amount: "35000" }]),
          ],
          total: 4,
          page: 1,
          limit: 20,
        }),
      };
      await goOrders();
      const fakeRows = (await rowTexts()).join(" | ");
      check("Real · Trả lời giả: mã trạng thái lạ → 'Khác (WEIRD_STATUS)', PENDING → 'Khác (PENDING)', SERVED → 'Khác (SERVED)'", /Khác \(WEIRD_STATUS\)/.test(fakeRows) && /Khác \(PENDING\)/.test(fakeRows) && /Khác \(SERVED\)/.test(fakeRows), fakeRows.slice(0, 200));
      check("Real · Trả lời giả: thanh toán 'Chờ chuyển khoản', 'Khác (PARTIALLY_PAID)', hình thức 'Khác (CARD)'", /Chờ chuyển khoản/.test(fakeRows) && /Khác \(PARTIALLY_PAID\)/.test(fakeRows) && /Khác \(CARD\)/.test(fakeRows), fakeRows.slice(0, 200));
      check("Real · Trả lời giả: không toast, không khối lỗi", (await toasts()) === "" && !(await has("order-error")));
      tab.readOverride = null;

      // Mọi GET danh sách đều có type=COUNTER_PICKUP (cả phần đã chạy).
      const allCalls = listCalls();
      check(`Real · TỔNG ${allCalls.length} GET /manager/orders: đều type=COUNTER_PICKUP, from/to có +07:00`, allCalls.length > 10 && allCalls.every((r) => { const p = new URL(r.url).searchParams; return p.get("type") === "COUNTER_PICKUP" && /\+07:00$/.test(p.get("from") ?? "") && /\+07:00$/.test(p.get("to") ?? ""); }), String(allCalls.length));
      check("Real · 0 request ghi trong khối orders", (tab.writeLog ?? []).length === 0 && tab.blockedWrites.length === 0, `${(tab.writeLog ?? []).length}`);
    }
  }
} catch (e) {
  console.log("ERROR", e.stack ?? e.message);
  check("script chạy hết không lỗi", false, e.message);
}

await closeTab(tab);
const failed = results.filter((r) => !r.ok);
console.log(`\n[${MODE}] ${results.length - failed.length}/${results.length} đạt`);
process.exit(failed.length ? 1 : 0);
