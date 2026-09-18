/** Service quản lý Ví, Sổ cái (Ledger) và Rút tiền — đặc tả v7 mục 12. */
import { db } from "../mock/db";
import type {
  LedgerEntry,
  LedgerEntryType,
  PayoutAccount,
  RoleKey,
  SettlementBatch,
  Tenant,
  WithdrawalRequest,
} from "../types";
import { delay, newId, nowISO } from "./_utils";

function addAudit(tenantId: string | null, actor: string, action: string, target: string) {
  db.auditLog = [
    { id: `L-${newId()}`, tenantId, time: nowISO(), actor, action, target },
    ...db.auditLog,
  ];
}

/**
 * Ví doanh nghiệp chỉ dành cho Owner (ví của mình) và Platform Admin (xem
 * mọi tenant, chỉ đọc — BR-21). Branch Manager/Waiter/Kitchen không thấy ví.
 */
function assertOwnerOrAdmin(actingRole: RoleKey) {
  if (actingRole !== "owner" && actingRole !== "admin") {
    throw new Error("Chỉ Owner hoặc Platform Admin mới được truy cập Ví doanh nghiệp");
  }
}

/** Các thao tác Owner tự quản lý ví của doanh nghiệp mình. */
function assertOwner(actingRole: RoleKey) {
  if (actingRole !== "owner") {
    throw new Error("Chỉ Owner mới được thực hiện thao tác này trên Ví doanh nghiệp");
  }
}

/** Các thao tác chỉ Platform Admin được xử lý (duyệt/từ chối/chạy quyết toán). */
function assertAdmin(actingRole: RoleKey) {
  if (actingRole !== "admin") {
    throw new Error("Chỉ Platform Admin mới được thực hiện thao tác này");
  }
}

/** Lấy danh sách bút toán sổ cái của tenant. */
export async function listLedger(tenantId: string, actingRole: RoleKey): Promise<LedgerEntry[]> {
  assertOwnerOrAdmin(actingRole);
  await delay();
  return db.ledgerEntries.filter((e) => e.tenantId === tenantId);
}

function sumByType(entries: LedgerEntry[], type: LedgerEntryType): number {
  return entries
    .filter((e) => e.type === type)
    .reduce((total, e) => total + e.amount, 0);
}

export interface WalletBalance {
  /** Tiền QR đã thu nhưng chưa hết thời gian tạm giữ / chưa quyết toán. */
  heldBalance: number;
  /** Tiền đã quyết toán, đã trừ phí, đang chờ rút, Owner được phép rút thêm. */
  availableBalance: number;
  /** Tổng đang bị giữ lại vì có yêu cầu rút chưa xử lý xong. */
  pendingWithdraw: number;
  /** Tổng đã từng quyết toán (tham khảo, không dùng để trừ số dư). */
  totalSettled: number;
}

/**
 * Tính số dư ví hoàn toàn từ sổ cái (BR-34) — không lưu số dư thành field.
 *
 *   held           = Σhold − Σ(hold đã settle) − Σrefund
 *   available      = Σsettle − Σfee − Σwithdraw_hold + Σwithdraw_release
 *   pendingWithdraw= Σwithdraw_hold − Σwithdraw_release − Σwithdraw_paid
 *
 * "Hold đã settle" ứng với Σsettle: mỗi bút toán settle ghi đúng phần hold
 * (đã trừ phần đã hoàn) được quyết toán, còn phí là bút toán `fee` tách
 * riêng (BR-37) nên không trừ hai lần trong `held`.
 *
 * Hoàn tiền (`refund`) chỉ trừ vào `held` — không bao giờ cộng vào
 * `availableBalance`, vì tiền hoàn khách nằm ngoài số tiền chuỗi được rút.
 */
export async function getWalletBalance(tenantId: string, actingRole: RoleKey): Promise<WalletBalance> {
  assertOwnerOrAdmin(actingRole);
  await delay();
  const entries = db.ledgerEntries.filter((e) => e.tenantId === tenantId);

  const sumHold = sumByType(entries, "hold");
  const sumSettle = sumByType(entries, "settle");
  const sumFee = sumByType(entries, "fee");
  const sumRefund = sumByType(entries, "refund");
  const sumWithdrawHold = sumByType(entries, "withdraw_hold");
  const sumWithdrawRelease = sumByType(entries, "withdraw_release");
  const sumWithdrawPaid = sumByType(entries, "withdraw_paid");

  const heldBalance = sumHold - sumSettle - sumRefund;
  const availableBalance = sumSettle - sumFee - sumWithdrawHold + sumWithdrawRelease;
  const pendingWithdraw = sumWithdrawHold - sumWithdrawRelease - sumWithdrawPaid;

  return {
    heldBalance: Math.max(0, heldBalance),
    availableBalance: Math.max(0, availableBalance),
    pendingWithdraw: Math.max(0, pendingWithdraw),
    totalSettled: sumSettle,
  };
}

