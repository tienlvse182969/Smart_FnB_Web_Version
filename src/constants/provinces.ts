/**
 * 34 tỉnh/thành phố của Việt Nam sau sáp nhập năm 2025.
 *
 * Nguồn: Nghị quyết sáp nhập tỉnh 2025, hiệu lực 01/07/2025 — **cần người dùng
 * xác nhận lại** trước khi dùng cho dữ liệu thật.
 *
 * Từ mốc này Việt Nam bỏ cấp huyện/quận, chuyển sang hai cấp: tỉnh/thành phố →
 * phường/xã. Vì vậy form địa chỉ chi nhánh không còn trường `district`.
 *
 * Đây là danh sách duy nhất trong mã nguồn — mọi nơi cần tỉnh/thành đều import
 * từ đây, không khai báo lại.
 */

/** 6 thành phố trực thuộc trung ương. */
export const CENTRAL_CITIES = [
  "Hà Nội",
  "Hải Phòng",
  "Huế",
  "Đà Nẵng",
  "Thành phố Hồ Chí Minh",
  "Cần Thơ",
] as const;

/** 28 tỉnh. */
export const PROVINCES_ONLY = [
  "Tuyên Quang",
  "Cao Bằng",
  "Lai Châu",
  "Lào Cai",
  "Thái Nguyên",
  "Điện Biên",
  "Lạng Sơn",
  "Sơn La",
  "Phú Thọ",
  "Bắc Ninh",
  "Quảng Ninh",
  "Hưng Yên",
  "Ninh Bình",
  "Thanh Hóa",
  "Nghệ An",
  "Hà Tĩnh",
  "Quảng Trị",
  "Quảng Ngãi",
  "Gia Lai",
  "Khánh Hòa",
  "Lâm Đồng",
  "Đắk Lắk",
  "Đồng Nai",
  "Tây Ninh",
  "Vĩnh Long",
  "Đồng Tháp",
  "Cà Mau",
  "An Giang",
] as const;

/** Toàn bộ 34 đơn vị hành chính cấp tỉnh, thành phố xếp trước. */
export const PROVINCES: readonly string[] = [...CENTRAL_CITIES, ...PROVINCES_ONLY];

/** Dùng trực tiếp cho `options` của Ant Design Select. */
export const PROVINCE_OPTIONS = PROVINCES.map((name) => ({ value: name, label: name }));

/** Giá trị `city` có nằm trong danh sách hiện hành không. */
export function isKnownProvince(city: string | null | undefined): boolean {
  return !!city && PROVINCES.includes(city);
}
