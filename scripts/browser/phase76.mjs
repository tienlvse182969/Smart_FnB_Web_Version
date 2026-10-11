// Kiểm trình duyệt thật cho lượt 7.6 (BM-06, BE #43 `514c426`): huỷ đơn đã trả + khoản phải hoàn + đánh dấu đã hoàn + báo cáo.
//   node scripts/browser/phase76.mjs --only=faults   # real, KHÔNG ghi: lỗi giả (setFault) + trả lời giả (readOverride), mọi POST bị chặn
//   node scripts/browser/phase76.mjs --only=refund   # real, GHI THẬT trên BE local: huỷ đúng 2 đơn đã chọn + đánh dấu đã hoàn 1 khoản
// Dev server 5173 (real), BE local chạy `514c426`, Chrome CDP 9333. Đăng nhập Manager demo.
//
// NGOẠI LỆ GHI BE (chỉ lượt 7.6, chỉ BE local), tối đa 2 đơn COUNTER_PICKUP đã trả có sẵn:
//   - ORDER_A (tiền mặt): POST /manager/orders/{id}/cancel-paid  hoàn TIỀN MẶT (ghi đã hoàn ngay)
//   - ORDER_B:            POST /manager/orders/{id}/cancel-paid  hoàn CHUYỂN KHOẢN (chờ hoàn), rồi POST /refunds/{id}/complete
//   - thử âm (409/403, KHÔNG đổi dữ liệu): huỷ lại A, huỷ đơn đã giao, đánh dấu lại khoản đã hoàn, Cashier gọi cancel-paid
// Mọi request ghi khác bị chặn ở CDP. Khối `refund` từ chối chạy nếu BE đã có khoản hoàn của Manager (REFUND_CANCEL_LIMIT).
import { execFileSync } from "node:child_process";
import { check, cli, closeTab, newTab, results, sleep, SESSION_ALLOW } from "./cdp.mjs";

const CLI = cli();
const BLOCKS = ["faults", "refund"];
if (CLI.only && !CLI.only.every((n) => BLOCKS.includes(n))) {
  console.log(`--only hỗ trợ: ${BLOCKS.join(", ")} (nhận được: ${CLI.only.join(",")})`);
  process.exit(2);
}
const RUN = (n) => !CLI.only || CLI.only.includes(n);
const J = JSON.stringify;
const API = process.env.API_BASE_URL ?? "http://localhost:3100/api/v1";
const ORDER_A = process.env.REFUND_ORDER_A ?? "CTR-1791446259736-C5D475";
const ORDER_B = process.env.REFUND_ORDER_B ?? "CTR-1791439019641-60E4C5";
const ORDER_FAULT = process.env.REFUND_ORDER_FAULT ?? "CTR-1791439019580-1D39C7";
const ORDER_DELIVERED = process.env.REFUND_ORDER_DELIVERED ?? "CTR-1791439018854-76DF54";
const CANCEL_LIMIT = Number(process.env.REFUND_CANCEL_LIMIT ?? 2);
const REPORT_FROM = "2026-10-08";

/** SELECT chỉ đọc qua docker exec (BAN-GIAO quy tắc 12). */
const sql = (query) =>
  execFileSync("docker", ["exec", "smart-fnb-postgres", "psql", "-U", "smartfnb", "-d", "smart_fnb", "-At", "-F", "|", "-c", query], { encoding: "utf8" }).trim();
const orderRow = (code) => {
  const [id, status, paymentStatus, total, reason, cancelledAt] = sql(
    `select id, status, payment_status, total_amount::int, coalesce(cancellation_reason,''), cancelled_at is not null from orders where order_code='${code}'`,
  ).split("|");
  return { id, status, paymentStatus, total: Number(total), reason, cancelled: cancelledAt === "t" };
};
const refundsOf = (orderId) =>
  sql(`select id, status, method, source, amount::int, reason, coalesce(note,''), completed_at is not null from refunds where order_id='${orderId}' order by requested_at`)
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const [id, status, method, source, amount, reason, note, completed] = l.split("|");
      return { id, status, method, source, amount: Number(amount), reason, note, completed: completed === "t" };
    });
