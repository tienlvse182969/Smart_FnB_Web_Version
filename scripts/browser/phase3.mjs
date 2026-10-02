// Kiểm tra trình duyệt thật cho Giai đoạn 3.2–3.3: hồ sơ đăng ký + doanh nghiệp + gói của Platform Admin, Landing, form đăng ký.
//   node scripts/browser/phase3.mjs mock   # dev server có VITE_API_ADMIN=mock (+ auth/branch/report=mock nếu BE không chạy)
//   node scripts/browser/phase3.mjs real   # chỉ phần ĐỌC (danh sách, KPI, quét ví) + gia hạn 1 lần trên doanh nghiệp seed
// Xem README.md để biết biến môi trường (BASE_URL, AUTH_MODE…). Chế độ "real" KHÔNG duyệt, từ chối, tạm ngưng, đổi gói,
// đặt lại mật khẩu, tạo/sửa gói trên dữ liệu thật; chỉ gửi 1 hồ sơ qua form (tạo hồ sơ PENDING). Gia hạn thật chỉ chạy khi
// đặt ALLOW_REAL_RENEW=1.
import { newTab, closeTab, check, results, sleep, SESSION_ALLOW } from "./cdp.mjs";

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
// Real: luôn chặn request ghi ở tầng CDP (chỉ cho phiên đăng nhập); form đăng ký được bấm tới hết rồi so với DTO của BE.
if (REAL && !tab.blockedWrites) await tab.blockWrites(SESSION_ALLOW);
const q = (expr) => tab.eval(expr);
const J = JSON.stringify;

/** Bấm phần tử đầu tiên khớp selector (và chứa text nếu có); CHỜ tới 8 giây cho phần tử xuất hiện. Trả true nếu bấm được. */
const click = async (sel, text) => {
  const expr = `(() => {
    const el = [...document.querySelectorAll(${J(sel)})].find((e) => !${J(text ?? "")} || e.textContent.includes(${J(text ?? "")}));
    if (!el) return false; el.click(); return true; })()`;
  for (let i = 0; i < 32; i++) {
    if (await q(expr)) return true;
    await sleep(250);
  }
  return false;
};

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

const stamp = Date.now();
const newBiz = `Quán Thử Nghiệm ${stamp}`;

