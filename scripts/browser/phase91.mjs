// Kiểm trình duyệt thật cho lượt 9.1: báo cáo Owner (OW-08) hiện hoàn tiền theo BR-50 và khoá so sánh theo gói.
//   node scripts/browser/phase91.mjs --mode=real        # dev server 5173 (real), BE local, Chrome CDP 9333
// Mọi request ghi bị chặn ở CDP; dữ liệu giả chỉ qua readOverride (GET, không tới BE). KHÔNG gọi API ghi.
import { check, cli, closeTab, newTab, results, sleep, SESSION_ALLOW } from "./cdp.mjs";

cli();
const J = JSON.stringify;
const tab = await newTab("about:blank", "real");
const q = (e) => tab.eval(e);
await tab.blockWrites(SESSION_ALLOW);
const tid = (id) => `document.querySelector('[data-testid=${J(id)}]')`;
const text = (id) => q(`${tid(id)}?.innerText ?? ""`);
const toasts = () => q(`[...document.querySelectorAll(".ant-message-notice, .ant-notification-notice")].map((e) => e.textContent).join(" | ")`);
const COMPARISON = /\/api\/v1\/reports\/revenue\/comparison/;
const SERIES = /\/api\/v1\/reports\/revenue\/timeseries/;
const CHAINS = /\/api\/v1\/restaurant-chains$/;

const ref = (n) => ({ id: `00000000-0000-4000-8000-00000000000${n}`, code: `B${n}`, name: `Chi nhánh ${n}`, city: null, chainId: "x" });
const range = { from: "2026-10-01", to: "2026-10-07", timezone: "Asia/Ho_Chi_Minh", branchCount: 2 };
const row = (n, o) => ({ branch: ref(n), discount: "0.00", ...o });
const two = {
  range,
  totals: { averageOrderValue: "105555.56", revenue: "950000.00", grossRevenue: "1090000.00", refundAmount: "140000.00", pendingRefundAmount: "30000.00", netRevenue: "950000.00", paidCancellationCount: 3, orderCount: 9 },
  branches: [
    row(1, { revenue: "600000.00", grossRevenue: "700000.00", refundAmount: "100000.00", pendingRefundAmount: "30000.00", netRevenue: "600000.00", paidCancellationCount: 2, orderCount: 5, averageOrderValue: "120000.00" }),
    row(2, { revenue: "350000.00", grossRevenue: "390000.00", refundAmount: "40000.00", pendingRefundAmount: "0.00", netRevenue: "350000.00", paidCancellationCount: 1, orderCount: 4, averageOrderValue: "87500.00" }),
  ],
};
const one = { ...two, range: { ...range, branchCount: 1 }, totals: { ...two.totals, averageOrderValue: "120000.00" }, branches: [two.branches[0]] };
const pt = (bucket, gross, refund, orders) => ({ bucket, revenue: `${gross - refund}.00`, grossRevenue: `${gross}.00`, refundAmount: `${refund}.00`, netRevenue: `${gross - refund}.00`, orderCount: orders });
const points = [pt("2026-10-05", 300000, 0, 3), pt("2026-10-06", 400000, 100000, 3), pt("2026-10-07", 390000, 40000, 3)];
const series = {
  range, granularity: "day", buckets: points.map((p) => p.bucket),
  series: [{ branch: ref(1), points, total: "800000.00", grossTotal: "1090000.00", refundTotal: "140000.00", netTotal: "950000.00", orderCount: 9 }],
};

const login = async () => {
  await tab.goto("/login");
  await tab.clearStorage();
  await tab.goto("/login");
  await tab.login("owner");
  await tab.waitFor(`location.pathname.startsWith("/owner")`, 20000, "vào /owner");
  await tab.waitFor(`document.querySelector(".ant-layout-sider, .ant-layout-header")`, 15000, "shell");
  await sleep(900);
};
const withPlan = async (code, flag) => {
  const real = await q(`(async () => { const t = localStorage.getItem("smartfnb_access_token"); const r = await fetch("http://localhost:3100/api/v1/restaurant-chains", { headers: { Authorization: "Bearer " + t } }); return r.json(); })()`);
  const chains = Array.isArray(real) ? real : (real.data ?? []);
  return {
    match: CHAINS,
    body: J(chains.map((c) => ({ ...c, subscription: { ...(c.subscription ?? {}), status: "ACTIVE", expiresAt: "2030-01-01T00:00:00.000Z", plan: { ...(c.subscription?.plan ?? {}), code, name: code, brandingEnabled: flag, multiBranchComparisonEnabled: flag } } }))),
  };
};
const goReports = async () => {
  await tab.goto("/owner/reports");
  await tab.waitFor(tid("report-kpi-revenue"), 20000, "thẻ số báo cáo");
  await sleep(1500);
};