/** Danh sách lô quyết toán. */
export async function listSettlementBatches(
  tenantId: string,
  actingRole: RoleKey
): Promise<SettlementBatch[]> {
  assertOwnerOrAdmin(actingRole);
  await delay();
  return db.settlementBatches.filter((b) => b.tenantId === tenantId);
}

/**
 * Chạy quyết toán (job định kỳ, BR-36/BR-37/BR-53): mọi bút toán `hold` đã
 * đủ `holdHours` và CHƯA thuộc lô quyết toán nào thì chuyển sang `settle` +
 * `fee`. Chạy lại không quyết toán trùng vì chỉ xét các hold chưa nằm trong
 * `entryIds` của lô nào (BR-53).
 */
export async function settleDueHolds(
  tenantId: string,
  now: Date = new Date()
): Promise<SettlementBatch | null> {
  // Job nội bộ, chỉ gọi được từ `runSettlementForAllTenants` (đã kiểm tra role ở đó).
  await delay();
  const { holdHours, feePercent } = db.platformConfig;
  const holdWindowMs = holdHours * 3600_000;

  const alreadySettled = new Set(
    db.settlementBatches
      .filter((b) => b.tenantId === tenantId)
      .flatMap((b) => b.entryIds)
  );

  const dueHolds = db.ledgerEntries.filter(
    (e) =>
      e.tenantId === tenantId &&
      e.type === "hold" &&
      !alreadySettled.has(e.id) &&
      now.getTime() - new Date(e.createdAt).getTime() >= holdWindowMs
  );

  if (dueHolds.length === 0) return null;

  const nowIso = nowISO();
  const entryIds: string[] = [];
  let totalGross = 0;

  for (const hold of dueHolds) {
    // Phí tính trên số còn lại sau khi trừ phần đã hoàn (BR-37).
    const refundedForHold = db.ledgerEntries
      .filter((e) => e.tenantId === tenantId && e.type === "refund" && e.refId === hold.refId)
      .reduce((s, e) => s + e.amount, 0);
    const netAmount = Math.max(0, hold.amount - refundedForHold);
    const feeAmount = Math.round(netAmount * (feePercent / 100));

    const settleId = `LED-${newId()}`;
    const feeId = `LED-${newId()}`;
    db.ledgerEntries.push(
      {
        id: settleId,
        tenantId,
        branchId: hold.branchId,
        type: "settle",
        amount: netAmount,
        refId: hold.refId,
        note: `Quyết toán bút toán ${hold.id}`,
        createdAt: nowIso,
      },
      {
        id: feeId,
        tenantId,
        branchId: hold.branchId,
        type: "fee",
        amount: feeAmount,
        refId: hold.refId,
        note: `Phí dịch vụ thanh toán ${feePercent}% cho ${hold.id}`,
        createdAt: nowIso,
      }
    );

    entryIds.push(hold.id, settleId, feeId);
    totalGross += netAmount;
  }

  const batch: SettlementBatch = {
    id: `BATCH-${newId()}`,
    tenantId,
    totalAmount: totalGross,
    entryIds,
    createdAt: nowIso,
    settledAt: nowIso,
  };
  db.settlementBatches.push(batch);
  return batch;
}

/**
 * PA-09: Platform Admin bấm "Chạy quyết toán" — chạy job cho TẤT CẢ tenant
 * cùng lúc. `now` cho phép demo "tua thời gian +24h" mà không cần đợi thật.
 */
export async function runSettlementForAllTenants(
  now: Date = new Date(),
  actingRole: RoleKey = "admin"
): Promise<{ tenant: Tenant; batch: SettlementBatch }[]> {
  assertAdmin(actingRole);
  await delay();
  const results: { tenant: Tenant; batch: SettlementBatch }[] = [];
  for (const tenant of db.tenants) {
    const batch = await settleDueHolds(tenant.id, now);
    if (batch) results.push({ tenant, batch });
  }
  return results;
}

