/**
 * "Đang nhập dở" dùng chung (5.8d): nút Thử lại ở thông báo lỗi đọc dựng lại màn đang mở (`RefreshBoundary`), nên form/hộp thoại nhập
 * dở sẽ mất. `ApiErrorBridge` gọi `hasDirtyForm()` trước khi làm mới; có thì hỏi "Nội dung đang nhập sẽ mất. Vẫn tải lại?".
 *
 * Hai đường đăng ký, cùng một sổ:
 *  1. Tự động cho hộp thoại và ngăn kéo (`DirtyWatcher`, gắn một lần trong `RoleLayout`): người dùng gõ/chọn trong một `.ant-modal`
 *     hoặc `.ant-drawer` đang mở là coi như nhập dở, hết khi nó đóng. Form mới trong hộp thoại/ngăn kéo KHÔNG cần làm gì.
 *  2. `useDirtyGuard(dirty)` cho form nằm ngay trong trang (không trong hộp thoại/ngăn kéo): truyền cờ "có thay đổi chưa lưu".
 */
import { useEffect, useId } from "react";

const explicit = new Set<string>();
const containers = new Set<Element>();

export function registerDirty(id: string): void {
  explicit.add(id);
}

export function unregisterDirty(id: string): void {
  explicit.delete(id);
}

/** Đánh dấu một hộp thoại/ngăn kéo đã bị chỉnh sửa; tự hết khi phần tử bị gỡ hoặc ẩn. */
export function markContainerDirty(el: Element): void {
  containers.add(el);
}

const isVisible = (el: Element) => el.getClientRects().length > 0;

export function hasDirtyForm(): boolean {
  if (explicit.size > 0) return true;
  for (const el of [...containers]) {
    if (!el.isConnected) {
      containers.delete(el);
      continue;
    }
    if (isVisible(el)) return true;
    containers.delete(el); // đã đóng (ẩn) = không còn dở
  }
  return false;
}

/** Chỉ cho test. */
export function resetDirtyGuard(): void {
  explicit.clear();
  containers.clear();
}

/** Đăng ký form trong trang là "đang nhập dở" khi `dirty` đúng; gỡ khi hết dirty hoặc khi rời màn. */
export function useDirtyGuard(dirty: boolean): void {
  const id = useId();
  useEffect(() => {
    if (!dirty) return;
    registerDirty(id);
    return () => unregisterDirty(id);
  }, [dirty, id]);
}

/** Sự kiện của người dùng làm thay đổi nội dung một ô nhập (antd phát `input`/`change`; chọn trong Select, công tắc… chỉ phát click). */
const CHANGE_TARGETS = ".ant-select-item-option, .ant-switch, .ant-radio-wrapper, .ant-checkbox-wrapper, .ant-picker-cell";
/** Khung của hộp thoại/ngăn kéo: antd 6 dùng `.ant-modal-container`, `.ant-drawer-section` (bản cũ `-content`). */
const CONTAINERS = ".ant-modal-container, .ant-modal-content, .ant-drawer-section, .ant-drawer-content";

export function onUserEdit(event: Event): void {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (event.type === "click" && !target.closest(CHANGE_TARGETS)) return;
  const container = target.closest(CONTAINERS);
  // Hộp xác nhận (Modal.confirm) không phải form.
  if (!container || container.closest(".ant-modal-confirm")) return;
  markContainerDirty(container);
}
