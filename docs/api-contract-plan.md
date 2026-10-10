# Hợp đồng API gói dịch vụ (OW-10) và cờ tính năng — web cần gì từ BE

> Dành cho nhóm BE. Căn cứ: đặc tả v9 mục 13 (gói), mục 10 (nhận diện), BR-08, BR-09, BR-11.
> Hiện web **chỉ đọc được hạn mức thật** (`subscription.quotas` trong `GET /restaurant-chains`). Mọi thứ còn lại dưới đây đang là **mock** ở web (`src/api/modules/plan`), chờ BE.
> Kiểu TypeScript tương ứng: `src/types/plan.ts`.

## 1. Endpoint đề xuất

```
GET /api/v1/restaurant-chains/{chainId}/subscription
```

- Vai trò gọi được: **OWNER** của chuỗi và **MANAGER** thuộc chuỗi. Manager cần vì nhận diện (BR-41) và chế độ chỉ đọc (BR-09) áp cho cả Manager; hiện `GET /restaurant-chains` trả 403 cho Manager nên web không đọc được gói của Manager.
- Manager không cần thấy giá, nên `limits` có thể để rỗng cho Manager.
- **Phải trả 200 cả khi gói hết hạn hoặc tạm ngưng** (xem mục 4).
- Thay thế cho phần `subscription` đang nằm lẫn trong `GET /restaurant-chains`; có thể giữ cả hai.

## 2. Response

```json
{
  "chainId": "6f1c…",
  "tier": "ADVANCED",
  "planName": "Nâng cao",
  "status": "active",
  "expiresAt": "2026-10-22T16:59:59.000Z",
  "limits": [
    { "resource": "branches", "used": 3, "limit": 10, "remaining": 7 },
    { "resource": "accounts", "used": 14, "limit": 80, "remaining": 66 }
  ],
  "features": {
    "branding":           { "enabled": true, "requiredTier": "STANDARD" },
    "multiBranchCompare": { "enabled": true, "requiredTier": "STANDARD" },
    "aiAssistant":        { "enabled": true, "requiredTier": "ADVANCED" }
  }
}
```

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `tier` | `"BASIC" \| "STANDARD" \| "ADVANCED"` | Cấp của gói (Cơ bản / Tiêu chuẩn / Nâng cao). Cần một cột `tier` ổn định trên `service_plans`; hiện chỉ có `code` tự do. Web dùng để so sánh "đủ cấp chưa", không dùng để suy ra tính năng. |
| `planName` | string | Tên gói do Admin đặt, hiển thị nguyên văn. |
| `status` | `"active" \| "expired" \| "suspended"` | `expired` tính từ `expiresAt` khi xử lý yêu cầu, không cần job (mục 13.4). `suspended` do Admin tạm ngưng. Cả hai đều là chế độ chỉ đọc ở web. |
| `expiresAt` | ISO 8601, nullable | Ngày hết hạn (`business_subscriptions.expires_at`). Web hiện cho Owner và hiện ở banner. |
| `limits[]` | mảng | Mức đã dùng thật. `resource` ∈ `branches`, `accounts`. **Số tài khoản** tính mọi tài khoản đang hoạt động (Owner, Manager, Cashier, Barista), không tính tài khoản đã khoá (mục 13.1). Không có hạn mức bàn (`tables` của BE hiện tại là v7, web bỏ qua). |
| `features` | object theo khoá | Đúng ba khoá ở bảng dưới. Thêm tính năng mới = thêm khoá, web bỏ qua khoá lạ. |
| `features.*.enabled` | boolean | Gói hiện tại có tính năng này không. |
| `features.*.requiredTier` | tier | Cấp thấp nhất có tính năng — để thẻ khoá ghi "Cần gói Nâng cao". Không để web tự suy ra, vì số liệu gói do Admin cấu hình (CC-01). |

Khoá tính năng (`plans` có đủ ba cờ — mục 13.4):

| Khoá | Ý nghĩa | Màn hình khoá |
|---|---|---|
| `branding` | Nhận diện thương hiệu | OW-07; và việc áp màu cho mọi tài khoản |
| `multiBranchCompare` | So sánh đa chi nhánh trong báo cáo | OW-08 (khối "Doanh thu theo chi nhánh") |
| `aiAssistant` | Trợ lý số liệu | OW-09 |

## 3. Nhận diện theo gói (BR-41)

- `GET /restaurant-chains/{id}/branding`: gói **Cơ bản luôn trả bộ mặc định**, dù bảng branding đã có cấu hình (đặc tả 10.5). Hạ gói thì giữ cấu hình, nâng lại là áp ngay. Web có tự kiểm tra `features.branding.enabled` thêm một lần, nhưng nguồn đúng là BE.
- `GET …/branding` BE đã cho OWNER, MANAGER, CASHIER… đọc (đúng); chỉ cần thêm kiểm tra gói như trên.
- Mỗi lần Owner lưu: tăng số phiên bản cấu hình để client biết tải lại (mục 10.5).

## 4. Chế độ chỉ đọc khi hết hạn (BR-09) — **BE hiện đang lệch đặc tả**

- Đặc tả: hết hạn → **chỉ đọc**. Không chốt đơn mới, không sửa cấu hình; **đơn đã thanh toán trước đó vẫn được pha và gọi số cho xong**; dữ liệu giữ tối thiểu 90 ngày.
- BE hiện tại: `branch-access.service.ts` ném `403 "The business subscription is not active"` cho cả thao tác **đọc** (kể cả `GET /restaurant-chains`, `GET /branches`).
- Web làm theo đặc tả: gọi được là xem; nút tạo/sửa/xoá tự khoá kèm banner. Nếu BE vẫn chặn đọc thì web thấy lỗi 403 ở mọi màn, không vào được chế độ chỉ đọc.
- Đề nghị: khi `status != active`, **cho phép mọi `GET`**, chặn các thao tác ghi bằng một mã lỗi riêng, ví dụ `403` + `error: "SUBSCRIPTION_READ_ONLY"`.

## 5. Mã lỗi web đang xử lý (BR-08)

Web đọc `error` (mã) trong body lỗi để chọn thông báo. Cần BE thống nhất:

| HTTP | `error` | Khi nào | Web hiện |
|---|---|---|---|
| 409 | `PLAN_LIMIT_REACHED` | vượt hạn mức chi nhánh/tài khoản (BE **đã có** cho chi nhánh) | "Vượt hạn mức…" + gợi ý gói nâng nếu có `suggestedPlans` |
| 403 | `PLAN_FEATURE_UNAVAILABLE` | gọi tính năng gói không có (nhận diện, so sánh, AI) | "Gói hiện tại không có tính năng này" |
| 403 | `SUBSCRIPTION_READ_ONLY` | thao tác ghi khi hết hạn/tạm ngưng | "Doanh nghiệp đang ở chế độ chỉ đọc" |
| 403 | (khác) | thiếu quyền vai trò | "Bạn không đủ quyền" |

Web nhận diện lỗi gói bằng mã có chứa `PLAN`, `QUOTA`, `LIMIT`, `FEATURE` hoặc `SUBSCRIPTION`; đặt đúng tên như bảng trên là đủ.

## 6. Còn chưa chốt (CC-12)

Thu phí gói qua hệ thống chưa chốt nên web **không** làm màn gia hạn/thanh toán. Hợp đồng trên chừa chỗ: Admin gia hạn qua `POST /admin/businesses/{id}/subscription/renew` (đã có), web chỉ cần `status`/`expiresAt` đổi.

## 7. Admin và đăng ký — chờ BE

Căn cứ: đối chiếu `/admin/*` và `POST /registration-applications` với đặc tả PA-01..05, GU-01 (xem `src/api/modules/admin/`). Web đã nối real cho hồ sơ + doanh nghiệp (giai đoạn 3.2); các mục dưới đây là chỗ web phải đi đường vòng hoặc còn lệch.

| # | Mức | Việc cần BE | Hiện web làm gì |
|---|---|---|---|
| 1 | **CAO** | **Có tiến trình đọc `email_outbox` và gửi mail chưa?** Trong source BE chỉ thấy chỗ *ghi* (`approveRegistrationApplication`, `resetOwnerPassword`, `employees.service.ts`), không thấy chỗ đọc/gửi. Nếu chưa có, Owner **không bao giờ nhận được email đặt mật khẩu** (token một lần nằm trong payload outbox) → không đăng nhập được sau khi duyệt hay đặt lại mật khẩu | Sau duyệt/đặt lại, web ghi "đã xếp email" (đúng hành vi BE), không hiện mật khẩu |
| 2 | Trung bình | Từ chối hồ sơ **gửi email** cho người đăng ký (đặc tả PA-03). `rejectRegistrationApplication` hiện chỉ cập nhật trạng thái | Web chỉ ghi "đã từ chối", không nói đã gửi email |
| 3 | Trung bình | **Lý do tạm ngưng bắt buộc** (`SubscriptionStatusReasonDto.reason` hiện tuỳ chọn; đặc tả 5.2: kèm lý do). Nên lưu lý do vào `business_subscription_events.note` | Web bắt buộc nhập lý do |
| 4 | **CAO (BR-07)** | **Bỏ dữ liệu ví khỏi mọi response `/admin/*`**: `wallet {balance, heldBalance, status}` trong `businessBaseSelect()` (list/get/renew/change-plan/suspend/reactivate) và trong `getRegistrationApplication()` (`approvedChain.wallet`, trả cả từ approve/reject) | Mapper whitelist, không chép ví (có unit test) — nhưng dữ liệu vẫn đi qua mạng |
| 5 | Trung bình | **Chặn hạ gói lệch BR-11**: `change-plan` trả 409 khi usage vượt hạn mức gói mới (`platform-admin.service.ts:405-416`, kể cả bàn). BR-11: hạ gói không xoá gì, chỉ chặn tạo mới | Web hiện nguyên thông báo 409 của BE |
| 6 | Trung bình | **Ghi trạng thái `EXPIRED`** hoặc chốt rằng BE không ghi (không có code nào ghi enum này). Đặc tả 5.2: hết hạn là trạng thái tính từ ngày hết hạn | Web tự tính `ACTIVE` mà `expiresAt < now` → "Hết hạn" |
| 7 | Thấp | `GET /admin/businesses` thêm bộ lọc `status` (active/suspended/expired) để đếm KPI không phải tải trang | Web đếm trong 100 doanh nghiệp mới nhất |
| 8 | Trung bình | **Endpoint công khai danh sách gói** (id, tên, giá, hạn mức, tính năng, đang bán) cho Landing và form đăng ký, ví dụ `GET /public/service-plans` | Landing còn viết cứng; form chưa có ô chọn gói |
| 9 | Trung bình | **GU-01 thêm "số chi nhánh dự kiến"** vào `SubmitRegistrationApplicationDto` và model (đặc tả 4.2) | Form có ô này nhưng không gửi lên |
| 10 | Trung bình | **Gói thêm `tier`** (`BASIC \| STANDARD \| ADVANCED`) và **cờ tính năng** (`branding`, `multiBranchCompare`, `aiAssistant`) — xem mục 2; **bỏ `maxTables` bắt buộc** khi tạo gói (v9 không có bàn; `usage.tableCount` cũng nên bỏ) | Web gửi `maxTables: 0`; tier/cờ tính năng là mock |
| 11 | Thấp | Duyệt hồ sơ cho chọn **ngày hết hạn** thay vì số tháng (đặc tả PA-02: "ngày hết hạn ban đầu") | Web nhập số tháng và hiện ngày tính được |

### Menu và tuỳ chọn món — chờ BE (giai đoạn 4)

Web đã nối real cho danh mục + món + gán chi nhánh (giai đoạn 4.2). Phần dưới đây BE chưa có; web dùng mock (`src/api/modules/options`) hoặc bỏ qua. Các bảng Prisma `menu_option_groups`, `menu_options`, `menu_item_option_groups`, `branch_menu_options` **đã có** và đang được dùng khi chốt đơn (`counter-operations.service.ts`), chỉ thiếu controller.

