import { Alert, Button, Card, Spin, Typography } from "antd";
import { palette } from "../theme";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError, request } from "../api/http/client";
import { formatVnd } from "../lib/reportFormat";

type Activation = { businessName: string; representativeEmail: string; approvedPlan: { name: string; code: string; monthlyPrice: string | number }; expiresAt: string; trialAvailable: boolean; activationMode: "TRIAL" | "PAID" | "LEGACY" };
type MailStatus = "SENT" | "PENDING" | "FAILED";
type Checkout = { emailStatus?: MailStatus; id: string; checkoutUrl: string | null; status: "PENDING" | "PAID" | "FAILED" | "NEEDS_REVIEW"; reviewReason?: string | null };

export default function ActivationScreen() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const checkoutId = params.get("checkout");
  const [activation, setActivation] = useState<Activation>();
  const [checkout, setCheckout] = useState<Checkout>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mailStatus, setMailStatus] = useState<MailStatus>();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setError("Liên kết kích hoạt không hợp lệ."); setLoading(false); return; }
    let active = true;
    const load = async () => {
      try {
        if (checkoutId) {
          const state = await request<Checkout>(`/registration-applications/activation/checkouts/${checkoutId}?token=${encodeURIComponent(token)}`, { anonymous: true });
          if (!active) return;
          setCheckout(state);
          setMailStatus(state.emailStatus);
          if (state.status === "PAID") { setDone(true); setLoading(false); return; }
          if (state.status === "NEEDS_REVIEW") return;
        }
        const details = await request<Activation>(`/registration-applications/activation?token=${encodeURIComponent(token)}`, { anonymous: true });
        if (active) setActivation(details);
      } catch { if (active) setError("Liên kết đã hết hạn hoặc không còn hiệu lực. Vui lòng liên hệ bộ phận hỗ trợ."); }
      finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [token, checkoutId]);

  useEffect(() => {
    if (!checkoutId || !token || done || checkout?.status !== "PENDING") return;
    const timer = window.setInterval(async () => {
      try {
        const state = await request<Checkout>(`/registration-applications/activation/checkouts/${checkoutId}?token=${encodeURIComponent(token)}`, { anonymous: true });
        setCheckout(state);
        setMailStatus(state.emailStatus);
        if (state.status === "PAID") setDone(true);
      } catch { /* Giữ trạng thái hiện tại khi mạng chập chờn. */ }
    }, 4000);
    return () => window.clearInterval(timer);
  }, [checkoutId, token, done, checkout?.status]);

  const chooseTrial = async () => {
    setBusy(true); setError("");
    try {
      const result = await request<{ emailStatus?: MailStatus }>("/registration-applications/activation/trial", { method: "POST", body: { token }, anonymous: true });
      setMailStatus(result?.emailStatus);
      setDone(true);
    } catch { setError("Không kích hoạt được gói dùng thử. Vui lòng tải lại trang hoặc liên hệ hỗ trợ."); }
    finally { setBusy(false); }
  };

  const choosePaid = async () => {
    setBusy(true); setError("");
    try {
      const result = await request<Checkout>("/registration-applications/activation/checkout", { method: "POST", body: { token }, anonymous: true });
      if (!result.checkoutUrl) throw new Error("Missing checkout URL");
      window.location.assign(result.checkoutUrl);
    } catch (error) { setError(error instanceof ApiError && error.status === 409 ? error.message : "Không tạo được liên kết PayOS. Vui lòng thử lại sau."); setBusy(false); }
  };

  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: palette.paper }}>
    <Card style={{ width: "min(100%, 520px)", borderRadius: 16 }}>
      <Typography.Title level={3}>Kích hoạt Smart F&B</Typography.Title>
      {loading ? <Spin /> : done ? <Alert type="success" showIcon message="Doanh nghiệp đã được kích hoạt" description={<span>{mailStatus === "SENT" ? "Email đặt mật khẩu Brand Manager đã được gửi." : mailStatus === "FAILED" ? "Chưa gửi được email đặt mật khẩu. Vui lòng liên hệ hỗ trợ để nhận link mới." : "Email đặt mật khẩu đang chờ gửi."} Sau khi đặt mật khẩu, bạn có thể <Link to="/login">đăng nhập</Link>.</span>} /> : <>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {checkout?.status === "NEEDS_REVIEW" && <Alert type="warning" showIcon message="Hệ thống đã ghi nhận khoản thu và đang đối soát" description="Vui lòng liên hệ hỗ trợ. Không thanh toán lại." />}
        {activation && <>
          <Typography.Paragraph><strong>{activation.businessName}</strong><br />Email Brand Manager: {activation.representativeEmail}</Typography.Paragraph>
          <Typography.Paragraph>Gói đã duyệt: <strong>{activation.approvedPlan.name}</strong>{activation.activationMode !== "TRIAL" && <> · {formatVnd(Number(activation.approvedPlan.monthlyPrice))}/tháng</>}</Typography.Paragraph>
          <Typography.Paragraph type="secondary">{activation.activationMode === "TRIAL" ? "Kích hoạt gói dùng thử miễn phí. Sau đó bạn sẽ nhận email đặt mật khẩu Brand Manager." : "Thanh toán kỳ đầu qua PayOS. Sau khi PayOS xác nhận, hệ thống sẽ gửi email đặt mật khẩu Brand Manager."}</Typography.Paragraph>
          {activation.trialAvailable && <Button block type={activation.activationMode === "TRIAL" ? "primary" : "default"} loading={busy} disabled={checkout?.status === "PENDING" || checkout?.status === "NEEDS_REVIEW"} onClick={() => void chooseTrial()} style={{ marginBottom: 10 }}>Kích hoạt dùng thử 14 ngày</Button>}
          {activation.activationMode !== "TRIAL" && <Button type="primary" block loading={busy} disabled={checkout?.status === "NEEDS_REVIEW"} onClick={() => void choosePaid()}>Thanh toán tháng đầu qua PayOS</Button>}
          {checkout?.status === "PENDING" && <Alert type="info" showIcon style={{ marginTop: 16 }} message="Đang chờ PayOS xác nhận thanh toán" description={checkout.checkoutUrl ? <a href={checkout.checkoutUrl}>Mở lại trang thanh toán</a> : undefined} />}
        </>}
      </>}
    </Card>
  </main>;
}
