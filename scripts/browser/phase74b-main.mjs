// Kiểm nhanh phần mã của `main` vừa gộp (lượt 7.4b), KHÔNG kiểm nghiệp vụ mới — chỉ "mở được, không lỗi JS, route ẩn ra đúng":
//   node scripts/browser/phase74b-main.mjs        # dev server 5173 cờ mặc định (real), BE local chạy; MỌI request ghi bị chặn ở CDP
// Ca: /display/call (màn gọi số, GĐ8) mở được; Owner "Giờ & khu vực" (BranchOperations) mở được và nạp chi tiết bằng GET;
// /t/:token và /display/customer (cờ tắt, quyết định 91–92) ra như route lạ.
import { check, closeTab, newTab, results, sleep, SESSION_ALLOW } from "./cdp.mjs";

const J = JSON.stringify;
const tab = await newTab("about:blank", "real");
const q = (expr) => tab.eval(expr);
await tab.blockWrites(SESSION_ALLOW);

// Gom lỗi JS chưa bắt và console.error của trang, kể cả sau mỗi lần điều hướng.
await tab.send("Page.addScriptToEvaluateOnNewDocument", {
  source: `window.__errs = []; window.addEventListener("error", (e) => window.__errs.push("error: " + e.message));
    window.addEventListener("unhandledrejection", (e) => window.__errs.push("rejection: " + (e.reason?.message ?? e.reason)));
    const ce = console.error; console.error = (...a) => { window.__errs.push("console.error: " + a.map(String).join(" ").slice(0, 200)); ce.apply(console, a); };`,
});
const errs = () => q(`(window.__errs ?? []).filter((m) => !/Failed to load resource|ERR_BLOCKED|net::|ResizeObserver|Download the React DevTools/.test(m))`);

try {
  // 1. Màn gọi số: công khai, không đăng nhập. Cần ghép thiết bị (mã ghép từ POST /device-pairing/codes) — request ghi nên bị CDP chặn.
  await tab.goto("/display/call");
  await sleep(2500);
  const callText = (await q(`document.body.innerText`)).replace(/\s+/g, " ");
  check("/display/call mở được (màn ghép nối, không trang trắng, không sidebar/đăng nhập)", callText.length > 20 && !/Đăng nhập/.test(callText) && (await q(`!document.querySelector(".ant-layout-sider")`)), callText.slice(0, 160));
  const callErrs = await errs();
  check("/display/call: không lỗi JS chưa bắt (POST ghép nối bị CDP chặn nên chỉ hiện câu lỗi trong trang)", callErrs.filter((m) => !/^console\.error: .*(Không thể|Failed)/.test(m)).length === 0, J(callErrs).slice(0, 200));
  console.log(`   [ghi chú] /display/call: tự gọi POST /device-pairing/codes (deviceType CALLING_DISPLAY) để lấy mã 5 phút, rồi Manager/Cashier nhập mã ở app ghép; khi ghép xong dùng device token cho GET /public/calling-display/context và socket /operations. Kiểm thật cần thiết bị ghép.`);

  // 2. Cờ tắt: route ẩn ra như route lạ.
  await tab.goto("/t/abc123token");
  await sleep(900);
  const tPath = await q(`location.pathname`);
  check("/t/:token (cờ tắt): về trang chủ như route lạ, không màn theo dõi đơn", tPath === "/" && !/Theo dõi đơn|Đơn của bạn/.test(await q(`document.body.innerText`)), tPath);
  await tab.goto("/display/customer");
  await sleep(900);
  const cPath = await q(`location.pathname`);
  check("/display/customer (cờ tắt): về /display/call như route con lạ, không màn hình khách bản web", cPath === "/display/call", cPath);
  await tab.goto("/khong-co-gi-ca");
  await sleep(700);
  check("Đối chứng: route lạ khác cũng về trang chủ", (await q(`location.pathname`)) === "/");

  // 3. Owner: Giờ & khu vực (BranchOperations) — mở ngăn kéo, nạp chi tiết bằng GET (không bấm Lưu/Xoá/Thêm).
  await tab.goto("/login");
  await tab.clearStorage();
  await tab.goto("/login");
  await tab.login("owner");
  await tab.waitFor(`location.pathname.startsWith("/owner")`, 20000, "vào /owner");
  await tab.waitFor(`document.querySelector(".ant-layout-sider")`, 15000, "shell owner");
  await sleep(800);
  await q(`(() => { history.pushState({}, "", "/owner/branches"); dispatchEvent(new PopStateEvent("popstate")); })()`);
  await sleep(1200);
  tab.requests.length = 0;
  tab.blockedWrites.length = 0; // bỏ 2 POST ghép nối của bước /display/call (đã ghi ở trên)
  await q(`window.__errs = []`);
  const opened = await q(`(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes("Giờ & khu vực") && !x.disabled); if (!b) return false; b.click(); return true; })()`);
  await tab.waitFor(`document.querySelector(".ant-drawer") && /Giờ hoạt động/.test(document.querySelector(".ant-drawer").innerText)`, 15000, "ngăn kéo Giờ & khu vực nạp xong").catch(() => undefined);
  const drawerText = (await q(`document.querySelector(".ant-drawer")?.innerText ?? ""`)).replace(/\s+/g, " ");
  check("Owner · 'Giờ & khu vực' mở ngăn kéo, có tab Giờ hoạt động / Ngày đặc biệt / Khu vực / Lưu trữ, đủ 7 ngày", opened && /Giờ hoạt động/.test(drawerText) && /Ngày đặc biệt/.test(drawerText) && /Khu vực/.test(drawerText) && /Lưu trữ/.test(drawerText) && /Chủ nhật/.test(drawerText) && /Thứ bảy/.test(drawerText), drawerText.slice(0, 160));
  const gets = tab.requests.filter((r) => r.method === "GET" && /\/branches\/[0-9a-f-]{36}$/.test(new URL(r.url).pathname)).length;
  check("Owner · Ngăn kéo nạp chi tiết chi nhánh bằng GET /branches/:id", gets >= 1, `${gets} request`);
  // Cảnh báo "deprecated" của antd (Drawer `width`, Spin `tip`) là mã của main, ghi vào bảng "cần nhóm xem"; chỉ lỗi thật mới tính.
  const real = (await errs()).filter((m) => !/is deprecated/.test(m));
  check("Owner · Không lỗi JS khi mở BranchOperations; không request ghi nào phát sinh", real.length === 0 && tab.blockedWrites.length === 0, `${J(await errs()).slice(0, 200)} · ghi ${tab.blockedWrites.length}`);
} catch (e) {
  console.log("ERROR", e.stack ?? e.message);
  check("script chạy hết không lỗi", false, e.message);
}

await closeTab(tab);
const failed = results.filter((r) => !r.ok);
console.log(`\n[real] ${results.length - failed.length}/${results.length} đạt`);
process.exit(failed.length ? 1 : 0);
