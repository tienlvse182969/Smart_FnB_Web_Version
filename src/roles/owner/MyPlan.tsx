import { App, Alert, Button, Card, InputNumber, Progress, Select, Skeleton, Tag } from "antd";

import { Check, X } from "lucide-react";

import { useEffect, useState } from "react";

import { adminApi, showApiError } from "../../api";

import { platformBillingApi } from "../../api/platformBilling";
import { subscriptionScheduleApi, type NextInvoicePreview, type SubscriptionInvoice } from "../../api/subscriptionSchedule";

import { SectionTitle } from "../../components/bits";

import { formatDateVN } from "../../lib/reportFormat";

import { formatVnd } from "../../lib/reportFormat";

import { usePlan } from "../../plan/usePlan";

import { useAppStore } from "../../store";

import { palette } from "../../theme";

import type {
  FeatureKey,
  PlanStatus,
  QuotaResource,
  ServicePlan,
} from "../../types";

/** Dòng liên hệ (quyết định 37): không có nút gia hạn hay đổi gói, BR-10. */

export const PLAN_CONTACT_TEXT =
  "Liên hệ quản trị nền tảng để đổi gói hoặc gia hạn.";

/** Tên tính năng theo bảng gói của đặc tả v9 mục 13.1 (`Smart-FnB-Dac-ta-v9.md:1214-1226`). Mọi khoá của `FeatureKey` phải có mặt. */

export const FEATURE_LABEL: Record<FeatureKey, string> = {
  branding: "Nhận diện thương hiệu",

  multiBranchCompare: "So sánh đa chi nhánh",
};

/** Cờ BE thật sự trả trên gói (`plan-quota.service.ts:23-24`); BE chỉ có 2 cờ này (đặc tả 13.1). */

const BACKEND_FLAGS: FeatureKey[] = ["branding", "multiBranchCompare"];

const RESOURCE_LABEL: Record<QuotaResource, string> = {
  branches: "Chi nhánh",
  accounts: "Tài khoản",
};

/** Nhãn đủ giá trị enum `BusinessSubscriptionStatus` của BE (`prisma/schema.prisma:217-221`: ACTIVE, SUSPENDED, EXPIRED), quyết định 52. */

export const STATUS_LABEL: Record<PlanStatus, string> = {
  active: "Đang hoạt động",
  suspended: "Tạm ngưng",
  expired: "Đã hết hạn",
};

const STATUS_COLOR: Record<PlanStatus, string> = {
  active: "success",
  suspended: "warning",
  expired: "error",
};

/**
 * "Gói của tôi" (OW-10, đặc tả `:309`): tên gói, trạng thái, ngày hết hạn (giờ Việt Nam, dd/MM/yyyy), hạn mức đã dùng/tối đa, tính năng có và chưa có.
 * Dữ liệu THẬT từ BE `de4f55c` (quyết định 52). Không có nút gia hạn/đổi gói và không so sánh các gói (quyết định 37, 39). Gói không còn ACTIVE đi
 * vào cơ chế chỉ đọc có sẵn (`usePlan().isExpired`, banner `ReadOnlyBanner`), màn này chỉ hiện nhãn trạng thái (quyết định 55). Dữ liệu lấy từ gói
 * đã nạp cùng phạm vi làm việc, nên lỗi đọc hiện ở màn lỗi nạp khu vực (có nút Thử lại), không phải ở màn này.
 */

