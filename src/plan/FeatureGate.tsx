import type { ReactNode } from "react";
import { Card } from "antd";
import { Lock } from "lucide-react";
import { palette } from "../theme";
import type { FeatureKey } from "../types";
import { usePlan } from "./usePlan";

/** Tên tính năng hiển thị trên thẻ khoá. */
export const FEATURE_LABEL: Record<FeatureKey, string> = {
  branding: "Nhận diện thương hiệu",
  multiBranchCompare: "So sánh đa chi nhánh",
  aiAssistant: "Trợ lý AI",
};

interface FeatureGateProps {
  feature: FeatureKey;
  children: ReactNode;
  /** Thu gọn thẻ khoá để đặt xen giữa một màn hình (mặc định thẻ đầy đủ). */
  compact?: boolean;
}

/**
 * Gói có tính năng thì hiện `children`; không thì hiện thẻ khoá kèm tên gói cần nâng — KHÔNG ẩn hẳn
 * (đặc tả 13.2). Đây chỉ là lớp thứ hai; BE vẫn chặn khi gọi tính năng gói không có (BR-08).
 */
export default function FeatureGate({ feature, children, compact = false }: FeatureGateProps) {
  const { hasFeature, requiredTierLabel, planName } = usePlan();
  if (hasFeature(feature)) return <>{children}</>;

  const label = FEATURE_LABEL[feature];
  const required = requiredTierLabel(feature);
  return (
    <Card
      data-testid="feature-lock"
      style={{ borderRadius: 14, textAlign: "center" }}
      styles={{ body: { padding: compact ? 20 : 48 } }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: palette.paper,
          display: "grid",
          placeItems: "center",
          margin: "0 auto 14px",
        }}
      >
        <Lock size={20} color={palette.textMuted} />
      </div>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{label} chưa có trong gói của bạn</div>
      <div style={{ color: palette.textMuted, fontSize: 13.5, maxWidth: 440, margin: "0 auto", lineHeight: 1.6 }}>
        {required ? `Cần gói ${required} trở lên. ` : ""}
        {planName ? `Gói hiện tại: ${planName}. ` : ""}
        Liên hệ quản trị nền tảng để nâng gói; phí thuê bao thu ngoài hệ thống.
      </div>
    </Card>
  );
}