const itemStatuses = (orderId) => sql(`select string_agg(status::text, ',') from order_items where order_id='${orderId}'`);
const paymentStatuses = (orderId) => sql(`select string_agg(status::text, ',') from payments where order_id='${orderId}'`);
const managerRefundCount = () => Number(sql(`select count(*) from refunds where source='MANAGER_CANCELLATION'`));

const tab = await newTab("about:blank", "real");
const q = (e) => tab.eval(e);
await tab.blockWrites(SESSION_ALLOW);
const tid = (id) => `document.querySelector('[data-testid=${J(id)}]')`;
const has = (id) => q(`!!${tid(id)}`);
const text = (id) => q(`${tid(id)}?.innerText ?? ""`);
const clickTid = (id) => q(`(() => { const el = ${tid(id)}; if (!el) return false; el.click(); return true })()`);
const setTextArea = (id, value) =>
  q(`(() => { const el = ${tid(id)}; const ta = el.matches("textarea") ? el : el.querySelector("textarea");
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(ta, ${J(value)}); ta.dispatchEvent(new Event("input", { bubbles: true })); })()`);
const spaGo = async (to) => {
  await q(`(() => { history.pushState({}, "", ${J(to)}); dispatchEvent(new PopStateEvent("popstate")); })()`);
  await sleep(700);
};
const toasts = () => q(`[...document.querySelectorAll(".ant-message-notice, .ant-notification-notice")].map((e) => e.textContent).join(" | ")`);
const waitDetail = () => tab.waitFor(tid("order-detail"), 15000, "chi tiết đơn nạp xong");
/** Mở chi tiết theo MÃ đơn (đổi sang id bằng SELECT chỉ đọc). */
const openDetail = async (code) => {
  await spaGo("/manager/dashboard");
  await spaGo(`/manager/orders/${orderRow(code).id}`);
  await waitDetail();
  await sleep(300);
};
/** Gọi BE bằng token của tab (đi qua CDP nên vẫn theo danh sách cho phép). */
const beFetch = (path, { method = "GET", body } = {}) =>
  q(`(async () => { const r = await fetch(${J(API + path)}, { method: ${J(method)}, headers: { "Content-Type": "application/json", Authorization: "Bearer " + localStorage.getItem("smartfnb_access_token") }${body === undefined ? "" : `, body: ${J(JSON.stringify(body))}`} });
    const t = await r.text(); let b = null; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b }; })()`);
