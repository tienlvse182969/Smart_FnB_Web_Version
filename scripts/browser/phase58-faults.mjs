// 5.8a — Giả lập lỗi (500, 403 không mã, mất mạng, 401) cho các màn dùng module REAL, trên BE thật, cổng 5173.
//   node scripts/browser/phase58-faults.mjs [--only=admin|owner|manager|read|write|scope|expired|<id màn>] [--mode=real]
// Chỉ ĐỌC: mọi request ghi bị chặn ở CDP (cdp.mjs: blockWrites + setFault); request ghi chỉ nhận lỗi giả, không bao giờ tới BE.
// Chỉ POST /auth/login, /auth/refresh, /auth/logout đi thật. KHÔNG sửa mã ứng dụng: script chỉ quan sát và chấm.
// Mỗi ca in một dòng `CASE màn | thao tác | loại lỗi | Đạt/Lỗi | mã lỗi` và cuối cùng một bảng JSON `FAULTS-RESULT`.
import { accounts, cli, newTab, closeTab, sleep, SESSION_ALLOW } from "./cdp.mjs";

// --only=<mục>[,<mục>…]: vai (admin|owner|manager), nhóm (read|write|scope|expired) hoặc một phần id màn (ví dụ owner/reports,
// manager/menu). Không cờ (hoặc `all`) = chạy hết. --mode=real là mặc định và duy nhất (giả lập lỗi chỉ có ý nghĩa với module real).
const CLI = cli();
if (CLI.mode && CLI.mode !== "real" && CLI.mode !== "all") {
  console.log("phase58-faults chỉ chạy --mode=real");
  process.exit(2);
}
const TOKENS = (CLI.only ?? (CLI.positional && CLI.positional !== "all" && CLI.positional !== "real" ? [CLI.positional] : [])).filter(Boolean);
const J = JSON.stringify;
const tab = await newTab("about:blank", "real");
const q = (expr) => tab.eval(expr);
await tab.blockWrites(SESSION_ALLOW);

