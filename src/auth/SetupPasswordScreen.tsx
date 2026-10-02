import { useEffect, useState } from "react";
import { App, Button, Input } from "antd";
import { Check, KeyRound, UtensilsCrossed } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, authApi, showApiError } from "../api";
import { SETUP_TOKEN_INVALID, SETUP_TOKEN_MESSAGE } from "../api/modules/auth";
import { PASSWORD_RULES, failedPasswordRules } from "../api/modules/auth/passwordRules";
import { palette, onBrandAlpha } from "../theme";

/**
 * Trang công khai đặt mật khẩu từ link trong email: `/setup-password?token=…` (BE: `POST /auth/setup-password`).
 * Không sidebar, không đăng nhập. Token đọc một lần rồi xoá khỏi URL; không bao giờ ghi ra console hay log.
 * Luật mật khẩu lấy từ DTO của BE (`passwordRules.ts`), kèm ô nhập lại.
 */
export default function SetupPasswordScreen() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [token] = useState(() => new URLSearchParams(window.location.search).get("token")?.trim() || null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [tokenRejected, setTokenRejected] = useState(false);

  // Xoá token khỏi thanh địa chỉ/lịch sử ngay khi trang đã đọc xong (giữ state của router).
  useEffect(() => {
    if (window.location.search) window.history.replaceState(window.history.state, "", window.location.pathname);
  }, []);

  const failed = failedPasswordRules(password);
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = !!token && password.length > 0 && failed.length === 0 && confirm === password && !busy;

  const submit = async () => {
    if (!token || !canSubmit) return;
    setBusy(true);
    try {
      await authApi.setupPassword(token, password);
      navigate("/login", { replace: true, state: { notice: "Đã đặt mật khẩu. Hãy đăng nhập bằng mật khẩu mới." } });
    } catch (err) {
      if (err instanceof ApiError && err.code === SETUP_TOKEN_INVALID) setTokenRejected(true);
      else showApiError(message.error, err, "Không đặt được mật khẩu");
    } finally {
      setBusy(false);
    }
  };

  const problem = !token ? "Liên kết không hợp lệ." : tokenRejected ? SETUP_TOKEN_MESSAGE : null;

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)", background: palette.surface }}>
      <div style={{ background: palette.brandPrimary, color: palette.onBrand, padding: "56px 60px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: palette.surface, display: "grid", placeItems: "center" }}>
            <UtensilsCrossed size={22} color={palette.brandPrimary} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>Smart F&amp;B</div>
        </div>
        <div>
          <div style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.6 }}>Đặt mật khẩu cho tài khoản của bạn.</div>
          <p style={{ color: onBrandAlpha(60), fontSize: 15, lineHeight: 1.6, maxWidth: 420, marginTop: 18 }}>
            Liên kết trong email chỉ dùng được một lần và có thời hạn. Sau khi đặt xong bạn đăng nhập bằng mật khẩu mới.
          </p>
        </div>
        <div style={{ fontSize: 12.5, color: onBrandAlpha(40) }}>Thu ngân &amp; pha chế dùng ứng dụng tablet</div>
      </div>

      <div style={{ padding: "56px 56px", display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 520 }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>Đặt mật khẩu</div>

        {problem ? (
          <div data-testid="setup-problem" style={{ marginTop: 16 }}>
            <div style={{ color: palette.error.text, background: palette.error.bg, border: `1px solid ${palette.error.border}`, borderRadius: 10, padding: "12px 14px", fontSize: 14 }}>
              {problem}
              <div style={{ color: palette.textMuted, fontSize: 13, marginTop: 6 }}>Nhờ quản trị viên gửi lại email đặt mật khẩu nếu cần.</div>
            </div>
            <Link to="/login" data-testid="setup-to-login" style={{ display: "inline-block", marginTop: 16 }}>
              Về trang đăng nhập
            </Link>
          </div>
        ) : (
          <>
            <div style={{ color: palette.textMuted, fontSize: 14, marginTop: 4, marginBottom: 20 }}>Chọn mật khẩu mới cho tài khoản được mời qua email.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
              <Input.Password
                size="large"
                data-testid="setup-password"
                placeholder="Mật khẩu mới"
                autoComplete="new-password"
                value={password}
                maxLength={256}
                onChange={(e) => setPassword(e.target.value)}
                variant="filled"
              />
              <Input.Password
                size="large"
                data-testid="setup-confirm"
                placeholder="Nhập lại mật khẩu"
                autoComplete="new-password"
                value={confirm}
                maxLength={256}
                status={mismatch ? "error" : undefined}
                onChange={(e) => setConfirm(e.target.value)}
                onPressEnter={submit}
                variant="filled"
              />
            </div>
            {mismatch && (
              <div data-testid="setup-mismatch" style={{ color: palette.error.text, fontSize: 13, marginBottom: 8 }}>
                Hai mật khẩu không khớp.
              </div>
            )}
            <ul data-testid="setup-rules" style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "grid", gap: 4, fontSize: 13 }}>
              {PASSWORD_RULES.map((rule) => {
                const ok = rule.test(password);
                return (
                  <li key={rule.key} data-testid={`rule-${rule.key}`} data-ok={ok} style={{ display: "flex", alignItems: "center", gap: 6, color: ok ? palette.success.text : palette.textMuted }}>
                    <Check size={14} style={{ opacity: ok ? 1 : 0.25 }} />
                    {rule.label}
                  </li>
                );
              })}
            </ul>
            <Button type="primary" size="large" block loading={busy} disabled={!canSubmit} icon={<KeyRound size={18} />} onClick={submit} data-testid="setup-submit">
              Đặt mật khẩu
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