export default function MyPlan() {
  const { plan, loading } = usePlan();

  const { message } = App.useApp();

  const chainId = useAppStore((state) => state.chainId);

  const reloadPlan = useAppStore((state) => state.reloadPlan);

  const [paidPlans, setPaidPlans] = useState<ServicePlan[]>([]);

  const [loadingPlans, setLoadingPlans] = useState(false);

  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null);
  const [nextPreview, setNextPreview] = useState<NextInvoicePreview | null>(null);
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [selectedNextPlan, setSelectedNextPlan] = useState<string>();
  const [extraBranches, setExtraBranches] = useState(0);
  const [accountPacks, setAccountPacks] = useState(0);
  const [scheduleBusy, setScheduleBusy] = useState(false);

  const [checkoutStatus, setCheckoutStatus] = useState<
    "PENDING" | "PAID" | "FAILED" | "NEEDS_REVIEW" | null
  >(null);

  useEffect(() => {
    if (!plan?.planCode) return;

    let cancelled = false;

    setLoadingPlans(true);

    adminApi
      .listPublicPlans()

      .then((plans) => {
        if (!cancelled)
          setPaidPlans(
            plans.filter(
              (item) =>
                item.isActive && item.code !== "TRIAL" && item.monthlyPrice > 0,
            ),
          );
      })

      .catch((error) => {
        if (!cancelled)
          showApiError(message.error, error, "Không tải được các gói nâng cấp");
      })

      .finally(() => {
        if (!cancelled) setLoadingPlans(false);
      });

    return () => {
      cancelled = true;
    };
  }, [plan?.planCode, message]);

  useEffect(() => {
    if (!chainId || !plan?.planCode || plan.planCode === "TRIAL" || plan.source.features !== "real") return;
    let cancelled = false;
    Promise.all([subscriptionScheduleApi.preview(chainId), subscriptionScheduleApi.invoices(chainId)])
      .then(([preview, rows]) => {
        if (cancelled) return;
        setNextPreview(preview);
        setInvoices(rows);
        setSelectedNextPlan(preview.plan.id);
        setExtraBranches(preview.extraBranches);
        setAccountPacks(preview.accountPacks);
      })
      .catch((error) => { if (!cancelled) showApiError(message.error, error, "Không tải được kỳ thuê bao tiếp theo"); });
    return () => { cancelled = true; };
  }, [chainId, plan?.planCode, message]);

  const saveSchedule = async (mode: "plan" | "addons" | "clear") => {
    if (!chainId) return;
    setScheduleBusy(true);
    try {
      const preview = mode === "plan" && selectedNextPlan
        ? await subscriptionScheduleApi.putPlan(chainId, selectedNextPlan)
        : mode === "addons"
          ? await subscriptionScheduleApi.putAddons(chainId, extraBranches, accountPacks)
          : await subscriptionScheduleApi.clearPlan(chainId);
      setNextPreview(preview);
      setSelectedNextPlan(preview.plan.id);
      setExtraBranches(preview.extraBranches);
      setAccountPacks(preview.accountPacks);
      setInvoices(await subscriptionScheduleApi.invoices(chainId));
      await reloadPlan();
      message.success("Đã lưu đăng ký cho kỳ tiếp theo");
    } catch (error) { showApiError(message.error, error, "Không lưu được đăng ký kỳ tới"); }
    finally { setScheduleBusy(false); }
  };

  useEffect(() => {
    if (!chainId) return;

    const checkoutId = new URLSearchParams(window.location.search).get(
      "checkout",
    );

    if (!checkoutId) return;

    let cancelled = false;

    let attempts = 0;

    const poll = async () => {
      try {
        const checkout = await platformBillingApi.getCheckout(
          chainId,
          checkoutId,
        );

        if (cancelled) return;

        setCheckoutStatus(checkout.status);

        if (checkout.status === "PAID") {
          await reloadPlan();
          if (plan?.planCode !== "TRIAL") {
            const [preview, rows] = await Promise.all([
              subscriptionScheduleApi.preview(chainId),
              subscriptionScheduleApi.invoices(chainId),
            ]);
            if (!cancelled) {
              setNextPreview(preview);
              setInvoices(rows);
            }
          }

          window.history.replaceState({}, "", window.location.pathname);
        } else if (checkout.status === "PENDING" && ++attempts < 20) {
          timer = window.setTimeout(() => void poll(), 3000);
        }
      } catch (error) {
        if (!cancelled)
          showApiError(
            message.error,
            error,
            "Không kiểm tra được trạng thái thanh toán",
          );
      }
    };

    let timer: number | undefined;

    void poll();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [chainId, message, reloadPlan, plan?.planCode]);

  const startCheckout = async (planId: string) => {
    if (!chainId) return;

    setCheckoutPlanId(planId);

    try {
      const checkout = await platformBillingApi.createCheckout(chainId, planId);

      if (!checkout.checkoutUrl)
        throw new Error("PayOS chưa trả về liên kết thanh toán");

      window.location.assign(checkout.checkoutUrl);
    } catch (error) {
      showApiError(message.error, error, "Không tạo được liên kết thanh toán");

      setCheckoutPlanId(null);
    }
  };

  if (!plan) {
    return (
      <div>
        <SectionTitle title="Gói của tôi" />
        {loading ? <Skeleton active paragraph={{ rows: 4 }} /> : null}
      </div>
    );
  }

  if (plan.noActivePlan) {
    return (
      <div>
        <SectionTitle title="Gói của tôi" />
        <Card
          data-testid="myplan-none"
          style={{ borderRadius: 14, maxWidth: 560 }}
          styles={{ body: { padding: 22 } }}
        >
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
            Không có gói đang hoạt động
          </div>
          <div
            data-testid="myplan-contact"
            style={{ fontSize: 13.5, color: palette.textMuted }}
          >
            {PLAN_CONTACT_TEXT}
          </div>
        </Card>
      </div>
    );
  }

  const fromBackend = plan.source.features === "real";

  return (
    <div>
      <SectionTitle
        title="Gói của tôi"
        sub="Theo dõi thời hạn dùng thử, hạn mức và nâng cấp gói dịch vụ"
      />
      <div style={{ display: "grid", gap: 16, maxWidth: 640 }}>
        {checkoutStatus && (
          <Alert
            showIcon
            type={
              checkoutStatus === "PAID"
                ? "success"
                : checkoutStatus === "FAILED" ||
                    checkoutStatus === "NEEDS_REVIEW"
                  ? "error"
                  : "info"
            }
            message={
              checkoutStatus === "PAID"
                ? plan.planCode === "TRIAL"
                  ? "Thanh toán đã được PayOS xác nhận; gói trả phí đã kích hoạt."
                  : "Thanh toán đã được PayOS xác nhận. Gói và hạn mức kỳ tới áp dụng từ ngày bắt đầu kỳ mới."
                : checkoutStatus === "NEEDS_REVIEW"
                  ? "PayOS đã báo có tiền nhưng giao dịch cần đối soát. Vui lòng liên hệ quản trị SmartFnB, không thanh toán lại."
                  : checkoutStatus === "FAILED"
                    ? "Không thể hoàn tất thanh toán. Vui lòng thử lại."
                    : "Đang chờ PayOS xác nhận thanh toán. Chỉ chuyển trang trở lại chưa có nghĩa là đã trả tiền."
            }
          />
        )}
        <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 22 } }}>
          <div
            style={{
              fontSize: 12.5,
              color: palette.textMuted,
              marginBottom: 4,
            }}
          >
            Gói đang dùng
          </div>
          <div
            data-testid="myplan-name"
            style={{ fontWeight: 700, fontSize: 20, marginBottom: 14 }}
          >
            {plan.planName}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "120px 1fr",
              rowGap: 8,
              fontSize: 13.5,
            }}
          >
            <span style={{ color: palette.textMuted }}>Trạng thái</span>
            <span data-testid="myplan-status">
              {plan.status ? (
                <Tag color={STATUS_COLOR[plan.status]} style={{ margin: 0 }}>
                  {STATUS_LABEL[plan.status]}
                </Tag>
              ) : (
                "—"
              )}
            </span>
            <span style={{ color: palette.textMuted }}>Hết hạn</span>
            <span data-testid="myplan-expiry">
              {formatDateVN(plan.expiresAt)}
            </span>
          </div>
        </Card>

        {plan.planCode !== "TRIAL" && plan.planId && plan.status !== "suspended" && <>
          <Card title="Đăng ký cho kỳ tiếp theo" style={{ borderRadius: 14 }}>
            {nextPreview && <p style={{ color: palette.textMuted }}>Áp dụng từ {formatDateVN(nextPreview.startsAt)}. Thanh toán sớm không mở hạn mức hoặc tính năng trước ngày này.</p>}
            {nextPreview?.paidUpcoming ? <Alert showIcon type="success" message={`Kỳ tiếp theo đã thanh toán; gói mới áp dụng từ ${formatDateVN(nextPreview.currentPeriodEndsAt)}`} /> : <>
              <div style={{ display: "grid", gap: 10 }}>
                <label>Gói kỳ tới</label>
                <Select value={selectedNextPlan} onChange={setSelectedNextPlan} options={paidPlans.map((item) => ({ value: item.id, label: `${item.name} · ${formatVnd(item.monthlyPrice)}/tháng` }))} />
                <Button loading={scheduleBusy} disabled={!selectedNextPlan || selectedNextPlan === nextPreview?.plan.id} onClick={() => void saveSchedule("plan")}>Đăng ký hoặc đổi gói kỳ tới</Button>
                {nextPreview?.plan.id !== plan.planId && <Button loading={scheduleBusy} onClick={() => void saveSchedule("clear")}>Huỷ đổi gói kỳ tới</Button>}
                <label>Thêm chi nhánh cho kỳ tới (mỗi chi nhánh kèm {nextPreview?.plan.extraBranchAccounts ?? 8} tài khoản)</label>
                <InputNumber min={0} max={Math.max(0, 10 - (nextPreview?.plan.maxBranches ?? 10))} value={extraBranches} onChange={(value) => setExtraBranches(value ?? 0)} style={{ width: "100%" }} />
                <label>Gói thêm 5 tài khoản cho kỳ tới (tối đa 4)</label>
                <InputNumber min={0} max={4} value={accountPacks} onChange={(value) => setAccountPacks(value ?? 0)} style={{ width: "100%" }} />
                <div>Tạm tính: <strong>{formatVnd((nextPreview?.plan.monthlyPrice ?? 0) + extraBranches * (nextPreview?.plan.extraBranchPrice ?? 0) + accountPacks * (nextPreview?.plan.extraAccountPackPrice ?? 0))}</strong>/tháng</div>
                <Button loading={scheduleBusy} onClick={() => void saveSchedule("addons")}>Lưu phần mua thêm kỳ tới</Button>
              </div>
              {nextPreview && <Alert showIcon type="info" style={{ marginTop: 12 }} message={`Đã đăng ký: ${nextPreview.plan.name} · ${nextPreview.branchLimit} chi nhánh · ${nextPreview.accountLimit} tài khoản · ${formatVnd(nextPreview.total)}/tháng`} />}
            </>}
          </Card>
          <Card title="Hóa đơn thuê bao" style={{ borderRadius: 14 }}>
            {invoices.length === 0 ? <p>Chưa có hóa đơn. Hóa đơn kỳ tới được lập khi còn 7 ngày tới hạn.</p> : invoices.map((invoice) => <div key={invoice.id} style={{ borderBottom: `1px solid ${palette.line}`, padding: "10px 0" }}>
              <strong>{invoice.planName}</strong> · {invoice.status === "PAID" ? "Đã thanh toán" : invoice.status === "CANCELLED" ? "Đã huỷ" : "Chưa thanh toán"}<br />
              Kỳ {formatDateVN(invoice.periodStartsAt)} – {formatDateVN(invoice.periodEndsAt)}
              {invoice.lines.map((line) => <div key={line.id ?? line.kind}>{line.description} × {line.quantity}: {formatVnd(line.amount)}</div>)}
              <strong>Tổng: {formatVnd(invoice.total)}</strong>
            </div>)}
            {nextPreview && !nextPreview.paidUpcoming && <Button type="primary" loading={checkoutPlanId !== null} disabled={new Date(nextPreview.currentPeriodEndsAt).getTime() - Date.now() > 7 * 86_400_000} onClick={() => void startCheckout(nextPreview.plan.id)} style={{ marginTop: 12 }}>Thanh toán kỳ tiếp theo qua PayOS · {formatVnd(nextPreview.total)}</Button>}
          </Card>
        </>}

        {plan.planCode === "TRIAL" && plan.status !== "suspended" && (
          <Card
            title="Nâng cấp bất cứ lúc nào"
            style={{ borderRadius: 14 }}
            styles={{ body: { padding: 22 } }}
          >
            <p style={{ color: palette.textMuted, marginTop: 0 }}>
              Bạn không cần chờ hết 14 ngày. Sau khi PayOS xác nhận thanh toán,
              gói trả phí bắt đầu ngay và phần ngày dùng thử còn lại sẽ không
              được cộng dồn.
            </p>
            {loadingPlans ? (
              <Skeleton active paragraph={{ rows: 2 }} />
            ) : paidPlans.length === 0 ? (
              <p>Hiện chưa có gói trả phí để chọn.</p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: 12,
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                }}
              >
                {paidPlans.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      border: `1px solid ${palette.neutral.border}`,
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 16 }}>
                      {item.name}
                    </div>
                    <div style={{ marginTop: 8, fontWeight: 700 }}>
                      {formatVnd(item.monthlyPrice)} / tháng
                    </div>
                    <div
                      style={{ margin: "8px 0 16px", color: palette.textMuted }}
                    >
                      {item.maxBranches} chi nhánh · {item.maxAccounts} tài
                      khoản
                    </div>
                    <Button
                      type="primary"
                      block
                      loading={checkoutPlanId === item.id}
                      disabled={
                        checkoutPlanId !== null && checkoutPlanId !== item.id
                      }
                      onClick={() => void startCheckout(item.id)}
                    >
                      Thanh toán nâng cấp
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        <Card
          title="Hạn mức"
          style={{ borderRadius: 14 }}
          styles={{ body: { padding: 22 } }}
        >
          {plan.limits.length === 0 ? (
            <div style={{ fontSize: 13.5, color: palette.textMuted }}>
              Chưa có dữ liệu hạn mức.
            </div>
          ) : (
            plan.limits.map((l) => {
              const full = l.limit > 0 && l.used >= l.limit;

              const percent =
                l.limit > 0
                  ? Math.min(100, Math.round((l.used / l.limit) * 100))
                  : 0;

              return (
                <div
                  key={l.resource}
                  data-testid={`myplan-limit-${l.resource}`}
                  style={{ marginBottom: 14 }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13.5,
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>
                      {RESOURCE_LABEL[l.resource]}
                    </span>
                    <span>
                      Đã dùng {l.used} / {l.limit}
                      {full && (
                        <Tag
                          data-testid={`myplan-limit-warn-${l.resource}`}
                          color="warning"
                          style={{ marginLeft: 8, marginRight: 0 }}
                        >
                          {l.used > l.limit ? "Vượt hạn mức" : "Đã hết hạn mức"}
                        </Tag>
                      )}
                    </span>
                  </div>
                  <Progress
                    percent={percent}
                    showInfo={false}
                    status={full ? "exception" : "normal"}
                  />
                </div>
              );
            })
          )}
        </Card>

        <Card
          title="Tính năng"
          style={{ borderRadius: 14 }}
          styles={{ body: { padding: 22 } }}
        >
          {(Object.keys(FEATURE_LABEL) as FeatureKey[]).map((key) => {
            const pending = fromBackend && !BACKEND_FLAGS.includes(key);

            const enabled = plan.features[key].enabled;

            return (
              <div
                key={key}
                data-testid={`myplan-feature-${key}`}
                data-enabled={pending ? "unknown" : String(enabled)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13.5,
                  marginBottom: 10,
                }}
              >
                {pending ? null : enabled ? (
                  <Check size={16} color={palette.success.text} />
                ) : (
                  <X size={16} color={palette.textSubtle} />
                )}
                <span style={{ fontWeight: 600 }}>{FEATURE_LABEL[key]}</span>
                <span style={{ color: palette.textMuted }}>
                  {pending
                    ? "Chưa có dữ liệu từ máy chủ (chờ BE #30)"
                    : enabled
                      ? "Có"
                      : "Chưa có"}
                </span>
              </div>
            );
          })}
        </Card>

      </div>
    </div>
  );
}
