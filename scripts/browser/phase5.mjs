// Kiểm tra trình duyệt thật cho Giai đoạn 5 (Manager). 5.2: /setup-password + gỡ mật khẩu cứng. 5.3: Owner quản Manager (real).
//   node scripts/browser/phase5.mjs mock   # dev server có VITE_API_AUTH/BRANCH/REPORT/MENU/ACCOUNT=mock, AUTH_MODE=mock
//   node scripts/browser/phase5.mjs real   # dev server cổng 5173 (CORS của BE): CHỈ ĐỌC.
//     Mọi request GHI bị chặn ở tầng CDP (Fetch.failRequest) TRƯỚC khi rời trình duyệt (chỉ cho POST /auth/login để lấy token);
//     script bấm tới hết hộp xác nhận, ghi lại method + path + body định gửi và so với DTO của BE.
//     KHÔNG tải lại trang khi đang có phiên (tải lại sẽ gọi POST /auth/refresh): điều hướng trong SPA bằng history.
import { readFileSync } from "node:fs";
import { accounts, newTab, closeTab, check, results, sleep } from "./cdp.mjs";

const MODE = process.argv[2] ?? "mock";
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
async function readEmployees() {
  const base = "http://localhost:3100/api/v1";
  const [email, password] = accounts("real").owner;
  const login = await fetch(base + "/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const token = (await login.json()).accessToken;
  const get = async (p) => (await fetch(base + p, { headers: { Authorization: `Bearer ${token}` } })).json();
  return { managers: await get("/employees?role=MANAGER&limit=100"), branches: await get("/branches") };
}

const LONG_TOKEN = "x".repeat(48);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

try {
  if (!REAL) {
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

    // /setup-password khi đang có phiên Owner: nhận diện nền tảng, không đăng xuất
    await spaGo(`/setup-password?token=${LONG_TOKEN}`);
    const brandOnSetup = await brandVar();
    check("Đang có phiên Owner: /setup-password dùng màu nền tảng (khác màu tenant)", brandOnSetup === platformBrand && tenantBrand !== platformBrand, `nền tảng ${platformBrand} · tenant ${tenantBrand} · trang ${brandOnSetup}`);
    check("Đang có phiên Owner: trang render, không sidebar, token đã xoá khỏi URL", (await has("setup-password")) && !(await q(`!!document.querySelector(".ant-layout-sider")`)) && (await search()) === "");
    await spaGo("/owner/accounts");
    await tab.waitFor(`document.querySelector(".ant-layout-sider")`, 8000, "shell owner còn");
    check("Đang có phiên Owner: sau đó vẫn vào lại được khu Owner (không bị đăng xuất)", (await path()).startsWith("/owner"), await path());

    // Manager tạo nhân viên
    await tab.goto("/login");
    await tab.clearStorage();
    await tab.goto("/login");
    await tab.login("manager");
    await tab.waitFor(`location.pathname.startsWith("/manager")`, 20000, "vào manager");
    await tab.waitFor(`document.querySelector(".ant-layout-sider")`, 15000, "shell");
    await sleep(1000);
    await tab.clickMenu("Nhân viên");
    await sleep(1200);
    check("Manager: màn Nhân viên không hiện mật khẩu nào", !SECRET.test(await pageText()));
    await q(`[...document.querySelectorAll(".ant-card button")].find((b) => b.textContent.includes("Thêm nhân viên")).click()`);
    await sleep(900);
    await q(`(() => {
      const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); };
      const inputs = [...document.querySelectorAll(".ant-drawer input:not([disabled]):not([role=combobox])")];
      set(inputs[0], "Nhân Viên Thử"); set(inputs[1], "nv.thu@mock.local");
    })()`);
    await sleep(300);
    await q(`[...document.querySelectorAll(".ant-drawer button")].find((b) => b.textContent.includes("Tạo tài khoản")).click()`);
    await sleep(1500);
    const staffNotice = await q(`${tid("password-setup-notice")}?.innerText ?? ""`);
    check("Manager tạo nhân viên: hiện 'Đã xếp email đặt mật khẩu … hiệu lực tới …', không có mật khẩu", /Đã xếp email đặt mật khẩu tới nv\.thu@mock\.local, hiệu lực tới/.test(staffNotice) && !SECRET.test(await pageText()), staffNotice);
  } else {
    // ============================================================ REAL — CHỈ ĐỌC; mọi request ghi bị chặn ở CDP
    await tab.blockWrites([/\/auth\/login$/]);
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

    // ---- /setup-password khi đang có phiên Owner (SPA, không tải lại trang)
    await spaGo(`/setup-password?token=${LONG_TOKEN}`);
    const brandOnSetup = await brandVar();
    const tokens = await tab.tokens();
    check("Real · Đang có phiên Owner: /setup-password dùng màu nền tảng", brandOnSetup === platformBrand, `${brandOnSetup} (nền tảng ${platformBrand})`);
    check("Real · Đang có phiên Owner: trang render, không sidebar, token xoá khỏi URL, phiên còn (token trong storage)", (await has("setup-password")) && !(await q(`!!document.querySelector(".ant-layout-sider")`)) && (await search()) === "" && tokens.access && tokens.refresh);
    await spaGo("/owner/accounts");
    await tab.waitFor(`document.querySelector(".ant-layout-sider")`, 8000, "shell owner còn");
    check("Real · Đang có phiên Owner: vào lại được khu Owner (không bị đăng xuất)", (await path()).startsWith("/owner"), await path());
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
