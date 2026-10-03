// 5.8d — Bảo vệ form khi Thử lại + thông báo 400 theo ô, trên BE thật (cổng 5173), CHỈ ĐỌC.
//   node scripts/browser/phase58-forms.mjs [--only=retry|validation]
// Mọi request ghi bị chặn ở CDP; request ghi chỉ nhận lỗi giả (400 với body validate đúng shape của BE), không bao giờ tới BE.
//   retry:      owner/menu — mở form thêm món, nhập dở, giả lập đọc lỗi mạng, bấm Thử lại → hộp xác nhận; Huỷ → form còn nguyên; đồng ý → nạp lại.
//   validation: owner/menu — gửi form thêm món, giả lập 400 với message mảng của class-validator → thông báo tiếng Việt đúng ô.
import { check, cli, closeTab, newTab, results, sleep, SESSION_ALLOW } from "./cdp.mjs";

const ONLY = cli().only;
const want = (name) => !ONLY || ONLY.includes(name);
const J = JSON.stringify;
const tab = await newTab("about:blank", "real");
const q = (expr) => tab.eval(expr);
await tab.blockWrites(SESSION_ALLOW);

const drawer = `document.querySelector(".ant-drawer-body")`;
const toasts = () => q(`[...document.querySelectorAll(".ant-message-notice, .ant-notification-notice")].map((e) => e.innerText.replace(/\\s+/g, " ").trim()).join(" | ")`);
const rows = () => q(`document.querySelectorAll(".ant-table-tbody > tr.ant-table-row").length`);
const setInput = (scopeExpr, selector, value, index = 0) =>
  q(`(() => { const el = (${scopeExpr}).querySelectorAll(${J(selector)})[${index}];
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement : HTMLInputElement;
    Object.getOwnPropertyDescriptor(proto.prototype, "value").set.call(el, ${J(String(value))});
    el.dispatchEvent(new Event("input", { bubbles: true })); })()`);
const clickBtn = (scope, text) =>
  q(`(() => { const b = [...document.querySelectorAll(${J(scope)})].find((x) => x.textContent.includes(${J(text)}) && !x.disabled); if (!b) return false; b.click(); return true })()`);
async function pickSelect(scopeExpr, optionText, index = 0) {
  await q(`(() => { const sel = (${scopeExpr}).querySelectorAll(".ant-select-content, .ant-select-selector")[${index}]; sel.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); })()`);
  await sleep(350);
  const ok = await q(`(() => { const o = [...document.querySelectorAll(".ant-select-item-option")].find((e) => e.textContent.includes(${J(optionText)})); if (!o) return false; o.click(); return true; })()`);
  await sleep(600);
  return ok;
}
const clearNotices = async () => {
  await q(`document.querySelectorAll(".ant-notification-notice-close, .ant-message-notice-close").forEach((b) => b.click())`);
  for (let i = 0; i < 24 && (await toasts()) !== ""; i++) await sleep(250);
};
const spaGo = async (to) => {
  await q(`(() => { history.pushState({}, "", ${J(to)}); dispatchEvent(new PopStateEvent("popstate")); })()`);
  await sleep(900);
};
const retryBtn = () => q(`!![...document.querySelectorAll('[data-testid="api-error-retry"]')].find((b) => b.offsetParent !== null)`);
const modalTitle = () => q(`[...document.querySelectorAll(".ant-modal-confirm-title")].filter((e) => e.offsetParent !== null).map((e) => e.textContent).join("|")`);

