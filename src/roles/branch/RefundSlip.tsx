import { useCallback, useRef, useState } from "react";
import { Alert, Button } from "antd";
import { FileText, RefreshCw } from "lucide-react";
import { describeApiError, orderApi } from "../../api";
import { isAbsoluteUrl } from "../../api/modules/order/refundDocument";
import { formatDateTime } from "../../lib/reportFormat";
import { useAppStore } from "../../store";
import { palette } from "../../theme";
import type { RefundDocument } from "../../types";

type View =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "error"; message: string }
  | { kind: "doc"; doc: RefundDocument; opened?: boolean };

/** Chỉ khoản hoàn TIỀN MẶT đã xác nhận có PDF phiếu hoàn (BR-86). */
export const hasRefundSlip = (r: { method: string; status: string }) => r.method === "CASH" && r.status === "COMPLETED";

/**
 * 28.6, BR-86: xem PDF phiếu hoàn của một khoản hoàn (Store Manager trong chi nhánh; Brand Manager trong chuỗi, cùng route BE).
 * Mỗi lần bấm luôn hỏi lại BE để lấy link mới (link ký hết hạn sau 10 phút, không giữ link cũ). Sẵn sàng → mở tab mới;
 * Đang sinh → hiện trạng thái và nút Tải lại; Lỗi → nút Sinh lại. Không tự sinh khi chỉ mở màn (BE sinh khoản hoàn cũ ở lần xem đầu).
 */
export default function RefundSlip({ orderId, refundId }: { orderId: string; refundId: string }) {
  const chainId = useAppStore((s) => s.chainId);
  const branchId = useAppStore((s) => s.currentBranchId);
  const [view, setView] = useState<View>({ kind: "idle" });
  const busy = useRef(false);

  const openFile = useCallback(
    async (doc: RefundDocument) => {
      if (!doc.downloadUrl) throw new Error("Phiếu chưa có đường dẫn tải");
      const scope = { chainId: chainId ?? "", branchId: branchId ?? "" };
      // Mở tab ngay trong cú bấm để trình duyệt không chặn cửa sổ bật lên.
      const tab = window.open("", "_blank");
      try {
        const url = isAbsoluteUrl(doc.downloadUrl) ? doc.downloadUrl : URL.createObjectURL(await orderApi.downloadRefundDocument(scope, orderId, refundId));
        if (tab) tab.location.href = url;
        else window.open(url, "_blank");
        if (!isAbsoluteUrl(doc.downloadUrl)) setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } catch (err) {
        tab?.close();
        throw err;
      }
    },
    [chainId, branchId, orderId, refundId],
  );

  const run = useCallback(
    async (action: "get" | "retry") => {
      if (busy.current) return; // chống bấm đúp
      busy.current = true;
      setView({ kind: "busy" });
      try {
        const scope = { chainId: chainId ?? "", branchId: branchId ?? "" };
        const doc = action === "retry" ? await orderApi.retryRefundDocument(scope, orderId, refundId) : await orderApi.getRefundDocument(scope, orderId, refundId);
        if (doc.status === "READY") {
          await openFile(doc);
          setView({ kind: "doc", doc, opened: true });
        } else {
          setView({ kind: "doc", doc });
        }
      } catch (err) {
        setView({ kind: "error", message: describeApiError(err) });
      } finally {
        busy.current = false;
      }
    },
    [chainId, branchId, orderId, refundId, openFile],
  );

  const loading = view.kind === "busy";
  return (
    <div data-testid="refund-slip" style={{ marginTop: 6 }}>
      <Button size="small" icon={<FileText size={14} />} loading={loading} onClick={() => void run("get")} data-testid="refund-slip-open">
        {view.kind === "doc" && view.opened ? "Mở lại phiếu hoàn (PDF)" : "Xem phiếu hoàn (PDF)"}
      </Button>
      {view.kind === "error" && (
        <Alert
          data-testid="refund-slip-error"
          style={{ marginTop: 6 }}
          type="error"
          showIcon
          message={view.message}
          action={
            <Button size="small" onClick={() => void run("get")}>
              Thử lại
            </Button>
          }
        />
      )}
      {view.kind === "doc" && view.doc.status === "PENDING" && (
        <Alert
          data-testid="refund-slip-pending"
          style={{ marginTop: 6 }}
          type="info"
          showIcon
          message="Phiếu hoàn đang được sinh"
          description="Thường mất vài giây. Bấm Tải lại để kiểm tra."
          action={
            <Button size="small" icon={<RefreshCw size={13} />} onClick={() => void run("get")}>
              Tải lại
            </Button>
          }
        />
      )}
      {view.kind === "doc" && view.doc.status === "FAILED" && (
        <Alert
          data-testid="refund-slip-failed"
          style={{ marginTop: 6 }}
          type="error"
          showIcon
          message="Sinh phiếu hoàn bị lỗi"
          description={`${view.doc.errorMessage ?? "Không rõ nguyên nhân"}. Khoản hoàn không bị ảnh hưởng.`}
          action={
            <Button size="small" onClick={() => void run("retry")} data-testid="refund-slip-retry">
              Sinh lại
            </Button>
          }
        />
      )}
      {view.kind === "doc" && view.doc.status === "DISABLED" && (
        <Alert data-testid="refund-slip-disabled" style={{ marginTop: 6 }} type="warning" showIcon message="Máy chủ chưa bật tính năng PDF phiếu hoàn" />
      )}
      {view.kind === "doc" && view.doc.status === "READY" && view.opened && view.doc.generatedAt && (
        <div style={{ marginTop: 4, fontSize: 12, color: palette.textMuted }}>Phiếu sinh lúc {formatDateTime(view.doc.generatedAt)}</div>
      )}
    </div>
  );
}
