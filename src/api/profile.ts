import { request } from "./http/client";

/** CM-02 — hồ sơ cá nhân của chính người đang đăng nhập (`GET/PATCH /auth/profile`). */
export type MyProfile = {
  id: string;
  email: string;
  /** Email là định danh đăng nhập và gắn với link đặt mật khẩu: không sửa trực tiếp. */
  emailEditable: false;
  role: string;
  phone: string | null;
  /** NONE: Platform Admin/Staff không có bản ghi hồ sơ cá nhân — chỉ sửa được số điện thoại. */
  profileKind: "OWNER" | "EMPLOYEE" | "NONE";
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  dateOfBirth: string | null;
  branchName: string | null;
  jobTitle: string | null;
  editableFields: Array<"firstName" | "lastName" | "phone" | "dateOfBirth">;
};

export type ProfileUpdate = Partial<{ firstName: string; lastName: string; phone: string | null; dateOfBirth: string | null }>;

export const profileApi = {
  get() {
    return request<MyProfile>("/auth/profile");
  },
  update(input: ProfileUpdate) {
    // Không bao giờ gửi email: BE từ chối mọi trường lạ.
    const body: ProfileUpdate = {};
    if (input.firstName !== undefined) body.firstName = input.firstName.trim();
    if (input.lastName !== undefined) body.lastName = input.lastName.trim();
    if (input.phone !== undefined) body.phone = input.phone?.trim() ? input.phone.trim() : null;
    if (input.dateOfBirth !== undefined) body.dateOfBirth = input.dateOfBirth || null;
    return request<MyProfile>("/auth/profile", { method: "PATCH", body });
  },
};
