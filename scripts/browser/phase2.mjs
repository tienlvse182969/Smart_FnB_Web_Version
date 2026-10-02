// Kiểm tra trình duyệt thật cho Giai đoạn 2: token màu, gói/khoá tính năng/chỉ đọc, lỗi API, cờ module, refresh liên tab.
// Cần: dev server đang chạy (PORT), Chrome CDP (scripts/browser/chrome.mjs), BE chạy cho nhóm dùng API thật.
//   node scripts/browser/phase2.mjs [brand|plan|errors|ai|refresh|flip|login]   (bỏ trống = tất cả trừ flip)
// "flip" chạy trên dev server khởi động với VITE_API_AUTH=mock VITE_API_BRANCH=mock VITE_API_REPORT=mock + AUTH_MODE=mock.
import { newTab, closeTab, check, results, sleep } from "./cdp.mjs";

const only = process.argv[2];
const want = (g) => (only ? only === g : g !== "flip");
const text = (t) => t.text();

async function freshOwner(tab, role = "owner") {
  await tab.goto("/login");
  await tab.clearStorage();
  await tab.goto("/login");
  await tab.login(role);
  await tab.waitFor(`location.pathname.startsWith("/${role === "admin" ? "admin" : "owner"}")`, 20000, "vào khu vực " + role);
  await tab.waitFor(`document.querySelector(".ant-layout-sider")`, 15000, "shell");
  await sleep(600);
}

const toMenu = async (tab, label) => {
  await tab.clickMenu(label);
  await sleep(900);
};

