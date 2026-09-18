/**
 * ============================================================================
 * THUẬT TOÁN XẾP VÀ GHÉP BÀN — đặc tả v7 mục 8, BR-24/BR-25
 * ============================================================================
 *
 * Bài toán: một nhóm `guestCount` khách vừa tới. Trong các bàn đang trống của
 * chi nhánh, chọn ra tối đa 3 phương án xếp chỗ tốt nhất — mỗi phương án là
 * MỘT bàn đơn hoặc MỘT KHỐI bàn ghép liền kề, cùng khu vực (BR-25).
 *
 * Vì sao cần thuật toán mà không để waiter tự nhìn: waiter chỉ tối ưu cục bộ
 * ("bàn nào gần đây trống"); thuật toán nhìn cả sơ đồ cùng lúc nên biết
 * BẢO TOÀN BÀN LỚN cho nhóm đông sắp tới — đây là chỗ máy thắng người.
 * BR-24: thuật toán chỉ GỢI Ý, waiter là người quyết định cuối cùng.
 *
 * Sơ đồ thực tế chỉ 10–30 bàn nên KHÔNG cần thuật toán tinh vi; điểm mấu chốt
 * là CẮT TỈA (pruning) sớm để không nổ tổ hợp khi duyệt các khối liên thông.
 */

import type { FloorTable, TableSession } from "../types";

export type Suggestion = {
  tableIds: string[];
  totalSeats: number;
  wastedSeats: number; // totalSeats - guestCount
  tableCount: number;
  score: number; // càng THẤP càng tốt
  label: string; // "Bàn A1" hoặc "Ghép A1 + A2"
};

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

/**
 * Gợi ý tối đa 3 phương án xếp bàn cho `guestCount` khách.
 *
 * `tables` phải đã được lọc theo đúng chi nhánh trước khi gọi (caller —
 * `FloorTable.status` là nguồn sự thật DUY NHẤT cho việc bàn có đang bị
 * chiếm hay không, được `session.service.ts` cập nhật đồng bộ khi mở/đóng
 * phiên, nên hàm này không cần nhận thêm danh sách phiên).
 */
export function suggestArrangements(guestCount: number, tables: FloorTable[]): Suggestion[] {
  if (guestCount <= 0) return [];

  // 1) Chỉ xét bàn đang "available" — bỏ qua occupied/locked/reserved.
  const avail = tables.filter((t) => t.status === "available");
  const byId = new Map(avail.map((t) => [t.id, t]));

  // 2) Dựng đồ thị liền kề TRONG TỪNG KHU VỰC: chỉ giữ cạnh nối hai bàn cùng
  //    khả dụng, cùng khu vực và đã khai báo liền kề tay (BR-25).
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

  // 5) Tối đa 3 phương án tốt nhất (BR-24: chỉ gợi ý).
  return suggestions.slice(0, 3);
}

/* -------------------------------------------------------------------------- */
/* Hàm phụ: ước tính khi nào có bàn (khi không còn phương án nào)              */
/* -------------------------------------------------------------------------- */

/** Thời lượng dùng bàn trung bình (phút) — giả định phục vụ cho ước tính. */
export const AVG_DINING_MINUTES = 60;

/** Phiên còn đang chiếm bàn: chưa đóng và chưa bị huỷ. */
function isHoldingTable(session: TableSession): boolean {
  return session.status !== "closed" && session.status !== "cancelled";
}

/**
 * Ước tính số phút nữa mới có đủ chỗ cho `guestCount`, dựa trên các phiên đang
 * ngồi: bàn nào ngồi lâu nhất sẽ trống sớm nhất. Trả null nếu không ước tính
 * được (không có phiên nào để mà trống).
 *
 * Cách tính (đơn giản, đủ cho demo):
 *  - Với mỗi phiên đang chiếm, thời gian còn lại ≈ AVG - (đã ngồi), tối thiểu 0.
 *  - Xét lần lượt các phiên theo thứ tự trống dần; cộng dồn số ghế được giải
 *    phóng cho tới khi >= guestCount; trả về mốc phút của phiên cuối cùng đó.
 *
 * `sessions`/`tables` phải đã được lọc theo đúng chi nhánh trước khi gọi.
 */
export function estimateNextAvailable(
  guestCount: number,
  sessions: TableSession[],
  tables: FloorTable[],
  minutesSince: (isoOrLabel: string) => number,
): { minutes: number; freeingTables: string[] } | null {
  const seatOf = new Map(tables.map((t) => [t.id, t.seats]));

  const occupying = sessions
    .filter(isHoldingTable)
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
