// Kiểm trình duyệt thật cho lượt 9.2: báo cáo Owner theo thanh toán (#94), topping (#97), giá trị đơn TB ở tổng (#98),
// khoản chờ chủ chuỗi hoàn (#99), khoá/tách mục theo gói (#84).
//   node scripts/browser/phase92.mjs --mode=real        # dev server 5173 (real), BE local 8a315ad, Chrome CDP 9333
// Mọi request ghi bị chặn ở CDP (không bao giờ tới BE). Quan sát: readOverride (GET giả), setFault (lỗi giả), fulfillWrites (chỉ để xem
// lệnh ghi Đã hoàn có được gửi đúng — vẫn không rời trình duyệt).
import { check, cli, closeTab, newTab, results, sleep, SESSION_ALLOW } from "./cdp.mjs";

cli();
const J = JSON.stringify;
const tab = await newTab("about:blank", "real");
const q = (e) => tab.eval(e);
await tab.blockWrites(SESSION_ALLOW);
const tid = (id) => `document.querySelector('[data-testid=${J(id)}]')`;
const norm = (s) => s.replace(/\s+/g, " ").replace(/ /g, " ");
const text = async (id) => norm(await q(`${tid(id)}?.innerText ?? ""`));
const bodyText = async () => norm(await q(`document.body.innerText`));
const toasts = () => q(`[...document.querySelectorAll(".ant-message-notice, .ant-notification-notice")].map((e) => e.textContent).join(" | ")`);

const COMPARISON = /\/api\/v1\/reports\/revenue\/comparison/;
const SERIES = /\/api\/v1\/reports\/revenue\/timeseries/;
const TOPITEMS = /\/api\/v1\/reports\/top-items/;
const PAYMENTS = /\/api\/v1\/reports\/payment-methods/;
const TOPPINGS = /\/api\/v1\/reports\/top-toppings/;
const REFUNDS = /\/api\/v1\/refunds(\?|$)/;
const ANY_REPORT = /\/api\/v1\/reports\//;
const CHAINS = /\/api\/v1\/restaurant-chains$/;

const ref = (n) => ({ id: `00000000-0000-4000-8000-00000000000${n}`, code: `B${n}`, name: `Chi nhánh ${n}`, city: null, chainId: "x" });
const range = { from: "2026-10-01", to: "2026-10-07", timezone: "Asia/Ho_Chi_Minh", branchCount: 2 };
const comparison = {
  range,
  totals: { averageOrderValue: "105555.56", revenue: "950000.00", grossRevenue: "1090000.00", refundAmount: "140000.00", pendingRefundAmount: "30000.00", netRevenue: "950000.00", paidCancellationCount: 3, orderCount: 9 },
  branches: [{ branch: ref(1), discount: "0.00", revenue: "950000.00", grossRevenue: "1090000.00", refundAmount: "140000.00", pendingRefundAmount: "30000.00", netRevenue: "950000.00", paidCancellationCount: 3, orderCount: 9, averageOrderValue: "105555.56" }],
};
const methodRow = (method, net, count) => ({ method, grossSettledAmount: net, grossReceivedAmount: net, refundAmount: "0.00", netAmount: net, receivedAmount: net, paymentCount: count, cancelledAfterPaymentCount: 0 });
const payments = { range, methods: [methodRow("CASH", "400000.00", 4), methodRow("BANK_TRANSFER", "550000.00", 5)], branches: [] };
const toppings = {
  range,
  items: [
    { rank: 1, optionId: "t1", name: "Trân châu đen", groupCode: "TOPPING", groupName: "Topping", quantity: 12, additionalRevenue: "60000.00" },
    { rank: 2, optionId: "t2", name: "Thạch dừa", groupCode: "TOPPING", groupName: "Topping", quantity: 7, additionalRevenue: "35000.00" },
  ],
};
const refund = {
  id: "11111111-1111-4111-8111-111111111111",
  orderId: "22222222-2222-4222-8222-222222222222",
  amount: "65000.00",
  status: "PENDING",
  method: "BANK_TRANSFER",
  source: "MANAGER_CANCELLATION",
  reason: "Khách đổi ý sau khi trả",
  requestedByRole: "MANAGER",
  requestedAt: "2026-10-06T03:00:00.000Z",
  order: { id: "22222222-2222-4222-8222-222222222222", orderCode: "ORD-92-001", callNumber: 7, branch: { id: ref(1).id, code: "B1", name: "Chi nhánh 1", chainId: "x" } },
};
const refunds = { items: [refund], total: 1, page: 1, limit: 100 };
const PLAN_BODY = { statusCode: 403, error: "PLAN_FEATURE_NOT_ENABLED", feature: "MULTI_BRANCH_COMPARISON", message: "Gói hiện tại không hỗ trợ so sánh nhiều chi nhánh." };