try {
  const tab = await newTab();

  // ---------------------------------------------------------------- login / nhận diện nền tảng
  if (want("login")) {
    await tab.goto("/login");
    await tab.clearStorage();
    await tab.goto("/login");
    check("trang đăng nhập dùng nhận diện nền tảng (primary = ink)", (await tab.cssVar("--brand-primary")) === "#0a0a0a", await tab.cssVar("--brand-primary"));

    await freshOwner(tab);
    const flags = tab.consoleLog.some((l) => l.includes("[api] cờ module"));
    check("bảng cờ module được in ra console ở chế độ dev", flags, flags ? "có" : "không thấy");

    await tab.scenario({ profile: "A", tier: "ADVANCED" });
    const orange = await tab.cssVar("--brand-primary");
    check("owner (ADVANCED, mock A) thấy màu thương hiệu riêng", orange !== "#0a0a0a", orange);

    await tab.logout();
    await tab.waitFor(`location.pathname === "/login"`, 10000, "về /login");
    await sleep(500);
    check("sau đăng xuất, trang đăng nhập quay về nhận diện nền tảng dù tenant đang có màu", (await tab.cssVar("--brand-primary")) === "#0a0a0a", await tab.cssVar("--brand-primary"));

    await freshOwner(tab, "admin");
    check("Admin luôn nhận diện nền tảng", (await tab.cssVar("--brand-primary")) === "#0a0a0a", await tab.cssVar("--brand-primary"));
  }

  // ---------------------------------------------------------------- đổi nhận diện giữa 2 doanh nghiệp mock
  if (want("brand")) {
    await freshOwner(tab);
    const screens = ["Tổng quan", "Chi nhánh", "Menu toàn chuỗi", "Tài khoản quản lý", "Nhận diện"];
    const snap = async (label) => {
      const out = {};
      for (const s of screens) {
        await toMenu(tab, s);
        out[s] = {
          primary: await tab.cssVar("--brand-primary"),
          sider: await tab.siderBg(),
          // Nút chính ĐANG MỞ: nút bị khoá (ví dụ "Thêm tài khoản" khi tạo Manager chờ BE #23) có màu xám chung, không nói gì về thương hiệu.
          primaryBtn: await tab.eval(`(() => { const b = document.querySelector(".ant-btn-primary:not([disabled])"); return b ? getComputedStyle(b).backgroundColor : null })()`),
          statusLate: await tab.cssVar("--status-late"),
          success: await tab.cssVar("--sem-success-text"),
        };
      }
      return out;
    };

    await tab.scenario({ profile: "A", tier: "STANDARD" });
    const a = await snap("A");
    await tab.scenario({ profile: "B", tier: "STANDARD" });
    const b = await snap("B");

    const primaries = (x) => new Set(Object.values(x).map((v) => v.primary));
    check("A: một màu primary duy nhất trên mọi màn", primaries(a).size === 1, [...primaries(a)].join(","));
    check("B: một màu primary duy nhất trên mọi màn", primaries(b).size === 1, [...primaries(b)].join(","));
    check("primary đổi khi đổi doanh nghiệp mock (A ≠ B)", [...primaries(a)][0] !== [...primaries(b)][0], `${[...primaries(a)][0]} → ${[...primaries(b)][0]}`);
    check(
      "thanh bên đổi màu theo doanh nghiệp trên mọi màn",
      screens.every((s) => a[s].sider !== b[s].sider) && new Set(screens.map((s) => a[s].sider)).size === 1,
      `${a["Tổng quan"].sider} → ${b["Tổng quan"].sider}`,
    );
    const btnScreens = screens.filter((s) => a[s].primaryBtn && b[s].primaryBtn);
    check("nút chính đổi màu theo doanh nghiệp ở các màn có nút chính", btnScreens.length >= 3 && btnScreens.every((s) => a[s].primaryBtn !== b[s].primaryBtn), btnScreens.join(", "));
    check(
      "màu trạng thái giữ nguyên khi đổi nhận diện",
      screens.every((s) => a[s].statusLate === b[s].statusLate && a[s].success === b[s].success),
      `late=${a["Tổng quan"].statusLate} success=${a["Tổng quan"].success}`,
    );

    // BASIC: nhận diện đã lưu của B không được áp (BR-41)
    await tab.scenario({ profile: "B", tier: "BASIC" });
    check("gói Cơ bản: dùng nhận diện nền tảng dù B đã lưu màu", (await tab.cssVar("--brand-primary")) === "#0a0a0a", await tab.cssVar("--brand-primary"));
  }

  // ---------------------------------------------------------------- gói BASIC / STANDARD / ADVANCED / hết hạn
  if (want("plan")) {
    await freshOwner(tab);
    const locked = async (label) => {
      await toMenu(tab, label);
      return tab.eval(`!!document.querySelector('[data-testid="feature-lock"]')`);
    };
    const lockedCompare = async () => {
      await toMenu(tab, "Tổng quan");
      await sleep(1200);
      return tab.eval(`!!document.querySelector('[data-testid="feature-lock"]')`);
    };
    const matrix = {
      BASIC: { ai: true, branding: true, compare: true },
      STANDARD: { ai: true, branding: false, compare: false },
      ADVANCED: { ai: false, branding: false, compare: false },
    };
    for (const tier of Object.keys(matrix)) {
      await tab.scenario({ profile: "A", tier });
      const got = { ai: await locked("Trợ lý số liệu"), branding: await locked("Nhận diện"), compare: await lockedCompare() };
      for (const k of Object.keys(matrix[tier])) {
        check(`${tier}: ${k} ${matrix[tier][k] ? "khoá" : "mở"}`, got[k] === matrix[tier][k], `thực tế ${got[k] ? "khoá" : "mở"}`);
      }
    }

    // thẻ khoá nêu tên gói cần nâng, không ẩn hẳn
    await tab.scenario({ profile: "A", tier: "BASIC" });
    await toMenu(tab, "Trợ lý số liệu");
    const lockText = await text(tab);
    check("thẻ khoá AI nêu gói cần nâng (Nâng cao) và vẫn nằm trong sidebar", lockText.includes("Nâng cao") && (await tab.sidebar()).includes("Trợ lý số liệu"));

    // hết hạn: chỉ đọc
    await tab.scenario({ profile: "A", tier: "ADVANCED", expired: true });
    await toMenu(tab, "Chi nhánh");
    const banner = await tab.eval(`!!document.querySelector('[data-testid="read-only-banner"]')`);
    check("hết hạn: banner chỉ đọc hiện ở đầu trang", banner);
    const addDisabled = await tab.eval(`(() => { const b = [...document.querySelectorAll("button")].find((x) => /Thêm chi nhánh/.test(x.textContent)); return b ? b.disabled : null })()`);
    check("hết hạn: nút Thêm chi nhánh bị vô hiệu hoá", addDisabled === true, String(addDisabled));
    const hasTooltipWrap = await tab.eval(`!!document.querySelector('[data-testid="action-guard"]')`);
    check("hết hạn: nút có vỏ tooltip lý do", hasTooltipWrap);
    await toMenu(tab, "Tài khoản quản lý");
    const mgrDisabled = await tab.eval(`(() => { const b = [...document.querySelectorAll("button")].find((x) => /Thêm/.test(x.textContent)); return b ? b.disabled : null })()`);
    check("hết hạn: nút Thêm ở Tài khoản quản lý bị vô hiệu hoá", mgrDisabled === true, String(mgrDisabled));
    await toMenu(tab, "Menu toàn chuỗi");
    const sw = await tab.eval(`(() => { const s = document.querySelector(".ant-table .ant-switch"); return s ? s.classList.contains("ant-switch-disabled") : null })()`);
    check("hết hạn: công tắc bật/tắt món bị vô hiệu hoá", sw === true, String(sw));
    // mở lại
    await tab.scenario({ profile: "A", tier: "ADVANCED", expired: false });
    await toMenu(tab, "Chi nhánh");
    const reEnabled = await tab.eval(`(() => { const b = [...document.querySelectorAll("button")].find((x) => /Thêm chi nhánh/.test(x.textContent)); return b ? !b.disabled : null })()`);
    check("gia hạn lại: nút Thêm chi nhánh mở lại, banner biến mất", reEnabled === true && !(await tab.eval(`!!document.querySelector('[data-testid="read-only-banner"]')`)));
  }

  // ---------------------------------------------------------------- AI trả dữ liệu thật từ bộ mock
  if (want("ai")) {
    await freshOwner(tab);
    await tab.scenario({ profile: "A", tier: "ADVANCED" });
    await toMenu(tab, "Trợ lý số liệu");
    const ask = async (q) => {
      await tab.eval(`[...document.querySelectorAll("button")].find((b) => b.textContent.includes(${JSON.stringify(q)})).click()`);
      await sleep(2500);
      return text(tab);
    };
    const t1 = await ask("Hôm nay chi nhánh nào doanh thu cao nhất?");
    check("AI doanh thu: có số liệu, không rỗng", /\d[\d.]*đ/.test(t1) && !t1.includes("Không có giao dịch nào"), "");
    const t2 = await ask("Top 5 món bán chạy tháng này");
    check("AI món bán chạy: có danh sách", /Top \d món bán chạy/.test(t2) && !t2.includes("Không có món nào"));
    const t3 = await ask("Hôm nay mỗi chi nhánh có bao nhiêu đơn?");
    check("AI số đơn: có bảng số đơn theo chi nhánh", /đơn \(huỷ/.test(t3));
  }

  // ---------------------------------------------------------------- lỗi API thống nhất
  if (want("errors")) {
    await freshOwner(tab);
    await tab.scenario({ profile: "A", tier: "ADVANCED" });
    const msgs = () => tab.eval(`[...document.querySelectorAll(".ant-message-notice, .ant-notification-notice")].map((e) => e.textContent).join(" | ")`);

    await tab.openMockPanel();
    // Dùng màn còn chạy mock (Tuỳ chọn món): "Menu toàn chuỗi" đã là real từ 4.2 nên lỗi giả lập của panel mock không chạm tới.
    await tab.setSelect("mock-failure", "forbidden");
    await toMenu(tab, "Tuỳ chọn món");
    await sleep(1200);
    check("403 → thông báo không đủ quyền", /không đủ quyền/i.test(await msgs()), await msgs());

    await tab.setSelect("mock-failure", "quota");
    await toMenu(tab, "Tổng quan");
    await toMenu(tab, "Tuỳ chọn món");
    await sleep(1200);
    check("lỗi hạn mức → thông báo vượt hạn mức", /vượt hạn mức/i.test(await msgs()), await msgs());

    await tab.setSelect("mock-failure", "network");
    await toMenu(tab, "Tổng quan");
    await toMenu(tab, "Tuỳ chọn món");
    await sleep(1200);
    const net = await tab.eval(`(() => { const n = document.querySelector(".ant-notification-notice"); return n ? { text: n.textContent, retry: !![...n.querySelectorAll("button")].find((b) => /Thử lại/.test(b.textContent)) } : null })()`);
    check("lỗi mạng → thông báo kèm nút Thử lại", !!net && net.retry && /kết nối/i.test(net.text), JSON.stringify(net));

    await tab.setSelect("mock-failure", "none");
    await tab.eval(`[...document.querySelectorAll(".ant-notification-notice button")].find((b) => /Thử lại/.test(b.textContent))?.click()`);
    await sleep(2500);
    const after = await msgs();
    check("bấm Thử lại khi mạng ổn → kết nối lại thành công", /kết nối lại/i.test(after) || !/Mất kết nối/.test(after), after);

    await tab.setSelect("mock-failure", "unauthorized");
    await toMenu(tab, "Tổng quan");
    await toMenu(tab, "Tuỳ chọn món");
    await tab.waitFor(`location.pathname === "/login"`, 10000, "về /login sau 401").catch(() => {});
    check("401 → hết phiên, về /login", (await tab.path()) === "/login", await tab.path());
    await tab.eval(`localStorage.removeItem("fnb.mock.failure")`);
  }

  // ---------------------------------------------------------------- 2 tab cùng hết hạn access token
  if (want("refresh")) {
    await freshOwner(tab);
    const other = await newTab("about:blank", undefined, { warm: false });
    await other.goto("/owner/branches");
    await other.waitFor(`document.querySelector(".ant-layout-sider")`, 15000, "tab 2 vào được");
    await toMenu(tab, "Chi nhánh");
    await sleep(500);

    // làm hỏng access token (localStorage dùng chung) → mọi request kế tiếp của cả hai tab dính 401
    await tab.eval(`localStorage.setItem("smartfnb_access_token", "token-het-han")`);
    const before = [tab, other].reduce((n, t) => n + t.requests.filter((r) => /\/auth\/refresh/.test(r.url)).length, 0);
    // cả hai tab cùng bấm sang "Tổng quan" (gọi 3 báo cáo thật) gần như đồng thời
    await Promise.all([tab.clickMenu("Tổng quan"), other.clickMenu("Tổng quan")]);
    await sleep(4000);
    const refreshes = [tab, other].reduce((n, t) => n + t.requests.filter((r) => /\/auth\/refresh/.test(r.url)).length, 0) - before;
    const tokens = await tab.tokens();
    check("hai tab cùng hết hạn: chỉ gọi /auth/refresh đúng 1 lần", refreshes === 1, `số lần refresh = ${refreshes}`);
    check("không tab nào bị đá ra /login", (await tab.path()) !== "/login" && (await other.path()) !== "/login", `${await tab.path()} | ${await other.path()}`);
    check("token vẫn còn sau khi refresh", tokens.refresh && tokens.access);
    const dataOk = async (t) => t.eval(`document.body.innerText.includes("Doanh thu")`);
    check("cả hai tab vẫn tải được báo cáo thật", (await dataOk(tab)) && (await dataOk(other)));
    await closeTab(other);
  }

  // ---------------------------------------------------------------- lật cờ mock ↔ real (chạy trên dev server cờ mock)
  if (want("flip")) {
    process.env.AUTH_MODE = "mock";
    const t = await newTab("about:blank", "mock");
    await freshOwner(t);
    const screens = ["Tổng quan", "Chi nhánh", "Menu toàn chuỗi", "Tài khoản quản lý", "Nhận diện", "Trợ lý số liệu"];
    const seen = [];
    for (const s of screens) {
      await toMenu(t, s);
      const body = await text(t);
      const withData = s !== "Tổng quan" || /\d[\d.]*\s?₫/.test(body); // báo cáo mock phải có doanh thu
      seen.push(`${s}:${body.length > 200 && withData ? "ok" : "trống"}`);
    }
    check("cờ auth/branch/report = mock: mọi màn Owner hiện dữ liệu, không sửa gì ở màn hình", seen.every((x) => x.endsWith("ok")), seen.join(" "));
    await closeTab(t);
  }

  await closeTab(tab);
} catch (e) {
  console.log("ERROR", e.stack ?? e.message);
  check("script chạy hết không lỗi", false, e.message);
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} đạt`);
process.exit(failed.length ? 1 : 0);
