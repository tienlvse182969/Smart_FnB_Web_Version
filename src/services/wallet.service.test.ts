/**
 * Unit test cho Ví doanh nghiệp (Bước sửa BR-34/36/37/38/39/40).
 * Không phụ thuộc test-runner: chạy trực tiếp bằng `npx tsx src/services/wallet.service.test.ts`.
 * Kịch bản: thu QR (hold) → quyết toán (settle+fee) → rút (withdraw_hold) →
 * bị từ chối (withdraw_release, tiền trở về) → thêm hoàn tiền một phần
 * trước khi quyết toán để xác nhận hoàn tiền chỉ trừ vào "held", không bao
 * giờ làm tăng "available".
 */
import { db } from "../mock/db";
import {
  createWithdrawalRequest,
  getWalletBalance,
  rejectWithdrawalRequest,
  refundHold,
  settleDueHolds,
} from "./wallet.service";

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

async function main() {
  const TENANT = "T-WALLET-TEST";
  db.platformConfig = { feePercent: 10, holdHours: 24, minWithdraw: 100_000 };
  db.ledgerEntries = [];
  db.settlementBatches = [];
  db.withdrawalRequests = [];
  db.payoutAccounts = [
    {
      id: "PO-1",
      tenantId: TENANT,
      bankName: "Vietcombank",
      accountNumber: "0123456789",
      accountName: "CONG TY TEST",
      isDefault: true,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ];

  const t0 = new Date("2026-09-17T00:00:00.000Z");
  const holdAt = new Date(t0.getTime() - 25 * 3600_000); // 25h trước "now" — đủ 24h tạm giữ
  const now25h = new Date(t0);

  console.log("Bước 1 — Thu QR: ghi bút toán hold");
  db.ledgerEntries.push({
    id: "LED-HOLD-1",
    tenantId: TENANT,
    type: "hold",
    amount: 1_000_000,
    refId: "PAY-1",
    createdAt: holdAt.toISOString(),
  });
  {
    const bal = await getWalletBalance(TENANT, "owner");
    assert(bal.heldBalance === 1_000_000, "held = 1.000.000đ ngay sau khi thu QR");
    assert(bal.availableBalance === 0, "available = 0 trước khi quyết toán");
  }

  console.log("Bước 1b — Hết hạn giữ nhưng CHƯA quyết toán, hoàn 200.000đ (BR-38)");
  await refundHold(TENANT, "PAY-1", 200_000, "Khách yêu cầu hoàn 1 món bị huỷ", "owner");
  {
    const bal = await getWalletBalance(TENANT, "owner");
    assert(bal.heldBalance === 800_000, "held giảm đúng 200.000đ sau hoàn tiền");
    assert(bal.availableBalance === 0, "hoàn tiền KHÔNG làm tăng available (vẫn = 0)");
  }

  console.log("Bước 2 — Quyết toán (settleDueHolds) sau khi đủ 24h tạm giữ");
  const batch = await settleDueHolds(TENANT, now25h);
  assert(batch !== null, "sinh ra 1 lô quyết toán");
  {
    const bal = await getWalletBalance(TENANT, "owner");
    // netAmount sau hoàn = 1.000.000 - 200.000 = 800.000; fee 10% = 80.000
    assert(bal.heldBalance === 0, "held về 0 sau khi quyết toán toàn bộ phần còn lại");
    assert(bal.availableBalance === 720_000, "available = 800.000 - phí 10% (80.000) = 720.000đ");
  }

  console.log("Bước 2b — Chạy lại settleDueHolds không quyết toán trùng (BR-53)");
  const batch2 = await settleDueHolds(TENANT, now25h);
  assert(batch2 === null, "không còn hold nào đủ điều kiện — không sinh lô mới");
  {
    const bal = await getWalletBalance(TENANT, "owner");
    assert(bal.availableBalance === 720_000, "available không đổi sau khi chạy lại job quyết toán");
  }

  console.log("Bước 3 — Owner tạo yêu cầu rút toàn bộ số dư khả dụng");
  const req = await createWithdrawalRequest(TENANT, 720_000, "PO-1", "owner@test.vn", "owner", "Rút về ngân hàng");
  {
    const bal = await getWalletBalance(TENANT, "owner");
    assert(bal.availableBalance === 0, "available về 0 ngay khi tạo yêu cầu rút (bị giữ lại)");
    assert(bal.pendingWithdraw === 720_000, "pendingWithdraw = 720.000đ trong lúc chờ duyệt");
  }

  console.log("Bước 4 — Platform Admin từ chối yêu cầu rút");
  const rejected = await rejectWithdrawalRequest(req.id, "Sai tên chủ tài khoản ngân hàng", "admin@platform.vn", "admin");
  assert(rejected.status === "rejected", "trạng thái yêu cầu chuyển sang rejected");
  assert(!!rejected.rejectReason, "lý do từ chối được ghi lại (BR-40)");

  console.log("Bước 5 — Tiền trở về số dư khả dụng sau khi bị từ chối");
  {
    const bal = await getWalletBalance(TENANT, "owner");
    assert(bal.availableBalance === 720_000, "available trở lại 720.000đ sau khi bị từ chối");
    assert(bal.pendingWithdraw === 0, "pendingWithdraw về 0 sau khi bị từ chối");
  }

  console.log("Bước 6 — Không thể hoàn tiền một giao dịch đã quyết toán xong");
  let threw = false;
  try {
    await refundHold(TENANT, "PAY-1", 1, "Thử hoàn sau khi đã quyết toán", "owner");
  } catch {
    threw = true;
  }
  assert(threw, "refundHold ném lỗi khi giao dịch đã hết thời gian tạm giữ");

  console.log("Bước 7 — Branch Manager không được truy cập Ví doanh nghiệp (permission matrix mục 14)");
  let rejectedByRole = false;
  try {
    await getWalletBalance(TENANT, "manager");
  } catch {
    rejectedByRole = true;
  }
  assert(rejectedByRole, "getWalletBalance ném lỗi khi actingRole = manager");

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
