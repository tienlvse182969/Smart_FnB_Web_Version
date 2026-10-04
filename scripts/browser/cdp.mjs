// Điều khiển Chrome qua CDP (không cần thêm thư viện; dùng WebSocket/fetch có sẵn của Node >= 22).
// Cấu hình bằng biến môi trường — xem README.md. Không viết cứng mật khẩu: lấy từ .env của BE (chỉ đọc).
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../..");

export const ORIGIN = process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 5173}`;
export const CDP_PORT = Number(process.env.CDP_PORT ?? 9333);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** POST được phép khi chặn ghi: chỉ phiên đăng nhập. */
export const SESSION_ALLOW = [/\/auth\/(login|refresh|logout)$/];

/**
 * Cờ dòng lệnh dùng chung cho các phaseN.mjs: `--mode=mock|real`, `--only=<khối>[,<khối>…]`; đối số trần đầu tiên vẫn được nhận
 * như cũ (`node phase5.mjs real`). Không cờ → chạy hết như trước. Tên khối nằm ở docs/BAN-GIAO.md (mục "Chạy kiểm trình duyệt").
 */
export function cli(argv = process.argv.slice(2)) {
  const flag = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const positional = argv.find((a) => !a.startsWith("--"));
  const only = flag("only");
  return { mode: flag("mode") ?? positional, only: only ? only.split(",").map((s) => s.trim()).filter(Boolean) : null, positional };
}

function readEnvFile(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter((l) => /^[A-Z_]+=/.test(l))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^["']|["']$/g, "")]),
  );
}

// .env của BE (chỉ đọc). Có thể trỏ chỗ khác bằng BE_ENV_PATH. Mật khẩu không bao giờ được in ra.
const BE_ENV = readEnvFile(process.env.BE_ENV_PATH ?? resolve(REPO, "../../BE_FnB/SmartFnBBackend/.env"));

// Mật khẩu tài khoản mock lấy từ chính mã nguồn mock, để không phải chép tay ở đây.
function mockPassword() {
  const file = resolve(REPO, "src/api/modules/auth/mock.ts");
  const m = existsSync(file) ? readFileSync(file, "utf8").match(/MOCK_PASSWORD\s*=\s*"([^"]+)"/) : null;
  return process.env.MOCK_PASSWORD ?? m?.[1];
}

/** Tài khoản theo chế độ auth: real (BE) hoặc mock (cờ VITE_API_AUTH=mock ở dev server). */
export function accounts(mode = process.env.AUTH_MODE ?? "real") {
  if (mode === "mock") {
    const pw = mockPassword();
    return {
      admin: ["admin@mock.local", pw],
      owner: ["owner.a@mock.local", pw],
      ownerB: ["owner.b@mock.local", pw],
      manager: ["manager.a@mock.local", pw],
    };
  }
  return {
    admin: [BE_ENV.SEED_ADMIN_EMAIL, BE_ENV.SEED_ADMIN_PASSWORD],
    owner: ["owner.demo@smartfnb.local", BE_ENV.SEED_DEMO_PASSWORD],
    manager: ["manager.demo@smartfnb.local", BE_ENV.SEED_DEMO_PASSWORD],
  };
}

class Tab {
  constructor(ws, id, authMode) {
    this.ws = ws;
    this.id = id;
    this.n = 0;
    this.pending = new Map();
    this.consoleLog = [];
    this.requests = [];
    this.accounts = accounts(authMode);
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.id && this.pending.has(m.id)) {
        this.pending.get(m.id)(m);
        this.pending.delete(m.id);
      } else if (m.method === "Runtime.consoleAPICalled") {
        this.consoleLog.push(m.params.args.map((a) => a.value ?? a.description ?? "").join(" "));
      } else if (m.method === "Network.requestWillBeSent") {
        this.requests.push({ url: m.params.request.url, method: m.params.request.method });
      } else if (m.method === "Fetch.requestPaused") {
        this.onRequestPaused(m.params);
      }
    };
  }
  /**
   * Chặn mọi request GHI (POST/PUT/PATCH/DELETE) ở tầng CDP, TRƯỚC khi rời trình duyệt (Fetch.failRequest), và ghi lại
   * method + đường dẫn + body đã định gửi vào `this.blockedWrites`. GET/HEAD/OPTIONS đi tiếp. `allow` = danh sách regex
   * đường dẫn cho phép riêng cho POST (ví dụ đăng nhập lấy token).
   */
  async blockWrites(allow = []) {
    this.blockedWrites = [];
    this.blockAllow = allow;
    await this.send("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] });
  }
  /**
   * Giả lập lỗi cho module real (5.8a), TÁCH khỏi blockWrites nhưng dùng chung hàng đợi Fetch (gọi blockWrites trước).
   * `fault = { kind: "500"|"403"|"network"|"401", match: RegExp, times?: number, refresh?: "fail" }`:
   *   - request ĐỌC (GET) có đường dẫn khớp `match` bị trả lỗi giả (Fetch.fulfillRequest) hoặc bị ngắt (network);
   *   - MỌI request ghi (trừ đăng nhập/làm mới/đăng xuất) cũng nhận lỗi giả và KHÔNG bao giờ tới BE (vẫn ghi vào blockedWrites);
   *   - `times` = chỉ giả lập N request đọc đầu rồi cho đi tiếp (ca 401: refresh thật chạy rồi request được gọi lại);
   *   - `refresh: "fail"` = POST /auth/refresh cũng trả 401 giả (ca hết phiên thật sự).
   * `this.faultLog` ghi lại từng request bị giả lập. `setFault(null)` tắt giả lập.
   */
  setFault(fault) {
    this.fault = fault ? { ...fault, hits: 0 } : null;
    this.faultLog = [];
  }
  fulfillFault(p, kind, fault) {
    if (kind === "network") {
      void this.send("Fetch.failRequest", { requestId: p.requestId, errorReason: "ConnectionRefused" });
      return;
    }
    const code = Number(kind);
    const bodies = {
      // 400: body do script truyền (`fault.body`), ví dụ body validate thật của BE: { statusCode: 400, message: ["name should not be empty"], error: "Bad Request" }
      400: fault?.body ?? { statusCode: 400, message: ["name should not be empty"], error: "Bad Request" },
      500: { statusCode: 500, message: "Internal server error" },
      403: { statusCode: 403, message: "You do not have permission to access this resource", error: "Forbidden" },
      401: { statusCode: 401, message: "Unauthorized" },
    };
    void this.send("Fetch.fulfillRequest", {
      requestId: p.requestId,
      responseCode: code,
      responseHeaders: [
        { name: "Content-Type", value: "application/json" },
        { name: "Access-Control-Allow-Origin", value: ORIGIN },
        { name: "Vary", value: "Origin" },
      ],
      body: Buffer.from(JSON.stringify(bodies[code])).toString("base64"),
    });
  }
  /** true nếu đã xử lý bằng lỗi giả (request không đi tiếp). */
  tryFault(p, method, path) {
    const f = this.fault;
    if (!f || method === "OPTIONS" || method === "HEAD") return false;
    // Chỉ giả lập lỗi cho API của BE; file của Vite (module, CSS…) phải đi bình thường nếu không trang sẽ trắng.
    if (!path.startsWith("/api/v1/")) return false;
    const isWrite = method !== "GET";
    if (/\/auth\/(login|refresh|logout)$/.test(path)) {
      if (method === "POST" && path.endsWith("/auth/refresh") && f.refresh === "fail") {
        this.faultLog.push({ method, path, kind: "401" });
        this.fulfillFault(p, "401");
        return true;
      }
      return false;
    }
    if (!isWrite && !f.match.test(path)) return false;
    if (!isWrite && f.times != null && f.hits >= f.times) return false;
    if (isWrite && f.times != null && f.hits >= f.times) return false; // sau lượt đầu: rơi về chặn như cũ (BlockedByClient)
    f.hits++;
    this.faultLog.push({ method, path, kind: f.kind });
    if (isWrite) {
      this.blockedWrites.push({ method, path, body: p.request.postData ?? null });
      this.logWrite(method, path);
    }
    this.fulfillFault(p, f.kind, f);
    return true;
  }
  onRequestPaused(p) {
    const { method, url, postData } = p.request;
    const path = (() => {
      try {
        const u = new URL(url);
        return u.pathname + u.search;
      } catch {
        return url;
      }
    })();
    if (this.tryFault(p, method, path)) return;
    const safe = ["GET", "HEAD", "OPTIONS"].includes(method) || (method === "POST" && this.blockAllow?.some((re) => re.test(path)));
    if (safe) {
      void this.send("Fetch.continueRequest", { requestId: p.requestId });
    } else {
      this.blockedWrites.push({ method, path, body: postData ?? null });
      this.logWrite(method, path);
      if (this.fulfillWrites) {
        // Chế độ "trả lời giả": request ghi VẪN KHÔNG rời trình duyệt (không tới BE); trình duyệt nhận 200 `{}` để luồng nhiều lệnh
        // (ví dụ đổi chỗ = 2 lệnh patch) chạy hết. Chỉ bật tạm cho đúng bước cần quan sát, rồi tắt.
        void this.send("Fetch.fulfillRequest", {
          requestId: p.requestId,
          responseCode: 200,
          responseHeaders: [
            { name: "Content-Type", value: "application/json" },
            { name: "Access-Control-Allow-Origin", value: "*" },
          ],
          body: Buffer.from("{}").toString("base64"),
        });
        return;
      }
      void this.send("Fetch.failRequest", { requestId: p.requestId, errorReason: "BlockedByClient" });
    }
  }
  /** Nhật ký TÍCH LUỸ mọi request ghi bị chặn (không bao giờ reset, khác `blockedWrites` mà script hay xoá); `caseName` do script đặt. */
  logWrite(method, path) {
    (this.writeLog ??= []).push({ method, path: path.split("?")[0], caseName: this.caseName ?? "" });
  }
  send(method, params = {}) {
    const id = ++this.n;
    return new Promise((res, rej) => {
      // Quá 45 giây không có phản hồi (trang đang điều hướng/treo) thì báo lỗi thay vì chờ mãi.
      const timer = setTimeout(() => {
        this.pending.delete(id);
        rej(new Error(`CDP timeout: ${method}`));
      }, 45000);
      this.pending.set(id, (m) => {
        clearTimeout(timer);
        res(m);
      });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expr) {
    const r = await this.send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) {
      throw new Error("eval error: " + JSON.stringify(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails));
    }
    return r.result?.result?.value;
  }
  async waitFor(expr, timeout = 15000, label = expr) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      try {
        if (await this.eval(`!!(${expr})`)) return true;
      } catch {
        // trang đang tải — thử lại
      }
      await sleep(250);
    }
    throw new Error("timeout waiting for: " + label);
  }
  async goto(path) {
    await this.send("Page.navigate", { url: ORIGIN + path });
    await sleep(300);
    await this.waitFor(`document.readyState === "complete"`, 15000, "load " + path);
    await sleep(500);
  }
  path() {
    return this.eval(`location.pathname`);
  }
  text() {
    return this.eval(`document.body.innerText`);
  }
  sidebar() {
    return this.eval(`[...document.querySelectorAll(".ant-layout-sider .ant-menu-item")].map(e => e.textContent.trim())`);
  }
  async clickMenu(label) {
    // Chờ mục menu xuất hiện (tối đa 15 giây) rồi mới bấm — không bấm ngay khi trang còn đang dựng.
    await this.waitFor(`[...document.querySelectorAll(".ant-layout-sider .ant-menu-item")].some(e => e.textContent.trim() === ${JSON.stringify(label)})`, 15000, `mục menu "${label}"`);
    await this.eval(`[...document.querySelectorAll(".ant-layout-sider .ant-menu-item")].find(e => e.textContent.trim() === ${JSON.stringify(label)}).click()`);
    await sleep(700);
  }
  /** Chờ phần tử khớp selector (và chứa `text` nếu có) xuất hiện và chưa bị khoá, rồi bấm. Hết hạn thì ném lỗi rõ ràng. */
  async clickWhen(selector, text = "", timeout = 10000) {
    const find = `[...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => (!${JSON.stringify(text)} || e.textContent.includes(${JSON.stringify(text)})) && !e.disabled)`;
    await this.waitFor(`${find}`, timeout, `phần tử ${selector}${text ? ` chứa "${text}"` : ""}`);
    await this.eval(`${find}.click()`);
  }
  /** Giá trị CSS variable trên <html>. */
  cssVar(name) {
    return this.eval(`getComputedStyle(document.documentElement).getPropertyValue(${JSON.stringify(name)}).trim()`);
  }
  /** Màu nền thật của thanh bên (sau khi trình duyệt tính). */
  siderBg() {
    return this.eval(`getComputedStyle(document.querySelector(".ant-layout-sider")).backgroundColor`);
  }
  async login(role) {
    const [email, pw] = this.accounts[role];
    await this.waitFor(`document.querySelector('input[placeholder="Email"]')`, 15000, "login form");
    await this.eval(`(() => {
      const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); };
      set(document.querySelector('input[placeholder="Email"]'), ${JSON.stringify(email)});
      set(document.querySelector('input[placeholder="Mật khẩu"]'), ${JSON.stringify(pw)});
      [...document.querySelectorAll("button")].find((b) => /đăng nhập/i.test(b.textContent)).click();
    })()`);
  }
  async logout() {
    await this.eval(`document.querySelector(".ant-avatar").click()`);
    await this.waitFor(`[...document.querySelectorAll(".ant-dropdown-menu-item")].some(e => /đăng xuất/i.test(e.textContent))`, 5000, "dropdown");
    await this.eval(`[...document.querySelectorAll(".ant-dropdown-menu-item")].find(e => /đăng xuất/i.test(e.textContent)).click()`);
  }
  async clearStorage() {
    await this.eval(`(localStorage.clear(), sessionStorage.clear(), true)`);
  }
  tokens() {
    return this.eval(`({ refresh: !!localStorage.getItem("smartfnb_refresh_token"), access: !!localStorage.getItem("smartfnb_access_token") })`);
  }
  /** Đặt một <select> do React điều khiển (panel mock). */
  async setSelect(testId, value) {
    await this.eval(`(() => {
      const el = document.querySelector('[data-testid="${testId}"]');
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);
    await sleep(900);
  }
  async setCheckbox(testId, checked) {
    const now = await this.eval(`document.querySelector('[data-testid="${testId}"]').checked`);
    if (now !== checked) await this.eval(`document.querySelector('[data-testid="${testId}"]').click()`);
    await sleep(900);
  }
  async openMockPanel() {
    const open = await this.eval(`!!document.querySelector('[data-testid="mock-profile"]')`);
    if (!open) await this.eval(`document.querySelector('[data-testid="mock-panel"] button').click()`);
    await sleep(200);
  }
  /** Chọn kịch bản mock qua panel dev: profile "A"|"B", tier ""|BASIC|STANDARD|ADVANCED, expired bool. */
  async scenario({ profile, tier = "", expired = false }) {
    await this.openMockPanel();
    await this.setSelect("mock-profile", profile);
    await this.setSelect("mock-tier", tier);
    await this.setCheckbox("mock-expired", expired);
  }
}

