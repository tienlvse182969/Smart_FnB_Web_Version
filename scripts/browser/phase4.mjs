// Kiểm tra trình duyệt thật cho Giai đoạn 4.2 (danh mục + món của Owner, menu chi nhánh của Manager) và 4.3 (tuỳ chọn món, mock).
//   node scripts/browser/phase4.mjs mock   # dev server có VITE_API_MENU=mock (+ AUTH/BRANCH/REPORT=mock), AUTH_MODE=mock: CRUD đầy đủ
//   node scripts/browser/phase4.mjs real   # dev server cổng 5173 với cờ mặc định, BE chạy: CHỈ ĐỌC — không thêm/sửa/xoá/bật tắt gì
// Chế độ real so sánh với dữ liệu BE đọc bằng GET (đăng nhập demo bằng .env của BE, không in mật khẩu).
import { readFileSync } from "node:fs";
import { cli, newTab, closeTab, check, results, sleep, SESSION_ALLOW } from "./cdp.mjs";

// --mode=mock|real (hoặc đối số trần như cũ); --only=owner|manager (không cờ = chạy hết)
const CLI = cli();
const MODE = CLI.mode ?? "mock";
const want = (name) => !CLI.only || CLI.only.includes(name);
const REAL = MODE === "real";
const J = JSON.stringify;
const tab = await newTab("about:blank", REAL ? "real" : "mock");
const q = (expr) => tab.eval(expr);
// Real chỉ đọc: chặn mọi request ghi ở tầng CDP (chỉ cho đăng nhập/làm mới/đăng xuất) và in bảng tổng khi kết thúc.
if (REAL) await tab.blockWrites(SESSION_ALLOW);

const click = (sel, text) =>
  q(`(() => { const el = [...document.querySelectorAll(${J(sel)})].find((e) => !${J(text ?? "")} || e.textContent.includes(${J(text ?? "")}));
    if (!el) return false; el.click(); return true; })()`);
const visible = (sel) => `[...document.querySelectorAll(${J(sel)})].filter((w) => getComputedStyle(w).display !== "none").pop()`;
const modal = visible(".ant-modal-wrap");
const drawer = visible(".ant-drawer");

async function pickSelect(scopeExpr, optionText, index = 0) {
  await q(`(() => { const root = ${scopeExpr}; const sel = root.querySelectorAll(".ant-select-content, .ant-select-selector")[${index}];
    sel.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); })()`);
  await sleep(350);
  const ok = await q(`(() => { const o = [...document.querySelectorAll(".ant-select-item-option")].find((e) => e.textContent.includes(${J(optionText)}));
    if (!o) return false; o.click(); return true; })()`);
  await sleep(600);
  return ok;
}
const setInput = (scopeExpr, selector, value, index = 0) =>
  q(`(() => { const el = (${scopeExpr}).querySelectorAll(${J(selector)})[${index}];
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement : HTMLInputElement;
    Object.getOwnPropertyDescriptor(proto.prototype, "value").set.call(el, ${J(String(value))});
    el.dispatchEvent(new Event("input", { bubbles: true })); })()`);
const blurAll = () => q(`document.activeElement?.blur()`);
const rows = () => q(`[...document.querySelectorAll(".ant-table-tbody > tr.ant-table-row")].map((r) => r.innerText.replace(/\\s+/g, " ").trim())`);
const toasts = () => q(`[...document.querySelectorAll(".ant-message-notice, .ant-notification-notice")].map((e) => e.textContent).join(" | ")`);
/** Chờ tối đa 4 giây cho tới khi một thông báo chứa `text` xuất hiện; trả toàn bộ thông báo đang hiện. */
const waitToast = async (text) => {
  for (let i = 0; i < 16; i++) {
    const t = await toasts();
    if (t.includes(text)) return t;
    await sleep(250);
  }
  return toasts();
};
/** Chờ tới 6 giây cho tới khi có một hàng chứa `text`; trả danh sách hàng. */
const waitRowWith = async (text) => {
  for (let i = 0; i < 24; i++) {
    const r = await rows();
    if (r.some((x) => x.includes(text))) return r;
    await sleep(250);
  }
  return rows();
};
/** Chờ drawer mở hẳn (hiển thị) rồi mới thao tác. */
const openedDrawer = async () => {
  await tab.waitFor(`!!(${drawer})`, 8000, "drawer mở");
  await sleep(500);
};
const searchBox = async (text) => {
  await setInput(`document`, ".ant-input-search input", text);
  await click(".ant-input-search .ant-btn, .ant-input-search-button");
  await sleep(900);
};
const clickIn = (scopeExpr, text) =>
  q(`(() => { const root = ${scopeExpr}; const b = root && [...root.querySelectorAll("button")].find((x) => x.textContent.includes(${J(text)})); if (!b) return false; b.click(); return true })()`);
const btnState = (scopeExpr, text) =>
  q(`(() => { const root = ${scopeExpr}; const b = root && [...root.querySelectorAll("button")].find((x) => x.textContent.includes(${J(text)})); return b ? { disabled: b.disabled } : null })()`);
const rowButton = (rowText, btnText) =>
  q(`(() => { const r = [...document.querySelectorAll(".ant-table-tbody > tr.ant-table-row")].find((x) => x.innerText.includes(${J(rowText)}));
    const b = r && [...r.querySelectorAll("button")].find((x) => x.textContent.includes(${J(btnText)}) || x.getAttribute("aria-label") === ${J(btnText)}); if (!b) return false; b.click(); return true })()`);
const confirmModal = async (okText) => {
  await sleep(500);
  return q(`(() => { const b = [...document.querySelectorAll(".ant-modal-confirm button")].find((x) => x.textContent.includes(${J(okText)})); if (!b) return false; b.click(); return true })()`);
};
const login = async (role) => {
  await tab.goto("/login");
  await tab.clearStorage();
  await tab.goto("/login");
  await tab.login(role);
  await tab.waitFor(`location.pathname.startsWith("/${role === "manager" ? "manager" : "owner"}")`, 20000, "vào " + role);
  await tab.waitFor(`document.querySelector(".ant-layout-sider")`, 15000, "shell");
  await sleep(1200);
};
const tid = (id) => `document.querySelector('[data-testid=${J(id)}]')`;
const clickTid = (id) => q(`(() => { const el = ${tid(id)}; if (!el) return false; el.click(); return true })()`);
const has = (id) => q(`!!${tid(id)}`);
const digits = (x) => String(x).replace(/\D/g, "");
const groupModalErrors = () => q(`${tid("group-errors")}?.innerText ?? ""`);
const saveDisabled = () => q(`${tid("group-save")}?.disabled`);
// --- màn tuỳ chọn (6.2b): mỗi dòng tuỳ chọn nằm trong chi tiết nhóm và lưu ngay ---
const detailOf = (code) => `document.querySelector('[data-testid="group-detail-${code}"]')`;
const expandGroup = async (name) => {
  await q(`(() => { const r = [...document.querySelectorAll(".ant-table-tbody > tr.ant-table-row")].find((x) => x.innerText.includes(${J(name)})); const i = r?.querySelector(".ant-table-row-expand-icon-collapsed"); if (i) i.click(); })()`);
  await sleep(500);
};
const optRows = (code) =>
  q(`[...(${detailOf(code)})?.querySelectorAll('[data-testid="option-row"]') ?? []].map((r) => ({ code: r.dataset.code, name: r.querySelector('[data-testid="opt-name"]').value, price: r.querySelector('[data-testid="opt-price"]').value, active: r.querySelector(".ant-switch")?.getAttribute("aria-checked") === "true", saveDisabled: r.querySelector('[data-testid="opt-save"]').disabled, text: r.innerText.replace(/\\s+/g, " ").trim() }))`);
const clickDetail = (code, sel) => q(`(() => { const el = (${detailOf(code)})?.querySelector(${J(sel)}); if (!el) return false; el.click(); return true })()`);
const rowField = (code, optCode, field, value) => setInput(detailOf(code), `[data-testid="option-row"][data-code="${optCode}"] [data-testid="${field}"]`, value);
const clickDefault = (code, optCode) =>
  q(`(() => { const el = (${detailOf(code)}).querySelector('[data-testid="option-row"][data-code="${optCode}"] [data-testid="opt-default"]'); (el.matches("input") ? el : el.querySelector("input")).click(); })()`);
/** Chờ (tối đa 6 giây) tới khi thứ tự mã tuỳ chọn của nhóm đúng như `want`; lệnh patch và nạp lại có độ trễ giả lập. */
const waitOptCodes = async (code, want) => {
  for (let i = 0; i < 24; i++) {
    if (J((await optRows(code)).map((r) => r.code)) === J(want)) return;
    await sleep(250);
  }
};
/** Thêm một tuỳ chọn bằng dòng thêm mới của chi tiết nhóm (mở dòng nếu chưa mở), bấm Lưu: MỘT lệnh. */
const addOptionUI = async (groupCode, name, priceNum) => {
  if (!(await q(`!!(${detailOf(groupCode)})?.querySelector('[data-testid="option-row-new"]')`))) {
    await clickDetail(groupCode, '[data-testid="opt-add"]');
    await sleep(300);
  }
  await setInput(detailOf(groupCode), '[data-testid="option-row-new"] [data-testid="opt-name"]', name);
  if (priceNum) await setInput(detailOf(groupCode), '[data-testid="option-row-new"] [data-testid="opt-price"]', String(priceNum));
  await sleep(250);
  await clickDetail(groupCode, '[data-testid="option-row-new"] [data-testid="opt-save"]');
  // Dòng thêm mới chỉ đóng sau khi lưu xong VÀ nạp lại danh sách: chờ nó đóng rồi mới thêm dòng kế tiếp (nếu không, dòng sau gõ vào dòng sắp đóng).
  await tab.waitFor(`!(${detailOf(groupCode)})?.querySelector('[data-testid="option-row-new"]')`, 6000, `dòng thêm tuỳ chọn ${name} chưa đóng`).catch(() => {});
  await sleep(500);
};
const pv = (code) => q(`${tid(`preview-option-${code}`)}?.getAttribute("data-selected")`);
const price = () => q(`${tid("preview-price")}?.textContent ?? ""`);
const NO_STOCK = /Suất còn lại|còn lại|Không giới hạn|Hết suất/i;

