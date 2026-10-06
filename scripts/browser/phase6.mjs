// Kiểm tra trình duyệt thật cho Giai đoạn 6 (Owner): nhận diện thương hiệu (OW-07). Các khối sau (PayOS, Gói của tôi) thêm dần ở 6.5, 6.6.
//   node scripts/browser/phase6.mjs --mode=mock --only=branding   # dev server cờ mock (VITE_API_*=mock, gồm BRANDING, OPTIONS), AUTH_MODE=mock
//   node scripts/browser/phase6.mjs --mode=real --only=branding   # dev server cổng 5173 với cờ mặc định: CHỈ ĐỌC
//     Mọi request GHI bị chặn ở tầng CDP TRƯỚC khi rời trình duyệt (chỉ cho POST /auth/login|refresh|logout); script bấm tới hết hộp
//     xác nhận, ghi lại method + đường dẫn + body/phần form định gửi và so với DTO của BE. KHÔNG tải logo thật, KHÔNG PUT/DELETE thật.
//     Ca "logo + màu" (2 lệnh liên tiếp) dùng chế độ trả lời giả của cdp.mjs (`fulfillWrites`): request vẫn không tới BE.
import { readFileSync } from "node:fs";
import { accounts, check, cli, closeTab, newTab, results, sleep, SESSION_ALLOW } from "./cdp.mjs";

const CLI = cli();
const MODE = CLI.mode ?? "mock";
const REAL = MODE === "real";
const BLOCKS = ["branding"];
if (CLI.only && !CLI.only.every((n) => BLOCKS.includes(n))) {
  console.log(`--only hỗ trợ: ${BLOCKS.join(", ")} (nhận được: ${CLI.only.join(",")})`);
  process.exit(2);
}
const want = (n) => !CLI.only || CLI.only.includes(n);
const J = JSON.stringify;
const tab = await newTab("about:blank", REAL ? "real" : "mock");
const q = (expr) => tab.eval(expr);
if (REAL) await tab.blockWrites(SESSION_ALLOW);