| # | Mức | Việc cần BE | Hiện web làm gì |
|---|---|---|---|
| 12 | Trung bình | **CRUD nhóm tuỳ chọn và tuỳ chọn** theo chuỗi (OW-03): `name`, `code`, `isRequired`, `minSelections`, `maxSelections`, `displayOrder`, `isActive`; tuỳ chọn có `priceDelta` ≥ 0 (số nguyên đồng — BR-19). Ví dụ `/restaurant-chains/{id}/menu/option-groups[/{groupId}/options]`. Web đã chốt shape (xem `src/types/option.ts`): `OptionGroup { id, name, code, isRequired, minSelections, maxSelections, displayOrder, isActive, options: OptionItem[] }`, `OptionItem { id, name, code, priceDelta, displayOrder, isActive, isDefault }`; ghi nhóm gửi lồng `options[]` (thứ tự mảng = `displayOrder`). Luật: `max ≥ 1`, `min ≤ max`, `isRequired ⇒ min ≥ 1`, số mặc định ≤ `max`, mặc định phải `isActive`, `code` nhóm duy nhất trong chuỗi và `code` tuỳ chọn duy nhất trong nhóm — BE nên kiểm lại cùng luật (BR-14) | Mock theo đúng tên trường Prisma |
| 13 | Trung bình | **Gắn nhóm vào món**: `PUT /restaurant-chains/{id}/menu/items/{itemId}/option-groups` (danh sách `groupId` kèm thứ tự = `MenuItemOptionGroup.displayOrder`) | Mock |
| 14 | Trung bình | **Bật/tắt tuỳ chọn cấp chuỗi** (`MenuOption.isActive`, BR-12/OW-04) | Mock |
| 15 | Thấp | **Trường tuỳ chọn mặc định** (đặc tả 12.2: "tuỳ chọn mặc định", ví dụ đường 100%, đá bình thường): `MenuOption.isDefault` hoặc `defaultOptionIds` trên nhóm. Hiện schema không có | Mock có `isDefault` trên từng tuỳ chọn (đặc tả không bắt buộc nhóm bắt buộc phải có mặc định: Size không có, Đường/Đá có). **Cập nhật BE `91867ae` (MỘT PHẦN):** cột `menu_options.is_default` và seed đã có (`schema.prisma:901`, `seed.ts:601-620`) nhưng `optionSelect` (`menu.service.ts:55-65`) **không trả**, `CreateMenuOptionDto`/`UpdateMenuOptionDto` **không nhận**; `grep isDefault src/` không có kết quả → Owner chưa đọc/ghi được, web giữ ô khoá "chờ BE #15". Cần: trả `isDefault` ở `optionSelect` và nhận ở hai DTO |
| 16 | Trung bình | **Trả `optionGroups` (kèm `options`) trong** `GET …/menu/items` và `GET /branches/{id}/menu` để POS/Manager hiển thị mà không phải gọi riêng | Chưa đọc được từ BE. **Liên quan 5.7c** (tuỳ chọn theo chi nhánh của Manager): ngoài `optionGroups` còn cần trạng thái "còn bán" theo chi nhánh của từng tuỳ chọn (bảng `branch_menu_options`, hiện chỉ Barista ghi) và cờ Owner tắt; thiếu thì web đọc tuỳ chọn chi nhánh bằng mock. **Từ 6.3 (options real):** màn Owner đọc cấu hình tuỳ chọn của từng món bằng `GET items/:id/option-groups` — web đang **N+1, tối đa 4 request song song** (chỉ khi cần cấu hình từng món, như mở một món để sửa); số món dùng mỗi nhóm lấy từ `_count.menuItems` của `GET option-groups` nên không cần N+1 để đếm |
| 17 | Thấp | **Trường "không gom món"** trên `menu_items` (đặc tả 8.3, OW-02 "cờ cho phép gom món khi pha"), ví dụ `allowBatching boolean default true`; có trong `create/update/list` | Chưa có; mock lưu theo ID món thật ở 4.3 (`ChainState.itemOptions`, mất khi tải lại trang). **Cập nhật BE `91867ae` (ĐÃ LÀM):** `menu_items.allow_batching BOOLEAN NOT NULL DEFAULT true`; nhận ở `CreateMenuItemDto` (`menu.dto.ts:112-119`) và `UpdateMenuItemDto` (`menu.dto.ts:178-185`), trả ở `itemSelect` (`menu.service.ts:47`, đã kiểm GET `menu/items` trả `allowBatching`), Barista dùng (`counter-operations.service.ts:662, 701`). **Web đã dùng ở `a1f02ac` (6.3d):** đọc `allowBatching` từ `GET menu/items` (mapper `menu/mapper.ts`), ghi bằng `PATCH items/{id} {allowBatching}` cùng lệnh lưu món, `POST items` gửi tường minh; đã kiểm real (chặn ghi ở CDP, body khớp `UpdateMenuItemDto`, GET lại không đổi) |
| 18 | Thấp | **Endpoint tải ảnh món lên** (`multipart` hoặc URL ký trước) trả `imageUrl`; hiện chỉ có `imageUrl` chuỗi ≤ 500 ký tự | Ô nhập URL kèm xem trước, ảnh lỗi hiện ảnh thay thế |
| 19 | Trung bình | **`GET /branches/{id}/menu` cho Manager thấy cả món Owner đã tắt** (kèm cờ `isActive`/`isEnabled`) để BM-02 hiện "Owner tắt món này" như đặc tả; hiện BE ẩn hẳn món Owner đã tắt | Web chỉ hiện món đang bán |
| 20 | Trung bình | **Manager bật/tắt tuỳ chọn tại chi nhánh** (BM-02): hiện chỉ có `PATCH /barista/menu-options/{id}/availability` (role BARISTA); thêm `PATCH /branches/{b}/menu/options/{optionId}` cho OWNER, MANAGER | **Đã làm qua BE `0083289`**: `GET/PATCH /manager/menu-options` (role MANAGER), web nối real ở 5.7c (module `branchOptions`). Ghi chú còn lại: API **không trả thứ tự nhóm/tuỳ chọn** (không `displayOrder`, `code`, luật chọn), nên web gom theo `group.id` và sắp theo tên; chưa nhờ BE (đủ cho bật/tắt, cần nếu sau này muốn khớp thứ tự Owner đặt) |
| 21 | Thấp | `price` là `Decimal(14,2)` và DTO cho phép 2 chữ số thập phân; BR-19 là số nguyên đồng → ép `@IsInt` hoặc bỏ phần thập phân | Web chỉ gửi số nguyên; đọc qua `parseAmount` |
| 22 | Thấp | `remainingPortions` (kho, v7) còn trong `PATCH /branches/{b}/menu/items/{id}` và response, **và trong từng món của `GET /branches/{b}/menu`** (Manager gọi thật vẫn thấy) → bỏ khỏi v9. **Cập nhật BE `91867ae` (XẤU HƠN):** thêm `reservePortions` (`counter-operations.service.ts:1165`, gọi ở `:215`, `:385`), kiểm `hasRemainingPortions` (`:106`, mã lỗi `NO_REMAINING_PORTIONS` `:120`) và hoàn suất khi huỷ đơn chưa trả (`remainingPortions: { increment }` `:564`) — BE phụ thuộc thêm vào trường kho mà quyết định v9 đã bỏ (đặc tả: hệ thống không quản lý kho). **Đã hỏi nhóm BE (Bảo)**; chờ trả lời | Web không bao giờ gửi, mapper bỏ qua khi đọc |

### Manager (giai đoạn 5) — chờ BE

Rút từ khảo sát 5.1. Việc đã có ở trên không ghi lại: `email_outbox` không có tiến trình gửi → #1; Manager bật/tắt tuỳ chọn → #20.

| # | Mức | Việc cần BE | Hiện web làm gì |
|---|---|---|---|
| 23 | **CAO** | **Bỏ `password` ở `POST /auth/managers`** (`create-staff.dto.ts`, hiện bắt buộc 8–128 ký tự) và chuyển sang **gửi email đặt mật khẩu** như duyệt hồ sơ (`PasswordSetupToken` + `email_outbox`, hiệu lực 24 giờ). Đặc tả BM-01/OW-05: tạo tài khoản rồi gửi email | Web đã bỏ mọi mật khẩu cứng; tạo Manager còn mock cho tới khi BE đổi |
| 24 | **CAO** | **CRUD Cashier/Barista cho Branch Manager** (BR-05, ma trận quyền: Manager tạo/sửa): tạo (không `password`, gửi email đặt mật khẩu), danh sách theo chi nhánh của Manager, khoá/mở, đặt lại mật khẩu, sửa. Hiện không có endpoint nào; `/employees` chỉ OWNER và chỉ thao tác được Manager. **Shape web gửi/nhận** (theo `User`/`Employee`, schema.prisma:252-278, 448-461; không thêm trường): `POST /employees` body `{email, firstName, lastName, phone?, role: "CASHIER"\|"BARISTA"}` (không `password`; `employeeCode` BE tự sinh vì model bắt buộc duy nhất) → `{…employee, expiresAt}`; `GET /employees?role&search&page&limit` tự giới hạn chi nhánh của Manager → `{data: Employee[], total}` với `Employee {id, employeeCode, firstName, lastName, email, phone\|null, role, status: ACTIVE\|INACTIVE\|SUSPENDED, lastLoginAt\|null, branchId}`; `PATCH /employees/:id` `{firstName?, lastName?, phone?\|null}` (không đổi role/email/chi nhánh); `PATCH /employees/:id/status` `{status: "ACTIVE"\|"SUSPENDED"}`; `POST /employees/:id/reset-password` → `{expiresAt}`. `INACTIVE` = chờ đặt mật khẩu. Email trùng → 409. Đủ hạn mức (đặc tả 13.1, dòng 1226: chỉ tính tài khoản không bị khoá, cả doanh nghiệp gồm Owner) khi tạo **và khi mở khoá** → 409 `PLAN_LIMIT_REACHED` kèm `{quota, currentPlan, suggestedPlans}` như `POST /branches`. Người ngoài chi nhánh → 404 | Mock (`accountApi`, localStorage `smartfnb:mock:accounts:v1:<chainId>`) |
| 25 | Trung bình | **Link trong email trỏ tới trang web** `<WEB_BASE_URL>/setup-password?token=…` (payload hiện chỉ có `setupPath: '/auth/setup-password'`, là đường của BE, không phải trang) — cần cấu hình URL web ở BE | Web có trang `/setup-password?token=` gọi `POST /auth/setup-password` |
| 26 | Trung bình | **Hạn mức số tài khoản không tính tài khoản đã khoá** (đặc tả 13.1; `users.service.ts` `assertOwnerCanCreateAccount` đếm cả tài khoản khoá) | Mock tính theo đặc tả |
| 27 | Trung bình | **`PATCH /stations/{id}`**: đổi tên, ngừng/bật lại quầy (`status` ACTIVE/INACTIVE), sửa máy in (`printerConnection`, `printerAddress`); kiểm định dạng IP/MAC thay vì chỉ "không rỗng" | Chưa có; web chỉ tạo quầy (giai đoạn 5.5) |
| 28 | Trung bình | **Ghép màn hình gọi số** (BE `dfe8100` đã có `POST /stations/pair-calling-display`; CÒN THIẾU `GET /display-devices`): endpoint dùng mã ghép `CALLING_DISPLAY` (token gắn chi nhánh, `stationId` null) và **`GET /display-devices`** liệt kê thiết bị cấp chi nhánh (hiện danh sách chỉ nằm trong `GET /stations`, không có màn hình gọi số) | Mock (giai đoạn 5.6) |

### Việc mới sau khi BE cập nhật `dfe8100` (2026-10-02)

