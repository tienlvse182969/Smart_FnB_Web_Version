/**
 * Unit test cho danh sách tỉnh/thành sau sáp nhập 2025.
 * Không phụ thuộc test-runner: chạy bằng `npx tsx src/constants/provinces.test.ts`.
 * Mục đích chính là chốt đúng con số 34 — sai sót ở đây sẽ đi thẳng vào dữ liệu
 * địa chỉ chi nhánh mà không ai phát hiện.
 */
import {
  CENTRAL_CITIES,
  PROVINCES,
  PROVINCES_ONLY,
  PROVINCE_OPTIONS,
  isKnownProvince,
} from "./provinces";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) {
    passed++;
    console.log(`  PASS  ${msg}`);
  } else {
    failed++;
    console.log(`  FAIL  ${msg}`);
  }
}

console.log("Danh sách tỉnh/thành 2025");

assert(CENTRAL_CITIES.length === 6, `6 thành phố trực thuộc trung ương (thực tế ${CENTRAL_CITIES.length})`);
assert(PROVINCES_ONLY.length === 28, `28 tỉnh (thực tế ${PROVINCES_ONLY.length})`);
assert(PROVINCES.length === 34, `tổng cộng 34 đơn vị (thực tế ${PROVINCES.length})`);

const duplicates = PROVINCES.filter((name, index) => PROVINCES.indexOf(name) !== index);
assert(duplicates.length === 0, `không trùng tên${duplicates.length ? ` — trùng: ${duplicates.join(", ")}` : ""}`);

const untrimmed = PROVINCES.filter((name) => name !== name.trim() || name.length === 0);
assert(untrimmed.length === 0, "không có tên rỗng hoặc thừa khoảng trắng");

assert(PROVINCE_OPTIONS.length === 34, "PROVINCE_OPTIONS có đủ 34 lựa chọn");
assert(
  PROVINCE_OPTIONS.every((option) => option.value === option.label),
  "mỗi option có value trùng label",
);

// Các đơn vị đã bị sáp nhập, không được còn trong danh sách.
for (const merged of ["Bình Dương", "Bà Rịa - Vũng Tàu", "Hà Nam", "Nam Định", "Hậu Giang", "Bạc Liêu"]) {
  assert(!PROVINCES.includes(merged), `đã bỏ "${merged}" (sáp nhập 2025)`);
}

assert(isKnownProvince("Thành phố Hồ Chí Minh"), "isKnownProvince nhận tên hợp lệ");
assert(!isKnownProvince("Bình Dương"), "isKnownProvince từ chối tỉnh đã sáp nhập");
assert(!isKnownProvince(""), "isKnownProvince từ chối chuỗi rỗng");
assert(!isKnownProvince(null), "isKnownProvince từ chối null");

console.log(`\n${passed} pass, ${failed} fail`);
if (failed > 0) process.exitCode = 1;
