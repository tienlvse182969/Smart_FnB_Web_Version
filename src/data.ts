/** Hằng và hàm dùng chung còn lại sau khi gỡ dữ liệu mock v7. */
import type { RoleKey } from "./types";

/** Nhãn và mô tả phạm vi chung của từng vai trò (không chứa tên doanh nghiệp/chi nhánh cụ thể). */
export const roleMeta: Record<RoleKey, { label: string; scope: string }> = {
  admin: { label: "Platform Admin", scope: "Nền tảng" },
  owner: { label: "Owner", scope: "Toàn chuỗi" },
  manager: { label: "Branch Manager", scope: "Một chi nhánh" },
  cashier: { label: "Cashier", scope: "Ứng dụng tablet" },
  barista: { label: "Barista", scope: "Ứng dụng tablet" },
};

export const money = (v: number) =>
  v.toLocaleString("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
