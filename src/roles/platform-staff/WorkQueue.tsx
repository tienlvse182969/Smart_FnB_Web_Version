import { useCallback } from "react"
import { Button, Col, Row } from "antd"
import { Link } from "react-router-dom"
import { useReportSection } from "../../components/useReportSection"
import { platformStaffApi } from "../../api/platformStaff"
import { request } from "../../api/http/client"
import { modeOf } from "../../api/flags"

export default function WorkQueue({
  select,
}: {
  select: (status: "PENDING" | "APPROVED") => void
}) {
  const pending = useReportSection(
    useCallback(
      async () =>
        (
          await platformStaffApi.listRegistrations({
            status: "PENDING",
            limit: 1,
          })
        ).pagination.total,
      [],
    ),
  )
  const approved = useReportSection(
    useCallback(
      async () =>
        (await platformStaffApi.listAwaitingActivation({ limit: 1 })).pagination
          .total,
      [],
    ),
  )
  const resets = useReportSection(
    useCallback(
      async () =>
        modeOf("auth") === "mock"
          ? 0
          : (await request<{ count: number }>("/password-reset-requests/count"))
              .count,
      [],
    ),
  )
  return (
    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
      {([
        { title: "Hồ sơ chờ duyệt", state: pending, status: "PENDING" },
        { title: "Chờ kích hoạt", state: approved, status: "APPROVED" },
        { title: "Yêu cầu mật khẩu đang chờ", state: resets, status: null },
      ] as const).map(({ title, state, status }) => (
        <Col key={title} xs={24} md={8}>
          <div
            style={{
              border: "1px solid #d9dee0",
              borderRadius: 10,
              padding: 12,
            }}
          >
            {status ? (
              <Button type="link" onClick={() => select(status)}>
                {title}
              </Button>
            ) : (
              <Link to="/platform-staff/password-reset-requests?status=PENDING">
                {title}
              </Link>
            )}
            <div style={{ fontSize: 22, fontWeight: 600 }}>
              {state.error ? (
                <Button size="small" onClick={state.reload}>
                  Thử lại
                </Button>
              ) : (
                (state.data ?? "…")
              )}
            </div>
          </div>
        </Col>
      ))}
    </Row>
  )
}