try {
  await login();
  tab.caseName = "reports";

  // 1. Dữ liệu THẬT: GET /reports/revenue/comparison 200, đủ 5 thẻ, không toast lỗi.
  tab.requests.length = 0;
  await goReports();
  const gotCmp = tab.requests.find((r) => r.method === "GET" && COMPARISON.test(new URL(r.url).pathname));
  const keys = await q(`["revenue","orders","aov","cancelled","pending"].filter((k) => !!${tid("report-kpi-")}).length`).catch(() => 0);
  const five = await q(`["revenue","orders","aov","cancelled","pending"].every((k) => !!document.querySelector('[data-testid="report-kpi-' + k + '"]'))`);
  check("reports · (real) GET /reports/revenue/comparison thật; đủ 5 thẻ số; 0 toast lỗi", !!gotCmp && five && (await toasts()) === "", `${gotCmp?.url ?? "không có GET"} ${keys}`);
  const realTxt = await q(`document.querySelector('[data-testid="report-kpi-revenue"]').innerText.replace(/\\s+/g, " ")`);
  check("reports · (real) thẻ doanh thu có 'Gộp' và 'đã hoàn' (số từ BE)", /Gộp .* đã hoàn/.test(realTxt), realTxt);

  // 2. Trả lời giả: hai chi nhánh, có hoàn tiền.
  tab.readOverride = [{ match: COMPARISON, body: J(two) }, { match: SERIES, body: J(series) }];
  await goReports();
  const norm = (s) => s.replace(/\s+/g, " ").replace(/ /g, " ");
  const rev = norm(await text("report-kpi-revenue"));
  const can = norm(await text("report-kpi-cancelled"));
  const pen = norm(await text("report-kpi-pending"));
  const aov = norm(await text("report-kpi-aov"));
  check("reports · (giả) doanh thu sau hoàn 950.000, gộp 1.090.000, đã hoàn 140.000", /950\.000/.test(rev) && /1\.090\.000/.test(rev) && /140\.000/.test(rev), rev);
  check("reports · (giả) đơn huỷ sau thanh toán = 3, chờ chủ chuỗi hoàn = 30.000", /\b3\b/.test(can) && /30\.000/.test(pen), `${can} | ${pen}`);
  check("reports · (giả) nhiều chi nhánh: giá trị đơn TB ở tổng = 105.556 (số BE #98, web không tự chia)", /105\.55[56]/.test(aov), aov);
  const marks = await q(`[...document.querySelectorAll('[data-testid="report-bar-refund"]')].map((e) => e.innerText)`);
  check("reports · (giả) biểu đồ đánh dấu hoàn đúng 2 ngày huỷ (06 và 07/10)", marks.length === 2, J(marks));

  // 3. Một chi nhánh: hiện giá trị đơn TB của BE.
  tab.readOverride = [{ match: COMPARISON, body: J(one) }, { match: SERIES, body: J(series) }];
  await goReports();
  const aov1 = norm(await text("report-kpi-aov"));
  check("reports · (giả) một chi nhánh: giá trị đơn TB = 120.000 (số BE)", /120\.000/.test(aov1), aov1);

  // 4. Theo gói: Cơ bản khoá so sánh kèm nhãn gói cần; Tiêu chuẩn mở.
  tab.readOverride = [{ match: COMPARISON, body: J(two) }, { match: SERIES, body: J(series) }, await withPlan("BASIC", false)];
  await goReports();
  const lockTxt = await q(`document.querySelector('[data-testid="feature-lock"]')?.innerText ?? ""`);
  check("reports · (giả, gói Cơ bản) mục so sánh bị khoá, nêu 'Cần gói Tiêu chuẩn trở lên'; thẻ số vẫn xem được", /So sánh đa chi nhánh chưa có/.test(lockTxt) && /Cần gói Tiêu chuẩn/.test(lockTxt) && (await q(`!!${tid("report-kpi-revenue")}`)), lockTxt.replace(/\s+/g, " ").slice(0, 160));
  tab.readOverride = [{ match: COMPARISON, body: J(two) }, { match: SERIES, body: J(series) }, await withPlan("STANDARD", true)];
  await goReports();
  const cmpOpen = await q(`!document.querySelector('[data-testid="feature-lock"]') && document.body.innerText.includes("Doanh thu theo chi nhánh")`);
  check("reports · (giả, gói Tiêu chuẩn) so sánh các chi nhánh mở, hiện 'huỷ … đơn, hoàn …' từng chi nhánh", cmpOpen && /huỷ 2 đơn, hoàn 100\.000/.test(norm(await q(`document.body.innerText`))));

  // 5. Lỗi 500 (setFault): báo gọn tiếng Việt, có Thử lại.
  tab.readOverride = null;
  tab.setFault({ kind: "500", match: COMPARISON });
  await tab.goto("/owner/reports");
  await sleep(2500);
  const body = await q(`document.body.innerText`);
  tab.setFault(null);
  check("reports · 500: báo 'Không tải được mục này' bằng tiếng Việt, không chữ Anh thô", /Không tải được mục này|Máy chủ đang gặp sự cố/.test(body) && !/Internal Server Error/i.test(body));
} catch (e) {
  console.log("ERROR", e.stack ?? e.message);
  check("script chạy hết không lỗi", false, String(e.message ?? e));
}
console.log(`\n[real] ${results.filter((r) => r.ok).length}/${results.length} đạt`);
console.log(`[real] request ghi bị chặn ở CDP: ${tab.blockedWrites?.length ?? 0}`);
await closeTab(tab);
process.exit(results.every((r) => r.ok) ? 0 : 1);
