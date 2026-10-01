import { Col, Row } from "antd";
import Kpis from "./Kpis";
import TenantsTable from "./TenantsTable";
import SignupRequests from "./SignupRequests";

/** Tổng quan của Platform Admin: số liệu gói + doanh nghiệp + hồ sơ chờ duyệt. */
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
