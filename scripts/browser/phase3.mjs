// Kiểm tra trình duyệt thật cho Giai đoạn 3.2: hồ sơ đăng ký + doanh nghiệp của Platform Admin.
//   node scripts/browser/phase3.mjs mock   # dev server có VITE_API_ADMIN=mock (+ auth/branch/report=mock nếu BE không chạy)
//   node scripts/browser/phase3.mjs real   # chỉ phần ĐỌC (danh sách, KPI, quét ví) + gia hạn 1 lần trên doanh nghiệp seed
// Xem README.md để biết biến môi trường (BASE_URL, AUTH_MODE…). Chế độ "real" KHÔNG duyệt, từ chối, tạm ngưng, đổi gói,
// đặt lại mật khẩu trên dữ liệu thật.
import { newTab, closeTab, check, results, sleep } from "./cdp.mjs";

const MODE = process.argv[2] ?? "mock";
const REAL = MODE === "real";
const fmt = (d) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
const addMonths = (d, n) => {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
};
const parseDmy = (s) => {
  const [d, m, y] = s.split("/").map(Number);
  return new Date(y, m - 1, d);
};

const tab = await newTab("about:blank", REAL ? "real" : "mock");
const q = (expr) => tab.eval(expr);
const J = JSON.stringify;

/** Bấm phần tử đầu tiên khớp selector (và chứa text nếu có). Trả true nếu bấm được. */
const click = (sel, text) =>
  q(`(() => {
    const el = [...document.querySelectorAll(${J(sel)})].find((e) => !${J(text ?? "")} || e.textContent.includes(${J(text ?? "")}));
    if (!el) return false; el.click(); return true; })()`);

const visibleModal = `[...document.querySelectorAll(".ant-modal-wrap")].filter((w) => getComputedStyle(w).display !== "none").pop()`;

/** Chọn option của một antd Select trong `scope` (biểu thức JS trả về phần tử gốc). */
async function pickSelect(scope, optionText, index = 0) {
  await q(`(() => { const root = ${scope}; const sel = root.querySelectorAll(".ant-select-content, .ant-select-selector")[${index}];
    sel.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); })()`);
  await sleep(350);
  const ok = await q(`(() => { const o = [...document.querySelectorAll(".ant-select-item-option")].find((e) => e.textContent.includes(${J(optionText)}));
    if (!o) return false; o.click(); return true; })()`);
  await sleep(500);
  return ok;
}

const setInput = (scope, inputSel, value) =>
  q(`(() => { const el = (${scope}).querySelector(${J(inputSel)});
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement : HTMLInputElement;
    Object.getOwnPropertyDescriptor(proto.prototype, "value").set.call(el, ${J(String(value))});
    el.dispatchEvent(new Event("input", { bubbles: true })); })()`);

const search = async (text) => {
  await setInput(`document`, ".ant-input-search input", text);
  await click(".ant-input-search .ant-btn, .ant-input-search-button");
  await sleep(900);
};

const rows = () => q(`[...document.querySelectorAll(".ant-table-tbody > tr.ant-table-row")].map((r) => r.innerText.replace(/\\s+/g, " ").trim())`);
const toasts = () => q(`[...document.querySelectorAll(".ant-message-notice, .ant-notification-notice")].map((e) => e.textContent).join(" | ")`);
const modalText = () => q(`(() => { const m = ${visibleModal}; return m ? m.innerText : "" })()`);
const modalButton = (text) =>
  q(`(() => { const m = ${visibleModal}; const b = m && [...m.querySelectorAll("button")].find((x) => x.textContent.includes(${J(text)})); return b ? { disabled: b.disabled } : null })()`);
const clickModalButton = (text) =>
  q(`(() => { const m = ${visibleModal}; const b = [...m.querySelectorAll("button")].find((x) => x.textContent.includes(${J(text)})); if (!b) return false; b.click(); return true })()`);
const drawerText = () => q(`(() => { const d = document.querySelector(".ant-drawer-content-wrapper:last-of-type, .ant-drawer-body"); return document.querySelector(".ant-drawer-body")?.innerText ?? "" })()`);
const closeDrawer = async () => {
  await click(".ant-drawer-close");
  await sleep(500);
};

/** Mở hàng chứa `name` trong bảng hiện tại. */
async function openRow(name) {
  const ok = await click(".ant-table-tbody > tr.ant-table-row", name);
  await sleep(900);
  return ok;
}

