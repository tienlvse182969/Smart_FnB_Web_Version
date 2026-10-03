import { Fragment, type ReactNode } from "react";
import { useAppStore } from "../store";

/**
 * Dựng lại nội dung màn đang mở mỗi khi `refreshEpoch` đổi (nút "Thử lại" ở thông báo lỗi đọc). Đổi `key` làm mọi component bên trong
 * mount lại, nên các `useEffect` nạp dữ liệu chạy lại đúng một lượt. Đổi lại: trạng thái cục bộ của màn (ô tìm kiếm, bộ lọc) về ban đầu.
 * Dữ liệu giữ trong store (danh sách chi nhánh, món chi nhánh của Manager) KHÔNG nạp lại ở đây: chúng nạp ở bước vào khu vực.
 */
export default function RefreshBoundary({ children }: { children: ReactNode }) {
  const epoch = useAppStore((s) => s.refreshEpoch);
  return <Fragment key={epoch}>{children}</Fragment>;
}
