import type { ReactNode } from "react";
import { Button, Switch, Tooltip, type ButtonProps, type SwitchProps } from "antd";
import type { QuotaResource } from "../types";
import { useWriteGuard, type WriteGuard } from "./useReadOnly";

export interface ActionButtonProps extends ButtonProps {
  /**
   * Hạn mức mà thao tác tạo mới tiêu thụ ("branches" | "accounts"). Hết hạn mức thì nút tự khoá và báo lý do —
   * chỉ để báo sớm, BE vẫn chặn thật (BR-08).
   */
  consumes?: QuotaResource;
}

/**
 * Nút hành động ghi (tạo/sửa/xoá) dùng chung. Tự vô hiệu hoá kèm tooltip lý do khi doanh nghiệp ở chế độ chỉ đọc
 * (BR-09) hoặc khi hết hạn mức. Mọi nút ghi trong màn hình Owner/Manager dùng component này thay cho `Button`.
 */
export default function ActionButton({ consumes, disabled, children, ...rest }: ActionButtonProps) {
  const guard = useWriteGuard(consumes);
  const isDisabled = disabled || guard.disabled;
  return (
    <GuardTip guard={guard}>
      <Button {...rest} disabled={isDisabled}>
        {children}
      </Button>
    </GuardTip>
  );
}

/** Bọc điều khiển bị khoá bởi `WriteGuard` bằng tooltip lý do. Dùng chung cho nút và công tắc. */
export function GuardTip({ guard, children }: { guard: WriteGuard; children: ReactNode }) {
  if (!guard.disabled || !guard.reason) return <>{children}</>;
  // Điều khiển bị vô hiệu hoá không bắn sự kiện chuột nên Tooltip phải bọc ngoài bằng một phần tử khác.
  return (
    <Tooltip title={guard.reason}>
      <span style={{ display: "inline-block" }} data-testid="action-guard">
        {children}
      </span>
    </Tooltip>
  );
}

/** Công tắc ghi dùng chung cơ chế khoá của ActionButton (hết hạn gói → khoá kèm tooltip). */
export function ActionSwitch({ disabled, ...rest }: SwitchProps) {
  const guard = useWriteGuard();
  return (
    <GuardTip guard={guard}>
      <Switch {...rest} disabled={disabled || guard.disabled} />
    </GuardTip>
  );
}