| # | Mức | Việc cần BE | Hiện web làm gì |
|---|---|---|---|
| 29 | Thấp | **Bỏ `maxTables` (v7) hoặc cho phép 0** ở `CreateServicePlanDto` (`platform-admin.dto.ts:154-158`, `@Min(1)`, bắt buộc). Web ẩn trường này và gửi 1 khi tạo gói, không gửi khi sửa | `admin/real.ts` `MIN_MAX_TABLES` |
| 30 | Trung bình | **Cờ AI và `tier` trên gói.** BE có `brandingEnabled`, `multiBranchComparisonEnabled` (`schema.prisma:573-574`) nhưng không có cờ Trợ lý AI (chỉ Nâng cao, đặc tả 13.1) và không có cấp; thay cho #10 phần còn lại | Cờ AI và cấp vẫn suy từ mã gói (`plan/tiers.ts`) |
| 31 | Trung bình | **Lỗi hết hạn trả mã `SUBSCRIPTION_READ_ONLY`** (hiện `ForbiddenException` chỉ có chữ: `branch-access.service.ts:81-83, 118-120`), để web báo "chỉ đọc" thay vì "không đủ quyền" | Web chờ mã này (mục 5). Hiện web nhận diện cả 403 không mã theo câu "subscription is read-only" để báo "chỉ đọc" bằng tiếng Việt (5.7d); vẫn nên có mã để khỏi dựa vào câu chữ |
| 32 | Trung bình | **Seed 3 gói BASIC / STANDARD / ADVANCED có giá thật** (seed hiện `DEMO_OPERATIONS` và `STARTER`, giá 0; `GET /public/service-plans` cũng chỉ trả 2 gói giá 0) | Landing vẫn dùng bảng giá mock (`api/publicPlans.ts`) |
| 33 | **CAO (BR-08)** | **BE thi hành hai cờ gói**: chặn `PUT …/branding` khi `brandingEnabled=false`, chặn `GET /reports/revenue/comparison` khi `multiBranchComparisonEnabled=false`, và chặn Trợ lý AI khi không phải Nâng cao. Hiện hai cờ chỉ được select (`plan-quota.service.ts:23-24`), không nơi nào kiểm | Web khoá giao diện theo cờ (lớp thứ hai). **Cập nhật 6.4:** web **tự chặn ở `00810cf`** — màn Nhận diện khoá mọi ô và nút khi `brandingEnabled = false` (không gọi PUT/POST/DELETE), đã kiểm real (0 request ghi) — BE vẫn chưa chặn nên gọi thẳng API vẫn lưu được |
| 34 | Trung bình | **`POST /stations`** (`stations.service.ts:48-61`, `station.dto.ts:5-21`): (a) **trùng tên** — có ràng buộc duy nhất (chi nhánh, tên) nhưng `create` không bắt lỗi Prisma `P2002` và không có bộ lọc lỗi chung nên theo code sẽ trả **500**; cần trả 409 (chưa kiểm thật vì cấm ghi); (b) `name` chưa có `@MinLength(1)` (tên rỗng sau `trim()` vẫn qua DTO); (c) kiểm định dạng IP/MAC ở BE thay vì chỉ "không rỗng"; (d) **Bluetooth không nên bắt buộc địa chỉ**: đặc tả 11.10 (dòng 1104) nói Bluetooth "chọn máy đã ghép trên tablet POS", BE hiện bắt buộc `printerAddress` cho cả WiFi lẫn Bluetooth. Trạng thái mặc định của quầy mới là `ACTIVE` ([schema.prisma:1246](../../BE_FnB/SmartFnBBackend/prisma/schema.prisma)), khớp đặc tả, không cần đổi | Web kiểm IPv4 (kèm cổng)/MAC, báo trùng tên sớm, ô nhập MAC tạm cho Bluetooth |
| 35 | Trung bình | **Seed vài đơn quầy đã thanh toán** (`paymentStatus = PAID`, có `paidAt`, vài ngày gần đây) để báo cáo demo có số: BE `dfe8100` chỉ tính đơn `PAID` theo `paidAt` nên lịch sử seed cũ không còn được tính, báo cáo Owner hiện 0 (đã kiểm: 7/14/30/90 ngày đều 0) | Báo cáo real hiển thị 0 đồng, không kiểm được số liệu khác 0 |
| 36 | Trung bình | **Ghép màn hình: mã lỗi riêng.** `pair-customer-display` và `pair-calling-display` trả CÙNG `400 "Pairing code is invalid, used, or expired"` cho mã sai, hết hạn, đã dùng và sai loại (`stations.service.ts:116-124`, `153-161`), nên web chỉ nêu chung các nguyên nhân. Cần mã/ thông báo riêng (ví dụ `PAIRING_CODE_NOT_FOUND`, `_EXPIRED`, `_CONSUMED`, `_WRONG_TYPE`). Ngoài ra `pair-calling-display` chỉ cho **một** màn hình gọi số mỗi chi nhánh (thu hồi máy cũ, `stations.service.ts:164-171`): đặc tả chỉ giới hạn một màn hình khách mỗi quầy (BR-45), không nói về màn hình gọi số — cần chốt có cho nhiều TV không | Web gộp thông báo; ghép máy gọi số mới thay máy cũ |
| 37 | Thấp | **Manager ghi được `isEnabled` qua `PATCH /branches/{b}/menu/items/{id}`** (`UpdateBranchMenuItemDto`, `menu.dto.ts:194-214`; route `branch-menu.controller.ts:47-48`, role OWNER, MANAGER). `isEnabled` là việc gán món cho chi nhánh (OW-04, BR-12: cờ kinh doanh và gán món thuộc Owner); BM-02 chỉ cho Manager "hết hàng trong ngày" (`isAvailable`). Đề nghị: Manager chỉ được gửi `isAvailable`, gửi `isEnabled` thì 403 | Web chỉ gửi `{ isAvailable }`, không bao giờ gửi `isEnabled` (`menu/real.ts`, có test) |
| 38 | Trung bình | **Endpoint gói/hạn mức mà Manager đọc được** (chi tiết ở mục 1: `GET /restaurant-chains/{chainId}/subscription`). Hiện `GET /restaurant-chains` trả 403 cho Manager nên web không biết gói đã hết hạn chưa (`plan/real.ts` nhận `chains` chỉ khi là Owner, `store/slices/auth.ts:198`; trạng thái và hạn dùng của Manager là giá trị mock, luôn "active"), và không biết số tài khoản đã dùng/hạn mức thật (nhãn "Đã dùng X/Y" ở màn Nhân viên đang là mock, `account/real.ts:65`). Hệ quả: ở real, nút ghi của Manager **không bao giờ tự khoá** khi hết hạn; BE vẫn chặn ghi bằng 403 không có mã (#31). **Cập nhật 6.6 (đối chiếu `91867ae`):** OWNER cũng cần hai trường này cho màn "Gói của tôi" (OW-10, đặc tả `:309`): `GET /restaurant-chains` → `subscription` chỉ có `{plan, quotas}` (`plan-quota.service.ts:87-95`), không có `status`/`expiresAt`, và khi hết hạn/tạm ngưng thì `getActivePlan` ném 403 rồi `.catch(() => null)` (`branches.service.ts:203`) nên Owner chỉ thấy `subscription = null`, không phân biệt hết hạn/tạm ngưng/chưa có gói. Đề nghị: trả thêm `status`, `expiresAt` trong `subscription` (kể cả khi hết hạn, để web hiện đúng "Đã hết hạn từ …" thay vì "Không có gói đang hoạt động"). Web đã đổi: ở real ghi "Chưa có dữ liệu từ máy chủ (chờ BE #38)", không dùng giá trị mock | Công tắc/nút khoá theo `usePlan()` nên chỉ khoá được ở mock |

### Việc mới sau khảo sát GĐ6 (6.0, đối chiếu `0083289`, chỉ đọc mã)

| # | Mức | Việc cần BE | Hiện web làm gì |
|---|---|---|---|
| 39 | Trung bình | **Branding (OW-07).** (a) Role đọc `GET /restaurant-chains/{id}/branding` còn `WAITER`, `KITCHEN` (v7) và **thiếu `BARISTA`** (`branding.controller.ts:51`). (b) Response không có `isCustom` và không có số phiên bản (đặc tả 10.5: "mỗi lần Owner lưu thì tăng số phiên bản"); khi chưa có bản ghi, `get` trả bộ mặc định `#0F172A/#FFFFFF/#22C55E` (`branding.service.ts:21-25, 64-75`) nên web không biết đã tuỳ biến hay chưa. (c) `logoUrl` do upload trả về là đường dẫn **tương đối** `/uploads/branding/…` (`branding.service.ts:114`) nhưng `PUT` kiểm `@IsUrl` (`dto/branding.dto.ts:13`): gửi lại đúng giá trị BE vừa trả sẽ 400. (d) **Chưa chặn theo gói**: `update`, `uploadLogo`, `reset` không kiểm `brandingEnabled` (`branding.service.ts:77, 105, 142`; liên quan #33). (e) Giới hạn rộng hơn đặc tả 10.2: logo nhận cả **WebP** và tới **5 MB** (`branding-upload.ts:3`, `branding.service.ts:162-169`; đặc tả PNG/JPG ≤ 1 MB), tên hiển thị tới **150** ký tự (`dto/branding.dto.ts:8`; đặc tả ≤ 50). (f) `PUT` không xoá riêng được logo, chỉ `DELETE` đặt lại cả màu và tên | Web giữ luật đặc tả (PNG/JPG ≤ 1 MB, tên ≤ 50); không gửi lại `logoUrl` tương đối; suy `isCustom` bằng cách so với bộ mặc định của BE. **Cập nhật 6.4 (đối chiếu `91867ae`, các điểm (a)–(f) vẫn đúng, chưa BE nào đổi):** web đã nối real (`987bf2d`, `00810cf`). Điểm lệch bổ sung: (g) ~~đổi riêng tên hiển thị không được nhận ra~~ → **đã xử lý ở web (6.5, `29fb9d9`)**: web tách phần "giao diện" (màu/logo) khỏi tên, chỉ đổi tên thì áp tên và giữ màu nền tảng; `isCustom` và `version` từ BE vẫn là mong muốn (web đang suy), không còn là chỗ vỡ; (h) `GET` branding thiếu `BARISTA`, thừa `WAITER`/`KITCHEN` (đã ghi ở (a)); (i) `413` do Multer ("File too large") đến trước service nên không có mã nghiệp vụ; web dịch theo câu chữ |
| 40 | Trung bình | **Liên kết PayOS (OW-06).** `PUT /restaurant-chains/{id}/payos-channel` chỉ mã hoá và lưu ba khoá (`payos-channel.service.ts:25-39`): (a) không gọi PayOS kiểm khoá (đặc tả 11.3: "backend gọi PayOS xác nhận địa chỉ webhook, không xác nhận được thì báo lỗi, không lưu"); (b) không đăng ký/xác nhận webhook; (c) response chỉ `{configured, id, createdAt, updatedAt}` (`:16-39`), không có trạng thái Đang kiểm tra/Lỗi (đặc tả 5.6); (d) webhook là một route chung `POST /webhooks/payos` (`payos-webhook.controller.ts:14`), không theo kênh như đặc tả 11.3 (`/webhooks/payos/{mã kênh}`). Ghi chú cấu hình: `PUT` cần `PAYOS_MASTER_KEY`, thiếu thì 503 (`payos-cipher.service.ts:35`; biến tuỳ chọn khi khởi động, `environment.validation.ts:89`), BE local hiện chưa đặt. Khoá không bao giờ trả về trong response (đúng BR-25). **Cập nhật 6.5 (đối chiếu `91867ae`, không đổi):** (e) đặc tả 6.7 (`Smart-FnB-Dac-ta-v9.md:574`) muốn khoá "hiện dạng che (ví dụ ••••3f9a)" nhưng response không có chữ số cuối nào → web không hiện dạng che; cần BE trả thêm, ví dụ `clientIdLast4`/`apiKeyLast4`, nếu muốn đúng đặc tả; (f) không có trạng thái Lỗi khi PayOS từ chối khoá lúc tạo QR (đặc tả 5.6 dòng "Đã liên kết → Lỗi"): cần cột trạng thái hoặc kết quả lần gọi PayOS gần nhất; (g) `PAYOS_MASTER_KEY` chưa đặt ở BE local nên `PUT` thật trả 503 — web đã nối real nhưng KHÔNG gọi `PUT`/`DELETE` thật ở lượt 6.5 (chặn ở CDP, so với DTO) | Web hiện 2 trạng thái thật (Chưa/Đã liên kết, kèm ngày); "Đang kiểm tra" chỉ chớp lúc lưu; "Lỗi" chỉ mock, chờ mục này. 503 thiếu khoá mã hoá → câu tiếng Việt "Máy chủ chưa sẵn sàng lưu khoá PayOS…". Không hiện dạng che khoá |

**Câu hỏi cho BE (5.7b):** khi Manager tắt món ở chi nhánh bằng `PATCH …/menu/items/{id}` (`isAvailable=false`), dòng đã thanh toán chứa món đó có chuyển sang "Hết món" và báo Manager như BR-36 không? Theo `counter-operations.service.ts` chỉ đường Barista (`PATCH /barista/menu-items/{id}/availability`) gọi `markPaidItemsOutOfStock`; đường Manager chỉ upsert cờ. **Đã trả lời khi đọc `0083289`:** với *tuỳ chọn* thì `PATCH /manager/menu-options/:id/availability` có làm (`manager-operations.service.ts:221-247`); với *món* thì Manager vẫn không (xem bảng "BE lệch quyết định/đặc tả (`0083289`)").

### Tình trạng theo BE `dfe8100` (đối chiếu 2026-10-02)

| # | Tình trạng | Ghi chú |
|---|---|---|
| 1 | Chưa | không có tiến trình gửi `email_outbox` |
| 2 | Một phần | từ chối hồ sơ đã xếp email vào outbox, nhưng #1 chưa có người gửi |
| 3, 5, 6, 7, 9, 11 | Chưa | DTO/service không đổi |
| 4 | **Đã làm** | bỏ ví, rút tiền, sổ cái (migration `20261002120000`); web đã bỏ từ trước |
| 8 | **Đã làm** | `GET /public/service-plans`; web chưa chuyển Landing vì chỉ có 2 gói giá 0 (#32) |
| 10 | Một phần | có 2 cờ; thiếu `tier` và cờ AI (→ #30) |
| 12–22 | Chưa | không có `option-groups`; `remainingPortions` còn |
| 23, 24, 25, 26, 27 | Chưa | module `auth`, `employees`, `users` không đổi; không có `PATCH /stations` |
| 28 | Một phần | có `POST /stations/pair-calling-display`, token thiết bị, `GET /public/calling-display/ready-orders`; thiếu `GET /display-devices` |

### Tình trạng theo BE `0083289` (đối chiếu 2026-10-03, chỉ đọc mã; rà lại đủ #1–#38 khi chốt GĐ5 ở 5.8e, không có mục nào đổi so với bảng này)

> BE `0083289` = `dfe8100` + 3 commit: `3a222e4` quản lý tuỳ chọn cho Owner, `93cc88e` tải logo nhận diện, `0083289` module Branch Manager. Migration mới duy nhất: `20261003000000_branch_manager` (thêm `payments.confirmation_reason`, `payments.received_amount`; bảng `branch_audit_logs`). **Seed không đổi** (vẫn `DEMO_OPERATIONS`, `STARTER`). *(Cập nhật 2026-10-03 sau khi build lại BE local: migration đã áp, `GET /manager/menu-options|staff|orders|reports|audit-logs` bằng Manager thật đều 200, shape khớp mã; trước đó bản build cũ trả 404.)*

| # | `dfe8100` | `0083289` | Ghi chú (file:dòng, BE) |
|---|---|---|---|
| 1 | Chưa | **Chưa** | không có chỗ đọc `email_outbox` để gửi (tìm trong `src/`) |
| 12 | Chưa | **Đã làm** | `chain-menu.controller.ts:114-205` (`option-groups`, `…/options`), role OWNER (`:49`). DTO `menu.dto.ts` `CreateMenuOptionGroupDto`, `CreateMenuOptionDto`: `code` `^[A-Z0-9_-]+$` ≤ 50 (khớp giả định web), `isRequired`, `min/maxSelections`, `displayOrder`, `isActive` (khi sửa) |
| 13 | Chưa | **Đã làm** | `PUT/GET items/:itemId/option-groups` (`chain-menu.controller.ts:329-345`), body `{optionGroupIds[]}` (thứ tự mảng) |
| 14 | Chưa | **Đã làm** | `UpdateMenuOptionGroupDto/UpdateMenuOptionDto.isActive` |
| 15 | Chưa | Chưa | không có `isDefault` trong schema/DTO |
| 16 | Chưa | Chưa | `getBranchMenu`/`listItems` không trả `optionGroups` |
| 17 | Chưa | Chưa | không có `allowBatching` |
| 19 | Chưa | **Chưa** | `getBranchMenu` (`menu.service.ts`) vẫn lọc ẩn món Owner tắt |
| 20 | Chưa | **Đã làm, khác đề xuất** | `PATCH /manager/menu-options/:id/availability` (role MANAGER) thay cho `PATCH /branches/{b}/menu/options/{id}`; chi tiết ở bảng dưới |
| 21 | Chưa | Chưa | `priceDelta` `@IsNumber({maxDecimalPlaces: 2})` (không bắt số nguyên) |
| 22 | Chưa | Chưa | `remainingPortions` còn ở `getBranchMenu`, `UpdateBranchMenuItemDto` |
| 23 | Chưa | **Chưa** | `POST /auth/managers` không đổi (`create-staff.dto.ts`, `password` bắt buộc) |
| 24 | Chưa | **Một phần, lệch** | có `/manager/staff*` nhưng bắt buộc mật khẩu, không gửi email (xem bảng dưới) |
| 25 | Chưa | Chưa | payload vẫn `setupPath: '/auth/setup-password'` (`employees.service.ts:179`, `platform-admin.service.ts:259,592`) |
| 26 | Chưa | **Chưa** | `users.service.ts` `assertOwnerCanCreateAccount` và `manager-staff.service.ts:127-133` đều đếm cả tài khoản đã khoá |
| 27 | Chưa | Chưa | `stations.controller.ts` chỉ có GET/POST `stations`, POST ghép, DELETE `display-devices/:id` |
| 28 | Một phần | Một phần | vẫn thiếu `GET /display-devices` |
| 29 | Chưa | Chưa | `CreateServicePlanDto.maxTables` vẫn bắt buộc (`platform-admin.dto.ts:158`) |
| 30 | Chưa | Chưa | có `brandingEnabled`, `multiBranchComparisonEnabled`; không có cờ AI và `tier` |
| 31 | Chưa | **Chưa** | `branch-access.service.ts:81-83, 118-120` vẫn 403 không mã. Ghi chú: `assertCanAccessBranch` (`:87-92`) không kiểm gói nên theo mã **GET của nhân viên không bị chặn khi hết hạn** (chưa kiểm real); chỉ thao tác ghi bị chặn |
| 32 | Chưa | Chưa | seed không đổi: vẫn `DEMO_OPERATIONS`, `STARTER` (giá 0), chưa có BASIC/STANDARD/ADVANCED |
| 33 | Chưa | Chưa | hai cờ gói chỉ được `select` (`plan-quota.service.ts:23-24`), không nơi nào kiểm để chặn |
| 34 | Chưa | Chưa | tạo quầy không bắt `P2002` (`stations.service.ts:78` chỉ cho mã ghép) |
| 35 | Chưa | Chưa | seed không đổi nên báo cáo demo vẫn 0 đồng |
| 36 | Chưa | Chưa | thông báo ghép không đổi (`stations.service.ts:124,161`; `:144,185` "already consumed" chỉ khi đua) |
| 37 | (mới) | **Chưa** | `UpdateBranchMenuItemDto` vẫn cho Manager gửi `isEnabled` (`menu.dto.ts:194-214`) |
| 38 | (mới) | **Chưa** | không có endpoint gói cho Manager |
| QR PayOS hết hạn | Chưa | Chưa | `payos/*` không đổi |
| (6.0, 2026-10-04) BE `origin/main` | — | **Vẫn `0083289`** | `git fetch` + `git ls-remote` đều `0083289`; không commit mới, không migration mới; #1, #15, #16, #17, #19, #23, #24, #25, #38 giữ nguyên **Chưa** |
| #39, #40 | — | Mới | xem bảng "Việc mới sau khảo sát GĐ6" |
| **BE `91867ae`** (2026-10-04, build local 2026-10-05) | — | Xem bảng "Tình trạng theo BE `91867ae`" ngay dưới | một commit `feat: complete cashier and barista v9.1 flows` (12 file) |
| #41 (Owner đọc trạng thái tuỳ chọn theo chi nhánh) | — | **Không thêm** | đặc tả không đòi: OW-03/OW-04 chỉ cấp chuỗi, cờ theo chi nhánh thuộc BM-02 (xem BAN-GIAO mục 8b). Real bỏ panel |
| Xác nhận thủ công (BR-29) | Lệch | **Đã sửa** | `POST /payments/:id/confirm`: CASHIER chỉ tiền mặt; ngoài tiền mặt cần MANAGER + `reason` + `receivedAmount` (`docs/branch-manager-api.md`, `payments.controller.ts`) |
| Huỷ hoá đơn | — | Mới | `POST /invoices/:id/cancel` cần MANAGER + lý do; **không** phải huỷ đơn đã trả (BM-06 vẫn chưa) |
| Logo nhận diện | — | Mới | `93cc88e` `branding-upload.ts`, `branding.controller.ts`; liên quan #18 và giai đoạn 6 |

### Tình trạng theo BE `91867ae` (build local 2026-10-05; đối chiếu bằng đọc mã + GET thật)

> BE `91867ae` = `0083289` + 1 commit `feat: complete cashier and barista v9.1 flows` (Vũ Hà Gia Bảo, 2026-10-04; 12 file). Migration mới duy nhất `20261004160000_add_v91_menu_defaults_and_batching` (thêm `menu_items.allow_batching` và `menu_options.is_default`, đều có default; **không phá huỷ**); đã áp (21/21). Biến môi trường, Docker, entrypoint, `package.json` **không đổi**. Mọi mục # **không** có trong bảng này là **không đổi so với `0083289`** (file liên quan không nằm trong diff `0083289..91867ae`): #1, #16, #19, #23–#27, #29–#40.

| # | `0083289` | `91867ae` | Ghi chú (file:dòng, BE) |
|---|---|---|---|
| 17 | Chưa | **Đã làm** | `allowBatching`: `menu.dto.ts:112-119, 178-185`; `menu.service.ts:47` (đã kiểm GET `menu/items` 200, 3 món đều `true`) |
| 15 | Chưa | **Một phần** | cột `is_default` + seed (`schema.prisma:901`, `seed.ts:601-620`); `optionSelect` (`menu.service.ts:55-65`) không trả, hai DTO tuỳ chọn không nhận (đã kiểm GET `option-groups`: không có `isDefault`) |
| 22 | Chưa | **Xấu hơn** | `reservePortions` `counter-operations.service.ts:1165` (gọi `:215`, `:385`), `NO_REMAINING_PORTIONS` `:120`, hoàn suất `:564` — trái quyết định v9 bỏ kho; đã hỏi Bảo |
| QR PayOS hết hạn | Chưa | **Một phần** | hạn 10 phút `payos-payment.service.ts:78, 91, 107`; còn thiếu huỷ QR và "Kiểm tra lại" |
| 42 (mới) | — | **Mới** | xem dưới |

**#42 (Trung bình) — Seed chạy mỗi lần container khởi động và ghi đè dữ liệu mẫu.** `docker-entrypoint.sh:4-5` chạy `prisma migrate deploy` rồi `prisma db seed` mỗi lần khởi động; seed dùng `upsert` với `update: { name, priceDelta, displayOrder, isDefault, isActive: true }` cho tuỳ chọn mẫu (`seed.ts:601-620`, dòng `update` ở `:612`). Hệ quả: Owner sửa tên/giá/thứ tự hoặc **tắt** một tuỳ chọn mẫu (M, L, 100% đường, 50% đường) thì sau khi BE khởi động lại (build, reboot máy, `docker compose up`) tuỳ chọn đó bị đặt lại, `isActive` về `true`. Đề xuất: seed chỉ `create` khi chưa có (hoặc `update: {}`), hoặc tách seed khỏi entrypoint (chạy riêng bằng lệnh). Web không bị vỡ nhưng dữ liệu thử của Owner có thể mất sau mỗi lần khởi động BE. **Cập nhật 6.4:** seed cũng ghi đè **tên hiển thị** của nhận diện chuỗi demo (`seed.ts:247-255`, `update: { displayName: 'Smart F&B Demo Chain' }`; `updated_at` của hàng nhận diện đúng bằng lúc container khởi động) — Owner đổi tên hiển thị thử trên BE local sẽ bị đặt lại sau mỗi lần BE khởi động lại; màu và logo không bị seed đụng tới.

**Module `/manager/*`** (`branch-manager.controller.ts`, `@Roles(MANAGER)` `:35`; chi nhánh lấy từ JWT, `managerActor` `manager-scope.ts:6-11`, không nhận `branchId`):

| Endpoint | Gửi → nhận (DTO) | Hạn mức / hết hạn |
|---|---|---|
| `GET /manager/staff` (`:48`) | query `search, role∈CASHIER\|BARISTA, status, page, limit` (`manager.dto.ts:74`) → `{items[{id, branchId, employeeCode, firstName, lastName, jobTitle, dateOfBirth, hireDate, status, user{id, email, phone, status, role{code}}}], total, page, limit}` (`manager-staff.service.ts:23-36, 93`) | không chặn khi hết hạn |
| `POST /manager/staff` (`:54`) | `ManagerCreateStaffDto` (`manager.dto.ts:27`, thừa kế `CreateStaffDto`): `email, password (8–128, hoa/thường/số), role, employeeCode (bắt buộc), firstName, lastName, phone?, jobTitle?, hireDate?, dateOfBirth?` → hồ sơ nhân viên | **tính hạn mức** `employees + owners ≥ maxAccounts` → 409 `PLAN_LIMIT_REACHED` **không kèm** `quota/currentPlan/suggestedPlans` (`manager-staff.service.ts:127-139`), đếm cả tài khoản khoá; hết hạn → 409 "Subscription is not active" (`:126`) và 403 ở `scope(user, true)` (`:49`) |
| `GET/PATCH /manager/staff/:id` (`:64, :73`) | PATCH `ManagerUpdateStaffDto` (mọi trường của create trừ `password`, kể cả **`role`, `email`, `employeeCode`**; không nhận `null` nên không xoá được số điện thoại) | PATCH: 403 khi hết hạn; đổi role/email thì thu hồi phiên (`:205`) |
| `PATCH /manager/staff/:id/status` (`:85`) | `{status ∈ ACTIVE\|INACTIVE\|SUSPENDED, reason (3–500, bắt buộc)}` (`manager.dto.ts:46`) | 403 khi hết hạn; **mở khoá không kiểm hạn mức** (`manager-staff.service.ts:217-233`); khoá thu hồi phiên |
| `POST /manager/staff/:id/reset-password` (`:97`) | `{password, reason}` (`manager.dto.ts:37`) → `{message, employeeId}`; **đặt thẳng mật khẩu, không gửi email**; thu hồi phiên, vô hiệu token đặt mật khẩu (`:235-254`) | 403 khi hết hạn |
| `GET /manager/menu-options` (`:108`) | không tham số → mảng phẳng `[{id, name, priceDelta, isActive, group{id, name, isActive}, isAvailable, effectiveAvailable}]` (`manager-operations.service.ts:182-202`). **Không** có luật nhóm, thứ tự, mã, `isDefault`; `effectiveAvailable = option.isActive && group.isActive && isAvailable` | không chặn khi hết hạn |
| `PATCH /manager/menu-options/:id/availability` (`:114`) | `{isAvailable}` (`manager.dto.ts:92`) → `{optionId, isAvailable, effectiveAvailable, affectedOrderIds}` (`manager-operations.service.ts:204-264`). Lưu cờ chi nhánh kể cả khi Owner đã tắt (không từ chối; `effectiveAvailable` vẫn false). Khi tắt: dòng đã trả (`COUNTER_PICKUP`, `PAID`, `QUEUED/PREPARING`) chuyển `OUT_OF_STOCK` cùng giao dịch, bắn `menu.availability.changed` và `manager.order.attention-required` (`branch-manager.controller.ts:126-133`) → **trả lời BR-36 cho tuỳ chọn: có**. Đường món (`PATCH /branches/{b}/menu/items/{id}`) **không** làm việc này (`menu.service.ts` `updateBranchMenuItem`); chỉ đường Barista có | 403 khi hết hạn |
| `GET /manager/reports` (`:136`) | query `from, to (YYYY-MM-DD, ≤ 366 ngày), granularity day\|week\|month, limit` → `{branch, range, summary, revenue, payments, topItems, topOptions, topToppings, ordersByHour, preparation, cancellations{…items}}` (`manager-reports.service.ts:96-117`) | đọc |
| `GET /manager/orders` (`:147`), `GET /manager/orders/:id` (`:157`) | query `search, orderCode, callNumber, from, to (placedAt, ISO có múi giờ), status, paymentStatus, paymentMethod, type, page, limit` → `{items, total, page, limit}`; chi tiết có `items[].selectedOptions` (ảnh chụp giá lúc bán), `payments`, `audit` | đọc. **Chưa có**: danh sách Cần xử lý riêng (chỉ có sự kiện socket), huỷ đơn đã trả (BM-06), hoàn tiền |
| `GET /manager/audit-logs` (`:167`) | `entityId?, page, limit` → `{items[BranchAuditLog], total…}` | đọc |

### Tình trạng cuối GĐ6 (chốt 6.7, 2026-10-06; BE `91867ae`) — mỗi mục một dòng

> Tổng hợp từ các bảng trên; không mục nào đổi so với đối chiếu `91867ae` (6.3c) ngoài những dòng đã ghi. Cột cuối là việc web đang làm thay thế.

| # | Trạng thái BE | Web đang làm gì thay thế |
|---|---|---|
| 1 | Chưa (không có tiến trình gửi `email_outbox`) | Có trang `/setup-password` (5.2); chưa có email thật nên link chưa tới người dùng |
| 12–14 | **Đã làm** (nhóm/tuỳ chọn Owner, gắn nhóm, `isActive`) | Real từ 6.3 (`options=real`), lưu từng thao tác |
| 15 | Một phần (`is_default` có ở DB, API không trả/nhận) | Ô `isDefault` khoá "chờ BE #15" ở real |
| 16 | Chưa (menu không trả `optionGroups`) | Đọc cấu hình từng món N+1, tối đa 4 request song song |
| 17 | **Đã làm** (`allowBatching`) | Real từ 6.3d, một nguồn `MenuItem.allowBatching` |
| 19 | Chưa (menu chi nhánh vẫn lọc ẩn món Owner tắt) | Dòng "Owner đã tắt" chỉ kiểm ở mock |
| 20 | Đã làm, khác đề xuất (`PATCH /manager/menu-options/:id/availability`) | Module `branchOptions` real (5.7c) |
| 21 | Chưa (`priceDelta` không bắt số nguyên) | Web tự bắt giá số nguyên (BR-19) |
| 22 | **Xấu hơn** (`remainingPortions` còn, thêm đặt/hoàn suất) | Web không gửi/đọc `remainingPortions` |
| 23, 24 | Chưa / Một phần, lệch (mật khẩu do Manager gõ) | Owner tạo Manager khoá ở real; Cashier/Barista của Manager là mock + banner "dữ liệu mẫu" |
| 25 | Chưa (payload `setupPath` cũ) | Web đọc token từ link, xoá khỏi URL |
| 26 | Chưa (đếm cả tài khoản khoá, mở khoá không kiểm hạn mức) | Web tính theo đặc tả 13.1 ở mock; real hiện số của BE; BE vẫn chặn thật |
| 27 | Chưa (không PATCH quầy) | Đổi tên, ngừng dùng, sửa máy in khoá "chờ BE #27" |
| 28 | Một phần (thiếu `GET /display-devices`) | Danh sách màn hình gọi số là mock |
| 29 | Chưa (`maxTables` bắt buộc) | Web giữ `maxTables` theo JSON BE |
| 30 | Chưa (không có cờ AI, không `tier`) | Hai cờ đọc thật; cờ AI và cấp suy từ MÃ gói; "Gói của tôi" ghi "chờ BE #30" cho AI |
| 31 | Chưa (hết hạn trả 403 không mã) | Web nhận diện theo câu "subscription is read-only" |
| 32 | Chưa (seed chỉ `DEMO_OPERATIONS`, `STARTER`) | Landing đọc giá từ cấu hình mock chung |
| 33 | Chưa (BE chỉ `select` hai cờ, không chặn) | Web tự khoá theo cờ (màn Nhận diện khoá khi gói không có) |
| 34 | Chưa (tạo quầy trùng tên trả 500) | Web báo trùng trước khi gửi |
| 35 | Chưa (seed không có đơn đã trả) | Số liệu báo cáo demo 0 đồng; `phase5` real có 1 SKIP |
| 36 | Chưa | Giữ thông báo ghép hiện có |
| 37 | Chưa (`UpdateBranchMenuItemDto` vẫn nhận `isEnabled`) | Web chỉ gửi `{isAvailable}` |
| **38** | **Đã làm ở `de4f55c` (6.9) và web đã dùng ở `f8fc9c2`/`6918747` (6.11), xem bảng "Tình trạng theo BE `de4f55c`" ngay dưới; cột này là trạng thái lúc chốt 6.7:** Chưa (không `status`/`expiresAt`; Owner chỉ thấy `subscription = null` khi hết hạn; Manager 403) | Owner: "Chưa có dữ liệu từ máy chủ (chờ BE #38)", khối "Không có gói đang hoạt động" khi null; Manager lấy trạng thái từ mock nên không tự khoá |
| 39 | Chưa (`isCustom`, `version`, vai đọc, chặn gói, giới hạn logo/tên rộng hơn đặc tả) | Web suy `isCustom`, tách `lookCustom` (chỉ đổi tên áp tên), nạp lại khi điều hướng, giữ luật đặc tả |
| 40 | **Đã làm ở `de4f55c` (6.9, xem bảng dưới); lúc chốt 6.7:** Chưa (không kiểm khoá, không che ••••, không Đang kiểm tra/Lỗi, webhook chung) | Hai trạng thái thật; không hiện khoá che; 503 `PAYOS_MASTER_KEY` có câu tiếng Việt; Lỗi chỉ ở mock |
| 41 | Không thêm | — |
| 42 | **Mới** (seed chạy mỗi lần khởi động, ghi đè dữ liệu mẫu) | Kiểm lại sau mỗi lần BE khởi động; không dựa vào dữ liệu demo đã sửa |
| QR PayOS hết hạn | Một phần (hạn 10 phút; thiếu huỷ QR và "Kiểm tra lại") | Chưa có màn (thuộc GĐ7+) |

### Tình trạng theo BE `de4f55c` (build local 2026-10-08; đối chiếu bằng đọc mã + GET thật)

> BE `de4f55c` = `91867ae` + 5 commit (Vũ Hà Gia Bảo, Le Van Tien; 2026-10-04 → 06): `05b142f`, `dd1e561`, `bcac8f5`, `b804462` (màn hình khách của thu ngân — việc bên mobile: `stations.controller.ts`, `stations.service.ts`, `realtime.gateway.ts`, `jwt-auth.guard.ts`, cột `pos_stations.cart_snapshot`) và `de4f55c` `feat: expose subscriptions and verify PayOS channels` (25 file; trả lời #38 và #40). Migration mới (3, đã áp, tổng 24/24): `20260921113144_init` (trùng nội dung byte-by-byte với `20260923092955_align_order_item_audit_foreign_keys` đã áp: bỏ rồi tạo lại 2 khoá ngoại `order_items` `SET NULL`; timestamp cũ bất thường, kết quả không đổi), `20261004180000_add_customer_display_snapshot` (thêm cột JSONB null), `20261006140000_payos_channel_verification` (enum `PayosChannelStatus`, 6 cột mới ở `payos_channels`, bảng `payos_channel_audit_logs`). Không migration nào phá huỷ. Seed, compose, Dockerfile, entrypoint **không đổi** so với `91867ae`. Mọi mục # không có trong bảng này là **không đổi so với `91867ae`**.

| # | `91867ae` | `de4f55c` | Ghi chú (file:dòng, BE) |
|---|---|---|---|
| 38 | Chưa | **Đã làm** (thiếu cờ AI/`tier` → #30) | `GET /restaurant-chains/:chainId/subscription` cho OWNER và MANAGER (`chain-subscription.controller.ts:16-17, 24-34`; Manager chỉ đọc chuỗi của chi nhánh mình, `branch-access.service.ts` `assertCanReadChain`). Snapshot `{status, expiresAt, plan, quotas}` (`plan-quota.service.ts` `getSubscriptionSnapshot`): gói hết hạn/tạm ngưng vẫn trả; `ACTIVE` mà quá hạn tự thành `EXPIRED`; không có gói → `null`. `GET /restaurant-chains` (`branches.service.ts`) dùng snapshot này nên không còn `null` khi hết hạn. Đã kiểm GET thật: Owner 200 và Manager 200, `status ACTIVE`, `expiresAt 2099-12-31`; `GET /restaurant-chains` của Manager vẫn 403 |
| 40 (a) kiểm khoá | Chưa | **Đã làm** | `PUT` gọi `confirmWebhook` tới `api-merchant.payos.vn/confirm-webhook` (`payos-channel.service.ts:74`, `payos-api.service.ts:32-43`); PayOS từ chối → 422, tạm lỗi → 502, KHÔNG lưu khoá (`:76-89`) |
| 40 (b) che khoá | Chưa | **Đã làm** | `clientIdLast4`, `apiKeyLast4` (`dto/payos-channel.dto.ts:30-32`; lưu `slice(-4)` ở `payos-channel.service.ts:99-100`) |
| 40 (c) trạng thái | Chưa | **Đã làm** | `status` `LINKED`/`ERROR`, `lastError`, `lastVerifiedAt` (`dto/payos-channel.dto.ts:27-36`); `ERROR` đặt khi PayOS từ chối lúc tạo QR (`payos-payment.service.ts:106`), `LINKED` khi tạo QR được (`:100`). Chưa có "Đang kiểm tra" (xác minh chạy đồng bộ trong `PUT`) |
| 40 (d) webhook theo kênh | Chưa | **Đã làm** | `POST /webhooks/payos/:webhookCode` (`payos-webhook.controller.ts:15`), UUID `webhook_code` mỗi kênh. **Route cũ `/webhooks/payos` đã bỏ — báo nhóm mobile/PayOS** |
| 40 (e) audit log | Chưa rõ | **Đã làm** | bảng `payos_channel_audit_logs` (tạo, cập nhật, gỡ, xác minh thất bại: `payos-channel.service.ts:77-87, 122-131, 143-152`) |
| 38 (web) | — | **Web đã dùng ở `f8fc9c2`, `6918747`, `e623265` (6.11)** | Owner: `GET /restaurant-chains` → `subscription.status`/`expiresAt` thật; Manager: `GET /restaurant-chains/:id/subscription` khi nạp khu vực (lỗi đọc không chặn khu vực, không toast; dòng "Chưa tải được hạn mức gói" + Thử lại). Nhãn tiếng Việt đủ ACTIVE/SUSPENDED/EXPIRED, ngày dd/MM/yyyy giờ Việt Nam (`2099-12-31T23:59:59.999Z` hiện 01/01/2100). EXPIRED/SUSPENDED vào chế độ chỉ đọc có sẵn; "Đã dùng X/Y" ở `/manager/staff` khớp `quotas`, không còn "(số liệu mẫu)"; đạt hạn mức khoá nút Thêm. Còn thiếu ở BE: cờ AI và `tier` (#30) |
| 40 (web) | — | **Web đã dùng ở `0960e16` (6.10)** | khoá che `••••<last4>` (`clientIdLast4`, `apiKeyLast4`), `lastVerifiedAt`, `status ERROR` → câu "PayOS từ chối khi tạo QR gần nhất…" (KHÔNG hiện `lastError`), 422/502/503 `PAYOS_WEBHOOK_BASE_URL` có câu tiếng Việt; "Đang kiểm tra" là trạng thái của web trong lúc `PUT` chờ xác minh. Chưa kiểm được `PUT` thật (BE local không đặt `PAYOS_MASTER_KEY`, `PAYOS_WEBHOOK_BASE_URL`); đã kiểm bằng trả lời giả đúng dạng BE ở CDP |
| Biến môi trường | — | **Mới** | `PAYOS_WEBHOOK_BASE_URL`: TUỲ CHỌN khi khởi động (rỗng được, chỉ kiểm khi có giá trị phải là URL HTTP(S) tuyệt đối: `environment.validation.ts:26-28, 95-97`); thiếu thì `PUT` payos-channel trả 503 "PAYOS_WEBHOOK_BASE_URL is not configured" (`payos-channel.service.ts:67-70`). Cần URL công khai để PayOS gọi được. `PAYOS_MASTER_KEY` vẫn như cũ. BE local KHÔNG đặt cả hai (quyết định GĐ6) nên `PUT` thật vẫn 503 |
| Màn hình khách thu ngân | — | **Mới (mobile)** | `pos_stations.cart_snapshot`, đồng bộ lại sau khi kết nối lại (`realtime.gateway.ts`); web không dùng |

### Việc mới sau khảo sát GĐ7 (7.0, BE `de4f55c`, chỉ đọc mã)

| # | Mức | Việc cần BE | Căn cứ đặc tả | Chặn demo tuần 10? |
|---|---|---|---|---|
| 43 | **CAO** | **Huỷ đơn đã thanh toán (BM-06) + trạng thái hoàn**: `POST /manager/orders/:orderId/cancel` (toàn bộ hoặc theo `itemIds`), body `reason` (bắt buộc), `refundMethod` (`CASH_AT_COUNTER` \| `EXTERNAL_TRANSFER`); đơn lưu số tiền hoàn theo giá lúc bán và trạng thái hoàn (Đã hoàn tiền mặt / Chờ chủ chuỗi hoàn / Đã hoàn); `POST …/refund/mark-refunded` cho Owner/Manager; gỡ dòng chưa xong khỏi hàng đợi, dòng đã xong ghi hao hụt; audit; báo cáo Manager trừ vào ngày huỷ và có mục đơn huỷ + số tiền hoàn (hiện `cancellations` chỉ đếm đơn `CANCELLED`, kể cả đơn chưa trả, không có tiền hoàn: `manager-reports.service.ts` truy vấn `cancellations`). Hiện chỉ có `POST /cashier/orders/:id/cancel` cho đơn CHƯA trả (`counter-operations.service.ts:521-570`) | BM-06 (`Dac-ta-v9.md:341`), 6.5 (`:538-552`), BR-49, BR-50 (`:751-752`), 5.3 (`:444`) | Không (demo tiền mặt/QR); cần cho tuần 7 lịch |
| 44 | **CAO** | **"Cần xử lý" và "Lệch số tiền"**: webhook PayOS số tiền khác tổng đơn hiện chỉ ghi `PaymentWebhookEvent` REJECTED rồi bỏ qua (`payos-payment.service.ts:178-190`), không có trạng thái nào để Manager thấy. Cần trạng thái thanh toán/đơn "Lệch số tiền" (hoặc cờ `needsAttention` + `attentionReason`), lọc `GET /manager/orders?needsAttention=true`, sự kiện socket `manager.order.attention-required` với `reason: AMOUNT_MISMATCH \| MANUAL_CONFIRM_PENDING \| PAID_AFTER_CANCEL`; xác nhận thủ công theo BR-28 (nhận thừa/đủ → xác nhận, phần dư ghi nhận; nhận thiếu → huỷ đơn + ghi khoản phải hoàn; hiện `confirm` chấp nhận mọi `receivedAmount` > 0 và ghi chênh lệch vào audit, không huỷ khi thiếu: `payments.service.ts:171-176, 192-203`). **Bổ sung 7.0b: `confirm` KHÔNG ép BR-28** — web (QĐ 62) tự chặn nhận thiếu, BE vẫn chấp nhận mọi `receivedAmount` > 0 và coi đơn đã trả đủ (`payments.service.ts:171-176, 192-203`). Hiện sự kiện `manager.order.attention-required` chỉ phát khi hết món hoặc tuỳ chọn: `reason: ITEM_OUT_OF_STOCK` (`counter-operations.controller.ts:294-312`, pha chế báo hết món) và `OPTION_OUT_OF_STOCK` (`counter-operations.controller.ts:314`, `branch-manager.controller.ts:121-131`), kèm `orderIds`; không có lý do nào cho thanh toán | BR-28 (`:710`), BR-29, 5.5 (`:458`), BM-05 (`:339`), mục 6.11 (`:629`) | Không cho luồng tiền mặt/QR thường; chặn BM-05 phần "lệch" |
| 45 | Trung bình | **QR hết hạn và tiền về muộn**: (a) hết hạn QR chỉ huỷ khi thu ngân gọi `GET /cashier/orders/:id` (`counter-operations.service.ts:255-267`), không có job; đơn chưa ai mở vẫn `CONFIRMED/UNPAID` quá 10 phút trong danh sách Manager; (b) huỷ không gọi PayOS huỷ link (BR-30) — `cancelUnpaid` không đụng PayOS; (c) webhook hợp lệ về cho đơn đã huỷ: `ConflictException` (`payos-payment.service.ts:208-210`) làm transaction quay lại nên KHÔNG ghi sự kiện, không báo Manager (BR-31); (d) chưa có "Kiểm tra lại" (BR-29, 6.11 `:626`; việc mobile nhưng cùng hàm xác nhận) | BR-26, BR-30, BR-31 (`:708-712`), 6.3 (`:506-514`) | Không (QR còn chạy), nhưng đơn QR hết hạn hiện không tự về Đã huỷ |
| 46 | Thấp | **Manager chỉ xác nhận thủ công thanh toán KHÔNG phải tiền mặt**: `POST /payments/:paymentId/confirm` cho Manager xác nhận cả thanh toán CASH, khi đó `manual=false` nên không cần lý do và không ghi người xác nhận như xác nhận thủ công (`payments.service.ts:167-170`). Đơn quầy tiền mặt luôn tạo thanh toán SUCCESS ngay nên Manager không có lý do gì xác nhận CASH. Đề nghị chặn (403/409) cho CASH ở đường này, hoặc ghi rõ đây chỉ là đường của v7 | BM-05 (`:339`), BR-29 (`:711`), ma trận quyền (`:1339`) | Không; web (QĐ 62) đã không hiện nút cho tiền mặt |
| 47 | Trung bình | **`GET /manager/reports` lẫn đơn v7**: không lọc `type`; các mục dựa vào thanh toán và giờ đặt tính cả 70 đơn `DINE_IN` seed cũ: "theo hình thức thanh toán" (37 CASH + 14 BANK_TRANSFER = 8.380.000, trong khi doanh thu 960.000) và "đơn theo giờ" (`manager-reports.service.ts`, truy vấn `payments` và `ordersByHour`; truy vấn `sales` không đếm `DINE_IN` vì `paid_at` rỗng). Đề nghị chỉ tính `COUNTER_PICKUP`, hoặc bỏ đơn v7 khỏi seed. **Số liệu mới 7.3 (BE `de4f55c`, sau khi máy khởi động lại 09/10 và seed chạy lại, #42):** 30 ngày — doanh thu 1.090.000 (11 đơn) nhưng "theo hình thức" 53 khoản (39 tiền mặt 5.925.000 + 14 chuyển khoản 2.585.000 = 8.510.000), "đơn theo giờ" cộng 56 đơn (cả đơn v7); riêng **hôm nay 09/10** doanh thu 0 mà "theo hình thức" còn 3 khoản (2 tiền mặt 315.000 + 1 QR 215.000) và "đơn theo giờ" còn 3 đơn (11h, 14h, 17h): đó là 3 đơn `DINE_IN` seed mới dán nhãn ngày hôm nay. Web hiện đúng số BE (QĐ 78). Cũng nên cho `cancellations` tách đơn huỷ chưa trả / đã trả và thêm số tiền hoàn (xem #43) | v9 bỏ bàn (mục 1); BM-03 (`:333`) | Không, nhưng số báo cáo demo sẽ lệch nhau (QĐ 61: web không tự lọc) |
| 48 | Thấp | **Chi tiết đơn Manager thiếu tiền khách đưa và tiền thối của tiền mặt**: `paymentSelect` (`manager-operations.service.ts`) không có `tenderedAmount`, `changeAmount` dù cột có trong DB (đơn 1: 100.000 / 35.000) và `receivedAmount` rỗng với tiền mặt. Đề nghị thêm hai trường vào `paymentSelect`. (`expiresAt` của khoản QR đã tách thành #50 theo QĐ 72) | BM-04 "lịch sử thanh toán" (`:337`), payments (`:1068`: tiền khách đưa và tiền thối, thời điểm hết hạn), 5.5 (`:458`) | Không |
| 49 | Thấp | **`GET /manager/orders`: đơn nháp của POS và sắp xếp**: (a) `POST /cashier/orders` tạo đơn `PENDING` (nháp, `counter-operations.service.ts:322, 359`) mà không có bộ lọc mặc định nên đơn nháp hiện trong danh sách Manager (web hiện "Khác (PENDING)"); đặc tả 5.3 "không có trạng thái Nháp trong cơ sở dữ liệu". **Quyết định 72 (Khánh duyệt):** nhờ BE KHÔNG lưu nháp trong cơ sở dữ liệu (giỏ nháp ở POS, đúng đặc tả 5.3), hoặc ít nhất loại `PENDING` khỏi `GET /manager/orders`; web giữ "Khác (PENDING)" cho tới lúc đó; (b) không có tham số sắp xếp, chỉ `placedAt` giảm dần (`manager-operations.service.ts`); đơn nháp có `placedAt` lúc tạo. Chưa cần nếu chỉ sắp xếp mới nhất trước | 5.3 (`:446`), BM-04 (`:337`) | Không |
| 50 | Thấp | **`expiresAt` của khoản thanh toán QR** (tách khỏi #48 theo QĐ 72): `paymentSelect` của `GET /manager/orders` và `/:id` không có `expiresAt` (cột `payments.expires_at` có, `schema.prisma` model Payment), nên web không hiện được QR "Hết hạn" (5.5: Chờ chuyển khoản → Hết hạn). Đề nghị thêm `expiresAt` vào `paymentSelect` (kèm #45: tự huỷ khi hết hạn bằng job) | 5.5 (`:458`), BR-26, BR-30 (`:708-709`) | Không |
| 51 | Trung bình | **Sự kiện socket cho chốt đơn, huỷ đơn chưa trả, QR hết hạn**: `POST /cashier/checkout`, `POST /cashier/orders/:id/cancel` và việc tự huỷ khi QR hết hạn (`counter-operations.service.ts:255-267`) KHÔNG phát sự kiện nào (`counter-operations.controller.ts:52-58, 171-179`); chỉ thu tiền/pha chế/giao có sự kiện. Màn Tra cứu đơn của Manager (tự làm tươi, QĐ 74) vì thế không thấy đơn mới "Chờ thanh toán" hay đơn vừa huỷ cho tới khi có sự kiện khác. Đề nghị phát `cashier.order.updated {orderId}` (hoặc `order.created` / `order.cancelled`) tới phòng chi nhánh ở ba nơi này; payload có `orderId` | 4 (Manager nhận cảnh báo, `:343`), 6.5 | Không |
| 52 | Thấp | **Chi tiết đơn của Manager không trả quầy** (`stationId`/tên quầy): quầy thu tiền chỉ ghi ở `PrintJob`, `GET /manager/orders/:id` không có; đầu trang chi tiết (QĐ 73 "quầy nếu có") nên web bỏ trống. Đề nghị lưu `stationId` trên khoản thanh toán tiền mặt (đã nhận `dto.stationId` ở `collectCash`, `counter-operations.service.ts:420-425`) và trả `station {id, name}` trong chi tiết đơn | BM-04 "người tạo, lịch sử thanh toán" (`:337`), BR-48 (`:750`) | Không |

Ghi chú: #35 (seed đơn quầy đã thanh toán) vẫn cần cho GĐ7 — DB hiện chỉ 70 đơn `DINE_IN` cũ (28 Thảo Điền, 42 + 1 chưa trả ở Nguyễn Huệ), không có đơn `COUNTER_PICKUP`, không có `payos`. Không thêm mục cho `expiresAt` của gói: BE `addMonths` giữ nguyên giờ, không ép cuối ngày UTC (`platform-admin.service.ts:735-744`); chỉ giá trị seed 2099 có đuôi 23:59:59.999Z.

### Tình trạng theo BE `0348c38` (kéo mã 2026-10-10; container vẫn `de4f55c`, CHƯA build; chỉ đọc mã; chi tiết ở `docs/khao-sat-be-mobile-20261010.md`)

> BE `0348c38` = `de4f55c` + 6 commit (Le Van Tien, Vũ Hà Gia Bảo, Dang Quan; 2026-10-06 → 10-09). 1 migration mới `20261008140000_order_tracking_and_payment_station` (chỉ thêm: `payments.station_id`, bảng `order_tracking_tokens`; **AN TOÀN**). Seed, enum, `/manager/*`, `payments`, `reports` không đổi. **Không có thay đổi phá vỡ với web.** Cột "nhánh chưa merge" = `origin/feat/cashier-barista-render-flow` (`a9eca53`, `e9b1c4a`, 2026-10-09).

| # | `de4f55c` | `0348c38` (main) | Nhánh chưa merge | Chứng cứ |
|---|---|---|---|---|
| 1 email | Chưa | **Chưa** | **Xong** (Resend) | `email/email-outbox.service.ts` chỉ ở `a9eca53`; biến `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM` |
| 15 `isDefault` | Một phần | **Xong** | — | `menu.service.ts:60, 263-297`, `menu.dto.ts:351-356` |
| 23 Manager không mật khẩu | Chưa | **Xong (endpoint mới)** | — | `POST /employees/managers` (`employees.controller.ts:34-39`); thư chưa gửi ở main (#1) |
| 24 CRUD Cashier/Barista | Một phần, lệch | **Một phần, lệch** | **Xong** (email, không mật khẩu) | `manager-staff.service.ts` ở `a9eca53` |
| 25 link email | Chưa | **Một phần** | Một phần | `setupPath: '/setup-password'` (đường trang web) nhưng chưa là URL đầy đủ |
| 28 `GET /display-devices` | Một phần | **Một phần** | — | thêm `GET /public/calling-display/context`; vẫn thiếu danh sách thiết bị |
| 41 trạng thái tuỳ chọn theo chi nhánh cho Owner | Không thêm | **Có endpoint** | — | `GET …/option-groups/branch-states` (`chain-menu.controller.ts:114-123`); web chưa dùng |
| 42 seed mỗi lần khởi động | Mới | **Còn nguyên** | — | seed không đổi; đã tái hiện 09/10 (đặt lại suất, thêm đơn `DINE_IN` mang ngày hôm nay) |
| 43 huỷ đơn đã trả | Chưa | **Chưa** | Chưa | không có endpoint, không có cột hoàn |
| 44 Cần xử lý / Lệch số tiền | Chưa | **Chưa** | **Xấu hơn** | nhánh: khoản lệch → `FAILED PAYOS_AMOUNT_MISMATCH` nên `confirm` (yêu cầu `PENDING`) từ chối (#54) |
| 45 QR hết hạn / Kiểm tra lại / huỷ QR | Chưa | **Chưa** | **Một phần** | `POST /cashier/payments/:id/payos/recheck`, `…/payos/cancel`, hết hạn → `FAILED PAYOS_EXPIRED`; vẫn không có job, BR-31 chưa |
| 46 Manager xác nhận CASH | Chưa | **Chưa** | Chưa | `payments.service.ts` không đổi |
| 47 báo cáo lẫn đơn v7 | Chưa | **Chưa** | Chưa | `manager-reports.service.ts` không đổi |
| 48 tiền khách đưa/thối | Chưa | **Chưa** | Chưa | `manager-operations.service.ts` không đổi |
| 49, 50, 51 | Chưa | **Chưa** | Chưa | không đổi (thêm `calling.*` chỉ cho phòng màn gọi số) |
| 52 quầy trong chi tiết | Chưa | **Một phần** | Một phần | `payments.station_id` có (chỉ khi tạo QR PayOS; tiền mặt chưa), chi tiết Manager vẫn không trả |
| Các mục còn lại (#2–#14, #16–#22, #26, #27, #29–#40) | như cũ | **không đổi** | không đổi | module `platform-admin`, `users`, `auth`, `branches`, `branch-manager`, `reports` không đổi trong khoảng này |

Việc mới sau khi kéo mã `0348c38` (7.3b):

| # | Mức | Việc cần BE | Căn cứ đặc tả | Chặn demo tuần 10? |
|---|---|---|---|---|
| 53 | Trung bình | **Xác nhận thủ công không tạo tracking token, không tạo `PrintJob`, không phát `calling.order.queued`**: `POST /payments/:id/confirm` (`payments.service.ts`, không đổi) chỉ đưa đơn xuống pha. Đơn xác nhận thủ công vì thế không có QR theo dõi, không có phiếu in tự động, không lên màn gọi số. Đề nghị dùng chung một hàm "đã trả" với tiền mặt và webhook (`ensureForOrder`, tạo `PrintJob`, phát `calling.order.queued`) | BR-27 (`:709`), BM-05 (`:339`), 11.9 | Có, khi demo xác nhận thủ công |
| 54 | **CAO** (chỉ khi `a9eca53` vào main) | **Khoản lệch số tiền thành `FAILED` thì Manager không xác nhận thủ công được**: `confirm` yêu cầu `PENDING`. BR-28 đòi: Cần xử lý, Manager xác nhận khi thực nhận ≥ tổng, nhận thiếu → huỷ đơn + khoản phải hoàn. Đề nghị giữ khoản ở trạng thái chờ + cờ "Lệch số tiền", hoặc cho `confirm` khoản `FAILED` có `PAYOS_AMOUNT_MISMATCH`; gộp với #44 | BR-28 (`:710`), BR-29 (`:711`) | Có |
| 55 | Thấp | **`display:update` ghi `pos_stations.cart_snapshot` vào CSDL** (`realtime.gateway.ts`) trái BR-46 (server chỉ chuyển tiếp trước khi chốt). Chấp nhận như mở rộng hoặc ghi vào đặc tả | BR-46 (`:748`) | Không |

Ghi chú: trang theo dõi đơn công khai (`GET /public/track/:token`, QR trên phiếu) **không có trong đặc tả v9**; cần Khánh/nhóm quyết giữ như mở rộng (và bổ sung đặc tả) hoặc bỏ. Việc báo nhóm mobile M1–M8 ở mục 7 của `docs/khao-sat-be-mobile-20261010.md`.

### Tình trạng theo nhánh BE `feat/cashier-barista-render-flow` `06d8c54` (2026-10-10; chỉ đọc mã, KHÔNG nằm trong `main`, KHÔNG nằm trong container đang chạy)

> `origin/main` vẫn `0348c38` (không có commit mới). Nhánh có 3 commit: `a9eca53` (email, Manager tạo Cashier/Barista bằng email, `payos/recheck`, `payos/cancel`), `e9b1c4a` (`docker-compose.yml`: `NODE_ENV: development`, `EMAIL_FROM` rỗng), `06d8c54` "unify counter payment settlement" (#53/#54). Migration mới `20261010090000_payment_mismatch_attention`: chỉ `ALTER TYPE … ADD VALUE IF NOT EXISTS` hai giá trị enum (**AN TOÀN**). Tài liệu BE: `docs/PAYMENT_CONFIRMATION_53_54.md`.

| Ca nghiệm thu | Kết quả (file:dòng trên nhánh) |
|---|---|
| 1 webhook đúng số tiền → Đã trả, số gọi, mã theo dõi, PrintJob, `calling.order.queued`, `payment.confirmed` có `orderId` | **ĐẠT** — `payos-payment.service.ts:228-232` gọi `settlement.settle({source:'PAYOS_WEBHOOK'})`; `counter-payment-settlement.service.ts:94-243` (số gọi `:139-143`, tracking `:186`, PrintJob `:187-195`, sự kiện `:226-241`, payload `{paymentId, orderId, status, callNumber, source}`) |
| 2 Kiểm tra lại báo đã trả | **ĐẠT** — `POST /cashier/payments/:id/payos/recheck` (`counter-operations.controller.ts`), `payos-payment.service.ts:261-312`, `source:'PAYOS_RECHECK'`; mismatch → `markAmountMismatch` `:286` |
| 3 Manager xác nhận khoản PENDING, nhận đủ (#53) | **ĐẠT** — `payments.service.ts:144-186` → `settle({source:'MANAGER_MANUAL'})`; audit `PAYMENT_MANUALLY_CONFIRMED` kèm lý do, người xác nhận, `receivedAmount`, `changeDue` (`settlement:196-216`); `confirmationReason`, `processedById`, `transactionRef` lưu ở khoản (`:146-158`) |
| 4 webhook lệch số tiền → khoản "Lệch số tiền", đơn "Cần xử lý", lưu số thực nhận, phát attention (#54, #44) | **ĐẠT** — `PaymentStatus.AMOUNT_MISMATCH`, `OrderStatus.REQUIRES_ATTENTION` (`schema.prisma`); `markAmountMismatch` `settlement:38-92` lưu `payment.receivedAmount`, đơn → `REQUIRES_ATTENTION`, phát `manager.order.attention-required {reason:'PAYMENT_AMOUNT_MISMATCH', orderId, paymentId, expectedAmount, receivedAmount}` (`:83-89`, chỉ khi đổi trạng thái) |
| 5 xác nhận khoản Lệch số tiền: ≥ tổng → xong + phần dư; < tổng → từ chối rõ (BR-28) | **ĐẠT** (một phần so với BR-28) — nhận đủ: `changeDue` trong audit; nhận thiếu: **409 `PAYMENT_AMOUNT_INSUFFICIENT` "Số tiền thực nhận thấp hơn tổng tiền đơn hàng."** (`settlement:119-125`). BR-28 còn "huỷ đơn và ghi khoản phải hoàn" → thuộc #43, chưa có |
| 6 webhook về 2 lần | **MỘT PHẦN** — mã đúng (khoá theo `idempotencyKey`, `PROCESSED`/`REJECTED` bỏ qua `:180-189`, `PAYMENT_ALREADY_SETTLED` → `PROCESSED` `:242-246`); test tự động chỉ có "does not settle a payment twice" tuần tự (`test/payment-settlement.test.mjs:161`), chưa có test webhook trùng |
| 7 webhook và xác nhận thủ công đồng thời | **MỘT PHẦN** — mã đúng (`SELECT … FOR UPDATE` khoá `payments` rồi `orders`, `Serializable`, `settlement:98, 108, 224`; bên sau nhận 409 `PAYMENT_ALREADY_SETTLED`; `P2034` → 409 `payments.service.ts:182-184`); **chưa có test đồng thời** |
| 8 Manager xác nhận tiền mặt → từ chối (#46) | **ĐẠT** — 409 "Only bank transfers can be confirmed manually" (`payments.service.ts:166-167`, và `settlement:116-118`); chỉ vai MANAGER (`payments.service.ts:146-147`, `payments.controller.ts:91`) |

Trả lời các câu hỏi cấu trúc: (a) **một hàm dùng chung** `CounterPaymentSettlementService.settle` cho webhook, Kiểm tra lại và xác nhận thủ công (tiền mặt vẫn đi đường riêng `collectCash`); (b) enum mới `OrderStatus.REQUIRES_ATTENTION` (đơn "Cần xử lý"), `PaymentStatus.AMOUNT_MISMATCH` (khoản "Lệch số tiền"); số thực nhận ở `payment.receivedAmount` và `GET /manager/orders[/:id]` đã trả (`paymentSelect.receivedAmount`); lọc `GET /manager/orders?status=REQUIRES_ATTENTION` và `?paymentRecordStatus=AMOUNT_MISMATCH` (`manager.dto.ts`, `manager-operations.service.ts`); (c) mã lỗi nhận thiếu `PAYMENT_AMOUNT_INSUFFICIENT` (409), đã thanh toán `PAYMENT_ALREADY_SETTLED` (409, message không dấu tiếng Việt), tiền mặt 409; (d) `payment.confirmed` có `orderId` ở webhook, Kiểm tra lại và xác nhận thủ công; **đường tiền mặt** (`counter-operations.controller.ts:152`) vẫn `{orderId, callNumber}`, đường phiên bàn v7 `{id, status}`; (e) test BE: `test/payment-settlement.test.mjs` (5 ca: xác nhận trọn quy trình, nhận thiếu, tiền mặt, lệch số tiền, không chốt hai lần), `test/payos-channel.test.mjs` (webhook lệch, recheck dùng settlement).

Ảnh hưởng tới web khi nhánh này vào main: giá trị enum mới hiện "Khác (REQUIRES_ATTENTION)", "Khác (AMOUNT_MISMATCH)" ở `api/modules/order/codes.ts` cho tới khi duyệt nhãn ("Cần xử lý", "Lệch số tiền", tông đỏ theo BR-42); `ORDER_STATUS_FILTER` cần thêm `REQUIRES_ATTENTION`; `payment.confirmed`/`manager.order.attention-required` đã có `orderId` nên `orderRefresh.ts` tải đúng; câu lỗi `PAYMENT_AMOUNT_INSUFFICIENT`, `PAYMENT_ALREADY_SETTLED` cần thêm vào `BACKEND_TEXT`; `confirm` trả `{…payment, order, tracking}`.

Việc mới sau 7.3d:

| # | Mức | Việc | Căn cứ | Chặn demo? |
|---|---|---|---|---|
| 56 | **CAO** | **`docker-compose.yml` ở `main` ép `NODE_ENV: production` cho Docker local** (dòng 13) + validate `PUBLIC_WEB_URL` HTTPS và `ORDER_TRACKING_SECRET` ≥ 32 ở production (`environment.validation.ts:105-111`) → API sập vòng lặp khi build `main` `0348c38` mà không đặt biến (đã xảy ra 2026-10-10: 78 lần khởi động lại, seed chạy 78 lần). Bản sửa đã có ở nhánh (`e9b1c4a`, `NODE_ENV: development`) nhưng chưa vào main. Local hiện dùng `docker-compose.override.yml` chưa theo dõi (7.3d) | `docker-compose.yml:13` | Có (build local) |
| 57 | Trung bình | **Merge nhánh `feat/cashier-barista-render-flow` (`06d8c54`) vào `main`** và build: chứa #1, #24, #45 (recheck/cancel), #53, #54 | — | Có |
| 58 | Thấp | Test tự động cho webhook trùng (ca 6) và webhook đồng thời xác nhận thủ công (ca 7) | `test/payment-settlement.test.mjs` | Không |

### BE lệch quyết định/đặc tả (đối chiếu `0083289`)

| Chỗ lệch | Đặc tả / quyết định | BE |
|---|---|---|
| Tạo và đặt lại mật khẩu Cashier/Barista bằng **mật khẩu Manager gõ** | Đã chốt: tạo → email đặt mật khẩu (BM-01, #23, #24); web đã bỏ mọi mật khẩu cứng | `manager.dto.ts:27, 37`; `manager-staff.service.ts:114, 235-254`. Chưa có email (#1) |
| Mở khoá không kiểm hạn mức; hạn mức đếm cả tài khoản khoá | 13.1 dòng 1227: khoá không tính; mở khoá chiếm chỗ nên phải kiểm | `manager-staff.service.ts:127-133, 217-233` |
| Manager **đổi được vai trò** Cashier↔Barista, email, mã nhân viên | BM-01 chỉ nêu tạo, sửa, đặt lại, khoá; shape web (#24) không cho đổi vai trò/email | `ManagerUpdateStaffDto` (`manager.dto.ts:33`) |
| 409 `PLAN_LIMIT_REACHED` thiếu `quota/currentPlan/suggestedPlans` | như `POST /branches` (web dựa vào để gợi ý gói) | `manager-staff.service.ts:134-138` |
| Hết hạn: tạo nhân viên trả 409, các thao tác ghi khác trả 403 | một mã `SUBSCRIPTION_READ_ONLY` (#31) | `manager-staff.service.ts:126` và `branch-access.service.ts:81-83` |
| `GET /manager/audit-logs` | **AuditLog đã chốt xoá** (đặc tả 14.2, BAN-GIAO mục 5); web không làm màn này, BE giữ ghi log theo BR-06 | `branch-manager.controller.ts:167` |
| Bật tuỳ chọn mà Owner đã tắt vẫn lưu được cờ chi nhánh | BR-12: Owner tắt thì chi nhánh không bật lại được | `manager-operations.service.ts:216-220` (kết quả hiệu lực vẫn false; web khoá công tắc) |
| Manager tắt món không đánh dấu dòng đã trả "Hết món"; tắt tuỳ chọn thì có | BR-36 cho cả món và tuỳ chọn | `menu.service.ts` `updateBranchMenuItem` so với `manager-operations.service.ts:221-247` |

### BE lệch đặc tả (đối chiếu `dfe8100`)

| Chỗ lệch | Đặc tả | BE |
|---|---|---|
| QR PayOS ~~không hết hạn~~ (**Một phần từ `91867ae`**: QR có hạn 10 phút, `payos-payment.service.ts:78, 91, 107`; QR hết hạn thì tạo QR mới `:66`; đơn chưa trả có QR hết hạn bị huỷ và hoàn suất, `counter-operations.service.ts`); **còn thiếu** huỷ QR và "Kiểm tra lại" | BR-26, BR-30 | `payos-payment.service.ts` |
| Webhook lệch tiền không sang "Cần xử lý", không báo Manager | BR-28, BR-31 | webhook ghi `REJECTED` rồi thôi (`payos-payment.service.ts:145-150`) |
| Xác nhận thủ công cho cả CASHIER (endpoint bàn v7) | BR-29: chỉ Manager, bắt buộc lý do | `payments.controller.ts:90` `@Roles(MANAGER, CASHIER)` |
| Chưa có huỷ đơn đã thanh toán, hoàn tiền, trừ doanh thu ngày huỷ | BM-06, BR-23, BR-49, BR-50 | chỉ `POST /cashier/orders/:id/cancel` cho đơn chưa trả |
| Báo hết món/tuỳ chọn không chuyển dòng đã trả sang Hết món, không báo Manager | BR-36 | `counter-operations.service.ts` chỉ đặt cờ |
| Hạn mức tài khoản tính cả tài khoản đã khoá | 13.1 | `users.service.ts` (→ #26) |
| Manager ghi được `isEnabled` của món ở chi nhánh (mức thấp, #37) | BM-02: Manager chỉ bật/tắt "hết hàng trong ngày"; BR-12 và OW-04: cờ kinh doanh và gán món thuộc Owner | `branch-menu.controller.ts:47-48` + `menu.dto.ts:194-214` cho OWNER, MANAGER gửi cả `isEnabled`, `isAvailable`, `remainingPortions` |
| Còn dữ liệu và route v7: bàn, phiên bàn, đặt bàn, ca làm, voucher, Waiter, Kitchen, `remainingPortions` | Mục 1: đã bỏ hẳn | `schema.prisma`, `AppRole`, `/waiter/*`, `/kitchen/*` |
