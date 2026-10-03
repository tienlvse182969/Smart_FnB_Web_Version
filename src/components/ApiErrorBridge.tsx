import { useEffect } from "react";
import { App as AntApp, Button } from "antd";
import { describeApiError, isReadOnlyError, READ_ONLY_TEXT, setApiErrorHandler, translateBackendMessage, type ApiErrorEvent } from "../api";
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

  useEffect(() => {
    setApiErrorHandler((event: ApiErrorEvent) => {
      // Đang nạp phạm vi làm việc: màn lỗi toàn trang (router/guards.tsx) đã nêu lỗi và có nút Thử lại, nên không bắn thêm thông báo nổi trùng.
      const scope = useAppStore.getState().scopeStatus;
      if ((scope === "loading" || scope === "error") && (event.kind === "network" || event.kind === "forbidden" || event.kind === "server")) return;
      switch (event.kind) {
        case "forbidden":
          message.warning({ key: "api-forbidden", content: describeApiError(event.error) });
          break;
        case "quota":
          notification.warning({
            key: "api-quota-error",
            message: isReadOnlyError(event.error) ? "Chế độ chỉ đọc" : "Vượt hạn mức hoặc gói không hỗ trợ",
            description: isReadOnlyError(event.error) ? READ_ONLY_TEXT : translateBackendMessage(event.error),
            placement: "topRight",
          });
          break;
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
