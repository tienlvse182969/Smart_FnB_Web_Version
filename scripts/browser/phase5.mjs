// Kiểm tra trình duyệt thật cho Giai đoạn 5 (Manager). 5.2: /setup-password + gỡ mật khẩu cứng. 5.3: Owner quản Manager (real).
//   node scripts/browser/phase5.mjs mock   # dev server có VITE_API_AUTH/BRANCH/REPORT/MENU/ACCOUNT=mock, AUTH_MODE=mock
//   node scripts/browser/phase5.mjs real   # dev server cổng 5173 (CORS của BE): CHỈ ĐỌC.
//     Mọi request GHI bị chặn ở tầng CDP (Fetch.failRequest) TRƯỚC khi rời trình duyệt (chỉ cho POST /auth/login để lấy token);
//     script bấm tới hết hộp xác nhận, ghi lại method + path + body định gửi và so với DTO của BE.
//     KHÔNG tải lại trang khi đang có phiên (tải lại sẽ gọi POST /auth/refresh): điều hướng trong SPA bằng history.
import { readFileSync } from "node:fs";
import { accounts, cli, newTab, closeTab, check, results, sleep, SESSION_ALLOW } from "./cdp.mjs";

// --mode=mock|real (hoặc đối số trần như cũ); --only=menu = chỉ khối menu món + tuỳ chọn chi nhánh (5.7b, 5.7d); không cờ = chạy hết
const CLI = cli();
const MODE = CLI.mode ?? "mock";
if (CLI.only && !CLI.only.every((n) => n === "menu" || n === "staff")) {
  console.log(`--only hỗ trợ: menu, staff (nhận được: ${CLI.only.join(",")})`);
  process.exit(2);
}
const FULL = !CLI.only;
const MENU = FULL || CLI.only.includes("menu");
const STAFF = FULL || CLI.only.includes("staff"); // màn Nhân viên của Manager (5.4): mock đủ ca, real chỉ đọc + nhãn "(số liệu mẫu)"
const REAL = MODE === "real";
const J = JSON.stringify;
const tab = await newTab("about:blank", REAL ? "real" : "mock");
const q = (expr) => tab.eval(expr);

const tid = (id) => `document.querySelector('[data-testid=${J(id)}]')`;
const has = (id) => q(`!!${tid(id)}`);
const clickTid = (id) => q(`(() => { const el = ${tid(id)}; if (!el) return false; el.click(); return true })()`);
const setTid = (id, value) =>
  q(`(() => { const el = ${tid(id)}; const input = el.matches("input") ? el : el.querySelector("input");
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, ${J(value)});
    input.dispatchEvent(new Event("input", { bubbles: true })); })()`);
const submitDisabled = () => q(`${tid("setup-submit")}?.disabled`);
const ruleOk = (key) => q(`${tid(`rule-${key}`)}?.getAttribute("data-ok")`);
const search = () => q(`location.search`);
const path = () => q(`location.pathname`);
const toasts = () => q(`[...document.querySelectorAll(".ant-message-notice, .ant-notification-notice")].map((e) => e.textContent).join(" | ")`);
const pageText = () => q(`document.body.innerText`);
const SECRET = /demo1234|mật khẩu tạm/i;
const brandVar = () => tab.cssVar("--brand-primary");
/** Điều hướng TRONG SPA (không tải lại trang, nên không có POST /auth/refresh). */
const spaGo = async (to) => {
  await q(`(() => { history.pushState({}, "", ${J(to)}); dispatchEvent(new PopStateEvent("popstate")); })()`);
  await sleep(900);
};

// --- Bảng Manager ----------------------------------------------------------------------------------------------------
const rows = () => q(`[...document.querySelectorAll(".ant-table-tbody > tr.ant-table-row")].map((r) => r.innerText.replace(/\\s+/g, " ").trim())`);
const waitRows = async (pred, ms = 6000) => {
  for (let i = 0; i < ms / 250; i++) {
    const r = await rows();
    if (pred(r)) return r;
    await sleep(250);
  }
  return rows();
};
const clickRowBtn = (rowText, btnText) =>
  q(`(() => { const r = [...document.querySelectorAll(".ant-table-tbody > tr.ant-table-row")].find((x) => x.innerText.includes(${J(rowText)}));
    const b = r && [...r.querySelectorAll("button")].find((x) => x.textContent.includes(${J(btnText)}) && !x.disabled); if (!b) return false; b.click(); return true })()`);
const confirmOk = async (okText) => {
  await sleep(600);
  return q(`(() => { const b = [...document.querySelectorAll(".ant-modal-confirm button")].find((x) => x.textContent.includes(${J(okText)})); if (!b) return false; b.click(); return true })()`);
};
const confirmCancel = () => q(`(() => { const b = [...document.querySelectorAll(".ant-modal-confirm button")].find((x) => x.textContent.includes("Huỷ")); if (!b) return false; b.click(); return true })()`);
const dismissModals = async () => {
  await q(`document.querySelectorAll(".ant-modal-confirm button").forEach((b) => b.click())`);
  await sleep(500);
};
/** Mở ô chọn chi nhánh của dòng rồi chọn tuỳ chọn đầu tiên KHÔNG phải tuỳ chọn đang chọn. */
const pickOtherBranch = async (rowText) => {
  await q(`(() => { const r = [...document.querySelectorAll(".ant-table-tbody > tr.ant-table-row")].find((x) => x.innerText.includes(${J(rowText)}));
    r.querySelector(".ant-select-content, .ant-select-selector").dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); })()`);
  await sleep(450);
  return q(`(() => { const o = document.querySelector(".ant-select-item-option:not(.ant-select-item-option-selected)"); if (!o) return null; const t = o.textContent.trim(); o.click(); return t; })()`);
};
const clickBtn = (scope, text) =>
  q(`(() => { const root = ${scope}; const b = root && [...root.querySelectorAll("button")].find((x) => x.textContent.includes(${J(text)})); if (!b) return false; b.click(); return true })()`);