export async function newTab(url = "about:blank", authMode, opts = {}) {
  const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(url)}`, { method: "PUT" });
  const info = await r.json();
  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });
  const tab = new Tab(ws, info.id, authMode);
  await tab.send("Page.enable");
  await tab.send("Runtime.enable");
  await tab.send("Network.enable");
  // Khởi động nguội: mở trang đăng nhập một lần để Vite biên dịch xong trước khi script bắt đầu (tránh lần chạy đầu bị chậm/trượt).
  // `opts.warm = false` cho tab thứ hai của các kiểm tra đa tab (mở trang đăng nhập khi đang có phiên sẽ gọi /auth/refresh và làm lệch số đếm).
  try {
    if (opts.warm !== false) {
      await tab.send("Page.navigate", { url: ORIGIN + "/login" });
      await tab.waitFor(`!!document.querySelector('input[placeholder="Email"]')`, 90000, "Vite biên dịch xong (trang đăng nhập)");
    }
  } catch {
    // dev server chưa chạy hoặc trang không có form đăng nhập — để script tự báo lỗi ở bước của nó
  }
  // BLOCK_WRITES=1: chặn mọi request ghi ở tầng CDP cho CẢ script, rồi in số request bị chặn khi thoát. Chỉ cho qua đăng nhập,
  // làm mới và đăng xuất (phiên đăng nhập, không phải dữ liệu nghiệp vụ).
  if (process.env.BLOCK_WRITES === "1") {
    await tab.blockWrites(SESSION_ALLOW);
    process.on("exit", () => {
      const list = tab.blockedWrites ?? [];
      console.log(`[BLOCK_WRITES] ${list.length} request ghi bị chặn ở CDP`);
      for (const w of list) console.log(`   ${w.method} ${w.path.replace(/[0-9a-f-]{36}/g, "{id}")} ${w.body ?? ""}`.slice(0, 220));
    });
  }
  return tab;
}

/** Bảng tổng request ghi bị chặn: số lượng, mỗi dòng `METHOD đường dẫn` (id → {id}) kèm số lần và tên các ca. Chỉ in khi tab đã `blockWrites`. */
export function printBlockedWritesSummary(tab) {
  if (tab.blockAllow === undefined) return;
  const log = tab.writeLog ?? [];
  const rows = new Map();
  for (const w of log) {
    const key = `${w.method} ${w.path.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, "{id}")}`;
    const row = rows.get(key) ?? { n: 0, cases: new Set() };
    row.n++;
    if (w.caseName) row.cases.add(w.caseName);
    rows.set(key, row);
  }
  console.log(`\n[real] BẢNG REQUEST GHI BỊ CHẶN Ở CDP: ${log.length} request, ${rows.size} dòng khác nhau`);
  for (const [key, row] of rows) console.log(`   ${String(row.n).padStart(3)}×  ${key}${row.cases.size ? `   (${[...row.cases].join("; ")})` : ""}`);
}

export async function closeTab(tab) {
  printBlockedWritesSummary(tab);
  try {
    tab.ws.close();
    await fetch(`http://127.0.0.1:${CDP_PORT}/json/close/${tab.id}`);
  } catch {
    // đã đóng
  }
}

export const results = [];
export const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};
