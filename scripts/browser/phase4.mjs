// Kiểm tra trình duyệt thật cho Giai đoạn 4.2: danh mục + món của Owner, menu chi nhánh của Manager.
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
