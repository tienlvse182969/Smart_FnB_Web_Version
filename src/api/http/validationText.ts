/**
 * Dịch lỗi 400 validate của BE sang tiếng Việt theo từng ô (5.8d).
 *
 * BE (`app.setup.ts`: `ValidationPipe({ transform, whitelist, forbidNonWhitelisted })`) trả body mặc định của NestJS:
 *   { statusCode: 400, message: ["name should not be empty", "price must not be less than 0", "property foo should not exist"], error: "Bad Request" }
 * Mỗi phần tử có dạng "<đường dẫn ô> <luật>" theo mẫu của class-validator (đường dẫn có thể lồng: "options.0.name"); một số DTO có
 * câu riêng (`create-staff.dto.ts`, `menu.dto.ts`). `client.ts` đã đưa mảng này vào `ApiError.details`.
 *
 * Thêm form mới (GĐ6+): thêm nhãn ô vào FIELD_LABELS; luật lạ không có trong RULES sẽ hiện "<Nhãn> chưa hợp lệ".
 */

/** Tên ô của BE (thuộc tính DTO) → nhãn tiếng Việt. Ô không có trong bảng rơi về chính tên ô viết lại thành "ô nhập". */
export const FIELD_LABELS: Record<string, string> = {
  email: "Email",
  password: "Mật khẩu",
  token: "Mã đặt mật khẩu",
  refreshToken: "Phiên đăng nhập",
  name: "Tên",
  firstName: "Tên",
  lastName: "Họ",
  employeeCode: "Mã nhân viên",
  jobTitle: "Chức danh",
  hireDate: "Ngày vào làm",
  dateOfBirth: "Ngày sinh",
  phone: "Số điện thoại",
  code: "Mã",
  sku: "Mã SKU",
  description: "Mô tả",
  imageUrl: "Ảnh (URL)",
  logoUrl: "Logo (URL)",
  displayName: "Tên hiển thị",
  clientId: "Client ID",
  apiKey: "API Key",
  checksumKey: "Checksum Key",
  primaryColor: "Màu chủ đạo",
  secondaryColor: "Màu phụ",
  accentColor: "Màu nhấn",
  price: "Giá",
  priceDelta: "Giá cộng thêm",
  preparationMinutes: "Thời gian pha",
  categoryId: "Danh mục",
  branchId: "Chi nhánh",
  branchIds: "Chi nhánh bán",
  optionGroupIds: "Nhóm tuỳ chọn",
  displayOrder: "Thứ tự hiển thị",
  isActive: "Trạng thái",
  isEnabled: "Trạng thái",
  isAvailable: "Còn bán hôm nay",
  isRequired: "Bắt buộc chọn",
  minSelections: "Số lựa chọn tối thiểu",
  maxSelections: "Số lựa chọn tối đa",
  remainingPortions: "Số suất còn lại",
  addressLine1: "Địa chỉ",
  addressLine2: "Địa chỉ bổ sung",
  ward: "Phường/xã",
  district: "Quận/huyện",
  city: "Tỉnh/thành",
  country: "Quốc gia",
  timezone: "Múi giờ",
  openTime: "Giờ mở cửa",
  closeTime: "Giờ đóng cửa",
  isClosed: "Nghỉ cả ngày",
  dayOfWeek: "Thứ trong tuần",
  date: "Ngày",
  printerConnection: "Kiểu kết nối máy in",
  printerAddress: "Địa chỉ máy in",
  deviceName: "Tên thiết bị",
  stationId: "Quầy",
  months: "Số tháng",
  subscriptionMonths: "Số tháng sử dụng",
  reason: "Lý do",
  planId: "Gói dịch vụ",
  requestedPlanId: "Gói đăng ký",
  direction: "Hướng đổi gói",
  monthlyPrice: "Giá hằng tháng",
  maxBranches: "Số chi nhánh tối đa",
  maxAccounts: "Số tài khoản tối đa",
  maxTables: "Số bàn tối đa",
  brandingEnabled: "Tính năng nhận diện",
  multiBranchComparisonEnabled: "Tính năng so sánh chi nhánh",
  businessName: "Tên doanh nghiệp",
  representativeName: "Tên người đại diện",
  representativeEmail: "Email người đại diện",
  representativePhone: "Điện thoại người đại diện",
  taxCode: "Mã số thuế",
  headquartersAddress: "Địa chỉ trụ sở",
  website: "Website",
  note: "Ghi chú",
  search: "Từ khoá tìm kiếm",
  page: "Trang",
  limit: "Số dòng mỗi trang",
  role: "Vai trò",
  status: "Trạng thái",
  from: "Từ ngày",
  to: "Đến ngày",
};