/** Chi tiết một lô quyết toán: tổng thu gốc, đã hoàn, phí, thực nhận — cho màn Lịch sử quyết toán. */
export interface SettlementBatchDetail {
  batch: SettlementBatch;
  grossCollected: number;
  totalRefunded: number;
  totalFee: number;
  netReceived: number;
}

export async function getSettlementBatchDetail(
  batchId: string,
  actingRole: RoleKey
): Promise<SettlementBatchDetail | null> {
  assertOwnerOrAdmin(actingRole);
  await delay();
  const batch = db.settlementBatches.find((b) => b.id === batchId);
  if (!batch) return null;

  const entries = batch.entryIds
    .map((id) => db.ledgerEntries.find((e) => e.id === id))
    .filter((e): e is LedgerEntry => !!e);

  const holds = entries.filter((e) => e.type === "hold");
  const totalFee = entries.filter((e) => e.type === "fee").reduce((s, e) => s + e.amount, 0);
  const grossCollected = holds.reduce((s, e) => s + e.amount, 0);
  const totalRefunded = holds.reduce((sum, hold) => {
    const refunded = db.ledgerEntries
      .filter((e) => e.tenantId === batch.tenantId && e.type === "refund" && e.refId === hold.refId)
      .reduce((s, e) => s + e.amount, 0);
    return sum + refunded;
  }, 0);

  return {
    batch,
    grossCollected,
    totalRefunded,
    totalFee,
    netReceived: batch.totalAmount - totalFee,
  };
}

/**
 * Hoàn tiền một phần/toàn bộ giao dịch QR (BR-38) — chỉ khi còn trong thời
 * gian tạm giữ, tức là bút toán `hold` tương ứng chưa được quyết toán.
 * Trừ vào `held`, không bao giờ cộng vào `availableBalance`.
 */
export async function refundHold(
  tenantId: string,
  holdRefId: string,
  amount: number,
  reason: string,
  actingRole: RoleKey
): Promise<LedgerEntry> {
  assertOwnerOrAdmin(actingRole);
  await delay();
  if (!reason.trim()) throw new Error("Phải ghi lý do hoàn tiền");

  const hold = db.ledgerEntries.find(
    (e) => e.tenantId === tenantId && e.type === "hold" && e.refId === holdRefId
  );
  if (!hold) throw new Error("Không tìm thấy giao dịch QR để hoàn tiền");

  const alreadySettled = db.settlementBatches
    .filter((b) => b.tenantId === tenantId)
    .some((b) => b.entryIds.includes(hold.id));
  if (alreadySettled) {
    throw new Error("Giao dịch đã hết thời gian tạm giữ, không thể hoàn tiền");
  }

  const priorRefunds = db.ledgerEntries
    .filter((e) => e.tenantId === tenantId && e.type === "refund" && e.refId === holdRefId)
    .reduce((s, e) => s + e.amount, 0);
  if (priorRefunds + amount > hold.amount) {
    throw new Error("Tổng số tiền hoàn vượt quá số đã thanh toán");
  }

  const entry: LedgerEntry = {
    id: `LED-${newId()}`,
    tenantId,
    type: "refund",
    amount,
    refId: holdRefId,
    note: reason,
    createdAt: nowISO(),
  };
  db.ledgerEntries.push(entry);
  return entry;
}

/** Danh sách tài khoản thụ hưởng. */
export async function listPayoutAccounts(
  tenantId: string,
  actingRole: RoleKey
): Promise<PayoutAccount[]> {
  assertOwnerOrAdmin(actingRole);
  await delay();
  return db.payoutAccounts.filter((a) => a.tenantId === tenantId);
}

/** Owner khai báo tài khoản ngân hàng nhận tiền rút — ghi audit log (BR-20). */
export async function createPayoutAccount(
  tenantId: string,
  data: { bankName: string; accountNumber: string; accountName: string },
  actorEmail: string,
  actingRole: RoleKey
): Promise<PayoutAccount> {
  assertOwner(actingRole);
  await delay();
  const isFirst = !db.payoutAccounts.some((a) => a.tenantId === tenantId);
  const account: PayoutAccount = {
    id: `PO-${newId()}`,
    tenantId,
    ...data,
    isDefault: isFirst,
    createdAt: nowISO(),
  };
  db.payoutAccounts.push(account);
  addAudit(tenantId, actorEmail, "Thêm tài khoản nhận tiền rút", `${account.bankName} · ${account.accountNumber}`);
  return account;
}

