// Kiểm tra trình duyệt thật cho Giai đoạn 7 (Manager xử lý đơn): khối `orders` = Tra cứu đơn (BM-04, 7.1). Khối sau thêm ở 7.2–7.6.
//   node scripts/browser/phase7.mjs --mode=mock --only=orders   # dev server 5173 với VITE_API_*=mock (gồm ORDER, AUTH), AUTH_MODE=mock
//   node scripts/browser/phase7.mjs --mode=real --only=orders   # dev server 5173 cờ mặc định: CHỈ ĐỌC, BE local có "Quầy 1" và 11 đơn (docs 7.0b)
//     Real: mọi request GHI bị chặn ở CDP (kỳ vọng 0 request ghi, vì màn chỉ có GET). Ca "trả lời giả" dùng `tab.readOverride`
//     (GET /manager/orders nhận body do script dựng, KHÔNG tới BE) để thử mã trạng thái lạ.
//   Dữ liệu real kỳ vọng: 11 đơn COUNTER_PICKUP của Nguyễn Huệ (8 SUBMITTED/PAID, 1 DELIVERED/PAID, 1 CONFIRMED/UNPAID, 1 CANCELLED/UNPAID).
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { check, cli, closeTab, newTab, results, sleep, SESSION_ALLOW } from "./cdp.mjs";

const CLI = cli();
const MODE = CLI.mode ?? "mock";
const REAL = MODE === "real";
// Khối `detail` (trang chi tiết đơn, 7.2): mock + real (chỉ đọc). Khối `realtime` (tự làm tươi qua socket, 7.2): CHỈ real và CHỈ chạy khi
// gọi tên `--only=realtime` — nó TẠO 2 đơn tiền mặt mới trên BE local bằng scripts/data/create-one-cash-order.mjs (request ghi đi từ Node,
// KHÔNG qua trình duyệt; trình duyệt vẫn bị chặn ghi ở CDP), rồi đưa 1 đơn qua pha chế. Xem docs/BAN-GIAO.md, quyết định 75.
const BLOCKS = ["orders", "detail", "realtime"];
if (CLI.only && !CLI.only.every((n) => BLOCKS.includes(n))) {
  console.log(`--only hỗ trợ: ${BLOCKS.join(", ")} (nhận được: ${CLI.only.join(",")})`);
  process.exit(2);
}
const want = (n) => (n === "realtime" ? !!CLI.only?.includes("realtime") : !CLI.only || CLI.only.includes(n));
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
  return { get, pw: env.SEED_DEMO_PASSWORD };
}

