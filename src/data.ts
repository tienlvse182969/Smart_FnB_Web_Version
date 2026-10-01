/** Hằng và hàm dùng chung còn lại sau khi gỡ dữ liệu mock v7. */

/** Thống nhất với types/auth.ts — "manager" là giá trị RoleKey duy nhất cho Branch Manager. */
export type RoleKey = "admin" | "owner" | "manager" | "waiter" | "kitchen";

export const roleMeta: Record<
  RoleKey,
  { label: string; scope: string }
> = {
  admin: { label: "Platform Admin", scope: "Nền tảng" },
  owner: { label: "Owner", scope: "Cơm Tấm Sài Gòn · Toàn chuỗi" },
  manager: { label: "Branch Manager", scope: "Cơm Tấm Sài Gòn · Q1" },
  waiter: { label: "Waiter", scope: "Chi nhánh Quận 1" },
  kitchen: { label: "Kitchen Staff", scope: "Trạm Bếp chính · Q1" },
};


export const money = (v: number) =>
  v.toLocaleString("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
