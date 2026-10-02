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
| 15 | Thấp | **Trường tuỳ chọn mặc định** (đặc tả 12.2: "tuỳ chọn mặc định", ví dụ đường 100%, đá bình thường): `MenuOption.isDefault` hoặc `defaultOptionIds` trên nhóm. Hiện schema không có | Mock có `isDefault` trên từng tuỳ chọn (đặc tả không bắt buộc nhóm bắt buộc phải có mặc định: Size không có, Đường/Đá có) |
| 16 | Trung bình | **Trả `optionGroups` (kèm `options`) trong** `GET …/menu/items` và `GET /branches/{id}/menu` để POS/Manager hiển thị mà không phải gọi riêng | Chưa đọc được từ BE |
| 17 | Thấp | **Trường "không gom món"** trên `menu_items` (đặc tả 8.3, OW-02 "cờ cho phép gom món khi pha"), ví dụ `allowBatching boolean default true`; có trong `create/update/list` | Chưa có; mock lưu theo ID món thật ở 4.3 (`ChainState.itemOptions`, mất khi tải lại trang) |
| 18 | Thấp | **Endpoint tải ảnh món lên** (`multipart` hoặc URL ký trước) trả `imageUrl`; hiện chỉ có `imageUrl` chuỗi ≤ 500 ký tự | Ô nhập URL kèm xem trước, ảnh lỗi hiện ảnh thay thế |
| 19 | Trung bình | **`GET /branches/{id}/menu` cho Manager thấy cả món Owner đã tắt** (kèm cờ `isActive`/`isEnabled`) để BM-02 hiện "Owner tắt món này" như đặc tả; hiện BE ẩn hẳn món Owner đã tắt | Web chỉ hiện món đang bán |
| 20 | Trung bình | **Manager bật/tắt tuỳ chọn tại chi nhánh** (BM-02): hiện chỉ có `PATCH /barista/menu-options/{id}/availability` (role BARISTA); thêm `PATCH /branches/{b}/menu/options/{optionId}` cho OWNER, MANAGER | Chưa làm (giai đoạn 5) |
| 21 | Thấp | `price` là `Decimal(14,2)` và DTO cho phép 2 chữ số thập phân; BR-19 là số nguyên đồng → ép `@IsInt` hoặc bỏ phần thập phân | Web chỉ gửi số nguyên; đọc qua `parseAmount` |
| 22 | Thấp | `remainingPortions` (kho, v7) còn trong `PATCH /branches/{b}/menu/items/{id}` và response, **và trong từng món của `GET /branches/{b}/menu`** (Manager gọi thật vẫn thấy) → bỏ khỏi v9 | Web không bao giờ gửi, mapper bỏ qua khi đọc |

### Manager (giai đoạn 5) — chờ BE

Rút từ khảo sát 5.1. Việc đã có ở trên không ghi lại: `email_outbox` không có tiến trình gửi → #1; Manager bật/tắt tuỳ chọn → #20.

