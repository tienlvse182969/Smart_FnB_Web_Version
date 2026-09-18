import { App, Button, Card, Modal, Select } from "antd";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Plan, RegistrationRequest } from "../../types";
import { DEFAULT_PASSWORD } from "../../types";
import {
  approveRegistration,
  findDuplicateTaxCode,
  listPlans,
  listRegistrations,
  rejectRegistration,
} from "../../services";
import { SectionTitle } from "../../components/bits";

/** PA-01→PA-04: xử lý hồ sơ đăng ký — duyệt sinh Tenant + Branding + Owner, hoặc từ chối kèm lý do. */
export default function SignupRequests() {
  const { message, modal } = App.useApp();
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [duplicates, setDuplicates] = useState<Record<string, boolean>>({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | undefined>();

  const load = async () => {
    const [reqs, planList] = await Promise.all([listRegistrations(), listPlans()]);
    const pending = reqs.filter((r) => r.status === "pending");
    setRequests(pending);
    setPlans(planList);
    const dupChecks = await Promise.all(
      pending.map(async (r) => [r.id, (await findDuplicateTaxCode(r.taxCode, r.id)).length > 0] as const)
    );
    setDuplicates(Object.fromEntries(dupChecks));
  };

  useEffect(() => {
    load();
  }, []);

  const doApprove = async () => {
    if (!approvingId || !planId) return;
    try {
      const { tenant, ownerEmail } = await approveRegistration(approvingId, planId);
      modal.success({
        title: `Đã khởi tạo doanh nghiệp "${tenant.name}"`,
        content: (
          <div style={{ fontSize: 13.5, lineHeight: 1.8 }}>
            Tài khoản Owner (mock, chưa có email thật — hiện thẳng để đăng nhập):
            <div style={{ marginTop: 6 }}>
              Email: <b>{ownerEmail}</b>
              <br />
              Mật khẩu tạm: <b>{DEFAULT_PASSWORD}</b> (bắt đổi ở lần đăng nhập đầu)
            </div>
          </div>
        ),
      });
      setApprovingId(null);
      setPlanId(undefined);
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Không duyệt được hồ sơ");
    }
  };

  const doReject = async () => {
    if (!rejectingId) return;
    try {
      await rejectRegistration(rejectingId, rejectReason);
      message.success("Đã từ chối hồ sơ");
      setRejectingId(null);
      setRejectReason("");
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Không từ chối được");
    }
  };

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title="Đăng ký chờ duyệt"
        sub="Duyệt để khởi tạo doanh nghiệp, ví, nhận diện mặc định & tài khoản Owner"
      />
      {requests.length === 0 && (
        <div style={{ fontSize: 13, color: "#a1a1aa", padding: "24px 0", textAlign: "center" }}>
          Không có hồ sơ nào đang chờ duyệt.
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {requests.map((r) => (
          <div key={r.id} style={{ border: "1px solid var(--ant-color-border)", borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 600 }}>{r.businessName}</div>
              <span style={{ fontSize: 12, color: "#a1a1aa" }}>{new Date(r.submittedAt).toLocaleDateString("vi-VN")}</span>
            </div>
            <div style={{ fontSize: 12.5, color: "#71717a", margin: "4px 0 4px" }}>
              {r.contactName} · {r.contactEmail} · {r.contactPhone} · {r.estimatedBranches} chi nhánh dự kiến
            </div>
            <div style={{ fontSize: 12, color: "#a1a1aa", marginBottom: 8 }}>
              MST {r.taxCode} · {r.address}
            </div>
            {duplicates[r.id] && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#ad6800", background: "#fffbe6", border: "1px solid #ffe58f", borderRadius: 8, padding: "6px 10px", marginBottom: 10 }}>
                <AlertTriangle size={13} /> Mã số thuế trùng với một doanh nghiệp đã duyệt — kiểm tra trước khi duyệt.
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <Button
                type="primary"
                size="small"
                icon={<CheckCircle2 size={15} />}
                onClick={() => {
                  setApprovingId(r.id);
                  setPlanId(plans[0]?.id);
                }}
              >
                Duyệt
              </Button>
              <Button size="small" icon={<X size={15} />} onClick={() => setRejectingId(r.id)}>
                Từ chối
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={!!approvingId}
        onCancel={() => setApprovingId(null)}
        onOk={doApprove}
        okText="Duyệt & khởi tạo"
        title="Chọn gói dịch vụ"
      >
        <Select
          style={{ width: "100%" }}
          value={planId}
          onChange={setPlanId}
          options={plans.map((p) => ({ value: p.id, label: `${p.name} — ${p.monthlyPrice.toLocaleString("vi-VN")}đ/tháng` }))}
        />
      </Modal>

      <Modal
        open={!!rejectingId}
        onCancel={() => {
          setRejectingId(null);
          setRejectReason("");
        }}
        onOk={doReject}
        okText="Từ chối"
        okButtonProps={{ danger: true, disabled: !rejectReason.trim() }}
        title="Lý do từ chối"
      >
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Bắt buộc nhập lý do (BR-04)"
          rows={3}
          style={{ width: "100%", border: "1px solid var(--ant-color-border)", borderRadius: 8, padding: 10, font: "inherit" }}
        />
      </Modal>
    </Card>
  );
}
