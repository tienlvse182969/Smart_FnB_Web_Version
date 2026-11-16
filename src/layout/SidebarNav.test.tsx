import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import SidebarNav, { type NavItem } from "./SidebarNav";

const nav: NavItem[] = [
  { key: "reports", label: "Tổng quan" },
  {
    key: "group:menu",
    label: "Thực đơn",
    children: [
      { key: "menu", label: "Món & danh mục" },
      { key: "menu/import", label: "Nhập từ ảnh", tag: "AI" },
    ],
  },
  {
    key: "group:staff",
    label: "Nhân sự",
    children: [
      { key: "accounts", label: "Tài khoản quản lý" },
      { key: "password-reset-requests", label: "Yêu cầu đặt lại mật khẩu", badge: 3 },
    ],
  },
];

describe("SidebarNav", () => {
  beforeEach(() => window.localStorage.clear());

  it("nhóm có mục con đang chọn tự mở; nhóm khác đóng", () => {
    render(<SidebarNav scope="owner" nav={nav} section="menu/import" onSelect={() => undefined} />);
    expect(screen.getByTestId("nav-group-group:menu").getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByTestId("nav-group-group:staff").getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText("Nhập từ ảnh")).toBeTruthy();
    expect(screen.queryByText("Tài khoản quản lý")).toBeNull();
    expect(screen.getByTestId("nav-menu/import").getAttribute("aria-current")).toBe("page");
  });

  it("mục cha là button, bấm để mở/đóng và nhớ trong localStorage", () => {
    const { unmount } = render(<SidebarNav scope="owner" nav={nav} section="reports" onSelect={() => undefined} />);
    const group = screen.getByTestId("nav-group-group:staff");
    expect(group.tagName).toBe("BUTTON");
    fireEvent.click(group);
    expect(group.getAttribute("aria-expanded")).toBe("true");
    unmount();
    render(<SidebarNav scope="owner" nav={nav} section="reports" onSelect={() => undefined} />);
    expect(screen.getByTestId("nav-group-group:staff").getAttribute("aria-expanded")).toBe("true");
  });

  it("nhóm đóng mà có badge thì badge hiện ở dòng nhóm, mở ra thì chuyển xuống mục con", () => {
    render(<SidebarNav scope="owner" nav={nav} section="reports" onSelect={() => undefined} />);
    expect(screen.getByTestId("nav-badge-group:staff").textContent).toBe("3");
    fireEvent.click(screen.getByTestId("nav-group-group:staff"));
    expect(screen.queryByTestId("nav-badge-group:staff")).toBeNull();
    expect(screen.getByTestId("nav-badge-password-reset-requests").textContent).toBe("3");
  });

  it("chọn mục gọi onSelect với khoá route", () => {
    const onSelect = vi.fn();
    render(<SidebarNav scope="owner" nav={nav} section="reports" onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId("nav-reports"));
    expect(onSelect).toHaveBeenCalledWith("reports");
  });

  it("không có localStorage vẫn chạy đúng", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(<SidebarNav scope="owner" nav={nav} section="menu" onSelect={() => undefined} />);
    expect(screen.getByTestId("nav-group-group:menu").getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(screen.getByTestId("nav-group-group:staff"));
    expect(screen.getByTestId("nav-group-group:staff").getAttribute("aria-expanded")).toBe("true");
    spy.mockRestore();
  });
});
