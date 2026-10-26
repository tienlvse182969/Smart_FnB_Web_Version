import { useEffect } from "react";
import { App as AntApp, Button } from "antd";
import { describeApiError, isReadOnlyError, planUpgradeHint, readOnlyText, setApiErrorHandler, setReadOnlyTextResolver, translateBackendMessage, type ApiErrorEvent } from "../api";
import { trialExpiredText } from "../plan/trial";
import { hasDirtyForm } from "../lib/dirtyGuard";
import { useAppStore } from "../store";

const NETWORK_KEY = "api-network-error";
const SERVER_KEY = "api-server-error";

/**
 * Nối lỗi API (real lẫn mock) với thông báo trên màn hình, một chỗ duy nhất:
 *   403 → "không đủ quyền" · lỗi hạn mức/gói → thông báo vượt hạn mức · mạng → thông báo kèm nút Thử lại ·
 *   401 → đã làm mới phiên không được, đưa về /login (xử lý ở client HTTP).
 * Phải đặt bên trong <AntApp> để dùng được message/notification theo theme.
 */
export default function ApiErrorBridge() {
  const { message, notification, modal } = AntApp.useApp();

  // Câu báo chỉ đọc của lớp API theo ngữ cảnh: gói dùng thử đã hết nói khác theo vai (lượt 10.2); còn lại `null` → câu mặc định.
  useEffect(() => {
    setReadOnlyTextResolver(() => {
      const { plan, currentUser } = useAppStore.getState();
      return trialExpiredText(plan, currentUser?.role);
    });
    return () => setReadOnlyTextResolver(null);
  }, []);

  useEffect(() => {
    setApiErrorHandler((event: ApiErrorEvent) => {
      // Đang nạp phạm vi làm việc: màn lỗi toàn trang (router/guards.tsx) đã nêu lỗi và có nút Thử lại, nên không bắn thêm thông báo nổi trùng.
      const scope = useAppStore.getState().scopeStatus;
      if ((scope === "loading" || scope === "error") && (event.kind === "network" || event.kind === "forbidden" || event.kind === "server")) return;
      switch (event.kind) {
        case "forbidden":
          message.warning({ key: "api-forbidden", content: describeApiError(event.error) });
          break;
        case "quota": {
          const show = () =>
            notification.warning({
              key: "api-quota-error",
              message: isReadOnlyError(event.error) ? "Chế độ chỉ đọc" : "Vượt hạn mức hoặc gói không hỗ trợ",
              description: isReadOnlyError(event.error) ? readOnlyText() : `${translateBackendMessage(event.error)} ${planUpgradeHint(event.error)}`.trim(),
              placement: "topRight",
            });
          // 403 chỉ đọc lúc đang ghi mà gói trong store còn `active` (hết hạn giữa chừng): nạp lại gói TRƯỚC khi hiện thông báo để câu theo đúng gói
          // (dùng thử đã hết nói khác), và để nhãn/banner đổi ngay. Chống lặp ở store; lỗi nạp không chặn thông báo.
          if (isReadOnlyError(event.error)) void useAppStore.getState().refreshPlanAfterReadOnly().then(show, show);
          else show();
          break;
        }
        case "unauthorized":
          message.error({ key: "api-unauthorized", content: describeApiError(event.error) });
          break;
        case "network":
        case "server": {
          // Chỉ lỗi ĐỌC mới tới đây (xem `reportApiError`). "Thử lại" làm mới màn đang mở (`RefreshBoundary` dựng lại màn), không gọi
          // lại một request rời; mỗi lần bấm = một lượt nạp của màn đó. Lỗi lại thì thông báo hiện lại, không tự lặp.
          const key = event.kind === "network" ? NETWORK_KEY : SERVER_KEY;
          notification.error({
            key,
            message: event.kind === "network" ? "Mất kết nối máy chủ" : "Máy chủ gặp sự cố",
            description: describeApiError(event.error),
            duration: 0,
            btn: event.canRetry ? (
              <Button
                size="small"
                type="primary"
                data-testid="api-error-retry"
                onClick={() => {
                  const refresh = () => {
                    notification.destroy(key);
                    useAppStore.getState().requestRefresh();
                  };
                  if (!hasDirtyForm()) return refresh();
                  // Nạp lại dựng lại màn nên form đang nhập dở sẽ mất: hỏi trước. Huỷ → không làm gì, form giữ nguyên, thông báo lỗi còn đó.
                  modal.confirm({
                    title: "Nội dung đang nhập sẽ mất. Vẫn tải lại?",
                    okText: "Tải lại",
                    cancelText: "Huỷ",
                    okButtonProps: { danger: true },
                    onOk: refresh,
                  });
                }}
              >
                Thử lại
              </Button>
            ) : undefined,
          });
          break;
        }
      }
    });
    return () => setApiErrorHandler(null);
  }, [message, notification, modal]);

  return null;
}
