# Đối chiếu BE `fb7cae9` (13/10/2026) — lượt 7.7a

> Nguồn: đọc mã BE `514c426..fb7cae9` (6 commit của Vũ Hà Gia Bảo, 12/10/2026), `docs/FE_WEB_BE_2026_10_11_STATUS.md` và `docs/PAYOS_EXPIRY_45_61.md` của BE, GET thật trên BE local đã build lại (Manager/Owner demo, KHÔNG ghi), SELECT chỉ đọc, đối chiếu mã web. Không sửa mã web tính năng.
> Quy ước kết luận: **ĐẠT** = mã khớp yêu cầu + (có test BE hoặc GET thật); **MỘT PHẦN** = làm được một phần hoặc có kẽ hở; **CHƯA** = chưa làm; **KHÔNG KIỂM ĐƯỢC** = mã khớp nhưng không có test BE và không dựng được GET thật (cần thao tác ghi), nêu lý do.
> Cỡ việc web: S ≤ 15 phút, M ≤ 45 phút, L lớn hơn.

## 1. BE local

| Mục | Giá trị |
|---|---|
| Hash | `514c426` → **`fb7cae9`** (`feat: persist paid order stock alerts`), fast-forward, 6 commit, không merge commit |
| Sao lưu | `C:\Users\KhanhNB\backup-smartfnb-20261013-152909.sql`, 777.107 byte (mốc cũ 753.167) |
| Migration | 2 mới, `_prisma_migrations` 27 → 29, "successfully applied": `20261012100000_late_expired_payos` (thêm 2 giá trị `PaymentStatus` `EXPIRED`, `REQUIRES_ATTENTION`; thêm `orders.attention_at`, `orders.attention_reason` nullable; index) và `20261012110000_station_device_management` (thêm `display_devices.token_expires_at`, **backfill `paired_at + 30 ngày`** cho dòng cũ, rồi `SET NOT NULL`; index). Khánh duyệt câu `UPDATE` vì chỉ điền cột vừa thêm |
| Build | `docker compose up -d --build api`: healthy ở lần kiểm thứ 2, restart 0 |
| Seed | `prisma/seed.ts` không đổi; `docker-entrypoint.sh:6` chỉ chạy `prisma db seed` khi `RUN_DEMO_SEED=true` (mặc định `false`, `docker-compose.yml`, `.env.example`). Log container sau build: chỉ có `migrate deploy`, không có seed. Dữ liệu demo giữ nguyên (84 đơn, 82 khoản, 2 khoản hoàn) |
| Biến môi trường | `environment.validation.ts` không đổi; không thiếu biến |
| `display_devices` sau backfill | 2 dòng, cả hai `TEST-8.1 màn gọi số A/B` (ghép 11/10, đã thu hồi 11/10), `token_expires_at` = `paired_at + 30 ngày` (10/11/2026). Thiết bị đang hoạt động (`revoked_at IS NULL`): **0**; đang hoạt động mà đã hết hạn: **0**. Không thiết bị hoạt động nào bị tính hết hạn |
| Tệp chưa theo dõi | `prisma/smart-fnb.dbml` (như trước) |

## 2. Bảng đối chiếu các mục được yêu cầu xác minh (29 mục)

