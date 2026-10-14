// Kiểm trình duyệt thật cho GĐ8. Lượt 8.1: màn TV gọi số (`/display/call`) ghép thiết bị, giữ kết nối, thu hồi.
//   node scripts/browser/phase8.mjs --only=pairing   # ghép THẬT trên BE local: tạo 2 thiết bị TEST-8.1 rồi thu hồi (xem NGOẠI LỆ)
//   node scripts/browser/phase8.mjs --only=board     # không tạo thiết bị: bảng số từ trả lời giả, socket bị từ chối, thu hồi giả
// Dev server 5173 (real), BE local chạy, Chrome CDP 9333. TV chạy trong ngữ cảnh trình duyệt RIÊNG (localStorage không chung với
// tab Manager) như một thiết bị khác.
//
// NGOẠI LỆ GHI BE (chỉ lượt 8.1, chỉ BE local, TỐI ĐA 2 thiết bị tên "TEST-8.1…"; đã dùng hết ở lần chạy `pairing` ngày 2026-10-11).
// Khối `pairing` từ chối chạy nếu đã có thiết bị TEST-8.1 trong BE (đặt TEST_DEVICE_LIMIT để nâng, chỉ khi người duyệt cho phép):
//   - tab TV:      POST /device-pairing/codes            (màn tự tạo mã ghép; cả hai khối)
//   - tab Manager: POST /stations/pair-calling-display   (Manager nhập mã)
//   - tab Manager: DELETE /display-devices/{id}          (thu hồi; id đọc từ DB, chỉ thiết bị TEST-8.1…, mở từng id một)
// Mọi request ghi khác vẫn bị chặn ở CDP. Bảng "REQUEST GHI ĐÃ GỬI THẬT" in cho từng tab.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { check, cli, closeTab, newTab, results, sleep, SESSION_ALLOW } from "./cdp.mjs";

const CLI = cli();
const BLOCKS = ["pairing", "board", "display"];
if (CLI.only && !CLI.only.every((n) => BLOCKS.includes(n))) {
  console.log(`--only hỗ trợ: ${BLOCKS.join(", ")} (nhận được: ${CLI.only.join(",")})`);
  process.exit(2);
}
const RUN = (name) => !CLI.only || CLI.only.includes(name);
const J = JSON.stringify;
const API = process.env.API_BASE_URL ?? "http://localhost:3100/api/v1";
const REVOKED_TEXT = "Màn hình này không còn được ghép với chi nhánh (đã bị thu hồi hoặc ghép lại ở máy khác). Hãy nhập mã mới bên dưới trong phần quản lý màn hình gọi số.";
const DEVICE_KEY = "smartfnb.callingDisplay";
const TEST_DEVICE_LIMIT = Number(process.env.TEST_DEVICE_LIMIT ?? 2);

/** SELECT chỉ đọc qua docker exec (BAN-GIAO quy tắc 12). */
const sql = (query) =>
  execFileSync("docker", ["exec", "smart-fnb-postgres", "psql", "-U", "smartfnb", "-d", "smart_fnb", "-At", "-F", "|", "-c", query], { encoding: "utf8" }).trim();
const activeCalling = () => sql(`select id, coalesce(name,'') from display_devices where type='CALLING_DISPLAY' and revoked_at is null`);
const testDevices = () =>
  sql(`select id, coalesce(name,''), revoked_at is not null from display_devices where name like 'TEST-8.1%' order by paired_at`)
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const [id, name, revoked] = l.split("|");
      return { id, name, revoked: revoked === "t" };
    });

const tid = (id) => `document.querySelector('[data-testid=${J(id)}]')`;
const ctxGets = (tab) => tab.requests.filter((r) => r.method === "GET" && /\/public\/calling-display\/context/.test(r.url)).length;
const stored = (tab) => tab.eval(`JSON.parse(localStorage.getItem(${J(DEVICE_KEY)}) ?? "null")`);
const inject = (tab, type) => tab.eval(`window.__injectOperationsEvent({ type: ${J(type)}, occurredAt: new Date().toISOString(), data: {} })`);
const sentTo = (tab, method, re) => (tab.sentWrites ?? []).filter((w) => w.method === method && re.test(w.path));
const codePosts = (tab) => sentTo(tab, "POST", /\/device-pairing\/codes$/).length;
const CODE_RE = `/^\\d{6}$/.test(document.querySelector('[data-testid="call-pairing-code"]')?.textContent ?? "")`;
/** Số đang hiện trên bảng: [đang pha, mời nhận]. */
const board = (tab) =>
  tab.eval(`["call-preparing", "call-ready"].map((id) => [...document.querySelectorAll('[data-testid="' + id + '"] [data-testid="call-cell"]')].map((e) => e.innerText.trim()))`);

async function newTv() {
  const tab = await newTab("about:blank", "real", { isolated: true });
  await tab.blockWrites([{ method: "POST", match: /\/device-pairing\/codes$/ }]);
  return tab;
}

