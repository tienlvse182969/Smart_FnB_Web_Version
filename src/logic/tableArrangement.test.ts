/**
 * Unit test nhỏ cho thuật toán xếp/ghép bàn (đặc tả v7 mục 8, BR-24/BR-25).
 * Không phụ thuộc test-runner: chạy trực tiếp bằng `npx tsx src/logic/tableArrangement.test.ts`.
 * Các ca: (1) vừa đúng 1 bàn, (2) phải ghép 2 bàn, (2b) 1 bàn đang occupied,
 * (3) không đủ chỗ, (4) ràng buộc cùng khu vực & liên thông.
 */

import type { FloorTable, TableSession } from "../types";
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

const BR = "BR-Q1";

/* Sơ đồ test: cụm A1–A2–A3 liền kề (Trong nhà); B1 đứng riêng (Sân vườn). */
function makeTables(): FloorTable[] {
  return [
    { id: "A1", branchId: BR, area: "Trong nhà", seats: 2, status: "available", currentSessionId: null, adjacentTableIds: ["A2"] },
    { id: "A2", branchId: BR, area: "Trong nhà", seats: 4, status: "available", currentSessionId: null, adjacentTableIds: ["A1", "A3"] },
    { id: "A3", branchId: BR, area: "Trong nhà", seats: 4, status: "available", currentSessionId: null, adjacentTableIds: ["A2"] },
    { id: "B1", branchId: BR, area: "Sân vườn", seats: 6, status: "available", currentSessionId: null, adjacentTableIds: [] },
  ];
}
const noSessions: TableSession[] = [];

console.log("Ca 1 — 2 khách: vừa đúng 1 bàn nhỏ");
{
  const tables = makeTables();
  const r = suggestArrangements(2, tables);
  assert(r.length > 0, "có ít nhất 1 phương án");
  assert(r[0].tableIds.length === 1, "phương án tốt nhất chỉ dùng 1 bàn");
  assert(r[0].tableIds[0] === "A1", "chọn A1 (2 ghế) — ít ghế thừa nhất & bảo toàn bàn lớn");
  assert(r[0].wastedSeats === 0, "0 ghế thừa");
}

console.log("Ca 2 — 6 khách: phải ghép 2 bàn liền kề");
{
  const tables = makeTables();
  const r = suggestArrangements(6, tables);
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

console.log("Ca 2b — 6 khách nhưng B1 đang occupied: buộc ghép A2 + A3");
{
  const tables = makeTables();
  const b1 = tables.find((t) => t.id === "B1")!;
  b1.status = "occupied";
  b1.currentSessionId = "S1";
  const r = suggestArrangements(6, tables);
  // A1+A2 = 6 ghế (thừa 0) tốt hơn A2+A3 = 8 ghế (thừa 2); B1 bị loại vì occupied.
  assert(r[0].tableIds.join("+") === "A1+A2", "ghép A1 + A2 (6 ghế, thừa 0) là tốt nhất còn lại");
  assert(r[0].tableCount === 2, "dùng 2 bàn");
  assert(!r.some((s) => s.tableIds.includes("B1")), "B1 (occupied) không xuất hiện trong bất kỳ phương án nào");
}

console.log("Ca 3 — 20 khách: không đủ chỗ");
{
  const tables = makeTables();
  const r = suggestArrangements(20, tables);
  assert(r.length === 0, "không có phương án nào (tổng ghế < số khách)");
  const est = estimateNextAvailable(20, noSessions, tables, () => 0);
  assert(est === null, "ước tính trả null vì kể cả trống hết cũng không đủ 20 chỗ");
}

console.log("Ca 4 — ràng buộc cùng khu vực & liên thông");
{
  const tables = makeTables();
  // 8 khách: A2+A3=8 (thừa 0) nên phải là phương án đầu; không được nối B1 xuyên khu.
  const r = suggestArrangements(8, tables);
  assert(r[0].tableIds.join("+") === "A2+A3", "A2 + A3 = 8 ghế, thừa 0");
  assert(
    r.every((s) => new Set(s.tableIds.map((id) => tables.find((t) => t.id === id)!.area)).size === 1),
    "mọi phương án chỉ gồm bàn CÙNG một khu vực",
  );
}

console.log("Ca 5 — estimateNextAvailable: bàn đang 'serving' vẫn tính là chiếm chỗ");
{
  const tables = makeTables();
  const busy: TableSession[] = [
    { id: "S1", tenantId: "T1", branchId: BR, tableIds: ["B1"], guests: 4, openedBy: "x", openedAt: new Date().toISOString(), status: "serving" },
  ];
  const est = estimateNextAvailable(6, busy, tables, () => 10);
  assert(est !== null && est.freeingTables.includes("B1"), "phiên 'serving' (không phải chỉ 'open') vẫn được tính vào ước tính trống bàn");
}

console.log(`\nKẾT QUẢ: ${passed} pass, ${failed} fail`);
if (failed > 0) process.exit(1);
