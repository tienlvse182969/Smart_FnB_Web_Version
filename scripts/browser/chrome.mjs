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
const profile = mkdtempSync(join(tmpdir(), "fnb-chrome-"));
const child = spawn(
  chrome,
  [`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--headless=new", "--no-first-run", "--disable-gpu", "--window-size=1440,900", "about:blank"],
  { stdio: "ignore" },
);
console.log(`Chrome (pid ${child.pid}) đang nghe CDP ở cổng ${port}. Ctrl+C để dừng.`);
child.on("exit", () => process.exit(0));
process.on("SIGINT", () => child.kill());