| # | Mức | Việc cần BE | Hiện web làm gì |
|---|---|---|---|
| 23 | **CAO** | **Bỏ `password` ở `POST /auth/managers`** (`create-staff.dto.ts`, hiện bắt buộc 8–128 ký tự) và chuyển sang **gửi email đặt mật khẩu** như duyệt hồ sơ (`PasswordSetupToken` + `email_outbox`, hiệu lực 24 giờ). Đặc tả BM-01/OW-05: tạo tài khoản rồi gửi email | Web đã bỏ mọi mật khẩu cứng; tạo Manager còn mock cho tới khi BE đổi |
| 24 | **CAO** | **CRUD Cashier/Barista cho Branch Manager** (BR-05, ma trận quyền: Manager tạo/sửa): tạo (không `password`, gửi email đặt mật khẩu), danh sách theo chi nhánh của Manager, khoá/mở, đặt lại mật khẩu, sửa. Hiện không có endpoint nào; `/employees` chỉ OWNER và chỉ thao tác được Manager | Mock (`accountApi`) |
| 25 | Trung bình | **Link trong email trỏ tới trang web** `<WEB_BASE_URL>/setup-password?token=…` (payload hiện chỉ có `setupPath: '/auth/setup-password'`, là đường của BE, không phải trang) — cần cấu hình URL web ở BE | Web có trang `/setup-password?token=` gọi `POST /auth/setup-password` |
| 26 | Trung bình | **Hạn mức số tài khoản không tính tài khoản đã khoá** (đặc tả 13.1; `users.service.ts` `assertOwnerCanCreateAccount` đếm cả tài khoản khoá) | Mock tính theo đặc tả |
| 27 | Trung bình | **`PATCH /stations/{id}`**: đổi tên, ngừng/bật lại quầy (`status` ACTIVE/INACTIVE), sửa máy in (`printerConnection`, `printerAddress`); kiểm định dạng IP/MAC thay vì chỉ "không rỗng" | Chưa có; web chỉ tạo quầy (giai đoạn 5.5) |
| 28 | Trung bình | **Ghép màn hình gọi số** (BE `dfe8100` đã có `POST /stations/pair-calling-display`; CÒN THIẾU `GET /display-devices`): endpoint dùng mã ghép `CALLING_DISPLAY` (token gắn chi nhánh, `stationId` null) và **`GET /display-devices`** liệt kê thiết bị cấp chi nhánh (hiện danh sách chỉ nằm trong `GET /stations`, không có màn hình gọi số) | Mock (giai đoạn 5.6) |

### Việc mới sau khi BE cập nhật `dfe8100` (2026-10-02)

