import { useEffect } from "react";
import { App as AntApp, Button } from "antd";
import { describeApiError, isReadOnlyError, READ_ONLY_TEXT, setApiErrorHandler, translateBackendMessage, type ApiErrorEvent } from "../api";
import { useAppStore } from "../store";

const NETWORK_KEY = "api-network-error";

/**
 * Nối lỗi API (real lẫn mock) với thông báo trên màn hình, một chỗ duy nhất:
 *   403 → "không đủ quyền" · lỗi hạn mức/gói → thông báo vượt hạn mức · mạng → thông báo kèm nút Thử lại ·
 *   401 → đã làm mới phiên không được, đưa về /login (xử lý ở client HTTP).
 * Phải đặt bên trong <AntApp> để dùng được message/notification theo theme.
 */
export default function ApiErrorBridge() {
  const { message, notification } = AntApp.useApp();

  useEffect(() => {
    setApiErrorHandler((event: ApiErrorEvent) => {
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
          notification.error({
            key: NETWORK_KEY,
            message: "Mất kết nối máy chủ",
            description: describeApiError(event.error),
            duration: 0,
            btn: (
              <Button
                size="small"
                type="primary"
                onClick={async () => {
                  notification.destroy(NETWORK_KEY);
                  try {
                    await event.retry?.();
                    // Thao tác đọc đã chạy lại được: làm mới dữ liệu phạm vi để màn hình thoát trạng thái lỗi.
                    await useAppStore.getState().loadScope({ silent: true });
                    message.success("Đã kết nối lại");
                  } catch {
                    // Lỗi lần này sẽ được báo lại bởi lớp API nếu vẫn là lỗi mạng.
                  }
                }}
              >
                Thử lại
              </Button>
            ),
          });
          break;
      }
    });
    return () => setApiErrorHandler(null);
  }, [message, notification]);

  return null;
}