/** Owner sửa tài khoản ngân hàng nhận tiền rút — ghi audit log (BR-20). */
export async function updatePayoutAccount(
  id: string,
  data: { bankName: string; accountNumber: string; accountName: string },
  actorEmail: string,
  actingRole: RoleKey
): Promise<PayoutAccount> {
  assertOwner(actingRole);
  await delay();
  const account = db.payoutAccounts.find((a) => a.id === id);
  if (!account) throw new Error("Tài khoản không tồn tại");
  Object.assign(account, data);
  addAudit(account.tenantId, actorEmail, "Sửa tài khoản nhận tiền rút", `${account.bankName} · ${account.accountNumber}`);
  return account;
}

/** Danh sách yêu cầu rút tiền. */
export async function listWithdrawalRequests(
  actingRole: RoleKey,
  tenantId?: string
): Promise<WithdrawalRequest[]> {
  assertOwnerOrAdmin(actingRole);
  await delay();
  if (!tenantId) return [...db.withdrawalRequests];
  return db.withdrawalRequests.filter((r) => r.tenantId === tenantId);
}

/** Owner tạo yêu cầu rút tiền mới (BR-39: ≥ mức tối thiểu, ≤ số dư khả dụng). */
export async function createWithdrawalRequest(
  tenantId: string,
  amount: number,
  payoutAccountId: string,
  actorEmail: string,
  actingRole: RoleKey,
  note?: string
): Promise<WithdrawalRequest> {
  assertOwner(actingRole);
  await delay();
  const account = db.payoutAccounts.find((a) => a.id === payoutAccountId);
  if (!account) throw new Error("Tài khoản nhận tiền không tồn tại");

  const { minWithdraw } = db.platformConfig;
  if (amount < minWithdraw) {
    throw new Error(`Số tiền rút phải từ ${minWithdraw.toLocaleString("vi-VN")}đ trở lên`);
  }
  const { availableBalance } = await getWalletBalance(tenantId, actingRole);
  if (amount > availableBalance) {
    throw new Error("Số tiền rút vượt quá số dư khả dụng");
  }

  const requestId = `WDR-${newId()}`;
  const now = nowISO();

  const req: WithdrawalRequest = {
    id: requestId,
    tenantId,
    amount,
    status: "pending",
    // Bản sao tài khoản nhận tiền tại thời điểm tạo (BR-52).
    payoutAccountSnapshot: {
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      accountName: account.accountName,
    },
    note,
    createdAt: now,
    updatedAt: now,
  };

  db.withdrawalRequests.unshift(req);

  // Tạo yêu cầu thì số tiền bị giữ lại ngay khỏi số dư khả dụng.
  db.ledgerEntries.push({
    id: `LED-${newId()}`,
    tenantId,
    type: "withdraw_hold",
    amount,
    refId: requestId,
    note: `Giữ tiền yêu cầu rút ${requestId}`,
    createdAt: now,
  });

  addAudit(tenantId, actorEmail, "Tạo yêu cầu rút tiền", `${requestId} · ${amount.toLocaleString("vi-VN")}đ`);
  return req;
}

/** Platform Admin duyệt yêu cầu rút — chưa chuyển tiền, chỉ đổi trạng thái. */
export async function approveWithdrawalRequest(id: string, actorEmail: string, actingRole: RoleKey): Promise<WithdrawalRequest> {
  assertAdmin(actingRole);
  await delay();
  const req = db.withdrawalRequests.find((r) => r.id === id);
  if (!req) throw new Error("Yêu cầu rút không tồn tại");
  if (req.status !== "pending") throw new Error("Yêu cầu không còn ở trạng thái chờ duyệt");

  req.status = "approved";
  req.updatedAt = nowISO();
  addAudit(req.tenantId, actorEmail, "Duyệt yêu cầu rút tiền", id);
  return req;
}

/**
 * Platform Admin từ chối yêu cầu rút, hoặc Owner huỷ yêu cầu đang chờ.
 * Tiền trả lại số dư khả dụng ngay (bút toán `withdraw_release`).
 */
