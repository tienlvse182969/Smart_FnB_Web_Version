import { Col, Row } from "antd";
import Kpis from "./Kpis";
import RevenueChart from "./RevenueChart";

/** Tổng quan chi nhánh (BM-03) — hiện là placeholder chờ báo cáo cho Manager. */
export default function ManagerDashboard() {
  return (
    <>
      <Kpis />
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <RevenueChart />
        </Col>
      </Row>
    </>
  );
}