| # | Mức | Việc cần BE | Hiện web làm gì |
|---|---|---|---|
| 29 | Thấp | **Bỏ `maxTables` (v7) hoặc cho phép 0** ở `CreateServicePlanDto` (`platform-admin.dto.ts:154-158`, `@Min(1)`, bắt buộc). Web ẩn trường này và gửi 1 khi tạo gói, không gửi khi sửa | `admin/real.ts` `MIN_MAX_TABLES` |
| 30 | Trung bình | **Cờ AI và `tier` trên gói.** BE có `brandingEnabled`, `multiBranchComparisonEnabled` (`schema.prisma:573-574`) nhưng không có cờ Trợ lý AI (chỉ Nâng cao, đặc tả 13.1) và không có cấp; thay cho #10 phần còn lại | Cờ AI và cấp vẫn suy từ mã gói (`plan/tiers.ts`) |
| 31 | Trung bình | **Lỗi hết hạn trả mã `SUBSCRIPTION_READ_ONLY`** (hiện `ForbiddenException` chỉ có chữ: `branch-access.service.ts:81-83, 118-120`), để web báo "chỉ đọc" thay vì "không đủ quyền" | Web chờ mã này (mục 5) |
| 32 | Trung bình | **Seed 3 gói BASIC / STANDARD / ADVANCED có giá thật** (seed hiện `DEMO_OPERATIONS` và `STARTER`, giá 0; `GET /public/service-plans` cũng chỉ trả 2 gói giá 0) | Landing vẫn dùng bảng giá mock (`api/publicPlans.ts`) |
| 33 | **CAO (BR-08)** | **BE thi hành hai cờ gói**: chặn `PUT …/branding` khi `brandingEnabled=false`, chặn `GET /reports/revenue/comparison` khi `multiBranchComparisonEnabled=false`, và chặn Trợ lý AI khi không phải Nâng cao. Hiện hai cờ chỉ được select (`plan-quota.service.ts:23-24`), không nơi nào kiểm | Web khoá giao diện theo cờ (lớp thứ hai) |
| 34 | Trung bình | **`POST /stations`** (`stations.service.ts:48-61`, `station.dto.ts:5-21`): (a) **trùng tên** — có ràng buộc duy nhất (chi nhánh, tên) nhưng `create` không bắt lỗi Prisma `P2002` và không có bộ lọc lỗi chung nên theo code sẽ trả **500**; cần trả 409 (chưa kiểm thật vì cấm ghi); (b) `name` chưa có `@MinLength(1)` (tên rỗng sau `trim()` vẫn qua DTO); (c) kiểm định dạng IP/MAC ở BE thay vì chỉ "không rỗng"; (d) **Bluetooth không nên bắt buộc địa chỉ**: đặc tả 11.10 (dòng 1104) nói Bluetooth "chọn máy đã ghép trên tablet POS", BE hiện bắt buộc `printerAddress` cho cả WiFi lẫn Bluetooth. Trạng thái mặc định của quầy mới là `ACTIVE` ([schema.prisma:1246](../../BE_FnB/SmartFnBBackend/prisma/schema.prisma)), khớp đặc tả, không cần đổi | Web kiểm IPv4 (kèm cổng)/MAC, báo trùng tên sớm, ô nhập MAC tạm cho Bluetooth |
| 36 | Trung bình | **Ghép màn hình: mã lỗi riêng.** `pair-customer-display` và `pair-calling-display` trả CÙNG `400 "Pairing code is invalid, used, or expired"` cho mã sai, hết hạn, đã dùng và sai loại (`stations.service.ts:116-124`, `153-161`), nên web chỉ nêu chung các nguyên nhân. Cần mã/ thông báo riêng (ví dụ `PAIRING_CODE_NOT_FOUND`, `_EXPIRED`, `_CONSUMED`, `_WRONG_TYPE`). Ngoài ra `pair-calling-display` chỉ cho **một** màn hình gọi số mỗi chi nhánh (thu hồi máy cũ, `stations.service.ts:164-171`): đặc tả chỉ giới hạn một màn hình khách mỗi quầy (BR-45), không nói về màn hình gọi số — cần chốt có cho nhiều TV không | Web gộp thông báo; ghép máy gọi số mới thay máy cũ |
| 35 | Trung bình | **Seed vài đơn quầy đã thanh toán** (`paymentStatus = PAID`, có `paidAt`, vài ngày gần đây) để báo cáo demo có số: BE `dfe8100` chỉ tính đơn `PAID` theo `paidAt` nên lịch sử seed cũ không còn được tính, báo cáo Owner hiện 0 (đã kiểm: 7/14/30/90 ngày đều 0) | Báo cáo real hiển thị 0 đồng, không kiểm được số liệu khác 0 |

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

### BE lệch đặc tả (đối chiếu `dfe8100`)

| Chỗ lệch | Đặc tả | BE |
|---|---|---|
| QR PayOS không hết hạn, không huỷ QR, không "Kiểm tra lại" | BR-26, BR-30 | `payos-payment.service.ts` tạo link không đặt hạn |
| Webhook lệch tiền không sang "Cần xử lý", không báo Manager | BR-28, BR-31 | webhook ghi `REJECTED` rồi thôi (`payos-payment.service.ts:145-150`) |
| Xác nhận thủ công cho cả CASHIER (endpoint bàn v7) | BR-29: chỉ Manager, bắt buộc lý do | `payments.controller.ts:90` `@Roles(MANAGER, CASHIER)` |
| Chưa có huỷ đơn đã thanh toán, hoàn tiền, trừ doanh thu ngày huỷ | BM-06, BR-23, BR-49, BR-50 | chỉ `POST /cashier/orders/:id/cancel` cho đơn chưa trả |
| Báo hết món/tuỳ chọn không chuyển dòng đã trả sang Hết món, không báo Manager | BR-36 | `counter-operations.service.ts` chỉ đặt cờ |
| Hạn mức tài khoản tính cả tài khoản đã khoá | 13.1 | `users.service.ts` (→ #26) |
| Còn dữ liệu và route v7: bàn, phiên bàn, đặt bàn, ca làm, voucher, Waiter, Kitchen, `remainingPortions` | Mục 1: đã bỏ hẳn | `schema.prisma`, `AppRole`, `/waiter/*`, `/kitchen/*` |