/** Đọc dữ liệu BE bằng GET (chỉ đọc) để đối chiếu. */
async function readBe() {
  const env = Object.fromEntries(
    readFileSync("C:/Capstone_Project/BE_FnB/SmartFnBBackend/.env", "utf8")
      .split(/\r?\n/)
      .filter((l) => /^[A-Z_]+=/.test(l))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^["']|["']$/g, "")]),
  );
  const base = "http://localhost:3100/api/v1";
  const call = async (path, token, init = {}) => (await fetch(base + path, { ...init, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) } })).json();
  const asRole = async (email) => (await call("/auth/login", null, { method: "POST", body: JSON.stringify({ email, password: env.SEED_DEMO_PASSWORD }) })).accessToken;
  const owner = await asRole("owner.demo@smartfnb.local");
  const me = await call("/auth/me", owner);
  const chainId = me.chainIds[0];
  const categories = await call(`/restaurant-chains/${chainId}/menu/categories`, owner);
  const items = await call(`/restaurant-chains/${chainId}/menu/items`, owner);
  const branches = await call("/branches", owner);
  const mgr = await asRole("manager.demo@smartfnb.local");
  const mgrMe = await call("/auth/me", mgr);
  const branchMenu = await call(`/branches/${mgrMe.branchId}/menu`, mgr);
  // Tuỳ chọn (6.3): nhóm kèm tuỳ chọn lồng và `_count.menuItems`; nhóm gắn vào từng món (`GET items/:id/option-groups`).
  const optionGroups = await call(`/restaurant-chains/${chainId}/menu/option-groups`, owner);
  const itemGroups = Object.fromEntries(await Promise.all(items.map(async (i) => [i.id, (await call(`/restaurant-chains/${chainId}/menu/items/${i.id}/option-groups`, owner)).map((g) => g.id)])));
  return { chainId, categories, items, branches, branchMenu, optionGroups, itemGroups };
}

