// Kiểm trình duyệt thật cho lượt 7.9: áp phích màn hình phía khách (OW-11) và màn Manager trên điện thoại.
//   node scripts/browser/phase79.mjs --mode=real --only=posters   # Owner: trang áp phích, KHÔNG ghi (mọi POST/PATCH/DELETE chặn ở CDP)
//   node scripts/browser/phase79.mjs --mode=real --only=mobile    # Manager 390×844: bố cục, không ghi
// Dev server 5173 (real), BE local chạy `4b81e48` (migration display_posters), Chrome CDP 9333. KHÔNG tải ảnh thật lên BE.
// Báo cáo cuối in: bảng request ghi bị chặn và (nếu có) request ghi ĐÃ GỬI THẬT. Kỳ vọng sau Phần A: 0 request ghi thật.
import { check, cli, closeTab, newTab, results, sleep, SESSION_ALLOW } from "./cdp.mjs";
import { mkdirSync } from "node:fs";

const CLI = cli();
const BLOCKS = ["posters", "mobile"];
if (CLI.only && !CLI.only.every((n) => BLOCKS.includes(n))) {
  console.log(`--only hỗ trợ: ${BLOCKS.join(", ")} (nhận được: ${CLI.only.join(",")})`);
  process.exit(2);
}
const RUN = (n) => !CLI.only || CLI.only.includes(n);
const J = JSON.stringify;
// Mặc định KHÔNG chụp ảnh (chỉ kiểm DOM); đặt SHOT_DIR để bật chụp.
const SHOTS = process.env.SHOT_DIR ?? "";
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const tab = await newTab("about:blank", "real");
const q = (e) => tab.eval(e);
await tab.blockWrites(SESSION_ALLOW);
const tid = (id) => `document.querySelector('[data-testid=${J(id)}]')`;
const has = (id) => q(`!!${tid(id)}`);
const text = (id) => q(`${tid(id)}?.innerText ?? ""`);
const toasts = () => q(`[...document.querySelectorAll(".ant-message-notice, .ant-notification-notice")].map((e) => e.textContent).join(" | ")`);
const spaGo = async (to) => {
  await q(`(() => { history.pushState({}, "", ${J(to)}); dispatchEvent(new PopStateEvent("popstate")); })()`);
  await sleep(700);
};
const login = async (role, home) => {
  await tab.goto("/login");
  await tab.clearStorage();
  await tab.goto("/login");
  await tab.login(role);
  await tab.waitFor(`location.pathname.startsWith(${J(home)})`, 20000, `vào ${home}`);
  await tab.waitFor(`document.querySelector(".ant-layout-sider, .ant-layout-header")`, 15000, "shell");
  await sleep(900);
};
const shot = async (name) => {
  if (!SHOTS) return "";
  const r = await tab.send("Page.captureScreenshot", { format: "png" });
  const { writeFileSync } = await import("node:fs");
  writeFileSync(`${SHOTS}/${name}.png`, Buffer.from(r.result.data, "base64"));
  return `${SHOTS}/${name}.png`;
};
/** Đặt tệp vào <input type=file> bằng DataTransfer (không cần tệp trên đĩa) rồi bắn sự kiện change. */
const pickFile = (testId, { name, type, size, png = false }) =>
  q(`(() => {
    const input = ${tid(testId)};
    const bytes = new Uint8Array(${size});
    ${png ? "bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);" : ""}
    const dt = new DataTransfer();
    dt.items.add(new File([bytes], ${J(name)}, { type: ${J(type)} }));
    input.files = dt.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);

const pixel = (c) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="100%" height="100%" fill="${c}"/></svg>`)}`;
const FAKE = [
  { id: "00000000-0000-4000-8000-000000000001", chainId: "x", title: "Khuyến mãi tháng 10", imageUrl: pixel("#0f766e"), enabled: true, sortOrder: 0, durationSeconds: 8, createdAt: "2026-10-13T01:00:00.000Z", updatedAt: "2026-10-13T01:00:00.000Z", deletedAt: null },
  { id: "00000000-0000-4000-8000-000000000002", chainId: "x", title: "Món mới", imageUrl: pixel("#7c3aed"), enabled: true, sortOrder: 1, durationSeconds: 8, createdAt: "2026-10-13T01:01:00.000Z", updatedAt: "2026-10-13T01:01:00.000Z", deletedAt: null },
  { id: "00000000-0000-4000-8000-000000000003", chainId: "x", title: "Poster tắt", imageUrl: pixel("#be123c"), enabled: false, sortOrder: 2, durationSeconds: 8, createdAt: "2026-10-13T01:02:00.000Z", updatedAt: "2026-10-13T01:02:00.000Z", deletedAt: null },
];
const LIST = /\/api\/v1\/restaurant-chains\/[0-9a-f-]{36}\/display-posters$/;

// ── Khối posters ───────────────────────────────────────────────────────────────────────────────
async function runPosters() {
  await login("owner", "/owner");
  tab.caseName = "posters";

  // 1. Dữ liệu THẬT của BE (chưa có áp phích): trang mở được, GET đúng đường dẫn, trạng thái rỗng, xem trước ảnh mặc định.
  tab.requests.length = 0;
  await tab.clickMenu("Poster màn hình sau");
  await tab.waitFor(tid("posters-page"), 15000, "trang áp phích");
  await sleep(1200);
  const realGet = tab.requests.find((r) => r.method === "GET" && LIST.test(new URL(r.url).pathname));
  const beList = await q(`(async () => { const t = localStorage.getItem("smartfnb_access_token"); const me = await (await fetch("http://localhost:3100/api/v1/auth/me", { headers: { Authorization: "Bearer " + t } })).json(); return { chain: me.chainId ?? me.chainIds?.[0] ?? null }; })()`);
  const rows0 = await q(`document.querySelectorAll('[data-testid="poster-row"]').length`);
  check("posters · GET /restaurant-chains/{id}/display-posters thật (200), chưa có áp phích: trạng thái rỗng + xem trước ảnh mặc định", !!realGet && rows0 === 0 && (await has("posters-empty")) && /ảnh mặc định/.test(await text("poster-preview-state")), `${realGet?.url ?? "không có GET"} · chain ${beList.chain}`);
  check("posters · 0 toast lỗi khi tải", (await toasts()) === "", await toasts());
  await shot("owner-posters-empty");

  // 2. Trả lời giả (readOverride): 3 áp phích (2 bật).
  tab.readOverride = { match: LIST, body: J(FAKE) };
  await spaGo("/owner/dashboard");
  await tab.clickMenu("Poster màn hình sau");
  await tab.waitFor(`document.querySelectorAll('[data-testid="poster-row"]').length === 3`, 15000, "3 dòng áp phích");
  await sleep(500);
  const pos = await q(`[...document.querySelectorAll('[data-testid="poster-position"]')].map((e) => e.innerText)`);
  const states = await q(`[...document.querySelectorAll('[data-testid="poster-state"]')].map((e) => e.innerText)`);
  const titles = await q(`[...document.querySelectorAll('[data-testid="poster-title"]')].map((e) => e.value)`);
  check("posters · (trả lời giả) 3 dòng: vị trí 1–3, Đang bật/Đang bật/Đang tắt, tên đúng; ảnh thu nhỏ có nguồn", J(pos) === J(["Vị trí 1", "Vị trí 2", "Vị trí 3"]) && J(states) === J(["Đang bật", "Đang bật", "Đang tắt"]) && titles[0] === "Khuyến mãi tháng 10" && (await q(`[...document.querySelectorAll('[data-testid="poster-thumb"]')].every((i) => i.getAttribute("src"))`)), J({ pos, states, titles }));
  check("posters · Xem trước: 'Ảnh 1/2 · 8 giây mỗi ảnh' (chỉ ảnh bật), khung 16:9", /Ảnh 1\/2 · 8 giây/.test(await text("poster-preview-state")) && (await q(`(() => { const s = ${tid("poster-preview-slide")}.parentElement; const r = s.getBoundingClientRect(); return Math.abs(r.width / r.height - 16 / 9) < 0.05; })()`)));
  await shot("owner-posters-list");

  // 3. Kiểm tệp NGAY khi chọn: sai định dạng, quá 5 MB — không có request ghi.
  tab.blockedWrites.length = 0;
  await pickFile("poster-add-input", { name: "anh.gif", type: "image/gif", size: 2048 });
  await sleep(500);
  const tGif = await toasts();
  check("posters · Chọn GIF: báo ngay 'chỉ nhận PNG, JPG hoặc WebP' nêu tên tệp, KHÔNG có request ghi", /chỉ nhận PNG, JPG hoặc WebP/.test(tGif) && /anh\.gif/.test(tGif) && tab.blockedWrites.length === 0, tGif.slice(0, 160));
  await sleep(3200);
  await pickFile("poster-add-input", { name: "to.png", type: "image/png", size: 5 * 1024 * 1024 + 1, png: true });
  await sleep(500);
  const tBig = await toasts();
  check("posters · Chọn ảnh > 5 MB: báo ngay dung lượng và giới hạn, KHÔNG có request ghi", /vượt giới hạn 5 MB/.test(tBig) && tab.blockedWrites.length === 0, tBig.slice(0, 160));
  await sleep(3200);

  // 4. Tệp hợp lệ: POST multipart đúng DTO (field `file`), bị chặn ở CDP, KHÔNG tới BE.
  tab.blockedWrites.length = 0;
  await pickFile("poster-add-input", { name: "khuyen-mai.png", type: "image/png", size: 4096, png: true });
  await sleep(1500);
  const up = tab.blockedWrites.find((w) => w.method === "POST" && LIST.test(w.path));
  const multipart = /multipart\/form-data; boundary=/.test(up?.contentType ?? "");
  check("posters · Tải lên: POST …/display-posters multipart, field `file` (tên tệp + image/png), không trường nào khác", !!up && multipart && /name="file"/.test(up.body ?? "") && /filename="khuyen-mai\.png"/.test(up.body ?? "") && !/name="title"/.test(up.body ?? ""), `${up?.contentType ?? ""} · ${(up?.body ?? "").slice(0, 120).replace(/\s+/g, " ")}`);
  const tUp = await toasts();
  check("posters · Tải lên bị chặn: báo lỗi gọn bằng tiếng Việt, danh sách vẫn 3 dòng", /Mất kết nối|Không tải được áp phích|Không kết nối/.test(tUp) && (await q(`document.querySelectorAll('[data-testid="poster-row"]').length`)) === 3, tUp.slice(0, 140));
  await sleep(3200);

  // 5. Bật/tắt, đổi tên, đổi thứ tự (ghép 2 PATCH), xoá — đúng thân PATCH.
  tab.blockedWrites.length = 0;
  await q(`document.querySelectorAll('[data-testid="poster-toggle"]')[0].click()`);
  await sleep(900);
  const tg = tab.blockedWrites.find((w) => w.method === "PATCH");
  check("posters · Tắt áp phích 1: PATCH …/display-posters/{id} thân {enabled:false}", !!tg && tg.path.endsWith(`/display-posters/${FAKE[0].id}`) && J(JSON.parse(tg.body)) === J({ enabled: false }), tg?.body ?? "không có request");
  await sleep(3200);

  tab.blockedWrites.length = 0;
  await q(`(() => { const el = document.querySelectorAll('[data-testid="poster-title"]')[1]; el.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, "  Món mới 2  "); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new FocusEvent("focusout", { bubbles: true })); })()`);
  await sleep(900);
  const rn = tab.blockedWrites.find((w) => w.method === "PATCH");
  check("posters · Đổi tên rồi rời ô: PATCH thân {title} đã cắt khoảng trắng", !!rn && rn.path.endsWith(`/display-posters/${FAKE[1].id}`) && J(JSON.parse(rn.body)) === J({ title: "Món mới 2" }), rn?.body ?? "không có request");
  await sleep(3200);

  tab.blockedWrites.length = 0;
  tab.fulfillWrites = true;
  tab.fulfillBody = J({ ...FAKE[1] });
  await q(`document.querySelectorAll('[data-testid="poster-down"]')[0].click()`);
  await sleep(1500);
  tab.fulfillWrites = false;
  const mv = tab.blockedWrites.filter((w) => w.method === "PATCH").map((w) => ({ id: w.path.split("/").pop(), body: JSON.parse(w.body) }));
  check("posters · Xuống: 2 PATCH sortOrder tuần tự (áp phích 2 → 0, áp phích 1 → 1), không đụng áp phích khác", mv.length === 2 && mv[0].id === FAKE[1].id && J(mv[0].body) === J({ sortOrder: 0 }) && mv[1].id === FAKE[0].id && J(mv[1].body) === J({ sortOrder: 1 }), J(mv));
  await sleep(3200);

  tab.blockedWrites.length = 0;
  await q(`document.querySelectorAll('[data-testid="poster-delete"]')[2].click()`);
  await tab.waitFor(tid("confirm-poster-delete"), 6000, "hộp xác nhận xoá");
  check("posters · Xoá: có hộp xác nhận nêu không khôi phục được; chưa có request xoá", /không khôi phục được/.test(await text("confirm-poster-delete")) && tab.blockedWrites.length === 0);
  await q(`[...document.querySelectorAll(".ant-modal-confirm-btns button")].find((b) => /Xoá áp phích/.test(b.innerText)).click()`);
  await sleep(1000);
  const del = tab.blockedWrites.find((w) => w.method === "DELETE");
  check("posters · Xác nhận xoá: DELETE …/display-posters/{id} (chặn ở CDP)", !!del && del.path.endsWith(`/display-posters/${FAKE[2].id}`), del?.path ?? "không có request");
  await sleep(3200);

  // 6. Lỗi giả từ BE (setFault): 400 định dạng, 409 đủ số lượng, 403, 500 — câu tiếng Việt, không chữ Anh.
  const fault = async (spec) => {
    tab.setFault(spec);
    await pickFile("poster-add-input", { name: "ok.png", type: "image/png", size: 2048, png: true });
    await sleep(1400);
    const t = await toasts();
    tab.setFault(null);
    await sleep(3200);
    return t;
  };
  const t400 = await fault({ kind: "400", match: /^never$/, body: { statusCode: 400, message: "Poster must be a JPEG, PNG, or WebP image with a matching file signature", error: "Bad Request" } });
  check("posters · 400 sai chữ ký tệp: 'chỉ nhận PNG, JPG hoặc WebP, đúng định dạng thật', không chữ Anh", /chỉ nhận PNG, JPG hoặc WebP/.test(t400) && !/JPEG|signature/.test(t400), t400.slice(0, 160));
  const t409 = await fault({ kind: "409", match: /^never$/, body: { statusCode: 409, message: "A chain may have at most 10 posters; remove one before uploading", error: "Conflict" } });
  check("posters · 409 đủ số lượng: 'Đã đủ số áp phích tối đa…', không chữ Anh", /Đã đủ số áp phích tối đa/.test(t409) && !/chain may/.test(t409), t409.slice(0, 160));
  const t403 = await fault({ kind: "403", match: /^never$/ });
  check("posters · 403: 'không đủ quyền', không chữ Anh", /không đủ quyền/i.test(t403) && !/permission/i.test(t403), t403.slice(0, 160));
  const t500 = await fault({ kind: "500", match: /^never$/ });
  check("posters · 500: 'Máy chủ đang gặp sự cố…'", /Máy chủ đang gặp sự cố/.test(t500), t500.slice(0, 160));

  // 7. Chế độ chỉ đọc (gói hết hạn, trả lời giả): mọi nút ghi khoá; xem trước vẫn chạy.
  const real = await q(`(async () => { const t = localStorage.getItem("smartfnb_access_token"); const r = await fetch("http://localhost:3100/api/v1/restaurant-chains", { headers: { Authorization: "Bearer " + t } }); return r.json(); })()`);
  const chains = Array.isArray(real) ? real : (real.data ?? []);
  tab.readOverride = [
    { match: LIST, body: J(FAKE) },
    { match: /\/api\/v1\/restaurant-chains$/, body: J(chains.map((c) => ({ ...c, subscription: { ...(c.subscription ?? {}), status: "EXPIRED", expiresAt: "2020-01-01T00:00:00.000Z" } }))) },
  ];
  await tab.goto("/owner/posters");
  await tab.waitFor(`document.querySelectorAll('[data-testid="poster-row"]').length === 3`, 20000, "áp phích sau F5 (hết hạn)");
  await sleep(900);
  const guarded = await q(`[...document.querySelectorAll('[data-testid="poster-add"],[data-testid="poster-up"],[data-testid="poster-down"],[data-testid="poster-replace"],[data-testid="poster-delete"],[data-testid="poster-title"]')].every((e) => e.disabled)`);
  const swOff = await q(`[...document.querySelectorAll('[data-testid="poster-toggle"]')].every((e) => e.disabled || e.classList.contains("ant-switch-disabled"))`);
  check("posters · (gói hết hạn, trả lời giả) chỉ đọc: Thêm, Lên, Xuống, Đổi ảnh, Xoá, ô tên và công tắc đều khoá; có dải chỉ đọc; xem trước còn chạy", guarded && swOff && (await has("read-only-banner")) && (await has("poster-preview")), J({ guarded, swOff }));
  await shot("owner-posters-readonly");
  tab.readOverride = null;
  await spaGo("/owner/dashboard");
}

// ── Khối mobile ────────────────────────────────────────────────────────────────────────────────
async function runMobile() {
  await tab.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await tab.send("Emulation.setTouchEmulationEnabled", { enabled: true });
  await login("manager", "/manager");
  tab.caseName = "mobile";
  const metrics = () =>
    q(`(() => {
      const de = document.documentElement;
      const wide = [...document.querySelectorAll("body *")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 1 && !e.closest(".ant-table-content, .ant-table-body, .ant-tabs-nav, [style*='overflow']"); }).slice(0, 4).map((e) => e.tagName + "." + String(e.className).slice(0, 40));
      const small = [...document.querySelectorAll("button, a.ant-btn, .ant-switch, input[type=checkbox]")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 40 || r.width < 40) && getComputedStyle(e).visibility !== "hidden"; }).length;
      const smallList = [...document.querySelectorAll("button, a.ant-btn, .ant-switch, input[type=checkbox]")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 40 || r.width < 40); }).slice(0, 12).map((e) => { const r = e.getBoundingClientRect(); return (e.getAttribute("data-testid") || e.getAttribute("aria-label") || e.innerText || e.className).toString().replace(/\\s+/g, " ").slice(0, 28) + " " + Math.round(r.width) + "x" + Math.round(r.height); });
      return { scrollW: de.scrollWidth, clientW: de.clientWidth, overflowX: de.scrollWidth > de.clientWidth + 1, wide, smallTargets: small, smallList, bodyScrollW: document.body.scrollWidth };
    })()`);
  const report = [];
  const visit = async (label, path, wait) => {
    await spaGo(path);
    if (wait) await tab.waitFor(wait, 20000, label).catch(() => undefined);
    await sleep(1200);
    const m = await metrics();
    report.push({ label, path, ...m });
    await shot(`mobile-${label}`);
    check(`mobile · ${label}: không cuộn ngang trang (scrollWidth ${m.scrollW} ≤ ${m.clientW})`, !m.overflowX, J({ wide: m.wide }));
    return m;
  };
  await visit("dashboard", "/manager/dashboard", `document.querySelector('[data-testid="report-kpi-revenue"], .ant-layout-content')`);
  await visit("tra-cuu-don", "/manager/orders", `document.querySelector('.ant-table-tbody tr.ant-table-row')`);
  const firstOrder = await q(`document.querySelector('.ant-table-tbody tr.ant-table-row')?.getAttribute("data-row-key") ?? ""`);
  if (firstOrder) await visit("chi-tiet-don", `/manager/orders/${firstOrder}`, tid("order-detail"));
  await visit("can-xu-ly", "/manager/orders/needs-attention", `${tid("attention-page")}`);
  await visit("nhan-vien", "/manager/staff", `${tid("staff-quota")}`);
  await visit("quay-thiet-bi", "/manager/stations", `${tid("calling-display-section")}`);

  // Dải gói sắp hết hạn (trả lời giả, chỉ GET).
  const me = await q(`(async () => { const t = localStorage.getItem("smartfnb_access_token"); const r = await fetch("http://localhost:3100/api/v1/auth/me", { headers: { Authorization: "Bearer " + t } }); return r.json(); })()`);
  const chainId = me.chainId ?? me.chain?.id;
  const sub = await q(`(async () => { const t = localStorage.getItem("smartfnb_access_token"); const r = await fetch("http://localhost:3100/api/v1/restaurant-chains/${chainId}/subscription", { headers: { Authorization: "Bearer " + t } }); return r.json(); })()`);
  tab.readOverride = { match: /\/restaurant-chains\/[0-9a-f-]{36}\/subscription$/, body: J({ subscription: { ...sub.subscription, status: "ACTIVE", expiresAt: new Date(Date.now() + 3 * 86_400_000 + 3_600_000).toISOString() } }) };
  await tab.goto("/manager/dashboard");
  await sleep(1800);
  const banner = await q(`(() => { const e = ${tid("expiring-banner")}; if (!e) return null; const r = e.getBoundingClientRect(); return { text: e.innerText.replace(/\\s+/g, " "), right: r.right, w: innerWidth }; })()`);
  check("mobile · Dải gói sắp hết hạn hiện đủ trong màn hình (không tràn phải)", !!banner && banner.right <= banner.w + 1 && /còn [34] ngày/.test(banner.text), J(banner));
  await shot("mobile-dai-sap-het-han");
  tab.readOverride = null;

  // Báo cáo số đo từng màn để đọc nhanh.
  console.log("\n[mobile] SỐ ĐO THEO MÀN (390×844):");
  for (const r of report) console.log(`   ${r.label.padEnd(16)} scrollW=${r.scrollW}/${r.clientW} ngang=${r.overflowX} nútNhỏ(<40px)=${r.smallTargets} phầnTửTràn=${J(r.wide)}\n       nútNhỏ: ${J(r.smallList)}`);
  if (SHOTS) console.log(`[mobile] ảnh chụp: ${SHOTS}`);
}

try {
  if (RUN("posters")) await runPosters();
  if (RUN("mobile")) await runMobile();
} catch (e) {
  console.log("ERROR", e.stack ?? e.message);
  check("script chạy hết không lỗi", false, String(e.message ?? e));
}
console.log(`\n[real] ${results.filter((r) => r.ok).length}/${results.length} đạt`);
await closeTab(tab);
process.exit(results.every((r) => r.ok) ? 0 : 1);
