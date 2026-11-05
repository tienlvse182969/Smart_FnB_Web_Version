import { modeOf } from "../../flags";
import { request } from "../../http/client";

export type RefundApprovalRequest = {
  id: string;
  orderId: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";
  amount: string;
  reason: string;
  orderItemIds: string[];
  requestedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  completedAt: string | null;
  order: { orderCode: string; callNumber: number | null };
};

export async function listManagerRefundApprovals(): Promise<RefundApprovalRequest[]> {
  if (modeOf("order") === "mock") return [];
  return request<RefundApprovalRequest[]>("/manager/refund-approval-requests");
}

export async function reviewManagerRefundApproval(requestId: string, approved: boolean, note: string): Promise<void> {
  if (modeOf("order") === "mock") throw new Error("Duyệt hoàn tiền cần kết nối BE thật");
  await request(`/manager/refund-approval-requests/${encodeURIComponent(requestId)}/${approved ? "approve" : "reject"}`, {
    method: "POST",
    body: { ...(note.trim() ? { note: note.trim() } : {}) },
  });
}
