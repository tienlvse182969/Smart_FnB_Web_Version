/**
 * ============================================================================
 * THUẬT TOÁN XẾP VÀ GHÉP BÀN  (Bước 5 — phần lõi thuật toán của đồ án)
 * ============================================================================
 *
 * Bài toán: một nhóm `guestCount` khách vừa tới. Trong các bàn đang trống của
 * chi nhánh, chọn ra tối đa 3 phương án xếp chỗ tốt nhất — mỗi phương án là
 * MỘT bàn đơn hoặc MỘT KHỐI bàn ghép liền kề.
 *
 * Vì sao cần thuật toán mà không để waiter tự nhìn: waiter chỉ tối ưu cục bộ
 * ("bàn nào gần đây trống"); thuật toán nhìn cả sơ đồ cùng lúc nên biết
 * BẢO TOÀN BÀN LỚN cho nhóm đông sắp tới — đây là chỗ máy thắng người.
 *
 * Sơ đồ thực tế chỉ 10–30 bàn nên KHÔNG cần thuật toán tinh vi; điểm mấu chốt
 * là CẮT TỈA (pruning) sớm để không nổ tổ hợp khi duyệt các khối liên thông.
 */

import type { FloorTable, TableSession } from "../data";

export type Suggestion = {
  tableIds: string[];
  totalSeats: number;
  wastedSeats: number; // totalSeats - guestCount
  tableCount: number;
  score: number; // càng THẤP càng tốt
  label: string; // "Bàn A1" hoặc "Ghép A1 + A2"
};

/* -------------------------------------------------------------------------- */
/* Bước phụ: xác định bàn khả dụng                                            */
/* -------------------------------------------------------------------------- */

/** Bàn đang bị CHIẾM khi có phiên "open" hoặc "paid" (khách còn ngồi). */
function occupiedTableIds(branchId: string, sessions: TableSession[]): Set<string> {
  const occ = new Set<string>();
  for (const s of sessions) {
    if (s.branchId !== branchId) continue;
    if (s.status === "open" || s.status === "paid") {
      for (const id of s.tableIds) occ.add(id);
    }
  }
  return occ;
}

/**
 * Bàn khả dụng: state gốc = "available" (loại "locked" bàn hỏng và "reserved"
 * bàn đã đặt) VÀ không nằm trong phiên đang chiếm.
 */
function availableTables(
  branchId: string,
  sessions: TableSession[],
  tables: FloorTable[],
): FloorTable[] {
  const occ = occupiedTableIds(branchId, sessions);
  return tables.filter((t) => t.state === "available" && !occ.has(t.id));
}

/* -------------------------------------------------------------------------- */
/* Bước phụ: chấm điểm một khối bàn                                           */
/* -------------------------------------------------------------------------- */

/**
 * Điểm tổng hợp theo 3 tiêu chí, xếp theo thứ tự ưu tiên (từ điển hoá thành
 * một số duy nhất — càng nhỏ càng tốt):
 *   1) ÍT GHẾ THỪA NHẤT   (wastedSeats)          — quan trọng nhất
 *   2) ÍT BÀN NHẤT        (tableCount)
 *   3) BẢO TOÀN BÀN LỚN   (maxSeat của khối)     — ưu tiên dùng bàn nhỏ,
 *      để dành bàn lớn cho nhóm đông tới sau.
 *
 * Nhân hệ số đủ lớn để tiêu chí trước luôn "áp đảo" tiêu chí sau, nên thứ tự
 * ưu tiên được bảo toàn tuyệt đối chứ không phải cộng gộp mờ nhạt.
 */
function scoreBlock(tables: FloorTable[], guestCount: number): number {
  const totalSeats = tables.reduce((s, t) => s + t.seats, 0);
  const wasted = totalSeats - guestCount;
  const count = tables.length;
  const maxSeat = tables.reduce((m, t) => Math.max(m, t.seats), 0);
  return wasted * 10_000 + count * 100 + maxSeat;
}

function labelOf(tableIds: string[]): string {
  return tableIds.length === 1 ? `Bàn ${tableIds[0]}` : `Ghép ${tableIds.join(" + ")}`;
}

/* -------------------------------------------------------------------------- */
/* HÀM CHÍNH                                                                  */
/* -------------------------------------------------------------------------- */

