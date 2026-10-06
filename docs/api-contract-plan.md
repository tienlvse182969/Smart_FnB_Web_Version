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