| # | Ưu tiên | Kết luận | Commit / file:dòng (BE) | Test BE | Hợp đồng đổi? Vỡ web? | Web cần làm | Cỡ |
|---|---|---|---|---|---|---|---|
| 72 | 1 | **ĐẠT** | `db49fd1`: `manager-reports.service.ts:49` (đếm `status <> 'CANCELLED'`), `:63` (theo kỳ), `:129` (theo giờ); `reports.service.ts:537` (Owner). GET 30 ngày: `orderCount` **9** (= 11 − 2 đơn huỷ ở 7.6), `averageOrderValue` 105.555,56 (= 950.000 / 9), theo giờ cộng 9, ngày 08/10 `orders` 9 | `owner-features.test.mjs` (`countableOrdersWhere`); không có test riêng cho báo cáo Manager | Hình dạng không đổi; **ngữ nghĩa đổi** (`orderCount`, `averageOrderValue` là sau hoàn). Không vỡ | Không cần mã. Sửa kỳ vọng script `phase7 report` (11 → 9) | S |
| 47 | 1 | **MỘT PHẦN** | `db49fd1`. ĐÃ sửa: số đơn, giá trị trung bình, theo giờ. CHƯA sửa: `payments[]` ("theo hình thức") `manager-reports.service.ts:78-98` KHÔNG lọc `orders.type` và còn nhánh `table_sessions` → vẫn cộng đơn `DINE_IN` v7. GET: 37 CASH 5.925.000 + 14 BANK_TRANSFER 2.585.000 = 8.510.000 (51 khoản) trong khi doanh thu gộp 1.090.000 (11 khoản `COUNTER_PICKUP`). Tài liệu BE ghi "phương thức thanh toán đồng nhất": **không đúng với dữ liệu local** | Không | Có: `payments[]` thêm `grossSettledAmount`, `grossReceivedAmount`, `refundAmount`, `netAmount`, `cancelledAfterPaymentCount`; **`settledAmount`/`receivedAmount` nay là SAU hoàn** (trước là gộp), `paymentCount` không gồm đơn đã huỷ. Không vỡ (mapper đọc đúng tên cũ) nhưng nhãn "đã thu" nay là số ròng | Đổi nhãn/chú thích cột; (tuỳ chọn) hiện gộp/hoàn từng hình thức. Đòi BE lọc `type = COUNTER_PICKUP` (#47 còn lại) | S |
| 42 | 2 | **ĐẠT** | `297c164`, `3deff67`: `docker-entrypoint.sh:6`, `docker-compose.yml`, `.env.example`. Kiểm thật: log container sau build không có seed | Không (shell) | Không đổi API. Hành vi khởi động đổi: muốn seed lại phải `RUN_DEMO_SEED=true` | Không. Ghi BAN-GIAO (QĐ về seed) | S |
| 51 | 2 | **MỘT PHẦN** | `8f9e37c`: `counter-operations.controller.ts:139` `order.finalized {orderId,status}` (cho `POST orders/:id/finalize`), `:200` `payment.cancelled {orderId,paymentId,status}`, `:216` `order.cancelled {orderId,reason}`; `counter-payment-settlement.service.ts:38` `payment.expired {orderId,paymentId,status}`. **CÒN THIẾU**: `POST /cashier/checkout` (`:52-58`, và service không có publisher) — đơn "Chờ thanh toán" mới vẫn KHÔNG phát; QR hết hạn chỉ phát khi có người mở/recheck/webhook (không có job) | `payment-settlement.test.mjs` (`payment.expired`); không test cho 3 sự kiện ở controller | Thêm 3 tên sự kiện mới; không đổi cái cũ. Không vỡ (tên lạ bị bỏ qua) | Thêm `order.finalized`, `payment.cancelled`, `payment.expired` vào `ORDER_EVENT_TYPES`; **GIỮ** tải lại 60 giây (checkout và hết hạn tự nhiên vẫn im lặng). Đòi BE phát cho `checkout` | S |
| 28 | 2 | **ĐẠT** | `3deff67`: `stations.controller.ts:104` `GET /display-devices` (MANAGER), `stations.service.ts:109`. GET thật 200: trả cả thiết bị đã thu hồi (2 dòng TEST-8.1) với `id,type,name,stationId,station{id,name,status},pairedAt,lastSeenAt,tokenExpiresAt,revokedAt` | Không riêng cho `listDisplayDevices` | Endpoint mới, không vỡ | Bỏ khối "chờ BE #28" (`Stations.tsx:208`); liệt kê (lọc `revokedAt`), thu hồi theo `deviceId`, hiện hạn token và lần thấy gần nhất. Có mã tham khảo ở `origin/feat/manager-display-management` (`9399a35`, của Bảo, đã bị revert ở `main`) | M |
| 27 | 2 | **ĐẠT** (chưa gọi thật vì cấm ghi) | `3deff67`: `stations.controller.ts:91` `PATCH /stations/:stationId` (MANAGER, kiểm gói), `stations.service.ts:70-107`, `station.dto.ts` `UpdateStationDto`. Swagger có route. Kẽ hở: không bắt `P2002` (đổi trùng tên → nhiều khả năng 500, như #34a), không kiểm IP/MAC, Bluetooth vẫn bắt địa chỉ | `stations.service.test.mjs` (`updates only a station in the manager branch`) | Endpoint mới, không vỡ | Mở khoá đổi tên, ngừng/bật lại, sửa máy in (`Stations.tsx:15` `PENDING_BE`, `real.ts`); dịch lỗi 400 `Printer address is required…`, `Station name must not be empty` | M |
| 64 | 2 | **ĐẠT** (nhánh `INVITED` chưa dựng được) | `edb64e6`: `manager-staff.service.ts:373` `response()` thêm `invitationStatus` ∈ `ACTIVE/SUSPENDED/INVITED/INVITATION_EXPIRED/DEACTIVATED` và `invitationExpiresAt`; `:284` + `branch-manager.controller.ts:113` `POST /manager/staff/:employeeId/invitation/cancel {reason}` (chỉ khi `INACTIVE`, 409 nếu không có lời mời). GET thật: có `invitationStatus`, `invitationExpiresAt`, 2 nhân viên `ACTIVE`; `passwordSetupTokens` không rò ra. Phần phụ cũ (mở khoá `INACTIVE` → `ACTIVE` khi chưa có mật khẩu) KHÔNG đổi | Không có test cho `invitationStatus` hay huỷ lời mời | Thêm trường vào mọi phản hồi `/manager/staff*`; không vỡ | Hiện nhãn "Đã mời / Lời mời hết hạn / Đã vô hiệu" theo `invitationStatus`, cột hạn lời mời, nút "Huỷ lời mời" (hộp lý do) | M |
| 50 | 2 | **ĐẠT** | `8f9e37c`/`edb64e6`: `manager-operations.service.ts:20` `expiresAt` trong `paymentSelect` (danh sách và chi tiết). GET thật: khoá có mặt (`null` với tiền mặt; local không có khoản QR để thấy giá trị) | `payos-channel.test.mjs`, `payment-settlement.test.mjs` (hết hạn) | Thêm trường; thêm 2 giá trị enum `PaymentStatus` `EXPIRED`, `REQUIRES_ATTENTION` → web hiện "Khác (EXPIRED)" | Thêm 2 mã vào `PAYMENT_STATUS_CODES`/`codes.ts` ("Hết hạn", "Cần xử lý"); hiện hạn QR; khoản `PENDING` đã quá `expiresAt` hiện "Hết hạn" | M |
| 48 | 2 | **ĐẠT** | `edb64e6`: `manager-operations.service.ts:17-18` `tenderedAmount`, `changeAmount`. GET thật đơn `CTR-1791439018226-55E81C`: 100.000 / 35.000 | Không riêng | Thêm trường; không vỡ | Hiện "Khách đưa / Tiền thối" ở khoản tiền mặt trong chi tiết (`OrderDetail.tsx:143`) | S |
| 61 | 2 | **MỘT PHẦN** | `8f9e37c`: tiền về sau QR hết hạn → khoản `REQUIRES_ATTENTION`, đơn `REQUIRES_ATTENTION` lý do `PAYMENT_RECEIVED_AFTER_EXPIRY`, không đẩy xuống Barista (`counter-payment-settlement.service.ts:68-140`, `payos-payment.service.ts:232-240`, recheck `:323-331`). Sau khi đơn huỷ: đã có từ `514c426` (hoàn `LATE_PAYMENT`). **KẼ HỞ (#75)**: đơn rơi vào trạng thái này không có đường xử lý — `settle` chỉ nhận khoản `PENDING`/`AMOUNT_MISMATCH` (`:205`, 409), `cancelPaidOrder` chỉ nhận `SUCCESS`/`AMOUNT_MISMATCH` (`paid-order-refund.service.ts:136`, 409 "no received payment"), `cancelUnpaid` chỉ đơn `CONFIRMED` (`counter-operations.service.ts:540`) | `payment-settlement.test.mjs` (`flags money received after QR expiry…`), `payos-channel.test.mjs` (recheck sau hết hạn) | Lý do và trạng thái mới | Hiện đơn/khoản trong "Cần xử lý" với nhãn đúng (xem #65/#67); KHÔNG hiện nút xác nhận/huỷ cho loại này cho tới khi BE sửa #75 | M |
| 59 | 2 | **ĐẠT** (quyết định nhóm) | BE giữ: Manager/Owner xác nhận chuyển khoản tay và huỷ/hoàn khi gói hết hạn — đây là sửa dữ liệu/tiền, không tạo giao dịch (`FE_WEB_BE_2026_10_11_STATUS.md`; `payments.service.ts` không đổi, không kiểm gói; hoàn/huỷ đã trả: `assertRefundAccess`). BE đề nghị FE cùng chính sách | Không | Không đổi | **Cần Khánh duyệt đổi QĐ 85**: mở nút "Xác nhận chuyển khoản" và "Huỷ đơn đã trả" ở chế độ chỉ đọc (hiện chỉ "Đánh dấu đã hoàn" mở). BE vẫn chặn ghi khác | S |
| 67 | 3 | **MỘT PHẦN** | `fb7cae9`: hết món → đơn đã trả `REQUIRES_ATTENTION` + `attentionAt` + `attentionReason`: `counter-operations.service.ts:1047-1056` (`PAID_ITEM_OUT_OF_STOCK`), `manager-operations.service.ts:344-355` (`PAID_OPTION_OUT_OF_STOCK`) — lọc được bằng `status=REQUIRES_ATTENTION`. CÒN: loại (a) QR `PENDING` quá lâu chờ xác nhận tay — BE ghi "cần nhóm chốt ngưỡng thời gian", chưa làm | `counter-operations.service.test.mjs` (đường món); đường tuỳ chọn Manager không có test | Đơn đã TRẢ nay có thể `REQUIRES_ATTENTION`. `attention.ts:36-60` coi mọi đơn đó là lệch tiền: hiện `kind: unknown`, "Đã nhận —". **Không vỡ nhưng sai/thiếu thông tin** | Nhãn lý do theo `attentionReason`; không gán "lệch tiền" cho đơn đã `PAID` | M |
| 65 | 3 | **MỘT PHẦN** | `8f9e37c`: `attentionAt`/`attentionReason` trong `summarySelect` (`manager-operations.service.ts:71-72`), được ghi cho hết món (#67) và tiền về sau hết hạn (#61). **`markAmountMismatch` KHÔNG ghi chúng** (`counter-payment-settlement.service.ts:166-171` chỉ `status`) → đơn lệch tiền (loại phổ biến nhất) có `attentionAt = null` | Không | Thêm trường; không vỡ | Dùng `attentionAt ?? placedAt` cho "Đã chờ"; hiện `attentionReason` nếu có. Đòi BE ghi cả khi lệch tiền | S |
| 66 | 3 | **ĐẠT** | `3deff67`: `manager.dto.ts` `sortBy ∈ placedAt/attentionAt/status/totalAmount`, `sortOrder ∈ asc/desc`; `manager-operations.service.ts:160`. GET thật: `sortBy=totalAmount&sortOrder=asc` 200 (65.000 ×3); `sortBy=bogus` 400 | Không | Tham số mới tuỳ chọn; không vỡ | Gọi `sortBy=attentionAt&sortOrder=asc` ở danh sách "Cần xử lý" thay vì lấy 100 đơn rồi sắp lại (lưu ý: đơn `attentionAt = null` xếp cuối khi `asc`) | S |
| 68 | 3 | **ĐẠT** | `3deff67`: `stations.service.ts:412` gọi `realtime.revokeDevice`; `realtime.gateway.ts:167` `disconnectDevice` phát `device.revoked {deviceId, occurredAt}` rồi ngắt socket | `stations.service.test.mjs` (thu hồi gọi `revokeDevice`); không test gateway | Sự kiện mới `device.revoked`; không vỡ | Màn gọi số nghe `device.revoked` → về bước ghép ngay; giữ REST dự phòng | S |
| 69 | 3 | **ĐẠT** | `3deff67`: thân lỗi `{code, message}` — HTTP 403 `DEVICE_TOKEN_MISSING/INVALID/REVOKED/EXPIRED` (`stations.service.ts:477-505`); 400 ghép `PAIRING_CODE_INVALID/USED/EXPIRED` (`:420-441`); socket `connect_error` `DEVICE_TOKEN_INVALID/REVOKED/EXPIRED` (`realtime.gateway.ts`). GET thật: không token → `DEVICE_TOKEN_MISSING`, token sai → `DEVICE_TOKEN_INVALID` | `stations.service.test.mjs` (`DEVICE_TOKEN_EXPIRED`) | **Có đổi**: `message` 403 không còn "invalid or revoked"; mã nằm ở `code` (web chỉ đọc `error`). Web phân loại theo HTTP status nên **không vỡ**; câu phân biệt chưa dùng được | `toApiError` đọc thêm `code`; màn gọi số hiện câu riêng (hết hạn 30 ngày / thu hồi / chưa ghép); cập nhật `session.ts` ("token không có hạn" đã sai) | M |
| 70 | 3 | **KHÔNG KIỂM ĐƯỢC** | `3deff67`: `stations.service.ts:129-134` xoá mã hết hạn/đã dùng mỗi lần tạo mã; `:449-462` giới hạn 10 yêu cầu/phút/khoá `request.ip` trong bộ nhớ tiến trình (429). Mã khớp. Lý do: tạo mã công khai là ghi, không có test BE | Không | Có thể trả 429 | Xử lý 429 ở `deviceClient` (câu "thử lại sau ít phút", giãn nhịp) | S |
| 71 | 3 | **ĐẠT** | `3deff67`: `stations.service.ts:251` `counts {preparing, ready}`, `pageLimit: 30`. Không GET thật (cần token thiết bị) | `stations.service.test.mjs` (`counts` 42/7, `pageLimit` 30) | Thêm trường; không vỡ (`phase8 board` 12/12) | Dùng `counts` cho "+N số khác" thay vì đếm theo ô | M |
| 73 | 3 | **ĐẠT** | `edb64e6`: `manager-operations.service.ts:255` `refunds[].requestedBy`, `completedBy` `{id, email, profile{id, employeeCode, firstName, lastName}}` (Owner: `ownerCode`). GET thật 200 trả đủ | `paid-order-refund.test.mjs` | Thêm trường (chỉ ở chi tiết, không ở danh sách); không vỡ | Hiện tên người yêu cầu/hoàn cạnh vai trò (`RefundModals.tsx`, `OrderDetail.tsx`) | S |
| 74 | 3 | **CHƯA** | Không có test song song huỷ/webhook/xác nhận tay trong 6 commit | Không | — | Không | — |
| 58 | 3 | **CHƯA** | Không có test webhook trùng/đồng thời trong `payment-settlement.test.mjs` | Không | — | Không | — |
| 60 | 3 | **ĐẠT** (kèm tác dụng phụ với web) | `3deff67`: `PAYMENT_ALREADY_SETTLED` nay ở `error` (`counter-payment-settlement.service.ts:208-212`); `message` = "Payment has already been settled or is no longer payable". `PAYMENT_AMOUNT_INSUFFICIENT` giữ nguyên ở `error` | `payment-settlement.test.mjs` (đã đổi kỳ vọng) | **Có đổi, hỏng nhẹ**: `errors.ts:156` khớp regex theo `message` cũ nên giờ rơi xuống câu chung 409 "Dữ liệu xung đột…" (vẫn tải lại đơn vì `confirmErrorInfo` theo 409). Không mất chức năng | Thêm nhánh `err.code === "PAYMENT_ALREADY_SETTLED"` ở `translateBackendMessage`; cập nhật `backendMessages.fixture.ts`, `mock.ts:568` | S |
| 62 | 3 | **ĐẠT** | `edb64e6`: `manager-staff.service.ts` `staffSelect` thêm `user.lastLoginAt`. GET thật: có giá trị cho cả 2 nhân viên | Không | Thêm trường; không vỡ | Hiện cột "Đăng nhập gần nhất" ở real (`account/mapper.ts:80`, `StaffTable.tsx:227`) | S |
| 63 | 3 | **KHÔNG KIỂM ĐƯỢC** | `edb64e6`: `manager.dto.ts` `phone?: string \| null`; `manager-staff.service.ts:227,247` nhận `phone: null` để xoá. Mã khớp. Lý do: `PATCH` là ghi, không có test BE | Không | Câu lỗi mới `Only phone can be cleared with null` thay `Null fields are not supported` | Mở khoá việc xoá trắng SĐT (`StaffTable.tsx:439`) và gửi `null`; cập nhật `errors.ts` (regex "null fields") | S |
| 49 | 3 | **CHƯA** (cố ý) | BE giữ đơn `PENDING` vì Mobile POS còn dùng bản nháp; chỉ đổi khi FE Mobile chuyển hợp đồng | Không | — | Giữ "Khác (PENDING)" | — |
| 52 | 3 | **MỘT PHẦN** | `3deff67`: `paymentSelect` thêm `stationId`, `station{id,name,status}` (`manager-operations.service.ts:21,28`). Khoản **QR** có quầy (đặt lúc tạo QR); khoản **tiền mặt** không lưu `stationId` (`counter-operations.service.ts` `collectCash` tạo `payment` không có `stationId`; GET thật đơn tiền mặt `station: null`) | Không | Thêm trường; không vỡ | Hiện quầy khi có; đòi BE lưu `stationId` cho tiền mặt | S |
| 55 | 3 | **CHƯA** (cố ý) | BE giữ `cart_snapshot` vì cơ chế khôi phục màn khách sau mất kết nối; có thể bổ sung tên sự kiện mới ở đợt riêng | Không | — | Không | — |
| 29 | 3 | **KHÔNG KIỂM ĐƯỢC** | `3deff67`: `platform-admin.dto.ts:163` `maxTables?` tuỳ chọn; `platform-admin.service.ts` `maxTables ?? 1`. Mã khớp. Lý do: tạo gói là ghi (Admin), không test riêng | Không (test có `maxTables` chỉ ở fixture) | Nới lỏng; không vỡ | Bỏ `MIN_MAX_TABLES` gửi cố định 1 (`admin/real.ts`) — không bắt buộc | S |
| 45 | thêm | **MỘT PHẦN** | (b) huỷ link PayOS, (d) recheck: đã có từ `d98b4c1`; (c) tiền về muộn: `8f9e37c` (xem #61). (a) **vẫn không có job**: không có `@Cron`/`setInterval` trong `src/`; `EXPIRED` chỉ được ghi khi có người gọi `markExpired` (mở đơn, recheck, tạo QR mới, webhook muộn). Đơn QR chưa ai mở quá 10 phút vẫn `CONFIRMED`/`UNPAID`, khoản `PENDING` | `payment-settlement.test.mjs`, `payos-channel.test.mjs` | Trạng thái `EXPIRED` mới | Tính "Hết hạn" ở web từ `expiresAt < now` (cùng #50); không dựa vào `status` | M |

Tổng 29 mục: **ĐẠT 15** (#72, #42, #28, #27, #64, #50, #48, #59, #66, #68, #69, #71, #73, #60, #62) · **MỘT PHẦN 7** (#47, #51, #61, #67, #65, #52, #45) · **CHƯA 4** (#74, #58, #49, #55) · **KHÔNG KIỂM ĐƯỢC 3** (#70, #63, #29).

## 3. Rà #2–#41 (các mục còn ghi "chưa"/"một phần")

Căn cứ: danh sách tệp đổi trong `514c426..fb7cae9` (31 tệp) và đọc lại các dòng liên quan. Mục không có trong diff giữ nguyên trạng thái ở `api-contract-plan.md`.

| # | Kết luận | Ghi chú |
|---|---|---|
| 1 | MỘT PHẦN | email vào `main` từ `d98b4c1`; `EMAIL_*` chưa đặt ở local nên KHÔNG KIỂM ĐƯỢC gửi thật; không đổi |
| 2 | MỘT PHẦN | phụ thuộc #1; không đổi |
| 3, 5, 6, 7, 9, 11 | CHƯA | `platform-admin` chỉ đổi `maxTables` (#29); DTO/service khác không đổi |
| 10, 30 | MỘT PHẦN / CHƯA | có 2 cờ; thiếu `tier` và cờ AI; không đổi |
| 16, 18, 19, 21, 22 | CHƯA (22: xấu hơn) | `menu.*` không đổi |
| 24 | MỘT PHẦN | Manager tạo Cashier/Barista bằng email đã có; còn lệch #26 (đếm tài khoản khoá) và mở khoá không kiểm hạn mức |
| 25 | MỘT PHẦN | không đổi |
| 26, 31, 32, 33, 35, 37, 39 | CHƯA | không có trong diff; seed không đổi nên #35 vẫn chỉ nhờ 11 đơn dựng tay ở 7.0b |
| 34 | CHƯA | `POST /stations` không đổi; `PATCH` mới cũng không bắt `P2002` (xem #27) |
| 36 | MỘT PHẦN | mã lỗi riêng đã có (#69); CHƯA chốt có cho nhiều màn gọi số mỗi chi nhánh không (vẫn thu hồi máy cũ) |
| 41 | ĐÃ (BE) | `GET …/option-groups/branch-states` có từ `0348c38`; web chưa dùng, đặc tả không đòi |

## 4. Mục mới phát hiện

| # | Mức | Việc cho BE | Căn cứ |
|---|---|---|---|
| 75 | **Trung bình** | **Đơn "tiền về sau QR hết hạn" (`REQUIRES_ATTENTION`, lý do `PAYMENT_RECEIVED_AFTER_EXPIRY`) không có đường xử lý**: xác nhận thủ công 409 `PAYMENT_ALREADY_SETTLED` (`counter-payment-settlement.service.ts:205`), huỷ đã trả 409 "Order has no received payment to refund" (`paid-order-refund.service.ts:136,142`), huỷ chưa trả 409 vì đơn không còn `CONFIRMED` (`counter-operations.service.ts:540`). Tiền đã nhận nhưng Manager không xác nhận cũng không hoàn được. Đề nghị cho `settle` nhận khoản `REQUIRES_ATTENTION` (nhận đủ → vào hàng đợi pha) và/hoặc `cancelPaidOrder` nhận khoản `REQUIRES_ATTENTION` (tạo khoản hoàn) | tài liệu #61, `PAYOS_EXPIRY_45_61.md` |
| 76 | Thấp | **`manager/reports` `payments[]` vẫn lẫn đơn `DINE_IN` v7** (phần còn lại của #47): lọc `po.type = 'COUNTER_PICKUP'`, bỏ nhánh `table_sessions` | `manager-reports.service.ts:78-98` |
| 77 | Thấp | **`markAmountMismatch` không ghi `attentionAt`/`attentionReason`** (phần còn lại của #65), và checkout không phát sự kiện (phần còn lại của #51) | `counter-payment-settlement.service.ts:166-171`, `counter-operations.controller.ts:52-58` |

## 5. Hợp đồng đổi làm VỠ hoặc làm sai web hiện tại

| Chỗ | Mức | Mô tả |
|---|---|---|
| #60 `PAYMENT_ALREADY_SETTLED` chuyển sang `error` | Hỏng nhẹ | Câu thông báo rơi về câu chung 409; chức năng và tải lại đơn vẫn chạy |
| #67 đơn đã trả thành `REQUIRES_ATTENTION` | Sai thông tin | `attention.ts` coi là lệch tiền (`unknown`, "Đã nhận —"); không crash |
| #69 mã lỗi thiết bị ở `code` thay cho câu | Không vỡ | web phân loại theo HTTP status; câu phân biệt chưa dùng được |
| #47 `settledAmount` nay là số sau hoàn | Đổi nghĩa nhãn | số hiển thị đúng với số ròng; nhãn cũ có thể gây hiểu nhầm |
| Enum `PaymentStatus` `EXPIRED`, `REQUIRES_ATTENTION` | Nhãn lạ | hiện "Khác (EXPIRED)" cho tới khi thêm nhãn |

Không có thay đổi nào làm trang trắng hoặc lỗi 4xx/5xx với các lời gọi hiện có.

## 6. Kiểm nhanh web trên BE mới (real, chặn ghi ở CDP, 0 request ghi tới BE)

| Khối | Kết quả | Ca trượt → phân loại |
|---|---|---|
| `phase7 orders` | 24/25 | "Lọc 'Đã huỷ' → đúng số đơn huỷ của BE (1)": **(b)** kỳ vọng script lỗi thời — BE có 3 đơn huỷ (1 chưa trả + 2 đã trả huỷ ở 7.6) |
| `phase7 detail` | 17/18 | "Quay lại giữ bộ lọc `?status=CANCELLED` và hiện 1 đơn": **(b)** cùng nguyên nhân (nay 3 đơn) |
| `phase7 report` | 12/14 | "Số liệu 7.0b: 11 đơn đã trả hôm đó": **(b)** BE nay trả `orderCount` 9 (#72, đúng yêu cầu); "Số đơn theo giờ": **(b)** cùng gốc (web đếm 12h = 8 đơn, 14h = 1 đơn → 9, không còn 11) |
| `phase7 attention` | 16/16 | — |
| `phase5 staff` | 36/36 | — |
| `phase8 board` | 12/12 | — |
| `phase58-faults manager` | lần 1: bị ngắt giữa chừng sau 4 ca (`CDP timeout: Runtime.evaluate`) → **(c)** hạ tầng; chạy lại 1 lần: 66/66 | — |

Không có ca nào thuộc **(a)** (BE đổi hợp đồng làm vỡ web). Tổng khối chạy: 7; đạt hoàn toàn 4 (attention, staff, board, faults); 3 khối trượt 5 ca, đều (b). Không sửa script trong lượt này.

## 7. Mã web trên `origin/main` (chỉ liệt kê, không merge)

| Commit | Tác giả | Ngày | Nội dung |
|---|---|---|---|
| `8b8a392` | BaoKhanh12333 | 11/10 | `Merge pull request #8 from tienlvse182969/feat/v9-orders` (merge của chính nhánh này ở một thời điểm trước) |
| `9399a35` | Vũ Hà Gia Bảo | 12/10 | `feat: manage branch display devices` — sửa `stations/{index,mapper,mock,real}.ts`, `Stations.tsx`, `types/station.ts` (nối #27/#28) |
| `d4a3c3c` | Vũ Hà Gia Bảo | 13/10 | `Revert "feat: manage branch display devices"` |

Nhánh `origin/feat/manager-display-management` ở `9399a35` (không có commit riêng ngoài trên). Hai commit này chưa nằm trong `feat/v9-orders`; lượt tới cần cân nhắc khi merge (cùng tệp `Stations.tsx`, `stations/*`), KHÔNG merge ở lượt này.