export function suggestArrangements(
  branchId: string,
  guestCount: number,
  sessions: TableSession[],
  tables: FloorTable[],
): Suggestion[] {
  if (guestCount <= 0) return [];

  // 1) Lọc bàn khả dụng.
  const avail = availableTables(branchId, sessions, tables);
  const byId = new Map(avail.map((t) => [t.id, t]));

  // 2) Dựng đồ thị liền kề TRONG TỪNG KHU VỰC: chỉ giữ cạnh nối hai bàn cùng
  //    khả dụng, cùng khu vực và đã khai báo liền kề tay. (adjacentTableIds là
  //    quan hệ đối xứng — ràng buộc "cùng khu vực" chặn ghép xuyên khu.)
  const adj = new Map<string, string[]>();
  for (const t of avail) {
    const neighbors = t.adjacentTableIds.filter((n) => {
      const nb = byId.get(n);
      return nb && nb.area === t.area;
    });
    adj.set(t.id, neighbors);
  }

  // 3) Duyệt các KHỐI LIÊN THÔNG, cắt tỉa ngay khi đủ ghế.
  //    seen dùng khoá là tập bàn đã sắp xếp để mỗi khối chỉ xét một lần.
  const seen = new Set<string>();
  const blocks: FloorTable[][] = [];

  const grow = (block: string[]) => {
    const key = [...block].sort().join(",");
    if (seen.has(key)) return;
    seen.add(key);

    const seats = block.reduce((s, id) => s + byId.get(id)!.seats, 0);

    // Cắt tỉa: khối này đã đủ ghế -> đây là một ứng viên, KHÔNG mở rộng thêm
    // (mở rộng chỉ làm thừa ghế và thừa bàn, luôn tệ hơn theo tiêu chí).
    if (seats >= guestCount) {
      blocks.push(block.map((id) => byId.get(id)!));
      return;
    }

    // Chưa đủ: mở rộng khối bằng các bàn liền kề với bất kỳ thành viên nào
    // (giữ tính LIÊN THÔNG — không nối hai cụm rời nhau).
    const inBlock = new Set(block);
    const frontier = new Set<string>();
    for (const id of block) {
      for (const n of adj.get(id) ?? []) if (!inBlock.has(n)) frontier.add(n);
    }
    for (const n of frontier) grow([...block, n]);
  };

  // Khởi động từ mỗi bàn khả dụng (bao gồm luôn khối một-bàn đủ chỗ).
  for (const t of avail) grow([t.id]);

  // 4) Chấm điểm & sắp xếp.
  const suggestions: Suggestion[] = blocks.map((b) => {
    const ids = b.map((t) => t.id).sort();
    const totalSeats = b.reduce((s, t) => s + t.seats, 0);
    return {
      tableIds: ids,
      totalSeats,
      wastedSeats: totalSeats - guestCount,
      tableCount: b.length,
      score: scoreBlock(b, guestCount),
      label: labelOf(ids),
    };
  });
  suggestions.sort((a, b) => a.score - b.score);

  // 5) Tối đa 3 phương án tốt nhất.
  return suggestions.slice(0, 3);
}

/* -------------------------------------------------------------------------- */
/* Hàm phụ: ước tính khi nào có bàn (khi không còn phương án nào)              */
/* -------------------------------------------------------------------------- */

/** Thời lượng dùng bàn trung bình (phút) — giả định phục vụ cho ước tính. */
export const AVG_DINING_MINUTES = 60;

/**
 * Ước tính số phút nữa mới có đủ chỗ cho `guestCount`, dựa trên các phiên đang
 * ngồi: bàn nào ngồi lâu nhất sẽ trống sớm nhất. Trả null nếu không ước tính
 * được (không có phiên nào để mà trống).
 *
 * Cách tính (đơn giản, đủ cho demo):
 *  - Với mỗi phiên đang chiếm, thời gian còn lại ≈ AVG - (đã ngồi), tối thiểu 0.
 *  - Xét lần lượt các phiên theo thứ tự trống dần; cộng dồn số ghế được giải
 *    phóng cho tới khi >= guestCount; trả về mốc phút của phiên cuối cùng đó.
 */
export function estimateNextAvailable(
  branchId: string,
  guestCount: number,
  sessions: TableSession[],
  tables: FloorTable[],
  minutesSince: (hhmm: string) => number,
): { minutes: number; freeingTables: string[] } | null {
  const seatOf = new Map(tables.map((t) => [t.id, t.seats]));

  const occupying = sessions
    .filter((s) => s.branchId === branchId && (s.status === "open" || s.status === "paid"))
    .map((s) => {
      const seats = s.tableIds.reduce((sum, id) => sum + (seatOf.get(id) ?? 0), 0);
      const remaining = Math.max(0, AVG_DINING_MINUTES - minutesSince(s.openedAt));
      return { tableIds: s.tableIds, seats, remaining };
    })
    .sort((a, b) => a.remaining - b.remaining); // trống sớm nhất trước

  let seatsFreed = 0;
  const freeingTables: string[] = [];
  for (const s of occupying) {
    seatsFreed += s.seats;
    freeingTables.push(...s.tableIds);
    if (seatsFreed >= guestCount) return { minutes: s.remaining, freeingTables };
  }
  return null; // ngay cả khi mọi bàn trống cũng không đủ chỗ
}