try {
  await tab.goto("/login");
  await tab.clearStorage();
  await tab.login("owner");
  await tab.waitFor(`location.pathname.startsWith("/owner")`, 20000, "vào owner");
  await tab.waitFor(`document.querySelector(".ant-layout-sider")`, 15000, "shell owner");
  await sleep(1200);
  await spaGo("/owner/plan");
  await spaGo("/owner/menu");
  await tab.waitFor(`document.querySelectorAll(".ant-table-tbody > tr.ant-table-row").length > 0`, 10000, "bảng món");
  await sleep(800);

  if (want("retry")) {
    const rowsBefore = await rows();
    // 1. mở form thêm món, nhập dở
    await clickBtn(".ant-card button", "Thêm món");
    await tab.waitFor(`!!(${drawer})`, 8000, "drawer mở");
    await sleep(600);
    await setInput(drawer, "input", "Món nhập dở không được mất", 1);
    await sleep(300);
    const typed = () => q(`${drawer}?.querySelectorAll("input")[1]?.value ?? null`);
    check("Form thêm món: đã nhập dở (tên có trong ô)", (await typed()) === "Món nhập dở không được mất");

    // 2. giả lập đọc lỗi mạng cho danh sách món rồi kích hoạt một lần đọc (tìm kiếm)
    await clearNotices();
    tab.setFault({ kind: "network", match: /\/menu\/items/ });
    await setInput(`document`, ".ant-input-search input", "ca");
    await q(`document.querySelector(".ant-input-search .ant-btn, .ant-input-search-button")?.click()`);
    await sleep(1500);
    check("Đọc lỗi mạng → có thông báo kèm nút Thử lại", await retryBtn(), await toasts());
    tab.setFault(null);

    // 3. bấm Thử lại → hộp xác nhận (form đang nhập dở)
    const mark = tab.requests.length;
    await q(`document.querySelector('[data-testid="api-error-retry"]').click()`);
    await sleep(900);
    check("Bấm Thử lại khi form dở → hộp 'Nội dung đang nhập sẽ mất. Vẫn tải lại?'", (await modalTitle()).includes("Nội dung đang nhập sẽ mất. Vẫn tải lại?"), await modalTitle());
    check("Chưa nạp lại gì khi hộp còn mở (không có request đọc món nào)", tab.requests.slice(mark).filter((r) => /\/menu\/items/.test(r.url)).length === 0);

    // 4. Huỷ → form còn nguyên, thông báo lỗi còn, không nạp lại
    await q(`[...document.querySelectorAll(".ant-modal-confirm button")].find((b) => b.textContent.trim() === "Huỷ")?.click()`);
    await sleep(900);
    check("Huỷ: form giữ nguyên nội dung đã nhập", (await typed()) === "Món nhập dở không được mất", String(await typed()));
    check("Huỷ: thông báo lỗi và nút Thử lại còn để bấm lại sau", await retryBtn());
    check("Huỷ: không có request đọc món nào", tab.requests.slice(mark).filter((r) => /\/menu\/items/.test(r.url)).length === 0);

    // 5. bấm lại, đồng ý → nạp lại (form bị dựng lại nên mất)
    await q(`document.querySelector('[data-testid="api-error-retry"]').click()`);
    await sleep(900);
    await q(`[...document.querySelectorAll(".ant-modal-confirm button")].find((b) => b.textContent.trim() === "Tải lại")?.click()`);
    await sleep(2800);
    const reread = tab.requests.slice(mark).filter((r) => r.method === "GET" && /\/menu\/items/.test(r.url)).length;
    check("Đồng ý: màn nạp lại (có request đọc món)", reread >= 1, `${reread} request`);
    check("Đồng ý: danh sách món nạp lại đủ và form nhập dở đã đóng", (await rows()) === rowsBefore && !(await q(`!!(${drawer})`)), `${await rows()}/${rowsBefore}`);
    check("Không còn thông báo lỗi sau khi nạp lại được", (await toasts()) === "", await toasts());

    // 6. không có form dở → nạp lại ngay, không hỏi
    await clearNotices();
    tab.setFault({ kind: "network", match: /\/menu\/items/ });
    await setInput(`document`, ".ant-input-search input", "tra");
    await q(`document.querySelector(".ant-input-search .ant-btn, .ant-input-search-button")?.click()`);
    await sleep(1500);
    tab.setFault(null);
    const mark2 = tab.requests.length;
    await q(`document.querySelector('[data-testid="api-error-retry"]')?.click()`);
    await sleep(2500);
    check("Không có form dở: bấm Thử lại nạp ngay, không hỏi", (await modalTitle()) === "" && tab.requests.slice(mark2).filter((r) => r.method === "GET" && /\/menu\/items/.test(r.url)).length >= 1);
  }

  if (want("validation")) {
    await clearNotices();
    await spaGo("/owner/plan");
    await spaGo("/owner/menu");
    await tab.waitFor(`document.querySelectorAll(".ant-table-tbody > tr.ant-table-row").length > 0`, 10000, "bảng món");
    await clickBtn(".ant-card button", "Thêm món");
    await tab.waitFor(`!!(${drawer})`, 8000, "drawer mở");
    await sleep(600);
    await pickSelect(drawer, "Cà phê", 0);
    await setInput(drawer, "input", "Món Thử Validate", 1);
    await sleep(300);
    await setInput(drawer, ".ant-input-number input", "33000");
    await sleep(400);
    tab.blockedWrites.length = 0;
    // Body thật của ValidationPipe (BE `app.setup.ts`): message là mảng "<ô> <luật>" của class-validator.
    tab.setFault({
      kind: "400",
      match: /^$/,
      body: { statusCode: 400, message: ["name should not be empty", "sku must be shorter than or equal to 50 characters", "price must not be less than 0", "property foo should not exist"], error: "Bad Request" },
    });
    await clickBtn(".ant-drawer-body button", "Thêm món");
    await sleep(900);
    await q(`document.querySelector(".ant-modal-confirm .ant-btn-primary")?.click()`);
    await sleep(1800);
    const text = await toasts();
    tab.setFault(null);
    const sent = tab.blockedWrites.filter((w) => w.method === "POST" && /\/menu\/items$/.test(w.path));
    check("Gửi form: đúng 1 request ghi POST /menu/items bị chặn trước BE (nhận 400 giả)", sent.length === 1, J(sent.map((w) => w.path)));
    check("400 validate → thông báo tiếng Việt theo từng ô", /Tên không được để trống/.test(text) && /Mã SKU tối đa 50 ký tự/.test(text) && /Giá không được nhỏ hơn 0/.test(text), text);
    check("400 validate: không lộ tiếng Anh thô (không có 'should', 'must', 'property')", !/should|must be|property|Bad Request/i.test(text), text);
    check("400 validate: form còn mở, dữ liệu đã nhập còn nguyên", (await q(`${drawer}?.querySelectorAll("input")[1]?.value ?? null`)) === "Món Thử Validate");
    check("400 validate: thông báo hiện đúng 1 lần", (await q(`document.querySelectorAll(".ant-message-notice").length`)) === 1, text);
  }
} catch (e) {
  console.log("ERROR", e.stack ?? e.message);
  check("script chạy hết không lỗi", false, e.message);
}
const failed = results.filter((r) => !r.ok).length;
console.log(`[forms] ${results.length - failed}/${results.length} đạt; request ghi bị chặn: ${tab.blockedWrites.length}`);
await closeTab(tab);
process.exit(0);
