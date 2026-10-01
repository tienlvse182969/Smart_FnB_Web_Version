import { useEffect, useState } from "react";
import { Col, Row } from "antd";
import { Building2, CheckCircle2, Clock3 } from "lucide-react";
import { adminApi } from "../../api";
import { StatCard } from "../../components/bits";

/** Giới hạn của BE (`limit` tối đa 100). */
const MAX_PAGE = 100;

/**
 * Đếm bằng `pagination.total` — không tải cả danh sách. Hồ sơ chờ duyệt lọc thẳng theo `status=PENDING`.
 * TODO(BE): `/admin/businesses` chưa có bộ lọc trạng thái nên số "tạm ngưng/hết hạn" đếm trong trang đầu (tối đa 100 doanh nghiệp mới nhất).
 */
export default function Kpis() {
  const [total, setTotal] = useState<number | null>(null);
  const [inactive, setInactive] = useState<number | null>(null);
  const [pending, setPending] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .listRegistrations({ page: 1, limit: 1, status: "PENDING" })
      .then((r) => !cancelled && setPending(r.pagination.total))
      .catch(() => undefined);
    adminApi
      .listBusinesses({ page: 1, limit: MAX_PAGE })
      .then((r) => {
        if (cancelled) return;
        setTotal(r.pagination.total);
        setInactive(r.items.filter((b) => b.subscription && b.subscription.state !== "active").length);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const show = (n: number | null) => (n === null ? "…" : n);
  const partial = total !== null && total > MAX_PAGE;

  return (
    <Row gutter={[16, 16]}>
      <Col xs={12} md={8}>
        <StatCard label="Doanh nghiệp thuê bao" value={show(total)} hint="tổng số doanh nghiệp" icon={<Building2 size={18} />} emphasis />
      </Col>
      <Col xs={12} md={8}>
        <StatCard
          label="Tạm ngưng / hết hạn"
          value={show(inactive)}
          hint={partial ? `trong ${MAX_PAGE} doanh nghiệp mới nhất` : "đang ở chế độ chỉ đọc"}
          icon={<Clock3 size={18} />}
        />
      </Col>
      <Col xs={12} md={8}>
        <StatCard label="Đăng ký chờ duyệt" value={show(pending)} hint="khởi tạo doanh nghiệp mới" icon={<CheckCircle2 size={18} />} />
      </Col>
    </Row>
  );
}