const login = async () => {
  await tab.goto("/login");
  await tab.clearStorage();
  await tab.goto("/login");
  await tab.login("owner");
  await tab.waitFor(`location.pathname.startsWith("/owner")`, 20000, "vào /owner");
  await tab.waitFor(`document.querySelector(".ant-layout-sider, .ant-layout-header")`, 15000, "shell");
  await sleep(900);
};
const goReports = async () => {
  await tab.goto("/owner/reports");
  await tab.waitFor(`document.querySelector('[data-testid="chain-pending-refunds"]')`, 20000, "khối khoản chờ hoàn");
  await sleep(1800);
};
const withPlan = async (code, flag) => {
  const real = await q(`(async () => { const t = localStorage.getItem("smartfnb_access_token"); const r = await fetch("http://localhost:3100/api/v1/restaurant-chains", { headers: { Authorization: "Bearer " + t } }); return r.json(); })()`);
  const chains = Array.isArray(real) ? real : (real.data ?? []);
  return {
    match: CHAINS,
    body: J(chains.map((c) => ({ ...c, subscription: { ...(c.subscription ?? {}), status: "ACTIVE", expiresAt: "2030-01-01T00:00:00.000Z", plan: { ...(c.subscription?.plan ?? {}), code, name: code, brandingEnabled: flag, multiBranchComparisonEnabled: flag } } }))),
  };
};