const reportOf = async () => {
  const to = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  const r = await beFetch(`/manager/reports?from=${REPORT_FROM}&to=${to}&granularity=day&limit=10`);
  const n = (v) => Number(v);
  return {
    to,
    gross: n(r.body.summary.grossRevenue),
    refund: n(r.body.summary.refundAmount),
    pending: n(r.body.summary.pendingRefundAmount),
    net: n(r.body.summary.netRevenue),
    revenue: n(r.body.summary.revenue),
    orders: r.body.summary.orderCount,
    cancelTotal: r.body.cancellations.total,
    paidCancel: r.body.cancellations.paidCancellationCount,
    cancelRefund: n(r.body.cancellations.refundAmount),
  };
};
const login = async () => {
  await tab.goto("/login");
  await tab.clearStorage();
  await tab.goto("/login");
  await tab.login("manager");
  await tab.waitFor(`location.pathname.startsWith("/manager")`, 20000, "vào /manager");
  await tab.waitFor(`document.querySelector(".ant-layout-sider")`, 15000, "shell manager");
  await sleep(900);
};
/** Mở hộp huỷ ở trang chi tiết đang mở, điền lý do, sang bước xem lại (chưa gửi). */
async function toReview(t, reason, { bank = false, openId = "order-cancel-open" } = {}) {
  await t.eval(`${tid(openId)}.click()`);
  await t.waitFor(tid("cancel-step-form"), 8000, "hộp huỷ mở");
  if (bank) await t.eval(`(() => { const r = ${tid("cancel-method-bank")}; (r.matches("input") ? r : r.querySelector("input")).click(); })()`);
  await t.eval(`(() => { const el = ${tid("cancel-reason")}; const ta = el.matches("textarea") ? el : el.querySelector("textarea");
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(ta, ${J(reason)}); ta.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  await sleep(150);
  await t.eval(`${tid("cancel-next")}.click()`);
  await t.waitFor(tid("cancel-step-review"), 5000, "bước xem lại");
}
const closeModals = () => q(`document.querySelectorAll(".ant-modal-close").forEach((b) => b.click())`);

// ── Khối faults: KHÔNG ghi ────────────────────────────────────────────────────────────────────────────────────────────────
async function runFaults() {
  const order = orderRow(ORDER_FAULT);
  await login();
  tab.caseName = "faults";
  const cancelPath = `/api/v1/manager/orders/${order.id}/cancel-paid`;
  const reasonText = "Khách đổi ý, không nhận món";
  const lastBlocked = () => (tab.blockedWrites ?? []).at(-1);

  await openDetail(ORDER_FAULT);
  check("faults · Đơn đã trả chưa giao (SUBMITTED/PAID) có nút 'Huỷ đơn và ghi hoàn tiền'", order.status === "SUBMITTED" && (await has("order-cancel-open")));

  await toReview(tab, reasonText);
  check("faults · Hộp xem lại tóm tắt số tiền phải hoàn và nhắc tiền mặt", /65\.000/.test(await text("cancel-amount")) && /trả lại khách tiền mặt/i.test(await text("cancel-reminder")));
  tab.blockedWrites.length = 0;

  const submitFault = async (fault) => {
    tab.setFault(fault);
    tab.blockedWrites.length = 0;
    await clickTid("cancel-submit");
    await sleep(1400);
    const t = await toasts();
    tab.setFault(null);
    return t;
  };
  const t409 = await submitFault({ kind: "409", match: /^never$/, body: { statusCode: 409, message: "Delivered, completed or already cancelled orders cannot be cancelled", error: "Conflict" } });
  const body = JSON.parse(lastBlocked()?.body ?? "{}");
  check("faults · 409 (đơn vừa giao ở nơi khác): câu tiếng Việt, đóng hộp, không chữ Anh", /đã giao, đã hoàn tất hoặc đã huỷ nên không huỷ được nữa/.test(t409) && !/Delivered|Conflict/.test(t409), t409.slice(0, 160));
  check("faults · Thân gửi đúng 2 ô (reason, refundMethod), đúng đường dẫn cancel-paid", lastBlocked()?.path === cancelPath && J(Object.keys(body).sort()) === J(["reason", "refundMethod"]) && body.refundMethod === "CASH" && body.reason === reasonText, J(body));
  await sleep(1200);
  check("faults · Sau 409 hộp huỷ đã đóng", !(await has("cancel-step-review")));

  await openDetail(ORDER_FAULT);
  await toReview(tab, reasonText);
  const t500 = await submitFault({ kind: "500", match: /^never$/ });
  check("faults · 500: 'Máy chủ đang gặp sự cố…', GIỮ hộp, nút gửi mở lại", /Máy chủ đang gặp sự cố/.test(t500) && (await has("cancel-step-review")) && !(await q(`${tid("cancel-submit")}.disabled`)), t500.slice(0, 120));
  await sleep(2600);
  const tNet = await submitFault({ kind: "network", match: /^never$/ });
  check("faults · Mất mạng: 'Không kết nối được máy chủ…', giữ hộp", /Không kết nối được máy chủ/.test(tNet) && (await has("cancel-step-review")), tNet.slice(0, 120));
  await sleep(2600);
  const t403 = await submitFault({ kind: "403", match: /^never$/ });
  check("faults · 403: 'không đủ quyền', giữ hộp", /không đủ quyền/i.test(t403) && !/permission/i.test(t403), t403.slice(0, 120));
  await sleep(2600);
  const t400 = await submitFault({ kind: "400", match: /^never$/, body: { statusCode: 400, message: ["reason must be longer than or equal to 3 characters"], error: "Bad Request" } });
  check("faults · 400 validate: câu tiếng Việt theo ô 'Lý do', giữ hộp", /Lý do/.test(t400) && !/must be longer/.test(t400) && (await has("cancel-step-review")), t400.slice(0, 160));
  await closeModals();
  await sleep(800);

  // Đơn lệch thiếu (trả lời giả): nút ở khung cảnh báo, hoàn đúng số đã nhận, chỉ huỷ cả đơn.
  const real = (await beFetch(`/manager/orders/${order.id}`)).body;
  const mismatch = {
    ...real,
    status: "REQUIRES_ATTENTION",
    paymentStatus: "UNPAID",
    paidAt: null,
    payments: [{ ...real.payments[0], method: "BANK_TRANSFER", status: "AMOUNT_MISMATCH", amount: "65000.00", receivedAmount: "55000.00", paidAt: null }],
    refunds: [],
  };
  tab.readOverride = { match: new RegExp(`/api/v1/manager/orders/${order.id}$`), body: J(mismatch) };
  await openDetail(ORDER_FAULT);
  check("faults · Lệch thiếu (đơn Cần xử lý): có nút huỷ ở khung cảnh báo", await has("order-cancel-open-attention"));
  await clickTid("order-cancel-open-attention");
  await tab.waitFor(tid("cancel-step-form"), 6000, "hộp huỷ (lệch thiếu)");
  check("faults · Lệch thiếu: số hoàn = số đã nhận 55.000, chỉ huỷ cả đơn (không chọn món)", /55\.000/.test(await text("cancel-amount")) && /huỷ cả đơn/.test(await text("cancel-mismatch-note")) && !(await has("cancel-lines")));
  await closeModals();
  await sleep(800);

  // Khoản chuyển khoản đang chờ hoàn (trả lời giả): nút "Đánh dấu đã hoàn".
  const cancelled = {
    ...real,
    status: "CANCELLED",
    cancelledAt: new Date().toISOString(),
    cancellationReason: "Khách bỏ về",
    refunds: [
      { id: "11111111-1111-4111-8111-111111111111", paymentId: real.payments[0].id, amount: "65000.00", status: "PENDING", method: "BANK_TRANSFER", source: "MANAGER_CANCELLATION", sourceReference: null, reason: "Khách bỏ về", requestedByRole: "MANAGER", requestedAt: new Date().toISOString(), completedByRole: null, completedAt: null, note: null, items: [] },
      { id: "22222222-2222-4222-8222-222222222222", paymentId: real.payments[0].id, amount: "20000.00", status: "COMPLETED", method: "CASH", source: "MANAGER_CANCELLATION", sourceReference: null, reason: "Hoàn một phần", requestedByRole: "MANAGER", requestedAt: new Date().toISOString(), completedByRole: "MANAGER", completedAt: new Date().toISOString(), note: null, items: [] },
    ],
  };
  tab.readOverride = { match: new RegExp(`/api/v1/manager/orders/${order.id}$`), body: J(cancelled) };
  await openDetail(ORDER_FAULT);
  const completeButtons = await q(`document.querySelectorAll('[data-testid="refund-complete-open"]').length`);
  check("faults · Bảng khoản hoàn: 1 khoản chờ (có nút Đánh dấu đã hoàn), 1 khoản tiền mặt đã hoàn (không nút); còn chờ 65.000", completeButtons === 1 && /65\.000/.test(await text("order-refund-pending")) && /Đã hoàn tiền/.test(await text("order-refunds-table")) && !(await has("order-cancel-open")));
  await clickTid("refund-complete-open");
  await tab.waitFor(tid("complete-modal"), 6000, "hộp đánh dấu mở");
  await setTextArea("complete-note", "Đã chuyển khoản 14:05");
  tab.blockedWrites.length = 0;
  await clickTid("complete-submit");
  await sleep(1200);
  const completeWrite = lastBlocked();
  check("faults · Đánh dấu đã hoàn: POST /refunds/{id}/complete, thân chỉ có note", completeWrite?.path === "/api/v1/refunds/11111111-1111-4111-8111-111111111111/complete" && completeWrite.body === J({ note: "Đã chuyển khoản 14:05" }), completeWrite?.body);
  await closeModals();

  // Đơn đã giao (trả lời giả trạng thái): không có nút.
  tab.readOverride = { match: new RegExp(`/api/v1/manager/orders/${order.id}$`), body: J({ ...real, status: "DELIVERED" }) };
  await openDetail(ORDER_FAULT);
  check("faults · Đơn đã giao (DELIVERED): KHÔNG có nút huỷ", !(await has("order-cancel-open")));
  tab.readOverride = null;

  // Tra cứu: bộ lọc "Hoàn tiền" gửi refundStatus.
  tab.requests.length = 0;
  await spaGo("/manager/orders?refund=PENDING");
  await sleep(1500);
  const sent = tab.requests.filter((r) => /\/manager\/orders\?/.test(r.url)).map((r) => new URL(r.url).searchParams.get("refundStatus"));
  check("faults · Tra cứu đơn lọc 'Còn khoản chờ hoàn' gửi refundStatus=PENDING", sent.includes("PENDING"), J(sent));

  check("faults · 0 request ghi tới BE (mọi POST bị chặn/giả lỗi ở CDP)", (tab.sentWrites ?? []).length === 0);
}

// ── Khối refund: GHI THẬT (2 đơn) ───────────────────────────────────────────────────────────────────────────────────────────
async function runRefund() {
  const a = orderRow(ORDER_A);
  const b = orderRow(ORDER_B);
  const dev = orderRow(ORDER_DELIVERED);
  if (managerRefundCount() + 2 > CANCEL_LIMIT) {
    console.log(`BỎ QUA khối refund: BE đã có ${managerRefundCount()} khoản hoàn do Manager huỷ, hạn mức ${CANCEL_LIMIT} (REFUND_CANCEL_LIMIT).`);
    check("refund: chốt chặn hạn mức huỷ thử (đã dùng hết, không huỷ thêm)", true, `${managerRefundCount()}/${CANCEL_LIMIT}`);
    return;
  }
  if (a.status !== "SUBMITTED" || a.paymentStatus !== "PAID" || b.status !== "SUBMITTED" || b.paymentStatus !== "PAID") {
    throw new Error(`đơn thử không ở SUBMITTED/PAID: A=${a.status}/${a.paymentStatus}, B=${b.status}/${b.paymentStatus}`);
  }
  // Danh sách cho phép: đúng 2 đơn huỷ + 1 đơn đã giao (thử âm) + khoản hoàn của B (mở sau khi có id).
  const allow = (method, re) => tab.blockAllow.push({ method, match: re });
  allow("POST", new RegExp(`/manager/orders/${a.id}/cancel-paid$`));
  allow("POST", new RegExp(`/manager/orders/${b.id}/cancel-paid$`));
  allow("POST", new RegExp(`/manager/orders/${dev.id}/cancel-paid$`));

  await login();
  tab.caseName = "refund";
  const before = await reportOf();
  console.log(`   [báo cáo TRƯỚC] ${J(before)}`);

  // ── Ca 1: huỷ đơn tiền mặt đã trả (chưa pha) ─────────────────────────────────────────────────────────────────────────────
  await openDetail(ORDER_A);
  await toReview(tab, "Khách đổi ý, không nhận món 7.6");
  check("1 · Tiền mặt: hộp xem lại hiện số phải hoàn 65.000 và cách hoàn 'Tiền mặt tại quầy'", /65\.000/.test(await text("cancel-amount")) && (await text("cancel-review-method")) === "Tiền mặt tại quầy");
  // Chống bấm đúp: hai cú bấm liền, đúng 1 request.
  await q(`(() => { const b = ${tid("cancel-submit")}; b.click(); b.click(); })()`);
  await tab.waitFor(`${tid("order-detail-status")}?.innerText === "Đã huỷ"`, 12000, "đơn A đã huỷ");
  await sleep(500);
  const cancelsA = (tab.sentWrites ?? []).filter((w) => w.path === `/api/v1/manager/orders/${a.id}/cancel-paid`);
  const aDb = orderRow(ORDER_A);
  const aRefunds = refundsOf(a.id);
  check("1 · Huỷ A: đúng 1 POST (bấm đúp không gửi 2); BE: đơn CANCELLED, lý do lưu, dòng món CANCELLED", cancelsA.length === 1 && aDb.status === "CANCELLED" && aDb.cancelled && /7\.6/.test(aDb.reason) && itemStatuses(a.id) === "CANCELLED", `${cancelsA.length} POST · ${aDb.status}`);
  check("1 · Khoản hoàn: 1 khoản CASH COMPLETED 65.000 (đã hoàn ngay); khoản thanh toán vẫn SUCCESS", aRefunds.length === 1 && aRefunds[0].method === "CASH" && aRefunds[0].status === "COMPLETED" && aRefunds[0].amount === 65000 && paymentStatuses(a.id) === "SUCCESS", J(aRefunds));
  check("1 · Màn: bảng 'Khoản phải hoàn' có 'Đã hoàn tiền' 65.000, không còn nút huỷ/đánh dấu", /Đã hoàn tiền/.test(await text("order-refunds-table")) && /65\.000/.test(await text("order-refunds-table")) && !(await has("order-cancel-open")) && !(await has("refund-complete-open")));

  // ── Ca 6: huỷ lại A → 409, không tạo khoản thứ 2 ────────────────────────────────────────────────────────────────────────────
  const again = await beFetch(`/manager/orders/${a.id}/cancel-paid`, { method: "POST", body: { reason: "Huỷ lần hai", refundMethod: "CASH" } });
  check("6 · Huỷ lần 2 cùng đơn → 409 'Delivered, completed or already cancelled…', KHÔNG tạo khoản thứ 2", again.status === 409 && refundsOf(a.id).length === 1, `${again.status} ${J(again.body).slice(0, 120)}`);

  // ── Ca 5: huỷ đơn đã giao → 409 ─────────────────────────────────────────────────────────────────────────────────────────────
  const delivered = await beFetch(`/manager/orders/${dev.id}/cancel-paid`, { method: "POST", body: { reason: "Thử huỷ đơn đã giao", refundMethod: "CASH" } });
  check("5 · Huỷ đơn đã giao → 409, không có khoản hoàn", delivered.status === 409 && refundsOf(dev.id).length === 0 && orderRow(ORDER_DELIVERED).status === dev.status, `${delivered.status} ${J(delivered.body).slice(0, 120)}`);

  // ── Ca 10: Cashier → 403 (gọi từ Node, không qua trình duyệt) ───────────────────────────────────────────────────────────────
  const login403 = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: J({ email: "cashier.demo@smartfnb.local", password: tab.accounts.manager[1] }) });
  const cashierToken = (await login403.json()).accessToken;
  const asCashier = await fetch(`${API}/manager/orders/${b.id}/cancel-paid`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${cashierToken}` }, body: J({ reason: "Cashier thử huỷ", refundMethod: "CASH" }) });
  check("10 · Cashier gọi cancel-paid → 403, đơn B không đổi", asCashier.status === 403 && orderRow(ORDER_B).status === "SUBMITTED" && refundsOf(b.id).length === 0, String(asCashier.status));

  // ── Ca 2 + F: huỷ đơn B (hoàn CHUYỂN KHOẢN); một tab khác đang xem B phải tự làm tươi ─────────────────────────────────────────
  const viewer = await newTab("about:blank", "real", { warm: false });
  await viewer.blockWrites(SESSION_ALLOW);
  await viewer.goto("/manager/orders/" + b.id);
  await viewer.waitFor(tid("order-detail"), 20000, "viewer: chi tiết B");
  await viewer.waitFor(`${tid("realtime-status")}?.getAttribute("data-status") === "connected"`, 15000, "viewer: socket nối");
  await openDetail(ORDER_B);
  await toReview(tab, "Khách bỏ về trước khi nhận 7.6", { bank: true });
  check("2 · Chuyển khoản: hộp xem lại 'Chuyển khoản', số hoàn 75.000", (await text("cancel-review-method")) === "Chuyển khoản" && /75\.000/.test(await text("cancel-amount")));
  await clickTid("cancel-submit");
  await tab.waitFor(`${tid("order-detail-status")}?.innerText === "Đã huỷ"`, 12000, "đơn B đã huỷ");
  const bRefunds = refundsOf(b.id);
  check("2 · Huỷ B: đơn CANCELLED, 1 khoản BANK_TRANSFER PENDING 75.000, MANAGER_CANCELLATION", orderRow(ORDER_B).status === "CANCELLED" && bRefunds.length === 1 && bRefunds[0].method === "BANK_TRANSFER" && bRefunds[0].status === "PENDING" && bRefunds[0].amount === 75000 && bRefunds[0].source === "MANAGER_CANCELLATION", J(bRefunds));
  check("2 · Màn: 'Chờ hoàn tiền', 'Còn chờ hoàn 75.000', nút 'Đánh dấu đã hoàn'", /Chờ hoàn tiền/.test(await text("order-refunds-table")) && /75\.000/.test(await text("order-refund-pending")) && (await has("refund-complete-open")));
  // F: tab xem tự làm tươi qua socket (order.cancelled / refund.pending), không thao tác.
  await viewer.waitFor(`${tid("order-detail-status")}?.innerText === "Đã huỷ"`, 12000, "viewer: tự làm tươi sau huỷ");
  check("F · Tab đang xem đơn B tự chuyển 'Đã huỷ' + hiện khoản chờ hoàn qua socket (không thao tác)", /Chờ hoàn tiền/.test(await viewer.eval(`${tid("order-refunds-table")}?.innerText ?? ""`)));
  const mid = await reportOf();
  console.log(`   [báo cáo GIỮA (B chờ hoàn)] ${J(mid)}`);

  // Danh sách: bộ lọc Hoàn tiền + khối "Khoản chờ hoàn tiền" ở Đơn cần xử lý.
  await spaGo("/manager/orders?refund=PENDING&from=2026-10-01&to=" + before.to);
  await tab.waitFor(`document.querySelectorAll(".ant-table-tbody > tr.ant-table-row").length >= 1`, 10000, "danh sách lọc hoàn tiền");
  const rows = await q(`[...document.querySelectorAll(".ant-table-tbody > tr.ant-table-row")].map((r) => r.innerText.replace(/\\s+/g, " "))`);
  check("D · Tra cứu lọc 'Còn khoản chờ hoàn': có đơn B, không có đơn A (đã hoàn tiền mặt)", rows.some((r) => r.includes(ORDER_B)) && !rows.some((r) => r.includes(ORDER_A)), `${rows.length} dòng`);
  await spaGo("/manager/orders/needs-attention");
  await tab.waitFor(tid("pending-refunds"), 10000, "khối khoản chờ hoàn");
  check("F · Màn 'Đơn cần xử lý' có khối 'Khoản chờ hoàn tiền' liệt kê B 75.000", /75\.000/.test(await text("pending-refunds")));

  // ── Ca 4: đánh dấu đã hoàn B ─────────────────────────────────────────────────────────────────────────────────────────────────
  allow("POST", new RegExp(`/refunds/${bRefunds[0].id}/complete$`));
  await openDetail(ORDER_B);
  await clickTid("refund-complete-open");
  await tab.waitFor(tid("complete-modal"), 6000, "hộp đánh dấu");
  await setTextArea("complete-note", "Đã chuyển khoản cho khách lúc kiểm 7.6");
  await clickTid("complete-submit");
  await tab.waitFor(`!${tid("refund-complete-open")} && /Đã hoàn tiền/.test(${tid("order-refunds-table")}?.innerText ?? "")`, 12000, "khoản B đã hoàn");
  const bDone = refundsOf(b.id)[0];
  check("4 · Đánh dấu đã hoàn: BE COMPLETED + completed_at + ghi chú; màn 'Đã hoàn tiền', mất nút", bDone.status === "COMPLETED" && bDone.completed && /kiểm 7\.6/.test(bDone.note) && !(await has("refund-complete-open")), J(bDone));

  // ── Ca 8: đánh dấu lại → 409 ──────────────────────────────────────────────────────────────────────────────────────────────────
  const completeAgain = await beFetch(`/refunds/${bRefunds[0].id}/complete`, { method: "POST", body: {} });
  check("8 · Đánh dấu khoản đã hoàn lần 2 → 409 'Only a pending refund can be completed'", completeAgain.status === 409 && /pending refund/.test(J(completeAgain.body)), `${completeAgain.status}`);

  // ── Ca 9: báo cáo trừ đúng ──────────────────────────────────────────────────────────────────────────────────────────────────────
  const after = await reportOf();
  console.log(`   [báo cáo SAU] ${J(after)}`);
  check("9 · Báo cáo SAU 2 lần huỷ (65.000 + 75.000): hoàn +140.000, doanh thu sau hoàn −140.000, gộp không đổi", after.refund - before.refund === 140000 && before.net - after.net === 140000 && after.gross === before.gross && after.revenue === after.net, `refund ${before.refund}→${after.refund}, net ${before.net}→${after.net}`);
  check("9 · Báo cáo: giữa chừng chờ hoàn 75.000 (B chuyển khoản), sau đánh dấu về 0; số đơn huỷ sau khi trả +2", mid.pending - before.pending === 75000 && after.pending === before.pending && after.paidCancel - before.paidCancel === 2, `chờ hoàn ${before.pending}→${mid.pending}→${after.pending}, huỷ sau trả ${before.paidCancel}→${after.paidCancel}`);
  await spaGo("/manager/dashboard?from=" + REPORT_FROM + "&to=" + after.to);
  await tab.waitFor(tid("report-kpi-refund"), 15000, "báo cáo nạp xong");
  await sleep(600);
  const fmt = (n) => n.toLocaleString("vi-VN");
  const uiRevenue = await text("report-kpi-revenue");
  const uiRefund = await text("report-kpi-refund");
  check("9 · Màn báo cáo hiện đúng số BE: doanh thu sau hoàn, gộp, đã trừ hoàn", uiRevenue.includes(fmt(after.net)) && (await text("report-kpi-gross")).includes(fmt(after.gross)) && uiRefund.includes(fmt(after.refund)), `${fmt(after.net)} · ${fmt(after.gross)} · ${fmt(after.refund)}`);

  await closeTab(viewer);
  const writes = (tab.sentWrites ?? []).map((w) => `${w.method} ${w.path}`);
  check("0 request ghi ngoài danh sách (không bị chặn ngoài ý muốn)", (tab.blockedWrites ?? []).length === 0, J(tab.blockedWrites ?? []));
  console.log(`   [request ghi THẬT từ trình duyệt] ${J(writes)}`);
}

try {
  if (RUN("faults")) await runFaults();
  if (RUN("refund")) await runRefund();
} catch (e) {
  console.log("ERROR", e.stack ?? e.message);
  try {
    console.log("   [chẩn đoán]", await q(`location.pathname + " :: " + document.body.innerText.replace(/\\s+/g, " ").slice(0, 300)`));
  } catch {
    // trang không còn
  }
  check("script chạy hết không lỗi", false, e.message);
}
await closeTab(tab);
const failed = results.filter((r) => !r.ok);
console.log(`\n[real] ${results.length - failed.length}/${results.length} đạt`);
process.exit(failed.length ? 1 : 0);