try {
  if (!REAL) {
    if (want("owner")) { // khối owner (bỏ qua khi --only=manager); đóng ở "hết khối owner"
    // ============================================================ MOCK — Owner: danh mục
    await login("owner");
    await tab.clickMenu("Danh mục món");
    await sleep(1200);
    let list = await rows();
    check("Danh mục: danh sách có dữ liệu (kèm số món)", list.length >= 4 && list.every((r) => /\d/.test(r)), `${list.length} danh mục`);
    const page = await tab.text();
    check("Danh mục: không còn danh mục viết cứng v7 'Tráng miệng'", !/Tráng miệng/.test(page));

    await click(".ant-card button", "Thêm danh mục");
    await sleep(700);
    await setInput(modal, "input", "Danh mục thử");
    await clickIn(modal, "Lưu danh mục");
    await sleep(1300);
    list = await rows();
    check("Danh mục: thêm mới thành công, hiện ở cuối danh sách", (await toasts()).includes("Đã thêm danh mục") && list.at(-1)?.includes("Danh mục thử"), list.at(-1)?.slice(0, 40));

    await click(".ant-card button", "Thêm danh mục");
    await sleep(700);
    await setInput(modal, "input", "danh mục THỬ");
    await clickIn(modal, "Lưu danh mục");
    await sleep(1300);
    check("Danh mục: trùng tên → 409, hiện thông báo tiếng Việt (đã dịch từ câu BE)", /Tên danh mục đã tồn tại/.test(await toasts()), await toasts());
    await q(`document.querySelector(".ant-modal-close")?.click()`);
    await sleep(600);

    await rowButton("Danh mục thử", "Lên");
    await sleep(1500);
    list = await rows();
    const idx = list.findIndex((r) => r.includes("Danh mục thử"));
    check("Danh mục: nút Lên đổi thứ tự (ghi displayOrder)", idx === list.length - 2, `vị trí ${idx + 1}/${list.length}`);

    await rowButton("Danh mục thử", "Sửa");
    await sleep(700);
    await setInput(modal, "input", "Danh mục đã đổi tên");
    await clickIn(modal, "Lưu danh mục");
    await sleep(1300);
    check("Danh mục: sửa tên", (await rows()).some((r) => r.includes("Danh mục đã đổi tên")));

    await waitRowWith("Danh mục đã đổi tên");
    await q(`(() => { const r = [...document.querySelectorAll(".ant-table-tbody > tr.ant-table-row")].find((x) => x.innerText.includes("Danh mục đã đổi tên")); r.querySelector(".ant-switch").click() })()`);
    await sleep(1200);
    const hid = await waitToast("Đã ẩn danh mục");
    check("Danh mục: ẩn/hiện bằng công tắc", hid.includes("Đã ẩn danh mục"), hid);

    // xoá danh mục còn món → 409
    await rowButton("Cà phê", "Xoá");
    await confirmModal("Xoá danh mục");
    await sleep(1500);
    check("Danh mục: xoá danh mục còn món → 409, hiện thông báo tiếng Việt, danh mục còn nguyên", /Danh mục còn món nên không xoá được/.test(await toasts()) && (await rows()).some((r) => r.includes("Cà phê")), await toasts());

    await rowButton("Danh mục đã đổi tên", "Xoá");
    await confirmModal("Xoá danh mục");
    await sleep(1500);
    check("Danh mục: xoá danh mục rỗng (có xác nhận)", !(await rows()).some((r) => r.includes("Danh mục đã đổi tên")));

    // ============================================================ MOCK — Owner: món
    await tab.clickMenu("Menu toàn chuỗi");
    await sleep(1500);
    list = await rows();
    const total = list.length;
    check("Món: danh sách có dữ liệu, 'Có mặt tại' n/m chi nhánh", total >= 8 && list.every((r) => /\d+\/\d+ chi nhánh/.test(r)), `${total} món; ${list[0]?.slice(0, 80)}`);
    check("Món: không còn chữ Suất còn lại / còn lại ở màn Owner", !NO_STOCK.test(await tab.text()));

    await pickSelect(`document.querySelector(".ant-card")`, "Cà phê");
    await sleep(1000);
    const coffee = await rows();
    check("Món: lọc theo danh mục", coffee.length > 0 && coffee.length < total && coffee.every((r) => r.includes("Cà phê")), `${coffee.length}/${total}`);
    // đặt lại bộ lọc bằng cách vào lại màn
    await tab.clickMenu("Danh mục món");
    await tab.clickMenu("Menu toàn chuỗi");
    await sleep(1500);
    await searchBox("matcha");
    list = await rows();
    check("Món: tìm kiếm theo tên/SKU", list.length === 1 && /Matcha/i.test(list[0]), list.join(" // ").slice(0, 80));
    await searchBox("");
    await pickSelect(`document.querySelector(".ant-card")`, "Đã tắt", 1);
    await sleep(1000);
    list = await rows();
    check("Món: lọc đã tắt (cấp chuỗi)", list.length >= 1, `${list.length} món`);
    await pickSelect(`document.querySelector(".ant-card")`, "Tất cả trạng thái", 1);
    await sleep(900);

    // thêm món
    await click(".ant-card button", "Thêm món");
    await openedDrawer();
    check("Món: form thêm có SKU, chọn sẵn mọi chi nhánh", (await q(`document.querySelectorAll(".ant-drawer-body .ant-checkbox-checked").length`)) >= 3);
    await pickSelect(drawer, "Cà phê", 0);
    await setInput(drawer, "input", "Món Thử Nghiệm", 1);
    await sleep(400);
    const sku = await q(`${drawer}.querySelectorAll("input")[2].value`);
    check("Món: SKU tự gợi ý từ tên, viết hoa", sku === "MON-THU-NGHIEM", sku);
    const skuDis = await btnState(drawer, "Thêm món");
    check("Món: chưa nhập giá thì nút Thêm bị khoá", skuDis?.disabled === true);
    await setInput(drawer, ".ant-input-number input", "33000.7");
    await blurAll();
    await sleep(500);
    const priceVal = await q(`${drawer}.querySelector(".ant-input-number input").value`);
    check("Món: form chặn số lẻ (giá làm tròn về số nguyên)", !/[.,]\d/.test(priceVal.replace(/\.(?=\d{3}\b)/g, "")) && /^\d[\d.,]*$/.test(priceVal), `giá hiển thị: ${priceVal}`);
    await setInput(drawer, ".ant-input-number input", "33000");
    await sleep(300);
    await setInput(drawer, "input[placeholder^=\"https\"]", "http://localhost:9/khong-ton-tai.png");
    await sleep(1500);
    check("Món: ảnh lỗi → hiện ảnh thay thế", await q(`!!${drawer}.querySelector('[data-testid="thumb-fallback"]')`));
    await setInput(drawer, "input[placeholder^=\"https\"]", "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");
    await sleep(900);
    check("Món: ảnh hợp lệ → xem trước ảnh", await q(`!!${drawer}.querySelector('[data-testid="thumb-image"]')`));
    await clickIn(drawer, "Thêm món");
    list = await waitRowWith("Món Thử Nghiệm");
    const created = list.find((r) => r.includes("Món Thử Nghiệm")) ?? "";
    check("Món: thêm thành công, 'Có mặt tại' = 3/3 chi nhánh", /3\/3 chi nhánh/.test(created) && /33\.000/.test(created), created.slice(0, 100));

    // trùng SKU
    await click(".ant-card button", "Thêm món");
    await openedDrawer();
    await pickSelect(drawer, "Cà phê", 0);
    await setInput(drawer, "input", "Món khác", 1);
    await setInput(drawer, "input", "MON-THU-NGHIEM", 2);
    await setInput(drawer, ".ant-input-number input", "20000");
    await sleep(400);
    await clickIn(drawer, "Thêm món");
    await sleep(1500);
    check("Món: trùng SKU → 409, hiện thông báo tiếng Việt", /Mã SKU đã tồn tại/.test(await toasts()), await toasts());
    await q(`document.querySelector(".ant-drawer-close")?.click()`);
    await sleep(700);

    // sửa
    await rowButton("Món Thử Nghiệm", "Sửa");
    await openedDrawer();
    const skuLocked = await q(`${drawer}.querySelectorAll("input")[2].disabled`);
    check("Món: sửa thì khoá SKU", skuLocked === true);
    await setInput(drawer, "input", "Món Thử Đã Sửa", 1);
    await sleep(300);
    const skuStill = await q(`${drawer}.querySelectorAll("input")[2].value`);
    await clickIn(drawer, "Lưu món");
    list = await waitRowWith("Món Thử Đã Sửa");
    check("Món: sửa tên thành công, SKU giữ nguyên", skuStill === "MON-THU-NGHIEM" && list.some((r) => r.includes("Món Thử Đã Sửa") && r.includes("MON-THU-NGHIEM")));

    // bật/tắt cấp chuỗi
    await waitRowWith("Món Thử Đã Sửa");
    await q(`(() => { const r = [...document.querySelectorAll(".ant-table-tbody > tr.ant-table-row")].find((x) => x.innerText.includes("Món Thử Đã Sửa")); r.querySelector(".ant-switch").click() })()`);
    await sleep(1300);
    const off = await waitToast("Đã tắt món");
    check("Món: tắt cấp chuỗi", off.includes("Đã tắt món"), off);
    await pickSelect(`document.querySelector(".ant-card")`, "Đã tắt", 1);
    await sleep(1000);
    check("Món: món vừa tắt hiện trong bộ lọc 'Đã tắt'", (await rows()).some((r) => r.includes("Món Thử Đã Sửa")));
    await pickSelect(`document.querySelector(".ant-card")`, "Tất cả trạng thái", 1);
    await sleep(900);

    // gán chi nhánh
    await rowButton("Món Thử Đã Sửa", "Gán chi nhánh");
    await openedDrawer();
    await q(`${drawer}.querySelector(".ant-checkbox-input").click()`);
    await sleep(300);
    await clickIn(drawer, "Lưu chi nhánh bán món");
    await sleep(1500);
    list = await rows();
    check("Món: gán chi nhánh (bỏ 1) → 'Có mặt tại' 2/3", /2\/3 chi nhánh/.test(list.find((r) => r.includes("Món Thử Đã Sửa")) ?? ""), (list.find((r) => r.includes("Món Thử Đã Sửa")) ?? "").slice(0, 90));

    // xoá
    await rowButton("Món Thử Đã Sửa", "Xoá");
    await sleep(600);
    check("Món: xoá có bước xác nhận", /Xoá món/.test(await q(`document.body.innerText`)));
    await confirmModal("Xoá món");
    for (let i = 0; i < 24 && (await rows()).some((r) => r.includes("Món Thử Đã Sửa")); i++) await sleep(250); // chờ xoá xong + nạp lại (độ trễ giả lập)
    check("Món: xoá thành công", !(await rows()).some((r) => r.includes("Món Thử Đã Sửa")));

    // ============================================================ MOCK — Owner: tuỳ chọn món (4.3; options luôn là mock)
    await tab.clickMenu("Tuỳ chọn món");
    await sleep(1300);
    list = await rows();
    check("Tuỳ chọn: màn có 4 nhóm mẫu (Size, Đường, Đá, Topping) và ghi chú 'lưu tạm, chờ BE'", ["Size", "Đường", "Đá", "Topping"].every((n) => list.some((r) => r.includes(n))) && /chờ BE/.test(await q(`${tid("options-pending-note")}?.innerText ?? ""`)), `${list.length} nhóm`);

    // --- Size: bắt buộc, chọn đúng 1, có mặc định. Form nhóm lưu riêng; luật chọn tự đồng bộ (quyết định 2): không còn lỗi luật chọn.
    await click(".ant-card button", "Thêm nhóm");
    await sleep(800);
    await setInput(modal, '[data-testid="group-name"]', "Size thử");
    await sleep(300);
    check("Nhóm: mã tự gợi ý từ tên", (await q(`${tid("group-code")}.value`)) === "SIZE-THU");
    check("Form nhóm không còn ô tuỳ chọn (tuỳ chọn lưu riêng từng dòng)", !(await q(`!!(${modal}).querySelector('[data-testid="opt-name"]')`)));
    const ruleState = () => q(`({ required: ${tid("group-required")}.getAttribute("aria-checked"), min: ${tid("group-min")}.value, max: ${tid("group-max")}.value })`);
    await clickTid("group-required");
    await sleep(300);
    let st = await ruleState();
    check("Tự đồng bộ: bật bắt buộc khi tối thiểu 0 → tối thiểu thành 1", st.required === "true" && st.min === "1", J(st));
    await setInput(modal, '[data-testid="group-min"]', "0");
    await sleep(300);
    st = await ruleState();
    check("Tự đồng bộ: đặt tối thiểu 0 → bỏ bắt buộc", st.required === "false" && st.min === "0", J(st));
    await setInput(modal, '[data-testid="group-min"]', "3");
    await sleep(300);
    st = await ruleState();
    check("Tự đồng bộ: tối thiểu 3 → bắt buộc, tối đa nâng lên 3 (không nhỏ hơn tối thiểu)", st.required === "true" && st.min === "3" && Number(st.max) >= 3, J(st));
    check("Tự đồng bộ: luật chọn không còn báo lỗi, nút Lưu mở", !/tối thiểu|bắt buộc|tối đa/.test(await groupModalErrors()) && (await saveDisabled()) === false, await groupModalErrors());
    await setInput(modal, '[data-testid="group-min"]', "1");
    await setInput(modal, '[data-testid="group-max"]', "1");
    await sleep(300);
    st = await ruleState();
    check("Tự đồng bộ: về bắt buộc, chọn đúng 1", st.required === "true" && st.min === "1" && st.max === "1", J(st));
    await clickTid("group-save");
    list = await waitRowWith("Size thử");
    check("Nhóm: thêm Size (bắt buộc, đúng 1) bằng một lệnh; chưa có tuỳ chọn → nhãn 'Chưa có tuỳ chọn' và 'Không đủ tuỳ chọn để chọn tối thiểu 1' (quyết định 12, 14)", list.some((r) => r.includes("Size thử") && r.includes("Bắt buộc, chọn đúng 1") && r.includes("Chưa có tuỳ chọn") && r.includes("Không đủ tuỳ chọn để chọn tối thiểu 1")), (list.find((r) => r.includes("Size thử")) ?? "").slice(0, 160));
    check("Tạo nhóm xong tự mở ô thêm tuỳ chọn đầu tiên (quyết định 12)", await q(`!!(${detailOf("SIZE-THU")})?.querySelector('[data-testid="option-row-new"]')`));
    await addOptionUI("SIZE-THU", "M", 0);
    await addOptionUI("SIZE-THU", "L", 6000);
    list = await waitRowWith("Size thử");
    check("Tuỳ chọn: thêm M và L (+6.000) từng dòng, lưu ngay → hết nhãn 'Chưa có tuỳ chọn' và 'Không đủ…'", list.some((r) => r.includes("Size thử") && /L \+6\.000/.test(r) && !r.includes("Chưa có tuỳ chọn") && !r.includes("Không đủ tuỳ chọn")), (list.find((r) => r.includes("Size thử")) ?? "").slice(0, 160));
    // mặc định: M được; L thì vượt tối đa (=1) → BE/mock từ chối
    await clickDefault("SIZE-THU", "M");
    await sleep(900);
    check("Tuỳ chọn: đặt M làm mặc định → 'M ★'", /M ★/.test((await rows()).find((r) => r.includes("Size thử")) ?? ""));
    await clickDefault("SIZE-THU", "L");
    check("Quy tắc: số mặc định > tối đa → bị từ chối, báo lỗi", /mặc định không được vượt quá/.test(await waitToast("mặc định không được vượt quá")), await toasts());
    await sleep(600);
    check("Quy tắc: L vẫn không mặc định sau khi bị từ chối (nạp lại từ nguồn)", !/L ★/.test((await rows()).find((r) => r.includes("Size thử")) ?? ""));
    // sửa từng dòng: nút Lưu chỉ mở khi có thay đổi hợp lệ; mã trùng bị chặn ngay trên dòng
    await addOptionUI("SIZE-THU", "Tạm", 1000);
    let tamRows = await optRows("SIZE-THU");
    const tamRow = tamRows.find((r) => r.name === "Tạm");
    check("Sửa tuỳ chọn: dòng mới thêm có mã tự gợi ý và nút Lưu đóng khi chưa sửa", tamRow?.code === "TAM" && tamRow.saveDisabled === true, J(tamRow));
    await rowField("SIZE-THU", "TAM", "opt-price", "2000");
    await sleep(300);
    check("Sửa tuỳ chọn: sửa giá → nút Lưu mở", (await optRows("SIZE-THU")).find((r) => r.code === "TAM")?.saveDisabled === false);
    await rowField("SIZE-THU", "TAM", "opt-code", "M");
    await sleep(300);
    check("Sửa tuỳ chọn: mã trùng trong nhóm → báo trùng và khoá nút Lưu", /bị trùng trong nhóm/.test(await q(`${detailOf("SIZE-THU")}.querySelector('[data-testid="option-row"][data-code="TAM"] [data-testid="opt-errors"]')?.innerText ?? ""`)) && (await optRows("SIZE-THU")).find((r) => r.code === "TAM")?.saveDisabled === true);
    await rowField("SIZE-THU", "TAM", "opt-code", "TAM");
    await sleep(300);
    await clickDetail("SIZE-THU", '[data-testid="option-row"][data-code="TAM"] [data-testid="opt-save"]');
    check("Sửa tuỳ chọn: lưu bằng MỘT lệnh, báo 'Đã lưu tuỳ chọn'", /Đã lưu tuỳ chọn/.test(await waitToast("Đã lưu tuỳ chọn")), await toasts());
    await sleep(700);
    check("Sửa tuỳ chọn: giá mới 2.000 hiện ở danh sách nhóm", /Tạm \+2\.000/.test((await rows()).find((r) => r.includes("Size thử")) ?? ""));
    // đổi thứ tự bằng nút lên/xuống (2 lệnh patch displayOrder); lỗi thì nạp lại
    await clickDetail("SIZE-THU", '[data-testid="option-row"][data-code="M"] [data-testid="opt-down"]');
    await waitOptCodes("SIZE-THU", ["L", "M", "TAM"]);
    await sleep(600);
    check("Đổi thứ tự: M xuống một bậc → L, M, Tạm", J((await optRows("SIZE-THU")).map((r) => r.code)) === J(["L", "M", "TAM"]), J((await optRows("SIZE-THU")).map((r) => r.code)));
    await clickDetail("SIZE-THU", '[data-testid="option-row"][data-code="M"] [data-testid="opt-up"]');
    await waitOptCodes("SIZE-THU", ["M", "L", "TAM"]);
    await sleep(600);
    check("Đổi thứ tự: M lên lại → M, L, Tạm", J((await optRows("SIZE-THU")).map((r) => r.code)) === J(["M", "L", "TAM"]), J((await optRows("SIZE-THU")).map((r) => r.code)));
    // xoá tuỳ chọn có hộp xác nhận (quyết định 16): Huỷ thì còn, đồng ý mới xoá
    await clickDetail("SIZE-THU", '[data-testid="option-row"][data-code="TAM"] [data-testid="opt-delete"]');
    await sleep(700);
    check("Xoá tuỳ chọn: hiện hộp xác nhận (không xoá ngay), nhóm còn 3 tuỳ chọn không có dòng 'N món đang dùng'", /Xoá tuỳ chọn "Tạm"/.test(await q(`document.body.innerText`)) && (await optRows("SIZE-THU")).length === 3 && !(await has("delete-option-usage")));
    await q(`(() => { const b = [...document.querySelectorAll(".ant-modal-confirm button")].find((x) => x.textContent.includes("Huỷ")); b?.click() })()`);
    await sleep(600);
    check("Xoá tuỳ chọn: bấm Huỷ thì tuỳ chọn vẫn còn", (await optRows("SIZE-THU")).length === 3);
    await clickDetail("SIZE-THU", '[data-testid="option-row"][data-code="TAM"] [data-testid="opt-delete"]');
    await confirmModal("Xoá tuỳ chọn");
    await waitToast("Đã xoá tuỳ chọn");
    await sleep(800);
    check("Xoá tuỳ chọn: đồng ý → tuỳ chọn biến mất", J((await optRows("SIZE-THU")).map((r) => r.code)) === J(["M", "L"]), J((await optRows("SIZE-THU")).map((r) => r.code)));
    // lỗi BE khi lưu một dòng: báo lỗi, dòng thêm mới còn đó, không thêm vào nhóm
    await tab.openMockPanel();
    await tab.setSelect("mock-failure", "server");
    await clickDetail("SIZE-THU", '[data-testid="opt-add"]');
    await sleep(300);
    await setInput(detailOf("SIZE-THU"), '[data-testid="option-row-new"] [data-testid="opt-name"]', "Lỗi");
    await sleep(250);
    await clickDetail("SIZE-THU", '[data-testid="option-row-new"] [data-testid="opt-save"]');
    await sleep(1300);
    check("Lỗi BE: lưu một dòng báo lỗi tiếng Việt, dòng chưa lưu còn nguyên, nhóm không có thêm tuỳ chọn", /Máy chủ đang gặp sự cố/.test(await toasts()) && (await q(`!!(${detailOf("SIZE-THU")}).querySelector('[data-testid="option-row-new"]')`)) && (await optRows("SIZE-THU")).length === 2, await toasts());
    await tab.setSelect("mock-failure", "none");
    await clickDetail("SIZE-THU", '[data-testid="option-row-new"] [data-testid="opt-cancel"]');
    await q(`document.querySelectorAll(".ant-notification-notice-close").forEach((b) => b.click())`); // thông báo "Máy chủ gặp sự cố" không tự tắt
    await sleep(500);

    // --- Topping: không bắt buộc, tối đa 3, có giá
    await click(".ant-card button", "Thêm nhóm");
    await sleep(800);
    await setInput(modal, '[data-testid="group-name"]', "Topping thử");
    await setInput(modal, '[data-testid="group-max"]', "3");
    await sleep(400);
    check("Quy tắc: topping không bắt buộc, 0–3 hợp lệ (không cần mặc định)", (await groupModalErrors()) === "" && (await saveDisabled()) === false, await groupModalErrors());
    await clickTid("group-save");
    await waitRowWith("Topping thử");
    const tops = [["Trân châu", 5000], ["Thạch dừa", 5000], ["Pudding", 7000], ["Flan", 8000]];
    for (const [n, pr] of tops) await addOptionUI("TOPPING-THU", n, pr);
    list = await waitRowWith("Topping thử");
    check("Nhóm: thêm Topping (không bắt buộc, chọn 0–3, 4 tuỳ chọn có giá)", list.some((r) => r.includes("Topping thử") && r.includes("Không bắt buộc, chọn 0–3") && r.includes("Pudding +7.000")), (list.find((r) => r.includes("Topping thử")) ?? "").slice(0, 140));

    // trùng mã nhóm: form vẫn cho lưu (form không biết các mã khác), mock trả 409
    await click(".ant-card button", "Thêm nhóm");
    await sleep(800);
    await setInput(modal, '[data-testid="group-name"]', "Trùng mã");
    await setInput(modal, '[data-testid="group-code"]', "SIZE-THU");
    await sleep(300);
    await clickTid("group-save");
    await sleep(1200);
    check("Nhóm: trùng mã trong chuỗi → 409 từ mock, hiện thông báo", /đã được dùng/.test(await toasts()), await toasts());
    await q(`document.querySelector(".ant-modal-close")?.click()`);
    await sleep(600);

    // --- Nhóm tạm: thiếu tuỳ chọn so với tối thiểu (quyết định 14), sửa nhóm (patchGroup), xoá nhóm
    await click(".ant-card button", "Thêm nhóm");
    await sleep(800);
    await setInput(modal, '[data-testid="group-name"]', "Tạm min");
    await setInput(modal, '[data-testid="group-min"]', "2");
    await sleep(300);
    await clickTid("group-save");
    list = await waitRowWith("Tạm min");
    check("Nhóm tạm: tối thiểu 2 mà chưa có tuỳ chọn → cả 'Chưa có tuỳ chọn' lẫn 'Không đủ tuỳ chọn để chọn tối thiểu 2'", list.some((r) => r.includes("Tạm min") && r.includes("Chưa có tuỳ chọn") && r.includes("Không đủ tuỳ chọn để chọn tối thiểu 2")), (list.find((r) => r.includes("Tạm min")) ?? "").slice(0, 160));
    await addOptionUI("TAM-MIN", "Một", 0);
    const tamText = async () => (await rows()).find((r) => r.includes("Tạm min")) ?? "";
    check("Nhóm tạm: có 1 tuỳ chọn đang bật < tối thiểu 2 → còn nhãn đỏ 'Không đủ…', hết 'Chưa có tuỳ chọn'; không chặn lưu (đã lưu được dòng)", await (async () => {
      const t = await tamText();
      return t.includes("Không đủ tuỳ chọn để chọn tối thiểu 2") && !t.includes("Chưa có tuỳ chọn");
    })(), (await tamText()).slice(0, 160));
    await addOptionUI("TAM-MIN", "Hai", 0);
    check("Nhóm tạm: đủ 2 tuỳ chọn đang bật → hết nhãn 'Không đủ…'", !(await tamText()).includes("Không đủ tuỳ chọn"), (await tamText()).slice(0, 160));
    await rowButton("Tạm min", "Sửa");
    await sleep(800);
    await setInput(modal, '[data-testid="group-name"]', "Tạm min đổi");
    await clickTid("group-save");
    list = await waitRowWith("Tạm min đổi");
    check("Sửa nhóm: đổi tên bằng một lệnh, mã giữ nguyên", list.some((r) => r.includes("Tạm min đổi") && r.includes("TAM-MIN")), (list.find((r) => r.includes("Tạm min")) ?? "").slice(0, 100));
    await rowButton("Tạm min đổi", "Xoá");
    await sleep(700);
    check("Xoá nhóm: nhóm chưa gắn món → hộp xác nhận nêu 'chưa gắn cho món nào'", /chưa gắn cho món nào/.test(await q(`${tid("delete-usage")}?.innerText ?? ""`)));
    await confirmModal("Xoá nhóm");
    await sleep(1200);
    check("Xoá nhóm: nhóm tạm biến mất", !(await rows()).some((r) => r.includes("Tạm min")));

    // --- Nhóm rỗng giữ lại (không gắn được cho món, kiểm ở màn món) và nhóm một tuỳ chọn (kiểm xoá tuỳ chọn cuối khi đã gắn món)
    await click(".ant-card button", "Thêm nhóm");
    await sleep(800);
    await setInput(modal, '[data-testid="group-name"]', "Rỗng thử");
    await clickTid("group-save");
    await waitRowWith("Rỗng thử");
    await click(".ant-card button", "Thêm nhóm");
    await sleep(800);
    await setInput(modal, '[data-testid="group-name"]', "Một mình");
    await clickTid("group-save");
    await waitRowWith("Một mình");
    await addOptionUI("MOT-MINH", "Duy nhất", 0);
    check("Nhóm rỗng: 'Rỗng thử' hiện với nhãn 'Chưa có tuỳ chọn' (quyết định 12)", /Chưa có tuỳ chọn/.test((await rows()).find((r) => r.includes("Rỗng thử")) ?? ""));

    // --- Đổi thứ tự nhóm (quyết định 15): Topping thử lên một bậc rồi xuống lại
    const order = async () => (await rows()).map((r) => (r.match(/Size thử|Topping thử/) ?? [""])[0]).filter(Boolean);
    /** Chờ (tối đa 6 giây) tới khi thứ tự hai nhóm đúng như `want`; lệnh patch và nạp lại có độ trễ giả lập. */
    const waitOrder = async (want) => {
      for (let i = 0; i < 24; i++) {
        if (J(await order()) === J(want)) return;
        await sleep(250);
      }
    };
    const before = await order();
    await rowButton("Topping thử", "Lên");
    await waitOrder(["Topping thử", "Size thử"]);
    await sleep(1200);
    const after = await order();
    check("Đổi thứ tự nhóm: Topping thử lên trước Size thử bằng 2 lệnh patch", J(before) === J(["Size thử", "Topping thử"]) && J(after) === J(["Topping thử", "Size thử"]), `${J(before)} → ${J(after)}`);
    await rowButton("Topping thử", "Xuống");
    await waitOrder(["Size thử", "Topping thử"]);
    await sleep(1200);
    check("Đổi thứ tự nhóm: xuống lại → Size thử rồi Topping thử", J(await order()) === J(["Size thử", "Topping thử"]), J(await order()));

    // --- Món: gắn cả hai nhóm, xem trước
    await tab.clickMenu("Menu toàn chuỗi");
    await sleep(1500);
    await click(".ant-card button", "Thêm món");
    await openedDrawer();
    await pickSelect(drawer, "Cà phê", 0);
    await setInput(drawer, "input", "Món Tuỳ Chọn", 1);
    await setInput(drawer, ".ant-input-number input", "30000");
    await sleep(400);
    check("Món: form có khu 'Tuỳ chọn món' kèm ghi chú 'lưu tạm, chờ BE' và 'Không gom món'", /chờ BE/.test(await q(`${tid("item-options-note")}?.innerText ?? ""`)) && (await has("item-nobatch")));
    check("Món: chưa gắn nhóm thì xem trước báo 'chưa gắn nhóm'", /chưa gắn nhóm/.test(await q(`${tid("option-preview")}?.innerText ?? ""`)));
    // Quyết định 12: nhóm chưa có tuỳ chọn hiện trong ô chọn nhưng khoá, ghi lý do (mở ô chọn, đọc, rồi chọn Size thử)
    await q(`(() => { const root = ${drawer}; root.querySelectorAll(".ant-select-content, .ant-select-selector")[1].dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); })()`);
    await sleep(450);
    const emptyOpt = await q(`(() => { const o = [...document.querySelectorAll(".ant-select-item-option")].find((e) => e.textContent.includes("Rỗng thử")); return o ? { disabled: o.classList.contains("ant-select-item-option-disabled") || o.getAttribute("aria-disabled") === "true", text: o.textContent } : null })()`);
    check("Món: nhóm rỗng ('Rỗng thử') hiện trong ô chọn nhưng khoá, ghi lý do 'chưa có tuỳ chọn' (quyết định 12)", !!emptyOpt && emptyOpt.disabled === true && /chưa có tuỳ chọn/.test(emptyOpt.text), J(emptyOpt));
    await q(`[...document.querySelectorAll(".ant-select-item-option")].find((e) => e.textContent.includes("Size thử"))?.click()`);
    await sleep(600);
    await pickSelect(drawer, "Topping thử", 1);
    await pickSelect(drawer, "Một mình", 1);
    await sleep(400);
    check("Món: gắn được ba nhóm (kèm 'Một mình')", (await has("item-group-SIZE-THU")) && (await has("item-group-TOPPING-THU")) && (await has("item-group-MOT-MINH")));
    check("Xem trước: mặc định chọn sẵn (Size M), giá = giá món 30.000", (await pv("SIZE-THU:M")) === "true" && digits(await price()) === "30000", `${await pv("SIZE-THU:M")} ${await price()}`);
    await clickTid("preview-option-SIZE-THU:L");
    await clickTid("preview-option-TOPPING-THU:TRAN-CHAU");
    await clickTid("preview-option-TOPPING-THU:PUDDING");
    await sleep(300);
    check("Xem trước: Size L + trân châu + pudding = 30.000 + 6.000 + 5.000 + 7.000 = 48.000", digits(await price()) === "48000" && (await pv("SIZE-THU:M")) === "false", await price());
    await clickTid("preview-option-TOPPING-THU:THACH-DUA");
    await clickTid("preview-option-TOPPING-THU:FLAN");
    await sleep(300);
    check("Xem trước: topping thứ 4 bị chặn (tối đa 3), giá = 53.000", (await pv("TOPPING-THU:FLAN")) === "false" && (await pv("TOPPING-THU:THACH-DUA")) === "true" && digits(await price()) === "53000", await price());
    await clickTid("item-nobatch");
    await sleep(200);
    await clickTid("item-save");
    list = await waitRowWith("Món Tuỳ Chọn");
    check("Món: lưu món kèm tuỳ chọn thành công", list.some((r) => r.includes("Món Tuỳ Chọn")));

    // --- Tắt một tuỳ chọn cấp chuỗi → không chọn được trong xem trước
    await tab.clickMenu("Tuỳ chọn món");
    await sleep(1300);
    list = await rows();
    check("Tuỳ chọn: cột 'Số món' đếm món vừa gắn (1)", list.some((r) => r.includes("Topping thử") && /\s1\s+Sửa\s+Xoá$/.test(r.trim())), (list.find((r) => r.includes("Topping thử")) ?? "").slice(-30));
    // Xoá tuỳ chọn cuối cùng của nhóm đang gắn món (quyết định 13): hộp xác nhận nêu số món đang dùng
    await expandGroup("Một mình");
    await clickDetail("MOT-MINH", '[data-testid="option-row"] [data-testid="opt-delete"]');
    await sleep(700);
    const lastText = await q(`${tid("delete-option-usage")}?.innerText ?? ""`);
    check("Xoá tuỳ chọn cuối của nhóm đang gắn món: hộp xác nhận ghi '1 món đang dùng nhóm này'", /1 món đang dùng nhóm này/.test(lastText), lastText);
    await confirmModal("Xoá tuỳ chọn");
    await waitToast("Đã xoá tuỳ chọn");
    await sleep(900);
    check("Xoá tuỳ chọn cuối: nhóm 'Một mình' còn nhưng có nhãn 'Chưa có tuỳ chọn'", /Chưa có tuỳ chọn/.test((await rows()).find((r) => r.includes("Một mình")) ?? ""));
    await q(`(() => { const r = [...document.querySelectorAll(".ant-table-tbody > tr.ant-table-row")].find((x) => x.innerText.includes("Topping thử")); r.querySelector(".ant-table-row-expand-icon").click() })()`);
    await sleep(600);
    // trạng thái chi nhánh chỉ xem: chọn một chi nhánh thì hiện thẻ Còn bán/Tạm hết, không có công tắc ghi nào ngoài cờ cấp chuỗi
    await q(`${tid("group-detail-TOPPING-THU")}.querySelector(".ant-select-content, .ant-select-selector").dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))`);
    await sleep(400);
    await q(`document.querySelector(".ant-select-item-option")?.click()`);
    await sleep(900);
    const detail = await q(`${tid("group-detail-TOPPING-THU")}.innerText`);
    const switches = await q(`${tid("group-detail-TOPPING-THU")}.querySelectorAll(".ant-switch").length`);
    check("Tuỳ chọn: xem trạng thái chi nhánh (Còn bán/Tạm hết), chỉ xem — ghi chú giai đoạn 5", /Còn bán|Tạm hết/.test(detail) && /giai đoạn 5/.test(detail) && switches === 4, `${switches} công tắc`);
    await clickTid("option-active-TOPPING-THU:PUDDING");
    const offToast = await waitToast("Đã tắt tuỳ chọn");
    check("Tuỳ chọn: tắt Pudding cấp chuỗi", offToast.includes("Đã tắt tuỳ chọn"), offToast);

    await tab.clickMenu("Menu toàn chuỗi");
    await sleep(1500);
    await rowButton("Món Tuỳ Chọn", "Sửa");
    await openedDrawer();
    await sleep(600);
    const cfgOk = (await has("item-group-SIZE-THU")) && (await has("item-group-TOPPING-THU"));
    const nb = await q(`${tid("item-nobatch")}?.getAttribute("aria-checked")`);
    check("Món: mở lại thấy đủ hai nhóm và cờ 'Không gom món' đã lưu", cfgOk && nb === "true", `nhóm: ${cfgOk}, noBatch: ${nb}`);
    check("Xem trước: Pudding đã tắt cấp chuỗi → không chọn được", (await q(`${tid("preview-option-TOPPING-THU:PUDDING")}?.disabled`)) === true);
    await clickTid("preview-option-TOPPING-THU:PUDDING");
    await sleep(200);
    check("Xem trước: bấm tuỳ chọn đã tắt không đổi giá (vẫn 30.000)", (await pv("TOPPING-THU:PUDDING")) === "false" && digits(await price()) === "30000", await price());
    await q(`document.querySelector(".ant-drawer-close")?.click()`);
    await sleep(700);

    // --- Xoá nhóm: nêu tên món đang dùng
    await tab.clickMenu("Tuỳ chọn món");
    await sleep(1300);
    await rowButton("Topping thử", "Xoá");
    await sleep(700);
    const usageText = await q(`${tid("delete-usage")}?.innerText ?? ""`);
    check("Xoá nhóm: hộp xác nhận nêu số món đang dùng (từ menuItemCount, quyết định 18)", /đang gắn cho 1 món/.test(usageText), usageText);
    await confirmModal("Xoá nhóm");
    await sleep(1300);
    list = await rows();
    check("Xoá nhóm: nhóm biến mất khỏi danh sách", !list.some((r) => r.includes("Topping thử")));
    await rowButton("Size thử", "Xoá");
    await confirmModal("Xoá nhóm");
    await sleep(1000);
    await rowButton("Một mình", "Xoá");
    await confirmModal("Xoá nhóm");
    await sleep(1000);
    await rowButton("Rỗng thử", "Xoá");
    await confirmModal("Xoá nhóm");
    await sleep(1000);

    await tab.clickMenu("Menu toàn chuỗi");
    await sleep(1500);
    await rowButton("Món Tuỳ Chọn", "Sửa");
    await openedDrawer();
    await sleep(600);
    check("Xoá nhóm: món đã được gỡ nhóm", !(await has("item-group-TOPPING-THU")) && !(await has("item-group-SIZE-THU")) && !(await has("item-group-MOT-MINH")));
    await q(`document.querySelector(".ant-drawer-close")?.click()`);
    await sleep(700);
    await rowButton("Món Tuỳ Chọn", "Xoá");
    await confirmModal("Xoá món");
    await sleep(1200);

    // ============================================================ MOCK — 4.4: xác nhận tắt mặc định, BE lỗi, lưu qua F5
    // --- tắt tuỳ chọn đang mặc định: phải hỏi, Huỷ thì giữ nguyên, đồng ý mới bỏ cờ
    await tab.clickMenu("Tuỳ chọn món");
    await sleep(1300);
    await q(`(() => { const r = [...document.querySelectorAll(".ant-table-tbody > tr.ant-table-row")].find((x) => x.innerText.includes("Đường")); r.querySelector(".ant-table-row-expand-icon").click() })()`);
    await sleep(600);
    check("Mặc định: trước khi tắt, 100% là mặc định (★)", /100% ★/.test((await rows()).find((r) => r.includes("Đường")) ?? ""));
    await clickTid("option-active-SUGAR:SUGAR-100");
    await sleep(700);
    const confirmText = await q(`${tid("confirm-default-off")}?.innerText ?? ""`);
    check("Mặc định: tắt tuỳ chọn mặc định → hộp xác nhận nêu rõ nhóm", /đang là mặc định/.test(confirmText) && /bỏ mặc định của nhóm Đường/.test(confirmText), confirmText);
    check("Mặc định: bấm Huỷ thì tuỳ chọn vẫn bật và vẫn là mặc định", await (async () => {
      await q(`(() => { const b = [...document.querySelectorAll(".ant-modal-confirm button")].find((x) => x.textContent.includes("Huỷ")); b.click() })()`);
      await sleep(700);
      const on = await q(`${tid("option-active-SUGAR:SUGAR-100")}.getAttribute("aria-checked")`);
      return on === "true" && /100% ★/.test((await rows()).find((r) => r.includes("Đường")) ?? "");
    })());
    await clickTid("option-active-SUGAR:SUGAR-100");
    await sleep(600);
    await confirmModal("Tắt và bỏ mặc định");
    const offT = await waitToast("Đã tắt tuỳ chọn");
    for (let i = 0; i < 24 && /100% ★/.test((await rows()).find((r) => r.includes("Đường")) ?? ""); i++) await sleep(250); // chờ nạp lại sau khi tắt
    check("Mặc định: đồng ý → tuỳ chọn tắt và hết cờ mặc định", offT.includes("Đã tắt tuỳ chọn") && !/100% ★/.test((await rows()).find((r) => r.includes("Đường")) ?? ""), offT);

    // --- BE lỗi khi lưu món: tuỳ chọn KHÔNG được lưu vào mock
    await tab.clickMenu("Menu toàn chuỗi");
    await sleep(1500);
    await rowButton("Cà phê sữa đá", "Sửa");
    await openedDrawer();
    await sleep(700);
    await setInput(drawer, "input", "Cà phê sữa đá ĐỔI", 1);
    await pickSelect(drawer, "Topping", 1);
    await sleep(300);
    check("Lỗi BE: form đã thêm nhóm Topping (chưa lưu)", await has("item-group-TOPPING"));
    await tab.openMockPanel();
    await tab.setSelect("mock-failure", "server");
    await clickTid("item-save");
    await sleep(1500);
    check("Lỗi BE: lưu món báo lỗi, drawer còn mở", /Máy chủ đang gặp sự cố/.test(await toasts()) && (await has("item-save")), await toasts());
    await tab.setSelect("mock-failure", "none");
    await q(`document.querySelector(".ant-drawer-close")?.click()`);
    await sleep(800);
    await rowButton("Cà phê sữa đá", "Sửa");
    await openedDrawer();
    await sleep(900);
    check("Lỗi BE: mở lại thấy tên cũ và nhóm Topping KHÔNG được lưu", !(await has("item-group-TOPPING")) && !(await q(`${drawer}.querySelectorAll("input")[1].value`)).includes("ĐỔI"));
    await q(`document.querySelector(".ant-drawer-close")?.click()`);
    await sleep(700);

    // tạo món mới thất bại → không tạo liên kết (món không có, và nhóm không đếm thêm món)
    await tab.clickMenu("Tuỳ chọn món");
    await sleep(1200);
    const usedBefore = (await rows()).find((r) => r.startsWith("Topping")) ?? "";
    await tab.clickMenu("Menu toàn chuỗi");
    await sleep(1500);
    await click(".ant-card button", "Thêm món");
    await openedDrawer();
    await pickSelect(drawer, "Cà phê", 0);
    await setInput(drawer, "input", "Món Lỗi Tạo", 1);
    await setInput(drawer, ".ant-input-number input", "25000");
    await pickSelect(drawer, "Topping", 1);
    await tab.setSelect("mock-failure", "server");
    await clickTid("item-save");
    await sleep(1500);
    await tab.setSelect("mock-failure", "none");
    await q(`document.querySelector(".ant-drawer-close")?.click()`);
    await sleep(900);
    check("Lỗi BE: tạo món thất bại → món không xuất hiện", !(await rows()).some((r) => r.includes("Món Lỗi Tạo")));
    await tab.clickMenu("Tuỳ chọn món");
    await sleep(1200);
    check("Lỗi BE: tạo món thất bại → nhóm Topping không có thêm món (không có liên kết)", ((await rows()).find((r) => r.startsWith("Topping")) ?? "") === usedBefore, usedBefore.slice(-20));

    // --- lưu qua F5 và nút xoá dữ liệu mock
    await click(".ant-card button", "Thêm nhóm");
    await sleep(800);
    await setInput(modal, '[data-testid="group-name"]', "Nhóm F5");
    await sleep(300);
    await clickTid("group-save");
    await waitRowWith("Nhóm F5");
    await addOptionUI("NHOM-F5", "Một", 0);
    const stored = await q(`Object.keys(localStorage).filter((k) => k.startsWith("smartfnb:mock:options:v1:")).length`);
    check("F5: tạo nhóm ghi vào localStorage 'smartfnb:mock:options:v1:<chainId>'", stored >= 1, `${stored} khoá`);
    await tab.goto("/owner/menu/options");
    await sleep(2500);
    check("F5: tải lại trang, nhóm vừa tạo vẫn còn", (await waitRowWith("Nhóm F5")).some((r) => r.includes("Nhóm F5")));
    check("F5: tuỳ chọn đã tắt mặc định ở trên cũng còn sau khi tải lại", !/100% ★/.test((await rows()).find((r) => r.includes("Đường")) ?? ""));
    await tab.openMockPanel();
    await clickTid("mock-clear");
    await sleep(3000);
    await tab.waitFor(`document.querySelector(".ant-table-tbody")`, 15000, "bảng sau khi xoá dữ liệu mock");
    await sleep(1200);
    const afterClear = await rows();
    check("F5: xoá dữ liệu mock → nhóm tự tạo mất, dữ liệu sinh sẵn trở lại (Đường lại có 100% ★)", !afterClear.some((r) => r.includes("Nhóm F5")) && /100% ★/.test(afterClear.find((r) => r.includes("Đường")) ?? ""));
    check("F5: khoá localStorage đã bị xoá sạch", (await q(`Object.keys(localStorage).filter((k) => k.startsWith("smartfnb:mock:options:v1:")).length`)) === 0);

    } // hết khối owner (bỏ qua khi --only=manager)

    // ============================================================ MOCK — Manager: món chi nhánh (--only=manager chạy riêng khối này)
    if (want("manager")) {
    await login("manager");
    await tab.clickMenu("Món tại chi nhánh");
    await sleep(1500);
    // Từ 5.7b màn này là hàng `branch-menu-row` (không còn bảng) và công tắc "tắt" có hộp xác nhận.
    const mgrRows = () => q(`[...document.querySelectorAll('[data-testid="branch-menu-row"]')].map((r) => r.innerText.replace(/\\s+/g, " ").trim())`);
    const list = await mgrRows();
    const mgrText = await tab.text();
    check("Manager: Món tại chi nhánh có dữ liệu, không còn 'Suất còn lại'/'còn lại'", list.length > 0 && !NO_STOCK.test(mgrText.replace(/Còn bán hôm nay/gi, "")), `${list.length} món`);
    await q(`document.querySelector('[data-testid="branch-menu-row"][data-owner-disabled="false"] button.ant-switch:not(.ant-switch-disabled)').setAttribute("data-target", "1")`);
    const before = await q(`document.querySelector('[data-target="1"]').classList.contains("ant-switch-checked")`);
    await q(`document.querySelector('[data-target="1"]').click()`);
    await sleep(600);
    await q(`document.querySelector(".ant-modal-confirm .ant-btn-primary")?.click()`);
    await sleep(1300);
    const after = await q(`document.querySelector('[data-target="1"]').classList.contains("ant-switch-checked")`);
    const mt = await waitToast("bán món hôm nay");
    check("Manager: bật/tắt 'Còn bán hôm nay' chạy", before !== after && /bán món hôm nay|ngừng bán món hôm nay/.test(mt), mt);
    }
  } else {
    // ============================================================ REAL — CHỈ ĐỌC
    if (want("owner")) { // khối owner (bỏ qua khi --only=manager); đóng ở "hết khối owner"
    const be = await readBe();
    const nameOf = (r) => r.split("\n")[0];
    await login("owner");

    await tab.clickMenu("Danh mục món");
    await sleep(1500);
    let list = await rows();
    const beCats = [...be.categories].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
    check("Real · Danh mục: số dòng và tên khớp BE", list.length === beCats.length && beCats.every((c) => list.some((r) => r.includes(c.name))), `${list.length} (BE ${beCats.length})`);
    check("Real · Danh mục: số món từng danh mục khớp BE", beCats.every((c) => list.some((r) => r.includes(c.name) && new RegExp(`\\b${c._count.items}\\b`).test(r))), beCats.map((c) => `${c.name}:${c._count.items}`).join(", "));

    await tab.clickMenu("Menu toàn chuỗi");
    await sleep(1800);
    list = await rows();
    check("Real · Món: số dòng và tên khớp BE", list.length === be.items.length && be.items.every((i) => list.some((r) => r.includes(i.name) && r.includes(i.sku))), `${list.length} (BE ${be.items.length})`);
    const expectBranches = be.branches.length;
    check(
      "Real · Món: 'Có mặt tại' = enabledBranchCount/số chi nhánh của BE",
      be.items.every((i) => list.some((r) => r.includes(i.sku) && r.includes(`${i.enabledBranchCount}/${expectBranches} chi nhánh`))),
      be.items.map((i) => `${i.sku}:${i.enabledBranchCount}/${expectBranches}`).join(", "),
    );
    check("Real · Món: giá hiển thị khớp BE (số nguyên đồng)", be.items.every((i) => list.some((r) => r.includes(i.sku) && r.replace(/\./g, "").includes(String(Math.round(Number(i.price)))))), be.items.map((i) => i.price).join(","));
    check("Real · Món: không còn chữ Suất còn lại / còn lại", !NO_STOCK.test(await tab.text()));

    const cat = be.categories.find((c) => c._count.items > 0) ?? be.categories[0];
    await pickSelect(`document.querySelector(".ant-card")`, cat.name);
    await sleep(1200);
    const filtered = await rows();
    const expectCat = be.items.filter((i) => i.categoryId === cat.id).length;
    check("Real · Món: lọc theo danh mục khớp BE", filtered.length === expectCat, `${filtered.length} (BE ${expectCat}) · ${cat.name}`);
    await q(`document.querySelector(".ant-select-clear")?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))`);
    await sleep(900);

    const sample = be.items[0];
    await searchBox(sample.sku);
    list = await rows();
    check("Real · Món: tìm theo SKU", list.length >= 1 && list.every((r) => r.toLowerCase().includes(sample.sku.toLowerCase())) && list.some((r) => r.includes(sample.name)), `${list.length} hàng`);
    await searchBox("");

    await pickSelect(`document.querySelector(".ant-card")`, "Đã tắt", 1);
    await sleep(1200);
    list = await rows();
    const off = be.items.filter((i) => !i.isActive).length;
    check("Real · Món: lọc 'Đã tắt' khớp BE", list.length === off, `${list.length} (BE ${off})`);
    await pickSelect(`document.querySelector(".ant-card")`, "Đang bán", 1);
    await sleep(1200);
    list = await rows();
    check("Real · Món: lọc 'Đang bán' khớp BE", list.length === be.items.filter((i) => i.isActive).length, `${list.length}`);

    // ============================================================ REAL — tuỳ chọn món (6.3, options = real): đọc khớp BE; mỗi thao tác ghi bấm tới hết xác nhận,
    // request bị chặn ở CDP, so method/đường dẫn/body với DTO của BE (menu.dto.ts), rồi GET lại: dữ liệu không đổi.
    const optionsBase = `/api/v1/restaurant-chains/${be.chainId}/menu`;
    const groupsBefore = JSON.stringify(be.optionGroups);
    const idRe = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
    /** Chạy một thao tác UI, trả các request ghi bị chặn (method, đường dẫn với id → {id}, đường dẫn thật, body đã parse). */
    const writesOf = async (action, settle = 1300) => {
      tab.blockedWrites.length = 0;
      await action();
      await sleep(settle);
      return tab.blockedWrites.map((w) => ({ method: w.method, path: w.path.replace(idRe, "{id}"), rawPath: w.path, body: w.body ? JSON.parse(w.body) : undefined }));
    };
    const dismissAll = async () => {
      await q(`document.querySelectorAll(".ant-notification-notice-close").forEach((b) => b.click()); document.querySelectorAll(".ant-modal-close").forEach((b) => b.click())`);
      await sleep(600);
    };
    const keysOf = (b) => J(Object.keys(b ?? {}).sort());
    const ruleOf = (g) => (g.isRequired ? (g.minSelections === g.maxSelections ? `Bắt buộc, chọn đúng ${g.maxSelections}` : `Bắt buộc, chọn ${g.minSelections}–${g.maxSelections}`) : `Không bắt buộc, chọn ${g.minSelections}–${g.maxSelections}`);

    await tab.clickMenu("Tuỳ chọn món");
    await sleep(1800);
    list = await rows();
    const gs = [...be.optionGroups].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
    check("Real · Tuỳ chọn: số nhóm và tên khớp BE", list.length === gs.length && gs.every((g) => list.some((r) => r.includes(g.name) && r.includes(g.code))), `${list.length} (BE ${gs.length})`);
    check("Real · Tuỳ chọn: quy tắc chọn và số tuỳ chọn từng nhóm khớp BE", gs.every((g) => list.some((r) => r.includes(g.name) && r.includes(ruleOf(g)) && g.options.every((o) => r.includes(o.name)))), gs.map((g) => `${g.code}:${ruleOf(g)}`).join(" · "));
    check("Real · Tuỳ chọn: cột 'Số món' = _count.menuItems của BE (quyết định 18)", gs.every((g) => list.some((r) => r.includes(g.name) && new RegExp(`\\s${g._count.menuItems}\\s+Sửa\\s+Xoá$`).test(r.trim()))), gs.map((g) => `${g.code}:${g._count.menuItems}`).join(", "));
    check("Real · Tuỳ chọn: không còn ghi chú 'lưu tạm' của mock, không có dấu ★ mặc định", !(await has("options-pending-note")) && !list.some((r) => r.includes("★")));
    const g0 = gs[0];
    await expandGroup(g0.name);
    check("Real · Tuỳ chọn: panel trạng thái theo chi nhánh bị ẩn (có ghi chú), không có ô chọn chi nhánh", (await has("branch-states-note")) && !(await q(`!!(${detailOf(g0.code)})?.querySelector(".ant-select")`)));
    const defaultBoxes = await q(`[...(${detailOf(g0.code)}).querySelectorAll('[data-testid="opt-default"]')].map((el) => { const i = el.matches("input") ? el : el.querySelector("input"); return { disabled: i.disabled, checked: i.checked, text: el.closest("label")?.innerText ?? el.innerText } })`);
    check("Real · Tuỳ chọn: ô 'Mặc định' bị khoá, ghi 'chờ BE #15'", defaultBoxes.length === g0.options.length && defaultBoxes.every((b) => b.disabled && !b.checked && /chờ BE #15/.test(b.text)), J(defaultBoxes));
    const o0 = g0.options.slice().sort((a, b) => a.displayOrder - b.displayOrder)[0];
    const o1 = g0.options.slice().sort((a, b) => a.displayOrder - b.displayOrder)[1];
    const optRowsNow = await optRows(g0.code);
    check("Real · Tuỳ chọn: tên, mã, giá từng tuỳ chọn của nhóm đầu khớp BE (giá Decimal chuỗi → số)", optRowsNow.length === g0.options.length && g0.options.every((o) => optRowsNow.some((r) => r.code === o.code && r.name === o.name && Number(r.price.replace(/\D/g, "")) === Math.round(Number(o.priceDelta)))), J(optRowsNow.map((r) => `${r.code}:${r.price}`)));

    // --- tạo nhóm: POST option-groups, CreateMenuOptionGroupDto (BE menu.dto.ts:236-284)
    let w = await writesOf(async () => {
      await click(".ant-card button", "Thêm nhóm");
      await sleep(800);
      await setInput(modal, '[data-testid="group-name"]', "Nhóm kiểm thử");
      await setInput(modal, '[data-testid="group-max"]', "3");
      await sleep(300);
      await clickTid("group-save");
    });
    const nextOrder = Math.max(0, ...be.optionGroups.map((g) => g.displayOrder)) + 1;
    check("Real · Ghi: tạo nhóm → POST option-groups, body {code, name, isRequired, minSelections, maxSelections, displayOrder} (không isActive/options)",
      w.length === 1 && w[0].method === "POST" && w[0].rawPath === `${optionsBase}/option-groups` && keysOf(w[0].body) === keysOf({ code: 1, name: 1, isRequired: 1, minSelections: 1, maxSelections: 1, displayOrder: 1 }) &&
        w[0].body.code === "NHOM-KIEM-THU" && w[0].body.name === "Nhóm kiểm thử" && w[0].body.isRequired === false && w[0].body.minSelections === 0 && w[0].body.maxSelections === 3 && w[0].body.displayOrder === nextOrder,
      J(w.map((x) => ({ m: x.method, p: x.path, b: x.body }))));
    await dismissAll();

    // --- sửa nhóm: PATCH option-groups/:id, bộ ba isRequired/min/max đi cùng nhau (UpdateMenuOptionGroupDto, menu.dto.ts:287-293)
    w = await writesOf(async () => {
      await rowButton(g0.name, "Sửa");
      await sleep(800);
      await setInput(modal, '[data-testid="group-name"]', `${g0.name} đổi`);
      await setInput(modal, '[data-testid="group-max"]', String(g0.maxSelections + 1));
      await sleep(300);
      await clickTid("group-save");
    });
    check("Real · Ghi: sửa nhóm → PATCH option-groups/{id}, body {name, isRequired, minSelections, maxSelections} (đủ bộ ba, không code khi không đổi)",
      w.length === 1 && w[0].method === "PATCH" && w[0].rawPath === `${optionsBase}/option-groups/${g0.id}` && keysOf(w[0].body) === keysOf({ name: 1, isRequired: 1, minSelections: 1, maxSelections: 1 }) &&
        w[0].body.name === `${g0.name} đổi` && w[0].body.isRequired === g0.isRequired && w[0].body.minSelections === g0.minSelections && w[0].body.maxSelections === g0.maxSelections + 1,
      J(w.map((x) => ({ m: x.method, p: x.path, b: x.body }))));
    await dismissAll();

    // --- thêm tuỳ chọn: POST option-groups/:id/options, CreateMenuOptionDto (menu.dto.ts:295-335): code, name, priceDelta, displayOrder
    w = await writesOf(async () => {
      await clickDetail(g0.code, '[data-testid="opt-add"]');
      await sleep(300);
      await setInput(detailOf(g0.code), '[data-testid="option-row-new"] [data-testid="opt-name"]', "Thử");
      await setInput(detailOf(g0.code), '[data-testid="option-row-new"] [data-testid="opt-price"]', "1000");
      await sleep(300);
      await clickDetail(g0.code, '[data-testid="option-row-new"] [data-testid="opt-save"]');
    });
    const nextOptOrder = Math.max(0, ...g0.options.map((o) => o.displayOrder)) + 1;
    check("Real · Ghi: thêm tuỳ chọn → POST …/options, body {code, name, priceDelta, displayOrder} (không isActive/isDefault)",
      w.length === 1 && w[0].method === "POST" && w[0].rawPath === `${optionsBase}/option-groups/${g0.id}/options` && keysOf(w[0].body) === keysOf({ code: 1, name: 1, priceDelta: 1, displayOrder: 1 }) &&
        w[0].body.code === "THU" && w[0].body.name === "Thử" && w[0].body.priceDelta === 1000 && w[0].body.displayOrder === nextOptOrder,
      J(w.map((x) => ({ m: x.method, p: x.path, b: x.body }))));
    await clickDetail(g0.code, '[data-testid="option-row-new"] [data-testid="opt-cancel"]');
    await dismissAll();

    // --- sửa tuỳ chọn: PATCH …/options/:id (UpdateMenuOptionDto = Partial(Create) + isActive, menu.dto.ts:336-343); gửi đúng chuỗi người dùng nhập
    const newPrice = Math.round(Number(o0.priceDelta)) + 1000;
    w = await writesOf(async () => {
      await rowField(g0.code, o0.code, "opt-price", String(newPrice));
      await sleep(300);
      await clickDetail(g0.code, `[data-testid="option-row"][data-code="${o0.code}"] [data-testid="opt-save"]`);
    });
    check("Real · Ghi: sửa tuỳ chọn → PATCH …/options/{id}, body {code, name, priceDelta} (không isDefault, không displayOrder)",
      w.length === 1 && w[0].method === "PATCH" && w[0].rawPath === `${optionsBase}/option-groups/${g0.id}/options/${o0.id}` && keysOf(w[0].body) === keysOf({ code: 1, name: 1, priceDelta: 1 }) &&
        w[0].body.code === o0.code && w[0].body.name === o0.name && w[0].body.priceDelta === newPrice,
      J(w.map((x) => ({ m: x.method, p: x.path, b: x.body }))));
    await dismissAll();

    // --- bật/tắt tuỳ chọn: PATCH {isActive}
    w = await writesOf(async () => {
      await clickTid(`option-active-${g0.code}:${o0.code}`);
    });
    check("Real · Ghi: tắt tuỳ chọn → PATCH …/options/{id}, body CHỈ {isActive:false} (tuỳ chọn không mặc định nên không hỏi xác nhận)",
      w.length === 1 && w[0].method === "PATCH" && w[0].rawPath === `${optionsBase}/option-groups/${g0.id}/options/${o0.id}` && keysOf(w[0].body) === keysOf({ isActive: 1 }) && w[0].body.isActive === false,
      J(w.map((x) => ({ m: x.method, p: x.path, b: x.body }))));
    await dismissAll();

    // --- xoá tuỳ chọn: hộp xác nhận rồi DELETE …/options/:id (không body)
    w = await writesOf(async () => {
      await clickDetail(g0.code, `[data-testid="option-row"][data-code="${o1.code}"] [data-testid="opt-delete"]`);
      await sleep(700);
      await confirmModal("Xoá tuỳ chọn");
    });
    check("Real · Ghi: xoá tuỳ chọn (có hộp xác nhận) → DELETE …/options/{id}, không body",
      w.length === 1 && w[0].method === "DELETE" && w[0].rawPath === `${optionsBase}/option-groups/${g0.id}/options/${o1.id}` && w[0].body === undefined,
      J(w.map((x) => ({ m: x.method, p: x.path, b: x.body }))));
    await dismissAll();

    // --- đổi chỗ hai tuỳ chọn (displayOrder không trùng → 2 lệnh PATCH, quyết định 15/17). Bật chế độ "trả lời giả" tạm thời: request vẫn KHÔNG tới BE.
    const orders = g0.options.slice().sort((a, b) => a.displayOrder - b.displayOrder);
    const hasTie = new Set(orders.map((o) => o.displayOrder)).size !== orders.length;
    tab.fulfillWrites = true;
    w = await writesOf(async () => {
      await clickDetail(g0.code, `[data-testid="option-row"][data-code="${orders[0].code}"] [data-testid="opt-down"]`);
    }, 2200);
    tab.fulfillWrites = false;
    const byId = Object.fromEntries(w.map((x) => [x.rawPath.split("/").pop(), x.body]));
    check(`Real · Ghi: đổi chỗ (${hasTie ? "dữ liệu thật CÓ trùng" : "không trùng"}) → ${hasTie ? "đánh số lại" : "đúng 2 lệnh PATCH displayOrder"}`,
      !hasTie && w.length === 2 && w.every((x) => x.method === "PATCH" && keysOf(x.body) === keysOf({ displayOrder: 1 })) && byId[orders[0].id].displayOrder === orders[1].displayOrder && byId[orders[1].id].displayOrder === orders[0].displayOrder || (hasTie && w.length >= 1),
      J(w.map((x) => ({ m: x.method, p: x.path, b: x.body }))));
    await dismissAll();

    // --- xoá nhóm: hộp xác nhận nêu số món (từ _count.menuItems) rồi DELETE option-groups/:id
    const gDel = gs[gs.length - 1];
    let delText = "";
    w = await writesOf(async () => {
      await rowButton(gDel.name, "Xoá");
      await sleep(700);
      delText = await q(`${tid("delete-usage")}?.innerText ?? ""`);
      await confirmModal("Xoá nhóm");
    });
    check("Real · Ghi: xoá nhóm → hộp xác nhận nêu đúng số món từ _count.menuItems, rồi DELETE option-groups/{id}",
      (gDel._count.menuItems === 0 ? /chưa gắn cho món nào/.test(delText) : new RegExp(`đang gắn cho ${gDel._count.menuItems} món`).test(delText)) && w.length === 1 && w[0].method === "DELETE" && w[0].rawPath === `${optionsBase}/option-groups/${gDel.id}` && w[0].body === undefined,
      `${delText.slice(0, 80)} | ${J(w.map((x) => ({ m: x.method, p: x.path })))}`);
    await dismissAll();

    // --- gắn nhóm cho món (MenuTable): PUT items/:id/option-groups { optionGroupIds }; món không đổi nên KHÔNG có PATCH món
    await tab.clickMenu("Menu toàn chuỗi");
    await sleep(1800);
    const attachItem = be.items.find((i) => be.itemGroups[i.id].length < be.optionGroups.length) ?? be.items[0];
    const attachGroup = gs.find((g) => !be.itemGroups[attachItem.id].includes(g.id) && g.options.length > 0) ?? gs[0];
    let itemUi = {};
    w = await writesOf(async () => {
      await rowButton(attachItem.name, "Sửa");
      await openedDrawer();
      await sleep(900);
      await pickSelect(drawer, attachGroup.name, 1);
      await sleep(400);
      itemUi = await q(`({ noBatchDisabled: ${tid("item-nobatch")}.disabled, label: ${drawer}.innerText, note: ${tid("item-options-note")}?.innerText ?? "" })`);
      await clickTid("item-save");
    });
    check("Real · Món: ô 'Không gom món' bị khoá, ghi 'chờ BE #17'; ghi chú tuỳ chọn không còn nói 'lưu tạm'", itemUi.noBatchDisabled === true && /chờ BE #17/.test(itemUi.label) && !/lưu tạm/.test(itemUi.note), J({ d: itemUi.noBatchDisabled, n: itemUi.note }));
    check("Real · Ghi: gắn nhóm cho món → PUT items/{id}/option-groups, body CHỈ {optionGroupIds:[…]} theo thứ tự đã chọn, không PATCH món",
      w.length === 1 && w[0].method === "PUT" && w[0].rawPath === `${optionsBase}/items/${attachItem.id}/option-groups` && keysOf(w[0].body) === keysOf({ optionGroupIds: 1 }) &&
        J(w[0].body.optionGroupIds) === J([...be.itemGroups[attachItem.id], attachGroup.id]),
      J(w.map((x) => ({ m: x.method, p: x.path, b: x.body }))));
    await dismissAll();
    await q(`document.querySelector(".ant-drawer-close")?.click()`);
    await sleep(600);

    const after = await readBe();
    check("Real · Dữ liệu BE (đọc lại bằng GET): nhóm, tuỳ chọn, _count và nhóm của món KHÔNG đổi sau mọi thao tác ghi", JSON.stringify(after.optionGroups) === groupsBefore && J(after.itemGroups) === J(be.itemGroups) && JSON.stringify(after.items) === JSON.stringify(be.items));
    list = await rows();
    check("Real · Danh sách món thật vẫn hiển thị đúng sau các thao tác", list.length === be.items.length && be.items.every((i) => list.some((r) => r.includes(i.name) && r.includes(i.sku))), `${list.length}/${be.items.length}`);

    } // hết khối owner (bỏ qua khi --only=manager)

    // Manager đọc menu chi nhánh (--only=manager chạy riêng khối này)
    if (want("manager")) {
    await login("manager");
    await tab.clickMenu("Món tại chi nhánh");
    await sleep(1800);
    const list = await q(`[...document.querySelectorAll('[data-testid="branch-menu-row"]')].map((r) => r.innerText.replace(/\\s+/g, " ").trim())`);
    const beBranchItems = (await readBe()).branchMenu.categories.flatMap((c) => c.items);
    check("Real · Manager: món chi nhánh khớp BE (chỉ món đang bật và đã gán)", list.length === beBranchItems.length && beBranchItems.every((i) => list.some((r) => r.includes(i.name))), `${list.length} (BE ${beBranchItems.length})`);
    check("Real · Manager: không còn 'Suất còn lại'/'còn lại'", !NO_STOCK.test((await tab.text()).replace(/Còn bán hôm nay/gi, "")));
    }
  }
} catch (e) {
  console.log("ERROR", e.stack ?? e.message);
  check("script chạy hết không lỗi", false, e.message);
}
await closeTab(tab);
const failed = results.filter((r) => !r.ok);
console.log(`\n[${MODE}] ${results.length - failed.length}/${results.length} đạt`);
process.exit(failed.length ? 1 : 0);
