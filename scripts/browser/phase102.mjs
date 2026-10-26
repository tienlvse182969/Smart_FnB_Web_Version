// Kiểm trình duyệt thật cho lượt 10.2: gói dùng thử 14 ngày — nhãn, dải cảnh báo, câu chỉ đọc theo vai, Gói của tôi, Admin.
//   node scripts/browser/phase102.mjs --mode=real [--only=owner,manager,admin,faults]   # dev server 5173 (real), BE local a403612, Chrome CDP 9333
// Mọi request ghi bị chặn ở CDP (không bao giờ tới BE). Gói dùng thử được GIẢ bằng readOverride (GET trả lời giả, request không tới BE);
// ca 403 lúc ghi dùng setFault (chỉ lệnh ghi nhận lỗi giả).
import { check, cli, closeTab, newTab, results, sleep, SESSION_ALLOW } from "./cdp.mjs";

const CLI = cli();
const BLOCKS = ["owner", "manager", "admin", "faults", "checkout"];
if (CLI.only && !CLI.only.every((n) => BLOCKS.includes(n))) {
  console.log(`--only hỗ trợ: ${BLOCKS.join(", ")} (nhận được: ${CLI.only.join(",")})`);
  process.exit(2);
}
const want = (n) => !CLI.only || CLI.only.includes(n);
const J = JSON.stringify;
const tab = await newTab("about:blank", "real");
const q = (e) => tab.eval(e);
await tab.blockWrites(SESSION_ALLOW);
const tid = (id) => `document.querySelector('[data-testid=${J(id)}]')`;
const norm = (s) => s.replace(/\s+/g, " ").replace(/ /g, " ").trim();
const text = async (id) => norm(await q(`${tid(id)}?.innerText ?? ""`));
const has = (id) => q(`!!${tid(id)}`);
const bodyText = async () => norm(await q(`document.body.innerText`));
const toasts = () => q(`[...document.querySelectorAll(".ant-message-notice, .ant-notification-notice")].map((e) => e.textContent).join(" | ")`);
const attr = (id, name) => q(`${tid(id)}?.getAttribute(${J(name)})`);

const OWNER_EXPIRED = "Thời gian dùng thử đã hết. Nâng cấp gói ở trang Gói của tôi để tiếp tục thay đổi dữ liệu.";
const MANAGER_EXPIRED = "Thời gian dùng thử của chuỗi đã hết. Liên hệ chủ chuỗi để nâng cấp.";
const CHAINS = /\/api\/v1\/restaurant-chains$/;
const MANAGER_SUB = /\/api\/v1\/restaurant-chains\/[^/]+\/subscription$/;
const BUSINESSES = /\/api\/v1\/admin\/businesses(\?|$)/;

// ---- thời điểm theo LỊCH giờ Việt Nam (UTC+7), độc lập với giờ lúc chạy ----
const vnToday = () => {
  const d = new Date(Date.now() + 7 * 3_600_000);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() };
};
/** 12:00 trưa giờ VN của ngày hôm nay + n ngày (= 05:00Z): số ngày lịch còn lại đúng bằng n, bất kể giờ chạy. */
const noonPlus = (n) => {
  const t = vnToday();
  return new Date(Date.UTC(t.y, t.m, t.d + n, 5, 0, 0)).toISOString();
};
/** 23:59 hôm nay giờ VN (= 16:59Z): ngày cuối. */
const endOfToday = () => {
  const t = vnToday();
  return new Date(Date.UTC(t.y, t.m, t.d, 16, 59, 0)).toISOString();
};
const vnDate = (iso) => new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));

const TRIAL_PLAN = { id: "00000000-0000-4000-8000-0000000000aa", code: "TRIAL", name: "Dùng thử 14 ngày", description: "Gói dùng thử", monthlyPrice: "0", maxBranches: 2, maxAccounts: 10, brandingEnabled: false, multiBranchComparisonEnabled: false };
const BASIC_PLAN = { ...TRIAL_PLAN, id: "00000000-0000-4000-8000-0000000000bb", code: "BASIC", name: "Cơ bản", monthlyPrice: "300000" };
const QUOTAS = [
  { resource: "branches", used: 1, limit: 5, remaining: 4 },
  { resource: "accounts", used: 3, limit: 10, remaining: 7 },
  { resource: "tables", used: 0, limit: 30, remaining: 30 },
];
const sub = (plan, status, expiresAt) => ({ status, expiresAt: expiresAt ?? undefined, plan, quotas: QUOTAS });

