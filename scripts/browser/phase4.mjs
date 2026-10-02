// Kiểm tra trình duyệt thật cho Giai đoạn 4.2 (danh mục + món của Owner, menu chi nhánh của Manager) và 4.3 (tuỳ chọn món, mock).
//   node scripts/browser/phase4.mjs mock   # dev server có VITE_API_MENU=mock (+ AUTH/BRANCH/REPORT=mock), AUTH_MODE=mock: CRUD đầy đủ
//   node scripts/browser/phase4.mjs real   # dev server cổng 5173 với cờ mặc định, BE chạy: CHỈ ĐỌC — không thêm/sửa/xoá/bật tắt gì
// Chế độ real so sánh với dữ liệu BE đọc bằng GET (đăng nhập demo bằng .env của BE, không in mật khẩu).
import { readFileSync } from "node:fs";
import { newTab, closeTab, check, results, sleep } from "./cdp.mjs";

const MODE = process.argv[2] ?? "mock";
const REAL = MODE === "real";
const J = JSON.stringify;
const tab = await newTab("about:blank", REAL ? "real" : "mock");
const q = (expr) => tab.eval(expr);

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
  return { categories, items, branches, branchMenu };
}

try {
  if (!REAL) {
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
    check("Danh mục: trùng tên → 409, hiện thông báo BE", /already exists/.test(await toasts()), await toasts());
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
    check("Danh mục: xoá danh mục còn món → 409, hiện thông báo BE, danh mục còn nguyên", /item\(s\)/.test(await toasts()) && (await rows()).some((r) => r.includes("Cà phê")), await toasts());

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
    check("Món: trùng SKU → 409, hiện thông báo BE", /SKU already exists/.test(await toasts()), await toasts());
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
    await sleep(1500);
    check("Món: xoá thành công", !(await rows()).some((r) => r.includes("Món Thử Đã Sửa")));

    // ============================================================ MOCK — Owner: tuỳ chọn món (4.3; options luôn là mock)
    await tab.clickMenu("Tuỳ chọn món");
    await sleep(1300);
    list = await rows();
    check("Tuỳ chọn: màn có 4 nhóm mẫu (Size, Đường, Đá, Topping) và ghi chú 'lưu tạm, chờ BE'", ["Size", "Đường", "Đá", "Topping"].every((n) => list.some((r) => r.includes(n))) && /chờ BE/.test(await q(`${tid("options-pending-note")}?.innerText ?? ""`)), `${list.length} nhóm`);

    // --- Size: bắt buộc, chọn đúng 1, có mặc định. Trước hết thử các vi phạm quy tắc.
    await click(".ant-card button", "Thêm nhóm");
    await sleep(800);
    await setInput(modal, '[data-testid="group-name"]', "Size thử");
    await sleep(300);
    check("Nhóm: mã tự gợi ý từ tên", (await q(`${tid("group-code")}.value`)) === "SIZE-THU");
    await setInput(modal, '[data-testid="opt-name"]', "M");
    await clickTid("group-required");
    await setInput(modal, '[data-testid="group-min"]', "0");
    await sleep(300);
    check("Quy tắc: nhóm bắt buộc mà tối thiểu 0 → báo lỗi, khoá nút Lưu", /bắt buộc phải có số chọn tối thiểu/.test(await groupModalErrors()) && (await saveDisabled()) === true, await groupModalErrors());
    await setInput(modal, '[data-testid="group-min"]', "3");
    await setInput(modal, '[data-testid="group-max"]', "1");
    await sleep(300);
    check("Quy tắc: min > max → báo lỗi, khoá nút Lưu", /tối thiểu không được lớn hơn/.test(await groupModalErrors()) && (await saveDisabled()) === true);
    await setInput(modal, '[data-testid="group-min"]', "1");
    await setInput(modal, '[data-testid="group-max"]', "0");
    await sleep(300);
    check("Quy tắc: max < 1 → báo lỗi", /tối đa phải từ 1/.test(await groupModalErrors()));
    await setInput(modal, '[data-testid="group-max"]', "1");
    await clickIn(modal, "Thêm tuỳ chọn");
    await sleep(300);
    await setInput(modal, '[data-testid="opt-name"]', "L", 1);
    await setInput(modal, '[data-testid="opt-price"]', "6000", 1);
    await blurAll();
    await sleep(300);
    // đánh dấu cả hai là mặc định → vượt max (=1)
    await q(`document.querySelectorAll('[data-testid="opt-default"]').forEach((el) => (el.matches("input") ? el : el.querySelector("input")).click())`);
    await sleep(300);
    check("Quy tắc: số mặc định > max → báo lỗi", /mặc định không được vượt quá/.test(await groupModalErrors()), await groupModalErrors());
    await q(`(() => { const els = [...document.querySelectorAll('[data-testid="opt-default"]')]; (els[1].matches("input") ? els[1] : els[1].querySelector("input")).click(); })()`);
    await sleep(400);
    check("Quy tắc: hợp lệ thì hết lỗi, nút Lưu mở", (await groupModalErrors()) === "" && (await saveDisabled()) === false, await groupModalErrors());
    await clickTid("group-save");
    list = await waitRowWith("Size thử");
    check("Nhóm: thêm Size (bắt buộc, đúng 1, M mặc định, L +6.000)", list.some((r) => r.includes("Size thử") && r.includes("Bắt buộc, chọn đúng 1") && r.includes("M ★") && /L \+6\.000/.test(r)), (list.find((r) => r.includes("Size thử")) ?? "").slice(0, 120));

    // --- Topping: không bắt buộc, tối đa 3, có giá
    await click(".ant-card button", "Thêm nhóm");
    await sleep(800);
    await setInput(modal, '[data-testid="group-name"]', "Topping thử");
    await setInput(modal, '[data-testid="group-max"]', "3");
    const tops = [["Trân châu", 5000], ["Thạch dừa", 5000], ["Pudding", 7000], ["Flan", 8000]];
    for (const [i, [n, pr]] of tops.entries()) {
      if (i > 0) await clickIn(modal, "Thêm tuỳ chọn");
      await sleep(250);
      await setInput(modal, '[data-testid="opt-name"]', n, i);
      await setInput(modal, '[data-testid="opt-price"]', String(pr), i);
    }
    await sleep(400);
    check("Quy tắc: topping không bắt buộc, 0–3 hợp lệ (không cần mặc định)", (await groupModalErrors()) === "" && (await saveDisabled()) === false, await groupModalErrors());
    await clickTid("group-save");
    list = await waitRowWith("Topping thử");
    check("Nhóm: thêm Topping (không bắt buộc, chọn 0–3, 4 tuỳ chọn có giá)", list.some((r) => r.includes("Topping thử") && r.includes("Không bắt buộc, chọn 0–3") && r.includes("Pudding +7.000")), (list.find((r) => r.includes("Topping thử")) ?? "").slice(0, 140));

    // trùng mã nhóm: form vẫn cho lưu (form không biết các mã khác), mock trả 409
    await click(".ant-card button", "Thêm nhóm");
    await sleep(800);
    await setInput(modal, '[data-testid="group-name"]', "Trùng mã");
    await setInput(modal, '[data-testid="group-code"]', "SIZE-THU");
    await setInput(modal, '[data-testid="opt-name"]', "X");
    await sleep(300);
    await clickTid("group-save");
    await sleep(1200);
    check("Nhóm: trùng mã trong chuỗi → 409 từ mock, hiện thông báo", /đã được dùng/.test(await toasts()), await toasts());
    await q(`document.querySelector(".ant-modal-close")?.click()`);
    await sleep(600);

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
    await pickSelect(drawer, "Size thử", 1);
    await pickSelect(drawer, "Topping thử", 1);
    await sleep(400);
    check("Món: gắn được hai nhóm", (await has("item-group-SIZE-THU")) && (await has("item-group-TOPPING-THU")));
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
    check("Xoá nhóm: hộp xác nhận nêu tên món đang dùng", /1 món/.test(usageText) && usageText.includes("Món Tuỳ Chọn"), usageText);
    await confirmModal("Xoá nhóm");
    await sleep(1300);
    list = await rows();
    check("Xoá nhóm: nhóm biến mất khỏi danh sách", !list.some((r) => r.includes("Topping thử")));
    await rowButton("Size thử", "Xoá");
    await confirmModal("Xoá nhóm");
    await sleep(1000);

    await tab.clickMenu("Menu toàn chuỗi");
    await sleep(1500);
    await rowButton("Món Tuỳ Chọn", "Sửa");
    await openedDrawer();
    await sleep(600);
    check("Xoá nhóm: món đã được gỡ nhóm", !(await has("item-group-TOPPING-THU")) && !(await has("item-group-SIZE-THU")));
    await q(`document.querySelector(".ant-drawer-close")?.click()`);
    await sleep(700);
    await rowButton("Món Tuỳ Chọn", "Xoá");
    await confirmModal("Xoá món");
    await sleep(1200);

    // ============================================================ MOCK — Manager: món chi nhánh
    await login("manager");
    await tab.clickMenu("Món tại chi nhánh");
    await sleep(1500);
    list = await rows();
    const mgrText = await tab.text();
    check("Manager: Món tại chi nhánh có dữ liệu, không còn 'Suất còn lại'/'còn lại'", list.length > 0 && !NO_STOCK.test(mgrText.replace(/Còn bán hôm nay/gi, "")), `${list.length} món`);
    const before = await q(`document.querySelector(".ant-switch").classList.contains("ant-switch-checked")`);
    await q(`document.querySelector(".ant-switch").click()`);
    await sleep(1300);
    const after = await q(`document.querySelector(".ant-switch").classList.contains("ant-switch-checked")`);
    const mt = await waitToast("bán món hôm nay");
    check("Manager: bật/tắt 'Còn bán hôm nay' chạy", before !== after && /bán món hôm nay|ngừng bán món hôm nay/.test(mt), mt);
  } else {
    // ============================================================ REAL — CHỈ ĐỌC
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

    // ============================================================ REAL — tuỳ chọn mock gắn lên món thật, KHÔNG ghi BE
    // Cài bộ ghi các request không phải GET (fetch + XHR) trong trang; sau bước gắn phải rỗng.
    await tab.clickMenu("Tuỳ chọn món");
    await sleep(1500);
    list = await rows();
    check("Real · Tuỳ chọn: màn tuỳ chọn (mock) hiện nhóm mẫu và ghi chú 'chờ BE'", list.length >= 4 && /chờ BE/.test(await q(`${tid("options-pending-note")}?.innerText ?? ""`)), `${list.length} nhóm`);

    await tab.clickMenu("Menu toàn chuỗi");
    await sleep(1800);
    await q(`(() => {
      window.__writes = [];
      const of = window.fetch; window.fetch = (u, init) => { const m = (init?.method ?? (u?.method ?? "GET")).toUpperCase(); if (m !== "GET") window.__writes.push(m + " " + (u?.url ?? u)); return of.call(window, u, init); };
      const oo = XMLHttpRequest.prototype.open; XMLHttpRequest.prototype.open = function (m, u, ...r) { if (String(m).toUpperCase() !== "GET") window.__writes.push(String(m).toUpperCase() + " " + u); return oo.call(this, m, u, ...r); };
    })()`);
    const realItem = be.items[0];
    const beforeItems = JSON.stringify((await readBe()).items);
    await rowButton(realItem.name, "Sửa");
    await openedDrawer();
    await sleep(700);
    await pickSelect(drawer, "Size", 1);
    await sleep(300);
    check("Real · Món thật: gắn nhóm mock vào món thật (theo ID thật), xem trước hiện", (await has("item-group-SIZE")) && /Thêm vào giỏ/.test(await q(`${tid("option-preview")}?.innerText ?? ""`)));
    const realPrice = Math.round(Number(realItem.price));
    check("Real · Xem trước: giá = giá món thật + mặc định (Size M +0)", digits(await price()) === String(realPrice), `${await price()} (BE ${realPrice})`);
    await clickTid("preview-option-SIZE:SIZE-L");
    await sleep(300);
    check("Real · Xem trước: Size L cộng 6.000 vào giá món thật", digits(await price()) === String(realPrice + 6000), await price());
    await clickTid("item-save");
    await sleep(1800);
    const writes = await q(`window.__writes`);
    check("Real · Lưu tuỳ chọn không gửi request ghi nào lên BE", Array.isArray(writes) && writes.length === 0, J(writes));
    const afterItems = JSON.stringify((await readBe()).items);
    check("Real · Dữ liệu món trên BE (đọc lại bằng GET) không đổi", beforeItems === afterItems);
    await rowButton(realItem.name, "Sửa");
    await openedDrawer();
    await sleep(700);
    check("Real · Mở lại món thật: nhóm mock vẫn gắn (lưu theo ID thật)", (await has("item-group-SIZE")));
    await q(`document.querySelector(".ant-drawer-close")?.click()`);
    await sleep(600);
    list = await rows();
    check("Real · Danh sách món thật vẫn hiển thị đúng sau khi gắn nhóm", list.length === be.items.length && be.items.every((i) => list.some((r) => r.includes(i.name) && r.includes(i.sku))), `${list.length}/${be.items.length}`);

    // Manager đọc menu chi nhánh
    await login("manager");
    await tab.clickMenu("Món tại chi nhánh");
    await sleep(1800);
    list = await rows();
    const beBranchItems = be.branchMenu.categories.flatMap((c) => c.items);
    check("Real · Manager: món chi nhánh khớp BE (chỉ món đang bật và đã gán)", list.length === beBranchItems.length && beBranchItems.every((i) => list.some((r) => r.includes(i.name))), `${list.length} (BE ${beBranchItems.length})`);
    check("Real · Manager: không còn 'Suất còn lại'/'còn lại'", !NO_STOCK.test((await tab.text()).replace(/Còn bán hôm nay/gi, "")));
  }
} catch (e) {
  console.log("ERROR", e.stack ?? e.message);
  check("script chạy hết không lỗi", false, e.message);
}
await closeTab(tab);
const failed = results.filter((r) => !r.ok);
console.log(`\n[${MODE}] ${results.length - failed.length}/${results.length} đạt`);
process.exit(failed.length ? 1 : 0);
