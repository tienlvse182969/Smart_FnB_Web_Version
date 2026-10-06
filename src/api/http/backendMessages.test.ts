import { describe, expect, it } from "vitest";
import { BACKEND_MESSAGES } from "./backendMessages.fixture";
import { ApiError, describeApiError, GENERIC_ERROR_TEXT, SERVER_ERROR_TEXT, translateBackendMessage } from "./errors";
import { FIELD_LABELS, fieldErrors, summarizeValidation, translateValidation, translateValidationMessage } from "./validationText";

const VIETNAMESE = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

describe("bảng dịch câu lỗi BE", () => {
  it("mọi câu 400/401/404/409 đã rà ở BE đều có bản dịch cụ thể bằng tiếng Việt (không rơi về câu chung)", () => {
    const missing = BACKEND_MESSAGES.filter(([status, message]) => {
      const text = translateBackendMessage(new ApiError(status, message));
      return text === GENERIC_ERROR_TEXT || !VIETNAMESE.test(text) || /[A-Za-z]{4,} [a-z]{3,} [a-z]{3,}/.test(text.replace(/SKU|JPEG|PNG|WebP|YYYY-MM-DD|MB|Owner/g, ""));
    });
    expect(missing.map(([s, m]) => `${s} ${m}`)).toEqual([]);
    expect(BACKEND_MESSAGES.length).toBeGreaterThanOrEqual(60);
  });

  it("câu 401 đăng nhập sai có câu riêng; 404 và 409 không lộ tiếng Anh", () => {
    expect(translateBackendMessage(new ApiError(401, "Invalid email or password"))).toBe("Email hoặc mật khẩu không đúng.");
    expect(translateBackendMessage(new ApiError(409, "Branch code already exists"))).toBe("Mã chi nhánh đã tồn tại.");
    expect(translateBackendMessage(new ApiError(409, "Email, phone, or account code already exists"))).toMatch(/đã tồn tại/);
    expect(translateBackendMessage(new ApiError(404, "Branch not found"))).toMatch(/Không tìm thấy/);
  });

  it("câu 5xx của BE không bao giờ hiện, kể cả khi trùng với câu trong bảng", () => {
    expect(describeApiError(new ApiError(500, "Branch not found"))).toBe(SERVER_ERROR_TEXT);
  });
});

describe("400 validate theo từng ô", () => {
  it("dịch các luật phổ biến của class-validator kèm nhãn ô tiếng Việt", () => {
    const cases: [string, string][] = [
      ["email must be an email", "Email không hợp lệ"],
      ["name should not be empty", "Tên không được để trống"],
      ["sku must be shorter than or equal to 50 characters", "Mã SKU tối đa 50 ký tự"],
      ["password must be longer than or equal to 8 characters", "Mật khẩu phải có ít nhất 8 ký tự"],
      ["price must not be less than 0", "Giá không được nhỏ hơn 0"],
      ["maxBranches must not be greater than 100", "Số chi nhánh tối đa không được lớn hơn 100"],
      ["preparationMinutes must be an integer number", "Thời gian pha phải là số nguyên"],
      ["months must be between 1 and 60", "Số tháng phải từ 1 đến 60"],
      ["password must contain a lowercase letter", "Mật khẩu cần có chữ thường"],
      ["phone must contain 8 to 15 digits", "Số điện thoại phải gồm 8 đến 15 chữ số"],
      ["code may only contain uppercase letters, numbers, underscores, and hyphens", "Mã chỉ gồm chữ hoa, số, gạch dưới, gạch ngang"],
      ["categoryId must be a UUID", "Danh mục không hợp lệ"],
      ["printerConnection must be one of the following values: NONE, WIFI, BLUETOOTH", "Kiểu kết nối máy in chọn giá trị không hợp lệ"],
      ["openTime must match /^\\d{2}:\\d{2}$/ regular expression", "Giờ mở cửa sai định dạng"],
      ["primaryColor must be a hexadecimal color", "Màu chủ đạo không phải mã màu hợp lệ"],
      ["displayName must be shorter than or equal to 150 characters", "Tên hiển thị tối đa 150 ký tự"],
      ["logoUrl must be a URL address", "Logo (URL) không phải địa chỉ URL hợp lệ"],
    ];
    for (const [raw, vi] of cases) expect(translateValidationMessage(raw).text, raw).toBe(vi);
  });

  it("ô lồng nhau lấy tên ô cuối; ô lạ vẫn có câu tiếng Việt", () => {
    expect(translateValidationMessage("options.0.name should not be empty")).toEqual({ field: "name", text: "Tên không được để trống" });
    expect(translateValidationMessage("weirdField should not be empty").text).toBe("Ô nhập không được để trống");
    expect(translateValidationMessage("weirdField must do something strange").text).toBe("Ô nhập chưa hợp lệ");
  });

  it("câu lạ hoặc ô thừa (forbidNonWhitelisted) → câu chung tiếng Việt, không lộ tiếng Anh", () => {
    expect(translateValidationMessage("property foo should not exist").text).toBe("Dữ liệu gửi lên có ô không được hỗ trợ.");
    expect(translateValidationMessage("Something completely different happened").text).toBe("Có ô nhập chưa hợp lệ.");
    expect(translateValidationMessage("").text).toBe("Có ô nhập chưa hợp lệ.");
  });

  it("liệt kê các ô sai trong một thông báo, bỏ trùng; và có lỗi theo ô để gắn vào form", () => {
    const details = ["email must be an email", "name should not be empty", "name should not be empty", "sku must be shorter than or equal to 50 characters"];
    expect(summarizeValidation(details)).toBe("Email không hợp lệ; Tên không được để trống; Mã SKU tối đa 50 ký tự.");
    expect(translateValidation(details)).toHaveLength(3);
    expect(fieldErrors(details)).toEqual({ email: "Email không hợp lệ", name: "Tên không được để trống", sku: "Mã SKU tối đa 50 ký tự" });
  });

  it("ApiError 400 có details → describeApiError ra câu theo ô; không details → câu BE đã Việt hoá hoặc câu chung", () => {
    const err = new ApiError(400, "email must be an email", ["email must be an email", "name should not be empty"]);
    expect(describeApiError(err)).toBe("Email không hợp lệ; Tên không được để trống.");
    expect(describeApiError(new ApiError(400, "Giá phải là số nguyên đồng, từ 0 trở lên"))).toBe("Giá phải là số nguyên đồng, từ 0 trở lên");
    expect(describeApiError(new ApiError(400, "something odd"))).toBe(GENERIC_ERROR_TEXT);
  });

  it("mọi ô DTO của các form web đều có nhãn", () => {
    for (const field of ["email", "password", "name", "sku", "price", "branchIds", "categoryId", "preparationMinutes", "printerAddress", "months", "reason", "planId", "monthlyPrice", "maxBranches", "maxAccounts", "representativeEmail", "businessName", "addressLine1", "city", "openTime", "closeTime"]) {
      expect(FIELD_LABELS[field], field).toBeTruthy();
    }
  });
});
