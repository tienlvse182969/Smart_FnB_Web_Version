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
      }
    };
  }
  send(method, params = {}) {
    const id = ++this.n;
    return new Promise((res) => {
      this.pending.set(id, res);
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
    await this.eval(`[...document.querySelectorAll(".ant-layout-sider .ant-menu-item")].find(e => e.textContent.trim() === ${JSON.stringify(label)}).click()`);
    await sleep(700);
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

export async function newTab(url = "about:blank", authMode) {
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
  return tab;
}

export async function closeTab(tab) {
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