try {
  await freshLogin();
  if (want("orders")) {
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
      // BE lọc theo MỌI khoản thanh toán của đơn nên đơn có QR bỏ dở rồi trả tiền mặt (mock `scn-multi`) cũng khớp.
      check("Mock · Lọc hình thức 'Chuyển khoản (QR)': mọi dòng có khoản Chuyển khoản (QR)", methods.length > 0 && methods.every((c) => c.includes("Chuyển khoản (QR)")), J([...new Set(methods)]));

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
      // 11 đơn mẫu của 7.0b; khối `realtime` (7.2) thêm 2 đơn nữa → 13. Các ca dưới tính từ BE nên chịu được cả hai.
      check("Real · Có đủ 11 đơn mẫu 7.0b (cộng đơn tạo thêm ở khối realtime nếu đã chạy)", expectTotal >= 11 && expectTotal <= 20, String(expectTotal));
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
      check("Real · Lọc 'Đã huỷ' → đúng số đơn huỷ của BE (1) (status=CANCELLED)", (await rowCount()) === byStatus("CANCELLED").length && byStatus("CANCELLED").length === 1 && /status=CANCELLED/.test(await loc()), await loc());
      await goOrders();
      await pickSelect(tid("order-status"), "Chờ thanh toán");
      await settle();
      check("Real · Lọc 'Chờ thanh toán' → đúng số đơn chưa trả của BE (1), thanh toán 'Khởi tạo'", (await rowCount()) === byStatus("CONFIRMED").length && byStatus("CONFIRMED").length === 1 && (await chips())[0][1] === "Khởi tạo", J(await chips()));
      await goOrders();
      await pickSelect(tid("order-status"), "Hoàn tất");
      await settle();
      check("Real · Lọc 'Hoàn tất' → đúng số đơn đã giao của BE (≥ 1)", (await rowCount()) === byStatus("DELIVERED").length && byStatus("DELIVERED").length >= 1, `${await rowCount()}`);
      await goOrders();
      await pickSelect(tid("order-payment"), "Đã thanh toán");
      await settle();
      check("Real · Lọc thanh toán 'Đã thanh toán' → đúng số đơn PAID của BE (≥ 9)", (await rowCount()) === beAll.items.filter((o) => o.paymentStatus === "PAID").length && (await rowCount()) >= 9, `${await rowCount()}`);
      await goOrders();
      await pickSelect(tid("order-method"), "Tiền mặt");
      await settle();
      check("Real · Lọc hình thức 'Tiền mặt' → đúng số đơn có khoản tiền mặt của BE (≥ 9)", (await rowCount()) === beAll.items.filter((o) => o.payments.some((p) => p.method === "CASH")).length && (await rowCount()) >= 9, String(await rowCount()));
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
      check(`Real · ?page=2 khi chỉ có ${expectTotal} đơn (≤ 20): về trang cuối (URL không còn page), đủ ${expectTotal} dòng`, (await rowCount()) === expectTotal && (await loc()) === "/manager/orders", await loc());
      const p3 = (await be.get("/manager/orders?type=COUNTER_PICKUP&limit=5&page=3")).body;
      check(`Real · Hợp đồng BE (GET): limit=5 trang 3 → ${expectTotal - 10} dòng, total ${expectTotal}`, p3.items.length === expectTotal - 10 && p3.total === expectTotal, `${p3.items.length}/${p3.total}`);
      await reload();
      check(`Real · F5 giữ nguyên (${expectTotal} dòng)`, (await rowCount()) === expectTotal);

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

  // ---- detail: trang chi tiết đơn (BM-04, quyết định 73) ---------------------------------------------------------------
  if (want("detail")) {
    const detailLoaded = () => tab.waitFor(`${tid("order-detail")} || ${tid("order-detail-notfound")} || ${tid("order-detail-error")}`, 15000, "trang chi tiết nạp xong");
    const goDetail = async (id, search = "") => {
      await spaGo("/manager/dashboard");
      await spaGo("/manager/orders" + search);
      await settle();
      await spaGo("/manager/orders/" + id);
      await detailLoaded();
      await sleep(300);
    };
    const t = (id) => q(`${tid(id)}?.innerText.replace(/\\s+/g, " ").trim() ?? ""`);
    const lineRows = () => q(`[...document.querySelectorAll('[data-testid="order-detail-lines"] tr.ant-table-row')].map((r) => r.innerText.replace(/\\s+/g, " ").trim())`);
    const payRows = () => q(`[...document.querySelectorAll('[data-testid="order-detail-payments"] tr.ant-table-row')].map((r) => r.innerText.replace(/\\s+/g, " ").trim())`);
    const idByCall = async (call) => {
      await goOrders(`?callNumber=${call}`);
      return q(`document.querySelector(".ant-table-tbody > tr.ant-table-row")?.getAttribute("data-row-key") ?? null`);
    };
    const DT = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/;

    if (!REAL) {
      const idOpt = await idByCall(900);
      await goDetail(idOpt);
      check("Mock · Chi tiết: không còn placeholder; đầu trang có số gọi, mã đơn, trạng thái, thanh toán, thu ngân", (await t("order-detail-call")) === "900" && /^CTR-\d+$/.test(await t("order-detail-code")) && (await t("order-detail-status")) === "Hoàn tất" && (await t("order-detail-payment")) === "Đã thanh toán" && (await t("order-detail-cashier")) === "Thu ngân mẫu");
      check("Mock · Thời gian đặt và thanh toán dạng dd/MM/yyyy HH:mm giờ VN", DT.test(await t("order-detail-placed")) && DT.test(await t("order-detail-paid-at")));
      const opts = await t("order-line-options");
      check("Mock · Dòng món: tuỳ chọn và topping kèm giá cộng thêm", /Kích cỡ: L \(\+10\.000/.test(opts) && /Mức đường: 50% đường/.test(opts) && /Topping: Trân châu đen \(\+5\.000/.test(opts), opts);
      const row = (await lineRows())[0];
      check("Mock · Dòng món: SL 2, giá lúc bán 50.000, thành tiền 100.000, ghi chú, trạng thái Xong", /Trà đào/.test(row) && /Ghi chú: ít đá/.test(row) && /50\.000/.test(row) && /100\.000/.test(row) && /Xong/.test(row), row);
      check("Mock · Tổng tiền 100.000; không có nút hành động nào ngoài Quay lại", /100\.000/.test(await t("order-detail-total")) && J(await q(`[...document.querySelectorAll(".ant-layout-content button, main button")].map((b) => b.innerText.trim()).filter(Boolean)`)) === J(["Quay lại"]), J(await q(`[...document.querySelectorAll("main button")].map((b) => b.innerText.trim())`)));
      check("Mock · Không hiện chỉ báo realtime (mock), không audit log, không tiền khách đưa", !(await has("realtime-status")) && !/audit|nhật ký|Khách đưa|Tiền thối/i.test(await q(`document.body.innerText`)));

      const idManual = await idByCall(904);
      await goDetail(idManual);
      const pd = await t("order-pay-detail");
      check("Mock · Xác nhận thủ công: người xác nhận, lý do, số tiền thực nhận, mã giao dịch", /Xác nhận thủ công bởi Quản lý mẫu/.test(pd) && /webhook không về/.test(pd) && /Số tiền thực nhận: 80\.000/.test(pd) && /Mã giao dịch: FT26100812345/.test(pd), pd);
      const idMulti = await idByCall(905);
      await goDetail(idMulti);
      const pays = await payRows();
      check("Mock · Nhiều khoản thanh toán: QR đang chờ rồi tiền mặt đã trả; 2 dòng món", pays.length === 2 && /Chuyển khoản \(QR\).*Chờ chuyển khoản/.test(pays[0]) && /Tiền mặt.*Đã thanh toán/.test(pays[1]) && (await lineRows()).length === 2, J(pays));

      await goOrders("?status=CANCELLED");
      const idCancel = await q(`document.querySelector(".ant-table-tbody > tr.ant-table-row").getAttribute("data-row-key")`);
      await goDetail(idCancel);
      check("Mock · Đơn huỷ: khối 'Đơn đã huỷ' có người huỷ, thời điểm, lý do; trạng thái Đã huỷ", (await has("order-detail-cancel")) && (await t("order-detail-status")) === "Đã huỷ" && (await t("order-detail-cancel-by")) !== "—" && DT.test(await t("order-detail-cancel-at")) && (await t("order-detail-cancel-reason")) !== "—");

      await goDetail("khong-co");
      check("Mock · 404: 'Không tìm thấy đơn', không toast", (await has("order-detail-notfound")) && /Không tìm thấy đơn/.test(await t("order-detail-notfound")) && (await toasts()) === "");
      await clickTid("order-detail-tolist");
      await settle();
      check("Mock · Nút 'Về Tra cứu đơn' từ khối 404 về danh sách", (await loc()).startsWith("/manager/orders") && !(await loc()).includes("khong-co"), await loc());

      await goOrders("?callNumber=900&limit=50");
      await q(`document.querySelector(".ant-table-tbody > tr.ant-table-row").click()`);
      await detailLoaded();
      check("Mock · Bấm dòng mở chi tiết", /\/manager\/orders\/.+scn-options$/.test(await loc()) || (await loc()).startsWith("/manager/orders/"), await loc());
      await clickTid("order-detail-back");
      await settle();
      check("Mock · Quay lại giữ nguyên bộ lọc (URL query như trước khi mở)", (await loc()) === "/manager/orders?callNumber=900&limit=50" && (await rowCount()) === 1, await loc());
      await q(`document.querySelector(".ant-table-tbody > tr.ant-table-row").click()`);
      await detailLoaded();
      await q(`history.back()`);
      await sleep(900);
      check("Mock · Nút Back của trình duyệt cũng về đúng bộ lọc", (await loc()) === "/manager/orders?callNumber=900&limit=50", await loc());
    } else {
      const be = await readBe();
      const list = (await be.get("/manager/orders?type=COUNTER_PICKUP&limit=100")).body.items;
      const byCode = (suffix) => list.find((o) => o.orderCode.endsWith(suffix));
      tab.requests.length = 0;

      // Đơn 1 — tiền mặt đã trả, khách đưa dư (BE không trả tiền khách đưa: #48).
      const o1 = byCode("55E81C");
      await goDetail(o1.id);
      check("Real · Đơn 1: số gọi 1, tổng 65.000, mã đơn khớp BE", (await t("order-detail-call")) === "1" && /65\.000/.test(await t("order-detail-total")) && (await t("order-detail-code")) === o1.orderCode, await t("order-detail-code"));
      check("Real · Đơn 1: Đã thanh toán; thời gian đặt/thanh toán dd/MM/yyyy HH:mm; thu ngân Lan Thu ngân", (await t("order-detail-payment")) === "Đã thanh toán" && DT.test(await t("order-detail-placed")) && DT.test(await t("order-detail-paid-at")) && (await t("order-detail-cashier")) === "Lan Thu ngân");
      const p1 = await payRows();
      check("Real · Đơn 1: một khoản Tiền mặt, 65.000, Đã thanh toán, người xử lý Lan Thu ngân", p1.length === 1 && /Tiền mặt/.test(p1[0]) && /65\.000/.test(p1[0]) && /Đã thanh toán/.test(p1[0]) && /Lan Thu ngân/.test(p1[0]), J(p1));
      check("Real · Đơn 1: không hiện tiền khách đưa/tiền thối (BE chưa trả, #48), không audit, không nút hành động", !/Khách đưa|Tiền thối|100\.000|35\.000|audit|nhật ký/i.test(await q(`document.body.innerText`)) && J(await q(`[...document.querySelectorAll("main button")].map((b) => b.innerText.trim()).filter(Boolean)`)) === J(["Quay lại"]));
      check("Real · Chỉ báo realtime hiện (kín đáo) và đã kết nối", (await has("realtime-status")) && (await tab.waitFor(`${tid("realtime-status")}?.getAttribute("data-status") === "connected"`, 15000, "socket kết nối").then(() => true, () => false)));

      // Đơn 2 — 3 dòng.
      const o2 = byCode("0F58FF");
      await goDetail(o2.id);
      const l2 = await lineRows();
      check("Real · Đơn 2: 3 dòng món, tổng 280.000, ghi chú 'ít cơm' và 'ít cay'", l2.length === 3 && /280\.000/.test(await t("order-detail-total")) && l2.some((r) => /Ghi chú: ít cơm/.test(r)) && l2.some((r) => /Ghi chú: ít cay/.test(r)) && l2.some((r) => /Cơm gà nướng/.test(r) && /130\.000/.test(r)), J(l2));
      check("Real · Đơn 2: dòng món 'Chờ pha' (đã trả, chưa pha)", l2.every((r) => /Chờ pha/.test(r)), J(l2.map((r) => r.slice(-20))));

      // Đơn 4 — đã giao.
      const o4 = byCode("76DF54");
      await goDetail(o4.id);
      const l4 = await lineRows();
      check("Real · Đơn 4: trạng thái Hoàn tất, mọi dòng món 'Xong', tổng 140.000", (await t("order-detail-status")) === "Hoàn tất" && l4.length === 2 && l4.every((r) => /Xong/.test(r)) && /140\.000/.test(await t("order-detail-total")), J(l4));

      // Đơn 5 — huỷ chưa trả.
      const o5 = byCode("AF0042");
      await goDetail(o5.id);
      check("Real · Đơn 5: khối huỷ có lý do 'Khách đổi ý trước khi trả tiền', người huỷ Lan Thu ngân, thời điểm", (await t("order-detail-cancel-reason")) === "Khách đổi ý trước khi trả tiền" && (await t("order-detail-cancel-by")) === "Lan Thu ngân" && DT.test(await t("order-detail-cancel-at")) && (await t("order-detail-status")) === "Đã huỷ" && (await t("order-detail-payment")) === "Đã huỷ");
      check("Real · Đơn 5 chưa có khoản thanh toán: 'Chưa có khoản thanh toán'", (await payRows()).length === 0 && /Chưa có khoản thanh toán/.test(await q(`document.body.innerText`)));
      // Đơn 3 — chưa trả.
      const o3 = byCode("EFE3A1");
      await goDetail(o3.id);
      check("Real · Đơn 3 (chưa trả): Chờ thanh toán / Khởi tạo, chưa có thời gian thanh toán ('—')", (await t("order-detail-status")) === "Chờ thanh toán" && (await t("order-detail-payment")) === "Khởi tạo" && (await t("order-detail-paid-at")) === "—" && (await t("order-detail-call")) === "—");

      // 404 / id hỏng.
      await goDetail("00000000-0000-4000-8000-000000000000");
      check("Real · Id không tồn tại (BE 404): 'Không tìm thấy đơn', không toast", (await has("order-detail-notfound")) && (await toasts()) === "");
      await goDetail("abc");
      check("Real · Id không phải UUID (BE 400): cũng 'Không tìm thấy đơn'", await has("order-detail-notfound"));

      // Quay lại giữ bộ lọc.
      await goOrders("?status=CANCELLED");
      await q(`document.querySelector(".ant-table-tbody > tr.ant-table-row").click()`);
      await detailLoaded();
      await clickTid("order-detail-back");
      await settle();
      check("Real · Quay lại giữ bộ lọc (?status=CANCELLED) và hiện 1 đơn", (await loc()) === "/manager/orders?status=CANCELLED" && (await rowCount()) === 1, await loc());

      // Trả lời giả: tuỳ chọn/topping đúng dạng BE và có xác nhận thủ công (không tới BE).
      tab.readOverride = {
        match: new RegExp(`/manager/orders/${o1.id}$`),
        body: J({
          ...o1,
          totalAmount: "100000",
          subtotal: "100000",
          discountAmount: "0",
          taxAmount: "0",
          serviceCharge: "0",
          note: null,
          cancelledBy: null,
          payments: [
            {
              id: "p-fake",
              paymentCode: "PAY-FAKE",
              method: "BANK_TRANSFER",
              provider: "PAYOS",
              status: "SUCCESS",
              amount: "100000",
              receivedAmount: "105000",
              transactionRef: "FT2610081",
              confirmationReason: "Khách chìa màn hình chuyển khoản, webhook không về",
              confirmedAt: "2026-10-08T07:00:00.000Z",
              paidAt: "2026-10-08T07:00:00.000Z",
              createdAt: "2026-10-08T06:50:00.000Z",
              failureReason: null,
              processedBy: { id: "m", employeeCode: "DEMO-MANAGER-01", firstName: "Bình", lastName: "Quản lý" },
            },
          ],
          items: [
            { id: "i1", itemName: "Trà đào", unitPrice: "50000", quantity: 2, totalPrice: "100000", status: "READY", specialInstructions: "ít đá", cancellationReason: null,
              selectedOptions: [{ id: "a", name: "L", groupCode: "SIZE", groupName: "Kích cỡ", priceDelta: "10000" }, { id: "b", name: "50% đường", groupCode: "SUGAR", groupName: "Mức đường", priceDelta: "0" }, { id: "c", name: "Trân châu đen", groupCode: "TOPPING", groupName: "Topping", priceDelta: "5000" }] },
          ],
        }),
      };
      await goDetail(o1.id);
      const fopts = await t("order-line-options");
      const fpay = await t("order-pay-detail");
      check("Real · Trả lời giả: tuỳ chọn/topping đúng dạng BE (Kích cỡ L +10.000, Topping Trân châu đen +5.000), giá lúc bán 50.000, ghi chú", /Kích cỡ: L \(\+10\.000/.test(fopts) && /Topping: Trân châu đen \(\+5\.000/.test(fopts) && /Mức đường: 50% đường/.test(fopts) && /Giá món 35\.000 ₫ \+ tuỳ chọn 15\.000 ₫/.test(await t("order-detail-lines")) && /Ghi chú: ít đá/.test(await t("order-detail-lines")), fopts);
      check("Real · Trả lời giả: xác nhận thủ công hiện người xác nhận, lý do, số tiền thực nhận 105.000, mã giao dịch", /Xác nhận thủ công bởi Bình Quản lý/.test(fpay) && /webhook không về/.test(fpay) && /Số tiền thực nhận: 105\.000/.test(fpay) && /Mã giao dịch: FT2610081/.test(fpay), fpay);
      tab.readOverride = null;

      check("Real · 0 request ghi từ trình duyệt trong khối detail", (tab.writeLog ?? []).length === 0 && tab.blockedWrites.length === 0, `${(tab.writeLog ?? []).length}`);
      const detailCalls = tab.requests.filter((r) => r.method === "GET" && /\/manager\/orders\/[^?]+$/.test(r.url));
      check(`Real · ${detailCalls.length} GET /manager/orders/:id đều không có tham số lạ`, detailCalls.length >= 8 && detailCalls.every((r) => !new URL(r.url).search), String(detailCalls.length));
    }
  }

  // ---- realtime: tự làm tươi qua socket (quyết định 74, 75) — TẠO 2 đơn mới trên BE local --------------------------------
  if (want("realtime")) {
    if (!REAL) {
      console.log("Khối realtime chỉ chạy --mode=real");
      process.exit(2);
    }
    const be = await readBe();
    const HERE = dirname(fileURLToPath(import.meta.url));
    const SCRIPT = resolve(HERE, "../data/create-one-cash-order.mjs");
    const scriptWrites = [];
    /** Chạy script tạo đơn (Node, KHÔNG qua trình duyệt); trả đối tượng JSON dòng cuối; ghi nhận các request ghi script đã gọi. */
    const runScript = (args) => {
      const r = spawnSync(process.execPath, [SCRIPT, ...args], { env: { ...process.env, DEMO_PASSWORD: be.pw }, encoding: "utf8" });
      for (const line of (r.stderr ?? "").split(/\r?\n/)) if (line.startsWith("WRITE ")) scriptWrites.push(line.slice(6));
      if (r.status !== 0) throw new Error(`script ${args[0]} lỗi: ${(r.stderr ?? "").trim().slice(-300)}`);
      const last = r.stdout.trim().split(/\r?\n/).pop();
      return JSON.parse(last);
    };
    const detailStatus = () => q(`${tid("order-detail-status")}?.innerText.trim() ?? ""`);
    const lineStatuses = () => q(`[...document.querySelectorAll('[data-testid="order-line"]')].map((e) => e.getAttribute("data-status"))`);
    const badge = () => q(`${tid("realtime-status")}?.getAttribute("data-status") ?? ""`);
    const detailGets = (id) => tab.requests.filter((r) => r.method === "GET" && new RegExp(`/manager/orders/${id}$`).test(r.url)).length;
    const waitText = async (fn, expected, ms = 20000) => {
      const t0 = Date.now();
      while (Date.now() - t0 < ms) {
        if ((await fn()) === expected) return Date.now() - t0;
        await sleep(100);
      }
      return -1;
    };
    // Bộ ghi WebSocket của harness (KHÔNG phải mã ứng dụng): giữ tham chiếu để cắt kết nối khi kiểm nối lại.
    await tab.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `(() => { const Orig = window.WebSocket; window.__sockets = []; window.WebSocket = function (...a) { const s = new Orig(...a); if (String(a[0]).includes("socket.io")) window.__sockets.push(s); return s; }; window.WebSocket.prototype = Orig.prototype; Object.assign(window.WebSocket, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 }); })()`,
    });
    const before = (await be.get("/manager/orders?type=COUNTER_PICKUP&limit=100")).body;

    // 1. Danh sách tự có thêm đơn A (không F5).
    await tab.goto("/manager/orders");
    await tab.waitFor(`document.querySelector(".ant-layout-sider")`, 30000, "shell");
    await settle(20000);
    check("Realtime · Danh sách nạp xong; chỉ báo 'Cập nhật trực tiếp' đã kết nối", (await tab.waitFor(`${tid("realtime-status")}?.getAttribute("data-status") === "connected"`, 20000, "kết nối").then(() => true, () => false)) && (await rowCount()) === before.total, `${await rowCount()}/${before.total}`);
    const n0 = await rowCount();
    const calls0 = listCalls().length;
    const bodyBefore = await rowTexts();
    await q(`window.scrollTo(0, 0)`);
    const A = runScript(["create"]);
    const tAfterCreate = Date.now();
    let appeared = -1;
    for (let i = 0; i < 150; i++) {
      if ((await rowTexts()).some((r) => r.includes(A.orderCode))) {
        appeared = Date.now() - tAfterCreate;
        break;
      }
      await sleep(100);
    }
    await sleep(1800);
    const getsA = listCalls().length - calls0;
    check(`Realtime · Đơn A (${A.orderCode}, số gọi ${A.callNumber}) tự hiện trong danh sách không cần F5`, appeared >= 0 && (await rowCount()) === n0 + 1, `${appeared} ms sau khi script xong; ${n0} → ${await rowCount()}`);
    console.log(`   Thời gian tự hiện đơn A: ${appeared} ms (kể từ lúc script tạo đơn xong)`);
    check(`Realtime · Số GET danh sách phát sinh cho 2 sự kiện thu tiền (payment.confirmed + preparation.order.queued): ${getsA} (gom, không bão request)`, getsA >= 1 && getsA <= 2, String(getsA));
    check("Realtime · Làm tươi ngầm: URL và bộ lọc giữ nguyên, không có toast", (await loc()) === "/manager/orders" && (await toasts()) === "");
    const rowA = (await rowTexts()).find((r) => r.includes(A.orderCode)) ?? "";
    check("Realtime · Dòng đơn A: Đã thanh toán, Tiền mặt, tổng 65.000", /Đã thanh toán/.test(rowA) && /Tiền mặt/.test(rowA) && /65\.000/.test(rowA), rowA);
    void bodyBefore;

    // 2. Chi tiết đơn B tự đổi trạng thái khi pha chế.
    const B = runScript(["create"]);
    await sleep(1500);
    await spaGo("/manager/orders/" + B.id);
    await tab.waitFor(`${tid("order-detail")}`, 15000, "chi tiết B");
    await tab.waitFor(`${tid("realtime-status")}?.getAttribute("data-status") === "connected"`, 15000, "kết nối chi tiết");
    check(`Realtime · Chi tiết đơn B (${B.orderCode}, số gọi ${B.callNumber}) mở ở 'Đã thanh toán', dòng món 'Chờ pha'`, (await detailStatus()) === "Đã thanh toán" && J(await lineStatuses()) === J(["QUEUED"]), await detailStatus());
    const stepResults = [];
    const step = async (cmd, expectedText, expectedLineLabel, expectedLineCode) => {
      const g0 = detailGets(B.id);
      runScript([cmd, B.id, String(B.callNumber)]);
      const ms = await waitText(detailStatus, expectedText);
      await sleep(1500);
      const gets = detailGets(B.id) - g0;
      const lines = await lineStatuses();
      stepResults.push({ cmd, ms, gets });
      check(`Realtime · Pha chế '${cmd}' → chi tiết B tự đổi '${expectedText}' (không F5), dòng món ${expectedLineLabel}, ${gets} GET chi tiết`, ms >= 0 && gets >= 1 && gets <= 2 && J(lines) === J([expectedLineCode]), `${ms} ms · ${gets} GET · ${J(lines)}`);
    };
    await step("start", "Đang pha", "Đang pha", "PREPARING");
    await step("complete", "Sẵn sàng", "Xong", "READY");
    {
      const g0 = detailGets(B.id);
      const done = runScript(["deliver", B.id]);
      const ms = await waitText(detailStatus, "Hoàn tất");
      await sleep(1500);
      const gets = detailGets(B.id) - g0;
      const lines = await lineStatuses();
      check(`Realtime · Pha chế 'deliver' → chi tiết B tự đổi 'Hoàn tất', dòng món Xong (DELIVERED), ${gets} GET chi tiết`, done.status === "DELIVERED" && ms >= 0 && gets >= 1 && gets <= 2 && J(lines) === J(["DELIVERED"]), `${ms} ms · ${gets} GET · ${J(lines)}`);
    }
    console.log("   Thời gian tự đổi trạng thái chi tiết B (ms):", J(stepResults));

    // 3. Mất kết nối rồi nối lại → tải lại đúng 1 lần.
    const callsR0 = detailGets(B.id);
    await tab.send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await q(`(window.__sockets ?? []).forEach((s) => { try { s.close(); } catch {} })`);
    const wentDown = await waitText(badge, "disconnected", 10000);
    check("Realtime · Ngắt mạng: chỉ báo chuyển 'Mất kết nối cập nhật trực tiếp' (không toast, màn vẫn dùng được)", wentDown >= 0 && (await toasts()) === "" && (await has("order-detail")), `${wentDown} ms`);
    await sleep(3500);
    await tab.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    const backUp = await waitText(badge, "connected", 30000);
    await sleep(2000);
    const getsR = detailGets(B.id) - callsR0;
    check(`Realtime · Nối lại sau ~4 giây: chỉ báo 'đã kết nối' (${backUp} ms) và tải lại chi tiết đúng 1 lần (${getsR} GET)`, backUp >= 0 && getsR === 1, `${backUp} ms · ${getsR} GET`);

    // 4. Danh sách sau 2 đơn mới; đối chiếu BE; bảng request ghi.
    await spaGo("/manager/orders");
    await settle();
    const after = (await be.get("/manager/orders?type=COUNTER_PICKUP&limit=100")).body;
    const bFinal = after.items.find((o) => o.id === B.id);
    const aFinal = after.items.find((o) => o.id === A.id);
    check(`Realtime · BE: tổng ${before.total} → ${after.total} (+2); đơn A SUBMITTED/PAID, đơn B DELIVERED/PAID; danh sách hiện ${await rowCount()} dòng`, after.total === before.total + 2 && aFinal?.status === "SUBMITTED" && bFinal?.status === "DELIVERED" && bFinal?.paymentStatus === "PAID" && (await rowCount()) === after.total, `${aFinal?.status}/${bFinal?.status}`);
    check("Realtime · 0 request ghi từ TRÌNH DUYỆT (CDP chặn ghi)", (tab.writeLog ?? []).length === 0 && tab.blockedWrites.length === 0, `${(tab.writeLog ?? []).length}`);
    const tally = new Map();
    for (const w of scriptWrites) tally.set(w, (tally.get(w) ?? 0) + 1);
    console.log("   REQUEST GHI DO SCRIPT (Node) GỌI:");
    for (const [k, n] of tally) console.log(`     ${n}×  ${k}`);
    const countOf = (path) => scriptWrites.filter((w) => w.replace(/ → \d+$/, "") === `POST ${path}`).length;
    check(
      "Realtime · Request ghi do script gọi khớp ngoại lệ: checkout ×2, cash ×2, start ×1, complete ×1, deliver ×1 (tổng 7, không gì khác)",
      countOf("/cashier/checkout") === 2 && countOf("/cashier/orders/{id}/payments/cash") === 2 && countOf("/barista/batches/start") === 1 && countOf("/barista/batches/complete") === 1 && countOf("/barista/orders/{id}/deliver") === 1 && scriptWrites.length === 7,
      J([...tally]),
    );
    console.log(`   ĐƠN MỚI: A ${A.orderCode} số gọi ${A.callNumber} → ${aFinal?.status}/${aFinal?.paymentStatus}; B ${B.orderCode} số gọi ${B.callNumber} → ${bFinal?.status}/${bFinal?.paymentStatus}`);
  }
} catch (e) {
  console.log("ERROR", e.stack ?? e.message);
  check("script chạy hết không lỗi", false, e.message);
}

await closeTab(tab);
const failed = results.filter((r) => !r.ok);
console.log(`\n[${MODE}] ${results.length - failed.length}/${results.length} đạt`);
process.exit(failed.length ? 1 : 0);
