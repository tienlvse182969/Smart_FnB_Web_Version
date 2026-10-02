// Kiểm tra trình duyệt thật cho Giai đoạn 5 (Manager). Lượt 5.2: trang /setup-password + gỡ mật khẩu cứng.
//   node scripts/browser/phase5.mjs mock   # dev server có VITE_API_AUTH/BRANCH/REPORT/MENU=mock, AUTH_MODE=mock
//   node scripts/browser/phase5.mjs real   # dev server cổng 5173 (CORS của BE): CHỈ ĐỌC — trang render, kiểm form, KHÔNG gửi.
//                                          # Mọi request ghi bị CHẶN ở mức trang và đếm lại.
import { newTab, closeTab, check, results, sleep } from "./cdp.mjs";

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

/** Chặn mọi request không phải GET (fetch và XHR) ở mức trang và đếm lại. */
const installWriteBlocker = () =>
  q(`(() => {
    window.__blocked = [];
    const of = window.fetch;
    window.fetch = (u, init) => {
      const m = String(init?.method ?? (u && u.method) ?? "GET").toUpperCase();
      if (m !== "GET") { window.__blocked.push(m + " " + String(u?.url ?? u)); return Promise.reject(new TypeError("blocked by test")); }
      return of.call(window, u, init);
    };
    const oo = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (m, u, ...r) {
      if (String(m).toUpperCase() !== "GET") { window.__blocked.push(String(m).toUpperCase() + " " + u); u = "http://127.0.0.1:9/blocked"; }
      return oo.call(this, m, u, ...r);
    };
  })()`);

const LONG_TOKEN = "x".repeat(48);

try {
  if (!REAL) {
    // ============================================================ MOCK — trang đặt mật khẩu
    await tab.goto("/login");
    await tab.clearStorage();

    // thiếu token
    await tab.goto("/setup-password");
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

    // ============================================================ MOCK — gỡ mật khẩu cứng
    await tab.goto("/login");
    await tab.clearStorage();
    await tab.goto("/login");
    await tab.login("owner");
    await tab.waitFor(`location.pathname.startsWith("/owner")`, 20000, "vào owner");
    await tab.waitFor(`document.querySelector(".ant-layout-sider")`, 15000, "shell");
    await sleep(1000);
    await tab.clickMenu("Tài khoản quản lý");
    await sleep(1200);
    check("Owner: màn Tài khoản quản lý không hiện mật khẩu nào", !SECRET.test(await pageText()));

    await q(`[...document.querySelectorAll(".ant-card button")].find((b) => b.textContent.includes("Thêm tài khoản")).click()`);
    await sleep(900);
    await q(`(() => {
      const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); };
      const inputs = [...document.querySelectorAll(".ant-drawer input:not([disabled]):not([role=combobox])")];
      set(inputs[0], "Manager Thử"); set(inputs[1], "manager.thu@mock.local");
    })()`);
    await sleep(300);
    await q(`[...document.querySelectorAll(".ant-drawer button")].find((b) => b.textContent.includes("Tạo tài khoản")).click()`);
    await sleep(1500);
    const ownerNotice = await q(`${tid("password-setup-notice")}?.innerText ?? ""`);
    check("Owner tạo Manager: hiện 'Đã xếp email đặt mật khẩu … hiệu lực tới …', không có mật khẩu", /Đã xếp email đặt mật khẩu tới manager\.thu@mock\.local, hiệu lực tới/.test(ownerNotice) && !SECRET.test(await pageText()), ownerNotice);
    await q(`document.querySelector(".ant-modal-confirm button")?.click()`);
    await sleep(700);

    // đặt lại mật khẩu một Manager
    await q(`(() => { const r = [...document.querySelectorAll(".ant-table-tbody > tr.ant-table-row")].find((x) => x.innerText.includes("Manager Thử")); [...r.querySelectorAll("button")].find((x) => x.textContent.includes("Reset mật khẩu")).click(); })()`);
    await sleep(1500);
    const resetNotice = await q(`${tid("password-setup-notice")}?.innerText ?? ""`);
    check("Owner đặt lại mật khẩu Manager: hiện 'Email gửi tới …, hiệu lực tới …', không có mật khẩu tạm", /Email gửi tới manager\.thu@mock\.local, hiệu lực tới/.test(resetNotice) && !SECRET.test(await pageText()), resetNotice);
    await q(`document.querySelector(".ant-modal-confirm button")?.click()`);
    await sleep(500);

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
    // ============================================================ REAL — CHỈ ĐỌC, không gửi
    await tab.goto("/login");
    await tab.clearStorage();
    await tab.goto(`/setup-password?token=${LONG_TOKEN}`);
    await installWriteBlocker();
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
    await installWriteBlocker();
    check("Real · Thiếu token: báo 'Liên kết không hợp lệ'", /Liên kết không hợp lệ/.test(await pageText()) && !(await has("setup-submit")));
    const blocked = await q(`window.__blocked`);
    check("Real · Không có request ghi nào bị phát ra (đã chặn mức trang)", Array.isArray(blocked) && blocked.length === 0, `${blocked?.length ?? "?"} request ghi bị chặn`);
    console.log(`[real] request ghi bị chặn: ${blocked?.length ?? "?"}`);
  }
} catch (e) {
  console.log("ERROR", e.stack ?? e.message);
  check("script chạy hết không lỗi", false, e.message);
}
await closeTab(tab);
const failed = results.filter((r) => !r.ok);
console.log(`\n[${MODE}] ${results.length - failed.length}/${results.length} đạt`);
process.exit(failed.length ? 1 : 0);