/** Manager nhập mã vào hộp "Ghép màn hình gọi số" và xác nhận. */
async function managerPair(mgr, code, name) {
  await mgr.eval(`${tid("calling-pair")}.click()`);
  await mgr.waitFor(tid("pair-digit-0"), 10000, "hộp ghép mở");
  await mgr.eval(`(() => { const el = ${tid("pair-digit-0")}; const dt = new DataTransfer(); dt.setData("text", ${J(code)});
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true })); })()`);
  await mgr.eval(`(() => { const el = ${tid("pair-device-name")}; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, ${J(name)});
    el.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  await sleep(300);
  await mgr.eval(`${tid("pair-submit")}.click()`);
  await mgr.waitFor(`document.querySelector(".ant-modal-confirm")`, 8000, "hộp xác nhận ghép");
  await mgr.eval(`[...document.querySelectorAll(".ant-modal-confirm button")].find((b) => b.textContent.includes("Ghép")).click()`);
}

/** DELETE thật, chỉ cho đúng một id thiết bị TEST-8.1 (mở allow-list cho id đó). */
async function managerRevoke(mgr, device) {
  if (!/^TEST-8\.1/.test(device.name)) throw new Error(`từ chối thu hồi thiết bị không phải TEST-8.1: ${device.name}`);
  mgr.blockAllow.push({ method: "DELETE", match: new RegExp(`/display-devices/${device.id}$`) });
  return mgr.eval(`(async () => { const r = await fetch(${J(`${API}/display-devices/${device.id}`)}, { method: "DELETE", headers: { Authorization: "Bearer " + localStorage.getItem("smartfnb_access_token") } });
    return { status: r.status, body: await r.text() }; })()`);
}

async function runPairing() {
  if (testDevices().length + 2 > TEST_DEVICE_LIMIT) {
    console.log(`BỎ QUA khối pairing: BE đã có ${testDevices().length} thiết bị TEST-8.1, hạn mức thử ${TEST_DEVICE_LIMIT} (TEST_DEVICE_LIMIT).`);
    check("pairing: chốt chặn hạn mức thiết bị thử (đã dùng hết, không tạo thêm)", true, `${testDevices().length}/${TEST_DEVICE_LIMIT}`);
    return;
  }
  const tv = await newTv();
  const mgr = await newTab("about:blank", "real");
  await mgr.blockWrites([...SESSION_ALLOW, { method: "POST", match: /\/stations\/pair-calling-display$/ }]);
  const T = (e) => tv.eval(e);
  const M = (e) => mgr.eval(e);
  const waitTv = (expr, ms = 15000, label = expr) => tv.waitFor(expr, ms, label);
  try {
    const before = activeCalling();
    if (before) throw new Error(`BE đã có màn gọi số đang ghép; ghép thử sẽ thu hồi máy đó. Dừng.`);

    // ── 1. TV mở, tự lấy mã ─────────────────────────────────────────────────────────────────────────────────────────────
    mgr.caseName = tv.caseName = "1 lấy mã";
    await tv.goto("/display/call");
    await waitTv(CODE_RE, 15000, "mã 6 số");
    const code1 = await T(`${tid("call-pairing-code")}.textContent`);
    const st1 = await stored(tv);
    check("1 · TV hiện mã 6 số, lưu token thiết bị (paired=false) ở smartfnb.callingDisplay", /^\d{6}$/.test(code1) && st1?.paired === false && !!st1?.deviceToken && st1.code === code1, code1);
    check("1 · TV KHÔNG có phiên người dùng (không smartfnb_access_token) và không gọi /api/v1/auth/*", (await T(`localStorage.getItem("smartfnb_access_token")`)) === null && !tv.requests.some((r) => /\/api\/v1\/auth\//.test(r.url)));
    check("1 · Đúng 1 request ghi: POST /device-pairing/codes", codePosts(tv) === 1 && (tv.sentWrites ?? []).length === 1 && /CALLING_DISPLAY/.test(tv.sentWrites[0].body ?? ""));
    await sleep(7000);
    check("1 · Chờ ghép: ~3 giây một lượt hỏi (≤ 5 lượt trong 7 giây), KHÔNG hiện lỗi", ctxGets(tv) >= 2 && ctxGets(tv) <= 5 && !(await T(`!!${tid("call-error")}`)), `${ctxGets(tv)} lượt`);

    // ── 2. Manager đăng nhập và nhập mã ─────────────────────────────────────────────────────────────────────────────────
    mgr.caseName = tv.caseName = "2 Manager ghép";
    await mgr.goto("/login");
    await mgr.clearStorage();
    await mgr.goto("/login");
    await mgr.login("manager");
    await mgr.waitFor(`location.pathname.startsWith("/manager")`, 20000, "vào /manager");
    await sleep(800);
    await M(`(() => { history.pushState({}, "", "/manager/stations"); dispatchEvent(new PopStateEvent("popstate")); })()`);
    await mgr.waitFor(tid("calling-pair"), 15000, "màn Quầy & thiết bị");
    await managerPair(mgr, code1, "TEST-8.1 màn gọi số A");
    await mgr.waitFor(`/Đã ghép màn hình gọi số/.test(document.body.innerText)`, 15000, "thông báo ghép xong");
    const pairWrites = sentTo(mgr, "POST", /\/stations\/pair-calling-display$/);
    check("2 · Manager ghép: đúng 1 POST /stations/pair-calling-display, thân chỉ có mã + tên máy", pairWrites.length === 1 && JSON.parse(pairWrites[0].body).code === code1 && /TEST-8\.1/.test(pairWrites[0].body), pairWrites[0]?.body);
    const devA = testDevices()[0];
    check("2 · BE ghi thiết bị CALLING_DISPLAY TEST-8.1 chưa thu hồi", !!devA && !devA.revoked, devA?.id);

    // ── 3. TV vào trạng thái đã ghép ───────────────────────────────────────────────────────────────────────────────────
    mgr.caseName = tv.caseName = "3 TV đã ghép";
    const t0 = Date.now();
    await waitTv(`document.body.innerText.includes("ĐANG CHUẨN BỊ") && document.body.innerText.includes("MỜI NHẬN")`, 20000, "bảng số");
    check(`3 · TV vào bảng số sau khi Manager ghép (${((Date.now() - t0) / 1000).toFixed(1)} giây); token chuyển paired=true`, (await stored(tv))?.paired === true);
    await waitTv(`${tid("call-status")}?.getAttribute("data-status") === "connected"`, 15000, "socket connected");
    check("3 · Chỉ báo 'Trực tuyến' (socket /operations nối bằng token thiết bị, TV không có phiên người dùng)", /Trực tuyến/.test(await T(`${tid("call-status")}.innerText`)));
    check("3 · Mã ghép cũ không còn hiện; hiện tên doanh nghiệp + chi nhánh", !/\b\d{6}\b/.test(await T(`document.querySelector("main").innerText`)), (await T(`document.querySelector("main header")?.innerText ?? ""`)).replace(/\s+/g, " "));
    const api = await T(`(async () => { const t = JSON.parse(localStorage.getItem(${J(DEVICE_KEY)})).deviceToken;
      const r = await fetch(${J(`${API}/public/calling-display/context`)}, { headers: { Authorization: "Bearer " + t }, cache: "no-store" });
      const b = await r.json(); return { status: r.status, numbers: [...b.preparing, ...b.ready].map((o) => String(o.callNumber).padStart(3, "0")) }; })()`);
    const shown = (await board(tv)).flat();
    check("3 · Số hiện trên TV khớp GET /public/calling-display/context của BE (dữ liệu thật: hôm nay có thể 0 số)", api.status === 200 && JSON.stringify([...shown].sort()) === JSON.stringify([...api.numbers].sort()), `${shown.length} số`);

    // ── 4. F5 vẫn giữ ghép ─────────────────────────────────────────────────────────────────────────────────────────────
    mgr.caseName = tv.caseName = "4 F5";
    const postsBefore = codePosts(tv);
    await tv.goto("/display/call");
    await waitTv(`document.body.innerText.includes("ĐANG CHUẨN BỊ")`, 20000, "bảng số sau F5");
    await waitTv(`${tid("call-status")}?.getAttribute("data-status") === "connected"`, 15000, "socket sau F5");
    check("4 · F5: vào lại bảng số, KHÔNG tạo mã mới, token giữ nguyên, socket nối lại", codePosts(tv) === postsBefore && (await stored(tv))?.paired === true);

    // ── 5. Sự kiện socket → tải lại đúng lúc, sự kiện khác bị bỏ ───────────────────────────────────────────────────────────
    mgr.caseName = tv.caseName = "5 socket";
    await sleep(1500);
    let g = ctxGets(tv);
    const n1 = await inject(tv, "menu.availability.changed");
    await sleep(1500);
    check("5 · Sự kiện không phải calling.* → KHÔNG tải lại", ctxGets(tv) === g && n1 === 1, `người nghe ${n1}`);
    await inject(tv, "calling.order.ready");
    await inject(tv, "calling.order.preparing");
    await inject(tv, "calling.order.delivered");
    await sleep(1500);
    check("5 · 3 sự kiện calling.order.* liền nhau → gom thành ĐÚNG 1 lần tải lại", ctxGets(tv) === g + 1, `${ctxGets(tv) - g} lượt`);

    // ── 6. Lỗi: 500, mạng, tự hồi phục, giãn cách ──────────────────────────────────────────────────────────────────────────
    mgr.caseName = tv.caseName = "6 lỗi";
    tv.setFault({ kind: "500", match: /\/public\/calling-display\/context/ });
    g = ctxGets(tv);
    await inject(tv, "calling.order.ready");
    await waitTv(`${tid("call-error")}`, 8000, "lỗi 500 hiện");
    check("6 · Lỗi 500: câu tiếng Việt, bảng số cũ vẫn hiện, token giữ", (await T(`${tid("call-error")}.innerText`)) === "Máy chủ đang gặp sự cố, thử lại sau ít phút." && /ĐANG CHUẨN BỊ/.test(await T(`document.body.innerText`)) && (await stored(tv))?.paired === true);
    await sleep(11000);
    const hits500 = ctxGets(tv) - g;
    check("6 · Lỗi 500 kéo dài 12 giây: ≤ 3 lượt hỏi (5s, 10s…, không dồn dập)", hits500 >= 1 && hits500 <= 3, `${hits500} lượt`);
    tv.setFault({ kind: "network", match: /\/public\/calling-display\/context/ });
    await waitTv(`/Không kết nối được máy chủ/.test(${tid("call-error")}?.innerText ?? "")`, 25000, "lỗi mạng hiện");
    check("6 · Mất mạng: 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.', không có chữ Failed to fetch", !/Failed to fetch|TypeError/i.test(await T(`document.body.innerText`)));
    tv.setFault(null);
    const tFix = Date.now();
    await waitTv(`!${tid("call-error")}`, 45000, "tự hồi phục");
    check(`6 · Hết lỗi: tự hồi phục không cần thao tác (${((Date.now() - tFix) / 1000).toFixed(0)} giây), vẫn ghép`, (await stored(tv))?.paired === true && /ĐANG CHUẨN BỊ/.test(await T(`document.body.innerText`)));

    // ── 7. Thu hồi ───────────────────────────────────────────────────────────────────────────────────────────────────────
    mgr.caseName = tv.caseName = "7 thu hồi";
    const codesBeforeRevoke = codePosts(tv);
    const oldToken = (await stored(tv))?.deviceToken;
    const del = await managerRevoke(mgr, devA);
    check("7 · Manager thu hồi: DELETE /display-devices/{id} → 200 {revoked:true}", del.status === 200 && /revoked/.test(del.body), `${del.status} ${del.body}`);
    check("7 · BE ghi revoked_at cho thiết bị TEST-8.1", testDevices()[0]?.revoked === true);
    const tRev = Date.now();
    await waitTv(`!!${tid("call-notice")}`, 80000, "TV quay về bước ghép");
    const secs = ((Date.now() - tRev) / 1000).toFixed(0);
    check(`7 · TV phát hiện thu hồi (${secs} giây) và quay về bước ghép đúng câu tiếng Việt`, (await T(`${tid("call-notice")}.innerText`)) === REVOKED_TEXT && !/ĐANG CHUẨN BỊ/.test(await T(`document.body.innerText`)));
    await waitTv(CODE_RE, 10000, "mã mới");
    const st2 = await stored(tv);
    check("7 · Token cũ bị xoá, có mã mới + token mới (paired=false), không treo", st2?.paired === false && !!st2.deviceToken && st2.deviceToken !== oldToken && st2.code !== code1);
    await sleep(12000);
    check("7 · Sau thu hồi KHÔNG lặp tạo mã (đúng +1 POST /device-pairing/codes trong 12 giây)", codePosts(tv) === codesBeforeRevoke + 1);

    // ── 8. Ghép lại bằng mã mới (thiết bị thử thứ hai) ───────────────────────────────────────────────────────────────────
    mgr.caseName = tv.caseName = "8 ghép lại";
    await managerPair(mgr, st2.code, "TEST-8.1 màn gọi số B");
    await mgr.waitFor(`/Đã ghép màn hình gọi số/.test(document.body.innerText)`, 15000, "ghép lại xong");
    await waitTv(`document.body.innerText.includes("ĐANG CHUẨN BỊ")`, 20000, "bảng số sau ghép lại");
    await waitTv(`${tid("call-status")}?.getAttribute("data-status") === "connected"`, 15000, "socket sau ghép lại");
    const devB = testDevices().find((d) => !d.revoked);
    check("8 · Ghép lại: TV vào bảng số, socket nối, BE có thiết bị TEST-8.1 B", !!devB && devB.id !== devA.id && !!(await stored(tv))?.paired);

    // ── 9. Dọn: thu hồi thiết bị TEST còn lại ──────────────────────────────────────────────────────────────────────────────
    mgr.caseName = tv.caseName = "9 dọn";
    const del2 = await managerRevoke(mgr, devB);
    const left = testDevices().filter((d) => !d.revoked).length;
    check("9 · Dọn: thu hồi thiết bị B; không còn thiết bị TEST-8.1 / màn gọi số nào đang hoạt động", del2.status === 200 && left === 0 && activeCalling() === "", `${del2.status}, còn ${left}`);
    check("9 · Tổng thiết bị thử đã tạo: 2 (≤ 2)", testDevices().length === 2, String(testDevices().length));
  } catch (e) {
    console.log("ERROR", e.stack ?? e.message);
    check("pairing: script chạy hết không lỗi", false, e.message);
    // Dọn khi lỗi giữa chừng: thu hồi mọi thiết bị TEST-8.1 còn hoạt động.
    try {
      if (mgr.blockAllow) {
        for (const d of testDevices().filter((x) => !x.revoked)) console.log(`   [dọn] thu hồi ${d.name}: ${(await managerRevoke(mgr, d)).status}`);
      }
    } catch (e2) {
      console.log("   [dọn] không dọn được:", e2.message);
    }
  }
  await closeTab(tv);
  await closeTab(mgr);
}

/** Khối KHÔNG tạo thiết bị: mã + phiên, bảng số từ trả lời giả, socket bị từ chối, thu hồi giả, đồng hồ lệch. */
async function runBoard() {
  const tab = await newTv();
  const Q = (e) => tab.eval(e);
  const wait = (expr, ms = 15000, label = expr) => tab.waitFor(expr, ms, label);
  const ctx = (preparing, ready) =>
    JSON.stringify({
      branch: { name: "Chi nhánh thử" },
      branding: { displayName: "Quán thử", logoUrl: null, primaryColor: "#0F172A", secondaryColor: "#FFFFFF", accentColor: "#22C55E" },
      preparing: preparing.map((n) => ({ id: `o${n}`, callNumber: n, status: "PREPARING", submittedAt: "2026-10-11T08:00:00Z", readyAt: null })),
      ready: ready.map((n) => ({ id: `o${n}`, callNumber: n, status: "READY", submittedAt: "2026-10-11T08:00:00Z", readyAt: "2026-10-11T08:05:00Z" })),
      serverTime: "2026-10-11T08:06:00Z",
    });
  const ctxRe = /\/public\/calling-display\/context/;
  try {
    // A. Mã + không phiên người dùng
    tab.caseName = "A mã";
    await tab.goto("/display/call");
    await wait(CODE_RE, 15000, "mã 6 số");
    const st = await stored(tab);
    check("A · TV tự lấy mã; token thiết bị lưu riêng, KHÔNG có phiên người dùng, không gọi /api/v1/auth/*", /^\d{6}$/.test(st?.code ?? "") && st.paired === false && (await Q(`localStorage.getItem("smartfnb_access_token")`)) === null && !tab.requests.some((r) => /\/api\/v1\/auth\//.test(r.url)) && codePosts(tab) === 1);

    // B. Bảng số từ trả lời giả (token giả, không có thiết bị trong BE)
    tab.caseName = "B bảng số";
    tab.readOverride = { match: ctxRe, body: ctx([12, 13], [7]) };
    await Q(`localStorage.setItem(${J(DEVICE_KEY)}, JSON.stringify({ pairingId: "x", code: "000000", deviceToken: "TEST-8.1-token-gia", expiresAt: "2026-10-11T00:00:00Z", paired: true }))`);
    const posts = codePosts(tab);
    await tab.goto("/display/call");
    await wait(`document.body.innerText.includes("ĐANG CHUẨN BỊ")`, 15000, "bảng số");
    const [prep, ready] = await board(tab);
    check("B · F5 với token đã ghép: vào thẳng bảng số, không tạo mã mới; đúng số đang pha / mời nhận", codePosts(tab) === posts && JSON.stringify(prep) === J(["013", "012"]) && JSON.stringify(ready) === J(["007"]), `${J(prep)} · ${J(ready)}`);
    check("B · Có tên doanh nghiệp + chi nhánh, không hiện mã ghép cũ", /Quán thử/.test(await Q(`document.body.innerText`)) && /Chi nhánh thử/.test(await Q(`document.body.innerText`)) && !(await Q(`!!${tid("call-pairing-code")}`)));

    // C. Sự kiện calling.* đổi bảng; sự kiện khác không đổi
    tab.caseName = "C sự kiện";
    tab.readOverride = { match: ctxRe, body: ctx([13], [7, 12]) };
    const g = ctxGets(tab);
    await inject(tab, "menu.availability.changed");
    await sleep(1200);
    check("C · Sự kiện không phải calling.* không làm tải lại", ctxGets(tab) === g);
    await inject(tab, "calling.order.ready");
    await wait(`document.querySelector('[data-testid="call-ready"]').innerText.includes("012")`, 6000, "bảng cập nhật");
    const [prep2, ready2] = await board(tab);
    check("C · Sự kiện calling.order.ready → 1 lần tải lại, 012 chuyển sang 'Mời nhận'", ctxGets(tab) === g + 1 && JSON.stringify(prep2) === J(["013"]) && JSON.stringify(ready2) === J(["012", "007"]), `${J(prep2)} · ${J(ready2)}`);

    // D. Socket bị BE từ chối (token giả): báo mất kết nối, không treo, không dồn dập
    tab.caseName = "D socket từ chối";
    await wait(`/Mất kết nối, đang thử lại/.test(${tid("call-status")}?.innerText ?? "")`, 40000, "báo mất kết nối");
    check("D · Token bị socket từ chối: 'Mất kết nối, đang thử lại', bảng số vẫn hiện, không lỗi đỏ", /ĐANG CHUẨN BỊ/.test(await Q(`document.body.innerText`)) && !(await Q(`!!${tid("call-error")}`)));
    const d0 = ctxGets(tab);
    await sleep(25000);
    const dHits = ctxGets(tab) - d0;
    check("D · 25 giây mất socket: ≤ 4 lượt hỏi REST (nhịp 10 giây, không dồn dập)", dHits >= 1 && dHits <= 4, `${dHits} lượt`);

    // E. Thu hồi (403 khi đã ghép) → về bước ghép
    tab.caseName = "E thu hồi giả";
    tab.readOverride = null;
    tab.setFault({ kind: "403", match: ctxRe });
    const p0 = codePosts(tab);
    await inject(tab, "calling.order.ready");
    await wait(`!!${tid("call-notice")}`, 10000, "về bước ghép");
    check("E · 403 sau khi đã ghép: về bước ghép đúng câu tiếng Việt, không chữ tiếng Anh của BE", (await Q(`${tid("call-notice")}.innerText`)) === REVOKED_TEXT && !/permission|Forbidden|revoked/i.test(await Q(`document.body.innerText`)));
    tab.setFault(null);
    await wait(CODE_RE, 10000, "mã mới");
    check("E · Token cũ bị xoá, có mã mới (paired=false)", (await stored(tab))?.paired === false && (await stored(tab))?.deviceToken !== "TEST-8.1-token-gia");
    await sleep(10000);
    check("E · Không lặp tạo mã: đúng +1 POST /device-pairing/codes", codePosts(tab) === p0 + 1);
    // Lúc bơm 403, lần tạo mã đầu cũng bị `setFault` giả lỗi (vào blockedWrites, không tới BE) rồi màn thử lại giãn cách: vẫn chỉ là POST mã.
    const only = (list) => list.every((w) => /\/device-pairing\/codes$/.test(w.path));
    check("E · Màn không có request ghi nào khác ngoài POST /device-pairing/codes (cả đã gửi lẫn bị chặn/giả lỗi)", only(tab.sentWrites ?? []) && only(tab.blockedWrites ?? []));
  } catch (e) {
    console.log("ERROR", e.stack ?? e.message);
    check("board: script chạy hết không lỗi", false, e.message);
  }
  await closeTab(tab);

  // F. Đồng hồ máy TV lệch giờ không làm lặp tạo mã
  const skew = await newTv();
  try {
    skew.caseName = "F lệch giờ";
    await skew.send("Page.addScriptToEvaluateOnNewDocument", { source: `(() => { const n = Date.now.bind(Date); Date.now = () => n() + 3600e3; })()` });
    await skew.goto("/display/call");
    await sleep(9000);
    const shown = await skew.eval(`document.querySelector('[data-testid="call-pairing-code"]')?.textContent ?? ""`);
    check("F · Đồng hồ TV chạy nhanh 1 giờ: vẫn giữ MỘT mã (không lặp POST /device-pairing/codes)", codePosts(skew) === 1 && /^\d{6}$/.test(shown), `${codePosts(skew)} POST, mã ${shown}`);
  } catch (e) {
    check("board F: script chạy hết không lỗi", false, e.message);
  }
  await closeTab(skew);
}

/** Chuyển màu CSS bất kỳ (kể cả oklch của Tailwind v4) sang [r,g,b] qua canvas, rồi tính tỉ lệ tương phản WCAG 2.x. */
const RGB_FN = `(c) => { const x = document.createElement("canvas").getContext("2d"); x.fillStyle = "#000"; x.fillStyle = c; x.fillRect(0, 0, 1, 1); return [...x.getImageData(0, 0, 1, 1).data].slice(0, 3); }`;
const lum = ([r, g, b]) => [r, g, b].map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

/**
 * Khối `display` (8.2, KHÔNG tạo mã/thiết bị, 0 request ghi): token thiết bị GIẢ + trả lời giả của `GET context` (readOverride).
 * Ảnh chụp lưu NGOÀI repo ở SHOT_DIR (mặc định thư mục tạm); socket của token giả bị BE từ chối nên chỉ báo "Mất kết nối" là thật.
 */
async function runDisplay() {
  const SHOT_DIR = process.env.SHOT_DIR ?? join(tmpdir(), "fnb-8.2-shots");
  mkdirSync(SHOT_DIR, { recursive: true });
  const tab = await newTv();
  const Q = (e) => tab.eval(e);
  const ctxRe = /\/public\/calling-display\/context/;
  const T0 = Date.parse("2026-10-11T08:00:00Z");
  const iso = (ms) => new Date(ms).toISOString();
  const mk = (numbers, kind) =>
    numbers.map((n, i) => ({ id: `${kind}-${n}-${i}`, callNumber: n, status: kind === "r" ? "READY" : "PREPARING", submittedAt: iso(T0 + i * 60000), readyAt: kind === "r" ? iso(T0 + i * 60000 + 30000) : null }));
  const ctx = (prep, ready, primary = "#0F172A") =>
    JSON.stringify({ branch: { name: "Chi nhánh Nguyễn Huệ" }, branding: { displayName: "Cà phê Mẫu", logoUrl: null, primaryColor: primary, secondaryColor: "#FFFFFF", accentColor: "#22C55E" }, preparing: mk(prep, "p"), ready: mk(ready, "r"), serverTime: iso(T0) });
  const size = (w, h) => tab.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  const shot = async (name) => {
    const r = await tab.send("Page.captureScreenshot", { format: "png" });
    const file = join(SHOT_DIR, `${name}.png`);
    writeFileSync(file, Buffer.from(r.result.data, "base64"));
    console.log(`   [ảnh] ${file}`);
    return file;
  };
  const load = async (prep, ready, primary, w = 1920, h = 1080) => {
    tab.readOverride = { match: ctxRe, body: ctx(prep, ready, primary) };
    await size(w, h);
    await tab.goto("/display/call");
    await tab.waitFor(`document.querySelector('[data-testid="call-header"]')`, 15000, "bảng số");
    await sleep(700);
  };
  const cells = (id) => Q(`[...document.querySelectorAll('[data-testid="${id}"] [data-testid="call-cell"]')].map((e) => e.innerText.trim())`);
  const more = (id) => Q(`document.querySelector('[data-testid="${id}"] [data-testid="call-more"]')?.innerText.trim() ?? null`);
  /** Không tràn: không cuộn trang, mọi ô nằm trong khung cột của nó, chữ không vượt ô. */
  const fits = () =>
    Q(`(() => { const doc = document.documentElement; const bad = [];
      for (const sec of document.querySelectorAll('[data-testid="call-preparing"], [data-testid="call-ready"]')) {
        const s = sec.getBoundingClientRect();
        for (const c of sec.querySelectorAll('[data-testid="call-cell"], [data-testid="call-more"]')) {
          const r = c.getBoundingClientRect();
          if (r.left < s.left - 1 || r.right > s.right + 1 || r.top < s.top - 1 || r.bottom > s.bottom + 1 || c.scrollWidth > c.clientWidth + 1 || c.scrollHeight > c.clientHeight + 1) bad.push(c.innerText);
        }
      }
      return { scroll: doc.scrollHeight > innerHeight + 1 || doc.scrollWidth > innerWidth + 1, bad }; })()`);
  const colors = (sel, bgSel = sel) =>
    Q(`(() => { const rgb = ${RGB_FN}; const e = document.querySelector(${J(sel)}); const b = document.querySelector(${J(bgSel)});
      return { fg: rgb(getComputedStyle(e).color), bg: rgb(getComputedStyle(b).backgroundColor) }; })()`);
  const ratios = {};
  try {
    await tab.goto("/login");
    await Q(`localStorage.setItem(${J(DEVICE_KEY)}, JSON.stringify({ pairingId: "x", code: "000000", deviceToken: "TEST-8.2-token-gia", expiresAt: "2026-10-11T00:00:00Z", paired: true }))`);

    // 1. 0 số
    tab.caseName = "1 rỗng";
    await load([], []);
    check("1 · 0 số: hai cột đủ nhãn 'ĐANG CHUẨN BỊ' / 'MỜI NHẬN MÓN', câu 'Chưa có đơn…', không ô số", (await cells("call-preparing")).length === 0 && (await cells("call-ready")).length === 0 && /ĐANG CHUẨN BỊ/.test(await Q(`document.body.innerText`)) && /MỜI NHẬN MÓN/.test(await Q(`document.body.innerText`)) && /Chưa có đơn sẵn sàng/.test(await Q(`document.body.innerText`)));
    await shot("0-so-1920x1080");

    // 2. 3 số + nhận diện + tương phản
    tab.caseName = "2 ba số";
    await load([12, 13], [7], "#FDE68A");
    check("2 · 3 số: đang chuẩn bị [013, 012] (mới nhất ở trên), mời nhận [007]; số đệm 3 chữ số", JSON.stringify(await cells("call-preparing")) === J(["013", "012"]) && JSON.stringify(await cells("call-ready")) === J(["007"]), J(await cells("call-preparing")));
    const hdrLight = await colors('[data-testid="call-header"] h1', '[data-testid="call-header"]');
    ratios.headerLightBrand = ratio(hdrLight.fg, hdrLight.bg);
    check(`2 · Màu thương hiệu SÁNG (#FDE68A) chỉ ở thanh tiêu đề, chữ tự đổi sang tối: tương phản ${ratios.headerLightBrand.toFixed(1)}:1 (≥ 4.5)`, ratios.headerLightBrand >= 4.5);
    await shot("3-so-1920x1080-thuong-hieu-sang");
    await load([12, 13], [7], "#0F172A");
    const hdrDark = await colors('[data-testid="call-header"] h1', '[data-testid="call-header"]');
    ratios.headerDarkBrand = ratio(hdrDark.fg, hdrDark.bg);
    const ready = await colors('[data-testid="call-ready"] [data-testid="call-cell"]');
    const prep = await colors('[data-testid="call-preparing"] [data-testid="call-cell"]');
    const readyTitle = await colors('[data-testid="call-ready"] h2', '[data-testid="call-ready"]');
    const prepTitle = await colors('[data-testid="call-preparing"] h2', '[data-testid="call-preparing"]');
    ratios.ready = ratio(ready.fg, ready.bg);
    ratios.preparing = ratio(prep.fg, prep.bg);
    ratios.readyTitle = ratio(readyTitle.fg, readyTitle.bg);
    ratios.prepTitle = ratio(prepTitle.fg, prepTitle.bg);
    const same = (a, b) => a.every((v, i) => v === b[i]);
    check(`2 · Màu SỐ cố định, không theo thương hiệu: số mời nhận ${ratios.ready.toFixed(1)}:1, số đang chuẩn bị ${ratios.preparing.toFixed(1)}:1 (WCAG AA ≥ 4.5; AAA ≥ 7)`, ratios.ready >= 7 && ratios.preparing >= 7, J(ratios));
    check(`2 · Tiêu đề cột đạt AA: mời nhận ${ratios.readyTitle.toFixed(1)}:1, đang chuẩn bị ${ratios.prepTitle.toFixed(1)}:1; thanh tiêu đề nền tối ${ratios.headerDarkBrand.toFixed(1)}:1`, ratios.readyTitle >= 4.5 && ratios.prepTitle >= 4.5 && ratios.headerDarkBrand >= 4.5);
    check("2 · Màu số KHÔNG đổi khi đổi màu thương hiệu (sáng/tối)", !same(ready.bg, hdrDark.bg) && same(ready.fg, (await (async () => { await load([12, 13], [7], "#FDE68A"); return colors('[data-testid="call-ready"] [data-testid="call-cell"]'); })()).fg));
    check("2 · Tên doanh nghiệp + chi nhánh ở thanh tiêu đề", /Cà phê Mẫu/.test(await Q(`document.querySelector('[data-testid="call-header"]').innerText`)) && /Nguyễn Huệ/.test(await Q(`document.querySelector('[data-testid="call-header"]').innerText`)));
    await load([12, 13], [7], "#0F172A", 1280, 800);
    await shot("3-so-1280x800");
    const f3 = await fits();
    check("2 · 3 số ở 1280×800 (tablet ngang): không tràn, không cuộn", !f3.scroll && f3.bad.length === 0, J(f3));

    // 3. 60 số: tối đa ô vừa màn + "+N số khác"
    tab.caseName = "3 sáu mươi số";
    const p30 = Array.from({ length: 30 }, (_, i) => i + 1);
    const r30 = Array.from({ length: 30 }, (_, i) => 101 + i);
    for (const [w, h] of [[1920, 1080], [1280, 800]]) {
      await load(p30, r30, "#0F172A", w, h);
      const pc = await cells("call-preparing");
      const rc = await cells("call-ready");
      const fit = await fits();
      check(`3 · 60 số ở ${w}×${h}: mời nhận ${rc.length} số + '${await more("call-ready")}', đang chuẩn bị ${pc.length} số + '${await more("call-preparing")}'; không tràn/cuộn`, rc.length === 7 && (await more("call-ready")) === "+23 số khác" && pc.length === 14 && (await more("call-preparing")) === "+16 số khác" && !fit.scroll && fit.bad.length === 0, J(fit));
      check(`3 · 60 số ở ${w}×${h}: số MỚI NHẤT ở trên (mời nhận bắt đầu bằng 130, đang chuẩn bị bằng 030)`, rc[0] === "130" && pc[0] === "030", `${rc[0]} · ${pc[0]}`);
      await shot(`60-so-${w}x${h}`);
    }

    // 4. Số > 999
    tab.caseName = "4 số lớn";
    await load([12345, 9], [1234, 7]);
    const big = await fits();
    check("4 · Số 1234 / 12345 hiện đủ, không cắt, không vỡ bố cục", (await cells("call-ready")).includes("1234") && (await cells("call-preparing")).includes("12345") && !big.scroll && big.bad.length === 0, J(await cells("call-ready")));
    await shot("so-1234-1920x1080");

    // 5. Số vừa gọi: nhấn mạnh ~10 giây, reduced-motion
    tab.caseName = "5 nhấn mạnh";
    await load([13], [7]);
    tab.readOverride = { match: ctxRe, body: ctx([], [7, 12]) };
    await inject(tab, "calling.order.ready");
    await tab.waitFor(`document.querySelector('[data-testid="call-ready"] [data-number="12"]')?.getAttribute("data-lit") === "true"`, 6000, "số 12 nhấn mạnh");
    const litAt = Date.now();
    const lit = await Q(`(() => { const c = (n) => document.querySelector('[data-testid="call-ready"] [data-number="' + n + '"]'); const s = getComputedStyle(c(12));
      return { l12: c(12).dataset.lit, l7: c(7).dataset.lit, anim: s.animationName, transform: s.transform }; })()`);
    check("5 · Số 012 vừa chuyển sang 'Mời nhận' được nhấn mạnh (có hoạt ảnh), số 007 cũ thì không", lit.l12 === "true" && lit.l7 === "false" && lit.anim !== "none", J(lit));
    await shot("so-vua-goi-1920x1080");
    await size(1280, 800);
    await shot("so-vua-goi-1280x800");
    await size(1920, 1080);
    await tab.waitFor(`document.querySelector('[data-testid="call-ready"] [data-number="12"]')?.getAttribute("data-lit") === "false"`, 14000, "hết nhấn mạnh");
    const secs = (Date.now() - litAt) / 1000;
    check(`5 · Hết nhấn mạnh sau ~10 giây (đo ${secs.toFixed(1)} giây)`, secs >= 8 && secs <= 12.5);
    await tab.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    tab.readOverride = { match: ctxRe, body: ctx([], [7, 12, 13]) };
    await inject(tab, "calling.order.ready");
    await tab.waitFor(`document.querySelector('[data-testid="call-ready"] [data-number="13"]')?.getAttribute("data-lit") === "true"`, 6000, "số 13 nhấn mạnh");
    const rm = await Q(`(() => { const s = getComputedStyle(document.querySelector('[data-testid="call-ready"] [data-number="13"]')); return { anim: s.animationName, transform: s.transform, ring: s.boxShadow !== "none" }; })()`);
    check("5 · prefers-reduced-motion: vẫn nhấn mạnh bằng viền, KHÔNG hoạt ảnh/phóng to", rm.anim === "none" && (rm.transform === "none" || /^matrix\(1, 0, 0, 1, 0, 0\)$/.test(rm.transform)) && rm.ring, J(rm));
    await tab.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });

    // 6. Mất kết nối: giữ bảng, chỉ báo
    tab.caseName = "6 mất kết nối";
    await load([12, 13], [7]);
    tab.readOverride = null;
    tab.setFault({ kind: "network", match: ctxRe });
    await inject(tab, "calling.order.ready");
    await tab.waitFor(`document.querySelector('[data-testid="call-status"]')?.getAttribute("data-offline") === "true"`, 8000, "chỉ báo mất kết nối");
    check("6 · Mất mạng: giữ nguyên bảng cuối (3 số), chỉ báo 'Mất kết nối, đang thử lại', không màn trắng", /Mất kết nối, đang thử lại/.test(await Q(`document.querySelector('[data-testid="call-status"]').innerText`)) && (await cells("call-preparing")).length === 2 && (await cells("call-ready")).length === 1);
    await shot("mat-ket-noi-1920x1080");
    tab.setFault(null);

    // 7. Âm thanh
    tab.caseName = "7 âm thanh";
    await load([12], [7]);
    check("7 · Chưa bật âm: góc màn có chỉ báo nhỏ 'Âm thanh tắt', bảng vẫn hiện", /Âm thanh tắt/.test(await Q(`document.querySelector('[data-testid="call-sound-off"]')?.innerText ?? ""`)) && (await cells("call-ready")).length === 1);
    await tab.send("Input.dispatchMouseEvent", { type: "mousePressed", x: 400, y: 400, button: "left", clickCount: 1 });
    await tab.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: 400, y: 400, button: "left", clickCount: 1 });
    await sleep(800);
    check("7 · Chạm một lần: chỉ báo 'Âm thanh tắt' biến mất và được NHỚ trên thiết bị", !(await Q(`!!document.querySelector('[data-testid="call-sound-off"]')`)) && (await Q(`localStorage.getItem("smartfnb.callingDisplay.sound")`)) === "1");

    check("0 request ghi nào tới BE, không tạo mã ghép (khối display)", (tab.sentWrites ?? []).length === 0 && (tab.blockedWrites ?? []).length === 0, `${(tab.sentWrites ?? []).length}`);
    console.log(`   [tương phản] ${J(Object.fromEntries(Object.entries(ratios).map(([k, v]) => [k, +v.toFixed(2)])))}`);
  } catch (e) {
    console.log("ERROR", e.stack ?? e.message);
    check("display: script chạy hết không lỗi", false, e.message);
  }
  await closeTab(tab);
}

try {
  if (RUN("pairing")) await runPairing();
  if (RUN("board")) await runBoard();
  if (RUN("display")) await runDisplay();
} finally {
  console.log(`\n[real] thiết bị TEST-8.1 trong BE: ${J(testDevices())}`);
  console.log(`[real] màn gọi số đang hoạt động trong BE: ${J(activeCalling())}`);
}
const failed = results.filter((r) => !r.ok);
console.log(`\n[real] ${results.length - failed.length}/${results.length} đạt`);
process.exit(failed.length ? 1 : 0);