try {
  // ------------------------------------------------------------------ Landing (chưa đăng nhập)
  await tab.goto("/login");
  await tab.clearStorage();
  await tab.goto("/");
  await sleep(1200);
  const landing = await tab.text();
  const banned = landing.match(/(^|[^\p{L}])(bàn|waiter|bếp|kitchen|ví)([^\p{L}]|$)/iu);
  check("Landing: không còn chữ 'bàn', 'waiter', 'bếp', 'ví'", !banned, banned ? `gặp "${banned[2]}"` : "");
  check(
    "Landing: bảng giá có Cơ bản / Tiêu chuẩn / Nâng cao, không còn 'Mở rộng' và hạn mức bàn",
    ["Cơ bản", "Tiêu chuẩn", "Nâng cao"].every((n) => landing.includes(n)) && !landing.includes("Mở rộng") && !/bàn mỗi chi nhánh/i.test(landing) && /₫ \/ tháng/.test(landing),
  );
  check("Landing: nội dung v9 (trả trước tại quầy, pha chế, gọi số, PayOS)", /trả tiền trước tại quầy/.test(landing) && /gọi số/i.test(landing) && /PayOS/.test(landing));

  // ------------------------------------------------------------------ form đăng ký GU-01
  const noBranchField = await q(`!document.querySelector("#branchCount")`);
  const fieldIds = await q(`[...document.querySelectorAll("#signup-form input")].map((e) => e.id)`);
  check("Form đăng ký: đúng trường BE, không còn ô 'số chi nhánh dự kiến'", noBranchField && ["businessName", "taxCode", "headquartersAddress", "representativeName", "representativeEmail", "representativePhone"].every((id) => fieldIds.includes(id)), fieldIds.join(","));
  await click("#signup-form button[type=submit]");
  await sleep(500);
  check("Form đăng ký: để trống thì báo lỗi, chưa gửi", /Vui lòng nhập tên doanh nghiệp/.test(await tab.text()));
  const fill = (id, v) => setInput(`document`, `#${id}`, v);
  await fill("businessName", newBiz);
  await fill("taxCode", "0312345999");
  await fill("headquartersAddress", "99 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh");
  await fill("representativeName", "Người Thử Nghiệm");
  await fill("representativeEmail", `thu.${stamp}@example.com`);
  await fill("representativePhone", "0901234567");
  if (tab.blockedWrites) tab.blockedWrites.length = 0;
  await click("#signup-form button[type=submit]");
  await sleep(2500);
  if (REAL) {
    // Request ghi bị chặn ở CDP trước khi rời trình duyệt: kiểm method/path/body định gửi so với DTO của BE
    // (SubmitRegistrationApplicationDto, platform-admin.dto.ts:20-61). Đạt nếu khớp; KHÔNG tính là trượt.
    const write = tab.blockedWrites.find((w) => w.method === "POST" && /\/registration-applications$/.test(w.path));
    const body = write ? JSON.parse(write.body ?? "null") : null;
    const expected = {
      businessName: newBiz,
      taxCode: "0312345999",
      headquartersAddress: "99 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
      representativeName: "Người Thử Nghiệm",
      representativeEmail: `thu.${stamp}@example.com`,
      representativePhone: "0901234567",
    };
    check(
      "Form đăng ký (real): request định gửi = POST /registration-applications khớp DTO của BE (6 trường, không còn số chi nhánh dự kiến), bị chặn trước khi rời trình duyệt",
      !!body && J(Object.fromEntries(Object.entries(body).sort())) === J(Object.fromEntries(Object.entries(expected).sort())),
      write ? `${write.method} ${write.path}` : "không có request",
    );
  } else {
    check("Form đăng ký: gửi xong hiện xác nhận 'đang chờ duyệt'", /Hồ sơ của bạn đang chờ duyệt/.test(await tab.text()), await tab.text().then((t) => t.slice(0, 0)));
  }

  // ------------------------------------------------------------------ đăng nhập admin
  if (REAL) {
    await tab.goto("/login");
    await tab.clearStorage();
    await tab.goto("/login");
  } else {
    // Mock sống trong bộ nhớ trang: tải lại trang sẽ mất hồ sơ vừa nộp, nên sang đăng nhập bằng điều hướng trong SPA.
    await click("header button", "Đã có tài khoản");
    await sleep(800);
  }
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
  check("Hồ sơ: lọc Tất cả → có phân trang (≥ 2 trang; dữ liệu thật ít thì chỉ cần 1 trang)", REAL ? pagers.length >= 1 : pagers.length >= 2, `trang: ${pagers.join(",")}`);
  if (pagers.length >= 2) {
    await click(".ant-pagination-item", "2");
    await sleep(1000);
    const allPage2 = await rows();
    check("Hồ sơ: chuyển trang đổi nội dung", allPage2.length > 0 && allPage2[0] !== allPage1[0], `${allPage1.length} → ${allPage2.length} hàng`);
    await click(".ant-pagination-item", "1");
    await sleep(700);
  }

  await pickSelect(`document.querySelector(".ant-card")`, "Bị từ chối");
  await sleep(900);
  list = await rows();
  check("Hồ sơ: lọc theo trạng thái Bị từ chối", (REAL || list.length > 0) && list.every((r) => r.includes("Bị từ chối")), `${list.length} hàng`);

  await pickSelect(`document.querySelector(".ant-card")`, "Chờ duyệt");
  await sleep(700);
  if (!REAL) {
    await search("rang xay");
    list = await rows();
    check("Hồ sơ: tìm kiếm chạy ('rang xay' → 1 hồ sơ)", list.length === 1 && /Rang Xay/i.test(list[0]), list.join(" // ").slice(0, 80));
  }
  await search(newBiz);
  list = await rows();
  if (REAL) {
    // Hồ sơ không được gửi (request bị chặn) nên KHÔNG kỳ vọng thấy nó ở màn Admin; kiểm là tìm kiếm không ra gì và không vỡ.
    check("Hồ sơ (real): vì request ghi bị chặn nên hồ sơ thử không có ở màn Admin, tìm kiếm trả rỗng", list.length === 0, `${list.length} hàng`);
  } else {
    check("Hồ sơ vừa nộp qua form hiện ở màn Admin (Chờ duyệt)", list.length === 1 && list[0].includes(newBiz) && list[0].includes("Chờ duyệt"), list.join(" // ").slice(0, 100));
  }
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

  // gia hạn: mock luôn chạy; real chỉ khi ALLOW_REAL_RENEW=1 (1 lần, trên doanh nghiệp đầu tiên)
  if (REAL && !process.env.ALLOW_REAL_RENEW) console.log("SKIP  gia hạn trên dữ liệu thật (đặt ALLOW_REAL_RENEW=1 để chạy)");
  const target = REAL ? null : "Cà Phê Mộc Nhà";
  if (!REAL || process.env.ALLOW_REAL_RENEW) {
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
  }

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

  // ------------------------------------------------------------------ gói PA-04 (mock; KHÔNG tạo/sửa gói thật)
  if (!REAL) {
    await tab.clickMenu("Gói dịch vụ");
    await sleep(1200);
    const planHeaders = await q(`[...document.querySelectorAll(".ant-table-thead th")].map((e) => e.textContent.trim())`);
    check("Gói: bảng có mã, cấp, trạng thái; liệt kê gói thật của mock", ["Gói", "Mã", "Cấp", "Giá / tháng", "Trạng thái"].every((c) => planHeaders.includes(c)) && (await rows()).length >= 3, planHeaders.join(","));
    const tiers = (await rows()).map((r) => r.replace(/\s+/g, " "));
    check("Gói: cấp suy từ mã (BASIC → Cơ bản), mã lạ → 'Chưa xếp cấp'", tiers.some((r) => /BASIC Cơ bản/.test(r)) && tiers.some((r) => /LEGACY Chưa xếp cấp/.test(r)), tiers.join(" // ").slice(0, 120));

    // thêm
    await click(".ant-card button", "Thêm gói");
    await sleep(900);
    const drawer = `document.querySelector(".ant-drawer-body")`;
    const emptyDefaults = await q(`[...document.querySelectorAll(".ant-drawer-body input")].filter((e) => e.type !== "checkbox" && e.getAttribute("role") !== "switch").every((e) => e.value === "")`);
    check("Gói: form thêm mới để trống, không có số mặc định viết cứng", emptyDefaults);
    const saveDisabled = await q(`[...document.querySelectorAll(".ant-drawer-body button")].find((b) => b.textContent.includes("Lưu gói")).disabled`);
    check("Gói: chưa nhập đủ thì nút Lưu bị khoá", saveDisabled === true);
    await setInput(drawer, "input", "Nâng cao");
    await sleep(300);
    const suggested = await q(`document.querySelectorAll(".ant-drawer-body input")[1].value`);
    const aiOn = await q(`!!document.querySelector('[data-testid="plan-feature-aiAssistant"] .lucide-check')`);
    check("Gói: mã tự gợi ý từ tên ('Nâng cao' → ADVANCED) và cờ tính năng suy từ cấp (có Trợ lý AI)", suggested === "ADVANCED" && aiOn, `mã=${suggested}`);
    await setInput(drawer, "input", "Gói Thử Nghiệm");
    await sleep(300);
    const suggested2 = await q(`document.querySelectorAll(".ant-drawer-body input")[1].value`);
    // sửa mã tay: ghi đè gợi ý
    await q(`(() => { const el = document.querySelectorAll(".ant-drawer-body input")[1];
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, "THU_NGHIEM"); el.dispatchEvent(new Event("input", { bubbles: true })); })()`);
    await sleep(300);
    await setInput(drawer, "input", "Gói Thử Nghiệm Hai");
    await sleep(300);
    const kept = await q(`document.querySelectorAll(".ant-drawer-body input")[1].value`);
    check("Gói: mã sửa tay thì không bị gợi ý ghi đè nữa; mã lạ → 'Chưa xếp cấp'", suggested2 === "GOI_THU_NGHIEM" && kept === "THU_NGHIEM" && /Chưa xếp cấp/.test(await q(`document.querySelector(".ant-drawer-body").innerText`)), `gợi ý=${suggested2}, sau sửa=${kept}`);
    const nums = await q(`[...document.querySelectorAll(".ant-drawer-body .ant-input-number-input")].length`);
    await setInput(`document.querySelectorAll(".ant-drawer-body .ant-input-number")[0]`, "input", 450000);
    await setInput(`document.querySelectorAll(".ant-drawer-body .ant-input-number")[1]`, "input", 3);
    await setInput(`document.querySelectorAll(".ant-drawer-body .ant-input-number")[2]`, "input", 20);
    await sleep(400);
    check("Gói: form có giá, chi nhánh, tài khoản và không có ô số bàn", nums === 3 && !/bàn/i.test(await q(`document.querySelector(".ant-drawer-body").innerText`)));
    // hai cờ gói (BE lưu) hiện trong form và sửa được; mọi thao tác ghi qua hộp xác nhận
    check("Gói: form có công tắc Nhận diện và So sánh đa chi nhánh (đọc/ghi thật), cờ AI chỉ suy từ mã", (await q(`!!document.querySelector('[data-testid="plan-branding"]')`)) && (await q(`!!document.querySelector('[data-testid="plan-comparison"]')`)) && /chờ BE lưu cờ AI/.test(await q(`document.querySelector(".ant-drawer-body").innerText`)));
    await q(`document.querySelector('[data-testid="plan-branding"]').click()`);
    await sleep(200);
    await click(".ant-drawer-body button", "Lưu gói");
    await sleep(700);
    const planConfirm = await q(`document.querySelector('[data-testid="confirm-plan"]')?.innerText ?? ""`);
    check("Gói: hộp xác nhận nêu mã, giá, hạn mức và hai cờ", /THU_NGHIEM/.test(planConfirm) && /Nhận diện thương hiệu: bật/.test(planConfirm) && /So sánh đa chi nhánh: tắt/.test(planConfirm), planConfirm.replace(/\s+/g, " "));
    await click(".ant-modal-confirm button", "Tạo gói");
    await sleep(1500);
    check("Gói: thêm gói mới thành công, hiện trong bảng", (await toasts()).includes("Đã tạo gói mới") && (await rows()).some((r) => r.includes("THU_NGHIEM") && r.includes("Chưa xếp cấp")), await toasts());

    // sửa + tắt
    await click(".ant-table-tbody > tr.ant-table-row", "THU_NGHIEM");
    await sleep(900);
    await setInput(`document.querySelectorAll(".ant-drawer-body .ant-input-number")[0]`, "input", 500000);
    await click(".ant-drawer-body .ant-switch");
    await sleep(300);
    await click(".ant-drawer-body button", "Lưu gói");
    await sleep(700);
    await click(".ant-modal-confirm button", "Lưu gói");
    await sleep(1500);
    const edited = (await rows()).find((r) => r.includes("THU_NGHIEM")) ?? "";
    check("Gói: sửa giá và tắt 'Đang bán' → bảng hiện giá mới và 'Ngừng bán'", (await toasts()).includes("Đã cập nhật gói") && /500\.000/.test(edited) && /Ngừng bán/.test(edited), edited.slice(0, 100));
    // gói ngừng bán không chọn được khi duyệt
    await tab.clickMenu("Hồ sơ đăng ký");
    await sleep(1200);
    await openRow(newBiz);
    await click(".ant-drawer-body button", "Duyệt");
    await sleep(900);
    await q(`(() => { const m = ${visibleModal}; m.querySelector(".ant-select-content, .ant-select-selector").dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); })()`);
    await sleep(400);
    const offered = await q(`[...document.querySelectorAll(".ant-select-item-option")].map((e) => e.textContent)`);
    check("Gói ngừng bán không còn trong danh sách chọn khi duyệt hồ sơ", offered.length >= 3 && !offered.some((t) => t.includes("Thử Nghiệm")), offered.map((t) => t.slice(0, 14)).join(" | "));
    await click(".ant-modal-close");
    await closeDrawer();
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
