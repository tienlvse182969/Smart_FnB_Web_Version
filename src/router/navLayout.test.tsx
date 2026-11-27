/** Sidebar mọi vai trò theo cùng một kiểu với Brand Manager: vài mục đứng riêng + nhóm xổ ra theo chủ đề, cùng tên nhóm. */
import { describe, expect, it } from "vitest";
import { NAV_GROUPS, roleRoutes, type WebRole } from "./routeConfig";

/** Thanh bên như RoleLayout dựng: mục đứng riêng theo nhãn, nhóm thành "Nhãn ▾ [con…]". */
function sidebar(role: WebRole): (string | [string, string[]])[] {
  const groups = NAV_GROUPS[role] ?? {};
  const out: (string | [string, string[]])[] = [];
  const seen: Record<string, [string, string[]]> = {};
  for (const d of roleRoutes[role].filter((r) => r.nav !== false)) {
    const g = d.group ? groups[d.group] : undefined;
    if (!g) {
      out.push(d.label);
      continue;
    }
    if (!seen[d.group!]) out.push((seen[d.group!] = [g.label, []]));
    seen[d.group!][1].push(d.label);
  }
  return out;
}

describe("sidebar thống nhất giữa các vai trò", () => {
  it("Brand Manager (mẫu)", () => {
    expect(sidebar("owner")).toEqual([
      "Tổng quan",
      "Chi nhánh",
      "Đơn hàng",
      ["Thực đơn", ["Món & danh mục", "Tuỳ chọn", "Topping", "Combo", "Giá theo chi nhánh", "Nhập từ ảnh"]],
      ["Nhân sự", ["Tài khoản quản lý", "Yêu cầu đặt lại mật khẩu"]],
      ["Thương hiệu", ["Nhận diện", "Áp phích", "Liên kết PayOS"]],
      "Gói dịch vụ",
    ]);
  });

  it("Store Manager: Tổng quan, Chi nhánh ▾, Đơn hàng ▾, Sổ giao dịch, Thực đơn ▾, Nhân viên", () => {
    expect(sidebar("manager")).toEqual([
      "Tổng quan",
      ["Chi nhánh", ["Thông tin chi nhánh", "Quầy và máy in"]],
      ["Đơn hàng", ["Tra cứu đơn", "Đơn cần xử lý", "Duyệt hoàn tiền"]],
      "Sổ giao dịch",
      ["Thực đơn", ["Món tại chi nhánh", "Bảng giá chi nhánh"]],
      "Nhân viên",
    ]);
  });

  it("Admin: Tổng quan, Doanh thu ▾, Khách hàng ▾, Gói dịch vụ, Nhân sự ▾", () => {
    expect(sidebar("admin")).toEqual([
      "Tổng quan",
      ["Doanh thu", ["Doanh thu nền tảng", "Hoá đơn thuê bao"]],
      ["Khách hàng", ["Hồ sơ đăng ký", "Doanh nghiệp"]],
      "Gói dịch vụ",
      ["Nhân sự", ["Platform Staff", "Yêu cầu đặt lại mật khẩu"]],
    ]);
  });

  it("Platform Staff: Khách hàng ▾, Gói dịch vụ, Yêu cầu đặt lại mật khẩu", () => {
    expect(sidebar("platform-staff")).toEqual([["Khách hàng", ["Hồ sơ đăng ký", "Doanh nghiệp"]], "Gói dịch vụ", "Yêu cầu đặt lại mật khẩu"]);
  });

  it("mọi mục có nhóm đều trỏ tới nhóm đã khai báo; nhóm cùng chủ đề cùng tên ở mọi vai trò", () => {
    for (const role of Object.keys(roleRoutes) as WebRole[])
      for (const r of roleRoutes[role]) if (r.group) expect(NAV_GROUPS[role]?.[r.group], `${role}/${r.path}`).toBeTruthy();
    expect(NAV_GROUPS.manager!.menu.label).toBe(NAV_GROUPS.owner!.menu.label);
    expect(NAV_GROUPS.admin!.staff.label).toBe(NAV_GROUPS.owner!.staff.label);
  });
});
