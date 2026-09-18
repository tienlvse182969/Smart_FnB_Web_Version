/** Service quản lý Thanh toán (Payment & Settlement) — đặc tả v7 mục 4.5/7. */
import { db } from "../mock/db";
import type { Payment, PaymentMethod, RoleKey } from "../types";
import { assertTenantWritable } from "./_guard";
import { delay, newId, nowISO } from "./_utils";

/** BR-13: chỉ Branch Manager mới sinh mã QR/ghi nhận thu tiền và xác nhận thanh toán. */
function assertManager(actingRole: RoleKey) {
  if (actingRole !== "manager") {
    throw new Error("Chỉ Branch Manager mới được thực hiện thao tác thanh toán này");
  }
}

/** Lấy danh sách thanh toán theo chi nhánh / tenant. */
export async function listPayments(
  branchId?: string,
  tenantId?: string
): Promise<Payment[]> {
  await delay();
  let list = [...db.payments];
  if (branchId) list = list.filter((p) => p.branchId === branchId);
  if (tenantId) list = list.filter((p) => p.tenantId === tenantId);
  return list;
}

/** Lấy thông tin thanh toán theo Session ID. */
export async function getPaymentBySession(
  sessionId: string
): Promise<Payment | undefined> {
  await delay();
  return db.payments.find((p) => p.sessionId === sessionId);
}

/**
 * Branch Manager tạo thanh toán cho phiên bàn: sinh mã QR (method="qr") hoặc
 * ghi nhận tiền mặt do waiter thu hộ (method="cash", `collectedBy` bắt buộc).
 * Waiter không được gọi hàm này (BR-13).
 */
export async function createPayment(
  tenantId: string,
  branchId: string,
  sessionId: string,
  amount: number,
  method: PaymentMethod,
  actingRole: RoleKey,
  collectedBy?: string,
  note?: string
): Promise<Payment> {
  assertManager(actingRole);
  await delay();
  assertTenantWritable(tenantId);
  const paymentId = `PAY-${newId()}`;
  const now = nowISO();
  const invoiceCode = `HD-${Date.now().toString().slice(-6)}`;

  const newPayment: Payment = {
    id: paymentId,
    tenantId,
    branchId,
    sessionId,
    invoiceCode,
    amount,
    method,
    status: method === "cash" && collectedBy ? "cash_received" : "awaiting_transfer",
    collectedBy,
    note,
    createdAt: now,
    updatedAt: now,
  };

  db.payments.unshift(newPayment);

  const session = db.tableSessions.find((s) => s.id === sessionId);
  if (session) {
    session.paymentMethod = method;
    if (collectedBy) session.collectedBy = collectedBy;
  }

  return newPayment;
}

/**
 * Branch Manager xác nhận thanh toán thành công (BR-13). Chuyển session
 * sang "paid" và, nếu là QR, ghi ngay bút toán tạm giữ (`hold`) vào sổ cái
 * ví doanh nghiệp — cùng một thao tác logic (BR-17: nên chạy trong 1
 * transaction ở backend thật). Tiền mặt không ghi vào ví (BR-41).
 */
export async function confirmPayment(
  paymentId: string,
  confirmedBy: string,
  actingRole: RoleKey
): Promise<Payment> {
  assertManager(actingRole);
  await delay();
  const payment = db.payments.find((p) => p.id === paymentId);
  if (!payment) throw new Error("Giao dịch thanh toán không tồn tại");
  assertTenantWritable(payment.tenantId);

  const now = nowISO();
  payment.status = "confirmed";
  payment.confirmedBy = confirmedBy;
  payment.updatedAt = now;

  const session = db.tableSessions.find((s) => s.id === payment.sessionId);
  if (session) {
    session.status = "paid";
    session.confirmedBy = confirmedBy;
    session.paidAt = now;
  }

  if (payment.method === "qr") {
    db.ledgerEntries.push({
      id: `LED-${newId()}`,
      tenantId: payment.tenantId,
      branchId: payment.branchId,
      type: "hold",
      amount: payment.amount,
      refId: payment.id,
      note: `Thu tiền QR hoá đơn ${payment.invoiceCode}`,
      createdAt: now,
    });
  }

  return payment;
}