let realChains = null;
const chainsOverride = async (subscription) => {
  realChains ??= await q(`(async () => { const t = localStorage.getItem("smartfnb_access_token"); const r = await fetch("http://localhost:3100/api/v1/restaurant-chains", { headers: { Authorization: "Bearer " + t } }); return r.json(); })()`);
  const chains = Array.isArray(realChains) ? realChains : (realChains.data ?? []);
  return { match: CHAINS, body: J(chains.map((c) => ({ ...c, subscription }))) };
};
const loginAs = async (role, landing) => {
  await tab.goto("/login");
  await tab.clearStorage();
  await tab.goto("/login");
  await tab.login(role);
  await tab.waitFor(`location.pathname.startsWith("/${landing}")`, 25000, `vào /${landing}`);
  await tab.waitFor(`document.querySelector(".ant-layout-sider, .ant-layout-header")`, 15000, "shell");
  await sleep(900);
};
const hoverTooltip = async (selector) => {
  await q(`(() => { const el = document.querySelector(${J(selector)}); el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true })); })()`);
  await tab.waitFor(`[...document.querySelectorAll(".ant-tooltip")].some((e) => !e.classList.contains("ant-tooltip-hidden") && e.innerText.trim())`, 5000, "tooltip");
  return norm(await q(`[...document.querySelectorAll(".ant-tooltip")].filter((e) => !e.classList.contains("ant-tooltip-hidden")).map((e) => e.innerText).join(" ")`));
};
/**
 * Cố định đồng hồ trình duyệt (lượt 10.2b, như bộ test `9e93899`): thay `Date` ở mọi trang mới mở bằng bản lệch một khoảng cố định để
 * "bây giờ" = `targetMs`, nên ca "ngày cuối" đúng ở mọi giờ chạy. `null` = trả đồng hồ thật.
 */