try {
  // ------------------------------------------------------------------ đăng nhập admin
  await tab.goto("/login");
  await tab.clearStorage();
  await tab.goto("/login");
  await tab.login("admin");
  await tab.waitFor(`location.pathname.startsWith("/admin")`, 20000, "vào /admin");
  await tab.waitFor(`document.querySelector(".ant-layout-sider")`, 15000, "shell");
  await sleep(800);

  // ------------------------------------------------------------------ KPI
  await tab.clickMenu("Tổng quan");
  await sleep(1500);
  const overview = await tab.text();
  const kpi = await q(`[...document.querySelectorAll(".ant-card, [class*=stat]")].length`);
  const hasKpiDigits = /Doanh nghiệp thuê bao[\s\S]{0,40}\d+/.test(overview) && /Đăng ký chờ duyệt[\s\S]{0,40}\d+/.test(overview) && /Tạm ngưng \/ hết hạn[\s\S]{0,40}\d+/.test(overview);
  check("KPI hiện số (doanh nghiệp, tạm ngưng/hết hạn, hồ sơ chờ duyệt)", hasKpiDigits && kpi > 0, overview.match(/Doanh nghiệp thuê bao\s*\n?\s*(\d+)/)?.[0]?.replace(/\s+/g, " ") ?? "");

  // ------------------------------------------------------------------ hồ sơ đăng ký — đọc
  await tab.clickMenu("Hồ sơ đăng ký");
  await sleep(1500);
  let list = await rows();
  check("Hồ sơ: danh sách (mặc định Chờ duyệt) có dữ liệu", list.length > 0 && list.every((r) => r.includes("Chờ duyệt")), `${list.length} hàng`);

  await pickSelect(`document.querySelector(".ant-card")`, "Tất cả");
  await sleep(900);
  const allPage1 = await rows();
  const pagers = await q(`[...document.querySelectorAll(".ant-pagination-item")].map((e) => e.textContent.trim())`);
  check("Hồ sơ: lọc Tất cả → có phân trang (≥ 2 trang)", pagers.length >= 2, `trang: ${pagers.join(",")}`);
  await click(".ant-pagination-item", "2");
  await sleep(1000);
  const allPage2 = await rows();
  check("Hồ sơ: chuyển trang đổi nội dung", allPage2.length > 0 && allPage2[0] !== allPage1[0], `${allPage1.length} → ${allPage2.length} hàng`);
  await click(".ant-pagination-item", "1");
  await sleep(700);

  await pickSelect(`document.querySelector(".ant-card")`, "Bị từ chối");
  await sleep(900);
  list = await rows();
  check("Hồ sơ: lọc theo trạng thái Bị từ chối", list.length > 0 && list.every((r) => r.includes("Bị từ chối")), `${list.length} hàng`);

  await pickSelect(`document.querySelector(".ant-card")`, "Chờ duyệt");
  await sleep(700);
  await search("rang xay");
  list = await rows();
  check("Hồ sơ: tìm kiếm chạy ('rang xay' → 1 hồ sơ)", list.length === 1 && /Rang Xay/i.test(list[0]), list.join(" // ").slice(0, 80));
  await search("");

  // ------------------------------------------------------------------ hồ sơ đăng ký — ghi (mock)
  if (!REAL) {
    await openRow("Trà Đạo Sài Gòn");
    const detail = await drawerText();
    check("Hồ sơ: chi tiết hiện trường của BE (người đại diện, MST, địa chỉ trụ sở, mã hồ sơ)", /Người đại diện/.test(detail) && /Mã số thuế/.test(detail) && /Địa chỉ trụ sở/.test(detail) && /Mã hồ sơ/.test(detail));
    await click(".ant-drawer-body button", "Duyệt");
    await sleep(900);
    const planOk = await pickSelect(visibleModal, "Tiêu chuẩn", 0);
    check("Duyệt: chọn được gói đang bật; gói ngừng bán không có trong danh sách", planOk && !(await q(`[...document.querySelectorAll(".ant-select-item-option")].some((e) => e.textContent.includes("Gói cũ"))`)));
    await setInput(visibleModal, ".ant-input-number-input", 3);
    await sleep(500);
    const shown = await q(`document.querySelector('[data-testid="approve-expiry"]')?.textContent`);
    check("Duyệt: nhập 3 tháng → hiện đúng ngày hết hạn", shown === fmt(addMonths(new Date(), 3)), `${shown} (kỳ vọng ${fmt(addMonths(new Date(), 3))})`);
    await clickModalButton("Duyệt và tạo tài khoản Owner");
    await sleep(1500);
    const afterApprove = await q(`document.body.innerText`);
    check("Duyệt: hiện 'Đã tạo tài khoản Owner và xếp email đặt mật khẩu tới …'", /Đã tạo tài khoản Owner và xếp email đặt mật khẩu tới \S+@\S+/.test(afterApprove) && !/Mật khẩu tạm/i.test(afterApprove));
    await click(".ant-modal-confirm .ant-btn, .ant-modal-confirm-btns button");
    await sleep(700);
    check("Duyệt: trạng thái hồ sơ đổi sang Đã duyệt", /Đã duyệt/.test(await drawerText()));
    await closeDrawer();

    // từ chối
    await openRow("Cà Phê Rang Xay Hùng");
    await click(".ant-drawer-body button", "Từ chối");
    await sleep(900);
    const blank = await modalButton("Từ chối hồ sơ");
    check("Từ chối: để trống lý do thì nút bị chặn", blank?.disabled === true);
    await setInput(visibleModal, "textarea", "Thiếu giấy phép kinh doanh");
    await sleep(400);
    const filled = await modalButton("Từ chối hồ sơ");
    check("Từ chối: có lý do thì nút mở", filled?.disabled === false);
    await clickModalButton("Từ chối hồ sơ");
    await sleep(1500);
    const rejText = await drawerText();
    const toast = await toasts();
    check("Từ chối: trạng thái đổi sang Bị từ chối kèm lý do, không nói đã gửi email", /Bị từ chối/.test(rejText) && /Thiếu giấy phép/.test(rejText) && !/email/i.test(toast), toast);
    await closeDrawer();
  }

  // ------------------------------------------------------------------ doanh nghiệp — đọc
  await tab.clickMenu("Doanh nghiệp");
  await sleep(1500);
  list = await rows();
  const headers = await q(`[...document.querySelectorAll(".ant-table-thead th")].map((e) => e.textContent.trim())`);
  const wantedCols = ["Doanh nghiệp", "Người đại diện", "Gói", "Trạng thái", "Hết hạn", "Chi nhánh", "Tài khoản", "Đơn trong tháng"];
  check("Doanh nghiệp: có dữ liệu và đủ cột (đại diện, gói, trạng thái, hết hạn, chi nhánh, tài khoản, đơn tháng)", list.length > 0 && wantedCols.every((c) => headers.includes(c)), `${list.length} hàng; cột: ${headers.join(",")}`);
  await search(list.length ? (await q(`document.querySelector(".ant-table-tbody > tr.ant-table-row td")?.innerText.split("\\n")[0]`)).slice(0, 6) : "a");
  check("Doanh nghiệp: tìm kiếm chạy", (await rows()).length >= 1);
  await search("");

  // gia hạn (cho phép cả real 1 lần, trên doanh nghiệp đầu tiên)
  const target = REAL ? null : "Cà Phê Mộc Nhà";
  if (target) await openRow(target);
  else await click(".ant-table-tbody > tr.ant-table-row");
  await sleep(900);
  await click(".ant-drawer-body button", "Gia hạn");
  await sleep(900);
  const renewInfo = await modalText();
  const current = renewInfo.match(/Hết hạn hiện tại: (\d{2}\/\d{2}\/\d{4})/)?.[1];
  await setInput(visibleModal, ".ant-input-number-input", 2);
  await sleep(500);
  const next = await q(`document.querySelector('[data-testid="renew-expiry"]')?.textContent`);
  const base = parseDmy(current);
  const expectedBase = base > new Date() ? base : new Date();
  check("Gia hạn: nhập 2 tháng → hiện đúng ngày hết hạn mới", !!current && next === fmt(addMonths(expectedBase, 2)), `${current} → ${next} (kỳ vọng ${fmt(addMonths(expectedBase, 2))})`);
  await clickModalButton("Gia hạn");
  await sleep(1500);
  check("Gia hạn: thông báo thành công đúng ngày mới", (await toasts()).includes(`Đã gia hạn tới ${next}`), await toasts());
  await closeDrawer();

  // ------------------------------------------------------------------ doanh nghiệp — ghi (mock)
  if (!REAL) {
    // nâng gói
    await openRow("Cà Phê Phố Cổ");
    await click(".ant-drawer-body button", "Đổi gói");
    await sleep(900);
    await pickSelect(visibleModal, "Tiêu chuẩn");
    check("Đổi gói: chọn gói đắt hơn → hiện 'Nâng gói'", /Nâng gói/.test(await modalText()));
    await clickModalButton("Đổi gói");
    await sleep(1500);
    check("Đổi gói (nâng): thành công", (await toasts()).includes("Đã đổi gói"), await toasts());
    await closeDrawer();

    // hạ gói vượt hạn mức → 409
    await openRow("Sinh Tố Cô Hoa");
    await click(".ant-drawer-body button", "Đổi gói");
    await sleep(900);
    await pickSelect(visibleModal, "Cơ bản");
    check("Đổi gói: chọn gói rẻ hơn → hiện 'Hạ gói'", /Hạ gói/.test(await modalText()));
    await clickModalButton("Đổi gói");
    await sleep(1500);
    const downgrade = await toasts();
    check("Đổi gói (hạ vượt hạn mức): hiện đúng thông báo 409 của BE", /exceeds one or more limits/.test(downgrade), downgrade);
    await click(".ant-modal-close");
    await closeDrawer();

    // tạm ngưng
    await openRow("Trà Chanh Cô Ba");
    await click(".ant-drawer-body button", "Tạm ngưng");
    await sleep(900);
    const noReason = await modalButton("Tạm ngưng");
    check("Tạm ngưng: không lý do thì bị chặn", noReason?.disabled === true);
    await setInput(visibleModal, "textarea", "Nợ phí thuê bao");
    await sleep(400);
    await clickModalButton("Tạm ngưng");
    await sleep(1500);
    check("Tạm ngưng: có lý do thì thành công, trạng thái đổi", /Tạm ngưng/.test((await toasts()) + (await drawerText())) && /Kích hoạt lại/.test(await drawerText()));
    await closeDrawer();

    // đặt lại mật khẩu
    await openRow("Cà Phê Mộc Nhà");
    await click(".ant-drawer-body button", "Đặt lại mật khẩu Owner");
    await sleep(900);
    const confirm = await modalText();
    check("Đặt lại mật khẩu: có bước xác nhận, nói rõ không hiện mật khẩu", /Xác nhận đặt lại mật khẩu/.test(confirm) && /không hiện mật/i.test(confirm.replace(/\s+/g, " ")));
    await clickModalButton("Xác nhận đặt lại mật khẩu");
    await sleep(1500);
    const done = await q(`document.body.innerText`);
    check("Đặt lại mật khẩu: 'Đã xếp email đặt lại mật khẩu … hiệu lực tới …', không có mật khẩu tạm", /Đã xếp email đặt lại mật khẩu/.test(done) && /hiệu lực tới/.test(done) && !/Mật khẩu tạm/i.test(done));
  }

  // ------------------------------------------------------------------ quét ví (DOM + storage + store)
  const WALLET = /balance|heldbalance|wallet|(^|[^\p{L}])ví([^\p{L}]|$)|số dư/iu;
  const scans = [];
  for (const label of ["Tổng quan", "Hồ sơ đăng ký", "Doanh nghiệp", "Gói dịch vụ"]) {
    await q(`document.querySelectorAll(".ant-modal-close, .ant-drawer-close").forEach((b) => b.click())`);
    await sleep(400);
    await tab.clickMenu(label);
    await sleep(1200);
    // mở chi tiết đầu tiên để quét cả drawer
    if (label === "Hồ sơ đăng ký" || label === "Doanh nghiệp") {
      await click(".ant-table-tbody > tr.ant-table-row");
      await sleep(1000);
    }
    const html = await q(`document.body.innerHTML`);
    const text = await tab.text();
    scans.push({ label, hit: WALLET.exec(text)?.[0] ?? WALLET.exec(html.replace(/<style[\s\S]*?<\/style>/g, ""))?.[0] ?? null });
    await q(`document.querySelectorAll(".ant-drawer-close").forEach((b) => b.click())`);
  }
  check("Quét DOM các màn Admin: không có 'balance', 'heldBalance', 'ví', 'số dư'", scans.every((s) => !s.hit), scans.map((s) => `${s.label}:${s.hit ?? "sạch"}`).join(" "));

  const storeDump = await q(`(async () => {
    const mod = await import("/src/store/index.ts");
    return JSON.stringify(mod.useAppStore.getState());
  })()`).catch(() => null);
  const storage = await q(`JSON.stringify({ l: { ...localStorage }, s: { ...sessionStorage } })`);
  check(
    "Quét state store + storage: không có dữ liệu ví",
    storeDump !== null && !WALLET.test(storeDump) && !WALLET.test(storage),
    storeDump === null ? "không đọc được store" : `store ${storeDump.length} ký tự, storage ${storage.length} ký tự`,
  );
} catch (e) {
  console.log("ERROR", e.stack ?? e.message);
  check("script chạy hết không lỗi", false, e.message);
}
await closeTab(tab);
const failed = results.filter((r) => !r.ok);
console.log(`\n[${MODE}] ${results.length - failed.length}/${results.length} đạt`);
process.exit(failed.length ? 1 : 0);
