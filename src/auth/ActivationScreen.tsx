import { Alert, Button, Card, Spin, Typography } from "antd";
import { palette } from "../theme";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { request } from "../api/http/client";
import { formatVnd } from "../lib/reportFormat";

type Activation = { businessName: string; representativeEmail: string; approvedPlan: { name: string; code: string; monthlyPrice: string | number }; expiresAt: string; trialAvailable: boolean };
type Checkout = { id: string; checkoutUrl: string | null; status: "PENDING" | "PAID" | "FAILED" | "NEEDS_REVIEW"; reviewReason?: string | null };

export default function ActivationScreen() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const checkoutId = params.get("checkout");
  const [activation, setActivation] = useState<Activation>();
  const [checkout, setCheckout] = useState<Checkout>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
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
          if (state.status === "PAID") { setDone(true); setLoading(false); return; }
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
        if (state.status === "PAID") setDone(true);
      } catch { /* Giữ trạng thái hiện tại khi mạng chập chờn. */ }
    }, 4000);
    return () => window.clearInterval(timer);
  }, [checkoutId, token, done, checkout?.status]);

  const chooseTrial = async () => {
    setBusy(true); setError("");
    try {
      await request("/registration-applications/activation/trial", { method: "POST", body: { token }, anonymous: true });
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
    } catch { setError("Không tạo được liên kết PayOS. Vui lòng thử lại sau."); setBusy(false); }
  };

  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: palette.paper }}>
    <Card style={{ width: "min(100%, 520px)", borderRadius: 16 }}>
      <Typography.Title level={3}>Kích hoạt Smart F&B</Typography.Title>
      {loading ? <Spin /> : done ? <Alert type="success" showIcon message="Doanh nghiệp đã được kích hoạt" description={<span>Email thiết lập mật khẩu Owner đã được gửi. Sau khi đặt mật khẩu, bạn có thể <Link to="/login">đăng nhập</Link>.</span>} /> : <>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {activation && <>
          <Typography.Paragraph><strong>{activation.businessName}</strong><br />Email Owner: {activation.representativeEmail}</Typography.Paragraph>
          <Typography.Paragraph>Gói được duyệt: <strong>{activation.approvedPlan.name}</strong> · {formatVnd(Number(activation.approvedPlan.monthlyPrice))}/tháng</Typography.Paragraph>
          <Typography.Paragraph type="secondary">Chọn một cách kích hoạt. Tài khoản Owner được tạo sau khi xác nhận lựa chọn.</Typography.Paragraph>
          {activation.trialAvailable && <Button block disabled={busy || checkout?.status === "PENDING"} onClick={() => void chooseTrial()} style={{ marginBottom: 10 }}>Dùng thử Basic 14 ngày</Button>}
          <Button type="primary" block loading={busy} onClick={() => void choosePaid()}>Thanh toán tháng đầu qua PayOS</Button>
          {checkout?.status === "PENDING" && <Alert type="info" showIcon style={{ marginTop: 16 }} message="Đang chờ PayOS xác nhận thanh toán" description={checkout.checkoutUrl ? <a href={checkout.checkoutUrl}>Mở lại trang thanh toán</a> : undefined} />}
          {checkout?.status === "NEEDS_REVIEW" && <Alert type="warning" showIcon style={{ marginTop: 16 }} message="Thanh toán cần được kiểm tra" description="Vui lòng liên hệ hỗ trợ, không thanh toán lại." />}
        </>}
      </>}
    </Card>
  </main>;
}