let clockScript = null;
const pinClock = async (targetMs) => {
  if (clockScript) await tab.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: clockScript });
  clockScript = null;
  if (targetMs == null) return;
  const offset = targetMs - Date.now();
  const r = await tab.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => { const R = Date; const off = ${offset}; class F extends R { constructor(...a) { if (a.length === 0) super(R.now() + off); else super(...a); } static now() { return R.now() + off; } } window.Date = F; })()`,
  });
  clockScript = (r.result ?? r).identifier;
};
/** 12:00 trưa giờ VN của hôm nay (thời điểm cố định cho ca ngày cuối). */
const vnNoonToday = () => Date.parse(noonPlus(0));
const ownerShows = async (path, subscription, ready) => {
  tab.readOverride = [await chainsOverride(subscription)];
  await tab.goto(path);
  await tab.waitFor(ready ?? `document.querySelector('[data-testid="myplan-name"]')`, 25000, `màn ${path}`);
  await sleep(700);
};

try {
  const writesBefore = () => (tab.sentWrites ?? []).length;

  // =========================================================== OWNER
  if (want("owner")) {
    await loginAs("owner", "owner");
    tab.caseName = "owner";
    const owner = async (name, subscription, expect) => {
      await ownerShows("/owner/plan", subscription);
      await expect(name);
    };

    // 1. Còn 10 ngày
    {
      const exp = noonPlus(10);
      await owner("còn 10 ngày", sub(TRIAL_PLAN, "ACTIVE", exp), async (n) => {
        check(`Owner · ${n}: nhãn 'Dùng thử · còn 10 ngày', màu info, bấm tới /owner/plan`, (await text("trial-badge")) === "Dùng thử · còn 10 ngày" && (await attr("trial-badge", "data-tone")) === "info" && (await attr("trial-badge", "href")) === "/owner/plan", await text("trial-badge"));
        check(`Owner · ${n}: chưa có dải cảnh báo (chỉ ≤ 7 ngày) và không có banner chỉ đọc`, !(await has("expiring-banner")) && !(await has("read-only-banner")));
        check(`Owner · ${n}: Gói của tôi — tên 'Dùng thử miễn phí', dòng phụ chỉ 'Hạn mức như gói Cơ bản', ngày hết hạn ${vnDate(exp)} hiện MỘT lần ở dòng 'Hết hạn'`, (await text("myplan-name")) === "Dùng thử miễn phí" && (await text("myplan-trial-note")) === "Hạn mức như gói Cơ bản" && (await text("myplan-expiry")) === vnDate(exp) && (await bodyText()).split(vnDate(exp)).length === 2, `${await text("myplan-name")} | ${await text("myplan-trial-note")} | ${await text("myplan-expiry")}`);
        const order = await q(`(() => { const u = ${tid("myplan-upgrade")}, n = ${tid("myplan-name")}; return !!u && !!n && !!(n.compareDocumentPosition(u) & Node.DOCUMENT_POSITION_FOLLOWING); })()`);
        check(`Owner · ${n}: thẻ nâng cấp có mặt, nằm SAU thẻ gói đang dùng; không có nút thanh toán thứ hai trong banner`, order && !(await has("upgrade-button")));
        check(`Owner · ${n}: hạn mức hiển thị theo BE (Chi nhánh 1/5, Tài khoản 3/10)`, /1 \/ 5/.test(await text("myplan-limit-branches")) && /3 \/ 10/.test(await text("myplan-limit-accounts")), `${await text("myplan-limit-branches")} | ${await text("myplan-limit-accounts")}`);
      });
    }

    // 2. Còn 2 ngày
    await owner("còn 2 ngày", sub(TRIAL_PLAN, "ACTIVE", noonPlus(2)), async (n) => {
      check(`Owner · ${n}: nhãn 'Dùng thử · còn 2 ngày' màu warning`, (await text("trial-badge")) === "Dùng thử · còn 2 ngày" && (await attr("trial-badge", "data-tone")) === "warning", await text("trial-badge"));
      const banner = await text("expiring-banner");
      check(`Owner · ${n}: dải cảnh báo cùng số ngày với nhãn, có nút 'Nâng cấp' tới Gói của tôi`, /Dùng thử còn 2 ngày/.test(banner) && (await text("upgrade-button")) === "Nâng cấp" && (await attr("upgrade-button", "href")) === "/owner/plan", banner);
    });

    // 3. Ngày cuối
    await pinClock(vnNoonToday()); // đồng hồ trình duyệt = 12:00 trưa giờ VN: ca này đúng ở mọi giờ chạy
    await owner("ngày cuối", sub(TRIAL_PLAN, "ACTIVE", endOfToday()), async (n) => {
      check(`Owner · ${n}: nhãn 'Dùng thử · hết hạn hôm nay' (warning), không 'còn 0 ngày'`, (await text("trial-badge")) === "Dùng thử · hết hạn hôm nay" && (await attr("trial-badge", "data-tone")) === "warning" && !/0 ngày/.test(await text("trial-badge")), await text("trial-badge"));
      check(`Owner · ${n}: dải cảnh báo 'hết hạn trong hôm nay'`, /hết hạn trong hôm nay/.test(await text("expiring-banner")), await text("expiring-banner"));
      check(`Owner · ${n}: đồng hồ trình duyệt đã được cố định ở 12:00 giờ VN`, Math.abs((await q(`Date.now()`)) - vnNoonToday()) < 120000, String(await q(`new Date().toISOString()`)));
    });
    await pinClock(null);

    // 4. Đã hết
    {
      const exp = noonPlus(-1);
      await owner("đã hết", sub(TRIAL_PLAN, "EXPIRED", exp), async (n) => {
        check(`Owner · ${n}: nhãn 'Dùng thử đã hết' màu error`, (await text("trial-badge")) === "Dùng thử đã hết" && (await attr("trial-badge", "data-tone")) === "error", await text("trial-badge"));
        const banner = await text("read-only-banner");
        check(`Owner · ${n}: banner chỉ đọc 'Dùng thử đã hết vào ngày ${vnDate(exp)}' kèm câu nâng cấp và nút 'Nâng cấp'`, banner.includes(`Dùng thử đã hết vào ngày ${vnDate(exp)}`) && banner.includes(OWNER_EXPIRED) && (await text("upgrade-button")) === "Nâng cấp", banner);
        check(`Owner · ${n}: không còn dải 'sắp hết hạn'`, !(await has("expiring-banner")));
        const order = await q(`(() => { const u = ${tid("myplan-upgrade")}, n = ${tid("myplan-name")}; return !!u && !!n && !!(u.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING); })()`);
        check(`Owner · ${n}: thẻ nâng cấp NẰM TRƯỚC thẻ gói đang dùng (nổi bật nhất trang), dòng phụ 'Hạn mức như gói Cơ bản'`, order && (await text("myplan-trial-note")) === "Hạn mức như gói Cơ bản", await text("myplan-trial-note"));
        check(`Owner · ${n}: trạng thái 'Đã hết hạn'`, (await text("myplan-status")) === "Đã hết hạn");
      });
      await tab.goto("/owner/branches");
      await tab.waitFor(`document.querySelector('[data-testid="action-guard"]')`, 20000, "nút ghi bị khoá");
      const tip = await hoverTooltip('[data-testid="action-guard"]');
      check("Owner · đã hết: nút ghi bị khoá, tooltip là câu nâng cấp của Owner", tip === OWNER_EXPIRED, tip);
    }

    // 5. Tạm ngưng
    await owner("tạm ngưng", sub(TRIAL_PLAN, "SUSPENDED", noonPlus(5)), async (n) => {
      const banner = await text("read-only-banner");
      check(`Owner · ${n}: không có nhãn dùng thử; banner chỉ nói về tạm ngưng, không nhắc dùng thử, không nút nâng cấp`, !(await has("trial-badge")) && /tạm ngưng/.test(banner) && !/dùng thử/i.test(banner) && !(await has("upgrade-button")), banner);
      check(`Owner · ${n}: không có thẻ nâng cấp ở Gói của tôi`, !(await has("myplan-upgrade")));
    });

    // 6. Đã chuyển sang gói trả phí
    await owner("đã chuyển gói", sub(BASIC_PLAN, "ACTIVE", noonPlus(30)), async (n) => {
      check(`Owner · ${n}: không còn dấu vết dùng thử (nhãn, dải, dòng phụ, thẻ nâng cấp)`, !(await has("trial-badge")) && !(await has("expiring-banner")) && !(await has("myplan-trial-note")) && !(await has("myplan-upgrade")) && (await text("myplan-name")) === "Cơ bản", await text("myplan-name"));
    });

    // 7. expiresAt null
    await owner("không có hạn", sub(TRIAL_PLAN, "ACTIVE", null), async (n) => {
      check(`Owner · ${n}: nhãn chỉ 'Dùng thử' (không số ngày, không NaN), dòng phụ không có ngày`, (await text("trial-badge")) === "Dùng thử" && !/NaN/.test(await bodyText()) && (await text("myplan-trial-note")) === "Hạn mức như gói Cơ bản", `${await text("trial-badge")} | ${await text("myplan-trial-note")}`);
    });

    // 8. Vừa quay về từ PayOS, webhook chưa về
    {
      tab.readOverride = [
        await chainsOverride(sub(TRIAL_PLAN, "EXPIRED", noonPlus(-1))),
        { match: /\/subscription\/checkouts\/pending-1$/, body: J({ id: "pending-1", planId: BASIC_PLAN.id, amount: 300000, status: "PENDING", checkoutUrl: null, paidAt: null }) },
      ];
      await tab.goto("/owner/plan?checkout=pending-1");
      await tab.waitFor(`document.querySelector('[data-testid="trial-badge"]')`, 25000, "nhãn");
      await sleep(1500);
      check("Owner · về từ PayOS, webhook chưa về: nhãn 'Đang chờ PayOS xác nhận' (không nói 'đã hết' ngược với trạng thái thanh toán)", (await text("trial-badge")) === "Đang chờ PayOS xác nhận", await text("trial-badge"));
      check("Owner · trang Gói của tôi cùng lúc báo 'Đang chờ PayOS xác nhận thanh toán'", /Đang chờ PayOS xác nhận thanh toán/.test(await bodyText()));
      await tab.goto("/owner/branches");
      await tab.waitFor(`document.querySelector('[data-testid="trial-badge"]')`, 25000, "nhãn");
      check("Owner · rời trang đó: nhãn trở lại 'Dùng thử đã hết'", (await text("trial-badge")) === "Dùng thử đã hết", await text("trial-badge"));
    }
    check("Owner · 0 request ghi THẬT tới BE", writesBefore() === 0, `${writesBefore()}`);
    tab.readOverride = null;
  }

  // =========================================================== MANAGER
  if (want("manager")) {
    await loginAs("manager", "manager");
    tab.caseName = "manager";
    const manager = async (subscription) => {
      tab.readOverride = [{ match: MANAGER_SUB, body: J({ subscription }) }];
      await tab.goto("/manager/dashboard");
      await tab.waitFor(`document.querySelector(".ant-layout-header")`, 25000, "shell");
      await sleep(1200);
    };
    await manager(sub(TRIAL_PLAN, "ACTIVE", noonPlus(10)));
    check("Manager · còn 10 ngày: KHÔNG có nhãn dùng thử ở thanh trên (đặc tả 4.5), không dải cảnh báo", !(await has("trial-badge")) && !(await has("expiring-banner")));
    await manager(sub(TRIAL_PLAN, "ACTIVE", noonPlus(2)));
    check("Manager · còn 2 ngày: dải 'Dùng thử còn 2 ngày' dặn liên hệ chủ chuỗi, không có nút, không nhãn", /Dùng thử còn 2 ngày/.test(await text("expiring-banner")) && /Liên hệ chủ chuỗi để nâng cấp/.test(await text("expiring-banner")) && !(await has("upgrade-button")) && !(await has("trial-badge")), await text("expiring-banner"));
    await manager(sub(TRIAL_PLAN, "EXPIRED", noonPlus(-1)));
    {
      const banner = await text("read-only-banner");
      check("Manager · đã hết: banner chỉ đọc câu 'liên hệ chủ chuỗi', không nút nâng cấp, không nhãn", banner.includes(MANAGER_EXPIRED) && !(await has("upgrade-button")) && !(await has("trial-badge")), banner);
      await tab.goto("/manager/staff");
      const found = await tab.waitFor(`document.querySelector('[data-testid="action-guard"]')`, 15000, "nút ghi bị khoá").then(() => true, () => false);
      if (found) check("Manager · đã hết: tooltip nút ghi bị khoá là câu của Manager", (await hoverTooltip('[data-testid="action-guard"]')) === MANAGER_EXPIRED);
      else check("Manager · đã hết: có nút ghi bị khoá ở /manager/staff", false, "không thấy [data-testid=action-guard]");
    }
    await manager(sub(TRIAL_PLAN, "SUSPENDED", noonPlus(5)));
    check("Manager · tạm ngưng: banner chỉ nói tạm ngưng, không nhắc dùng thử", /tạm ngưng/.test(await text("read-only-banner")) && !/dùng thử/i.test(await text("read-only-banner")), await text("read-only-banner"));
    await manager(sub(BASIC_PLAN, "EXPIRED", noonPlus(-1)));
    check("Manager · gói trả phí hết hạn: giữ câu cũ 'Liên hệ quản trị nền tảng để gia hạn', không nhắc dùng thử", /Liên hệ quản trị nền tảng để gia hạn/.test(await text("read-only-banner")) && !/dùng thử/i.test(await text("read-only-banner")));
    check("Manager · 0 request ghi THẬT tới BE", writesBefore() === 0, `${writesBefore()}`);
    tab.readOverride = null;
  }

  // =========================================================== ADMIN
  if (want("admin")) {
    await pinClock(vnNoonToday());
    await loginAs("admin", "admin");
    tab.caseName = "admin";
    const realList = await q(`(async () => { const t = localStorage.getItem("smartfnb_access_token"); const r = await fetch("http://localhost:3100/api/v1/admin/businesses?page=1&limit=10", { headers: { Authorization: "Bearer " + t } }); return r.json(); })()`);
    const seed = realList.items[0];
    const mk = (id, name, plan, status, expiresAt, extra = {}) => ({ ...seed, id, code: `BIZ-${id}`, name, subscription: { ...seed.subscription, status, expiresAt, plan: { ...seed.subscription.plan, ...plan }, trialStartedAt: plan.code === "TRIAL" ? noonPlus(-4) : null, trialEndsAt: plan.code === "TRIAL" ? expiresAt : null, trialConvertedAt: null, ...extra } });
    const items = [
      mk("t10", "Quán Thử 10", TRIAL_PLAN, "ACTIVE", noonPlus(10)),
      mk("t2", "Quán Thử 2", TRIAL_PLAN, "ACTIVE", noonPlus(2)),
      mk("tlast", "Quán Thử Cuối", TRIAL_PLAN, "ACTIVE", endOfToday()),
      mk("tend", "Quán Thử Hết", TRIAL_PLAN, "EXPIRED", noonPlus(-1)),
      mk("tsus", "Quán Thử Ngưng", TRIAL_PLAN, "SUSPENDED", noonPlus(5)),
      mk("paid", "Quán Trả Phí", BASIC_PLAN, "ACTIVE", noonPlus(30)),
    ];
    tab.readOverride = [{ match: BUSINESSES, body: J({ items, pagination: { page: 1, limit: 10, total: items.length, totalPages: 1 } }) }];
    await tab.goto("/admin/tenants");
    await tab.waitFor(`document.body.innerText.includes("Quán Thử 10")`, 25000, "bảng doanh nghiệp giả");
    await sleep(600);
    const rowInfo = (name) => q(`(() => { const tr = [...document.querySelectorAll("tbody tr.ant-table-row")].find((r) => r.innerText.includes(${J(name)})); const sub = tr?.querySelector('[data-testid="tenant-trial-sub"]'); return { plan: tr?.querySelector('[data-testid="tenant-plan-trial"]')?.innerText.replace(/\\s+/g, " ").trim() ?? null, sub: sub?.innerText ?? null, tone: sub?.getAttribute("data-tone") ?? null, row: tr?.innerText.replace(/\\s+/g, " ") ?? "" }; })()`);
    const r10 = await rowInfo("Quán Thử 10"), r2 = await rowInfo("Quán Thử 2"), rl = await rowInfo("Quán Thử Cuối"), re = await rowInfo("Quán Thử Hết"), rs = await rowInfo("Quán Thử Ngưng"), rp = await rowInfo("Quán Trả Phí");
    check("Admin · còn 10 ngày: 'Dùng thử' + phụ đề 'còn 10 ngày'", r10.plan?.startsWith("Dùng thử") && r10.sub === "còn 10 ngày", J(r10));
    check("Admin · còn 2 ngày: phụ đề 'còn 2 ngày'", r2.sub === "còn 2 ngày", J(r2));
    check("Admin · ngày cuối: phụ đề 'hết hạn hôm nay'", rl.sub === "hết hạn hôm nay", J(rl));
    check("Admin · đã hết: KHÔNG có phụ đề (chip 'Hết hạn · chỉ đọc' đã nói đủ)", re.sub === null && /Hết hạn · chỉ đọc/.test(re.row), J(re));
    const subColors = await q(`[...document.querySelectorAll('[data-testid="tenant-trial-sub"]')].map((e) => getComputedStyle(e).color)`);
    check("Admin · phụ đề không tô màu: mọi phụ đề cùng MỘT màu chữ (textMuted), không theo mức còn hạn", subColors.length === 3 && new Set(subColors).size === 1, J(subColors));
    check("Admin · tạm ngưng: 'Dùng thử' không phụ đề, cột trạng thái 'Tạm ngưng'", rs.plan?.startsWith("Dùng thử") && rs.sub === null && /Tạm ngưng/.test(rs.row), J(rs));
    check("Admin · gói trả phí: giữ tên gói 'Cơ bản', không phụ đề dùng thử", rp.plan === null && /Cơ bản/.test(rp.row), J(rp));

    const openDrawer = async (name) => {
      await q(`[...document.querySelectorAll("tbody tr.ant-table-row")].find((r) => r.innerText.includes(${J(name)})).click()`);
      await tab.waitFor(`document.querySelector(".ant-drawer-body button")`, 8000, "drawer");
      await sleep(500);
    };
    const closeDrawer = async () => {
      await q(`(document.querySelector(".ant-drawer-close") ?? document.querySelector(".ant-drawer-mask"))?.click()`);
      await tab.waitFor(`!document.querySelector(".ant-drawer-body button")`, 6000, "đóng drawer").catch(() => undefined);
      await sleep(500);
    };
    const btn = (label) => q(`(() => { const b = [...document.querySelectorAll(".ant-drawer-body button")].find((x) => x.innerText.replace(/\\s+/g, " ").includes(${J(label)})); return b ? { disabled: b.disabled } : null; })()`);
    await openDrawer("Quán Thử 10");
    check("Admin · chi tiết TRIAL còn hạn: Gia hạn và Đổi gói bị khoá; Tạm ngưng dùng được", (await btn("Gia hạn"))?.disabled === true && (await btn("Đổi gói"))?.disabled === true && (await btn("Tạm ngưng"))?.disabled === false, J([await btn("Gia hạn"), await btn("Đổi gói"), await btn("Tạm ngưng")]));
    const lockTip = await hoverTooltip('.ant-drawer-body [data-testid="trial-lock"]');
    check("Admin · tooltip trên nút đang khoá là câu đã duyệt", lockTip === "Gói dùng thử không gia hạn hay đổi tay được; chủ chuỗi tự nâng cấp qua thanh toán.", lockTip);
    await closeDrawer();
    await openDrawer("Quán Thử Hết");
    check("Admin · chi tiết TRIAL đã hết: Gia hạn và Đổi gói vẫn khoá (BE chặn 409)", (await btn("Gia hạn"))?.disabled === true && (await btn("Đổi gói"))?.disabled === true);
    await closeDrawer();
    await openDrawer("Quán Thử Ngưng");
    check("Admin · chi tiết TRIAL tạm ngưng: Gia hạn và Đổi gói khoá; 'Kích hoạt lại' dùng được", (await btn("Gia hạn"))?.disabled === true && (await btn("Đổi gói"))?.disabled === true && (await btn("Kích hoạt lại"))?.disabled === false);
    await closeDrawer();
    await openDrawer("Quán Trả Phí");
    check("Admin · chi tiết gói trả phí: Gia hạn và Đổi gói bấm được, không bọc tooltip khoá", (await btn("Gia hạn"))?.disabled === false && (await btn("Đổi gói"))?.disabled === false && !(await q(`!!document.querySelector('.ant-drawer-body [data-testid="trial-lock"]')`)));
    await closeDrawer();
    check("Admin · 0 request ghi THẬT tới BE", writesBefore() === 0, `${writesBefore()}`);
    tab.readOverride = null;
    await pinClock(null);
  }

  // =========================================================== KIỂM TRA THANH TOÁN (lượt 10.2b) — chỉ giả bằng readOverride, KHÔNG tạo checkout thật
  if (want("checkout")) {
    await loginAs("owner", "owner");
    tab.caseName = "checkout";
    // Rút ngắn nhịp hỏi (3 giây → 30 ms) để 20 lượt hỏi xong trong vài giây; số lượt vẫn đúng 20. Chỉ áp dụng cho trang mở sau dòng này.
    const fast = await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: `(() => { const st = window.setTimeout; window.setTimeout = (f, ms, ...a) => st(f, ms === 3000 ? 30 : ms, ...a); })()` });
    const CHECKOUT = /\/api\/v1\/restaurant-chains\/[^/]+\/subscription\/checkouts\/stall-1$/;
    const calls = () => tab.requests.filter((r) => r.method === "GET" && CHECKOUT.test(new URL(r.url).pathname)).length;
    const body = (status) => J({ id: "stall-1", planId: BASIC_PLAN.id, amount: 300000, status, checkoutUrl: null, paidAt: null });
    const show = async (status) => {
      tab.readOverride = [await chainsOverride(sub(TRIAL_PLAN, "EXPIRED", noonPlus(-1))), { match: CHECKOUT, body: body(status) }];
      tab.requests.length = 0;
      await tab.goto("/owner/plan?checkout=stall-1");
      await tab.waitFor(`document.querySelector('[data-testid="checkout-alert"]')`, 25000, "dải trạng thái thanh toán");
    };
    const alertText = () => text("checkout-alert");

    await show("PENDING");
    await tab.waitFor(`document.querySelector('[data-testid="checkout-recheck"]')`, 20000, "nút Kiểm tra lại");
    const first = calls();
    check("Thanh toán · PENDING quá 20 lượt: dừng hỏi đúng 20 lượt, hiện câu 'PayOS chưa xác nhận…' và nút 'Kiểm tra lại'", (first === 20 || first === 21) && (await alertText()).includes("PayOS chưa xác nhận. Nếu bạn đã chuyển khoản, bấm Kiểm tra lại sau ít phút."), `${first} GET (dev: StrictMode chạy effect hai lần nên có thể thừa 1 GET lúc mở trang; đúng 20 lượt hỏi được kiểm ở unit test) | ${await alertText()}`);
    await sleep(2500);
    check("Thanh toán · sau khi dừng, không hỏi thêm", calls() === first, `${calls()}`);
    await tab.waitFor(`document.querySelector('[data-testid="checkout-recheck"]') && !document.querySelector('[data-testid="checkout-recheck"]').disabled && !document.querySelector('[data-testid="checkout-recheck"]').classList.contains('ant-btn-loading')`, 8000, "nút Kiểm tra lại sẵn sàng");
    await q(`document.querySelector('[data-testid="checkout-recheck"]').click()`);
    await sleep(1200);
    check("Thanh toán · bấm Kiểm tra lại: đúng 1 GET thêm (vẫn PENDING thì giữ nút)", calls() === first + 1 && (await has("checkout-recheck")), `${calls()}`);
    tab.readOverride = [await chainsOverride(sub(TRIAL_PLAN, "EXPIRED", noonPlus(-1))), { match: CHECKOUT, body: body("PAID") }];
    await tab.waitFor(`document.querySelector('[data-testid="checkout-recheck"]') && !document.querySelector('[data-testid="checkout-recheck"]').disabled && !document.querySelector('[data-testid="checkout-recheck"]').classList.contains('ant-btn-loading')`, 8000, "nút Kiểm tra lại sẵn sàng");
    await q(`document.querySelector('[data-testid="checkout-recheck"]').click()`);
    await tab.waitFor(`document.querySelector('[data-testid="checkout-alert"]')?.innerText.includes("gói trả phí đã kích hoạt")`, 10000, "báo đã kích hoạt");
    check("Thanh toán · bấm lần nữa khi BE báo PAID: 1 GET thêm, báo 'gói trả phí đã kích hoạt', hết nút", calls() === first + 2 && !(await has("checkout-recheck")), `${calls()}`);

    for (const [status, sentence] of [["EXPIRED", "Liên kết thanh toán đã hết hạn. Tạo thanh toán mới để tiếp tục."], ["FAILED", "Không thể hoàn tất thanh toán. Vui lòng thử lại."]]) {
      await show(status);
      await sleep(800);
      check(`Thanh toán · ${status}: câu tương ứng và nút 'Tạo thanh toán mới', không nút Kiểm tra lại`, (await alertText()).includes(sentence) && (await text("checkout-new")).includes("Tạo thanh toán mới") && !(await has("checkout-recheck")), await alertText());
    }
    // Bấm "Tạo thanh toán mới": POST bị chặn ở CDP (không tạo checkout thật); kiểm đúng đường dẫn và gói.
    const blockedBefore = tab.blockedWrites.length;
    await q(`document.querySelector('[data-testid="checkout-new"]').click()`);
    await sleep(1200);
    const post = tab.blockedWrites.slice(blockedBefore).find((w) => w.method === "POST" && /\/subscription\/checkouts$/.test(w.path));
    check("Thanh toán · bấm Tạo thanh toán mới: có POST …/subscription/checkouts đúng gói, BỊ CHẶN ở CDP (không tạo checkout thật)", !!post && post.body?.includes(BASIC_PLAN.id) && writesBefore() === 0, J(post ?? null));

    await show("NEEDS_REVIEW");
    await sleep(800);
    const payDisabled = await q(`[...document.querySelectorAll("button")].filter((b) => b.innerText.includes("Thanh toán nâng cấp")).map((b) => b.disabled)`);
    check("Thanh toán · NEEDS_REVIEW: câu đối soát, KHÔNG có nút tạo mới/kiểm tra lại, mọi nút 'Thanh toán nâng cấp' bị khoá (tránh trả tiền hai lần)", (await alertText()).includes("Thanh toán cần nền tảng đối soát, gói sẽ được cập nhật sau khi xác nhận.") && !(await has("checkout-new")) && !(await has("checkout-recheck")) && payDisabled.length > 0 && payDisabled.every(Boolean), `${await alertText()} | ${J(payDisabled)}`);
    check("Thanh toán · 0 request ghi THẬT tới BE", writesBefore() === 0, `${writesBefore()}`);
    await tab.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: (fast.result ?? fast).identifier });
    tab.readOverride = null;
  }

  // =========================================================== LỖI 403 LÚC GHI + TỰ CẬP NHẬT
  if (want("faults")) {
    await loginAs("owner", "owner");
    tab.caseName = "faults";
    const countChains = () => tab.requests.filter((r) => r.method === "GET" && CHAINS.test(new URL(r.url).pathname)).length;
    const openCreateBranch = async () => {
      await tab.goto("/owner/branches");
      await tab.waitFor(`[...document.querySelectorAll("button")].some((x) => x.textContent.includes("Thêm chi nhánh") && !x.disabled)`, 20000, "nút Thêm chi nhánh");
      await q(`[...document.querySelectorAll("button")].find((x) => x.textContent.includes("Thêm chi nhánh") && !x.disabled).click()`);
      await sleep(900);
      const setPh = (ph, value) => q(`(() => { const el = document.querySelector('.ant-drawer-body input[placeholder=${J(ph)}]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, ${J(value)}); el.dispatchEvent(new Event("input", { bubbles: true })); })()`);
      await setPh("VD: HCM-Q10", "GIA-LAP-102");
      await setPh("VD: Chi nhánh Quận 10", "Chi nhánh giả lập 10.2");
      await setPh("VD: 123 Nguyễn Huệ", "1 Đường Thử");
      await q(`document.querySelector(".ant-drawer-body .ant-select-content, .ant-drawer-body .ant-select-selector").dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))`);
      await sleep(400);
      await q(`document.querySelector(".ant-select-item-option")?.click()`);
      await sleep(500);
    };
    const submitCreate = () => q(`(() => { const b = [...document.querySelectorAll(".ant-drawer-body button")].find((x) => x.textContent.includes("Tạo chi nhánh") && !x.disabled); if (!b) return false; b.click(); return true })()`);

    // Ca A: gói trong store còn active (hạn tương lai xa) nhưng BE đã hết hạn → 403 "read-only" lúc ghi → nạp lại gói ĐÚNG MỘT lần, nhãn đổi ngay.
    {
      tab.readOverride = [await chainsOverride(sub(TRIAL_PLAN, "ACTIVE", noonPlus(5)))];
      await openCreateBranch();
      const label0 = await text("trial-badge");
      tab.readOverride = [await chainsOverride(sub(TRIAL_PLAN, "EXPIRED", noonPlus(-1)))];
      tab.setFault({ kind: "403", match: /^$/, body: { statusCode: 403, message: "The business subscription is read-only; renew it before making this change", error: "Forbidden" } });
      const before = countChains();
      check("Ca A · trước khi ghi: nhãn 'Dùng thử · còn 5 ngày'", /còn 5 ngày/.test(label0), label0);
      check("Ca A · bấm Tạo chi nhánh gửi được (request bị chặn ở CDP, nhận 403 giả)", await submitCreate());
      await tab.waitFor(`document.querySelector('[data-testid="trial-badge"]')?.innerText.includes("Dùng thử đã hết")`, 12000, "nhãn đổi sang hết hạn").catch(() => undefined);
      await sleep(800);
      check("Ca A · nhãn chuyển sang 'Dùng thử đã hết' ngay, KHÔNG cần F5", (await text("trial-badge")) === "Dùng thử đã hết", await text("trial-badge"));
      check("Ca A · banner chỉ đọc xuất hiện với câu của Owner", (await text("read-only-banner")).includes(OWNER_EXPIRED), await text("read-only-banner"));
      check("Ca A · thông báo lỗi là câu tiếng Việt của Owner (đã nạp lại gói trước khi hiện), không tiếng Anh", (await toasts()).includes(OWNER_EXPIRED) && !/subscription|renew/i.test(await toasts()), await toasts());
      check("Ca A · nạp lại gói đúng MỘT lần (GET /restaurant-chains +1), không vòng request", countChains() - before === 1, `${countChains() - before}`);
      await sleep(2500);
      check("Ca A · sau 2,5 giây vẫn đúng một lần (không polling)", countChains() - before === 1, `${countChains() - before}`);
      tab.setFault(null);
    }

    // Ca B: 403 "is not active" (câu của plan-quota.service) → câu tiếng Việt, không 'không đủ quyền', không tiếng Anh.
    {
      tab.readOverride = [await chainsOverride(sub(TRIAL_PLAN, "ACTIVE", noonPlus(5)))];
      await openCreateBranch();
      tab.readOverride = [await chainsOverride(sub(TRIAL_PLAN, "EXPIRED", noonPlus(-1)))];
      tab.setFault({ kind: "403", match: /^$/, body: { statusCode: 403, message: "The business subscription is not active", error: "Forbidden" } });
      await submitCreate();
      await sleep(2500);
      const t = await toasts();
      check("Ca B · 403 'subscription is not active': hiện câu hết dùng thử tiếng Việt của Owner (không câu tiếng Anh, không 'không đủ quyền')", t.includes(OWNER_EXPIRED) && !/not active|subscription/i.test(t) && !/không đủ quyền/.test(t), t);
      tab.setFault(null);
    }

    // Ca C: tab mở qua mốc hết hạn: hạn = +4 giây; sau mốc, focus lại → nạp lại gói một lần, nhãn đổi, không F5.
    {
      const soon = new Date(Date.now() + 5000).toISOString();
      tab.readOverride = [await chainsOverride(sub(TRIAL_PLAN, "ACTIVE", soon))];
      await tab.goto("/owner/plan");
      await tab.waitFor(`document.querySelector('[data-testid="trial-badge"]')`, 25000, "nhãn");
      const first = await text("trial-badge");
      tab.readOverride = [await chainsOverride(sub(TRIAL_PLAN, "EXPIRED", soon))];
      await sleep(6500);
      const before = countChains();
      await q(`window.dispatchEvent(new Event("focus"))`);
      await sleep(1800);
      check("Ca C · tab mở qua mốc: trước đó nhãn là 'hết hạn hôm nay' hoặc 'còn …'; sau focus lại thành 'Dùng thử đã hết' không cần F5", /Dùng thử/.test(first) && (await text("trial-badge")) === "Dùng thử đã hết", `${first} → ${await text("trial-badge")}`);
      check("Ca C · focus nạp lại gói đúng MỘT lần; focus thêm lần nữa không nạp lại (đã hết hạn)", countChains() - before === 1 && (await q(`(window.dispatchEvent(new Event("focus")), true)`)) && (await sleep(1200), countChains() - before === 1), `${countChains() - before}`);
    }
    check("Lỗi · 0 request ghi THẬT tới BE (mọi POST bị chặn/giả ở CDP)", writesBefore() === 0, `${writesBefore()}`);
    tab.readOverride = null;
  }
} catch (e) {
  console.log("ERROR", e.stack ?? e.message);
  check("script chạy hết không lỗi", false, String(e.message ?? e));
}
tab.setFault?.(null);
tab.readOverride = null;
console.log(`
[real] ${results.filter((r) => r.ok).length}/${results.length} đạt`);
console.log(`[real] request ghi bị chặn ở CDP: ${tab.blockedWrites?.length ?? 0}; request ghi THẬT tới BE: ${(tab.sentWrites ?? []).length}`);
await closeTab(tab);
process.exit(results.every((r) => r.ok) ? 0 : 1);