/** Luật của class-validator (và câu riêng của DTO) → câu tiếng Việt. `{n}` là số lấy từ câu gốc. */
const RULES: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/should not be empty/i, () => "không được để trống"],
  [/must be an email/i, () => "không hợp lệ"],
  [/must be longer than or equal to (\d+) characters/i, (m) => `phải có ít nhất ${m[1]} ký tự`],
  [/must be shorter than or equal to (\d+) characters/i, (m) => `tối đa ${m[1]} ký tự`],
  [/must be an integer number/i, () => "phải là số nguyên"],
  [/must be a number/i, () => "phải là số hợp lệ"],
  [/must not be less than (-?[\d.]+)/i, (m) => `không được nhỏ hơn ${m[1]}`],
  [/must not be greater than (-?[\d.]+)/i, (m) => `không được lớn hơn ${m[1]}`],
  [/must be between (\d+) and (\d+)/i, (m) => `phải từ ${m[1]} đến ${m[2]}`],
  [/must contain at least (\d+) elements/i, (m) => `cần ít nhất ${m[1]} mục`],
  [/must be a string/i, () => "phải là chữ"],
  [/must be a boolean/i, () => "không hợp lệ"],
  [/must be a uuid/i, () => "không hợp lệ"],
  [/must be an array/i, () => "không hợp lệ"],
  [/must be one of the following values|must be a valid enum value/i, () => "chọn giá trị không hợp lệ"],
  [/must be a valid iso 8601 date|must be a valid date/i, () => "không phải ngày hợp lệ"],
  [/must contain a lowercase letter/i, () => "cần có chữ thường"],
  [/must contain an uppercase letter/i, () => "cần có chữ hoa"],
  [/must contain a number/i, () => "cần có chữ số"],
  [/must contain 8 to 15 digits/i, () => "phải gồm 8 đến 15 chữ số"],
  [/may only contain uppercase letters, numbers, underscores, and hyphens/i, () => "chỉ gồm chữ hoa, số, gạch dưới, gạch ngang"],
  [/must be a hexadecimal color/i, () => "không phải mã màu hợp lệ"],
  [/must be a url address/i, () => "không phải địa chỉ URL hợp lệ"],
  [/must match .* regular expression/i, () => "sai định dạng"],
];

export interface ValidationIssue {
  /** Tên ô cuối cùng trong đường dẫn ("options.0.name" → "name"); null nếu câu không có dạng "<ô> <luật>". */
  field: string | null;
  /** Câu tiếng Việt cho ô này, ví dụ "Email không hợp lệ". */
  text: string;
}

const GENERIC_ISSUE = "Có ô nhập chưa hợp lệ.";

/** "property foo should not exist" (forbidNonWhitelisted): lỗi của web gửi thừa ô, không phải lỗi người dùng sửa được. */
const EXTRA_PROPERTY = /^property\s+(\S+)\s+should not exist$/i;

function labelOf(path: string): { field: string; label: string } {
  const segments = path.split(".").filter((s) => !/^\d+$/.test(s));
  const field = segments[segments.length - 1] ?? path;
  return { field, label: FIELD_LABELS[field] ?? "Ô nhập" };
}

/** Dịch một câu validate của BE. Không bao giờ trả tiếng Anh thô. */
export function translateValidationMessage(message: string): ValidationIssue {
  const trimmed = message.trim();
  if (EXTRA_PROPERTY.test(trimmed)) return { field: null, text: "Dữ liệu gửi lên có ô không được hỗ trợ." };
  const space = trimmed.indexOf(" ");
  if (space <= 0) return { field: null, text: GENERIC_ISSUE };
  const path = trimmed.slice(0, space);
  // Câu có dạng "<ô> <luật>": ô là tên thuộc tính DTO (camelCase, bắt đầu bằng chữ thường; có thể lồng bằng dấu chấm), không chứa dấu cách.
  if (!/^[a-z_][\w.]*$/.test(path)) return { field: null, text: GENERIC_ISSUE };
  const rule = RULES.find(([re]) => re.test(trimmed));
  const { field, label } = labelOf(path);
  return { field, text: `${label} ${rule ? rule[1](trimmed.match(rule[0])!) : "chưa hợp lệ"}` };
}

/** Dịch cả mảng; bỏ trùng; giữ thứ tự. */
export function translateValidation(details: string[]): ValidationIssue[] {
  const seen = new Set<string>();
  const out: ValidationIssue[] = [];
  for (const d of details) {
    const issue = translateValidationMessage(d);
    const key = `${issue.field ?? ""}|${issue.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(issue);
  }
  return out;
}

/** Một câu liệt kê các ô sai: "Email không hợp lệ; Tên không được để trống". */
export function summarizeValidation(details: string[]): string {
  const issues = translateValidation(details);
  const texts = issues.map((i) => i.text.replace(/\.$/, "")).filter((t, i, a) => a.indexOf(t) === i);
  return texts.length ? texts.join("; ") + "." : GENERIC_ISSUE;
}

/** Lỗi theo ô, để form gắn vào đúng ô: { email: "Email không hợp lệ" }. Ô nào có nhiều lỗi thì lấy lỗi đầu. */
export function fieldErrors(details: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of translateValidation(details)) if (i.field && !(i.field in out)) out[i.field] = i.text;
  return out;
}