const PLATFORM_PRIMARY = "#0a0a0a"; // nhận diện nền tảng (BR-44)
// PNG 1×1 hợp lệ, dùng làm logo thử.
const PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const tid = (id) => `document.querySelector('[data-testid=${J(id)}]')`;
const has = (id) => q(`!!${tid(id)}`);
const clickTid = (id) => q(`(() => { const el = ${tid(id)}; if (!el) return false; el.click(); return true })()`);
const toasts = () => q(`[...document.querySelectorAll(".ant-message-notice, .ant-notification-notice")].map((e) => e.textContent).join(" | ")`);
const waitToast = async (text, ms = 4500) => {
  for (let i = 0; i < ms / 250; i++) {
    const t = await toasts();
    if (t.includes(text)) return t;
    await sleep(250);
  }
  return toasts();
};
const spaGo = async (to) => {
  await q(`(() => { history.pushState({}, "", ${J(to)}); dispatchEvent(new PopStateEvent("popstate")); })()`);
  await sleep(900);
};
const setName = (value) =>
  q(`(() => { const el = ${tid("branding-name")}; const input = el.matches("input") ? el : el.querySelector("input");
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, ${J(value)}); input.dispatchEvent(new Event("input", { bubbles: true })); })()`);
const nameValue = () => q(`(() => { const el = ${tid("branding-name")}; return (el.matches("input") ? el : el.querySelector("input")).value })()`);
const clickPreset = (i) => q(`document.querySelectorAll('[data-testid="branding-preset"]')[${i}].click()`);
const presetColor = (i) => q(`document.querySelectorAll('[data-testid="branding-preset"]')[${i}].getAttribute("data-color")`);
const pickLogo = ({ size, type = "image/png", name = "logo.png" }) =>
  q(`(() => {
    const input = ${tid("branding-logo-input")};
    const bytes = ${size ? `new Uint8Array(${size})` : `Uint8Array.from(atob(${J(PNG_B64)}), (c) => c.charCodeAt(0))`};
    const dt = new DataTransfer(); dt.items.add(new File([bytes], ${J(name)}, { type: ${J(type)} }));
    input.files = dt.files; input.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
const brandVar = () => tab.cssVar("--brand-primary");
const statusText = () => q(`${tid("branding-status")}?.innerText ?? ""`);
const previewSrc = () => q(`${tid("branding-logo-preview")}?.getAttribute("src") ?? ""`);
const lower = (x) => String(x ?? "").toLowerCase();
const freshLogin = async (role, route) => {
  await tab.goto("/login");
  await tab.clearStorage();
  await tab.goto("/login");
  await tab.login(role);
  await tab.waitFor(`location.pathname.startsWith("/${role === "admin" ? "admin" : role === "manager" ? "manager" : "owner"}")`, 20000, "vào " + role);
  await tab.waitFor(`document.querySelector(".ant-layout-sider")`, 15000, "shell " + role);
  await sleep(900);
  if (route) {
    await spaGo(route);
    await tab.waitFor(`document.querySelector('[data-testid="branding-save"]')`, 15000, "màn Nhận diện");
    await sleep(500);
  }
};
const gotoBranding = async () => {
  await spaGo("/owner/reports");
  await spaGo("/owner/branding");
  await tab.waitFor(`document.querySelector('[data-testid="branding-save"]')`, 15000, "màn Nhận diện");
  await sleep(500);
};
const dismissAll = async () => {
  await q(`document.querySelectorAll(".ant-notification-notice-close").forEach((b) => b.click()); document.querySelectorAll(".ant-modal-close").forEach((b) => b.click())`);
  await sleep(500);
};
const confirmOk = async (okText) => {
  await sleep(500);
  return q(`(() => { const b = [...document.querySelectorAll(".ant-modal-confirm button")].find((x) => x.textContent.includes(${J(okText)})); if (!b) return false; b.click(); return true })()`);
};

/** Đọc nhận diện BE bằng GET (chỉ đọc) để đối chiếu; đăng nhập bằng .env của BE (không in mật khẩu). */
async function readBe() {
  const env = Object.fromEntries(
    readFileSync("C:/Capstone_Project/BE_FnB/SmartFnBBackend/.env", "utf8")
      .split(/\r?\n/)
      .filter((l) => /^[A-Z_]+=/.test(l))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^["']|["']$/g, "")]),
  );
  const base = "http://localhost:3100/api/v1";
  const call = async (path, token, init = {}) => {
    const r = await fetch(base + path, { ...init, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
    return { status: r.status, body: await r.json().catch(() => null) };
  };
  const asRole = async (email) => (await call("/auth/login", null, { method: "POST", body: JSON.stringify({ email, password: env.SEED_DEMO_PASSWORD }) })).body.accessToken;
  const owner = await asRole("owner.demo@smartfnb.local");
  const chainId = (await call("/auth/me", owner)).body.chainIds[0];
  const branding = (await call(`/restaurant-chains/${chainId}/branding`, owner)).body;
  const mgr = await asRole("manager.demo@smartfnb.local");
  const managerGet = await call(`/restaurant-chains/${chainId}/branding`, mgr);
  return { chainId, branding, managerStatus: managerGet.status };
}

// Mặc định của BE (branding.service.ts:21-25) để suy isCustom giống mapper của web.
const BE_DEFAULTS = { primaryColor: "#0f172a", secondaryColor: "#ffffff", accentColor: "#22c55e" };
const isCustomOf = (b) => !!b.logoUrl || lower(b.primaryColor) !== BE_DEFAULTS.primaryColor || lower(b.secondaryColor) !== BE_DEFAULTS.secondaryColor || lower(b.accentColor) !== BE_DEFAULTS.accentColor;

try {
  // ============================================================ MOCK — nhận diện
  if (want("branding") && !REAL) {
    await freshLogin("owner");
    await tab.scenario({ profile: "A", tier: "STANDARD" });
    await spaGo("/owner/branding");
    await tab.waitFor(`document.querySelector('[data-testid="branding-save"]')`, 15000, "màn Nhận diện");
    await sleep(500);

    check("Gói Tiêu chuẩn: màn Nhận diện mở, không có ghi chú khoá", !(await has("branding-plan-lock")) && (await q(`${tid("branding-save")}.disabled`)) === false);
    const before = await brandVar();
    const target = await presetColor(6);
    await setName("Quán Thử Nghiệm");
    await clickPreset(6);
    await pickLogo({});
    await sleep(500);
    check("Chọn logo: chỉ xem trước tại chỗ (blob:), hiện 'chưa tải lên', chưa lưu gì", (await previewSrc()).startsWith("blob:") && /chưa tải lên/.test(await q(`${tid("branding-logo-pending")}?.innerText ?? ""`)));
    check("Chọn màu/tên/logo mà chưa Lưu: giao diện thật chưa đổi", (await brandVar()) === before, `${before} → ${await brandVar()}`);

    await clickTid("branding-save");
    const saveToast = await waitToast("Đã lưu nhận diện");
    await sleep(600);
    check("Lưu: báo 'Đã lưu nhận diện', Owner thấy màu mới NGAY (--brand-primary đổi)", saveToast.includes("Đã lưu nhận diện") && lower(await brandVar()) === lower(target), `${await brandVar()} (mong ${target})`);
    check("Lưu: logo đã lưu (hết 'chưa tải lên'), trạng thái 'nhận diện riêng', tên mới còn trong ô", !(await has("branding-logo-pending")) && /nhận diện riêng/.test(await statusText()) && (await nameValue()) === "Quán Thử Nghiệm" && (await previewSrc()).startsWith("data:"));

    // F5 vẫn còn
    await tab.goto("/owner/branding");
    await tab.waitFor(`document.querySelector(".ant-layout-sider")`, 20000, "shell sau F5");
    await tab.scenario({ profile: "A", tier: "STANDARD" });
    await sleep(1200);
    check("F5: màu, tên, logo đã lưu vẫn còn (mock lưu localStorage)", lower(await brandVar()) === lower(target) && (await nameValue()) === "Quán Thử Nghiệm" && (await previewSrc()).startsWith("data:"), `${await brandVar()} | ${await nameValue()}`);
    check("F5: khoá localStorage 'smartfnb:mock:branding:v1:<chainId>' có mặt", (await q(`Object.keys(localStorage).filter((k) => k.startsWith("smartfnb:mock:branding:v1:")).length`)) >= 1);

    // Form dở dang + nạp lại → hỏi
    await setName("Đang gõ dở");
    await tab.openMockPanel();
    await tab.setSelect("mock-failure", "network");
    // Tab "khác" phát BRANDING_UPDATED cho đúng doanh nghiệp: lấy tenantId thật từ localStorage nhận diện đã lưu.
    const tenantId = await q(`(Object.keys(localStorage).find((k) => k.startsWith("smartfnb:mock:branding:v1:")) ?? "").replace("smartfnb:mock:branding:v1:", "")`);
    await q(`new BroadcastChannel("smartfnb_channel").postMessage({ type: "BRANDING_UPDATED", tenantId: ${J(tenantId)} })`);
    await sleep(1500);
    const retryClicked = await q(`(() => { const b = [...document.querySelectorAll(".ant-notification-notice button")].find((x) => /Thử lại/.test(x.textContent)); if (!b) return false; b.click(); return true })()`);
    await sleep(700);
    const askText = await q(`document.querySelector(".ant-modal-confirm")?.innerText ?? ""`);
    check("Form dở dang + bấm Thử lại: hỏi 'Nội dung đang nhập sẽ mất' (form đã đăng ký useDirtyGuard)", retryClicked && /Nội dung đang nhập sẽ mất/.test(askText), askText.slice(0, 80));
    await q(`(() => { const b = [...document.querySelectorAll(".ant-modal-confirm button")].find((x) => x.textContent.includes("Huỷ")); b?.click() })()`);
    await sleep(500);
    check("Bấm Huỷ: giữ nguyên nội dung đang gõ", (await nameValue()) === "Đang gõ dở");
    await tab.setSelect("mock-failure", "none");
    await dismissAll();
    await setName("Quán Thử Nghiệm");

    // Kiểm tệp/tên trước khi gửi
    await pickLogo({ size: 1024 * 1024 + 10 });
    check("Logo > 1 MB: bị chặn trước khi gửi, báo tiếng Việt, không có logo chờ", /vượt quá 1 MB/.test(await waitToast("1 MB")) && !(await has("branding-logo-pending")));
    await dismissAll();
    await pickLogo({ type: "image/gif", name: "logo.gif" });
    check("Logo GIF: bị chặn (chỉ PNG/JPG)", /PNG hoặc JPG/.test(await waitToast("PNG hoặc JPG")) && !(await has("branding-logo-pending")));
    await dismissAll();
    await setName("a".repeat(51));
    await clickTid("branding-save");
    check("Tên > 50 ký tự: chặn trước khi gửi, báo tiếng Việt", /tối đa 50/.test(await waitToast("tối đa 50")));
    await dismissAll();
    await setName("Quán Thử Nghiệm");

    // Độ tương phản thấp
    await clickPreset(3);
    await clickTid("branding-save");
    check("Màu chủ đạo tương phản thấp: cảnh báo, chữ nút tự chuyển đen (BR-43)", /tương phản thấp/.test(await waitToast("tương phản thấp")));
    await dismissAll();

    // BR-44: nhận diện quán không áp lên Admin, /setup-password
    await clickPreset(6);
    await clickTid("branding-save");
    await waitToast("Đã lưu nhận diện");
    await sleep(500);
    await spaGo("/setup-password?token=abc");
    check("BR-44: /setup-password luôn dùng nhận diện nền tảng dù Owner đã lưu màu riêng", lower(await brandVar()) === PLATFORM_PRIMARY, await brandVar());
    await spaGo("/owner/branding");
    await freshLoginKeepStorage("admin");

    // Khôi phục mặc định có xác nhận
    await freshLoginKeepStorage("owner");
    await tab.scenario({ profile: "A", tier: "STANDARD" });
    await spaGo("/owner/branding");
    await tab.waitFor(`document.querySelector('[data-testid="branding-save"]')`, 15000, "màn Nhận diện");
    await sleep(600);
    const customVar = await brandVar();
    await clickTid("branding-reset");
    await sleep(600);
    check("Khôi phục mặc định: hiện hộp xác nhận nêu rõ những gì bị đặt lại", /Tên hiển thị, màu chủ đạo, màu nhấn và logo/.test(await q(`${tid("branding-reset-confirm")}?.innerText ?? ""`)));
    await q(`(() => { const b = [...document.querySelectorAll(".ant-modal-confirm button")].find((x) => x.textContent.includes("Huỷ")); b?.click() })()`);
    await sleep(600);
    check("Bấm Huỷ: không đổi gì", (await brandVar()) === customVar && /nhận diện riêng/.test(await statusText()));
    await clickTid("branding-reset");
    await confirmOk("Khôi phục");
    await waitToast("Đã khôi phục");
    await sleep(700);
    check("Khôi phục: về theme mặc định (primary nền tảng, trạng thái 'theme mặc định', hết logo)", lower(await brandVar()) === PLATFORM_PRIMARY && /theme mặc định/.test(await statusText()) && !(await previewSrc()));
    await tab.goto("/owner/branding");
    await tab.waitFor(`document.querySelector(".ant-layout-sider")`, 20000, "shell sau F5");
    await tab.scenario({ profile: "A", tier: "STANDARD" });
    await sleep(1000);
    check("F5 sau khôi phục: vẫn mặc định (không hiện lại bản cũ)", lower(await brandVar()) === PLATFORM_PRIMARY && /theme mặc định/.test(await statusText()));

    // CHỈ đổi tên (quyết định 28): áp tên ngay, màu vẫn của nền tảng
    await setName("Quán Chỉ Tên");
    await clickTid("branding-save");
    await waitToast("Đã lưu nhận diện");
    await sleep(700);
    const siderText = await q(`document.querySelector(".ant-layout-sider")?.innerText ?? ""`);
    check("Chỉ đổi tên: tên mới áp ngay trên thanh bên, màu chủ đạo VẪN của nền tảng, trạng thái 'nhận diện riêng'", siderText.includes("Quán Chỉ Tên") && lower(await brandVar()) === PLATFORM_PRIMARY && /nhận diện riêng/.test(await statusText()), `${(await brandVar())} | ${siderText.slice(0, 60).replace(/\s+/g, " ")}`);

    // Nạp lại khi điều hướng (quyết định 29): Manager ở tab KHÁC thấy nhận diện Owner vừa lưu khi chuyển trang. Đồng hồ của tab Manager được
    // đẩy lên 61 giây (ghi đè Date.now trong trang) để vượt khoảng 60 giây mà không phải chờ; chặn 60 giây/lỗi im lặng đã có test đơn vị.
    const tabB = await newTab("about:blank", "mock");
    try {
      await tabB.goto("/login");
      await tabB.login("manager");
      await tabB.waitFor(`location.pathname.startsWith("/manager")`, 20000, "Manager vào được");
      await tabB.waitFor(`document.querySelector(".ant-layout-sider")`, 15000, "shell Manager");
      await sleep(900);
      const mgrBefore = await tabB.cssVar("--brand-primary");
      const mgrSider = await tabB.eval(`document.querySelector(".ant-layout-sider")?.innerText ?? ""`);
      check("Manager (tab khác) đăng nhập: thấy tên chỉ-đổi-tên của Owner, màu vẫn của nền tảng", lower(mgrBefore) === PLATFORM_PRIMARY && mgrSider.includes("Quán Chỉ Tên"), `${mgrBefore}`);
      // Tab Owner không phát BroadcastChannel nữa: giả lập Manager ở MÁY KHÁC (không có kênh liên tab), chỉ học được qua nạp lại khi điều hướng.
      await q(`BroadcastChannel.prototype.postMessage = () => {}`);
      await clickPreset(6);
      await clickTid("branding-save");
      await waitToast("Đã lưu nhận diện");
      await sleep(600);
      const blue = await presetColor(6);
      await sleep(800);
      check("Trước khi điều hướng: Manager chưa đổi màu (chưa nạp lại)", lower(await tabB.cssVar("--brand-primary")) === PLATFORM_PRIMARY);
      await tabB.eval(`(() => { const real = Date.now; Date.now = () => real() + 61000; })()`);
      await tabB.eval(`(() => { history.pushState({}, "", "/manager/staff"); dispatchEvent(new PopStateEvent("popstate")); })()`);
      await sleep(1800);
      check("Manager chuyển trang sau khi Owner lưu (quá 60 giây): thấy màu nhận diện mới, không có thông báo lỗi", lower(await tabB.cssVar("--brand-primary")) === lower(blue) && !/lỗi|sự cố/i.test(await tabB.eval(`[...document.querySelectorAll(".ant-message-notice, .ant-notification-notice")].map((e) => e.textContent).join(" | ")`)), `${await tabB.cssVar("--brand-primary")} (mong ${blue})`);
    } finally {
      await closeTab(tabB);
    }
    await freshLoginKeepStorage("owner");
    await tab.scenario({ profile: "A", tier: "STANDARD" });
    await spaGo("/owner/branding");
    await tab.waitFor(`document.querySelector('[data-testid="branding-save"]')`, 15000, "màn Nhận diện");
    await sleep(500);

    // Gói Cơ bản: khoá toàn bộ
    await tab.scenario({ profile: "A", tier: "BASIC" });
    await sleep(900);
    const locked = await q(`({
      note: ${tid("branding-plan-lock")}?.innerText ?? "",
      name: ${tid("branding-name")}.disabled || ${tid("branding-name")}.querySelector?.("input")?.disabled === true,
      save: ${tid("branding-save")}.disabled, reset: ${tid("branding-reset")}.disabled,
      file: ${tid("branding-logo-input")}.disabled,
      presets: [...document.querySelectorAll('[data-testid="branding-preset"]')].every((b) => b.disabled),
    })`);
    check("Gói Cơ bản: màn vẫn hiện, ghi 'Cần gói Tiêu chuẩn trở lên', khoá mọi ô và nút (không có request ghi)", /Cần gói Tiêu chuẩn trở lên/.test(locked.note) && locked.name && locked.save && locked.reset && locked.file && locked.presets, J(locked));
    await tab.scenario({ profile: "A", tier: "STANDARD" });
  }

  // ============================================================ REAL — CHỈ ĐỌC; mọi request ghi bị chặn ở CDP
  if (want("branding") && REAL) {
    const be = await readBe();
    const base = `/api/v1/restaurant-chains/${be.chainId}/branding`;
    const idRe = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
    const beCustom = isCustomOf(be.branding);
    const writesOf = async (action, settle = 1500) => {
      tab.blockedWrites.length = 0;
      await action();
      await sleep(settle);
      return tab.blockedWrites.map((w) => ({ method: w.method, path: w.path.replace(idRe, "{id}"), rawPath: w.path, contentType: w.contentType, raw: w.body, body: (() => { try { return w.body ? JSON.parse(w.body) : undefined; } catch { return undefined; } })() }));
    };
    const keysOf = (b) => J(Object.keys(b ?? {}).sort());

    await freshLogin("owner", "/owner/branding");
    check("Real · GET: tên hiển thị trong ô khớp BE", (await nameValue()) === be.branding.displayName, `${await nameValue()} (BE ${be.branding.displayName})`);
    const pickerTexts = await q(`[...document.querySelectorAll(".ant-color-picker-trigger-text")].map((e) => e.textContent.trim().toLowerCase())`);
    check("Real · GET: màu chủ đạo và màu nhấn khớp BE", pickerTexts[0] === lower(be.branding.primaryColor) && pickerTexts[1] === lower(be.branding.accentColor), `${J(pickerTexts)} (BE ${lower(be.branding.primaryColor)}, ${lower(be.branding.accentColor)})`);
    check(`Real · isCustom suy đúng từ mặc định BE (${beCustom})`, beCustom ? /nhận diện riêng/.test(await statusText()) : /theme mặc định/.test(await statusText()), await statusText());
    check("Real · Giao diện áp đúng: chưa tuỳ biến → màu nền tảng; đã tuỳ biến → màu BE", lower(await brandVar()) === (beCustom ? lower(be.branding.primaryColor) : PLATFORM_PRIMARY), await brandVar());
    check("Real · Gói demo có brandingEnabled: màn mở, không khoá", !(await has("branding-plan-lock")) && (await q(`${tid("branding-save")}.disabled`)) === false);
    check("Real · BE có logo thì hiển thị bằng URL tuyệt đối; không có thì chỗ trống", be.branding.logoUrl ? (await previewSrc()).startsWith("http") : !(await previewSrc()), be.branding.logoUrl ? await previewSrc() : "BE chưa có logo (không tải thử, ca URL tuyệt đối được kiểm bằng test đơn vị mapper)");

    // --- chỉ tên + màu: đúng 1 PUT, không logoUrl
    let w = await writesOf(async () => {
      await setName(`${be.branding.displayName} X`);
      await clickPreset(1);
      await sleep(300);
      await clickTid("branding-save");
    });
    const red = await presetColor(1);
    check("Real · Ghi: đổi tên + màu → đúng 1 PUT /branding, body CHỈ {displayName, primaryColor} (không logoUrl/secondaryColor)",
      w.length === 1 && w[0].method === "PUT" && w[0].rawPath === base && keysOf(w[0].body) === keysOf({ displayName: 1, primaryColor: 1 }) && w[0].body.displayName === `${be.branding.displayName} X` && lower(w[0].body.primaryColor) === lower(red) && w[0].contentType === "application/json",
      J(w.map((x) => ({ m: x.method, p: x.path, b: x.body }))));
    await dismissAll();
    await gotoBranding();

    // --- chỉ logo: đúng 1 POST multipart, field `file`
    w = await writesOf(async () => {
      await pickLogo({ name: "logo-thu.png" });
      await sleep(400);
      await clickTid("branding-save");
    });
    check("Real · Ghi: chọn logo rồi Lưu → đúng 1 POST /branding/logo, multipart/form-data, field `file` (tên tệp, loại image/png)",
      w.length === 1 && w[0].method === "POST" && w[0].rawPath === `${base}/logo` && /^multipart\/form-data; boundary=/.test(w[0].contentType ?? "") && /name="file"/.test(w[0].raw ?? "") && /filename="logo-thu\.png"/.test(w[0].raw ?? "") && /image\/png/.test(w[0].raw ?? ""),
      J(w.map((x) => ({ m: x.method, p: x.path, ct: x.contentType, partHead: (x.raw ?? "").slice(0, 120) }))));
    await dismissAll();
    await gotoBranding();

    // --- chỉ chọn logo rồi KHÔNG lưu: không có request ghi nào (quyết định 10/25)
    w = await writesOf(async () => {
      await pickLogo({});
      await sleep(500);
    }, 800);
    check("Real · Chọn logo mà chưa Lưu: 0 request ghi (chỉ xem trước)", w.length === 0 && (await previewSrc()).startsWith("blob:"), J(w.map((x) => x.path)));
    await gotoBranding();

    // --- khôi phục mặc định: xác nhận rồi DELETE, không body
    w = await writesOf(async () => {
      await clickTid("branding-reset");
      await sleep(600);
      await confirmOk("Khôi phục");
    });
    check("Real · Ghi: Khôi phục mặc định (có hộp xác nhận) → đúng 1 DELETE /branding, không body", w.length === 1 && w[0].method === "DELETE" && w[0].rawPath === base && !w[0].raw, J(w.map((x) => ({ m: x.method, p: x.path }))));
    await dismissAll();
    await gotoBranding();

    // --- logo mới + màu: 2 lệnh, THỨ TỰ POST logo rồi PUT (trả lời giả để lệnh thứ hai chạy; request vẫn không tới BE)
    tab.fulfillBody = J(be.branding);
    tab.fulfillWrites = true;
    w = await writesOf(async () => {
      await pickLogo({ name: "logo-hai.png" });
      await clickPreset(2);
      await sleep(300);
      await clickTid("branding-save");
    }, 2500);
    tab.fulfillWrites = false;
    tab.fulfillBody = undefined;
    check("Real · Ghi: logo mới + đổi màu → 2 lệnh đúng thứ tự: POST /branding/logo rồi PUT /branding {primaryColor}",
      w.length === 2 && w[0].method === "POST" && w[0].rawPath === `${base}/logo` && w[1].method === "PUT" && w[1].rawPath === base && keysOf(w[1].body) === keysOf({ primaryColor: 1 }),
      J(w.map((x) => ({ m: x.method, p: x.path, b: x.body }))));
    await dismissAll();

    // --- gói Cơ bản (panel ghi đè gói): khoá, không có request ghi
    await gotoBranding();
    await tab.scenario({ profile: "A", tier: "BASIC" });
    await sleep(900);
    w = await writesOf(async () => {
      await clickTid("branding-save");
      await clickTid("branding-reset");
      await clickTid("branding-logo-pick");
    }, 800);
    const lockedReal = await q(`({ note: ${tid("branding-plan-lock")}?.innerText ?? "", save: ${tid("branding-save")}.disabled, reset: ${tid("branding-reset")}.disabled })`);
    check("Real · Gói Cơ bản: ghi chú 'Cần gói Tiêu chuẩn trở lên', nút Lưu/Khôi phục khoá, 0 request ghi", /Cần gói Tiêu chuẩn trở lên/.test(lockedReal.note) && lockedReal.save && lockedReal.reset && w.length === 0, J(lockedReal));
    await tab.scenario({ profile: "A", tier: "STANDARD" });

    // --- dữ liệu BE không đổi
    const after = await readBe();
    check("Real · Dữ liệu BE (đọc lại bằng GET) KHÔNG đổi sau mọi thao tác ghi", J(after.branding) === J(be.branding));

    // --- Manager đọc được, không lỗi
    await freshLogin("manager");
    const mgrToasts = await toasts();
    check("Real · Manager: đăng nhập vào được, không có thông báo lỗi nhận diện (BE cho Manager đọc: HTTP " + be.managerStatus + ")", be.managerStatus === 200 && !/lỗi|không đủ quyền|sự cố/i.test(mgrToasts), mgrToasts);
    check("Real · Manager: giao diện đúng nhận diện (mặc định → nền tảng; tuỳ biến → màu BE)", lower(await brandVar()) === (beCustom ? lower(be.branding.primaryColor) : PLATFORM_PRIMARY), await brandVar());
    await freshLogin("admin");
    check("Real · Admin: luôn nhận diện nền tảng (BR-44), không có lỗi nhận diện", lower(await brandVar()) === PLATFORM_PRIMARY && !/lỗi|sự cố/i.test(await toasts()), await brandVar());
  }
} catch (e) {
  console.log("ERROR", e.stack ?? e.message);
  check("script chạy hết không lỗi", false, e.message);
}

/** Đăng nhập lại vai khác mà KHÔNG xoá localStorage (giữ nhận diện mock đã lưu). */
async function freshLoginKeepStorage(role) {
  await q(`(localStorage.removeItem("smartfnb_access_token"), localStorage.removeItem("smartfnb_refresh_token"), sessionStorage.clear(), true)`);
  await tab.goto("/login");
  await tab.login(role);
  await tab.waitFor(`location.pathname.startsWith("/${role === "admin" ? "admin" : "owner"}")`, 20000, "vào " + role);
  await tab.waitFor(`document.querySelector(".ant-layout-sider")`, 15000, "shell " + role);
  await sleep(900);
  if (role === "admin") check("BR-44: Admin luôn nhận diện nền tảng dù chuỗi đã lưu màu riêng", lower(await brandVar()) === PLATFORM_PRIMARY, await brandVar());
}

await closeTab(tab);
const failed = results.filter((r) => !r.ok);
console.log(`\n[${MODE}] ${results.length - failed.length}/${results.length} đạt`);
process.exit(failed.length ? 1 : 0);
