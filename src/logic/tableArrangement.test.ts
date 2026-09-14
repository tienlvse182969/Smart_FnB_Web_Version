/**
 * Unit test nhỏ cho thuật toán xếp/ghép bàn (Bước 5).
 * Không phụ thuộc test-runner: chạy trực tiếp bằng `npx tsx src/logic/tableArrangement.test.ts`.
 * Ba ca theo yêu cầu: (1) vừa đúng 1 bàn, (2) phải ghép 2 bàn, (3) không đủ chỗ.
 */

import type { FloorTable, TableSession } from "../data";
import { estimateNextAvailable, suggestArrangements } from "./tableArrangement";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) {
    passed++;
    console.log("  ✓", msg);
  } else {
    failed++;
    console.error("  ✗", msg);
  }
}

/* Sơ đồ test: cụm A1–A2–A3 liền kề (Trong nhà); B1 đứng riêng (Sân vườn). */
const tables: FloorTable[] = [
  { id: "A1", area: "Trong nhà", seats: 2, state: "available", adjacentTableIds: ["A2"] },
  { id: "A2", area: "Trong nhà", seats: 4, state: "available", adjacentTableIds: ["A1", "A3"] },
  { id: "A3", area: "Trong nhà", seats: 4, state: "available", adjacentTableIds: ["A2"] },
  { id: "B1", area: "Sân vườn", seats: 6, state: "available", adjacentTableIds: [] },
];
const noSessions: TableSession[] = [];

console.log("Ca 1 — 2 khách: vừa đúng 1 bàn nhỏ");
{
  const r = suggestArrangements("BR-Q1", 2, noSessions, tables);
  assert(r.length > 0, "có ít nhất 1 phương án");
  assert(r[0].tableIds.length === 1, "phương án tốt nhất chỉ dùng 1 bàn");
  assert(r[0].tableIds[0] === "A1", "chọn A1 (2 ghế) — ít ghế thừa nhất & bảo toàn bàn lớn");
  assert(r[0].wastedSeats === 0, "0 ghế thừa");
}

console.log("Ca 2 — 6 khách: phải ghép 2 bàn liền kề");
{
  const r = suggestArrangements("BR-Q1", 6, noSessions, tables);
  const best = r[0];
  // A2+A3 = 8 ghế (thừa 2, 2 bàn) vs B1 = 6 ghế (thừa 0, 1 bàn) -> B1 thắng.
  assert(best.tableIds.length === 1 && best.tableIds[0] === "B1", "B1 (6 ghế, thừa 0) thắng");
  const merged = r.find((s) => s.tableIds.length === 2);
  assert(!!merged, "vẫn liệt kê được phương án GHÉP 2 bàn liền kề");
  assert(
    !!merged && merged.tableIds.every((id) => ["A1", "A2", "A3"].includes(id)),
    "khối ghép nằm trong cùng khu vực & liên thông",
  );
}

console.log("Ca 2b — 6 khách nhưng B1 đã có khách: buộc ghép A2 + A3");
{
  const busy: TableSession[] = [
    { id: "S1", branchId: "BR-Q1", tableIds: ["B1"], guests: 4, openedBy: "x", openedAt: "12:00", status: "open" },
  ];
  const r = suggestArrangements("BR-Q1", 6, busy, tables);
  // A1+A2 = 6 ghế (thừa 0) tốt hơn A2+A3 = 8 ghế (thừa 2).
  assert(r[0].tableIds.join("+") === "A1+A2", "ghép A1 + A2 (6 ghế, thừa 0) là tốt nhất còn lại");
  assert(r[0].tableCount === 2, "dùng 2 bàn");
}

console.log("Ca 3 — 20 khách: không đủ chỗ");
{
  const r = suggestArrangements("BR-Q1", 20, noSessions, tables);
  assert(r.length === 0, "không có phương án nào (tổng ghế < số khách)");
  const est = estimateNextAvailable("BR-Q1", 20, noSessions, tables, () => 0);
  assert(est === null, "ước tính trả null vì kể cả trống hết cũng không đủ 20 chỗ");
}

console.log("Ca 4 — ràng buộc cùng khu vực & liên thông");
{
  // 8 khách: A2+A3=8 (thừa 0) nên phải là phương án đầu; không được nối B1 xuyên khu.
  const r = suggestArrangements("BR-Q1", 8, noSessions, tables);
  assert(r[0].tableIds.join("+") === "A2+A3", "A2 + A3 = 8 ghế, thừa 0");
  assert(
    r.every((s) => new Set(s.tableIds.map((id) => tables.find((t) => t.id === id)!.area)).size === 1),
    "mọi phương án chỉ gồm bàn CÙNG một khu vực",
  );
}

console.log(`\nKẾT QUẢ: ${passed} pass, ${failed} fail`);
if (failed > 0) process.exit(1);
