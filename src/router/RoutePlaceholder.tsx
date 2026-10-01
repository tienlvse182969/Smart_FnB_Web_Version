import { EmptyState } from "../components/bits";

/**
 * Màn hình chưa có: ghi mã use case và tên theo đặc tả v9 mục 14 để nhóm biết
 * chỗ này còn thiếu gì. `code` có thể nối nhiều mã bằng " · ".
 */
export default function RoutePlaceholder({ code, title }: { code: string; title: string }) {
  return <EmptyState title={`${code} — ${title}`} />;
}