const RAW = /Internal server error|Forbidden|Unauthorized|Failed to fetch|NetworkError|statusCode|You do not have permission|subscription is read-only|\{"|\[object|undefined|TypeError/i;
const results = [];
let scriptError = null;

const spaGo = async (to) => {
  await q(`(() => { history.pushState({}, "", ${J(to)}); dispatchEvent(new PopStateEvent("popstate")); })()`);
  await sleep(700);
};

const snap = () =>
  q(`(() => {
    const vis = (e) => e.offsetParent !== null || getComputedStyle(e).position === "fixed";
    const txt = (e) => e.innerText.replace(/\\s+/g, " ").trim();
    // Màn lỗi nạp khu vực (router/guards.tsx) là một khối toàn trang, không phải Alert: nhận diện theo tiêu đề của nó.
    const scopeBox = document.body.innerText.match(/Không tải được phạm vi làm việc\\n([^\\n]+)/);
    const alerts = [...document.querySelectorAll(".ant-alert-error, .ant-result")].filter(vis).map(txt);
    if (scopeBox) alerts.push("Không tải được phạm vi làm việc " + scopeBox[1]);
    return {
      notices: [...document.querySelectorAll(".ant-message-notice, .ant-notification-notice")].map(txt),
      alerts,
      scopeScreen: !!scopeBox,
      retry: [...document.querySelectorAll("button")].some((b) => /thử lại/i.test(b.textContent) && !b.disabled),
      bodyLen: document.body.innerText.length,
      sider: !!document.querySelector(".ant-layout-sider"),
      path: location.pathname,
      spinner: [...document.querySelectorAll(".ant-spin-spinning")].some(vis),
      loadingCtl: [...document.querySelectorAll(".ant-switch-loading, .ant-btn-loading")].some(vis),
    };
  })()`);

const clearNotices = async () => {
  await q(`document.querySelectorAll(".ant-notification-notice-close, .ant-message-notice-close").forEach((b) => b.click())`);
  for (let i = 0; i < 24; i++) {
    const n = await q(`document.querySelectorAll(".ant-message-notice, .ant-notification-notice").length`);
    if (n === 0) return;
    await sleep(250);
  }
};
const closeOverlays = async () => {
  await q(`document.querySelectorAll(".ant-modal-confirm button, .ant-modal-close, .ant-drawer-close").forEach((b) => { if (/huỷ|đóng|close/i.test(b.textContent + b.getAttribute("aria-label")) || b.classList.contains("ant-modal-close") || b.classList.contains("ant-drawer-close")) b.click(); })`);
  await sleep(500);
};

async function login(role) {
  await q(`(localStorage.clear(), sessionStorage.clear(), true)`).catch(() => {});
  await tab.goto("/login");
  await tab.clearStorage();
  await tab.login(role);
  await tab.waitFor(`location.pathname.startsWith("/${role === "manager" ? "manager" : role}")`, 20000, `vào ${role}`);
  await tab.waitFor(`document.querySelector(".ant-layout-sider")`, 15000, `shell ${role}`);
  await sleep(1200);
}

// --- chấm điểm ---------------------------------------------------------------------------------------------------
function judgeError(s, extra = []) {
  const texts = [...s.notices, ...s.alerts];
  const problems = [...extra];
  if (texts.length === 0) problems.push("NO_MSG");
  if (texts.some((t) => RAW.test(t))) problems.push("RAW_TEXT");
  if (texts.length > 1) problems.push("DUP");
  if (!((s.sider || s.scopeScreen) && s.bodyLen > 60)) problems.push("BLANK");
  if (s.spinner || s.loadingCtl) problems.push("HANG");
  return { problems, texts };
}

function record(screen, op, kind, problems, detail = "") {
  const verdict = problems.length === 0 ? "Đạt" : "Lỗi";
  results.push({ screen, op, kind, verdict, problems, detail });
  console.log(`CASE ${screen} | ${op} | ${kind} | ${verdict}${problems.length ? " | " + problems.join(",") : ""}${detail ? " | " + detail.slice(0, 160) : ""}`);
}

const rowsCount = () => q(`document.querySelectorAll(".ant-table-tbody > tr.ant-table-row").length`);
const bodyHas = (re) => q(`${re}.test(document.body.innerText)`);
const noErrorUi = () => q(`![...document.querySelectorAll(".ant-alert-error")].some((e) => e.offsetParent !== null) && ![...document.querySelectorAll(".ant-spin-spinning")].some((e) => e.offsetParent !== null)`);

// --- helper thao tác ---------------------------------------------------------------------------------------------
const clickConfirm = async () => {
  await sleep(500);
  return q(`(() => { const b = document.querySelector(".ant-modal-confirm .ant-btn-primary"); if (!b) return false; b.click(); return true })()`);
};
const switchWrite = (scope, { confirm = true } = {}) => async () => {
  const sel = `${scope} button.ant-switch:not(.ant-switch-disabled)`;
  // Ưu tiên công tắc đang bật (tắt là thao tác có hộp xác nhận); đánh dấu để tìm lại sau khi render lại.
  const before = await q(`(() => { const all = [...document.querySelectorAll(${J(sel)})]; const s = all.find((x) => x.classList.contains("ant-switch-checked")) ?? all[0]; if (!s) return null; s.setAttribute("data-fault-target", "1"); return s.classList.contains("ant-switch-checked"); })()`);
  if (before === null) return { skipped: "không có công tắc để thao tác" };
  await q(`document.querySelector('[data-fault-target="1"]').click()`);
  if (confirm) await clickConfirm();
  await sleep(2200);
  const after = await q(`document.querySelector('[data-fault-target="1"]')?.classList.contains("ant-switch-checked") ?? null`);
  await q(`document.querySelectorAll("[data-fault-target]").forEach((e) => e.removeAttribute("data-fault-target"))`);
  return { before, after, kind: "switch" };
};

// Id một đơn thật của chi nhánh Manager (GET chỉ đọc) cho màn chi tiết đơn.
const DETAIL_ID = await (async () => {
  const [email, password] = accounts("real").manager;
  const base = "http://localhost:3100/api/v1";
  const login = await (await fetch(`${base}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) })).json();
  const list = await (await fetch(`${base}/manager/orders?type=COUNTER_PICKUP&limit=1`, { headers: { Authorization: `Bearer ${login.accessToken}` } })).json();
  return list.items?.[0]?.id ?? "00000000-0000-4000-8000-000000000000";
})();

// Xác nhận chuyển khoản thủ công (7.4, BM-05): BE local chưa có khoản QR thật (chưa có khoá PayOS), nên chi tiết một đơn thật CHỜ THANH TOÁN
// được thêm khoản QR PENDING bằng `tab.readOverride` (đúng dạng BE, chỉ GET, không tới BE) trong lúc ca chạy (setup/teardown).
const CONFIRM_BASE = await (async () => {
  const [email, password] = accounts("real").manager;
  const base = "http://localhost:3100/api/v1";
  const login = await (await fetch(`${base}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) })).json();
  const get = async (path) => (await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${login.accessToken}` } })).json();
  const items = (await get("/manager/orders?type=COUNTER_PICKUP&limit=100")).items ?? [];
  const order = items.find((o) => o.status === "CONFIRMED" && o.paymentStatus === "UNPAID");
  if (!order) return null;
  const detail = await get(`/manager/orders/${order.id}`);
  const qr = {
    id: "7e57ed00-0000-4000-8000-0000000000b1",
    paymentCode: "PAY-FAKE-QR",
    method: "BANK_TRANSFER",
    provider: "PAYOS",
    status: "PENDING",
    amount: detail.totalAmount,
    receivedAmount: null,
    transactionRef: null,
    confirmationReason: null,
    confirmedAt: null,
    paidAt: null,
    createdAt: new Date().toISOString(),
    failureReason: null,
    processedBy: { id: "e-fake", employeeCode: "DEMO-CASHIER-01", firstName: "Lan", lastName: "Thu ngân" },
  };
  return { id: order.id, override: { match: new RegExp(`/api/v1/manager/orders/${order.id}$`), body: JSON.stringify({ ...detail, payments: [qr] }) } };
})();

// --- định nghĩa màn ----------------------------------------------------------------------------------------------
const screens = [
  // Hộp xác nhận chuyển khoản thủ công (BM-05): chỉ ca GHI (500, 403, mất mạng, 401). Ca đọc của chính trang này đã có ở `manager/order-detail`.
  ...(CONFIRM_BASE
    ? [
        {
          id: "manager/confirm-payment",
          writeOnly: true,
          role: "manager",
          route: `/manager/orders/${CONFIRM_BASE.id}`,
          from: "/manager/orders",
          read: new RegExp(`/manager/orders/${CONFIRM_BASE.id}$`),
          setup: async () => {
            tab.readOverride = CONFIRM_BASE.override;
          },
          teardown: async () => {
            tab.readOverride = null;
          },
          loaded: async () => (await q(`!!document.querySelector('[data-testid="order-confirm-open"]')`)) && (await noErrorUi()),
          write: async () => {
            const set = (id, v) =>
              q(`(() => { const el = document.querySelector('[data-testid="${id}"]'); const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
                Object.getOwnPropertyDescriptor(proto, "value").set.call(el, ${J(v)}); el.dispatchEvent(new Event("input", { bubbles: true })); })()`);
            const click = (id) => q(`(() => { const el = document.querySelector('[data-testid="${id}"]'); if (!el || el.disabled) return false; el.click(); return true; })()`);
            if (!(await click("order-confirm-open"))) return { skipped: "không có nút Xác nhận thủ công" };
            await sleep(700);
            await set("confirm-received", "999000");
            await set("confirm-reason", "Khách chìa màn hình chuyển khoản, webhook không về");
            await sleep(250);
            await click("confirm-next");
            await sleep(500);
            if (!(await click("confirm-submit"))) return { skipped: "không sang được bước xem lại" };
            await sleep(2200);
            return {
              ok: true,
              kind: "modal",
              after: await q(`(() => { const b = document.querySelector('[data-testid="confirm-submit"]'); return !!b && !b.disabled && !b.classList.contains("ant-btn-loading"); })()`),
            };
          },
        },
      ]
    : []),
  { id: "admin/overview", role: "admin", route: "/admin/overview", from: "/admin/plans", read: /\/admin\//, loaded: () => bodyHas(`/Doanh nghiệp thuê bao[\\s\\S]{0,40}\\d/`) },
  { id: "admin/tenants", role: "admin", route: "/admin/tenants", from: "/admin/plans", read: /\/admin\/businesses/, loaded: async () => (await rowsCount()) > 0 && (await noErrorUi()),
    write: async () => {
      await q(`document.querySelector(".ant-table-tbody > tr.ant-table-row")?.click()`);
      await sleep(1200);
      const open = await q(`(() => { const b = [...document.querySelectorAll(".ant-drawer-body button")].find((x) => x.textContent.includes("Gia hạn") && !x.disabled); if (!b) return false; b.click(); return true })()`);
      if (!open) return { skipped: "không mở được hộp Gia hạn" };
      await sleep(900);
      const sent = await q(`(() => { const b = [...document.querySelectorAll(".ant-modal button")].find((x) => x.textContent.trim() === "Gia hạn" && !x.disabled); if (!b) return false; b.click(); return true })()`);
      if (!sent) return { skipped: "không bấm được nút gia hạn" };
      await sleep(2200);
      return { ok: true, after: await q(`[...document.querySelectorAll(".ant-modal button")].some((x) => x.textContent.trim() === "Gia hạn" && !x.disabled && !x.classList.contains("ant-btn-loading"))`), kind: "modal" };
    } },
  { id: "admin/signups", role: "admin", route: "/admin/signups", from: "/admin/plans", read: /registration/, loaded: () => noErrorUi(),
    // Từ chối hồ sơ (POST …/reject): mở hồ sơ đầu tiên, nhập lý do, bấm Từ chối. Chỉ nhận lỗi giả, không bao giờ tới BE.
    write: async () => {
      if ((await rowsCount()) === 0) return { skipped: "không có hồ sơ nào trong danh sách (lọc mặc định: chờ duyệt)" };
      await q(`document.querySelector(".ant-table-tbody > tr.ant-table-row")?.click()`);
      await sleep(1500);
      const open = await q(`(() => { const b = [...document.querySelectorAll(".ant-drawer-body button")].find((x) => x.textContent.includes("Từ chối") && !x.disabled); if (!b) return false; b.click(); return true })()`);
      if (!open) return { skipped: "hồ sơ đầu tiên không còn ở trạng thái chờ duyệt (nút Từ chối khoá hoặc không có)" };
      await sleep(900);
      await q(`(() => { const el = document.querySelector(".ant-modal textarea"); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(el, "Giả lập lỗi — hồ sơ không đủ thông tin"); el.dispatchEvent(new Event("input", { bubbles: true })); })()`);
      await sleep(300);
      const sent = await q(`(() => { const b = [...document.querySelectorAll(".ant-modal button")].find((x) => x.textContent.includes("Từ chối hồ sơ") && !x.disabled); if (!b) return false; b.click(); return true })()`);
      if (!sent) return { skipped: "không bấm được nút Từ chối hồ sơ" };
      await sleep(2200);
      return { ok: true, kind: "modal", after: await q(`[...document.querySelectorAll(".ant-modal button")].some((x) => x.textContent.includes("Từ chối hồ sơ") && !x.disabled && !x.classList.contains("ant-btn-loading"))`) };
    } },
  { id: "admin/plans", role: "admin", route: "/admin/plans", from: "/admin/tenants", read: /\/admin\/service-plans/, loaded: async () => (await rowsCount()) > 0 && (await noErrorUi()),
    write: async () => {
      const before = await rowsCount();
      const click = (scope, text) => q(`(() => { const b = [...document.querySelectorAll(${J(scope)})].find((x) => x.textContent.includes(${J(text)}) && !x.disabled); if (!b) return false; b.click(); return true })()`);
      const setIn = (selector, idx, value) => q(`(() => { const el = document.querySelectorAll(${J(".ant-drawer-body " + selector)})[${idx}]; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, ${J(String(value))}); el.dispatchEvent(new Event("input", { bubbles: true })); })()`);
      if (!(await click(".ant-card button", "Thêm gói"))) return { skipped: "không có nút Thêm gói" };
      await sleep(900);
      await setIn('input:not([role="switch"])', 0, "Gói Giả Lập Lỗi");
      await setIn(".ant-input-number-input", 0, 123000);
      await setIn(".ant-input-number-input", 1, 2);
      await setIn(".ant-input-number-input", 2, 10);
      await sleep(300);
      await click(".ant-drawer-body button", "Lưu gói");
      await clickConfirm();
      await sleep(2200);
      return { ok: true, before, after: await rowsCount(), kind: "drawer", saveEnabled: await q(`[...document.querySelectorAll(".ant-drawer-body button")].some((x) => x.textContent.includes("Lưu gói") && !x.disabled && !x.classList.contains("ant-btn-loading"))`) };
    } },
  { id: "owner/reports", ownRetry: true, role: "owner", route: "/owner/reports", from: "/owner/plan", read: /\/reports\//, loaded: () => bodyHas(`/Doanh thu/`) },
  { id: "owner/branches", role: "owner", route: "/owner/branches", from: "/owner/plan", read: /\/branches/, loaded: () => noErrorUi(), storeBased: true,
    // Tạo chi nhánh (POST /restaurant-chains/{id}/branches): điền tối thiểu, chọn tỉnh, bấm Tạo. Chỉ nhận lỗi giả.
    write: async () => {
      const before = await q(`[...document.querySelectorAll("button")].filter((b) => /Sửa/.test(b.textContent)).length`);
      const opened = await q(`(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes("Thêm chi nhánh") && !x.disabled); if (!b) return false; b.click(); return true })()`);
      if (!opened) return { skipped: "nút Thêm chi nhánh khoá (đủ hạn mức gói hoặc hết hạn)" };
      await sleep(900);
      const setPh = (ph, value) => q(`(() => { const el = document.querySelector('.ant-drawer-body input[placeholder=${J(ph)}]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, ${J(value)}); el.dispatchEvent(new Event("input", { bubbles: true })); })()`);
      await setPh("VD: HCM-Q10", "GIA-LAP-LOI");
      await setPh("VD: Chi nhánh Quận 10", "Chi nhánh giả lập lỗi");
      await setPh("VD: 123 Nguyễn Huệ", "1 Đường Thử");
      await q(`document.querySelector(".ant-drawer-body .ant-select-content, .ant-drawer-body .ant-select-selector").dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))`);
      await sleep(400);
      await q(`document.querySelector(".ant-select-item-option")?.click()`);
      await sleep(500);
      const sent = await q(`(() => { const b = [...document.querySelectorAll(".ant-drawer-body button")].find((x) => x.textContent.includes("Tạo chi nhánh") && !x.disabled); if (!b) return false; b.click(); return true })()`);
      if (!sent) return { skipped: "nút Tạo chi nhánh khoá (thiếu ô bắt buộc)" };
      await sleep(2200);
      const after = await q(`[...document.querySelectorAll("button")].filter((b) => /Sửa/.test(b.textContent)).length`);
      return { ok: true, kind: "drawer", before, after, saveEnabled: await q(`[...document.querySelectorAll(".ant-drawer-body button")].some((x) => x.textContent.includes("Tạo chi nhánh") && !x.disabled && !x.classList.contains("ant-btn-loading"))`) };
    } },
  { id: "owner/menu", role: "owner", route: "/owner/menu", from: "/owner/plan", read: /\/menu\/(items|categories)/, loaded: async () => (await rowsCount()) > 0 && (await noErrorUi()), write: switchWrite(".ant-table-tbody > tr.ant-table-row") },
  { id: "owner/menu/categories", role: "owner", route: "/owner/menu/categories", from: "/owner/plan", read: /\/menu\/categories/, loaded: async () => (await rowsCount()) > 0 && (await noErrorUi()), write: switchWrite(".ant-table-tbody > tr.ant-table-row") },
  // 6.4: nhận diện thương hiệu (branding = real). Màn đọc nhận diện từ store (nạp ở bước vào khu vực, như owner/branches); ghi = Lưu đổi tên
  // (PUT /restaurant-chains/{id}/branding). Chỉ nhận lỗi giả, không bao giờ tới BE.
  { id: "owner/branding", role: "owner", route: "/owner/branding", from: "/owner/plan", read: /\/branding$/, storeBased: true,
    loaded: async () => (await q(`!!document.querySelector('[data-testid="branding-save"]')`)) && (await noErrorUi()),
    write: async () => {
      const set = await q(`(() => { const el = document.querySelector('[data-testid="branding-name"]'); if (!el) return false; const input = el.matches("input") ? el : el.querySelector("input"); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, input.value + " X"); input.dispatchEvent(new Event("input", { bubbles: true })); return true })()`);
      if (!set) return { skipped: "không thấy ô tên nhận diện" };
      await sleep(300);
      const clicked = await q(`(() => { const b = document.querySelector('[data-testid="branding-save"]'); if (!b || b.disabled) return false; b.click(); return true })()`);
      if (!clicked) return { skipped: "nút Lưu nhận diện khoá" };
      await sleep(2200);
      return { ok: true, kind: "drawer", saveEnabled: await q(`(() => { const b = document.querySelector('[data-testid="branding-save"]'); return !!b && !b.disabled && !b.classList.contains("ant-btn-loading"); })()`) };
    } },
  // 6.6: Gói của tôi (plan = real). Màn đọc gói từ store (nạp cùng phạm vi bằng GET /restaurant-chains khi vào khu vực, như owner/branding),
  // không có request đọc riêng và không có thao tác ghi; lỗi đọc gói do ca `scope` (màn lỗi nạp khu vực có Thử lại) kiểm.
  { id: "owner/plan", role: "owner", route: "/owner/plan", from: "/owner/reports", read: /\/restaurant-chains$/, storeBased: true,
    loaded: async () => (await q(`!!document.querySelector('[data-testid="myplan-name"]')`)) && (await noErrorUi()) },
  // 6.5: liên kết PayOS (payos = real). Đọc = GET …/payos-channel (màn có khối lỗi riêng kèm Thử lại); ghi = nhập 3 khoá GIẢ rồi Lưu
  // (PUT …/payos-channel). Chỉ nhận lỗi giả, không bao giờ tới BE, khoá giả không phải khoá thật. Thêm ca 503 như BE khi thiếu PAYOS_MASTER_KEY.
  { id: "owner/payos", ownRetry: true, role: "owner", route: "/owner/payos", from: "/owner/plan", read: /\/payos-channel$/,
    loaded: async () => (await q(`!!document.querySelector('[data-testid="payos-save"]')`)) && (await noErrorUi()),
    extraWriteKinds: [
      { kind: "503", body: { statusCode: 503, message: "PAYOS_MASTER_KEY is not configured" }, expect: "Máy chủ chưa sẵn sàng lưu khoá PayOS. Vui lòng liên hệ quản trị hệ thống." },
      // BE `de4f55c`: xác minh với PayOS khi lưu (payos-channel.service.ts:74): 422 PayOS từ chối (câu thô của PayOS), 502 PayOS tạm lỗi, 503 thiếu PAYOS_WEBHOOK_BASE_URL (:67-70). Quyết định 50.
      { kind: "422", body: { statusCode: 422, message: "Invalid webhook url (câu thô của PayOS)", error: "Unprocessable Entity" }, expect: "PayOS không chấp nhận bộ khoá này. Kiểm tra lại Client ID, API key và Checksum key." },
      { kind: "502", body: { statusCode: 502, message: "PayOS is temporarily unavailable", error: "Bad Gateway" }, expect: "Không kết nối được PayOS lúc này. Vui lòng thử lại sau ít phút." },
      { kind: "503", body: { statusCode: 503, message: "PAYOS_WEBHOOK_BASE_URL is not configured" }, expect: "Máy chủ chưa sẵn sàng liên kết PayOS (thiếu địa chỉ nhận thông báo). Vui lòng liên hệ quản trị hệ thống." },
    ],
    write: async () => {
      const setKey = (id, value) => q(`(() => { const el = document.querySelector('[data-testid=${J(id)}]'); if (!el) return false; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, ${J(value)}); el.dispatchEvent(new Event("input", { bubbles: true })); return true })()`);
      if (!(await setKey("payos-clientId", "test-client-id-khong-that"))) return { skipped: "không thấy ô khoá PayOS" };
      await setKey("payos-apiKey", "test-api-key-khong-that");
      await setKey("payos-checksumKey", "test-checksum-key-khong-that");
      await sleep(300);
      const clicked = await q(`(() => { const b = document.querySelector('[data-testid="payos-save"]'); if (!b || b.disabled) return false; b.click(); return true })()`);
      if (!clicked) return { skipped: "nút Lưu PayOS khoá (gói hết hạn)" };
      await sleep(2200);
      return { ok: true, kind: "drawer", saveEnabled: await q(`(() => { const b = document.querySelector('[data-testid="payos-save"]'); return !!b && !b.disabled && !b.classList.contains("ant-btn-loading"); })()`) };
    } },
  // 6.6: thao tác ghi thứ hai của màn PayOS — Gỡ liên kết (DELETE …/payos-channel). Nút chỉ có khi đã liên kết nên bước chuẩn bị tạm tắt lỗi giả,
  // cho PUT nhận trả lời giả thành công (`fulfillWrites`, request KHÔNG tới BE) để UI sang "Đã liên kết", rồi bật lại lỗi giả cho DELETE.
  // Chỉ chạy phần ghi (`writeOnly`); phần đọc đã có ở `owner/payos`.
  { id: "owner/payos (gỡ liên kết)", writeOnly: true, role: "owner", route: "/owner/payos", from: "/owner/plan", read: /\/payos-channel$/,
    loaded: async () => (await q(`!!document.querySelector('[data-testid="payos-save"]')`)) && (await noErrorUi()),
    write: async () => {
      const armed = tab.fault;
      tab.setFault(null);
      tab.fulfillBody = J({ configured: true, id: "00000000-0000-0000-0000-000000000000", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z" });
      tab.fulfillWrites = true;
      const setKey = (id, value) => q(`(() => { const el = document.querySelector('[data-testid=${J(id)}]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, ${J(value)}); el.dispatchEvent(new Event("input", { bubbles: true })); })()`);
      await setKey("payos-clientId", "test-client-id-khong-that");
      await setKey("payos-apiKey", "test-api-key-khong-that");
      await setKey("payos-checksumKey", "test-checksum-key-khong-that");
      await sleep(300);
      await q(`document.querySelector('[data-testid="payos-save"]')?.click()`);
      await sleep(1800);
      tab.fulfillWrites = false;
      tab.fulfillBody = undefined;
      await clearNotices();
      const linked = await q(`document.querySelector('[data-testid="payos-unlink"]') !== null`);
      tab.blockedWrites.length = 0;
      tab.fault = armed ? { ...armed, hits: 0 } : null;
      tab.faultLog = [];
      if (!linked) return { skipped: "không sang được trạng thái Đã liên kết (trả lời giả)" };
      await q(`document.querySelector('[data-testid="payos-unlink"]').click()`);
      await clickConfirm();
      await sleep(2200);
      return { ok: true, kind: "modal", after: undefined };
    } },
  // 6.3: tuỳ chọn món của Owner (options = real). Đọc = GET option-groups; ghi = tắt một tuỳ chọn đang bật (PATCH …/options/{id} {isActive:false}, không hộp xác nhận vì không mặc định).
  { id: "owner/options", role: "owner", route: "/owner/menu/options", from: "/owner/plan", read: /\/menu\/option-groups$/, loaded: async () => (await rowsCount()) > 0 && (await noErrorUi()),
    write: async () => {
      await q(`document.querySelector(".ant-table-row-expand-icon-collapsed")?.click()`);
      await sleep(700);
      // Từ main (7.4b): tắt tuỳ chọn MẶC ĐỊNH có hộp xác nhận (không phát request ngay) → chỉ thao tác trên dòng không mặc định.
      return switchWrite('[data-testid^="group-detail-"] [data-testid="option-row"]:not(:has([data-testid="opt-default"]:checked, [data-testid="opt-default"] input:checked))', { confirm: false })();
    } },
  // 6.3: gắn nhóm tuỳ chọn cho món (MenuTable, drawer) — PUT items/{id}/option-groups; món không đổi nên không có PATCH món. Chỉ nhận lỗi giả.
  { id: "owner/menu (gắn nhóm)", role: "owner", route: "/owner/menu", from: "/owner/plan", read: /\/menu\/(items|categories)/, loaded: async () => (await rowsCount()) > 0 && (await noErrorUi()),
    write: async () => {
      const opened = await q(`(() => { const r = document.querySelector(".ant-table-tbody > tr.ant-table-row"); const b = r && [...r.querySelectorAll("button")].find((x) => x.textContent.includes("Sửa") && !x.disabled); if (!b) return false; b.click(); return true })()`);
      if (!opened) return { skipped: "không có nút Sửa món" };
      await sleep(1200);
      await q(`document.querySelector('[data-testid="item-group-add"] .ant-select-content, [data-testid="item-group-add"] .ant-select-selector')?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))`);
      await sleep(500);
      const picked = await q(`(() => { const o = [...document.querySelectorAll(".ant-select-item-option")].find((e) => !e.classList.contains("ant-select-item-option-disabled")); if (!o) return false; o.click(); return true })()`);
      if (!picked) return { skipped: "món đã gắn đủ nhóm có tuỳ chọn" };
      await sleep(500);
      await q(`document.querySelector('[data-testid="item-save"]')?.click()`);
      await sleep(2200);
      return { ok: true, kind: "drawer", saveEnabled: await q(`(() => { const b = document.querySelector('[data-testid="item-save"]'); return !!b && !b.disabled && !b.classList.contains("ant-btn-loading"); })()`) };
    } },
  { id: "owner/accounts", role: "owner", route: "/owner/accounts", from: "/owner/plan", read: /\/employees/, loaded: async () => (await rowsCount()) > 0 && (await noErrorUi()),
    write: async () => {
      const first = () => q(`document.querySelector(".ant-table-tbody > tr.ant-table-row")?.innerText.replace(/\\s+/g, " ") ?? ""`);
      const before = await first();
      const clicked = await q(`(() => { const r = document.querySelector(".ant-table-tbody > tr.ant-table-row"); const b = r && [...r.querySelectorAll("button")].find((x) => /khoá/i.test(x.textContent) && !x.disabled); if (!b) return false; b.click(); return true })()`);
      if (!clicked) return { skipped: "không có nút Khoá/Mở khoá" };
      await clickConfirm();
      await sleep(2200);
      return { ok: true, before, after: await first(), kind: "row" };
    } },
  { id: "manager/branch-info", ownRetry: true, role: "manager", route: "/manager/branch-info", from: "/manager/dashboard", read: /\/branches\/[0-9a-f-]{36}$/, loaded: () => bodyHas(`/Địa chỉ|Mã chi nhánh|Giờ mở cửa|Chi nhánh/`) },
  { id: "manager/orders", ownRetry: true, role: "manager", route: "/manager/orders", from: "/manager/dashboard", read: /\/manager\/orders(\?|$)/, loaded: async () => (await rowsCount()) > 0 && (await noErrorUi()) },
  // Báo cáo chi nhánh (7.3, BM-03): chính là trang đầu của Manager nên đi từ màn khác tới.
  { id: "manager/reports", ownRetry: true, role: "manager", route: "/manager/dashboard", from: "/manager/branch-info", read: /\/manager\/reports(\?|$)/, loaded: async () => (await q(`!!document.querySelector('[data-testid="report-kpi-revenue"]')`)) && (await noErrorUi()) },
  // Chi tiết đơn (7.2): id một đơn thật của chi nhánh (đọc bằng GET lúc khởi động). Ngoài 500/403/mạng/401 còn ca 404 (`notFound`).
  { id: "manager/order-detail", ownRetry: true, notFound: true, role: "manager", route: `/manager/orders/${DETAIL_ID}`, from: "/manager/orders", read: new RegExp(`/manager/orders/${DETAIL_ID}$`), loaded: async () => (await q(`!!document.querySelector('[data-testid="order-detail"]')`)) && (await noErrorUi()) },
  { id: "manager/menu (tuỳ chọn)", role: "manager", route: "/manager/menu", from: "/manager/dashboard", read: /\/manager\/menu-options/, afterNav: async () => { await q(`[...document.querySelectorAll(".ant-tabs-tab")].find((x) => x.textContent.trim() === "Tuỳ chọn")?.click()`); await sleep(1500); },
    loaded: async () => (await q(`document.querySelectorAll('[data-testid="branch-option-row"]').length`)) > 0 && (await noErrorUi()),
    write: async () => { await q(`[...document.querySelectorAll(".ant-tabs-tab")].find((x) => x.textContent.trim() === "Tuỳ chọn")?.click()`); await sleep(700); return switchWrite('[data-testid="branch-option-row"][data-owner-disabled="false"]')(); } },
  { id: "manager/menu (món)", role: "manager", route: "/manager/menu", from: "/manager/dashboard", read: /\/branches\/[0-9a-f-]{36}\/menu$/, storeBased: true, loaded: async () => (await q(`document.querySelectorAll('[data-testid="branch-menu-row"]').length`)) > 0,
    write: async () => { await q(`[...document.querySelectorAll(".ant-tabs-tab")].find((x) => x.textContent.trim() === "Món")?.click()`); await sleep(500); return switchWrite('[data-testid="branch-menu-row"][data-owner-disabled="false"]')(); } },
  { id: "manager/stations", role: "manager", route: "/manager/stations", from: "/manager/dashboard", read: /\/stations/, loaded: async () => (await noErrorUi()) && (await bodyHas(`/Chưa có quầy nào|Quầy/`)),
    write: async () => {
      const before = await rowsCount();
      const tidOf = (id) => `document.querySelector('[data-testid=${J(id)}]')`;
      const clickT = (id) => q(`(() => { const el = ${tidOf(id)}; if (!el) return false; el.click(); return true })()`);
      const setT = (id, v) => q(`(() => { const el = ${tidOf(id)}; const i = el.matches("input") ? el : el.querySelector("input"); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(i, ${J(v)}); i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
      if (!(await clickT("station-add"))) return { skipped: "không có nút Thêm quầy" };
      await sleep(800);
      await setT("station-name", "Quầy Giả Lập Lỗi");
      await clickT("station-conn-WIFI");
      await sleep(300);
      await setT("station-address", "192.168.1.50:9100");
      await sleep(300);
      await clickT("station-save");
      await sleep(700);
      await clickConfirm();
      await sleep(2200);
      return { ok: true, before, after: await rowsCount(), kind: "drawer", saveEnabled: await q(`!!${tidOf("station-save")} && !${tidOf("station-save")}.disabled && !${tidOf("station-save")}.classList.contains("ant-btn-loading")`) };
    } },
];

// --- ca đọc ------------------------------------------------------------------------------------------------------
/** Số request đọc khớp `spec.read` kể từ mốc `mark`. */
const countReads = (spec, mark) =>
  tab.requests.slice(mark).filter((r) => r.method === "GET" && /\/api\/v1\//.test(r.url) && spec.read.test(new URL(r.url).pathname)).length;

/** Mốc "một lượt nạp bình thường" của màn (không giả lập lỗi), đo một lần cho mỗi màn. Dev bật StrictMode nên mount nào cũng gọi đôi. */
const baselines = new Map();
async function baselineOf(spec) {
  if (baselines.has(spec.id)) return baselines.get(spec.id);
  await spaGo(spec.from);
  await sleep(700);
  const mark = tab.requests.length;
  await spaGo(spec.route);
  await sleep(2300);
  const n = countReads(spec, mark);
  baselines.set(spec.id, n);
  return n;
}

async function readCase(spec, kind) {
  try {
    const base = spec.storeBased ? 0 : await baselineOf(spec);
    await spaGo(spec.from);
    await sleep(900);
    await clearNotices();
    const mark = tab.requests.length;
    tab.setFault(kind === "401" ? { kind: "401", match: spec.read, times: 1 } : { kind, match: spec.read });
    await spaGo(spec.route);
    // KHÔNG chuyển tab trước khi chụp: toast thường (message) chỉ sống ~3 giây, chụp trễ sẽ tưởng là không có thông báo.
    await sleep(2300);
    let s = await snap();
    let hits = tab.faultLog.length;
    // Chập chờn đã gặp ở 7.4b (`manager/stations` ca đầu, ngay sau lượt đăng nhập/đo mốc): màn chưa kịp phát request đọc khi điều hướng
    // trong app. Chưa có request nào khớp thì thử đúng MỘT lần nữa (đi ra rồi vào lại) trước khi kết luận NO_REQUEST.
    if (hits === 0 && !spec.storeBased) {
      await spaGo(spec.from);
      await sleep(900);
      await clearNotices();
      tab.setFault(kind === "401" ? { kind: "401", match: spec.read, times: 1 } : { kind, match: spec.read });
      await spaGo(spec.route);
      await sleep(2300);
      s = await snap();
      hits = tab.faultLog.length;
    }
    tab.setFault(null);
    if (spec.storeBased) {
      record(spec.id, "đọc", kind, [], `màn đọc từ store (nạp ở bước vào khu vực), request đọc không phát sinh khi chuyển màn: ${hits} request bị giả lập; kiểm ở ca 'scope'`);
      return;
    }
    if (hits === 0) return record(spec.id, "đọc", kind, ["NO_REQUEST"], "không có request nào khớp để giả lập");
    if (kind === "401") {
      const refreshed = tab.requests.slice(mark).some((r) => r.method === "POST" && /\/auth\/refresh$/.test(r.url));
      if (spec.afterNav) await spec.afterNav();
      const loaded = await spec.loaded();
      const texts = [...s.notices, ...s.alerts];
      const problems = [];
      if (!refreshed) problems.push("NO_REFRESH");
      if (!loaded) problems.push("NOT_LOADED_AFTER_REFRESH");
      if (texts.length) problems.push("ERROR_SHOWN_AFTER_SUCCESSFUL_REFRESH");
      if (!s.path.startsWith(spec.role === "manager" ? "/manager" : "/" + spec.role)) problems.push("LOGGED_OUT");
      return record(spec.id, "đọc", kind, problems, `refresh=${refreshed} nạp được=${loaded}`);
    }
    const { problems, texts } = judgeError(s);
    // thử lại
    let reloaded;
    // 5.8c: Thử lại có cho lỗi đọc mất mạng và 500; KHÔNG có cho 403 (trừ màn có khối lỗi riêng kèm nút: Reports, BranchInfo).
    const expectRetry = kind === "network" || kind === "500";
    let retryNote = "";
    if (s.retry && !expectRetry && !spec.ownRetry) problems.push("UNEXPECTED_RETRY");
    if (s.retry && (expectRetry || spec.ownRetry)) {
      const mark2 = tab.requests.length;
      await q(`[...document.querySelectorAll("button")].find((b) => /thử lại/i.test(b.textContent) && !b.disabled)?.click()`);
      await sleep(2600);
      // Mỗi lần bấm = đúng một lượt nạp: số request đọc khớp `spec.read` bằng số của một lần nạp bình thường (`baseline`, đã gồm cả
      // lần gọi đôi của StrictMode ở dev). Màn có nút Thử lại riêng (không dựng lại màn) chỉ cần ≥ 1 và không vượt baseline.
      const again = countReads(spec, mark2);
      retryNote = ` request sau 1 lần bấm=${again} (một lần nạp bình thường=${base})`;
      if (spec.ownRetry ? again < 1 || again > base : again !== base) problems.push("RETRY_REQUEST_COUNT");
      if (spec.afterNav) await spec.afterNav();
      reloaded = await spec.loaded();
      if (!reloaded) problems.push("RETRY_NOLOAD");
    } else if (s.retry) {
      reloaded = await spec.loaded();
    } else {
      if (expectRetry) problems.push("NO_RETRY");
      await spaGo(spec.from);
      await sleep(700);
      await spaGo(spec.route);
      if (spec.afterNav) await spec.afterNav();
      await sleep(2300);
      reloaded = await spec.loaded();
      if (!reloaded) problems.push("NO_RECOVERY");
    }
    record(spec.id, "đọc", kind, problems, `"${texts.join(" || ")}" retry=${s.retry} nạp lại=${reloaded}${retryNote}`);
  } catch (e) {
    tab.setFault(null);
    record(spec.id, "đọc", kind, ["SCRIPT"], e.message);
  } finally {
    tab.setFault(null);
    await clearNotices();
    await closeOverlays();
  }
}

/** Ca 404 của màn chi tiết: khối "Không tìm thấy đơn" (không phải lỗi), không toast, không tiếng Anh thô, không nút Thử lại; hết giả lập thì nạp lại được. */
async function notFoundCase(spec) {
  try {
    await spaGo(spec.from);
    await sleep(900);
    await clearNotices();
    tab.setFault({ kind: "404", match: spec.read });
    await spaGo(spec.route);
    await sleep(2300);
    const s = await snap();
    const hits = tab.faultLog.length;
    const block = await q(`document.querySelector('[data-testid="order-detail-notfound"]')?.innerText.replace(/\\s+/g, " ").trim() ?? ""`);
    tab.setFault(null);
    const problems = [];
    if (hits === 0) problems.push("NO_REQUEST");
    if (!/Không tìm thấy đơn/.test(block)) problems.push("NO_NOTFOUND_BLOCK");
    if (RAW.test(block) || RAW.test(s.notices.join(" "))) problems.push("RAW_TEXT");
    if (s.notices.length) problems.push("TOAST");
    if (s.retry) problems.push("UNEXPECTED_RETRY");
    if (!(s.sider && s.bodyLen > 60)) problems.push("BLANK");
    await spaGo(spec.from);
    await sleep(700);
    await spaGo(spec.route);
    await sleep(2300);
    if (!(await spec.loaded())) problems.push("NO_RECOVERY");
    record(spec.id, "đọc", "404", problems, `"${block}" retry=${s.retry} toast=${s.notices.length}`);
  } catch (e) {
    tab.setFault(null);
    record(spec.id, "đọc", "404", ["SCRIPT"], e.message);
  } finally {
    tab.setFault(null);
    await clearNotices();
  }
}

// --- ca ghi ------------------------------------------------------------------------------------------------------
async function writeCase(spec, kind, extra) {
  try {
    await spaGo(spec.from);
    await sleep(700);
    // `setup`/`teardown`: màn cần dữ liệu đọc giả (readOverride) CHỈ trong lúc ca ghi chạy (ví dụ hộp xác nhận chuyển khoản, 7.4).
    if (spec.setup) await spec.setup();
    await spaGo(spec.route);
    if (spec.afterNav) await spec.afterNav();
    await sleep(2200);
    if (!(await spec.loaded())) return record(spec.id, "ghi", kind, ["PRECONDITION"], "màn không nạp được trước khi giả lập");
    await clearNotices();
    tab.blockedWrites.length = 0;
    tab.caseName = `${spec.id}|${kind}`;
    tab.setFault(kind === "401" ? { kind: "401", match: /^$/, times: 1 } : { kind, match: /^$/, ...(extra?.body && { body: extra.body }) });
    const out = await spec.write();
    const s = await snap();
    const attempted = tab.blockedWrites.length;
    const log = tab.faultLog.length;
    tab.setFault(null);
    if (out.skipped) return record(spec.id, "ghi", kind, [], `N/A: ${out.skipped}`);
    if (attempted === 0) return record(spec.id, "ghi", kind, ["NO_WRITE_ATTEMPT"], "thao tác không phát sinh request ghi");
    if (kind === "401") {
      // 401 ghi: lỗi giả ở lượt đầu → refresh thật → gọi lại → lượt gọi lại bị chặn (BlockedByClient) nên đáng ra thấy 2 request ghi
      const problems = [];
      if (attempted < 2) problems.push("NO_RETRY_AFTER_REFRESH");
      const { problems: p2, texts } = judgeError(s);
      problems.push(...p2.filter((x) => x !== "NO_MSG"));
      if (texts.length === 0) problems.push("NO_MSG");
      return record(spec.id, "ghi", kind, problems, `ghi bị chặn: ${attempted} "${texts.join(" || ")}"`);
    }
    const { problems, texts } = judgeError(s);
    // 5.8c: lỗi GHI không có nút Thử lại (người dùng tự bấm lại thao tác)
    if (s.retry) problems.push("WRITE_HAS_RETRY");
    // Ca có câu mong đợi riêng (ví dụ 503 thiếu PAYOS_MASTER_KEY): thông báo phải đúng câu tiếng Việt, không lộ câu thô của BE.
    if (extra?.expect && !texts.some((t) => t.includes(extra.expect))) problems.push("WRONG_TEXT");
    // khôi phục trạng thái
    if (typeof out.before === "number" && typeof out.after === "number" && out.before !== out.after) problems.push("NOT_RESTORED");
    if (typeof out.before === "string" && out.before !== out.after) problems.push("NOT_RESTORED");
    if (typeof out.before === "boolean" && out.before !== out.after) problems.push("NOT_RESTORED");
    if (out.kind === "modal" && out.after === false) problems.push("STUCK_SAVING");
    if ((out.kind === "drawer") && out.saveEnabled === false) problems.push("STUCK_SAVING");
    record(spec.id, "ghi", kind, problems, `ghi bị chặn: ${attempted}/${log} "${texts.join(" || ")}"`);
  } catch (e) {
    tab.setFault(null);
    record(spec.id, "ghi", kind, ["SCRIPT"], e.message);
  } finally {
    tab.setFault(null);
    if (spec.teardown) await spec.teardown();
    await clearNotices();
    await closeOverlays();
    await closeOverlays();
  }
}

// --- ca đọc gói của Manager (6.11, #38, quyết định 53) -----------------------------------------------------------
// Manager đọc gói bằng GET /restaurant-chains/:id/subscription khi nạp khu vực. Lỗi đọc KHÔNG được chặn khu vực và KHÔNG có toast (khác các ca đọc
// thường, nên không dùng `readCase`/`judgeError`): màn Nhân viên ghi "Chưa tải được hạn mức gói" kèm nút Thử lại nhỏ, nút Thêm vẫn bấm được.
// Riêng 401: refresh thật chạy rồi gọi lại nên phải có số ngay, không lỗi.
async function managerPlanCase(kind) {
  const id = "manager/subscription (gói)";
  try {
    await clearNotices();
    tab.setFault(kind === "401" ? { kind: "401", match: /\/subscription$/, times: 1 } : { kind, match: /\/subscription$/ });
    await tab.goto("/manager/staff");
    await tab.waitFor(`document.querySelector('[data-testid="staff-quota"]')`, 25000, "màn Nhân viên");
    await sleep(2200);
    const view = await q(`(() => {
      const t = (id) => document.querySelector('[data-testid="' + id + '"]');
      return {
        sider: !!document.querySelector(".ant-layout-sider"),
        line: t("staff-quota")?.innerText ?? "",
        retry: !!t("staff-quota-retry"),
        addDisabled: t("staff-add")?.disabled ?? null,
        notices: [...document.querySelectorAll(".ant-message-notice, .ant-notification-notice")].map((e) => e.innerText.replace(/\\s+/g, " ").trim()),
        alerts: [...document.querySelectorAll(".ant-alert-error")].length,
        path: location.pathname,
      };
    })()`);
    const hits = tab.faultLog.length;
    tab.setFault(null);
    const problems = [];
    if (hits === 0) problems.push("NO_REQUEST");
    if (!view.sider || !view.path.startsWith("/manager")) problems.push("AREA_BLOCKED");
    if (view.notices.length > 0 || view.alerts > 0) problems.push("UNEXPECTED_MESSAGE");
    if (view.notices.some((t) => RAW.test(t))) problems.push("RAW_TEXT");
    if (view.addDisabled !== false) problems.push("ADD_LOCKED");
    let detail = `hits=${hits} dòng="${view.line.replace(/\s+/g, " ").slice(0, 60)}" retry=${view.retry}`;
    if (kind === "401") {
      if (!/Đã dùng \d+\/\d+ tài khoản của gói/.test(view.line)) problems.push("NO_NUMBERS_AFTER_REFRESH");
      if (view.retry) problems.push("ERROR_SHOWN_AFTER_SUCCESSFUL_REFRESH");
    } else {
      if (!/Chưa tải được hạn mức gói/.test(view.line) || !view.retry) problems.push("NO_UNAVAILABLE_LINE");
      await q(`document.querySelector('[data-testid="staff-quota-retry"]')?.click()`);
      await sleep(1800);
      const after = await q(`document.querySelector('[data-testid="staff-quota"]')?.innerText ?? ""`);
      if (!/Đã dùng \d+\/\d+ tài khoản của gói/.test(after) || /Chưa tải được/.test(after)) problems.push("RETRY_NOLOAD");
      detail += ` sau Thử lại="${after.replace(/\s+/g, " ").slice(0, 40)}"`;
    }
    record(id, "đọc", kind, problems, detail);
  } catch (e) {
    tab.setFault(null);
    record(id, "đọc", kind, ["SCRIPT"], e.message);
  } finally {
    tab.setFault(null);
    await clearNotices();
  }
}

// --- ca scope (nạp khu vực sau khi F5) ---------------------------------------------------------------------------
async function scopeCase(role, route, kind) {
  const id = `${role} (nạp khu vực sau F5)`;
  try {
    await clearNotices();
    tab.setFault(kind === "401" ? { kind: "401", match: /\/(restaurant-chains|branches|auth\/me)/, times: 1 } : { kind, match: /\/(restaurant-chains|branches|auth\/me)/ });
    await tab.goto(route);
    await sleep(3500);
    const s = await snap();
    const hits = tab.faultLog.length;
    tab.setFault(null);
    if (kind === "401") {
      const ok = s.sider && s.path.startsWith("/" + role) && s.notices.length + s.alerts.length === 0;
      return record(id, "scope", kind, ok ? [] : ["NOT_RECOVERED"], `hits=${hits} path=${s.path}`);
    }
    // Admin không nạp phạm vi chuỗi/chi nhánh khi F5 (phiên khôi phục bằng refresh, không gọi /auth/me, /restaurant-chains, /branches):
    // không có request để giả lập thì ca này không áp dụng (N/A), không phải lỗi.
    if (hits === 0) return record(id, "scope", kind, [], `N/A: vai ${role} không gọi API nạp khu vực khi F5 (path=${s.path})`);
    const { problems, texts } = judgeError(s);
    let recovered = false;
    if (s.retry) {
      const m = tab.requests.length;
      await q(`[...document.querySelectorAll("button")].find((b) => /thử lại/i.test(b.textContent) && !b.disabled)?.click()`);
      await sleep(3000);
      // Thử lại của màn lỗi khu vực chỉ chạy một lượt nạp (không có lượt thứ hai từ nút Thử lại toàn cục).
      const chains = tab.requests.slice(m).filter((r) => r.method === "GET" && /\/api\/v1\/restaurant-chains$/.test(new URL(r.url).pathname)).length;
      if (role !== "manager" && chains !== 1) problems.push("RETRY_RAN_TWICE");
      recovered = await q(`!!document.querySelector(".ant-layout-sider") && ![...document.querySelectorAll(".ant-alert-error")].some((e) => e.offsetParent !== null)`);
      if (!recovered) problems.push("RETRY_NOLOAD");
    } else {
      problems.push("NO_RETRY");
      await tab.goto(route);
      await sleep(3000);
      recovered = await q(`!!document.querySelector(".ant-layout-sider")`);
      if (!recovered) problems.push("NO_RECOVERY");
    }
    // BLANK ở ca scope: khung sider có thể chưa dựng khi scope lỗi, nên chỉ báo nếu cả trang gần như trống
    const idx = problems.indexOf("BLANK");
    if (idx >= 0 && s.bodyLen > 150) problems.splice(idx, 1);
    record(id, "scope", kind, problems, `"${texts.join(" || ")}" retry=${s.retry} khôi phục=${recovered} path=${s.path}`);
  } catch (e) {
    tab.setFault(null);
    record(id, "scope", kind, ["SCRIPT"], e.message);
  } finally {
    tab.setFault(null);
    await clearNotices();
  }
}

// --- ca 401 hết phiên (refresh cũng lỗi) -------------------------------------------------------------------------
async function expiredSession(role, spec) {
  const id = `${role}: ${spec.id}`;
  try {
    await spaGo(spec.from);
    await sleep(800);
    await clearNotices();
    const mark = tab.requests.length;
    tab.setFault({ kind: "401", match: spec.read, refresh: "fail" });
    await spaGo(spec.route);
    if (spec.afterNav) await spec.afterNav();
    await sleep(4500);
    const s = await snap();
    const hitsAfter = tab.faultLog.length;
    await sleep(3000);
    const hitsLater = tab.faultLog.length; // không tăng nữa = không lặp vô hạn
    const refreshCalls = tab.requests.slice(mark).filter((r) => r.method === "POST" && /\/auth\/refresh$/.test(r.url)).length;
    tab.setFault(null);
    const problems = [];
    if (!s.path.startsWith("/login")) problems.push("NOT_REDIRECTED_TO_LOGIN");
    if (hitsLater !== hitsAfter) problems.push("LOOP");
    if (refreshCalls > 2) problems.push("REFRESH_REPEATED");
    const texts = [...s.notices, ...s.alerts];
    if (texts.some((t) => RAW.test(t))) problems.push("RAW_TEXT");
    record(id, "401 hết phiên", "401+refresh lỗi", problems, `path=${s.path} yêu cầu giả lập=${hitsLater} refresh=${refreshCalls} thông báo="${texts.join(" || ")}"`);
  } catch (e) {
    tab.setFault(null);
    record(id, "401 hết phiên", "401+refresh lỗi", ["SCRIPT"], e.message);
  } finally {
    tab.setFault(null);
  }
}

// --- chạy --------------------------------------------------------------------------------------------------------
const KINDS = ["500", "403", "network", "401"];
const ROLES = ["admin", "owner", "manager"];
const GROUPS = ["read", "write", "scope", "expired"];
const screenTokens = TOKENS.filter((t) => !ROLES.includes(t) && !GROUPS.includes(t));
const roleTokens = TOKENS.filter((t) => ROLES.includes(t));
const groupTokens = TOKENS.filter((t) => GROUPS.includes(t));
const inGroup = (g) => groupTokens.length === 0 || groupTokens.includes(g);
const matchesScreen = (s) => screenTokens.length === 0 || screenTokens.some((t) => s.id.includes(t));
try {
  for (const role of ROLES) {
    const mine = screens.filter((s) => s.role === role && matchesScreen(s));
    const wantsPlanRead = role === "manager" && screenTokens.some((t) => "manager/subscription".includes(t));
    if (roleTokens.length ? !roleTokens.includes(role) : mine.length === 0 && !wantsPlanRead) continue;
    await login(role);
    const landing = role === "admin" ? "/admin/overview" : role === "owner" ? "/owner/reports" : "/manager/dashboard";
    if (inGroup("read")) {
      for (const spec of mine.filter((s) => !s.writeOnly)) {
        for (const kind of KINDS) await readCase(spec, kind);
        if (spec.notFound) await notFoundCase(spec);
      }
    }
    // 6.11: đọc gói của Manager (không chặn khu vực, không toast). Chạy khi không lọc theo màn hoặc khi gọi tên "manager/subscription".
    if (role === "manager" && inGroup("read") && (screenTokens.length === 0 || screenTokens.some((t) => "manager/subscription".includes(t)))) {
      for (const kind of KINDS) await managerPlanCase(kind);
    }
    if (inGroup("write")) {
      for (const spec of mine.filter((s) => s.write)) {
        for (const kind of KINDS) await writeCase(spec, kind);
        for (const extra of spec.extraWriteKinds ?? []) await writeCase(spec, extra.kind, extra);
      }
    }
    // ca "scope" và "expired" là của cả khu vực, không theo màn: chỉ chạy khi không lọc theo màn (hoặc khi chọn nhóm đó rõ ràng)
    if (inGroup("scope") && (screenTokens.length === 0 || groupTokens.includes("scope"))) for (const kind of KINDS) await scopeCase(role, landing, kind);
    if (inGroup("expired") && (screenTokens.length === 0 || groupTokens.includes("expired"))) {
      // hết phiên: đăng nhập mới cho sạch trạng thái, và sau ca này phải đăng nhập lại
      await login(role);
      await expiredSession(role, mine.find((s) => !s.storeBased) ?? screens.find((s) => s.role === role && !s.storeBased));
    }
  }
} catch (e) {
  scriptError = e;
  console.log("ERROR", e.stack ?? e.message);
}
const writes = tab.blockedWrites.length;
console.log("FAULTS-RESULT " + J(results));
const bad = results.filter((r) => r.verdict === "Lỗi").length;
console.log(`[faults] ${results.length - bad}/${results.length} ca Đạt, ${bad} ca Lỗi; request ghi ghi nhận lần chạy cuối: ${writes}`);
// Danh sách ca trượt (không chỉ dòng tổng) để biết ca nào, bước nào mà không phải lục lại log.
if (bad > 0) {
  console.log("[faults] CÁC CA TRƯỢT:");
  for (const r of results.filter((x) => x.verdict === "Lỗi")) console.log(`   ✗ ${r.screen} | ${r.op} | ${r.kind} | ${r.problems.join(",")}${r.detail ? " | " + r.detail.slice(0, 200) : ""}`);
}
if (scriptError) console.log(`[faults] SCRIPT BỊ NGẮT GIỮA CHỪNG sau ${results.length} ca (chưa chạy hết): ${(scriptError.message ?? String(scriptError)).slice(0, 200)}`);
await closeTab(tab);
process.exit(0);