try {
  await login();

  // 1. REAL: ba API mới gọi thật, không toast lỗi.
  tab.caseName = "real";
  tab.requests.length = 0;
  await goReports();
  const hit = (re) => tab.requests.find((r) => r.method === "GET" && re.test(new URL(r.url).pathname));
  check("real · GET payment-methods, top-toppings, payments/refunds đều được gọi thật", !!hit(PAYMENTS) && !!hit(TOPPINGS) && !!hit(REFUNDS), [PAYMENTS, TOPPINGS, REFUNDS].map((r) => hit(r)?.url ?? "thiếu").join(" | "));
  check("real · có đủ mục: theo hình thức thanh toán, topping bán chạy, khoản chờ chủ chuỗi hoàn; 0 toast lỗi", /Theo hình thức thanh toán/.test(await bodyText()) && /Topping bán chạy/.test(await bodyText()) && !!(await q(`!!${tid("chain-pending-refunds")}`)) && (await toasts()) === "", await toasts());
  const refundRes = await q(`(async () => { const t = localStorage.getItem("smartfnb_access_token"); const r = await fetch("http://localhost:3100/api/v1/refunds?status=PENDING&limit=1", { headers: { Authorization: "Bearer " + t } }); return r.status; })()`);
  check("real · GET /refunds trả 200 và khối khoản chờ hoàn không báo lỗi (đường dẫn thật, không phải /payments/refunds)", refundRes === 200 && !/Không tải được khoản chờ hoàn/.test(await text("chain-pending-refunds")), `status ${refundRes}`);
  check("real · không có khối lỗi gộp và không có khối lỗi từng mục", (await q(`document.querySelectorAll('[data-testid="report-group-error"], [data-testid="report-section-error"]').length`)) === 0);

  // 2. Trả lời giả: hình thức thanh toán, topping, giá trị đơn TB ở tổng.
  tab.caseName = "fake-data";
  const all = [
    { match: COMPARISON, body: J(comparison) },
    { match: PAYMENTS, body: J(payments) },
    { match: TOPPINGS, body: J(toppings) },
    { match: REFUNDS, body: J(refunds) },
  ];
  tab.readOverride = all;
  await goReports();
  const pm = await text("report-payment-methods");
  check("fake · theo hình thức: Tiền mặt 400.000 và Chuyển khoản (QR) 550.000, đúng số BE", /Tiền mặt/.test(pm) && /400\.000/.test(pm) && /Chuyển khoản \(QR\)/.test(pm) && /550\.000/.test(pm), pm);
  const tp = await text("report-top-toppings");
  check("fake · topping: Trân châu đen (12) xếp trước Thạch dừa (7)", /Trân châu đen/.test(tp) && /Thạch dừa/.test(tp) && tp.indexOf("Trân châu đen") < tp.indexOf("Thạch dừa"), tp);
  check("fake · giá trị đơn TB ở tổng = 105.556 (số BE, không tự chia)", /105\.55[56]/.test(await text("report-kpi-aov")), await text("report-kpi-aov"));

  // 3. Khoản chờ hoàn: dòng đủ cột, đánh dấu Đã hoàn bằng hộp 7.6 (lệnh ghi bị chặn ở CDP, quan sát bằng fulfillWrites).
  tab.caseName = "refunds";
  const row = await text("chain-pending-refunds");
  check("refunds · dòng có mã đơn, chi nhánh, số tiền, lý do, vai trò người huỷ, thời điểm", /ORD-92-001/.test(row) && /Chi nhánh 1/.test(row) && /65\.000/.test(row) && /Khách đổi ý sau khi trả/.test(row) && /Quản lý chi nhánh/.test(row) && /06\/10\/2026|6\/10\/2026|06\/10/.test(row), row.slice(0, 200));
  tab.blockedWrites.length = 0;
  await q(`${tid("chain-refund-open")}.click()`);
  await tab.waitFor(tid("complete-modal"), 8000, "hộp Đánh dấu đã hoàn");
  check("refunds · mở hộp Đánh dấu đã hoàn (hộp sẵn có 7.6) với đúng mã đơn và số tiền", /ORD-92-001/.test(await text("complete-modal")) && /65\.000/.test(await text("complete-amount")));
  tab.fulfillWrites = true;
  tab.readOverride = [...all.filter((o) => o.match !== REFUNDS), { match: REFUNDS, body: J({ items: [], total: 0, page: 1, limit: 100 }) }];
  await q(`${tid("complete-submit")}.click()`);
  await sleep(2500);
  tab.fulfillWrites = false;
  const w = tab.blockedWrites.find((b) => b.method === "POST" && /\/refunds\/11111111-1111-4111-8111-111111111111\/complete$/.test(b.path));
  check("refunds · Đã hoàn gửi POST /refunds/:id/complete đúng id (bị chặn ở CDP, không tới BE)", !!w, J(tab.blockedWrites.map((b) => `${b.method} ${b.path}`)));
  check("refunds · sau khi hoàn danh sách tải lại, dòng biến mất", /Không có khoản nào chờ hoàn/.test(await text("chain-pending-refunds")));

  // 4. Gói: BE chặn (403 PLAN_FEATURE_NOT_ENABLED) → mọi mục khoá kèm nhãn gói, khối khoản chờ hoàn vẫn chạy, không toast hạn mức.
  tab.caseName = "plan-lock";
  tab.readOverride = [{ match: REFUNDS, body: J(refunds) }];
  tab.setFault({ kind: "403", match: ANY_REPORT, body: PLAN_BODY });
  await goReports();
  const locks = await q(`document.querySelectorAll('[data-testid="feature-lock"]').length`);
  const lockText = await q(`[...document.querySelectorAll('[data-testid="feature-lock"]')].map((e) => e.innerText.replace(/\\s+/g, " ")).join(" | ")`);
  tab.setFault(null);
  check("plan-lock · BE chặn theo gói: ≥ 4 mục hiện khoá kèm 'Cần gói …'", locks >= 4 && /Cần gói/.test(lockText), `${locks} thẻ khoá: ${lockText.slice(0, 160)}`);
  check("plan-lock · không có thông báo nổi 'Vượt hạn mức'; khối khoản chờ hoàn vẫn hiện dòng", !/Vượt hạn mức/.test(await toasts()) && /ORD-92-001/.test(await text("chain-pending-refunds")), await toasts());

  // 5. Tách mục: payment-methods lỗi 500 không làm hỏng thẻ số và các mục khác.
  tab.caseName = "independent";
  tab.readOverride = all.filter((o) => o.match !== PAYMENTS); // readOverride được xét trước setFault nên bỏ mục này ra
  tab.setFault({ kind: "500", match: PAYMENTS });
  await goReports();
  const sectionErr = await q(`document.querySelectorAll('[data-testid="report-section-error"]').length`);
  tab.setFault(null);
  check("independent · 500 ở payment-methods: đúng 1 mục báo lỗi tại chỗ, thẻ số và topping vẫn đủ", sectionErr === 1 && /105\.55[56]/.test(await text("report-kpi-aov")) && /Trân châu đen/.test(await text("report-top-toppings")), `${sectionErr} khối lỗi`);

  // 6. Khoản chờ hoàn lỗi 500: chỉ khối đó báo lỗi, báo cáo vẫn nguyên.
  tab.caseName = "refund-error";
  tab.readOverride = all.filter((o) => o.match !== REFUNDS);
  tab.setFault({ kind: "500", match: REFUNDS });
  await goReports();
  const body6 = await bodyText();
  tab.setFault(null);
  check("refund-error · 500: khối khoản chờ hoàn báo 'Không tải được khoản chờ hoàn' (tiếng Việt), thẻ số vẫn nguyên", /Không tải được khoản chờ hoàn/.test(body6) && /105\.55[56]/.test(await text("report-kpi-aov")) && !/Internal server error/i.test(body6));

  // 7. Gói Cơ bản: chỉ gọi báo cáo theo ĐÚNG MỘT chi nhánh; lựa chọn 'Tất cả chi nhánh' khoá kèm nhãn gói.
  tab.caseName = "basic-plan";
  tab.readOverride = [...all, await withPlan("BASIC", false)];
  tab.requests.length = 0;
  await goReports();
  const cmpReq = tab.requests.find((r) => r.method === "GET" && COMPARISON.test(new URL(r.url).pathname));
  const ids = cmpReq ? new URL(cmpReq.url).searchParams.getAll("branchIds").flatMap((s) => s.split(",")).filter(Boolean) : [];
  check("basic-plan · gói Cơ bản gọi comparison với đúng 1 branchIds (chi nhánh đầu)", ids.length === 1, cmpReq?.url ?? "không có request");
  await q(`(() => { const el = document.querySelector('[data-testid="report-branch-select"]'); const sel = el.matches(".ant-select") ? el : (el.closest(".ant-select") ?? el.querySelector(".ant-select")); (sel.querySelector(".ant-select-selector") ?? sel).dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); })()`);
  await sleep(500);
  const opt = await q(`[...document.querySelectorAll(".ant-select-item-option")].find((e) => /Tất cả chi nhánh/.test(e.textContent))?.getAttribute("aria-disabled") + "|" + ([...document.querySelectorAll(".ant-select-item-option")].find((e) => /Tất cả chi nhánh/.test(e.textContent))?.textContent ?? "")`);
  check("basic-plan · 'Tất cả chi nhánh' bị khoá kèm 'cần gói Tiêu chuẩn'", /^true\|/.test(opt) && /cần gói/i.test(opt), opt);

  // 8. Poster (OW-11): BE chặn GET display-posters theo gói → gói Cơ bản hiện thẻ khoá, không gọi API poster, không toast.
  tab.caseName = "posters-basic";
  tab.readOverride = [await withPlan("BASIC", false)];
  tab.requests.length = 0;
  await tab.goto("/owner/posters");
  await sleep(2500);
  const posterReq = tab.requests.some((r) => /display-posters/.test(r.url));
  const posterLock = await q(`document.querySelector('[data-testid="feature-lock"]')?.innerText ?? ""`);
  check("posters-basic · gói Cơ bản: thẻ khoá 'Nhận diện thương hiệu chưa có…', không gọi API poster, không toast", /Nhận diện thương hiệu chưa có/.test(posterLock) && !posterReq && (await toasts()) === "", `${posterLock.replace(/\s+/g, " ").slice(0, 80)} · gọi poster=${posterReq}`);
} catch (e) {
  console.log("ERROR", e.stack ?? e.message);
  check("script chạy hết không lỗi", false, String(e.message ?? e));
}
tab.readOverride = null;
console.log(`\n[real] ${results.filter((r) => r.ok).length}/${results.length} đạt`);
console.log(`[real] request ghi bị chặn ở CDP: ${tab.blockedWrites?.length ?? 0}; request ghi THẬT tới BE: ${(tab.sentWrites ?? []).length}`);
await closeTab(tab);
process.exit(results.every((r) => r.ok) ? 0 : 1);
