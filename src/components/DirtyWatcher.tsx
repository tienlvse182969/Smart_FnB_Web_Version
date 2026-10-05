import { useEffect } from "react";
import { onUserEdit } from "../lib/dirtyGuard";

/** Gắn một lần trong `RoleLayout`: theo dõi người dùng nhập liệu trong hộp thoại/ngăn kéo để nút Thử lại biết có form đang nhập dở (xem `lib/dirtyGuard.ts`). */
export default function DirtyWatcher() {
  useEffect(() => {
    const events = ["input", "change", "click"] as const;
    events.forEach((name) => document.addEventListener(name, onUserEdit, true));
    return () => events.forEach((name) => document.removeEventListener(name, onUserEdit, true));
  }, []);
  return null;
}
