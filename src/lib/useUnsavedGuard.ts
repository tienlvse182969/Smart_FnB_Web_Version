import { useEffect } from "react";

/** Nội dung hỏi khi rời trang/đóng khung còn thay đổi chưa lưu. */
export const UNSAVED_PROMPT = "Còn thay đổi chưa lưu. Rời đi sẽ mất các thay đổi này.";

/**
 * Cảnh báo của trình duyệt khi đóng/tải lại tab lúc `dirty` = true. Việc đóng khung (Drawer/Modal) và chuyển trang trong ứng dụng
 * do nơi dùng tự hỏi bằng `modal.confirm` + `UNSAVED_PROMPT`.
 */
export function useUnsavedGuard(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}