async function releaseWithdrawal(
  id: string,
  nextStatus: "rejected" | "cancelled" | "failed",
  actorEmail: string,
  reason?: string
): Promise<WithdrawalRequest> {
  const req = db.withdrawalRequests.find((r) => r.id === id);
  if (!req) throw new Error("Yêu cầu rút không tồn tại");
  const releasable = nextStatus === "failed" ? req.status === "approved" : req.status === "pending";
  if (!releasable) throw new Error("Yêu cầu không ở trạng thái cho phép thao tác này");
  if (nextStatus === "rejected" && !reason?.trim()) {
    throw new Error("Phải ghi lý do từ chối");
  }

  req.status = nextStatus;
  req.rejectReason = reason;
  req.updatedAt = nowISO();

  db.ledgerEntries.push({
    id: `LED-${newId()}`,
    tenantId: req.tenantId,
    type: "withdraw_release",
    amount: req.amount,
    refId: req.id,
    note: `${nextStatus === "rejected" ? "Từ chối" : nextStatus === "cancelled" ? "Huỷ" : "Chuyển thất bại"} yêu cầu rút ${req.id}${reason ? `: ${reason}` : ""}`,
    createdAt: nowISO(),
  });

  const actionLabel =
    nextStatus === "rejected" ? "Từ chối yêu cầu rút tiền" : nextStatus === "cancelled" ? "Huỷ yêu cầu rút tiền" : "Đánh dấu chuyển khoản thất bại";
  addAudit(req.tenantId, actorEmail, actionLabel, `${id}${reason ? `: ${reason}` : ""}`);

  return req;
}

/** Platform Admin từ chối yêu cầu rút (kèm lý do bắt buộc) — tiền trả về số dư khả dụng. */
export async function rejectWithdrawalRequest(
  id: string,
  reason: string,
  actorEmail: string,
  actingRole: RoleKey
): Promise<WithdrawalRequest> {
  assertAdmin(actingRole);
  await delay();
  return releaseWithdrawal(id, "rejected", actorEmail, reason);
}

/** Owner huỷ yêu cầu rút còn đang chờ duyệt — tiền trả về số dư khả dụng. */
export async function cancelWithdrawalRequest(id: string, actorEmail: string, actingRole: RoleKey): Promise<WithdrawalRequest> {
  assertOwner(actingRole);
  await delay();
  return releaseWithdrawal(id, "cancelled", actorEmail);
}

/** Chuyển khoản thất bại sau khi đã duyệt — tiền trả về số dư khả dụng. */
export async function failWithdrawalRequest(
  id: string,
  reason: string,
  actorEmail: string,
  actingRole: RoleKey
): Promise<WithdrawalRequest> {
  assertAdmin(actingRole);
  await delay();
  return releaseWithdrawal(id, "failed", actorEmail, reason);
}

/**
 * Platform Admin xác nhận đã chuyển khoản thật (kèm mã giao dịch ngân hàng).
 * Không sinh `withdraw_release` — tiền coi như đã rời ví vĩnh viễn, vẫn tính
 * trong `withdraw_hold` để giữ `availableBalance` đã trừ đúng.
 */
export async function markWithdrawalPaid(
  id: string,
  bankTxnRef: string,
  actorEmail: string,
  actingRole: RoleKey
): Promise<WithdrawalRequest> {
  assertAdmin(actingRole);
  await delay();
  if (!bankTxnRef.trim()) throw new Error("Phải nhập mã giao dịch ngân hàng");
  const req = db.withdrawalRequests.find((r) => r.id === id);
  if (!req) throw new Error("Yêu cầu rút không tồn tại");
  if (req.status !== "approved") throw new Error("Yêu cầu phải ở trạng thái đã duyệt trước khi xác nhận chuyển");

  req.status = "paid";
  req.updatedAt = nowISO();

  db.ledgerEntries.push({
    id: `LED-${newId()}`,
    tenantId: req.tenantId,
    type: "withdraw_paid",
    amount: req.amount,
    refId: req.id,
    note: `Đã chuyển khoản yêu cầu rút ${req.id} — mã GD ngân hàng ${bankTxnRef}`,
    createdAt: nowISO(),
  });

  addAudit(req.tenantId, actorEmail, "Xác nhận đã chuyển khoản", `${id} · mã GD ${bankTxnRef}`);
  return req;
}
