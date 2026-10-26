import { App, Alert, Button, Card, Progress, Skeleton, Tag } from "antd";

import { Check, X } from "lucide-react";

import { useEffect, useState } from "react";

import { adminApi, showApiError } from "../../api";

import { platformBillingApi } from "../../api/platformBilling";

import { SectionTitle } from "../../components/bits";

import { formatDateVN } from "../../lib/reportFormat";

import { formatVnd } from "../../lib/reportFormat";

import { useTrialState } from "../../plan/planClock";
import { TRIAL_PLAN_NAME, TRIAL_PLAN_NOTE, isTrialCode } from "../../plan/trial";
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

  aiAssistant: "Trợ lý AI",
};

/** Cờ BE thật sự trả trên gói (`plan-quota.service.ts:23-24`); cờ AI chưa có ở BE (#30). */

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

  const trial = useTrialState();

  const [paidPlans, setPaidPlans] = useState<ServicePlan[]>([]);

  const [loadingPlans, setLoadingPlans] = useState(false);

  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null);

  const [checkoutStatus, setCheckoutStatus] = useState<
    "PENDING" | "PAID" | "FAILED" | "NEEDS_REVIEW" | null
  >(null);

  useEffect(() => {
    if (plan?.planCode !== "TRIAL") return;

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
  }, [chainId, message, reloadPlan]);

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

  // Dùng thử (lượt 10.2): tên "Dùng thử miễn phí" thay cho tên BE/tên cấp; hết hạn thì thẻ nâng cấp lên đầu trang và nổi bật nhất.
  const isTrial = isTrialCode(plan.planCode);
  const trialExpired = trial.kind === "expired";
  const upgradeAvailable = isTrial && plan.status !== "suspended";
  const expiryNote = plan.expiresAt ? ` · ${trialExpired ? "đã hết hạn" : "hết hạn"} ${formatDateVN(plan.expiresAt)}` : "";

  const upgradeCard = upgradeAvailable ?
        (
          <Card
            data-testid="myplan-upgrade"
            title={trialExpired ? "Nâng cấp để tiếp tục" : "Nâng cấp bất cứ lúc nào"}
            style={{ borderRadius: 14, ...(trialExpired ? { border: `2px solid ${palette.brandPrimary}`, boxShadow: `0 4px 16px color-mix(in srgb, ${palette.ink} 12%, transparent)` } : null) }}
            styles={{ body: { padding: 22 } }}
          >
            <p style={{ color: palette.textMuted, marginTop: 0 }}>
              {trialExpired
                ? "Thời gian dùng thử đã hết nên doanh nghiệp đang ở chế độ chỉ đọc; dữ liệu vẫn được giữ. Sau khi PayOS xác nhận thanh toán, gói trả phí bắt đầu ngay và bạn thay đổi dữ liệu được trở lại."
                : "Bạn không cần chờ hết thời gian dùng thử. Sau khi PayOS xác nhận thanh toán, gói trả phí bắt đầu ngay và phần ngày dùng thử còn lại sẽ không được cộng dồn."}
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
        )
  : null;

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
                ? "Thanh toán đã được PayOS xác nhận; gói trả phí đã kích hoạt."
                : checkoutStatus === "NEEDS_REVIEW"
                  ? "PayOS đã báo có tiền nhưng giao dịch cần đối soát. Vui lòng liên hệ quản trị SmartFnB, không thanh toán lại."
                  : checkoutStatus === "FAILED"
                    ? "Không thể hoàn tất thanh toán. Vui lòng thử lại."
                    : "Đang chờ PayOS xác nhận thanh toán. Chỉ chuyển trang trở lại chưa có nghĩa là đã trả tiền."
            }
          />
        )}
        {trialExpired && upgradeCard}
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
            {isTrial ? TRIAL_PLAN_NAME : plan.planName}
          </div>
          {isTrial && (
            <div data-testid="myplan-trial-note" style={{ fontSize: 13, color: palette.textMuted, margin: "-8px 0 14px" }}>
              {TRIAL_PLAN_NOTE}
              {expiryNote}
            </div>
          )}
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

        {!trialExpired && upgradeCard}

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

        {!isTrial && (
          <div
            data-testid="myplan-contact"
            style={{ fontSize: 13.5, color: palette.textMuted }}
          >
            {PLAN_CONTACT_TEXT}
          </div>
        )}
      </div>
    </div>
  );
}
