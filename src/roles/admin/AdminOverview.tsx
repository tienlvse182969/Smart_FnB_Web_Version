import { Col, Row } from "antd";
import Kpis from "./Kpis";
import TenantsTable from "./TenantsTable";
import SignupRequests from "./SignupRequests";

/**
 * Tổng quan của Platform Admin: tình hình hiện tại và việc cần xử lý. Số liệu theo kỳ (doanh thu, MRR cuối kỳ,
 * chuyển đổi dùng thử) nằm ở màn Doanh thu nền tảng (PA-06), không lặp ở đây.
 */
export default function AdminOverview() {
  return (
    <>
      <Kpis />
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={15}>
          <TenantsTable />
        </Col>
        <Col xs={24} lg={9}>
          <SignupRequests />
        </Col>
      </Row>
    </>
  );
}
