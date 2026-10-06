// Mở Chrome headless với cổng CDP riêng, dùng profile tạm (không đụng Chrome của bạn).
//   node scripts/browser/chrome.mjs          # chạy và giữ tiến trình
// Đặt CHROME_PATH nếu Chrome không nằm ở chỗ mặc định; CDP_PORT mặc định 9333.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

const chrome = CANDIDATES.find((p) => existsSync(p));
if (!chrome) {
  console.error("Không tìm thấy Chrome. Đặt CHROME_PATH.");
  process.exit(1);
}

const port = process.env.CDP_PORT ?? "9333";
// Trên một số máy Chrome headless đôi khi sập ngay lúc khởi động (log: "Network service crashed", thoát mã -1; gặp ở 2026-10-06, khoảng
// một nửa số lần mở). Nên tự mở lại tới khi Chrome sống quá STABLE_MS; hết số lần thử thì mới thoát.
const MAX_ATTEMPTS = Number(process.env.CHROME_ATTEMPTS ?? 12);
const STABLE_MS = 6000;
let child = null;
let stopping = false;
function launch(attempt) {
  const profile = mkdtempSync(join(tmpdir(), "fnb-chrome-"));
  const startedAt = Date.now();
  child = spawn(
    chrome,
    // CHROME_ARGS: cờ thêm, cách nhau bằng dấu cách. Máy bị Chrome sập khởi động ổn định hơn với
    // CHROME_ARGS="--no-sandbox --disable-gpu-sandbox --disable-software-rasterizer" (chỉ dùng cho Chrome kiểm thử mở trang dev cục bộ).
    [`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--headless=${process.env.CHROME_HEADLESS ?? "new"}`, "--no-first-run", "--disable-gpu", "--window-size=1440,900", ...(process.env.CHROME_ARGS?.split(" ").filter(Boolean) ?? []), "about:blank"],
    { stdio: "ignore" },
  );
  console.log(`Chrome (pid ${child.pid}) đang nghe CDP ở cổng ${port} (lần mở ${attempt}). Ctrl+C để dừng.`);
  child.on("exit", (code) => {
    if (stopping) process.exit(0);
    if (Date.now() - startedAt < STABLE_MS && attempt < MAX_ATTEMPTS) {
      console.log(`Chrome sập khi khởi động (mã ${code}), mở lại…`);
      setTimeout(() => launch(attempt + 1), 500);
    } else {
      process.exit(0);
    }
  });
}
launch(1);
process.on("SIGINT", () => {
  stopping = true;
  child?.kill();
});
