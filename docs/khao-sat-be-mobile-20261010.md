# Khảo sát BE `0348c38` và hai repo mobile, đối chiếu đặc tả v9 (lượt 7.3b, 2026-10-10)

Chỉ đọc. Không build BE (container `smart-fnb-api` vẫn chạy `de4f55c`). Không sửa, không commit, không push ở repo BE và hai repo mobile.

## 0. Tóm tắt một trang

| Mục | Kết luận |
|---|---|
| BE `main` | `de4f55c` → `0348c38` (+6 commit, 2026-10-06 → 10-09). **1 migration mới, chỉ thêm, AN TOÀN.** Seed không đổi (#42 còn). Không enum nào đổi. **Không có thay đổi phá vỡ với web.** |
| Mới ở BE main | theo dõi đơn công khai (`GET /public/track/:token`), snapshot màn gọi số (`GET /public/calling-display/context`), `POST /employees/managers` (Owner mời Manager bằng email, không mật khẩu), `isDefault` của tuỳ chọn, `GET …/option-groups/branch-states`, `payments.station_id`, `stationId` BẮT BUỘC khi tạo QR PayOS (mobile main đã gửi; BE `de4f55c` đang chạy sẽ từ chối) |
| **Chưa vào main nhưng có** | nhánh BE `feat/cashier-barista-render-flow` (2 commit, 2026-10-09): `POST /cashier/payments/:id/payos/recheck` ("Kiểm tra lại"), `POST /cashier/payments/:id/payos/cancel` (huỷ QR), **tiến trình gửi email (Resend)**, Manager tạo Cashier/Barista bằng email. Ba mục lớn của #1, #24, #45 nằm ở đó. |
| Web `main` đã đi trước nhánh `feat/v9-orders` 13 commit | màn gọi số `/display/call`, trang theo dõi `/t/:token`, màn hình khách, Owner `BranchOperations`, Vercel. **Chồng chéo mã nhỏ** (`flags.ts`, `api/index.ts`, `types/branch.ts`). Xem mục 6. |
| Mobile | cả hai repo là **Expo / React Native** (không phải Flutter). Đã nối API thật cho đăng nhập, quầy, chốt đơn, tiền mặt, QR PayOS, lịch sử, hàng đợi pha chế, báo hết món, ghép màn hình khách, đồng bộ giỏ. **Thiếu: in thật (ESC/POS), "Kiểm tra lại", đếm ngược QR và "Đã nhận" + âm thanh trên POS, huỷ QR, mệnh giá nhanh, nhận diện thương hiệu, CM-02.** |
| Tiến độ | luồng tiền mặt gần chạy trọn (thiếu in thật); luồng QR chạy được tới "đã trả" nhưng thiếu "Kiểm tra lại" và huỷ QR (chờ merge nhánh BE). Rủi ro số 1 cho demo tuần 10: **in bill và phiếu số**. |

## 1. Sao lưu và kéo code BE

| Việc | Kết quả |
|---|---|
| Sao lưu | `C:\Users\KhanhNB\backup-smartfnb-20261010-110143.sql`, **625.465 byte** (pg_dump, trước khi kéo) |
| `git fetch --all` | `main` `de4f55c` → `0348c38`; nhánh mới `feat/cashier-barista-render-flow`, `feat/pickup-tracking`, `fix/backend-startup-duplicate-migration`; `Tien` `dd1e561` → `d79fd99` |
| `git pull --ff-only origin main` | thành công, HEAD `0348c38`. Tệp chưa theo dõi `prisma/smart-fnb.dbml` **không bị đụng, không xung đột** (code mới không thêm tệp cùng đường dẫn). |
| Build | **KHÔNG**. Container vẫn `de4f55c`, healthy. |

### Commit `de4f55c..0348c38`

| Hash | Tác giả | Ngày | Tiêu đề |
|---|---|---|---|
| `d79fd99` | Le Van Tien | 2026-10-06 | fix: include cancelled counter orders in cashier history |
| `642be70` | Le Van Tien | 2026-10-06 | Merge pull request #2 from Raintostorm/Tien |
| `cdb814c` | Vũ Hà Gia Bảo | 2026-10-08 | feat: add pickup tracking and calling display flow (1.100 dòng: migration, `order-tracking`, màn gọi số, PayOS `stationId`, `isDefault`, `POST /employees/managers`) |
| `58599d6` | Dang Quan | 2026-10-09 | Update admin |
| `4aa30c7` | Dang Quan | 2026-10-09 | Merge branch 'main' |
| `0348c38` | Vũ Hà Gia Bảo | 2026-10-09 | fix: remove duplicate schema and migration entries (xoá migration trùng `20261006000000_owner_menu_batching_default`, bỏ khai báo trùng `isDefault`, DTO trùng `allowBatching`, `assertConfigured` khoá PayOS trước khi gọi PayOS) |

### Các nhánh BE khác có commit chưa vào `main`

| Nhánh | Đi trước main | Commit cuối | Ghi chú |
|---|---|---|---|
| `feat/cashier-barista-render-flow` | **2** | `e9b1c4a` Vũ Hà Gia Bảo 2026-10-09 "fix: keep local Docker API online" | gồm `a9eca53` "harden cashier onboarding and PayOS recovery" (xem mục 3 và 7) |
| mọi nhánh còn lại (`Tien`, `Bao_*`, `codex/v91-cashier-barista`, `feat/pickup-tracking`, `fix/backend-startup-duplicate-migration`) | 0 | — | đã nằm trong `main` |

## 2. Migration và seed

| Migration | Nội dung (`prisma/migrations/…/migration.sql`) | Kết luận |
|---|---|---|
| `20261008140000_order_tracking_and_payment_station` (mới, chưa có trong `_prisma_migrations`) | `ALTER TABLE payments ADD COLUMN station_id UUID` (null) + chỉ mục + khoá ngoại `ON DELETE SET NULL`; `CREATE TABLE order_tracking_tokens` (+ 2 chỉ mục duy nhất, 1 chỉ mục, khoá ngoại `orders` `ON DELETE CASCADE`) | **AN TOÀN**: chỉ thêm, không DROP, không đổi cột cũ, không tạo lại bảng, bảng/cột mới rỗng |
| `20261006000000_owner_menu_batching_default` (đã BỊ XOÁ khỏi mã ở `0348c38`) | trùng nội dung `20261004160000_add_v91_menu_defaults_and_batching` đã áp | Không có trong DB (24 migration của DB đều còn trong mã) nên không gây lệch |

So với DB: mã 25 migration (không tính `migration_lock.toml`), DB 24; **chênh đúng 1 migration, là migration mới ở trên**. **Tổng thể: AN TOÀN.**

| Mục | Kết quả |
|---|---|
| Seed (`prisma/seed.ts`, entrypoint, compose, Dockerfile) | **không đổi** từ `de4f55c` (0 dòng diff) → **#42 còn nguyên**: chạy mỗi lần khởi động, ghi đè dữ liệu mẫu, đặt lại suất, tạo đơn `DINE_IN` v7 mang ngày hiện tại. Đã thấy ở lần khởi động lại 09/10. |
| Biến môi trường mới (`.env.example`, `environment.validation.ts:29-31, 102-109`) | `PUBLIC_WEB_URL` (mặc định `http://localhost:8443`, bắt buộc HTTPS ở production), `ORDER_TRACKING_SECRET` (≥ 32 ký tự ở production; ngoài production dùng giá trị dự phòng) → **BE local build được mà không phải sửa `.env`**. |
| Thêm ở nhánh chưa merge | `EMAIL_PROVIDER` (chỉ `resend`), `EMAIL_API_KEY`, `EMAIL_FROM` (phải đặt cùng nhau) |

## 3. Đối chiếu code BE mới

### 3a. Endpoint thêm / đổi và ảnh hưởng tới web

| Endpoint (file:dòng) | Thay đổi | Ảnh hưởng web |
|---|---|---|
| `GET /public/track/:token` (`order-tracking.controller.ts:9-18`) | mới, công khai, 30 yêu cầu/phút/IP, `no-store`; 200/404/410/429; không trả món, tiền, nhân viên | Không vỡ. Cần trang `/t/:token` (đã có ở web `main`, chưa có ở nhánh này) |
| `GET /public/calling-display/context` (`stations.controller.ts:39-47`, `stations.service.ts:103-190`) | mới; token thiết bị `CALLING_DISPLAY`; trả branding + `preparing[]` + `ready[]` (30 đơn mỗi cột, ngày kinh doanh) + `serverTime` | Không vỡ. GĐ8 màn gọi số dùng (đã có ở web `main`) |
| Socket `calling.order.queued` / `.preparing` / `.ready` / `.delivered` (`counter-operations.controller.ts:158-165, 228-231, 256-263, 293-300`, `payos-payment.service.ts:305-309`) | mới; phát tới phòng màn gọi số (`callingDisplay`), không phải phòng chi nhánh | Manager/web đơn KHÔNG nhận. Không vỡ. |
| `GET /cashier/orders/:id/receipt` (`counter-operations.service.ts:605-634`) | thêm `tracking {token, url}` | Không vỡ (web không gọi) |
| `POST /cashier/orders/:id/payments/cash` | trả thêm `tracking` | Không vỡ |
| **`POST /cashier/orders/:id/payments/payos`** (`payos-payment.dto.ts:6-11`, `payos-payment.service.ts:69-72`) | **`stationId` BẮT BUỘC** (quầy ACTIVE của chi nhánh, 404 nếu không) | Web không gọi. **Vỡ với mobile bản cũ**; mobile `main` đã gửi `stationId` (`cashier-api.ts:201-209`) nên **BE `de4f55c` đang chạy từ chối request của mobile `main`** (whitelist cấm trường thừa) |
| `GET /cashier/orders` (`counter-operations.service.ts:508-526`) | gồm cả đơn huỷ chưa trả trong ngày | Không vỡ |
| `POST /barista/batches/start` | trả thêm `preparingOrders` | Không vỡ |
| `POST /employees/managers` (`employees.controller.ts:34-39`, `employee.dto.ts:76-95`, `employees.service.ts:55-125`) | mới: Owner mời Manager bằng email, tên, `branchId`; không mật khẩu; tạo `INACTIVE` + `PasswordSetupToken` + `EmailOutbox`; kiểm hạn mức tài khoản; 409 `PLAN_LIMIT_REACHED` | Mở khoá **#23** cho web: `ManagerAccounts` real có thể bỏ ô mật khẩu. `POST /auth/managers` cũ vẫn còn. Web `main` đã đổi `ManagerAccounts.tsx` (32 dòng), cần xem trước khi làm. |
| `GET /restaurant-chains/:chainId/menu/option-groups`, tạo/sửa tuỳ chọn (`menu.service.ts:57-65, 223-297`, `menu.dto.ts:351-356`) | trả/nhận `isDefault`; tối đa số mặc định ≤ `maxSelections`; tuỳ chọn tắt thì bỏ mặc định; 400 "Create the option before setting it as the group default" khi tạo kèm `isDefault: true` | Không vỡ; mở khoá ô `isDefault` đang khoá "chờ BE #15" |
| `GET /restaurant-chains/:chainId/menu/option-groups/branch-states?branchId=` (`chain-menu.controller.ts:114-123`) | mới: trạng thái tuỳ chọn theo chi nhánh cho Owner | Mở khoá panel "trạng thái theo chi nhánh" đã ẩn ở 6.3 (quyết định 8) nếu Khánh muốn |
| `/manager/*`, `POST /payments/:id/confirm`, `/reports/*` | **không đổi** | Không ảnh hưởng 7.1–7.3 |

**Thay đổi phá vỡ đối với web: không có.** Mức ảnh hưởng: không vỡ / lệch hiển thị = 0; chỉ có cơ hội mở khoá (#15, #23, branch-states).

### 3b. Enum

Không enum nào đổi (schema chỉ thêm `OrderTrackingToken`, `Payment.stationId`). Bảng nhãn `api/modules/order/codes.ts` giữ nguyên.

### 3c. Bảng #1–#52 theo `0348c38` (cột "Nhánh chưa merge" = `feat/cashier-barista-render-flow`)

| # | Trạng thái ở `de4f55c` | **Ở `0348c38`** | Chứng cứ |
|---|---|---|---|
| **1** email | Chưa | **Chưa (main); Xong ở nhánh chưa merge** | không có chỗ đọc `email_outbox` ở main; nhánh `a9eca53` thêm `email/email-outbox.service.ts` (gửi Resend, `SENT`/`FAILED`) |
| 2–11 | như cũ | **không đổi** | `platform-admin`, `users`, `auth` không đổi |
| 12–14, 16–18, 20–21 | Xong / như cũ | **không đổi** | |
| **15** `isDefault` | Một phần | **Xong (BE)** | `menu.service.ts:60` select, `menu.dto.ts:351-356`, `:263-297` |
| 19, 22 | Chưa / xấu hơn | **không đổi** | `remainingPortions` còn nguyên (`counter-operations.service.ts:109, 217, 387`) |
| **23** Manager không mật khẩu | Chưa | **Xong (endpoint mới)** | `POST /employees/managers`; `POST /auth/managers` cũ còn. Thư chưa gửi được ở main (#1) |
| **24** CRUD Cashier/Barista | Một phần, lệch | **Một phần, lệch (main); Xong ở nhánh chưa merge** | main: `manager-staff.service.ts` không đổi (bắt mật khẩu); nhánh `a9eca53`: tạo/đặt lại bằng email, `PASSWORD_SETUP_ROLES` thêm CASHIER, BARISTA |
| **25** link email | Chưa | **Một phần** | `setupPath: '/setup-password'` ở `employees.service.ts` mới (đường trang web, không còn `/auth/…`) nhưng chưa là URL đầy đủ; `PUBLIC_WEB_URL` mới chỉ dùng cho tracking |
| 26 hạn mức không tính tài khoản khoá | Chưa | **Chưa** | `inviteManager` đếm cả tài khoản INACTIVE/khoá (`employees.service.ts:76-86`) |
| 27 `PATCH /stations/:id` | Chưa | **Chưa** | |
| **28** `GET /display-devices` | Một phần | **Một phần** | thêm `GET /public/calling-display/context`; vẫn thiếu danh sách thiết bị |
| 29–34, 36–37 | Chưa | **không đổi** | |
| 35 seed đơn đã trả | Chưa | **Chưa** | seed không đổi |
| 38, 40 | Xong | **Xong** (nhánh chưa merge thêm `assertConfigured`) | |
| 39 `isCustom`/`version` | Chưa | **Chưa** | |
| 41 | Không thêm | `branch-states` có (xem 3a) | |
| **42** seed mỗi lần khởi động | Mới | **Còn nguyên** | seed không đổi; đã thấy 09/10 (suất đặt lại, đơn v7 thêm) |
| **43** huỷ đơn đã trả | Chưa | **Chưa** | không có `/manager/orders/:id/cancel`; không có cột hoàn |
| **44** Cần xử lý / Lệch số tiền | Chưa | **Chưa (main); XẤU HƠN ở nhánh chưa merge** | main: webhook lệch vẫn chỉ ghi `REJECTED` (`payos-payment.service.ts:178-190`); nhánh: khoản chuyển `FAILED` + `failureReason PAYOS_AMOUNT_MISMATCH` → `POST /payments/:id/confirm` yêu cầu `PENDING` nên **Manager không xác nhận được** (xem #54) |
| **45** QR hết hạn, Kiểm tra lại | Chưa | **Chưa (main); Một phần ở nhánh chưa merge** | nhánh: `payos/recheck`, `payos/cancel`, khoản hết hạn → `FAILED PAYOS_EXPIRED`; vẫn không có job, đơn tiền về sau khi huỷ (BR-31) chưa có |
| **46** Manager xác nhận CASH | Chưa | **Chưa** | `payments.service.ts` không đổi |
| **47** `/manager/reports` lẫn đơn v7 | Chưa | **Chưa** | không đổi; đã thêm bằng chứng ở 7.3 |
| **48** thiếu tiền khách đưa/thối | Chưa | **Chưa** | `manager-operations.service.ts` không đổi |
| **49** đơn nháp `PENDING` | Chưa | **Chưa** | |
| **50** `expiresAt` khoản QR | Chưa | **Chưa** | |
| **51** socket checkout/huỷ | Chưa | **Chưa** | thêm `calling.*` nhưng không có sự kiện checkout/huỷ cho phòng chi nhánh |
| **52** quầy trong chi tiết | Chưa | **Một phần** | cột `payments.station_id` có (chỉ khi tạo QR PayOS; tiền mặt chưa lưu), chi tiết Manager vẫn không trả |

### 3d. Đối chiếu BR (thanh toán)

| BR | Đặc tả | BE `0348c38` (main) | Nhánh chưa merge |
|---|---|---|---|
| BR-26 QR 10 phút, 1 QR còn hiệu lực/đơn | `Dac-ta:708` | **Đúng**: `expiresAt = +10 phút`, tái dùng QR còn hạn (`payos-payment.service.ts:70-92`) | như main |
| BR-27 webhook idempotent, trong 1 transaction | `:709` | **Đúng**: khoá theo `idempotencyKey`, 1 transaction, cấp số gọi | như main |
| BR-28 lệch số tiền → Cần xử lý | `:710` | **Lệch**: chỉ ghi sự kiện `REJECTED`, không trạng thái, không báo (`:178-190`) | `FAILED` + lý do, vẫn không có trạng thái và không xác nhận được |
| BR-29 xác nhận thủ công; Kiểm tra lại tự xác nhận | `:711` | **Một phần**: `POST /payments/:id/confirm` (Manager, lý do, số tiền) có; **Kiểm tra lại không có** | `recheck` có |
| BR-30 hết hạn huỷ QR bên PayOS | `:712` | **Lệch**: huỷ lười khi thu ngân GET đơn, không gọi PayOS huỷ link | huỷ link PayOS khi `cancel`/`recheck` |
| BR-31 tiền về cho đơn đã huỷ | `:713` | **Lệch**: 409, không ghi nhận | chưa |

### 3e. Mã v7 còn trong luồng chính

| Mã v7 | Còn | Ảnh hưởng |
|---|---|---|
| Module `tables`, `reservations`, `attendance`, `vouchers`, `orders` (waiter/kitchen), `invoices`, `payments` (phiên bàn) | còn, đăng ký trong `app.module.ts` | vai `WAITER`, `KITCHEN` còn; `GET /manager/orders/:id` mở được đơn `DINE_IN`; báo cáo lẫn v7 (#47) |
| `remainingPortions` / `reservePortions` trong chốt đơn quầy | còn (`counter-operations.service.ts:109, 217, 387, 1165`) | #22: bán hết suất thì không chốt được; mobile đọc `remainingPortions` để khoá món |
| Seed `DINE_IN` | còn (#42) | đơn v7 mang ngày hôm nay xuất hiện trong báo cáo |

### 3f. `POST /payments/:paymentId/confirm` cho 7.4

| Hạng mục | Kết quả |
|---|---|
| Đổi gì ở main | **Không đổi** (DTO `ConfirmPaymentDto`, điều kiện `PENDING`, Manager bắt buộc `reason` 3–500 và `receivedAmount` > 0 với không phải tiền mặt, lệch số tiền ghi audit, BR-28 không ép, CASH Manager vẫn xác nhận được) |
| Sự kiện | `payment.confirmed {id, status}` + `preparation.order.queued {orderId}` (`payments.controller.ts:112-115`), **không** có `calling.order.queued` |
| **Điểm mới cần biết** | xác nhận thủ công **không tạo tracking token và không tạo PrintJob** (chỉ tiền mặt và webhook PayOS có, `counter-operations.service.ts:500`, `payos-payment.service.ts:270-281`) → đơn xác nhận thủ công không có QR theo dõi / phiếu in tự động và không lên màn gọi số ngay (#53) |
| Nhánh chưa merge | khoản lệch số tiền thành `FAILED` → không xác nhận được (#54) |

## 4. Hai repo mobile

### Vai trò (đã xác nhận bằng mã)

| Repo | Vai trò thật | Bằng chứng |
|---|---|---|
| `FE_mobile\Smart-FnB-Chain-Platform-Mobile` | **App chính POS (thu ngân) + pha chế** | `app/(cashier)/pos.tsx`, `orders.tsx`; `app/(barista)/queue.tsx`, `menu.tsx`; `select-station.tsx`; `src/services/cashier-api.ts`, `barista-api.ts`, `display-pairing-api.ts` |
| `FE_mobile_backscreen\smart_fnb_cashier_backscreen_version` | **Màn hình phía khách** (11.10–11.11) | `src/components/display/pairing-screen.tsx` (mã ghép), `cart-screen.tsx`, `qr-screen.tsx` (QR + đếm ngược), `status-screens.tsx` (đã trả / hết hạn), `offline-badge.tsx`, `src/services/display-api.ts`, `display-realtime.ts` |

Cả hai: Expo SDK 54 / React Native 0.81 (không có `pubspec.yaml`; không dùng Flutter). README của repo POS còn ghi "hoàn toàn mock" nhưng mã đã gọi API thật; README backscreen là mẫu `create-expo-app`.

### HEAD cũ → mới

| Repo | Cũ | Mới | Số commit |
|---|---|---|---|
| POS | `d389208` (2026-10-03) | `530aa33` (2026-10-09) | **+13** |
| Backscreen | `e2cbda3` (2026-10-01) | `3dbabee` (2026-10-05) | **+4** |

Nhánh remote: POS có `Tien` (`d276b06`, đã nằm trong main), `codex/v91-cashier-barista`, `feat/pickup-tracking` — **cả ba đi trước main = 0** (mọi commit đã vào main). Backscreen: `Tien` đi trước main = 0. **Không có "mã mới nằm ở nhánh chưa vào main" ở hai repo mobile.**

### Commit POS (d389208..530aa33)

`75e3972` Le Van Tien 10-09 "new QR payment for customer"; `954dbdb` Vũ Hà Gia Bảo 10-08 "add pickup tracking QR to cashier flow"; `63b4665` 10-06 "fixed today's bill history"; `9f2f5d7` 10-05 "fixed cashier data not sync to backscreen"; `2cd39d5` Gia Bảo 10-04 "sync cashier flow with customer display"; `a9cdb83` 10-04 "new pairing with cashier backscreen"; `9398429` Gia Bảo 10-04 "complete cashier and barista v9.1 flows" (cùng các merge #2–#5).

### Commit backscreen

`8f3943a` Le Van Tien 10-05 "integrated cashier backscreen workflow API"; `ed18d9c` 10-04 "new pairing with cashier client app UI demo"; `e2cbda3` 10-01 initial commit.

### 4a. Use case FE-M

| Mã | Đặc tả (dòng) | Trạng thái | Chứng cứ |
|---|---|---|---|
| CM-01 đăng nhập/đăng xuất | `Dac-ta:1267` | **Có** | `app/login.tsx`, `src/services/auth-api.ts`, `auth-context.tsx:47-54` (`/auth/login`, refresh tự động `api-client.ts:15-38`) |
| CM-02 hồ sơ, đổi mật khẩu | `:1268` | **Chưa** (chỉ ngôn ngữ + đăng xuất, `account-screen.tsx`); BE cũng chưa có endpoint đổi mật khẩu | |
| CS-01 chọn món → tuỳ chọn (mặc định chọn sẵn) → số lượng → ghi chú → chốt | `:359` | **Có** | `item-options-dialog.tsx:7, 95` (`defaultSelection`), `pos.tsx:133` `checkoutCart` → `POST /cashier/checkout` (`cashier-api.ts:178-188`) |
| CS-02 thu tiền mặt, mệnh giá nhanh, "vừa đủ", tiền thối | `:363` | **Một phần** | nhập tay + tính "Tiền thừa" + chặn thiếu (`server-checkout-dialog.tsx:114-125, 206-213`); **không có nút 50.000/100.000/200.000/500.000/vừa đủ**; tiền thối cỡ chữ thường (không "cỡ chữ lớn") |
| CS-03 thu QR: QR trên màn khách + đếm ngược, "Đã nhận" + âm thanh, Kiểm tra lại, huỷ QR sang tiền mặt | `:365` | **Một phần** | tạo QR `:135-156`; QR trên POS `:225` và gửi màn khách có `qrExpiresAt` (`:146-153`); hết hạn nhờ poll `GET /cashier/orders/:id` 2 giây (`:66-89`) → toast; **không đếm ngược trên POS, không nút Kiểm tra lại, không âm thanh "Đã nhận X đ", đổi sang tiền mặt bị chặn** (`:158-163`) |
| CS-04 in bill + phiếu số tự động (ESC/POS, Bluetooth/WiFi) | `:369` | **Một phần/Chưa in thật** | BE tạo `PrintJob`; POS chỉ báo "Lệnh in … đã được tạo" (`:179`), có reprint theo lý do (`order-detail-dialog.tsx:51-62`, `POST …/reprint`); **không thư viện in, không gửi ESC/POS tới máy in** (không `expo-print`/`escpos`/Bluetooth trong `package.json`) |
| CS-05 lịch sử đơn trong ngày | `:371` | **Có** | `orders.tsx` poll 5 giây, `GET /cashier/orders`, chi tiết + in lại (`cashier-api.ts:326-340`) |
| BA-01 hàng đợi (gom mẻ, lọc danh mục) | `:383` | **Có** | `queue.tsx:43`, `GET /barista/queue` (BE gom, BR-32), poll 5 giây `:56` |
| BA-02 bắt đầu mẻ, Xong từng ly/mẻ, gọi số, Đã giao | `:389` | **Có** | `startBatch`, `completeUnit` từng ly (`queue.tsx:162`), `deliverOrder` (`:115`), banner đơn mới + âm thanh (`new-order-banner.tsx:1-25`) |
| BA-03 báo hết món/tuỳ chọn | `:395` | **Có** | `barista/menu.tsx`, `PATCH /barista/menu-items|options/:id/availability` (`barista-api.ts:99-104`) |
| 11.10 ghép màn hình khách bằng mã 6 số, khoá 5 lần/5 phút (BR-45) | `:1090-1109` | **Có** | POS: `pairCustomerDisplay` `POST /stations/pair-customer-display` (`display-pairing-api.ts:40`), xử lý 429/410/400; backscreen: `POST /device-pairing/codes`, `pairing-screen.tsx` |

### 4b. Luồng demo tuần 10

**Tiền mặt**

| Bước | Trạng thái | Ghi chú |
|---|---|---|
| Chốt đơn có tuỳ chọn | **Có** | `optionIds` gửi BE, giá chụp lúc bán |
| Thu tiền mặt, chặn thiếu | **Có** | `confirmCash` kiểm `tenderedAmount < total` + BE 400 |
| Tiền thối | **Một phần** | hiện "Tiền thừa" cỡ thường; không mệnh giá nhanh |
| Số gọi | **Có** | màn "Thanh toán thành công" số gọi cỡ lớn |
| In bill + phiếu số | **Chưa in thật** | chỉ tạo `PrintJob` ở BE |
| Đẩy pha chế | **Có** | BE `preparation.order.queued`; barista poll 5 giây |
| QR theo dõi trên phiếu | **Có** (mới, ngoài đặc tả v9) | `QRCode value={tracking.url}` `:182` |

**QR**

| Bước | Trạng thái | Ghi chú |
|---|---|---|
| Tạo QR | **Có** | `stationId` đúng hợp đồng BE mới; **callback `returnUrl`/`cancelUrl` cứng `https://smart-fnb-be.onrender.com/api/docs`** (`cashier-api.ts:202`) |
| QR trên màn khách + đếm ngược 10 phút | **Có** (backscreen) | `qr-screen.tsx:36-44, 111-117`, hết hạn → màn "hết hạn" (`status-screens.tsx:27`) |
| "Đã nhận" khi webhook về | **Một phần** | POS chuyển màn thành công qua poll 2 giây; màn khách `PAID` giữ 8 giây (`status-screens.tsx:14, 37-69`); **không âm thanh** |
| Kiểm tra lại | **Chưa** | cả POS lẫn BE main (BE nhánh chưa merge có `payos/recheck`) |
| Huỷ QR, đổi sang tiền mặt | **Chưa** | UI chặn (`:158-163`); BE main không có huỷ QR (nhánh chưa merge có `payos/cancel`) |
| Hết hạn | **Có** | poll → toast "Mã QR đã hết hạn…", giỏ giữ lại |

### 4c. API mobile gọi so với BE `0348c38`

| Mobile | Endpoint | BE | Ghi chú |
|---|---|---|---|
| POS | `/auth/login`, `/auth/refresh`, `/auth/me`, `/stations`, `/cashier/context`, `/cashier/checkout`, `/cashier/orders/:id/payments/cash`, `/…/payments/payos`, `GET /cashier/orders[/:id]`, `…/receipt`, `…/reprint`, `…/cancel`, `/barista/context|queue|ready-orders`, `/barista/batches/start`, `/barista/units/:id/complete`, `/barista/orders/:id/deliver`, `/barista/menu-*/availability`, `/stations/pair-customer-display` | **đều tồn tại** | `payments/payos` cần `stationId` (mobile đã gửi) → **chỉ chạy với BE `0348c38` trở lên** |
| Backscreen | `POST /device-pairing/codes`, `GET /public/customer-display/context` + socket `/operations` (`display.update`, `cart.update`, `cart.clear`) | **đều tồn tại** | BE phát `display.update`; backscreen lắng nghe cả `station.sync` qua tải lại REST khi nối lại |
| Route/endpoint v7 | `webhooks/payos` cũ, bàn, check-in | **không còn gọi** | mobile chỉ còn `checkIn` của store mock trong `login.tsx:42, 103-106` (trạng thái cục bộ) |

### 4d. Màn hình khách (BR-45…48)

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Mã ghép do màn khách sinh, thu ngân nhập | **Có** | `createPairingCode` / `pairCustomerDisplay` |
| Đồng bộ giỏ | **Có nhưng khác đặc tả** | POS gửi `display:update {stationId, snapshot}` (`customer-display-realtime.ts:44`) thay vì `cart:update`/`cart:clear` (`:1136`); BE xử lý cả hai, cấp `version` tăng dần |
| Số phiên bản, gửi lại sau nối lại | **Có** | `latest` Map gửi lại khi `connect` (`:77`), backscreen tải `context` khi nối lại |
| BR-47 mất kết nối không chặn bán | **Có** (một phần) | backscreen `offline-badge.tsx`; POS bán bằng REST, đồng bộ sau khi nối lại |
| BR-46 server không ghi CSDL trước chốt | **Lệch (BE)** | gateway ghi `pos_stations.cart_snapshot` + `cartVersion` (#55) |
| BR-48 chỉ thu ngân đúng quầy gửi giỏ | **Có (BE)** | `realtime.gateway.ts` kiểm quầy ACTIVE cùng chi nhánh |

### 4e–4h

| Hạng mục | Trạng thái |
|---|---|
| 4e Pha chế: hàng đợi chỉ đơn đã trả của chi nhánh (BR-32), gom mẻ, cập nhật theo dòng, hết món, Đã giao | **Có** (BE gom; `queue.tsx`, `menu.tsx`) |
| 4f In ESC/POS, phiếu số, Bluetooth/MAC (#34) | **Chưa**: chỉ `printerConnection` đọc từ `/stations` để hiện chữ (`select-station.tsx:61`); không truyền tới máy in |
| 4g Nhận diện thương hiệu (logo, màu theo token) | **Chưa** trên POS (theme trắng-đen cố định); backscreen **có** `DisplayBranding` trong `DisplayContext` và nhận `primaryColor` (`display-api.ts:25-35`) nhưng chưa kiểm sâu việc áp màu |
| 4h Mã v7 còn lại | `src/data/store.tsx` (store mock, ca làm `checkIn`), `src/data/mock.ts`, `checkout-dialog.tsx` + `customer-display-*` bản mock (không còn được `pos.tsx` dùng), README lỗi thời |

## 5. Tiến độ theo lịch 11 tuần

Căn cứ tuần hiện tại: tài liệu kế hoạch không ghi ngày bắt đầu; ghép **giai đoạn web GĐ7 = lịch tuần 7** (BAN-GIAO mục 8, quyết định 43) và nhịp commit BE/mobile 04–09/10 (QR, theo dõi, màn gọi số). **Suy ra: đang ở tuần 7 của lịch (HK 10), tức tuần demo cho giảng viên**; mốc sinh tử là hết tuần 8.

| Tuần | Việc (ai) | Tình trạng |
|---|---|---|
| 2 | Multi-tenant, hồ sơ, Admin, gói, hạn mức (BE1+FE-W) | **Xong** (web GĐ3; BE #4–#11 còn lệch nhỏ) |
| 2 | Tài khoản phân cấp, Socket.IO (BE2) | **Một phần**: Owner mời Manager bằng email (main), Cashier/Barista bằng email ở nhánh chưa merge; email chưa gửi được ở main (#1) |
| 2 | Khung app 3 chế độ, đăng nhập, token màu; thử in ESC/POS (FE-M) | **Một phần**: 3 chế độ có (POS, pha chế, màn khách); **token màu/nhận diện chưa; in ESC/POS chưa** |
| 3 | Chi nhánh, danh mục, món, tuỳ chọn (BE1+FE-W) | **Xong** (web GĐ4–6) |
| 3 | Bật/tắt hai cấp; API nhận diện (BE2) | **Xong** (#15 đã xong ở main) |
| 3 | POS giỏ có tuỳ chọn thật (FE-M) | **Xong** |
| 4 | Chốt đơn, thu tiền mặt, số gọi; **dựng bill thành ảnh ESC/POS** (BE1+FE-M) | **Một phần**: chốt đơn, tiền mặt, số gọi xong; **dựng bill ảnh/ESC/POS chưa** (chỉ `PrintJob`) |
| 4 | Quầy, mã ghép, token thiết bị, đồng bộ giỏ; màn hình Manager (BE2+FE-W) | **Xong** (web GĐ5; `PATCH /stations` #27 chưa) |
| 5 | Liên kết PayOS; Owner: PayOS, nhận diện, gói (BE1+FE-W) | **Xong** (web GĐ6, #38, #40) |
| 5 | Bộ view báo cáo; API hàng đợi pha chế (BE2) | **Xong** |
| 5 | Ghép + màn hình khách; **in bill/phiếu từ POS** (FE-M) | **Một phần**: ghép + màn khách xong; in thật chưa |
| 6 | Thu QR PayOS: tạo, **huỷ, hết hạn, webhook idempotent, Kiểm tra lại**; luồng QR POS + màn khách (BE1+FE-M) | **Một phần**: tạo, webhook idempotent, hết hạn lười xong; **huỷ + Kiểm tra lại chỉ ở nhánh BE chưa merge, chưa nối UI mobile** |
| 6 | Gom món, cập nhật trạng thái món, gọi số (BE2) | **Xong** |
| 6 | Tra cứu đơn Manager, báo cáo chi nhánh (FE-W) | **Xong** (web 7.1–7.3) |
| 7 | Xác nhận thủ công, **Cần xử lý**, huỷ đơn đã trả, trạng thái hoàn; màn gọi số web (BE1+FE-W) | **Đang dở**: xác nhận thủ công BE có, web 7.4 chưa; Cần xử lý, huỷ đã trả, hoàn tiền **BE chưa (#43, #44)**; màn gọi số web **đã có ở web `main`**, chưa ở nhánh này |
| 7 | Màn pha chế gom món, hết món; lịch sử đơn + in lại POS (BE2+FE-M) | **Xong** (in lại gọi BE được, in thật chưa) |
| 7 | Bản thử trợ lý AI trên dữ liệu seed (BE2) | **Chưa bắt đầu** (web AI mock, GĐ9) |
| 8 | Chạy trọn luồng đầu cuối trên máy chủ thật; test webhook trùng/đồng thời (cả nhóm) | **Chưa bắt đầu** (chưa có khoá PayOS thật ở BE local) |
| 9–11 | Báo cáo đa chi nhánh, AI, chỉ đọc khi hết hạn, seed 2 doanh nghiệp, tài liệu | **Chưa bắt đầu** |

## 6. Rủi ro chặn demo tuần 10 (luồng tiền mặt và QR chạy trọn)

| # | Mức | Thiếu gì | Của ai | Đề xuất |
|---|---|---|---|---|
| R1 | **Rất cao** | **In bill + phiếu số thật** (CS-04, tuần 4–5): POS chỉ tạo `PrintJob`, không gửi ESC/POS tới máy in; BE chưa dựng bill thành ảnh ESC/POS; chưa có máy in thử (#34 MAC) | BE1 + FE-M | chốt ngay: nếu không kịp, dùng phương án in trình duyệt/`expo-print` hoặc hiển thị phiếu số trên màn hình khách khi demo, ghi rõ CC-11 |
| R2 | **Cao** | **QR trọn vẹn**: "Kiểm tra lại", huỷ QR để đổi sang tiền mặt, đếm ngược và "Đã nhận X đ" + âm thanh trên POS (CS-03). BE: có ở nhánh `feat/cashier-barista-render-flow` **chưa merge**; mobile chưa nối | BE1 (merge), FE-M | Khánh nhắc Gia Bảo merge `a9eca53` vào main; FE-M nối `recheck`/`cancel` |
| R3 | **Cao** | **Khoá PayOS thật/khả năng chạy QR thật**: BE local chưa `PAYOS_MASTER_KEY`, `PAYOS_WEBHOOK_BASE_URL` công khai; chưa kiểm một lần webhook thật (CC-02) | Cả nhóm | mở kênh test PayOS và URL công khai (ngrok/Render) trước tuần 8 |
| R4 | Trung bình | **Email chưa gửi** (#1) → Owner/Manager/thu ngân mới không nhận được thư đặt mật khẩu; demo phải tạo tài khoản bằng seed | BE1 | merge nhánh email (Resend) + đặt `EMAIL_API_KEY`, `EMAIL_FROM` |
| R5 | Trung bình | **Lệch số tiền / Cần xử lý / huỷ đơn đã trả** (BM-05 lệch, BM-06): BE chưa (#43, #44); nhánh chưa merge làm khoản lệch thành `FAILED` không xác nhận được (#54) | BE1 | quyết định mô hình trạng thái "Cần xử lý" trước khi web 7.5/7.6 |
| R6 | Trung bình | **Seed ghi đè mỗi lần khởi động (#42)** làm đổi suất/đơn/quầy ngay trước demo (đã xảy ra 09/10) | BE1 | tách seed demo khỏi khởi động thường (cờ `SEED_DEMO_DATA`) hoặc chạy một lần |
| R7 | Trung bình | **Hai nhánh web phân kỳ**: `main` có màn gọi số, màn hình khách web, theo dõi đơn, Vercel; `feat/v9-orders` có GĐ7. Merge muộn → xung đột (`flags.ts`, `api/index.ts`, `types/branch.ts`) và `ManagerAccounts` | FE-W | merge `main` vào `feat/v9-orders` (Khánh làm PR) sớm; dùng module `callingDisplay`/`orderTracking` của main |
| R8 | Thấp–Trung bình | Mobile: callback PayOS cứng vào Swagger của Render; `remainingPortions` v7 chặn bán khi suất = 0 (#22); không nhận diện thương hiệu; token màu | FE-M | thay callback bằng URL cấu hình; bỏ khoá theo suất; áp token (BR-41) |
| R9 | Thấp | Bán trong demo trên máy thật cần BE build lại mới có `stationId` cho QR | Khánh | build BE `0348c38` (xem 8) |

## 7. Mục mới cần nhờ BE (đánh tiếp từ #53) và việc báo nhóm mobile

| # | Mức | Việc cần BE | Căn cứ | Chặn demo? |
|---|---|---|---|---|
| **53** | Trung bình | **Xác nhận thủ công không tạo tracking token, không tạo `PrintJob`, không phát `calling.order.queued`**: `POST /payments/:id/confirm` (`payments.service.ts`, không đổi) chỉ chuyển đơn sang pha; đơn xác nhận thủ công không có QR theo dõi, không có phiếu in tự động, không lên màn gọi số. Đề nghị dùng chung một hàm "đã trả" với tiền mặt/webhook (BR-27: "cả ba đi qua cùng một hàm xác nhận") | BR-27 (`:709`), BM-05, 11.9 | Có, khi demo xác nhận thủ công |
| **54** | **CAO** (chỉ khi nhánh `a9eca53` được merge) | **Khoản lệch số tiền thành `FAILED` thì không còn xác nhận thủ công được** (`confirm` yêu cầu `PENDING`). BR-28 đòi: Cần xử lý, Manager xác nhận khi thực nhận ≥ tổng, nhận thiếu → huỷ + ghi khoản phải hoàn. Đề nghị: giữ khoản ở trạng thái chờ + cờ "Lệch số tiền" (hoặc cho phép `confirm` khoản `FAILED` có `PAYOS_AMOUNT_MISMATCH`), kèm #44 | BR-28 (`:710`), BR-29 (`:711`) | Có |
| **55** | Thấp | **`display:update` ghi `cart_snapshot` vào CSDL** (`realtime.gateway.ts`, `pos_stations.cart_snapshot`) trái BR-46 "server chỉ chuyển tiếp trước khi chốt". Chấp nhận như mở rộng (tiện cho nối lại) hoặc ghi vào đặc tả | BR-46 (`:748`) | Không |
| — | Đề xuất duyệt | **Tính năng ngoài đặc tả v9**: trang theo dõi đơn công khai `/t/:token` + `GET /public/track/:token` + QR theo dõi trên phiếu (`docs/CASHIER_BARISTA_PICKUP_TRACKING.md`). Đặc tả v9 không nhắc. Khánh/nhóm chốt: giữ như mở rộng và bổ sung vào đặc tả (mục 5/11), hoặc bỏ | — | Không |

**Báo nhóm mobile (M1…)**

| # | Việc |
|---|---|
| M1 | **In bill + phiếu số thật** tới máy in nhiệt (ESC/POS, Bluetooth/WiFi) hoặc phương án dự phòng; hiện chỉ tạo `PrintJob` (CS-04) |
| M2 | POS: nút mệnh giá nhanh 50.000 / 100.000 / 200.000 / 500.000 và "vừa đủ"; tiền thối cỡ chữ lớn (CS-02, `:363`) |
| M3 | POS QR: đếm ngược 10 phút (có ở màn khách, thiếu ở POS), "Đã nhận X đ" kèm âm thanh, nút **Kiểm tra lại**, **huỷ QR** để đổi sang tiền mặt (CS-03, BR-29/BR-30); cần merge BE `payos/recheck`, `payos/cancel` |
| M4 | Thay `returnUrl`/`cancelUrl` cứng `https://smart-fnb-be.onrender.com/api/docs` bằng URL cấu hình (`cashier-api.ts:202`) |
| M5 | Áp nhận diện thương hiệu (logo, màu) và token màu trên POS/pha chế; hiện theme trắng-đen cố định (BR-41/42) |
| M6 | CM-02: hồ sơ cá nhân và đổi mật khẩu (cần BE) |
| M7 | Giỏ đồng bộ dùng `cart:update`/`cart:clear` theo đặc tả 11.11 hoặc cùng chốt với BE là chấp nhận `display:update` |
| M8 | Dọn mã v7/mock: `src/data/store.tsx`, `mock.ts`, `checkout-dialog.tsx`, `customer-display-*` mock; cập nhật README; kiểm cờ `EXPO_PUBLIC_DISPLAY_PAIRING_MOCK` không bật ở bản demo |

## 8. Đề nghị cho Khánh

| Câu hỏi | Đề nghị |
|---|---|
| **Có build BE `0348c38` ngay không?** | **Có.** Migration chỉ thêm (an toàn), `.env` không phải sửa, không đổi enum, không phá vỡ web; lợi ích: mobile `main` mới gọi được `payments/payos` (cần `stationId`), mở khoá `isDefault`/`POST /employees/managers`/`branch-states`, có `public/track` và `calling-display/context`. **Lưu ý:** seed (#42) sẽ chạy lại khi build → đặt lại suất (Cơm gà 15, Canh chua 8, Trà đào 0) và có thể thêm đơn `DINE_IN`; đã có bản sao lưu `backup-smartfnb-20261010-110143.sql`. Quầy "Quầy 1" và 13 đơn mẫu đã tồn tại sau lần khởi động trước nên dự kiến còn nguyên. |
| Có nên chờ nhánh `feat/cashier-barista-render-flow`? | Không cần chờ để build `main`. Nhưng **nhắc Gia Bảo merge `a9eca53` trước tuần 8** (email, Kiểm tra lại, huỷ QR), đồng thời xử lý #54 trước khi merge. |
| 7.4 cần chỉnh gì? | `POST /payments/:id/confirm` **không đổi** nên 7.4 làm tiếp như QĐ 62. Chỉnh: (a) ghi rõ giới hạn #53 (đơn xác nhận thủ công không có QR theo dõi/phiếu in) vào mục chờ BE; (b) chuẩn bị đọc `failureReason` (đã có trong `paymentSelect`) để hiện "Lệch số tiền" nếu nhánh chưa merge vào, nhưng KHÔNG dựng nút xác nhận cho khoản `FAILED` (BE từ chối); (c) trước khi làm 7.4, **merge `main` của web vào nhánh** (qua PR của Khánh) để tránh làm trùng màn gọi số/`ManagerAccounts`; (d) vì `main` đã có màn gọi số web, lộ trình GĐ8 nên đổi thành "đối chiếu và dùng lại mã của `main`". |
