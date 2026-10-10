/**
 * Module admin — Platform Admin: duyệt hồ sơ (PA-01..03), gói (PA-04), doanh nghiệp (PA-05), và nộp hồ sơ công khai (GU-01).
 * Real bám `/admin/*` và `POST /registration-applications`. Admin chỉ thấy số liệu tổng hợp (BR-07): mapper không
 * chép dữ liệu ví dù BE còn trả (xem `mapper.ts`).
 */
import type {
  ApproveRegistrationInput,
  Business,
  ChangePlanInput,
  OwnerPasswordResetResult,
  PageQuery,
  Paginated,
  RegistrationApplication,
  RegistrationDetail,
  RegistrationStatus,
  RenewInput,
  ServicePlan,
  ServicePlanInput,
  SubmitRegistrationInput,
} from "../../../types";
import { defineApi } from "../../define";
import { adminMock } from "./mock";
import { adminReal } from "./real";

export interface AdminApi {
  // PA-01..03 — hồ sơ đăng ký
  listRegistrations(query?: PageQuery & { status?: RegistrationStatus }): Promise<Paginated<RegistrationApplication>>;
  getRegistration(id: string): Promise<RegistrationDetail>;
  approveRegistration(id: string, input: ApproveRegistrationInput): Promise<RegistrationDetail>;
  /** `reason` bắt buộc (BR-04). BE xếp email từ chối vào outbox; worker gửi mail vẫn đang chờ BE. */
  rejectRegistration(id: string, reason: string): Promise<RegistrationDetail>;
  /** GU-01 — công khai, chưa đăng nhập. */
  submitRegistration(input: SubmitRegistrationInput): Promise<RegistrationApplication>;

  // PA-05 — doanh nghiệp
  listBusinesses(query?: PageQuery): Promise<Paginated<Business>>;
  getBusiness(id: string): Promise<Business>;
  renewBusiness(id: string, input: RenewInput): Promise<Business>;
  changeBusinessPlan(id: string, input: ChangePlanInput): Promise<Business>;
  /** Web bắt buộc lý do (đặc tả 5.2) dù BE cho tuỳ chọn. */
  suspendBusiness(id: string, reason: string): Promise<Business>;
  reactivateBusiness(id: string, reason?: string): Promise<Business>;
  /** Xếp email đặt mật khẩu một lần cho Owner; BE không trả mật khẩu. */
  resetOwnerPassword(ownerId: string): Promise<OwnerPasswordResetResult>;

  // PA-04 — gói (giai đoạn 3.3 làm đầy đủ; tối thiểu ở đây để duyệt hồ sơ và đổi gói chọn được gói)
  /** Danh sách gói đang bán cho landing/form đăng ký; endpoint công khai, không gắn Bearer. */
  listPublicPlans(): Promise<ServicePlan[]>;
  listPlans(): Promise<ServicePlan[]>;
  createPlan(input: ServicePlanInput): Promise<ServicePlan>;
  updatePlan(id: string, input: Partial<ServicePlanInput>): Promise<ServicePlan>;
}

export const adminApi = defineApi<AdminApi>("admin", { real: adminReal, mock: adminMock });