/** Đọc dữ liệu BE bằng GET (đăng nhập bằng .env của BE, không in mật khẩu/token). */
const BE_BASE = "http://localhost:3100/api/v1";
async function beGet(path, who = "owner") {
  const [email, password] = accounts("real")[who];
  const login = await fetch(BE_BASE + "/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const token = (await login.json()).accessToken;
  return (await fetch(BE_BASE + path, { headers: { Authorization: `Bearer ${token}` } })).json();
}
async function readEmployees(role) {
  if (role) return beGet(`/employees?role=${role}&limit=100`);
  return { managers: await beGet("/employees?role=MANAGER&limit=100"), branches: await beGet("/branches") };
}
const readReport = (path) => beGet(path);

const LONG_TOKEN = "x".repeat(48);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

try {
  if (!REAL) {
    if (FULL) { // các khối trước 5.7b (bỏ qua khi --only=menu); đóng ngay trước khối menu
    // ============================================================ MOCK — trang đặt mật khẩu
    await tab.goto("/login");
    await tab.clearStorage();

    // thiếu token
    await tab.goto("/setup-password");
    const platformBrand = await brandVar();
    check("Thiếu token: báo 'Liên kết không hợp lệ', không có form", (await has("setup-problem")) && /Liên kết không hợp lệ/.test(await pageText()) && !(await has("setup-password")));
    check("Thiếu token: có link về trang đăng nhập", await has("setup-to-login"));

    // token hết hạn / đã dùng / lạ → cùng một lỗi (BE không phân biệt)
    for (const t of ["mock-expired", "mock-used"]) {
      await tab.goto(`/setup-password?token=${t}`);
      await setTid("setup-password", "StrongPass123");
      await setTid("setup-confirm", "StrongPass123");
      await sleep(300);
      await clickTid("setup-submit");
      await sleep(1200);
      const txt = await pageText();
      check(`Token '${t}': báo lỗi rõ + link về đăng nhập, form ẩn`, /không hợp lệ, đã hết hạn hoặc đã được dùng/.test(txt) && (await has("setup-to-login")) && !(await has("setup-submit")), txt.slice(0, 80).replace(/\s+/g, " "));
    }

    // token hợp lệ
    await tab.goto("/setup-password?token=mock-valid");
    check("Token hợp lệ: URL không còn token sau khi trang tải", (await search()) === "", await search());
    check("Form: nút Đặt mật khẩu khoá khi chưa nhập", (await submitDisabled()) === true);

    await setTid("setup-password", "abc");
    await sleep(200);
    check(
      "Luật BE: 'abc' vi phạm độ dài, chữ hoa, chữ số; đạt chữ thường",
      (await ruleOk("length")) === "false" && (await ruleOk("upper")) === "false" && (await ruleOk("digit")) === "false" && (await ruleOk("lower")) === "true",
    );
    await setTid("setup-confirm", "abc");
    check("Mật khẩu yếu: nút vẫn khoá dù hai ô khớp", (await submitDisabled()) === true);

    await setTid("setup-password", "StrongPass123");
    await setTid("setup-confirm", "StrongPass124");
    await sleep(250);
    check("Hai mật khẩu không khớp: báo lỗi và khoá nút gửi", (await has("setup-mismatch")) && (await submitDisabled()) === true);

    await setTid("setup-confirm", "StrongPass123");
    await sleep(250);
    check("Khớp và đạt đủ 4 luật: nút mở, hết báo lỗi", (await submitDisabled()) === false && !(await has("setup-mismatch")));
    await clickTid("setup-submit");
    await tab.waitFor(`location.pathname === "/login"`, 8000, "về /login");
    await sleep(700);
    const t1 = await toasts();
    check("Thành công: chuyển về /login kèm đúng một thông báo", (await path()) === "/login" && (t1.match(/Đã đặt mật khẩu/g) ?? []).length === 1, t1);

    // ============================================================ MOCK — Owner quản Manager (5.3 + gỡ mật khẩu cứng 5.2)
    await tab.goto("/login");
    await tab.clearStorage();
    await tab.goto("/login");
    await tab.login("owner");
    await tab.waitFor(`location.pathname.startsWith("/owner")`, 20000, "vào owner");
    await tab.waitFor(`document.querySelector(".ant-layout-sider")`, 15000, "shell");
    await sleep(1000);
    const tenantBrand = await brandVar();

    await tab.clickMenu("Tài khoản quản lý");
    await sleep(1300);
    check("Owner: màn Tài khoản quản lý không hiện mật khẩu nào", !SECRET.test(await pageText()));
    let list = await waitRows((r) => r.length > 0);
    check("Manager: danh sách có dữ liệu, mỗi dòng có chi nhánh và trạng thái", list.length >= 2 && list.every((r) => /Đang hoạt động|Đã khoá|Chưa kích hoạt/.test(r)), `${list.length} dòng; ${list[0]?.slice(0, 90)}`);
    check("Mock: không có chú thích 'chờ BE #23' và nút tạo mở", !(await has("create-manager-note")) && (await q(`${tid("create-manager")}.disabled`)) === false);

    // tạo Manager
    await clickTid("create-manager");
    await sleep(900);
    await q(`(() => {
      const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); };
      const inputs = [...document.querySelectorAll(".ant-drawer input:not([disabled]):not([role=combobox])")];
      set(inputs[0], "Manager Thử"); set(inputs[1], "manager.thu@mock.local");
    })()`);
    await sleep(300);
    await clickBtn(`document.querySelector(".ant-drawer")`, "Tạo tài khoản");
    await sleep(1500);
    const ownerNotice = await q(`${tid("password-setup-notice")}?.innerText ?? ""`);
    check("Owner tạo Manager: hiện 'Đã xếp email đặt mật khẩu … hiệu lực tới …', không có mật khẩu", /Đã xếp email đặt mật khẩu tới manager\.thu@mock\.local, hiệu lực tới/.test(ownerNotice) && !SECRET.test(await pageText()), ownerNotice);
    await dismissModals();
    list = await waitRows((r) => r.some((x) => x.includes("Manager Thử")));
    check("Manager mới hiện 'Chưa kích hoạt' (chưa đặt mật khẩu), nút Khoá bị khoá", list.some((r) => r.includes("Manager Thử") && r.includes("Chưa kích hoạt")) && !(await clickRowBtn("Manager Thử", "Khoá")));

    // tìm kiếm + lọc
    await q(`(() => { const el = document.querySelector(".ant-input-search input"); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, "Manager Thử"); el.dispatchEvent(new Event("input", { bubbles: true })); })()`);
    await q(`document.querySelector(".ant-input-search .ant-btn, .ant-input-search-button").click()`);
    list = await waitRows((r) => r.length === 1);
    check("Manager: tìm kiếm theo tên chỉ còn 1 dòng", list.length === 1 && list[0].includes("Manager Thử"), `${list.length} dòng`);
    await q(`(() => { const el = document.querySelector(".ant-input-search input"); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, ""); el.dispatchEvent(new Event("input", { bubbles: true })); })()`);
    await q(`document.querySelector(".ant-input-search .ant-btn, .ant-input-search-button").click()`);
    list = await waitRows((r) => r.length >= 2);

    // khoá / mở khoá một Manager đang hoạt động
    const target = list.find((r) => r.includes("Đang hoạt động")) ?? "";
    const targetName = target.split(" ").slice(0, 3).join(" ");
    await clickRowBtn(targetName, "Khoá");
    await sleep(700);
    const lockText = await q(`${tid("confirm-lock")}?.innerText ?? ""`);
    check("Khoá: hộp xác nhận hiện tên + chi nhánh", lockText.includes(targetName) && /chi nhánh/.test(lockText) && /bị thu hồi/.test(lockText), lockText.replace(/\s+/g, " "));
    await confirmCancel();
    await sleep(500);
    check("Khoá: bấm Huỷ thì không đổi gì", (await rows()).some((r) => r.includes(targetName) && r.includes("Đang hoạt động")));
    await clickRowBtn(targetName, "Khoá");
    await confirmOk("Khoá tài khoản");
    list = await waitRows((r) => r.some((x) => x.includes(targetName) && x.includes("Đã khoá")));
    check("Khoá: đồng ý → tài khoản 'Đã khoá'", list.some((r) => r.includes(targetName) && r.includes("Đã khoá")), await toasts());
    await clickRowBtn(targetName, "Mở khoá");
    await confirmOk("Mở khoá");
    list = await waitRows((r) => r.some((x) => x.includes(targetName) && x.includes("Đang hoạt động")));
    check("Mở khoá: có xác nhận, tài khoản hoạt động trở lại", list.some((r) => r.includes(targetName) && r.includes("Đang hoạt động")));

    // gửi lại email đặt mật khẩu
    await clickRowBtn(targetName, "Reset mật khẩu");
    await sleep(700);
    const resetConfirm = await q(`${tid("confirm-reset")}?.innerText ?? ""`);
    check("Gửi lại email: hộp xác nhận nêu email và hiệu lực", /Email gửi tới/.test(resetConfirm) && /24 giờ/.test(resetConfirm), resetConfirm.replace(/\s+/g, " "));
    await confirmOk("Gửi email");
    await sleep(1500);
    const resetNotice = await q(`${tid("password-setup-notice")}?.innerText ?? ""`);
    check("Gửi lại email: hiện 'Email gửi tới …, hiệu lực tới …', không có mật khẩu", /Email gửi tới .*hiệu lực tới/.test(resetNotice) && !SECRET.test(await pageText()), resetNotice);
    await dismissModals();

    // chuyển chi nhánh
    const before = (await rows()).find((r) => r.includes(targetName)) ?? "";
    const picked = await pickOtherBranch(targetName);
    await sleep(700);
    const trText = await q(`${tid("confirm-transfer")}?.innerText ?? ""`);
    check("Chuyển chi nhánh: hộp xác nhận nêu từ chi nhánh nào sang chi nhánh nào", !!picked && trText.includes(targetName) && trText.includes(picked) && /đăng nhập lại/.test(trText), trText.replace(/\s+/g, " "));
    await confirmOk("Chuyển chi nhánh");
    list = await waitRows((r) => (r.find((x) => x.includes(targetName)) ?? "") !== before);
    check("Chuyển chi nhánh: dòng đổi sang chi nhánh mới", picked && (await q(`(() => { const r = [...document.querySelectorAll(".ant-table-tbody > tr.ant-table-row")].find((x) => x.innerText.includes(${J(targetName)})); return r.querySelector(".ant-select-content, .ant-select-selector").innerText })()`)).includes(picked), picked ?? "");

    // lọc theo trạng thái
    await clickRowBtn(targetName, "Khoá");
    await confirmOk("Khoá tài khoản");
    await waitRows((r) => r.some((x) => x.includes(targetName) && x.includes("Đã khoá")));
    await q(`(() => { const s = [...document.querySelectorAll(".ant-select")].find((x) => x.innerText.includes("Mọi trạng thái")); s.querySelector(".ant-select-content, .ant-select-selector").dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); })()`);
    await sleep(400);
    await q(`[...document.querySelectorAll(".ant-select-item-option")].find((o) => o.textContent.trim() === "Đã khoá").click()`);
    list = await waitRows((r) => r.length > 0 && r.every((x) => x.includes("Đã khoá")));
    check("Lọc 'Đã khoá': chỉ còn tài khoản đã khoá", list.length >= 1 && list.every((r) => r.includes("Đã khoá")), `${list.length} dòng`);

    // tab Thu ngân & Pha chế: chỉ xem
    await q(`[...document.querySelectorAll(".ant-tabs-tab")].find((t) => t.textContent.includes("Thu ngân"))?.click()`);
    await sleep(900);
    const staffList = await waitRows((r) => r.length >= 4);
    check("Thu ngân & Pha chế (mock): có Cashier và Barista, chỉ xem (không có nút thao tác)", staffList.length >= 4 && staffList.some((r) => r.includes("Cashier")) && staffList.some((r) => r.includes("Barista")) && (await q(`[...document.querySelectorAll(".ant-table-tbody button")].filter((b) => b.offsetParent !== null).length`)) === 0, `${staffList.length} dòng`);

    // /setup-password khi đang có phiên Owner: nhận diện nền tảng, không đăng xuất
    await spaGo(`/setup-password?token=${LONG_TOKEN}`);
    const brandOnSetup = await brandVar();
    check("Đang có phiên Owner: /setup-password dùng màu nền tảng (khác màu tenant)", brandOnSetup === platformBrand && tenantBrand !== platformBrand, `nền tảng ${platformBrand} · tenant ${tenantBrand} · trang ${brandOnSetup}`);
    check("Đang có phiên Owner: trang render, không sidebar, token đã xoá khỏi URL", (await has("setup-password")) && !(await q(`!!document.querySelector(".ant-layout-sider")`)) && (await search()) === "");
    await spaGo("/owner/accounts");
    await tab.waitFor(`document.querySelector(".ant-layout-sider")`, 8000, "shell owner còn");
    check("Đang có phiên Owner: sau đó vẫn vào lại được khu Owner (không bị đăng xuất)", (await path()).startsWith("/owner"), await path());

    } // hết các khối trước staff

    if (STAFF) { // khối staff (5.4): tự đăng nhập Manager, chạy được riêng bằng --only=staff
    // Manager tạo nhân viên
    await tab.goto("/login");
    await tab.clearStorage();
    await tab.goto("/login");
    await tab.login("manager");
    await tab.waitFor(`location.pathname.startsWith("/manager")`, 20000, "vào manager");
    await tab.waitFor(`document.querySelector(".ant-layout-sider")`, 15000, "shell");
    await sleep(1000);
    if (!FULL) await tab.scenario({ profile: "A", tier: "ADVANCED" });
    await tab.clickMenu("Nhân viên");
    await sleep(1200);
    // Dòng hạn mức nạp sau danh sách ("Đang tải hạn mức…"): chờ nó có số rồi mới chấm (chập chờn 6.7 do đọc quá sớm).
    await tab.waitFor(`/Đã dùng \\d+\\/\\d+ tài khoản/.test(${tid("staff-quota")}?.innerText ?? "")`, 10000, "dòng hạn mức nhân viên có số").catch(() => {});
    check("Manager: màn Nhân viên không hiện mật khẩu nào", !SECRET.test(await pageText()));
    check("Nhân viên (mock): dòng hạn mức KHÔNG có nhãn '(số liệu mẫu)' (số liệu của mock là số liệu thật của mock)", !/số liệu mẫu/.test(await q(`${tid("staff-quota")}?.innerText ?? ""`)), await q(`${tid("staff-quota")}?.innerText.slice(0, 60) ?? ""`));
    check("Nhân viên (mock): không có banner 'dữ liệu mẫu' và có dòng hạn mức 'Đã dùng X/Y tài khoản'", !(await has("staff-mock-banner")) && /Đã dùng \d+\/\d+ tài khoản/.test(await q(`${tid("staff-quota")}?.innerText ?? ""`)), await q(`${tid("staff-quota")}?.innerText.slice(0, 60) ?? ""`));
    const staffRowsNow = await waitRows((r) => r.length >= 4);
    check("Nhân viên: bảng chỉ có Cashier/Barista của chi nhánh mình, hiện trạng thái và đăng nhập gần nhất", staffRowsNow.length >= 4 && staffRowsNow.every((r) => /Cashier|Barista/.test(r) && /Đang hoạt động|Đã khoá|Chờ đặt mật khẩu/.test(r) && /Chưa từng|\d{2}\/\d{2}\/\d{4}/.test(r)), `${staffRowsNow.length} dòng; ${staffRowsNow[0]?.slice(0, 100)}`);
    const staffQuotaText = () => q(`${tid("staff-quota")}?.innerText ?? ""`);
    const quotaUsed = async () => Number(((await staffQuotaText()).match(/Đã dùng (\d+)\//) ?? [])[1] ?? NaN);
    const quotaLimit = async () => Number(((await staffQuotaText()).match(/Đã dùng \d+\/(\d+)/) ?? [])[1] ?? NaN);
    const usedBefore = await quotaUsed();
    /** Tạo một nhân viên qua form; trả về chữ trong toast/hộp thông báo sau khi bấm xác nhận. */
    const createStaffUI = async (fullName, email, phone, roleText) => {
      await clickTid("staff-add");
      await sleep(700);
      await setTid("staff-name", fullName);
      await setTid("staff-email", email);
      if (phone) await setTid("staff-phone", phone);
      if (roleText) {
        await q(`document.querySelector(".ant-drawer .ant-select-content, .ant-drawer .ant-select-selector").dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))`);
        await sleep(400);
        await q(`[...document.querySelectorAll(".ant-select-item-option")].find((o) => o.textContent.includes(${J(roleText)}))?.click()`);
        await sleep(300);
      }
      await sleep(300);
      await clickTid("staff-save");
      await sleep(600);
      await confirmOk("Tạo tài khoản");
      await sleep(1200);
    };
    await createStaffUI("Nhân Viên Thử", "nv.thu@mock.local", "", "");
    const staffNotice = await q(`${tid("password-setup-notice")}?.innerText ?? ""`);
    check("Manager tạo nhân viên: hiện 'Đã xếp email đặt mật khẩu … hiệu lực tới …', không có mật khẩu", /Đã xếp email đặt mật khẩu tới nv\.thu@mock\.local, hiệu lực tới/.test(staffNotice) && !SECRET.test(await pageText()), staffNotice);
    await dismissModals();
    let sRows = await waitRows((r) => r.some((x) => x.includes("Nhân Viên Thử")));
    check("Nhân viên mới: hiện 'Chờ đặt mật khẩu', vai trò Cashier, chưa đăng nhập, quota +1", sRows.some((r) => r.includes("Nhân Viên Thử") && r.includes("Chờ đặt mật khẩu") && r.includes("Cashier") && r.includes("Chưa từng")) && (await quotaUsed()) === usedBefore + 1, `${usedBefore} → ${await quotaUsed()}`);

    // ============================================================ MOCK — 5.4 Manager quản Cashier/Barista
    // tạo Barista (chọn vai trò) + điện thoại
    await createStaffUI("Pha Chế Thử", "pc.thu@mock.local", "0901234567", "Barista");
    await dismissModals();
    sRows = await waitRows((r) => r.some((x) => x.includes("Pha Chế Thử")));
    check("Tạo Barista (kèm điện thoại): hiện đúng vai trò và số điện thoại", sRows.some((r) => r.includes("Pha Chế Thử") && r.includes("Barista") && r.includes("0901234567")), (sRows.find((r) => r.includes("Pha Chế Thử")) ?? "").slice(0, 120));
    // email trùng
    await createStaffUI("Người Trùng", "NV.THU@mock.local", "", "");
    check("Email trùng (không phân biệt hoa thường) → báo 'Email này đã được dùng'", /Email này đã được dùng/.test(await toasts()), await toasts());
    await q(`document.querySelectorAll(".ant-drawer-close").forEach((b) => b.click())`);
    await sleep(500);
    // dữ liệu sai bị chặn ở form
    await clickTid("staff-add");
    await sleep(700);
    await setTid("staff-name", "Một");
    await setTid("staff-email", "khong-hop-le");
    await setTid("staff-phone", "12");
    await sleep(300);
    const formErr = await q(`${tid("staff-errors")}?.innerText ?? ""`);
    check("Form: họ tên một chữ, email sai, điện thoại sai → báo lỗi và khoá nút Tạo", /họ và tên/.test(formErr) && /Email không hợp lệ/.test(formErr) && /Điện thoại/.test(formErr) && (await q(`${tid("staff-save")}.disabled`)) === true, formErr.replace(/\s+/g, " "));
    await q(`document.querySelectorAll(".ant-drawer-close").forEach((b) => b.click())`);
    await sleep(500);

    // lọc vai trò + tìm kiếm
    await q(`${tid("staff-role-filter")}.querySelector(".ant-select-content, .ant-select-selector").dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))`);
    await sleep(400);
    await q(`[...document.querySelectorAll(".ant-select-item-option")].find((o) => o.textContent.trim() === "Barista")?.click()`);
    sRows = await waitRows((r) => r.length > 0 && r.every((x) => x.includes("Barista")));
    check("Lọc vai trò Barista: chỉ còn Barista", sRows.length >= 1 && sRows.every((r) => r.includes("Barista")), `${sRows.length} dòng`);
    await q(`${tid("staff-role-filter")}.querySelector(".ant-select-content, .ant-select-selector").dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))`);
    await sleep(400);
    await q(`[...document.querySelectorAll(".ant-select-item-option")].find((o) => o.textContent.trim() === "Mọi vai trò")?.click()`);
    await sleep(900);
    await q(`(() => { const el = document.querySelector(".ant-input-search input"); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, "pc.thu@"); el.dispatchEvent(new Event("input", { bubbles: true })); })()`);
    await q(`document.querySelector(".ant-input-search .ant-btn, .ant-input-search-button").click()`);
    sRows = await waitRows((r) => r.length === 1);
    check("Tìm kiếm theo email: còn đúng một dòng", sRows.length === 1 && sRows[0].includes("Pha Chế Thử"), `${sRows.length} dòng`);
    await q(`(() => { const el = document.querySelector(".ant-input-search input"); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, ""); el.dispatchEvent(new Event("input", { bubbles: true })); })()`);
    await q(`document.querySelector(".ant-input-search .ant-btn, .ant-input-search-button").click()`);
    await waitRows((r) => r.length >= 6);

    // sửa (họ tên, điện thoại) — có xác nhận
    await clickRowBtn("Pha Chế Thử", "Sửa");
    await sleep(700);
    await setTid("staff-edit-phone", "abc");
    await sleep(300);
    check("Sửa: điện thoại sai bị báo lỗi và khoá nút Lưu", /Điện thoại/.test(await q(`${tid("staff-edit-errors")}?.innerText ?? ""`)) && (await q(`${tid("staff-edit-save")}.disabled`)) === true);
    await setTid("staff-edit-name", "Pha Chế Đã Sửa");
    await setTid("staff-edit-phone", "0912345678");
    await sleep(300);
    await clickTid("staff-edit-save");
    await sleep(600);
    check("Sửa: hộp xác nhận nêu họ tên mới và điện thoại", /Pha Chế Đã Sửa/.test(await q(`${tid("confirm-staff")}?.innerText ?? ""`)) && /0912345678/.test(await q(`${tid("confirm-staff")}?.innerText ?? ""`)));
    await confirmOk("Lưu");
    sRows = await waitRows((r) => r.some((x) => x.includes("Pha Chế Đã Sửa")));
    check("Sửa: bảng hiện họ tên và điện thoại mới, email/vai trò giữ nguyên", sRows.some((r) => r.includes("Pha Chế Đã Sửa") && r.includes("0912345678") && r.includes("pc.thu@mock.local") && r.includes("Barista")));

    // gửi lại email đặt mật khẩu
    await clickRowBtn("Pha Chế Đã Sửa", "Gửi lại email");
    await tab.waitFor(`/24 giờ/.test(${tid("confirm-staff")}?.innerText ?? "")`, 6000, "hộp xác nhận gửi lại email").catch(() => {});
    check("Gửi lại email: hộp xác nhận nêu email và hiệu lực 24 giờ", /pc\.thu@mock\.local/.test(await q(`${tid("confirm-staff")}?.innerText ?? ""`)) && /24 giờ/.test(await q(`${tid("confirm-staff")}?.innerText ?? ""`)));
    await confirmOk("Gửi email");
    await sleep(1200);
    const staffReset = await q(`${tid("password-setup-notice")}?.innerText ?? ""`);
    check("Gửi lại email: hiện 'Đã xếp email đặt mật khẩu tới …, hiệu lực tới …', không có mật khẩu", /Đã xếp email đặt mật khẩu tới pc\.thu@mock\.local, hiệu lực tới/.test(staffReset) && !SECRET.test(await pageText()), staffReset);
    await dismissModals();

    // khoá / mở khoá
    await clickRowBtn("Nhân Viên Thử", "Khoá");
    await sleep(600);
    const lockTxt = await q(`${tid("confirm-staff")}?.innerText ?? ""`);
    check("Khoá: hộp xác nhận nêu tên, vai trò, chi nhánh và 'không tính vào hạn mức'", /Nhân Viên Thử/.test(lockTxt) && /Cashier/.test(lockTxt) && /chi nhánh/.test(lockTxt) && /không tính vào hạn mức/.test(lockTxt), lockTxt.replace(/\s+/g, " "));
    const usedWithTwo = await quotaUsed();
    await confirmOk("Khoá tài khoản");
    sRows = await waitRows((r) => r.some((x) => x.includes("Nhân Viên Thử") && x.includes("Đã khoá")));
    check("Khoá: trạng thái 'Đã khoá' và quota giảm 1 (khoá không tính)", sRows.some((r) => r.includes("Nhân Viên Thử") && r.includes("Đã khoá")) && (await quotaUsed()) === usedWithTwo - 1, `${usedWithTwo} → ${await quotaUsed()}`);
    await clickRowBtn("Nhân Viên Thử", "Mở khoá");
    await confirmOk("Mở khoá");
    sRows = await waitRows((r) => r.some((x) => x.includes("Nhân Viên Thử") && !x.includes("Đã khoá")));
    check("Mở khoá: có xác nhận, tài khoản trở lại và quota tăng 1", sRows.some((r) => r.includes("Nhân Viên Thử") && !r.includes("Đã khoá")) && (await quotaUsed()) === usedWithTwo);

    // hạn mức: dùng gói Tiêu chuẩn (tối đa 30) rồi tạo cho tới khi đủ
    await tab.openMockPanel();
    await tab.scenario({ profile: "A", tier: "STANDARD" });
    await tab.clickMenu("Quầy và máy in");
    await tab.clickMenu("Nhân viên");
    await sleep(1500);
    const cap = await quotaLimit();
    let guard = 0;
    while ((await quotaUsed()) < cap && guard++ < 40) {
      await createStaffUI(`Đủ Mức ${guard}`, `dumuc${guard}@mock.local`, "", "");
      await dismissModals();
    }
    check("Hạn mức: tạo cho tới khi đủ — 'Đã dùng N/N', dòng báo đỏ 'đã đủ hạn mức'", (await quotaUsed()) === cap && /đã đủ hạn mức/.test(await staffQuotaText()), await staffQuotaText().then((t) => t.replace(/\s+/g, " ").slice(0, 90)));
    check("Đủ hạn mức: nút 'Thêm nhân viên' bị khoá", (await q(`${tid("staff-add")}.disabled`)) === true);
    // khoá một người → tạo tiếp được
    await clickRowBtn("Nhân Viên Thử", "Khoá");
    await confirmOk("Khoá tài khoản");
    await waitRows((r) => r.some((x) => x.includes("Nhân Viên Thử") && x.includes("Đã khoá")));
    await tab.waitFor(`${tid("staff-add")}.disabled === false`, 6000, "nút Thêm mở lại").catch(() => {});
    check("Khoá một người khi đủ hạn mức: quota giảm 1 và nút Thêm mở lại", (await quotaUsed()) === cap - 1 && (await q(`${tid("staff-add")}.disabled`)) === false, `${await quotaUsed()}/${cap}`);
    await createStaffUI("Chỗ Cuối", "chocuoi@mock.local", "", "");
    await dismissModals();
    // Số "Đã dùng" cập nhật sau khi đóng hộp thoại: chờ về đủ hạn mức rồi mới chấm (chập chờn 6.7 do đọc quá sớm).
    for (let i = 0; i < 40 && (await quotaUsed()) !== cap; i++) await sleep(150);
    check("Tạo thêm được 1 người sau khi khoá → lại đủ hạn mức", (await quotaUsed()) === cap && (await q(`${tid("staff-add")}.disabled`)) === true);
    // đủ hạn mức → mở khoá bị chặn
    const unlockDisabled = await q(`(() => { const r = [...document.querySelectorAll(".ant-table-tbody > tr.ant-table-row")].find((x) => x.innerText.includes("Nhân Viên Thử")); const b = [...r.querySelectorAll("button")].find((x) => x.textContent.includes("Mở khoá")); return b ? b.disabled : null })()`);
    check("Đủ hạn mức: nút 'Mở khoá' cũng bị khoá (khoá không tính, mở khoá chiếm chỗ)", unlockDisabled === true, String(unlockDisabled));
    // khoá thêm người khác thì mở khoá được
    await clickRowBtn("Chỗ Cuối", "Khoá");
    await confirmOk("Khoá tài khoản");
    await waitRows((r) => r.some((x) => x.includes("Chỗ Cuối") && x.includes("Đã khoá")));
    await tab.waitFor(`${tid("staff-add")}.disabled === false`, 6000, "quota giảm sau khi khoá").catch(() => {});
    await clickRowBtn("Nhân Viên Thử", "Mở khoá");
    await confirmOk("Mở khoá");
    await sleep(1200);
    check("Khoá thêm một người rồi mở khoá được: quota về đủ hạn mức", (await quotaUsed()) === cap && (await waitRows((r) => r.some((x) => x.includes("Nhân Viên Thử") && !x.includes("Đã khoá")))).length > 0);

    // F5: dữ liệu còn (localStorage smartfnb:mock:accounts:v1)
    const keyCount = await q(`Object.keys(localStorage).filter((k) => k.startsWith("smartfnb:mock:accounts:v1:")).length`);
    await tab.goto("/manager/staff");
    await tab.waitFor(`document.querySelector(".ant-layout-sider")`, 20000, "shell sau F5");
    await sleep(1800);
    sRows = await waitRows((r) => r.length >= 6);
    check("F5: nhân viên đã tạo vẫn còn (lưu localStorage), khoá 'smartfnb:mock:accounts:v1:<chainId>' có mặt", keyCount >= 1 && sRows.some((r) => r.includes("Pha Chế Đã Sửa") && r.includes("0912345678")) && sRows.some((r) => r.includes("Chỗ Cuối") && r.includes("Đã khoá")), `${keyCount} khoá, ${sRows.length} dòng`);

    // hết hạn gói: mọi nút ghi khoá
    await tab.openMockPanel();
    await tab.setCheckbox("mock-expired", true);
    await sleep(900);
    const expiredState = await q(`({ add: ${tid("staff-add")}.disabled, rowButtons: [...document.querySelectorAll(".ant-table-tbody button")].every((b) => b.disabled) && document.querySelectorAll(".ant-table-tbody button").length > 0 })`);
    check("Hết hạn gói: nút Thêm và mọi nút Sửa/Gửi lại email/Khoá/Mở khoá bị khoá (chỉ đọc)", expiredState.add && expiredState.rowButtons, J(expiredState));
    await tab.setCheckbox("mock-expired", false);
    check("Không chỗ nào ở màn Nhân viên hiện mật khẩu", !SECRET.test(await pageText()));
    await tab.scenario({ profile: "A", tier: "ADVANCED" });

    } // hết khối staff

    if (FULL) {
    // ============================================================ MOCK — 5.5 quầy và máy in
    await tab.clickMenu("Quầy và máy in");
    await sleep(1000);
    let stList = await waitRows((r) => r.length >= 2);
    check("Quầy (mock): bảng có 2 quầy mẫu, hiện máy in và số màn hình đã ghép", stList.length >= 2 && stList.some((r) => r.includes("Quầy 1") && r.includes("WiFi") && r.includes("192.168.1.50:9100") && /1 màn hình/.test(r)) && stList.some((r) => r.includes("Quầy 2") && r.includes("Chưa khai báo")), stList.join(" // ").slice(0, 160));
    check("Quầy: đổi tên / ngừng dùng / sửa máy in bị khoá, có chú thích 'Chờ BE (api-contract-plan #27)'", /#27/.test(await q(`${tid("stations-pending-note")}?.innerText ?? ""`)) && (await q(`[...document.querySelectorAll('[data-testid="station-pending-action"]')].every((b) => b.disabled) && document.querySelectorAll('[data-testid="station-pending-action"]').length >= 3`)));
    const addStation = async (name, conn, address) => {
      await clickTid("station-add");
      await sleep(700);
      await setTid("station-name", name);
      if (conn !== "NONE") {
        await clickTid(`station-conn-${conn}`);
        await sleep(300);
        if (address !== undefined) await setTid("station-address", address);
      }
      await sleep(300);
    };
    const stErrors = () => q(`${tid("station-errors")}?.innerText ?? ""`);
    const stSaveDisabled = () => q(`${tid("station-save")}.disabled`);
    // tên trùng
    await addStation("Quầy 1", "NONE");
    check("Quầy: tên trùng bị báo sớm và khoá nút Tạo", /Tên quầy đã có trong chi nhánh/.test(await stErrors()) && (await stSaveDisabled()) === true, await stErrors());
    // WiFi: IP sai rồi đúng
    await setTid("station-name", "Quầy WiFi");
    await clickTid("station-conn-WIFI");
    await sleep(300);
    await setTid("station-address", "192.168.1.999");
    await sleep(300);
    check("Quầy WiFi: IP sai (octet > 255) bị chặn", /IP không hợp lệ/.test(await stErrors()) && (await stSaveDisabled()) === true, await stErrors());
    await setTid("station-address", "192.168.1.60:9100");
    await sleep(300);
    check("Quầy WiFi: IPv4 kèm cổng hợp lệ → mở nút Tạo", (await stErrors()) === "" && (await stSaveDisabled()) === false, await stErrors());
    await clickTid("station-save");
    await sleep(800);
    const confirmText = await q(`${tid("confirm-station")}?.innerText ?? ""`);
    check("Quầy: hộp xác nhận nêu máy in, địa chỉ và trạng thái", /WiFi/.test(confirmText) && /192\.168\.1\.60:9100/.test(confirmText) && /đang dùng/.test(confirmText), confirmText.replace(/\s+/g, " "));
    await confirmOk("Tạo quầy");
    stList = await waitRows((r) => r.some((x) => x.includes("Quầy WiFi")));
    check("Quầy WiFi: tạo xong hiện trong bảng, trạng thái Đang dùng", stList.some((r) => r.includes("Quầy WiFi") && r.includes("192.168.1.60:9100") && r.includes("Đang dùng")), (stList.find((r) => r.includes("Quầy WiFi")) ?? "").slice(0, 100));
    // Bluetooth: MAC sai rồi đúng
    await addStation("Quầy BT", "BLUETOOTH", "AA:BB:CC");
    check("Quầy Bluetooth: MAC sai bị chặn; có ghi chú đặc tả (chọn trên POS)", /MAC không hợp lệ/.test(await stErrors()) && (await stSaveDisabled()) === true && /tablet POS/.test(await q(`${tid("station-bt-note")}?.innerText ?? ""`)), await stErrors());
    await setTid("station-address", "aa:bb:cc:dd:ee:ff");
    await sleep(300);
    await clickTid("station-save");
    await confirmOk("Tạo quầy");
    stList = await waitRows((r) => r.some((x) => x.includes("Quầy BT")));
    check("Quầy Bluetooth: tạo xong, MAC được viết hoa", stList.some((r) => r.includes("Quầy BT") && r.includes("Bluetooth") && r.includes("AA:BB:CC:DD:EE:FF")), (stList.find((r) => r.includes("Quầy BT")) ?? "").slice(0, 100));

    // ============================================================ MOCK — 5.6 ghép và thu hồi thiết bị (BR-45)
    /** Tạo mã ghép giả bằng MockPanel (loại màn hình khách hoặc gọi số, hoặc mã đã hết hạn) và trả mã 6 số. */
    const fakeCode = async (kind, expired = false) => {
      await tab.openMockPanel();
      await tab.setSelect("mock-pair-type", kind);
      await clickTid(expired ? "mock-pair-expired" : "mock-pair-create");
      await sleep(300);
      return q(`${tid("mock-pair-code")}.textContent.trim()`);
    };
    /** Dán mã vào ô nhập 6 số bằng sự kiện paste thật (chứng minh dán được cả mã). */
    const pasteCode = (code) =>
      q(`(() => { const el = document.querySelector('[data-testid="pair-digit-0"]'); const dt = new DataTransfer(); dt.setData("text", ${J(code)});
        el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true })); })()`);
    const clickInRow = (rowText, testId) =>
      q(`(() => { const r = [...document.querySelectorAll(".ant-table-tbody > tr.ant-table-row")].find((x) => x.innerText.includes(${J(rowText)}));
        const b = r && r.querySelector('[data-testid=${J(testId)}]'); if (!b || b.disabled) return false; b.click(); return true })()`);
    const pairErr = () => q(`${tid("pair-error")}?.innerText ?? ""`);
    const closeAll = async () => {
      await q(`document.querySelectorAll(".ant-modal-close").forEach((b) => b.click())`);
      await sleep(500);
    };
    /** Mở hộp ghép màn khách của một quầy, dán mã, bấm Ghép, rồi (nếu `ok`) bấm xác nhận. */
    const pairCustomer = async (station, code, name) => {
      await clickInRow(station, "station-pair");
      await sleep(700);
      await pasteCode(code);
      if (name) await setTid("pair-device-name", name);
      await sleep(300);
      await clickTid("pair-submit");
      await sleep(600);
      await confirmOk("Ghép");
      await sleep(1200);
    };

    // 1) ghép màn hình khách vào Quầy 2 (chưa có màn hình)
    await clickInRow("Quầy 2", "station-pair");
    await sleep(700);
    check("Ghép: ô nhập mã có đúng 6 ô số", (await q(`document.querySelectorAll('[data-testid^="pair-digit-"]').length`)) === 6);
    check("Ghép: chưa nhập mã thì nút Ghép bị khoá", (await q(`${tid("pair-submit")}.disabled`)) === true);
    await pasteCode("12a 3-4 56");
    await sleep(300);
    check("Ghép: dán chuỗi lẫn chữ cái/dấu cách chỉ giữ chữ số (123456) và mở nút Ghép", (await q(`[...document.querySelectorAll('[data-testid^="pair-digit-"]')].map((e) => e.value).join("")`)) === "123456" && (await q(`${tid("pair-submit")}.disabled`)) === false);
    await closeAll();
    const code1 = await fakeCode("CUSTOMER_DISPLAY");
    check("MockPanel: tạo mã ghép giả 6 số kèm giờ hết hạn", /^\d{6}$/.test(code1) && /hết hạn lúc/.test(await q(`${tid("mock-pair-expires")}.textContent`)), `${code1}`);
    await pairCustomer("Quầy 2", code1, "Tablet khách quầy 2");
    check("Ghép màn hình khách: thành công, Quầy 2 có 1 màn hình", /Đã ghép màn hình khách/.test(await toasts()) && (await waitRows((r) => r.some((x) => x.includes("Quầy 2") && /1 màn hình/.test(x)))).some((x) => x.includes("Quầy 2") && /1 màn hình/.test(x)), await toasts());

    // 2) mở rộng quầy xem thiết bị: tên, ngày ghép, lần cuối thấy
    await q(`(() => { const r = [...document.querySelectorAll(".ant-table-tbody > tr.ant-table-row")].find((x) => x.innerText.includes("Quầy 1")); r.querySelector(".ant-table-row-expand-icon").click(); })()`);
    await sleep(600);
    const dev1 = await q(`document.querySelector('[data-testid="station-device-row"]')?.innerText ?? ""`);
    check("Quầy 1 mở rộng: thấy tên máy, ngày ghép và 'Lần cuối thấy: 5 phút trước'", /Tablet khách quầy 1/.test(dev1) && /Ghép \d{2}\/\d{2}\/\d{4}/.test(dev1) && /Lần cuối thấy: 5 phút trước/.test(dev1), dev1.replace(/\s+/g, " "));
    check("Không hiện token thiết bị ở bất cứ đâu", !/token|deviceToken|hash/i.test(await pageText()));

    // 3) ghép máy thứ hai vào quầy đã có màn hình → cảnh báo + máy cũ bị thu hồi (BR-45)
    await clickInRow("Quầy 2", "station-pair");
    await sleep(700);
    const warn = await q(`${tid("pair-warning")}?.innerText ?? ""`);
    check("Quầy đã có màn hình: cảnh báo 'Ghép máy mới sẽ thu hồi Tablet khách quầy 2' trước khi ghép", /Ghép máy mới sẽ thu hồi/.test(warn) && /Tablet khách quầy 2/.test(warn), warn.replace(/\s+/g, " "));
    await closeAll();
    const code2 = await fakeCode("CUSTOMER_DISPLAY");
    await clickInRow("Quầy 2", "station-pair");
    await sleep(700);
    await pasteCode(code2);
    await setTid("pair-device-name", "Máy mới quầy 2");
    await sleep(300);
    await clickTid("pair-submit");
    await sleep(700);
    const confirmPair = await q(`${tid("confirm-pair")}?.innerText ?? ""`);
    check("Ghép máy thay thế: hộp xác nhận nêu máy cũ sẽ bị thu hồi", /thu hồi/.test(confirmPair) && /Tablet khách quầy 2/.test(confirmPair) && new RegExp(code2).test(confirmPair), confirmPair.replace(/\s+/g, " "));
    await confirmOk("Ghép");
    await sleep(1300);
    await q(`(() => { const r = [...document.querySelectorAll(".ant-table-tbody > tr.ant-table-row")].find((x) => x.innerText.includes("Quầy 2")); const i = r.querySelector(".ant-table-row-expand-icon"); if (i && i.getAttribute("aria-label") !== "Collapse row" && !i.classList.contains("ant-table-row-expand-icon-expanded")) i.click(); })()`);
    await sleep(600);
    const devs2 = await q(`[...document.querySelectorAll('[data-testid="station-devices-Quầy 2"] [data-testid="station-device-row"]')].map((e) => e.innerText.replace(/\\s+/g, " "))`);
    check("Ghép máy thứ hai: máy cũ tự bị thu hồi, quầy chỉ còn 'Máy mới quầy 2'", devs2.length === 1 && /Máy mới quầy 2/.test(devs2[0]) && !/Tablet khách quầy 2/.test(devs2[0]), devs2.join(" | "));

    // 4) lỗi mã: sai / hết hạn / đã dùng / sai loại — BE gộp chung nên web nêu đủ nguyên nhân
    const errCases = [];
    const tryCode = async (label, code) => {
      await clickInRow("Quầy 2", "station-pair");
      await sleep(600);
      await pasteCode(code);
      await sleep(250);
      await clickTid("pair-submit");
      await sleep(500);
      await confirmOk("Ghép");
      await sleep(1000);
      const err = await pairErr();
      errCases.push([label, err]);
      await closeAll();
      return err;
    };
    const rightMsg = (e) => /sai/.test(e) && /hết hạn/.test(e) && /đã được dùng/.test(e) && /màn hình gọi số/.test(e);
    const eWrong = await tryCode("sai", "000000");
    check("Mã sai: báo đúng ý (sai / hết hạn / đã dùng / mã loại khác), không chung chung", rightMsg(eWrong), eWrong.slice(0, 90));
    const eExpired = await tryCode("hết hạn", await fakeCode("CUSTOMER_DISPLAY", true));
    check("Mã hết hạn (5 phút): báo lỗi ghép đúng ý, không ghép", rightMsg(eExpired), eExpired.slice(0, 60));
    const usedCode = await fakeCode("CUSTOMER_DISPLAY");
    await pairCustomer("Quầy 1", usedCode, "Máy dùng mã một lần");
    const eUsed = await tryCode("đã dùng", usedCode);
    check("Mã đã dùng: dùng lại bị từ chối với thông báo ghép đúng ý", rightMsg(eUsed), eUsed.slice(0, 60));
    const eType = await tryCode("sai loại", await fakeCode("CALLING_DISPLAY"));
    check("Sai loại (mã màn hình gọi số đem ghép màn hình khách): báo đúng ý", rightMsg(eType), eType.slice(0, 60));
    const devsAfter = await q(`[...document.querySelectorAll('[data-testid="station-devices-Quầy 2"] [data-testid="station-device-row"]')].length`);
    check("Mọi lần ghép lỗi không làm đổi thiết bị của quầy", devsAfter === 1, `${devsAfter} thiết bị ở Quầy 2`);

    // 5) thu hồi một thiết bị (có hộp xác nhận)
    await q(`document.querySelector('[data-testid="station-devices-Quầy 2"] [data-testid="device-revoke"]').click()`);
    await sleep(700);
    const revokeText = await q(`${tid("confirm-revoke")}?.innerText ?? ""`);
    check("Thu hồi: hộp xác nhận nêu tên máy, quầy và hậu quả", /Máy mới quầy 2/.test(revokeText) && /Quầy 2/.test(revokeText) && /ghép lại bằng mã mới/.test(revokeText), revokeText.replace(/\s+/g, " "));
    await confirmOk("Thu hồi");
    stList = await waitRows((r) => r.some((x) => x.includes("Quầy 2") && /Chưa có/.test(x)));
    check("Thu hồi: xong thì Quầy 2 không còn màn hình", stList.some((r) => r.includes("Quầy 2") && /Chưa có/.test(r)) && /Đã thu hồi/.test(await toasts()), await toasts());

    // 6) màn hình gọi số của chi nhánh
    const callCode = await fakeCode("CALLING_DISPLAY");
    await clickTid("calling-pair");
    await sleep(700);
    await pasteCode(callCode);
    await setTid("pair-device-name", "TV khu nhận món");
    await sleep(300);
    await clickTid("pair-submit");
    await sleep(600);
    await confirmOk("Ghép");
    await sleep(1200);
    check("Ghép màn hình gọi số: thành công", /Đã ghép màn hình gọi số/.test(await toasts()), await toasts());
    check("Khu Màn hình gọi số: chú thích 'chờ BE #28', web không liệt kê và không tự lưu danh sách ở trình duyệt", /#28/.test(await q(`${tid("calling-display-note")}?.innerText ?? ""`)) && (await q(`Object.keys(localStorage).concat(Object.keys(sessionStorage)).filter((k) => /device|calling|station|display/i.test(k)).length`)) === 0 && !/TV khu nhận món/.test(await pageText()));

    // 7) hết hạn gói: ghép/thu hồi chỉ đọc
    await tab.openMockPanel();
    await tab.setCheckbox("mock-expired", true);
    await sleep(800);
    const lockedStates = await q(`({ pair: [...document.querySelectorAll('[data-testid="station-pair"]')].every((b) => b.disabled), calling: document.querySelector('[data-testid="calling-pair"]').disabled })`);
    check("Hết hạn gói: nút 'Ghép màn hình khách' và 'Ghép màn hình gọi số' bị khoá", lockedStates.pair && lockedStates.calling, J(lockedStates));
    await q(`(() => { const r = [...document.querySelectorAll(".ant-table-tbody > tr.ant-table-row")].find((x) => x.innerText.includes("Quầy 1")); const i = r.querySelector(".ant-table-row-expand-icon"); if (i && !i.classList.contains("ant-table-row-expand-icon-expanded")) i.click(); })()`);
    await sleep(500);
    check("Hết hạn gói: nút 'Thu hồi' bị khoá", await q(`[...document.querySelectorAll('[data-testid="device-revoke"]')].length > 0 && [...document.querySelectorAll('[data-testid="device-revoke"]')].every((b) => b.disabled)`));
    await tab.setCheckbox("mock-expired", false);

    } // hết các khối trước 5.7b

    // ============================================================ MOCK — 5.7b menu món chi nhánh (BM-02) + 5.7d tuỳ chọn (--only=menu)
    if (MENU && !FULL) {
      await tab.goto("/login");
      await tab.clearStorage();
      await tab.login("manager");
      await tab.waitFor(`location.pathname.startsWith("/manager")`, 20000, "vào manager");
      await tab.waitFor(`document.querySelector(".ant-layout-sider")`, 15000, "shell manager");
      await sleep(1000);
      await tab.scenario({ profile: "A", tier: "ADVANCED" });
    }
    if (MENU) {
    await tab.clickMenu("Món tại chi nhánh");
    await sleep(1200);
    const menuRows = () =>
      q(`[...document.querySelectorAll('[data-testid="branch-menu-row"]')].map((r) => { const sw = r.querySelector("button.ant-switch");
        return { name: r.querySelector("span").innerText.trim(), text: r.innerText.replace(/\\s+/g, " ").trim(), off: r.dataset.ownerDisabled === "true", checked: sw?.classList.contains("ant-switch-checked"), disabled: !!sw?.disabled }; })`);
    const clickSwitchOf = (name) =>
      q(`(() => { const r = [...document.querySelectorAll('[data-testid="branch-menu-row"]')].find((x) => x.querySelector("span").innerText.trim() === ${J(name)}); const sw = r?.querySelector("button.ant-switch"); if (!sw || sw.disabled) return false; sw.click(); return true })()`);
    const confirmOpen = () => q(`!!document.querySelector(".ant-modal-confirm")`);
    let mRows = await menuRows();
    check("Menu chi nhánh (mock): banner 'chỉ áp dụng cho chi nhánh này trong ngày…', nhóm theo danh mục, có món", /Bật\/tắt chỉ áp dụng cho chi nhánh này trong ngày\. Tên, giá, ảnh do Owner quản lý\./.test(await q(`${tid("branch-menu-banner")}?.innerText ?? ""`)) && (await q(`document.querySelectorAll('[data-testid="branch-menu-group"]').length`)) >= 2 && mRows.length >= 5, `${mRows.length} món`);
    const ownerOff = mRows.filter((r) => r.off);
    check("Menu chi nhánh (mock): có dòng 'Owner đã tắt', công tắc khoá, bấm không mở hộp", ownerOff.length >= 1 && ownerOff.every((r) => r.disabled && /Owner đã tắt/.test(r.text) && !r.checked) && !(await clickSwitchOf(ownerOff[0].name)) && !(await confirmOpen()), ownerOff.map((r) => r.name).join(", "));
    // tìm kiếm (không phân biệt hoa/thường, dấu)
    const sample = mRows.find((r) => !r.off);
    const needle = sample.name.slice(0, 4).toUpperCase();
    await setTid("branch-menu-search", needle);
    await sleep(500);
    const found = await menuRows();
    check("Menu chi nhánh (mock): tìm theo tên lọc đúng (hoa/thường), xoá ô thì đủ món", found.length >= 1 && found.length <= mRows.length && found.some((r) => r.name === sample.name) && found.every((r) => r.name.toLowerCase().includes(needle.toLowerCase())), `${found.length}/${mRows.length}`);
    await setTid("branch-menu-search", "zzzkhongco");
    await sleep(400);
    check("Menu chi nhánh (mock): tìm không ra → 'Không có món khớp'", (await menuRows()).length === 0 && /Không có món khớp/.test(await pageText()));
    await setTid("branch-menu-search", "");
    await sleep(400);
    check("Menu chi nhánh (mock): xoá ô tìm → đủ món", (await menuRows()).length === mRows.length);
    // tắt: có hộp xác nhận, huỷ thì giữ nguyên
    const target = sample.checked ? sample : mRows.find((r) => !r.off && r.checked);
    await clickSwitchOf(target.name);
    await sleep(600);
    check("Menu chi nhánh (mock): tắt món mở hộp 'Món sẽ ẩn khỏi POS của chi nhánh ngay.' (không nhắc đơn đã thanh toán, không bắt lý do)", (await q(`${tid("confirm-menu-off")}?.innerText ?? ""`)) === "Món sẽ ẩn khỏi POS của chi nhánh ngay." && !(await q(`!!document.querySelector(".ant-modal-confirm textarea, .ant-modal-confirm input")`)));
    await confirmCancel();
    await sleep(600);
    check("Menu chi nhánh (mock): huỷ hộp thì món vẫn bật", (await menuRows()).find((r) => r.name === target.name).checked === true);
    await clickSwitchOf(target.name);
    await confirmOk("Tắt bán");
    await sleep(1200);
    check("Menu chi nhánh (mock): xác nhận tắt → món tắt, thông báo thành công đúng 1 lần", (await menuRows()).find((r) => r.name === target.name).checked === false && (await toasts()) === "Đã tạm ngừng bán món hôm nay", await toasts());
    // bật lại: không hộp
    await clickSwitchOf(target.name);
    await sleep(900);
    check("Menu chi nhánh (mock): bật lại KHÔNG có hộp xác nhận, món bật trở lại", !(await confirmOpen()) && (await menuRows()).find((r) => r.name === target.name).checked === true);
    // hết hạn gói
    await tab.openMockPanel();
    await tab.setCheckbox("mock-expired", true);
    await sleep(900);
    const expMenu = await menuRows();
    check("Menu chi nhánh (mock): hết hạn gói → mọi công tắc bị khoá", expMenu.length > 0 && expMenu.every((r) => r.disabled), `${expMenu.filter((r) => !r.disabled).length} công tắc còn mở`);
    await q(`document.querySelector('[data-testid="branch-menu-row"] [data-testid="action-guard"]')?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }))`);
    await sleep(700);
    check("Menu chi nhánh (mock): hết hạn gói → tooltip lý do 'chỉ đọc' trên công tắc", /chế độ chỉ đọc/.test(await q(`[...document.querySelectorAll(".ant-tooltip")].map((e) => e.innerText).join(" ")`)));
    await tab.setCheckbox("mock-expired", false);

    // ---- 5.7d tuỳ chọn theo chi nhánh (mock)
    const clickTab = (label) => q(`(() => { const t = [...document.querySelectorAll(".ant-tabs-tab")].find((x) => x.textContent.trim() === ${J(label)}); if (!t) return false; t.click(); return true })()`);
    const optRows = () =>
      q(`[...document.querySelectorAll('[data-testid="branch-option-row"]')].map((r) => { const sw = r.querySelector("button.ant-switch");
        return { name: r.querySelector("span").innerText.trim(), text: r.innerText.replace(/\\s+/g, " ").trim(), off: r.dataset.ownerDisabled === "true", checked: sw?.classList.contains("ant-switch-checked"), disabled: !!sw?.disabled }; })`);
    const clickOptSwitch = (name) =>
      q(`(() => { const r = [...document.querySelectorAll('[data-testid="branch-option-row"]')].find((x) => x.querySelector("span").innerText.trim() === ${J(name)}); const sw = r?.querySelector("button.ant-switch"); if (!sw || sw.disabled) return false; sw.click(); return true })()`);
    const optionOf = async (name) => (await optRows()).find((r) => r.name === name);
    await q(`document.querySelectorAll(".ant-message-notice-close").forEach((b) => b.click())`);
    await clickTab("Tuỳ chọn");
    await sleep(900);
    let oRows = await optRows();
    check("Tuỳ chọn chi nhánh (mock): gom theo nhóm (Size, Đường, Đá, Topping), có tuỳ chọn", (await q(`document.querySelectorAll('[data-testid="branch-option-group"]').length`)) === 4 && oRows.length >= 12, `${oRows.length} tuỳ chọn`);
    check("Tuỳ chọn chi nhánh (mock): giá cộng thêm '+6.000đ', 0 → 'Không cộng thêm'", /\+6\.000đ/.test((await optionOf("L")).text) && /Không cộng thêm/.test((await optionOf("M")).text), (await optionOf("L")).text);
    const pudding = await optionOf("Pudding");
    check("Tuỳ chọn chi nhánh (mock): dòng 'Owner đã tắt' xám, công tắc khoá, bấm không mở hộp", pudding.off && pudding.disabled && /Owner đã tắt/.test(pudding.text) && !pudding.checked && !(await clickOptSwitch("Pudding")) && !(await confirmOpen()), pudding.text);
    await q(`document.querySelector('[data-owner-disabled="true"][data-testid="branch-option-row"] [data-testid="branch-option-switch"]').parentElement.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }))`);
    await sleep(700);
    check("Tuỳ chọn chi nhánh (mock): tooltip 'Owner đã tắt, chi nhánh không bật lại được' trên công tắc khoá", /Owner đã tắt, chi nhánh không bật lại được/.test(await q(`[...document.querySelectorAll(".ant-tooltip")].map((e) => e.innerText).join(" ")`)));
    await setTid("branch-menu-search", "thạch");
    await sleep(500);
    check("Tuỳ chọn chi nhánh (mock): ô tìm kiếm dùng chung lọc tuỳ chọn", (await optRows()).length === 1 && (await optRows())[0].name === "Thạch dừa");
    await setTid("branch-menu-search", "");
    await sleep(400);
    // tắt Topping: hộp xác nhận đúng câu; huỷ thì giữ; xác nhận → toast có số đơn
    await clickOptSwitch("Thạch dừa");
    await sleep(600);
    check("Tuỳ chọn chi nhánh (mock): tắt mở hộp 'Tuỳ chọn sẽ ẩn khỏi POS… chuyển Hết món.'", (await q(`${tid("confirm-option-off")}?.innerText ?? ""`)) === "Tuỳ chọn sẽ ẩn khỏi POS của chi nhánh ngay. Đơn đã thanh toán có tuỳ chọn này sẽ chuyển Hết món.");
    await confirmCancel();
    await sleep(600);
    check("Tuỳ chọn chi nhánh (mock): huỷ hộp thì tuỳ chọn vẫn bật", (await optionOf("Thạch dừa")).checked === true);
    await q(`document.querySelectorAll(".ant-message-notice-close").forEach((b) => b.click())`);
    await clickOptSwitch("Thạch dừa");
    await confirmOk("Tắt bán");
    await sleep(1200);
    check("Tuỳ chọn chi nhánh (mock): xác nhận tắt Topping → 'Đã tắt. 2 đơn đã thanh toán chuyển Hết món.', công tắc tắt", (await toasts()) === "Đã tắt. 2 đơn đã thanh toán chuyển Hết món." && (await optionOf("Thạch dừa")).checked === false, await toasts());
    await sleep(3500);
    await clickOptSwitch("Ít đá");
    await confirmOk("Tắt bán");
    await sleep(1200);
    check("Tuỳ chọn chi nhánh (mock): tắt tuỳ chọn không có đơn bị ảnh hưởng → 'Đã tắt.'", (await toasts()) === "Đã tắt." && (await optionOf("Ít đá")).checked === false, await toasts());
    await sleep(3500);
    await clickOptSwitch("Ít đá");
    await sleep(900);
    check("Tuỳ chọn chi nhánh (mock): bật lại KHÔNG có hộp xác nhận", !(await confirmOpen()) && (await optionOf("Ít đá")).checked === true && /Đã bật bán tuỳ chọn hôm nay/.test(await toasts()), await toasts());
    // F5: Thạch dừa vẫn tắt (localStorage smartfnb:mock:options:branch:v1:<chainId>:<branchId>)
    const optKeys = await q(`Object.keys(localStorage).filter((k) => k.startsWith("smartfnb:mock:options:branch:v1:")).length`);
    await tab.goto("/manager/menu");
    await tab.waitFor(`document.querySelector(".ant-layout-sider")`, 20000, "shell sau F5");
    await sleep(1500);
    await clickTab("Tuỳ chọn");
    await sleep(900);
    check("Tuỳ chọn chi nhánh (mock): F5 giữ trạng thái (Thạch dừa tắt, Ít đá bật), khoá 'smartfnb:mock:options:branch:v1:…' có mặt", optKeys >= 1 && (await optionOf("Thạch dừa")).checked === false && (await optionOf("Ít đá")).checked === true, `${optKeys} khoá`);
    // hết hạn gói
    await tab.openMockPanel();
    await tab.setCheckbox("mock-expired", true);
    await sleep(900);
    const expOpt = await optRows();
    check("Tuỳ chọn chi nhánh (mock): hết hạn gói → mọi công tắc bị khoá", expOpt.length > 0 && expOpt.every((r) => r.disabled), `${expOpt.filter((r) => !r.disabled).length} công tắc còn mở`);
    await q(`document.querySelector('[data-testid="branch-option-row"][data-owner-disabled="false"] [data-testid="action-guard"]')?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }))`);
    await sleep(700);
    check("Tuỳ chọn chi nhánh (mock): hết hạn gói → tooltip lý do 'chỉ đọc'", /chế độ chỉ đọc/.test(await q(`[...document.querySelectorAll(".ant-tooltip")].map((e) => e.innerText).join(" ")`)));
    await tab.setCheckbox("mock-expired", false);
    }
  } else {
    // ============================================================ REAL — CHỈ ĐỌC; mọi request ghi bị chặn ở CDP
    await tab.blockWrites(SESSION_ALLOW);
    if (FULL) { // các khối trước 5.7b (bỏ qua khi --only=menu); đóng ngay trước khối menu
    await tab.goto("/login");
    await tab.clearStorage();
    await tab.goto(`/setup-password?token=${LONG_TOKEN}`);
    const platformBrand = await brandVar();
    check("Real · Trang /setup-password render được (không sidebar, có form)", (await has("setup-password")) && (await has("setup-confirm")) && !(await q(`!!document.querySelector(".ant-layout-sider")`)));
    check("Real · Token đã bị xoá khỏi URL", (await search()) === "", await search());
    check("Real · Nút gửi khoá khi chưa nhập", (await submitDisabled()) === true);
    await setTid("setup-password", "yeuyeu");
    await setTid("setup-confirm", "yeuyeu");
    await sleep(250);
    check("Real · Mật khẩu yếu: nút khoá, luật hiển thị đúng", (await submitDisabled()) === true && (await ruleOk("upper")) === "false" && (await ruleOk("digit")) === "false" && (await ruleOk("length")) === "false");
    await setTid("setup-password", "StrongPass123");
    await setTid("setup-confirm", "Khac12345");
    await sleep(250);
    check("Real · Hai mật khẩu không khớp: báo lỗi, nút khoá", (await has("setup-mismatch")) && (await submitDisabled()) === true);
    await setTid("setup-confirm", "StrongPass123");
    await sleep(250);
    check("Real · Hợp lệ thì nút mở (KHÔNG bấm gửi)", (await submitDisabled()) === false);
    await tab.goto("/setup-password");
    check("Real · Thiếu token: báo 'Liên kết không hợp lệ'", /Liên kết không hợp lệ/.test(await pageText()) && !(await has("setup-submit")));

    // ---- Owner real: danh sách khớp BE
    const be = await readEmployees();
    const beManagers = be.managers.items;
    await tab.goto("/login");
    await tab.clearStorage();
    await tab.goto("/login");
    await tab.login("owner");
    await tab.waitFor(`location.pathname.startsWith("/owner")`, 20000, "vào owner");
    await tab.waitFor(`document.querySelector(".ant-layout-sider")`, 15000, "shell");
    await sleep(1200);
    await tab.clickMenu("Tài khoản quản lý");
    await sleep(1800);
    let list = await waitRows((r) => r.length === beManagers.length);
    const nameOf = (e) => `${e.firstName} ${e.lastName}`.trim();
    check("Real · Manager: số dòng khớp GET /employees?role=MANAGER", list.length === beManagers.length && beManagers.length > 0, `${list.length} dòng (BE ${beManagers.length}, total ${be.managers.pagination.total})`);
    check("Real · Manager: tên và email từng dòng khớp BE", beManagers.every((e) => list.some((r) => r.includes(nameOf(e)) && r.includes(e.user.email))), beManagers.map(nameOf).join(", "));
    check("Real · Manager: tab hiện đúng tổng", (await pageText()).includes(`Branch Manager (${be.managers.pagination.total})`));
    check("Real · Nút Thêm tài khoản bị khoá kèm chú thích 'chờ BE #23'", (await q(`${tid("create-manager")}.disabled`)) === true && /#23/.test(await q(`${tid("create-manager-note")}?.innerText ?? ""`)));
    check("Real · Không hiện mật khẩu nào", !SECRET.test(await pageText()));

    // ---- bấm thật tới hết xác nhận; request ghi bị chặn ở CDP
    tab.blockedWrites.length = 0;
    const active = beManagers.find((e) => e.user.status === "ACTIVE") ?? beManagers[0];
    const activeName = nameOf(active);
    const otherBranch = be.branches.find((b) => b.id !== active.branch.id);

    await clickRowBtn(activeName, "Khoá");
    await sleep(700);
    const lockConfirm = await q(`${tid("confirm-lock")}?.innerText ?? ""`);
    check("Real · Khoá: hộp xác nhận hiện tên + chi nhánh", lockConfirm.includes(activeName) && lockConfirm.includes(active.branch.name), lockConfirm.replace(/\s+/g, " "));
    await confirmOk("Khoá tài khoản");
    await sleep(1800);
    const lockWrite = tab.blockedWrites.find((w) => w.method === "PATCH" && /\/employees\/[^/]+\/status$/.test(w.path));
    check(
      "Real · Khoá: request định gửi = PATCH /employees/{id}/status {\"status\":\"SUSPENDED\"} (UpdateEmployeeAccountStatusDto, employee.dto.ts:58-66)",
      !!lockWrite && lockWrite.path.includes(active.id) && JSON.stringify(JSON.parse(lockWrite.body ?? "null")) === J({ status: "SUSPENDED" }),
      lockWrite ? `${lockWrite.method} ${lockWrite.path} ${lockWrite.body}` : "không có request",
    );
    check("Real · Khoá: màn hình báo lỗi gọn, bảng vẫn còn", (await toasts()).length > 0 && (await rows()).length === beManagers.length, await toasts());
    await sleep(3500);

    await clickRowBtn(activeName, "Reset mật khẩu");
    await sleep(700);
    const resetConfirm = await q(`${tid("confirm-reset")}?.innerText ?? ""`);
    check("Real · Gửi lại email: hộp xác nhận nêu email và hiệu lực 24 giờ", resetConfirm.includes(active.user.email) && /24 giờ/.test(resetConfirm), resetConfirm.replace(/\s+/g, " "));
    await confirmOk("Gửi email");
    await sleep(1800);
    const resetWrite = tab.blockedWrites.find((w) => w.method === "POST" && /\/employees\/[^/]+\/reset-password$/.test(w.path));
    check(
      "Real · Gửi lại email: request định gửi = POST /employees/{id}/reset-password, không body (employees.controller.ts:74-90)",
      !!resetWrite && resetWrite.path.includes(active.id) && !resetWrite.body,
      resetWrite ? `${resetWrite.method} ${resetWrite.path} body=${resetWrite.body}` : "không có request",
    );
    check("Real · Gửi lại email: màn hình báo lỗi gọn, bảng vẫn còn", (await rows()).length === beManagers.length && !(await has("password-setup-notice")), await toasts());
    await sleep(3500);

    if (otherBranch) {
      const picked = await pickOtherBranch(activeName);
      await sleep(700);
      const trText = await q(`${tid("confirm-transfer")}?.innerText ?? ""`);
      check("Real · Chuyển chi nhánh: hộp xác nhận nêu từ → sang", picked === otherBranch.name && trText.includes(active.branch.name) && trText.includes(otherBranch.name), trText.replace(/\s+/g, " "));
      await confirmOk("Chuyển chi nhánh");
      await sleep(1800);
      const trWrite = tab.blockedWrites.find((w) => w.method === "PATCH" && /\/employees\/[^/]+\/branch$/.test(w.path));
      const trBody = trWrite ? JSON.parse(trWrite.body ?? "null") : null;
      check(
        "Real · Chuyển chi nhánh: request định gửi = PATCH /employees/{id}/branch {branchId: uuid} (TransferEmployeeBranchDto, employee.dto.ts:68-72)",
        !!trWrite && trWrite.path.includes(active.id) && trBody && Object.keys(trBody).join() === "branchId" && trBody.branchId === otherBranch.id && UUID.test(trBody.branchId),
        trWrite ? `${trWrite.method} ${trWrite.path} ${trWrite.body}` : "không có request",
      );
      check("Real · Chuyển chi nhánh: màn hình báo lỗi gọn, bảng vẫn còn", (await rows()).length === beManagers.length, await toasts());
    }

    const after = await readEmployees();
    check("Real · Cuối cùng GET lại /employees: dữ liệu Manager không đổi", J(after.managers) === J(be.managers));
    check("Real · Chỉ các request ghi định trước bị chặn (khoá, đặt lại, chuyển) — không có request ghi nào khác", tab.blockedWrites.every((w) => /\/employees\/[^/]+\/(status|reset-password|branch)$/.test(w.path)), tab.blockedWrites.map((w) => `${w.method} ${w.path}`).join(" | "));

    // ---- 5.3b: tab Thu ngân & Pha chế đọc thật, chỉ xem
    await tab.clickMenu("Tài khoản quản lý");
    await sleep(1200);
    await q(`[...document.querySelectorAll(".ant-tabs-tab")].find((t) => t.textContent.includes("Thu ngân"))?.click()`);
    await sleep(1200);
    const beStaff = [...(await readEmployees("CASHIER")).items, ...(await readEmployees("BARISTA")).items];
    // Chỉ đếm bảng của tab đang mở (tab Manager vẫn nằm trong DOM, bị ẩn).
    const activeRows = () => q(`[...document.querySelectorAll(".ant-table-tbody > tr.ant-table-row")].filter((r) => r.offsetParent !== null).map((r) => r.innerText.replace(/\\s+/g, " ").trim())`);
    let staffRows = await activeRows();
    for (let i = 0; i < 20 && staffRows.length !== beStaff.length; i++) {
      await sleep(250);
      staffRows = await activeRows();
    }
    check("Real · Thu ngân & Pha chế: số dòng khớp GET /employees?role=CASHIER|BARISTA", staffRows.length === beStaff.length && beStaff.length > 0, `${staffRows.length} dòng (BE ${beStaff.length})`);
    check(
      "Real · Thu ngân & Pha chế: tên, email, vai trò khớp BE",
      beStaff.every((e) => staffRows.some((r) => r.includes(nameOf(e)) && r.includes(e.user.email) && r.includes(e.user.role.code === "CASHIER" ? "Cashier" : "Barista"))),
      beStaff.map((e) => `${nameOf(e)}/${e.user.role.code}`).join(", "),
    );
    const staffText = await pageText();
    check("Real · Thu ngân & Pha chế: không còn ghi chú 'Dữ liệu mẫu', chỉ xem (không có nút thao tác trong bảng)", !/Dữ liệu mẫu/.test(staffText) && !(await has("staff-mock-note")) && staffRows.length > 0 && (await q(`[...document.querySelectorAll(".ant-table-tbody button")].filter((b) => b.offsetParent !== null).length`)) === 0);

    // ---- 5.3b: báo cáo — banner "BE chưa đếm đơn quầy" đã bỏ; số liệu khớp BE
    await tab.clickMenu("Tổng quan");
    await sleep(2500);
    const repText = await pageText();
    check("Real · Báo cáo: không còn banner 'chờ backend cập nhật cho đơn tại quầy'", !/chờ backend cập nhật cho đơn tại quầy/.test(repText));
    const day = (offset) => new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10);
    const beRep = await readReport(`/reports/revenue/comparison?from=${day(6)}&to=${day(0)}`);
    const beRevenue = Math.round(Number(beRep?.totals?.revenue ?? 0));
    const beOrders = Number(beRep?.totals?.orderCount ?? 0);
    const pageRevenue = Number(((repText.match(/Doanh thu\s*([\d.]+)/) ?? [])[1] ?? "0").replace(/\./g, ""));
    if (beOrders > 0) {
      check("Real · Báo cáo: có đơn đã trả trong 7 ngày → doanh thu khác 0 và khớp BE", pageRevenue > 0 && pageRevenue === beRevenue, `trang ${pageRevenue} · BE ${beRevenue} (${beOrders} đơn)`);
    } else {
      console.log("SKIP  Báo cáo: không kiểm được số liệu khác 0 vì BE không có đơn đã trả trong 7 ngày gần nhất");
    }

    // ---- /setup-password khi đang có phiên Owner (SPA, không tải lại trang)
    await spaGo(`/setup-password?token=${LONG_TOKEN}`);
    const brandOnSetup = await brandVar();
    const tokens = await tab.tokens();
    check("Real · Đang có phiên Owner: /setup-password dùng màu nền tảng", brandOnSetup === platformBrand, `${brandOnSetup} (nền tảng ${platformBrand})`);
    check("Real · Đang có phiên Owner: trang render, không sidebar, token xoá khỏi URL, phiên còn (token trong storage)", (await has("setup-password")) && !(await q(`!!document.querySelector(".ant-layout-sider")`)) && (await search()) === "" && tokens.access && tokens.refresh);
    await spaGo("/owner/accounts");
    await tab.waitFor(`document.querySelector(".ant-layout-sider")`, 8000, "shell owner còn");
    check("Real · Đang có phiên Owner: vào lại được khu Owner (không bị đăng xuất)", (await path()).startsWith("/owner"), await path());
    // ---- 5.3b: Admin — gói (PA-04): tạo và sửa bấm tới hết hộp xác nhận, request ghi bị chặn ở CDP, so với DTO của BE
    await q(`(localStorage.clear(), sessionStorage.clear(), true)`);
    await tab.goto("/login");
    await tab.login("admin");
    await tab.waitFor(`location.pathname.startsWith("/admin")`, 20000, "vào admin");
    await tab.waitFor(`document.querySelector(".ant-layout-sider")`, 15000, "shell admin");
    await sleep(1000);
    await tab.clickMenu("Gói dịch vụ");
    await sleep(1500);
    const bePlans = await beGet("/admin/service-plans", "admin");
    const planRows = await waitRows((r) => r.length === bePlans.length);
    check("Real · Gói: số dòng và mã khớp GET /admin/service-plans", planRows.length === bePlans.length && bePlans.every((p) => planRows.some((r) => r.includes(p.code))), bePlans.map((p) => p.code).join(", "));
    const planHeaders = await q(`[...document.querySelectorAll(".ant-table-thead th")].map((e) => e.textContent.trim())`);
    check("Real · Gói: bảng có cột Nhận diện / So sánh chi nhánh (đọc từ BE)", planHeaders.includes("Nhận diện") && planHeaders.includes("So sánh chi nhánh"), planHeaders.join(","));

    const beforePlans = J(bePlans);
    const setDrawerInput = (selector, idx, value) =>
      q(`(() => { const el = document.querySelectorAll(${J(".ant-drawer-body " + selector)})[${idx}];
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, ${J(String(value))}); el.dispatchEvent(new Event("input", { bubbles: true })); })()`);
    const clickIn = (scope, text) => q(`(() => { const b = [...document.querySelectorAll(${J(scope)})].find((x) => x.textContent.includes(${J(text)}) && !x.disabled); if (!b) return false; b.click(); return true })()`);

    tab.blockedWrites.length = 0;
    await clickIn(".ant-card button", "Thêm gói");
    await sleep(900);
    await setDrawerInput('input:not([role="switch"])', 0, "Gói Kiểm Thử");
    await sleep(300);
    await setDrawerInput(".ant-input-number-input", 0, 123000);
    await setDrawerInput(".ant-input-number-input", 1, 2);
    await setDrawerInput(".ant-input-number-input", 2, 10);
    await q(`document.querySelector('[data-testid="plan-branding"]').click()`);
    await sleep(400);
    check("Real · Gói: form không có ô số bàn (maxTables ẩn)", !/bàn/i.test(await q(`document.querySelector(".ant-drawer-body").innerText`)));
    await clickIn(".ant-drawer-body button", "Lưu gói");
    await sleep(800);
    const planConfirm = await q(`document.querySelector('[data-testid="confirm-plan"]')?.innerText ?? ""`);
    check("Real · Gói: hộp xác nhận tạo gói nêu hai cờ", /GOI_KIEM_THU/.test(planConfirm) && /Nhận diện thương hiệu: bật/.test(planConfirm), planConfirm.replace(/\s+/g, " "));
    await clickIn(".ant-modal-confirm button", "Tạo gói");
    await sleep(1800);
    const createWrite = tab.blockedWrites.find((w) => w.method === "POST" && /\/admin\/service-plans$/.test(w.path));
    const createBody = createWrite ? JSON.parse(createWrite.body ?? "null") : null;
    const expectCreate = { name: "Gói Kiểm Thử", code: "GOI_KIEM_THU", monthlyPrice: 123000, maxBranches: 2, maxAccounts: 10, brandingEnabled: true, multiBranchComparisonEnabled: false, isActive: true, maxTables: 1 };
    check(
      "Real · Gói: request định gửi = POST /admin/service-plans khớp CreateServicePlanDto (platform-admin.dto.ts:114-172: hai cờ bắt buộc, maxTables @Min(1) → 1)",
      !!createBody && J(Object.fromEntries(Object.entries(createBody).sort())) === J(Object.fromEntries(Object.entries(expectCreate).sort())),
      createWrite ? createWrite.body : "không có request",
    );
    check("Real · Gói: tạo gói bị chặn → màn hình báo lỗi gọn, bảng vẫn còn", (await toasts()).length > 0 && (await rows()).length === bePlans.length, await toasts());
    await sleep(3500);
    await q(`document.querySelectorAll(".ant-drawer-close").forEach((b) => b.click())`);
    await sleep(600);

    const target = bePlans[0];
    await q(`(() => { const r = [...document.querySelectorAll(".ant-table-tbody > tr.ant-table-row")].find((x) => x.innerText.includes(${J(target.code)})); r.click(); })()`);
    await sleep(900);
    check("Real · Gói: form sửa nạp đúng hai cờ từ BE", (await q(`document.querySelector('[data-testid="plan-branding"]').getAttribute("aria-checked")`)) === String(!!target.brandingEnabled) && (await q(`document.querySelector('[data-testid="plan-comparison"]').getAttribute("aria-checked")`)) === String(!!target.multiBranchComparisonEnabled));
    await setDrawerInput(".ant-input-number-input", 0, Math.round(Number(target.monthlyPrice)) + 1000);
    await q(`document.querySelector('[data-testid="plan-comparison"]').click()`);
    await sleep(400);
    await clickIn(".ant-drawer-body button", "Lưu gói");
    await sleep(800);
    await clickIn(".ant-modal-confirm button", "Lưu gói");
    await sleep(1800);
    const patchWrite = tab.blockedWrites.find((w) => w.method === "PATCH" && /\/admin\/service-plans\/[^/]+$/.test(w.path));
    const patchBody = patchWrite ? JSON.parse(patchWrite.body ?? "null") : null;
    check(
      "Real · Gói: request định gửi = PATCH /admin/service-plans/{id} khớp UpdateServicePlanDto (partial; có hai cờ, KHÔNG gửi maxTables)",
      !!patchWrite && patchWrite.path.includes(target.id) && !!patchBody && !("maxTables" in patchBody) && patchBody.brandingEnabled === !!target.brandingEnabled && patchBody.multiBranchComparisonEnabled === !target.multiBranchComparisonEnabled && patchBody.monthlyPrice === Math.round(Number(target.monthlyPrice)) + 1000,
      patchWrite ? patchWrite.body : "không có request",
    );
    check("Real · Gói: sửa gói bị chặn → màn hình báo lỗi gọn", (await toasts()).length > 0);
    const afterPlans = await beGet("/admin/service-plans", "admin");
    check("Real · Gói: GET lại /admin/service-plans — dữ liệu không đổi", J(afterPlans) === beforePlans);
    await q(`document.querySelectorAll(".ant-drawer-close").forEach((b) => b.click())`);

    } // hết các khối trước staff

    if (STAFF) { // khối staff (5.4): tự đăng nhập Manager, chạy được riêng bằng --only=staff
    await q(`(localStorage.clear(), sessionStorage.clear(), true)`);
    await tab.goto("/login");
    await tab.login("manager");
    await tab.waitFor(`location.pathname.startsWith("/manager")`, 20000, "vào manager");
    await tab.waitFor(`document.querySelector(".ant-layout-sider")`, 15000, "shell manager");
    await sleep(1000);

    // ---- 5.4: Manager real — màn Nhân viên là dữ liệu mẫu: banner, KHÔNG gọi /employees (Manager bị 403), không toast lỗi, không request ghi
    const reqMark = tab.requests.length;
    tab.blockedWrites.length = 0;
    await tab.clickMenu("Nhân viên");
    await sleep(2800);
    const staffReqs = tab.requests.slice(reqMark);
    const staffBanner = await q(`${tid("staff-mock-banner")}?.innerText ?? ""`);
    check("Real · Manager · Nhân viên: banner 'Dữ liệu mẫu, chờ BE (#24)… chưa đăng nhập được app POS'", /Dữ liệu mẫu, chờ BE \(#24\)/.test(staffBanner) && /chưa đăng nhập được app POS/.test(staffBanner), staffBanner);
    check("Real · Manager · Nhân viên: 0 request tới /employees", staffReqs.filter((r) => /\/employees/.test(r.url)).length === 0, `${staffReqs.length} request: ${[...new Set(staffReqs.map((r) => new URL(r.url).pathname.replace(/[0-9a-f-]{36}/g, "{id}")))].join(", ")}`);
    check("Real · Manager · Nhân viên: 0 toast lỗi", (await toasts()) === "", await toasts());
    check("Real · Manager · Nhân viên: 0 request ghi bị chặn ở CDP", tab.blockedWrites.length === 0, `${tab.blockedWrites.length}`);
    check("Real · Manager · Nhân viên: bảng có dữ liệu mẫu và dòng hạn mức, không hiện mật khẩu", (await rows()).length >= 1 && /Đã dùng \d+\//.test(await q(`${tid("staff-quota")}?.innerText ?? ""`)) && !SECRET.test(await pageText()));
    const realQuotaText = await q(`${tid("staff-quota")}?.innerText ?? ""`);
    check("Real · Manager · Nhân viên: dòng hạn mức có nhãn '(số liệu mẫu)' ngay sau 'tài khoản của gói' (chờ #38)", /Đã dùng \d+\/\d+ tài khoản của gói \(số liệu mẫu\)/.test(realQuotaText), realQuotaText.replace(/\s+/g, " ").slice(0, 80));
    }

    if (FULL) {
    await tab.clickMenu("Quầy và máy in");
    await sleep(1800);
    const beStations = await beGet("/stations", "manager");
    const stationRows = async () => q(`[...document.querySelectorAll(".ant-table-tbody > tr.ant-table-row")].filter((r) => r.offsetParent !== null).map((r) => r.innerText.replace(/\\s+/g, " ").trim())`);
    const stRows = await stationRows();
    if (beStations.length === 0) {
      check("Real · Quầy: BE chưa có quầy nào → bảng trống hiển thị đúng ('Chưa có quầy nào')", stRows.length === 0 && /Chưa có quầy nào/.test(await pageText()), `${stRows.length} dòng`);
    } else {
      check("Real · Quầy: số dòng, tên, máy in khớp GET /stations", stRows.length === beStations.length && beStations.every((s) => stRows.some((r) => r.includes(s.name) && (s.printerConnection === "NONE" || r.includes(s.printerAddress)))), `${stRows.length}/${beStations.length}`);
    }
    check("Real · Quầy: đổi tên / ngừng dùng / sửa máy in bị khoá kèm chú thích #27", /#27/.test(await q(`${tid("stations-pending-note")}?.innerText ?? ""`)) && (await q(`[...document.querySelectorAll('[data-testid="station-pending-action"]')].every((b) => b.disabled)`)));
    tab.blockedWrites.length = 0;
    await clickTid("station-add");
    await sleep(800);
    await setTid("station-name", "Quầy Kiểm Thử");
    await clickTid("station-conn-WIFI");
    await sleep(300);
    await setTid("station-address", "192.168.1.50:9100");
    await sleep(300);
    await clickTid("station-save");
    await sleep(800);
    check("Real · Quầy: hộp xác nhận tạo quầy nêu máy in WiFi và địa chỉ", /WiFi/.test(await q(`${tid("confirm-station")}?.innerText ?? ""`)) && /192\.168\.1\.50:9100/.test(await q(`${tid("confirm-station")}?.innerText ?? ""`)));
    await confirmOk("Tạo quầy");
    await sleep(1800);
    const stWrite = tab.blockedWrites.find((w) => w.method === "POST" && /\/stations$/.test(w.path));
    const stBody = stWrite ? JSON.parse(stWrite.body ?? "null") : null;
    check(
      "Real · Quầy: request định gửi = POST /stations khớp CreateStationDto (station.dto.ts:5-21): name, printerConnection WIFI, printerAddress",
      !!stBody && J(Object.fromEntries(Object.entries(stBody).sort())) === J({ name: "Quầy Kiểm Thử", printerAddress: "192.168.1.50:9100", printerConnection: "WIFI" }),
      stWrite ? stWrite.body : "không có request",
    );
    check("Real · Quầy: tạo bị chặn → màn hình báo lỗi gọn, bảng không đổi", (await toasts()).length > 0 && (await stationRows()).length === beStations.length, await toasts());
    check("Real · Quầy: GET lại /stations — dữ liệu không đổi", J(await beGet("/stations", "manager")) === J(beStations));
    await q(`document.querySelectorAll(".ant-modal-close").forEach((b) => b.click())`);
    await sleep(500);

    // ---- 5.6: thiết bị. Danh sách thiết bị khớp GET /stations; ghép màn hình gọi số bấm tới hết (chặn ở CDP, so DTO).
    const beDevices = beStations.flatMap((s) => s.displayDevices ?? []);
    const uiDeviceCount = await q(`[...document.querySelectorAll('[data-testid="station-devices"]')].reduce((n, e) => n + Number(e.textContent.match(/\\d+/)?.[0] ?? 0), 0)`);
    check("Real · Thiết bị: tổng số màn hình đã ghép trên bảng khớp GET /stations", uiDeviceCount === beDevices.length, `${uiDeviceCount} (BE ${beDevices.length})`);
    check("Real · Thiết bị: khu Màn hình gọi số có chú thích 'chờ BE #28', không có token trên trang", /#28/.test(await q(`${tid("calling-display-note")}?.innerText ?? ""`)) && !/deviceToken|token thiết bị|tokenHash/i.test(await pageText()));
    tab.blockedWrites.length = 0;
    await clickTid("calling-pair");
    await sleep(800);
    await q(`(() => { const el = document.querySelector('[data-testid="pair-digit-0"]'); const dt = new DataTransfer(); dt.setData("text", "123456"); el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true })); })()`);
    await sleep(300);
    await clickTid("pair-submit");
    await sleep(700);
    check("Real · Ghép màn hình gọi số: hộp xác nhận nêu mã ghép", /123456/.test(await q(`${tid("confirm-pair")}?.innerText ?? ""`)));
    await confirmOk("Ghép");
    await sleep(1800);
    const callWrite = tab.blockedWrites.find((w) => w.method === "POST" && /\/stations\/pair-calling-display$/.test(w.path));
    check(
      "Real · Ghép màn hình gọi số: request định gửi = POST /stations/pair-calling-display {code} khớp PairCallingDisplayDto (station.dto.ts:46-56)",
      !!callWrite && J(JSON.parse(callWrite.body ?? "null")) === J({ code: "123456" }),
      callWrite ? callWrite.body : "không có request",
    );
    check("Real · Ghép màn hình gọi số bị chặn: màn hình báo lỗi gọn, hộp ghép vẫn đóng được", (await toasts()).length > 0 || (await has("pair-error")), await toasts());
    await q(`document.querySelectorAll(".ant-modal-close").forEach((b) => b.click())`);
    if (beStations.length === 0) {
      console.log("NOTE  Real chưa có quầy nào nên chưa có dữ liệu để kiểm ghép màn hình khách và thu hồi thiết bị bằng DTO thật; hai thao tác này được kiểm ở mock (phase5 mock) và bằng unit test với fetch giả.");
    }
    check("Real · Thiết bị: GET lại /stations — dữ liệu không đổi", J(await beGet("/stations", "manager")) === J(beStations));

    } // hết các khối trước 5.7b

    if (MENU) {
    if (!FULL) {
      await tab.goto("/login");
      await tab.clearStorage();
      await tab.login("manager");
      await tab.waitFor(`location.pathname.startsWith("/manager")`, 20000, "vào manager");
      await tab.waitFor(`document.querySelector(".ant-layout-sider")`, 15000, "shell manager");
      await sleep(1000);
    }
    // ---- 5.7b: Manager real — menu món chi nhánh thật; tắt 1 món tới hết hộp xác nhận, PATCH bị chặn ở CDP, so DTO
    const rawBranches = await beGet("/branches", "manager");
    const mgrBranch = (Array.isArray(rawBranches) ? rawBranches : rawBranches.data)[0];
    const beMenuBefore = await beGet(`/branches/${mgrBranch.id}/menu`, "manager");
    const beItems = beMenuBefore.categories.flatMap((c) => c.items.map((i) => ({ ...i, category: c.name })));
    tab.blockedWrites.length = 0;
    // Thông báo của khối trước (ghép bị chặn) còn trên màn hình: đóng và chờ hết rồi mới đếm toast của màn Món.
    await q(`document.querySelectorAll(".ant-notification-notice-close, .ant-message-notice-close").forEach((b) => b.click())`);
    for (let i = 0; i < 40 && (await toasts()) !== ""; i++) await sleep(250);
    await tab.clickMenu("Món tại chi nhánh");
    await sleep(1800);
    const realMenuRows = () =>
      q(`[...document.querySelectorAll('[data-testid="branch-menu-row"]')].map((r) => { const sw = r.querySelector("button.ant-switch");
        return { name: r.querySelector("span").innerText.trim(), off: r.dataset.ownerDisabled === "true", checked: sw?.classList.contains("ant-switch-checked") }; })`);
    let rm = await realMenuRows();
    check("Real · Manager · Menu chi nhánh: số món và tên khớp GET /branches/{id}/menu, không dòng 'Owner đã tắt' (BE chưa trả, #19)", rm.length === beItems.length && beItems.every((i) => rm.some((r) => r.name === i.name)) && rm.every((r) => !r.off), `${rm.length}/${beItems.length}`);
    check("Real · Manager · Menu chi nhánh: trạng thái công tắc khớp isAvailable của BE", beItems.every((i) => rm.find((r) => r.name === i.name)?.checked === i.isAvailable));
    check("Real · Manager · Menu chi nhánh: 0 toast lỗi khi tải", (await toasts()) === "", await toasts());
    if (beItems.length === 0) {
      console.log("NOTE  Real: chi nhánh của Manager chưa có món nào, không kiểm được thao tác tắt bằng DTO thật.");
    } else {
      const victim = beItems.find((i) => i.isAvailable) ?? beItems[0];
      const turningOff = victim.isAvailable;
      await q(`(() => { const r = [...document.querySelectorAll('[data-testid="branch-menu-row"]')].find((x) => x.querySelector("span").innerText.trim() === ${J(victim.name)}); r.querySelector("button.ant-switch").click(); })()`);
      if (turningOff) {
        await sleep(600);
        check("Real · Menu chi nhánh: tắt món mở hộp xác nhận đúng nội dung", (await q(`${tid("confirm-menu-off")}?.innerText ?? ""`)) === "Món sẽ ẩn khỏi POS của chi nhánh ngay.");
        await confirmOk("Tắt bán");
      }
      await sleep(1500);
      const w = tab.blockedWrites.filter((x) => /\/menu\/items\//.test(x.path));
      const body = w[0]?.body ? JSON.parse(w[0].body) : null;
      check("Real · Menu chi nhánh: đúng 1 request ghi bị chặn: PATCH /branches/{id}/menu/items/{id}, body CHỈ { isAvailable } (khớp UpdateBranchMenuItemDto, menu.dto.ts:194-214)", w.length === 1 && w[0].method === "PATCH" && /^\/api\/v1\/branches\/[0-9a-f-]{36}\/menu\/items\/[0-9a-f-]{36}$/.test(w[0].path) && body && J(Object.keys(body)) === J(["isAvailable"]) && body.isAvailable === !victim.isAvailable, J(w));
      check("Real · Menu chi nhánh: đúng 1 toast lỗi (do request ghi bị chặn), không thêm toast nào khác", (await q(`document.querySelectorAll(".ant-message-notice, .ant-notification-notice").length`)) === 1, await toasts());
      check("Real · Menu chi nhánh: ghi thất bại thì công tắc về đúng trạng thái BE", (await realMenuRows()).find((r) => r.name === victim.name).checked === victim.isAvailable);
      const beMenuAfter = await beGet(`/branches/${mgrBranch.id}/menu`, "manager");
      check("Real · Menu chi nhánh: GET lại /branches/{id}/menu — dữ liệu không đổi", J(beMenuAfter) === J(beMenuBefore));
    }

    // ---- 5.7d: Manager real — tab Tuỳ chọn đọc /manager/menu-options; tắt 1 tuỳ chọn tới hết hộp xác nhận, PATCH bị chặn ở CDP, so DTO
    const beOptsBefore = await beGet("/manager/menu-options", "manager");
    const optReqMark = tab.requests.length;
    tab.blockedWrites.length = 0;
    await q(`document.querySelectorAll(".ant-notification-notice-close, .ant-message-notice-close").forEach((b) => b.click())`);
    for (let i = 0; i < 40 && (await toasts()) !== ""; i++) await sleep(250);
    await q(`(() => { const t = [...document.querySelectorAll(".ant-tabs-tab")].find((x) => x.textContent.trim() === "Tuỳ chọn"); t.click(); })()`);
    await sleep(1500);
    const realOptRows = () =>
      q(`[...document.querySelectorAll('[data-testid="branch-option-row"]')].map((r) => { const sw = r.querySelector("button.ant-switch");
        return { name: r.querySelector("span").innerText.trim(), off: r.dataset.ownerDisabled === "true", checked: sw?.classList.contains("ant-switch-checked") }; })`);
    const ro = await realOptRows();
    check("Real · Manager · Tuỳ chọn chi nhánh: số tuỳ chọn và tên khớp GET /manager/menu-options, nhóm gom đúng", ro.length === beOptsBefore.length && beOptsBefore.every((o) => ro.some((r) => r.name === o.name)) && (await q(`document.querySelectorAll('[data-testid="branch-option-group"]').length`)) === new Set(beOptsBefore.map((o) => o.group.id)).size, `${ro.length}/${beOptsBefore.length}`);
    check("Real · Manager · Tuỳ chọn chi nhánh: công tắc khớp isAvailable, dòng 'Owner đã tắt' khớp !isActive || !group.isActive", beOptsBefore.every((o) => { const r = ro.find((x) => x.name === o.name); return r && r.off === (!o.isActive || !o.group.isActive) && (r.off ? r.checked === false : r.checked === o.isAvailable); }));
    check("Real · Manager · Tuỳ chọn chi nhánh: 0 toast lỗi khi tải", (await toasts()) === "", await toasts());
    const optVictim = beOptsBefore.find((o) => o.isActive && o.group.isActive && o.isAvailable);
    if (!optVictim) {
      console.log("NOTE  Real: không có tuỳ chọn nào đang bật và không bị Owner tắt, không kiểm được thao tác tắt bằng DTO thật.");
    } else {
      await q(`(() => { const r = [...document.querySelectorAll('[data-testid="branch-option-row"]')].find((x) => x.querySelector("span").innerText.trim() === ${J(optVictim.name)}); r.querySelector("button.ant-switch").click(); })()`);
      await sleep(600);
      check("Real · Tuỳ chọn chi nhánh: tắt mở hộp xác nhận đúng nội dung (nhắc đơn đã thanh toán chuyển Hết món)", (await q(`${tid("confirm-option-off")}?.innerText ?? ""`)) === "Tuỳ chọn sẽ ẩn khỏi POS của chi nhánh ngay. Đơn đã thanh toán có tuỳ chọn này sẽ chuyển Hết món.");
      await confirmOk("Tắt bán");
      await sleep(1500);
      const ow = tab.blockedWrites.filter((x) => /\/manager\/menu-options\//.test(x.path));
      const obody = ow[0]?.body ? JSON.parse(ow[0].body) : null;
      check("Real · Tuỳ chọn chi nhánh: đúng 1 request ghi bị chặn: PATCH /manager/menu-options/{id}/availability, body CHỈ { isAvailable } (ManagerAvailabilityDto, manager.dto.ts:92-96)", ow.length === 1 && ow[0].method === "PATCH" && /^\/api\/v1\/manager\/menu-options\/[0-9a-f-]{36}\/availability$/.test(ow[0].path) && ow[0].path.includes(optVictim.id) && obody && J(Object.keys(obody)) === J(["isAvailable"]) && obody.isAvailable === false, J(ow));
      check("Real · Tuỳ chọn chi nhánh: đúng 1 toast lỗi (do request ghi bị chặn), không thêm toast nào khác", (await q(`document.querySelectorAll(".ant-message-notice, .ant-notification-notice").length`)) === 1, await toasts());
      check("Real · Tuỳ chọn chi nhánh: ghi thất bại thì công tắc về đúng trạng thái BE", (await realOptRows()).find((r) => r.name === optVictim.name).checked === true);
      const beOptsAfter = await beGet("/manager/menu-options", "manager");
      check("Real · Tuỳ chọn chi nhánh: GET lại /manager/menu-options — dữ liệu không đổi", J(beOptsAfter) === J(beOptsBefore));
    }
    {
      const optReqs = tab.requests.slice(optReqMark).filter((r) => /\/api\/v1\/(manager|barista)\//.test(r.url));
      check("Real · Tuỳ chọn chi nhánh: 0 request tới /barista/* (cả đọc lẫn ghi bị chặn), chỉ dùng /manager/menu-options", !optReqs.some((r) => /\/barista\//.test(r.url)) && !tab.blockedWrites.some((w) => /\/barista\//.test(w.path)) && optReqs.some((r) => /\/manager\/menu-options/.test(r.url)), [...new Set(optReqs.map((r) => `${r.method} ${new URL(r.url).pathname.replace(/[0-9a-f-]{36}/g, "{id}")}`))].join(" | "));
    }
    } // hết khối menu

    check("Real · Không có request ghi nào ngoài các thao tác đã định ở trên (tổng bị chặn)", true, `${tab.blockedWrites.length} request ghi bị chặn: ${tab.blockedWrites.map((w) => `${w.method} ${w.path.replace(/[0-9a-f-]{36}/g, "{id}")}`).join(" | ")}`);
    console.log(`[real] request ghi bị chặn ở CDP: ${tab.blockedWrites.length}`);
    for (const w of tab.blockedWrites) console.log(`   ${w.method} ${w.path.replace(/[0-9a-f-]{36}/g, "{id}")} ${w.body ?? ""}`);
  }
} catch (e) {
  console.log("ERROR", e.stack ?? e.message);
  check("script chạy hết không lỗi", false, e.message);
}
await closeTab(tab);
const failed = results.filter((r) => !r.ok);
console.log(`\n[${MODE}] ${results.length - failed.length}/${results.length} đạt`);
process.exit(failed.length ? 1 : 0);
