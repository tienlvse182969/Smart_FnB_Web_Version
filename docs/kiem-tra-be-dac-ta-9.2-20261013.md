# Quét BE theo đặc tả 9.2 (13/10/2026) — lượt 7.8a, chỉ đọc

> **Phạm vi.** Đối chiếu `docs/Smart-FnB-Dac-ta-v9.2.md` với BE **`origin/main` `4b81e48`** (4 commit mới của Dang Quan sau `7d7f2dc`: áp phích OW-11, email duyệt hồ sơ). Quét bằng `git archive origin/main` giải nén ra thư mục tạm ngoài cây BE; KHÔNG pull, build, checkout hay gọi API ghi trên cây BE local. BỎ QUA toàn bộ AI (mục 9, OW-09, BR-37–BR-40).
> **Test BE:** chạy ngoài cây BE (sao chép + `prisma generate` + `tsc`, không DB, không mạng): danh sách của `pnpm test` = **148/148**; `payos-channel.test.mjs` 10 lần 0 trượt. Bộ e2e (`auth`, `branches`, `orders`, `branch-manager`, `display-posters`) và `scripts/test-manager.mjs`, `scripts/test-posters.mjs` cần PostgreSQL và tạo/xoá DB: KHÔNG chạy.
> **Quy ước.** Use case: ĐỦ / THIẾU PHẦN / CHƯA CÓ. Quy tắc: ĐẠT / MỘT PHẦN / CHƯA / KHÔNG KIỂM ĐƯỢC. Ưu tiên: **Chặn demo** = sai số tiền, lộ dữ liệu doanh nghiệp khác, luồng chính không chạy; **Nên có trước demo**; **Sau demo**. `file:dòng` ở cây `origin/main` `4b81e48`.

## 0. Tóm tắt

| Mục | Kết quả |
|---|---|
| Use case (32, trừ OW-09) | **ĐỦ 24 · THIẾU PHẦN 8 · CHƯA CÓ 0** |
| Quy tắc (49: BR-01…BR-53 trừ BR-37–40) | **ĐẠT 30 · MỘT PHẦN 12 · CHƯA 2 · KHÔNG KIỂM ĐƯỢC 5** (5 mục này thuộc client: BR-34, 42, 44, 47, 52) |
| **Chặn demo** | 1 (có điều kiện: demo chạy trên Render — #89) |
| **Nên có trước demo** | 15 mục (#81–#95) |
| Sau demo | 8 nhóm (#96) |
| Mới so với `7d7f2dc` | Áp phích OW-11 đã có API nhưng **lệch hợp đồng đặc tả 20.4** (#82); email duyệt hồ sơ gửi ngay (6.1) |

## 1. Use case

| Mã | Kết luận | Bằng chứng (file:dòng) | Ưu tiên | Web/mobile bị ảnh hưởng |
|---|---|---|---|---|
| CM-01 Đăng nhập, đăng xuất | ĐỦ | `auth.controller.ts` `login`, `refresh`, `logout`, `logout-all`, `me`; argon2id `password.service.ts:2-8` | — | — |
| CM-02 Hồ sơ, đổi mật khẩu | **THIẾU PHẦN** | chỉ `GET /auth/me`; không có endpoint đổi mật khẩu hay sửa hồ sơ (`grep change-password` rỗng) | Nên có (#95) | Web: nút đổi mật khẩu đang khoá; mobile |
| GU-01 Nộp hồ sơ | **THIẾU PHẦN** | `SubmitRegistrationApplicationDto` (`platform-admin.dto.ts:25-61`): `taxCode` tuỳ chọn, THIẾU "số chi nhánh dự kiến" (#9) | Sau demo (#96) | Web landing |
| PA-01 Xem hồ sơ | ĐỦ | `platform-admin.controller.ts:50,56` | — | — |
| PA-02 Duyệt hồ sơ | ĐỦ | `platform-admin.service.ts` `approve`: tạo chuỗi + Owner + gói + `emailOutbox`, `4b81e48` gửi email ngay; nhận diện mặc định tạo lười (GET trả mặc định) | — | — |
| PA-03 Từ chối | ĐỦ | `rejectionReason`, `reviewedById` (`:293-330`); không cảnh báo trùng MST (6.11) | Sau demo | Web admin |
| PA-04 Quản lý gói | **THIẾU PHẦN** | có `brandingEnabled`, `multiBranchComparisonEnabled`; THIẾU cờ trợ lý AI và `tier` (#30) | Sau demo (AI nhóm chưa chốt) | Web admin |
| PA-05 Quản lý doanh nghiệp | **THIẾU PHẦN** | gia hạn/đổi gói/tạm ngưng có sự kiện (`BusinessSubscriptionEvent`); hạ gói bị 409 khi vượt hạn mức (`platform-admin.service.ts:470`), trái BR-11 (#83); không email nhắc 7 ngày (#88) | Nên có | Web admin |
| OW-01 Chi nhánh | ĐỦ | `branches.controller.ts` CRUD, `status`, giờ mở/đóng; hạn mức `PLAN_LIMIT_REACHED` | — | — |
| OW-02 Danh mục, món | ĐỦ | `chain-menu.controller.ts` (OWNER); `allowBatching` | — | — |
| OW-03 Tuỳ chọn | ĐỦ | `option-groups`, `isDefault`, `branch-states` | — | — |
| OW-04 Gán món, bật/tắt chuỗi | ĐỦ | `items/:id/branches`, `items/:id/active` | — | — |
| OW-05 Quản lý Manager | ĐỦ | `employees.controller.ts` (managers, status, reset-password, branch) | — | — |
| OW-06 PayOS | ĐỦ | `payos-channel.controller.ts`; xác minh khoá, webhook theo kênh | — | — |
| OW-07 Nhận diện | **THIẾU PHẦN** | không chặn theo gói (`branding.service.ts:77` chỉ `assertCanManageChain`; cờ chỉ `select` ở `plan-quota.service.ts:30`); không kiểm tương phản ở BE (BR-43); `GET` branding thiếu `BARISTA` (`branding.controller.ts:51`) | Nên có (#84, #91) | Web Owner (tự khoá), mobile Barista |
| OW-08 Báo cáo đa chi nhánh | **THIẾU PHẦN** | `reports.controller.ts:33-70`: `revenue/comparison`, `timeseries`, `top-items`; KHÔNG có "theo hình thức thanh toán"; không danh sách khoản chờ hoàn (#78) | Nên có (#94, #78) | Web Owner |
| OW-10 Gói | ĐỦ | `chain-subscription.controller.ts` | — | — |
| OW-11 Áp phích | **THIẾU PHẦN** | có `display-posters.controller.ts` (GET/POST/PATCH/DELETE) nhưng lệch hợp đồng 20.4 (#82) | Nên có (#82) | Web Owner (chưa làm trang), mobile màn khách |
| BM-01 Nhân sự, quầy, màn hình khách | ĐỦ | `/manager/staff*`, `stations.controller.ts`, `GET/DELETE display-devices` | — | — |
| BM-02 Bật/tắt món, tuỳ chọn | ĐỦ | `/manager/menu-options`, `branches/:id/menu/items/:id`; Manager còn ghi được `isEnabled`, `remainingPortions` (#92) | Nên có (#92) | Web Manager |
| BM-03 Báo cáo chi nhánh | ĐỦ | `manager-reports.service.ts:82` (1 hàng CASH, khớp doanh thu) | — | — |
| BM-04 Tra cứu đơn | ĐỦ | `GET /manager/orders[/:id]` (sort, attention, refunds) | — | — |
| BM-05 Xác nhận chuyển khoản | ĐỦ | `payments.service.ts:144`; nhận cả khoản tiền về muộn | — | — |
| BM-06 Huỷ đơn đã trả | ĐỦ | `paid-order-refund.service.ts` (theo dòng, hao hụt, `refunds`, `complete`) | — | — |
| CS-01 Chọn món, chốt đơn | ĐỦ | `cashier/checkout`; kiểm lại ba điều kiện bán (`counter-operations.service.ts:1141`) | — | — |
| CS-02 Tiền mặt | ĐỦ | `collectCash` `:406` (khách đưa ≥ tổng, tiền thối, thu ngân) | — | — |
| CS-03 Thu QR | **THIẾU PHẦN** | tạo QR 10 phút, `recheck`, `cancel` có; KHÔNG huỷ QR khi chuyển sang tiền mặt (BR-30, #81) | Nên có (#81) | Mobile POS |
| CS-04 In bill, phiếu số | ĐỦ | `receipt`, `reprint` lý do ≥ 3 (`:639`) → `PrintJob` | — | — |
| CS-05 Lịch sử đơn trong ngày | ĐỦ | `GET cashier/orders`, `receipt` | — | — |
| BA-01 Hàng đợi (gom món) | ĐỦ | `baristaQueue`, `maxBatchSize = 4`, cửa sổ 5 phút | — | — |
| BA-02 Trạng thái từng món | ĐỦ | `batches/start`, `units/:id/start|complete|undo`, `orders/:id/deliver` | — | — |
| BA-03 Báo hết món | ĐỦ | `menu-items|menu-options/:id/availability` → `REQUIRES_ATTENTION` | — | — |

## 2. Quy tắc BR-01…BR-53 (trừ BR-37–40)

| BR | Kết luận | Bằng chứng (file:dòng) | Test BE | Ưu tiên | Ảnh hưởng |
|---|---|---|---|---|---|
| 01 Lọc theo doanh nghiệp | MỘT PHẦN | dịch vụ lọc theo token/`chainId` (`branch-access.service.ts:101-130`); webhook kiểm `chainId` kênh (`payos-payment.service.ts:165-178`); phòng Socket.IO theo `branch:`/`chain:`/`station:` (`realtime.gateway.ts:356-369`). KHÔNG đạt "không ngoại lệ": `GET /public/restaurant-chains`, `/public/branches*` liệt kê mọi doanh nghiệp (`public-branches.controller.ts:22`) | 2 ca đơn lẻ (`branches.service.test.mjs:45`, `owner-features.test.mjs:622`); không có ca Socket.IO | Nên có (#90, #93) | Web/mobile (lộ danh sách) |
| 02 Phạm vi chi nhánh | ĐẠT | `managerActor`/`employee()` lấy chi nhánh từ token; `findFirst({branchId})` | `branches.service.test.mjs:45` | — | — |
| 03 Owner chỉ qua duyệt | ĐẠT | `approve` là đường duy nhất tạo Owner (`platform-admin.service.ts`) | — | — | — |
| 04 Từ chối có lý do | ĐẠT | `rejectionReason` bắt buộc `:293` | — | — | — |
| 05 Tầng nào tạo tầng đó | ĐẠT | `auth.controller.ts:38-60` (Owner chỉ MANAGER); `/manager/staff` chỉ CASHIER/BARISTA | — | — | — |
| 06 Audit log | **MỘT PHẦN** | CÓ: huỷ đơn đã trả, xác nhận tay, hoàn xong (`writeBranchAudit`), khoá/đổi nhân viên của Manager, PayOS (`payosChannelAuditLog`), gia hạn/đổi gói/tạm ngưng/duyệt/từ chối (`businessSubscriptionEvent`, `reviewedById`). THIẾU: đổi giá món/tuỳ chọn, đổi quyền/khoá/đổi chi nhánh của Manager do Owner (`employees.service.ts`), đổi nhận diện, thêm/đổi/xoá áp phích; in lại chỉ là `PrintJob` | — | Nên có (#85) | Web Owner (màn nhật ký đã chốt xoá, nhưng BR-06 vẫn đòi dữ liệu) |
| 07 Admin chỉ số liệu tổng hợp | ĐẠT | `getBusinessUsageCounts`; ví đã bỏ (7.7a) | — | — | — |
| 08 Chặn hạn mức/tính năng | **MỘT PHẦN** | hạn mức: `PLAN_LIMIT_REACHED` (`plan-quota.service.ts:144`, `manager-staff.service.ts:160`, `employees.service.ts:84`). Tính năng gói: không nơi nào kiểm `brandingEnabled`/`multiBranchComparisonEnabled` (#33) | — | Nên có (#84) | Web Owner |
| 09 Hết hạn chỉ đọc | ĐẠT | `assertSubscriptionAllowsWrite` (`branch-access.service.ts:65`) ở tạo nháp, sửa dòng, chốt, `finalize`, tiền mặt, QR, quầy; `assertCanManageChain` `:101` ở mọi ghi của Owner; pha/gọi số không chặn; xác nhận tay và hoàn tiền cố ý không chặn (QĐ 122) | `owner-features.test.mjs` | — | — |
| 10 Chỉ Admin gia hạn | ĐẠT | `platform-admin.controller.ts:124-157` (`@Roles(ADMIN)`) | — | — | — |
| 11 Hạ gói không xoá | **CHƯA** | `changeSubscriptionPlan` ném 409 khi `usage > target` kể cả `tableCount` (v7) (`platform-admin.service.ts:470`); BR-11 đòi hạ được và chỉ chặn tạo mới | — | Nên có (#83) | Web Admin (hộp "Đổi gói" báo 409) |
| 12 Ba điều kiện bán | **MỘT PHẦN** | `priceCartItem` kiểm `isEnabled ∧ isAvailable ∧ isActive` (`:1141`); nhưng Manager ghi được `isEnabled` qua `PATCH /branches/:id/menu/items/:id` (`menu.dto.ts:216`, #37) | `counter-operations.service.test.mjs` | Nên có (#92) | Web Manager |
| 13 Một giá toàn chuỗi | ĐẠT | giá ở `menu_items`/`menu_options` cấp chuỗi | — | — | — |
| 14 Quy tắc chọn nhóm | ĐẠT | min/max kiểm lại lúc chốt (`:1141-1170`) | có | — | — |
| 15 Giá lúc bán | ĐẠT | `selectedOptions` snapshot, `itemName`, `unitPrice` | có | — | — |
| 16 Chặn món đã tắt | ĐẠT | `priceCartItem` chạy ở cả `addItem` lẫn `checkout` | có | — | — |
| 17 Chưa trả chưa pha | ĐẠT | đơn vị pha tạo ở `settle`; `baristaQueue` lọc `paymentStatus = PAID` | có | — | — |
| 18 Sau trả chỉ Manager huỷ | ĐẠT | `branch-manager.controller.ts:183` (`@Roles(MANAGER)`) | `paid-order-refund.test.mjs` | — | — |
| 19 Tổng ở BE, số nguyên | **MỘT PHẦN** | tổng tính ở BE (`checkout`); tiền `Decimal(14,2)` và DTO nhận 2 chữ số thập phân, không ép số nguyên (#21) | — | Sau demo (#96) | — |
| 20 Tiền mặt | ĐẠT | `collectCash`: `tendered ≥ total`, `changeAmount` | có | — | — |
| 21 In không chặn thanh toán | **MỘT PHẦN** | `PrintJob` chỉ ghi lượt in; không chặn thanh toán ✓; không có endpoint báo "In thất bại" (trạng thái 5.10 chỉ ở client) | — | Sau demo (#96) | Mobile POS |
| 22 Số gọi | ĐẠT | `BranchDailySequence` theo `branch.timezone` (`counter-payment-settlement.service.ts:357`), cấp lúc trả, tăng dần, reset mỗi ngày | có | — | — |
| 23 Không hoàn tiền tự động | ĐẠT | chỉ ghi `refunds`; không gọi PayOS hoàn | có | — | — |
| 24 Nền tảng không giữ tiền | ĐẠT | QR từ kênh PayOS của chuỗi (`payos-payment.service.ts` `channel`) | — | — | — |
| 25 Khoá PayOS | ĐẠT | AES-256-GCM (`payos-cipher.service.ts:15`); phản hồi chỉ `…Last4`; không log khoá | `payos-channel.test.mjs` | — | — |
| 26 QR | ĐẠT | `orderCode`, `amount`, hạn 10 phút (`:106`), tái dùng QR còn hạn | có | — | — |
| 27 Webhook | ĐẠT | chữ ký theo kênh (`:165`), idempotent theo `idempotencyKey`, khoá advisory; **chưa có test trùng/đồng thời** (#58/#74) | không | (#93) | — |
| 28 Lệch số tiền | ĐẠT | `markAmountMismatch` + `attentionAt` (7d7f2dc) | có | — | — |
| 29 Xác nhận tay chỉ Manager | ĐẠT | `payments.controller.ts:94` `@Roles(MANAGER)`; Cashier chỉ `recheck` | có | — | — |
| 30 QR hết hạn, đổi tiền mặt | **MỘT PHẦN** | job đánh dấu khoản `EXPIRED` nhưng KHÔNG huỷ đơn (spec: huỷ QR và huỷ đơn); chuyển sang tiền mặt và sửa đơn KHÔNG huỷ QR bên PayOS (`collectCash` `:406` và `cancelUnpaid` `:530` không gọi `payos-api.cancelPayment`) → tiền về sau khi đã trả tiền mặt rơi vào `FAILED` không khoản hoàn | `payment-expiry.worker.test.mjs` | **Nên có (#81)** | Mobile POS, web Manager |
| 31 Webhook sau huỷ | ĐẠT | `recordLatePayosPayment` → khoản hoàn `PENDING` + cảnh báo (7.6); spec còn nêu "xác nhận để pha" — BE chọn hoàn | `paid-order-refund.test.mjs` | — | — |
| 32 Hàng đợi theo chi nhánh | ĐẠT | `baristaQueue` lọc `branchId`, `COUNTER_PICKUP`, `PAID` | — | — | — |
| 33 Gọi số khi mọi dòng xong | ĐẠT | `deriveOrderStatus` (`paid-order-refund.service.ts`, `counter-operations.service.ts`) | có | — | — |
| 34 Gom món không chờ thêm | KHÔNG KIỂM ĐƯỢC | thuật toán (mục 8) chưa đọc kỹ ở lượt này; có ca trong `counter-operations.service.test.mjs` | có | — | — |
| 35 Một mẻ một pha chế | ĐẠT | 409 "already claimed by another barista" (`counter-operations.service.ts:816`), khoá hàng | có | — | — |
| 36 Hết món | ĐẠT | `PAID_*_OUT_OF_STOCK`, sự kiện attention (7.7a) | có | — | — |
| 41 Nhận diện theo doanh nghiệp | MỘT PHẦN | thuộc chuỗi ✓; "chỉ áp từ gói Tiêu chuẩn" không ép (#84); `GET` thiếu `BARISTA` (#91) | — | Nên có (#84, #91) | Mobile Barista |
| 42 Màu ngữ nghĩa cố định | KHÔNG KIỂM ĐƯỢC | thuộc client | — | — | — |
| 43 Tương phản khi lưu | **CHƯA** | không có tính tương phản ở BE (`grep contrast` rỗng); web tự chọn màu chữ | — | Sau demo (#96) | — |
| 44 Admin giữ nhận diện nền tảng | KHÔNG KIỂM ĐƯỢC | thuộc client | — | — | — |
| 45 Ghép OTP | **MỘT PHẦN** | OTP 6 số `randomInt`, hash, 5 phút, một lần, thiết bị cũ bị thu hồi (`stations.service.ts:138-160,346-420`). THIẾU: sai 5 lần khoá 5 phút + audit (6.11); giới hạn 10 mã/phút/IP chỉ ở bộ nhớ một tiến trình (`:476`, mất khi khởi động lại, không dùng chung nhiều instance) | `stations.service.test.mjs` (giới hạn tạo mã) | Nên có (#86) | Mobile POS |
| 46 Giỏ chỉ chuyển tiếp | MỘT PHẦN | `cart:update` ghi `cartSnapshot` vào DB (`realtime.gateway.ts:244`) trái "không ghi cơ sở dữ liệu" (#55, BE cố ý) | `realtime.gateway.test.mjs` | Sau demo (#96) | Mobile |
| 47 POS tự hiện QR khi mất kết nối | KHÔNG KIỂM ĐƯỢC | thuộc client | — | — | — |
| 48 Sự kiện giỏ chỉ từ thu ngân | MỘT PHẦN | chỉ `CASHIER` có `employeeId` và quầy ACTIVE cùng chi nhánh (`realtime.gateway.ts:212`); KHÔNG ràng buộc "thu ngân đã chọn đúng quầy đó" và KHÔNG ghi log bảo mật khi từ chối (chỉ ném `WsException`) | `realtime.gateway.test.mjs` | Sau demo (#96) | Mobile |
| 49 Trạng thái hoàn | ĐẠT | tiền mặt `COMPLETED`, chuyển khoản `PENDING` → Owner/Manager `complete` (`payments.controller.ts:116`); hao hụt `isWastage`. Danh sách cho Owner: #78 | `paid-order-refund.test.mjs` | (#78) | Web Owner |
| 50 Trừ doanh thu ngày huỷ | ĐẠT | `cancellation_date` (7.6) | — | — | — |
| 51 Áp phích: giới hạn | **MỘT PHẦN** | Owner-only ✓, kiểm chữ ký tệp ✓, 5 MB ✓, khoá chỉ đọc ✓ (`assertCanManageChain`). LỆCH: tối đa **10** (`display-posters.service.ts:17`, spec 6); tên 1–120 (spec ≤ 50, `display-poster.dto.ts`); không audit; không thu nhỏ ảnh | `display-posters.e2e.test.mjs` (cần DB) | Nên có (#82) | Web Owner, mobile |
| 52 Áp phích không che đơn | KHÔNG KIỂM ĐƯỢC | thuộc màn hình khách; BE chỉ trả `posters` ở `public/customer-display/context` | — | — | — |
| 53 Bill từ backend, in lại có lý do | ĐẠT | `receipt` từ dữ liệu đơn; `reprint` lý do ≥ 3, ghi `printedById`, `branchId`, thời điểm, `isReprint` (`:639`) | — | — | — |

## 3. Luồng mục 6

| Luồng | Kết luận | Chi tiết | Ưu tiên |
|---|---|---|---|
| 6.1 Onboarding | THIẾU PHẦN | nộp hồ sơ ✓, duyệt sinh doanh nghiệp + Owner + gói + email thiết lập (`4b81e48` gửi ngay) ✓, từ chối có lý do ✓. THIẾU: cảnh báo trùng mã số thuế; "số chi nhánh dự kiến"; nhận diện mặc định chỉ tạo lười | Sau demo (#96) |
| 6.5 Sửa và huỷ đơn | THIẾU PHẦN | huỷ chưa trả ✓, huỷ QR ✓ (endpoint riêng); "Sửa đơn" = POS tự ghép `payos/cancel` + `cancel` + `checkout` (BE không có thao tác gộp); huỷ sau trả ✓; Owner chưa có danh sách chờ hoàn (#78) | Nên có (#81, #78) |
| 6.8 Gói | THIẾU PHẦN | gia hạn mở lại ngay ✓; hết hạn chỉ đọc ✓; **không có email nhắc trước 7 ngày** (không có job nào ngoài `payment-expiry.worker.ts`); hạ gói bị chặn (#83) | Nên có (#88, #83) |
| 6.11 Các luồng phụ (trừ AI) | THIẾU PHẦN | xem bảng dưới | — |
| 6.12 In bill | THIẾU PHẦN | dữ liệu bill + in lại ghi log ✓; không có API báo In thất bại | Sau demo |
| 6.13 Áp phích | THIẾU PHẦN | API khác hợp đồng (#82); không sự kiện `display.update`; app tải lại mỗi 60 giây (`docs/display-posters.md`) | Nên có |

Bảng 6.11 (các dòng có phát hiện):

| Tình huống | BE | Ưu tiên |
|---|---|---|
| Đổi từ QR sang tiền mặt: BE huỷ QR trước | **CHƯA** (`collectCash` không đụng khoản PayOS đang chờ) | Nên có (#81) |
| QR hết hạn: huỷ QR và huỷ đơn | MỘT PHẦN (khoản `EXPIRED`; đơn vẫn `CONFIRMED`; QR bên PayOS không bị huỷ) | Nên có (#81) |
| Tiền về sau khi đơn huỷ do hết hạn: "xác nhận để pha hoặc hoàn" | MỘT PHẦN (BE chỉ hoàn; xác nhận để pha chỉ khi đơn chưa huỷ — `markLateExpiredPayment`) | Sau demo |
| Webhook sai chữ ký: bỏ qua, ghi log bảo mật | MỘT PHẦN (từ chối 401, KHÔNG ghi log, `payos-payment.service.ts:165`) | Sau demo |
| Khách không tới nhận: sau 30 phút tự Hoàn tất | **CHƯA** (không có job) | Nên có (#87) |
| Sai OTP 5 lần: khoá 5 phút + audit | **CHƯA** | Nên có (#86) |
| Khoá PayOS sai: liên kết sang Lỗi, cảnh báo Owner | MỘT PHẦN (trạng thái `ERROR` ✓; không cảnh báo Owner) | Sau demo |
| Hồ sơ trùng MST: cảnh báo Admin | **CHƯA** | Sau demo |
| Chọn màu quá nhạt: tự đổi màu chữ | CHƯA ở BE (web làm) | Sau demo |
| Hết hạn khi đang bán | ĐẠT | — |
| Hai pha chế cùng bấm Bắt đầu | ĐẠT | — |
| Webhook về hai lần | ĐẠT (test trùng song song còn thiếu) | (#93) |
| Màn hình khách bị mất: Manager thu hồi | ĐẠT (`DELETE display-devices`, ngắt socket, `device.revoked`) | — |
| Áp phích sai định dạng/5 MB/đủ số lượng | MỘT PHẦN (kiểm ở BE ✓, giới hạn 10 thay vì 6) | Nên có (#82) |
| Thiếu máy in / Bluetooth / ảnh bill | ngoài BE | — |

## 4. Yêu cầu phi chức năng (mục 18)

| Yêu cầu | Kết luận | Chi tiết | Ưu tiên |
|---|---|---|---|
| Cô lập dữ liệu: 100% ca chéo bị chặn (API, Socket.IO) | **MỘT PHẦN** | chỉ 2 ca đơn vị; bộ e2e cần DB (không chạy được ở lượt này); KHÔNG có ca Socket.IO chéo doanh nghiệp | Nên có (#93) |
| Khoá PayOS AES-256-GCM, không lộ API/log | ĐẠT | `payos-cipher.service.ts:15`; phản hồi chỉ `Last4` | — |
| Mật khẩu băm | ĐẠT | **argon2id** (`password.service.ts`), mạnh hơn bcrypt đặc tả ghi; cần sửa chữ "bcrypt" trong đặc tả | — |
| Token có hạn, thu hồi được | ĐẠT | access 900 giây, refresh 7 ngày (`environment.validation.ts:9-10`); token thiết bị 30 ngày, thu hồi + ngắt socket | — |
| Webhook trùng/đồng thời không cấp hai số gọi | MỘT PHẦN | cơ chế đủ (khoá hàng, khoá advisory, `ReadCommitted`); KHÔNG có test trùng/song song trong bộ chạy được (BE nói đã kiểm tay ở DB tạm) | Nên có (#93) |
| Hiệu năng (≤ 1 s, ≤ 3 s, ≤ 300 ms…) | KHÔNG KIỂM ĐƯỢC | không có script đo | Sau demo (trước bảo vệ) |
| Tải: 10 chi nhánh × 2 quầy × 15 phút | **CHƯA** | không có script tải (`scripts/` chỉ có `test-manager`, `test-posters`, từ điển CSDL) | Sau demo (trước bảo vệ) (#93) |
| Đăng nhập: chống dò mật khẩu | CHƯA | không có giới hạn tần suất hay khoá tài khoản ở `auth` (chỉ có ở ghép OTP và theo dõi đơn) | Nên có (#86) |
| Tự nối lại ≤ 10 giây | ngoài BE | — | — |

## 5. Rủi ro vận hành

| Rủi ro | Chi tiết | Ưu tiên | Ảnh hưởng |
|---|---|---|---|
| Render gói **free** | `render.yaml:5` `plan: free`: máy ngủ sau thời gian không dùng, khởi động lạnh chậm, không có `numInstances` | **Chặn demo nếu demo trên Render** (#89) | Mọi client: lần gọi đầu timeout, socket mất |
| **Tệp tải lên mất khi khởi động lại** | logo (`branding-upload.ts:6`) và áp phích lưu ở `uploads/` trên ổ đĩa tiến trình; `render.yaml` không khai báo đĩa bền (`UPLOAD_DIR`); Docker local có volume | **Chặn demo nếu demo trên Render** (#89) | Web Owner (logo/áp phích biến mất), mobile |
| Tài khoản Admin lúc triển khai | `render:start` chỉ chạy migration; Admin chỉ sinh khi chạy `prisma db seed` với `SEED_ADMIN_*` (README:139); `RUN_DEMO_SEED=false` mặc định | Chặn demo nếu CSDL Render trống (#89) | Web: không đăng nhập được |
| Nhiều instance | Socket.IO KHÔNG có adapter Redis (`socket-io.adapter.ts` chỉ `IoAdapter`): phòng và sự kiện chỉ trong một tiến trình; bộ đếm chống dò mã và theo dõi đơn nằm trong RAM | Sau demo (chạy một instance là đủ) | — |
| Job hết hạn QR | `payment-expiry.worker.ts` chạy trong tiến trình, an toàn nhiều instance (khoá hàng) | — | — |
| Biến môi trường production bắt buộc | `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `REALTIME_CORS_ORIGINS`, `PUBLIC_WEB_URL` (HTTPS), `ORDER_TRACKING_SECRET` (≥ 32 ký tự); cần cho tính năng: `PAYOS_MASTER_KEY` (32 byte base64), `PAYOS_WEBHOOK_BASE_URL`, `EMAIL_API_KEY` + `EMAIL_FROM` (cùng nhau); tuỳ chọn: `RUN_DEMO_SEED`, `UPLOAD_DIR`, `PAYMENT_EXPIRY_JOB_*`, `SEED_ADMIN_*`, `FRONTEND_URL` (bí danh `PUBLIC_WEB_URL`), `RESEND_API_KEY` (bí danh `EMAIL_API_KEY`). Swagger mặc định TẮT ở production nhưng `render.yaml` đặt `SWAGGER_ENABLED=true` | Nên có: tắt Swagger khi demo công khai | — |
| Route v7 còn truy cập được | `waiter/*`, `kitchen/*`, `attendance`, `reservations`, `tables`, `invoices`, `users`; role `WAITER`, `KITCHEN` | Sau demo (#96) | — |

## 6. Tin nhắn gửi BE

> Số tiếp từ #80 (lớn nhất trong `api-contract-plan.md`). Mục đã có và còn mở giữ nguyên: **#78** (danh sách khoản chờ hoàn cho Owner), **#58/#74** (test webhook trùng/đua), **#51/#52** (kiểm thật), **#37/#22** (nhắc lại ở #92).
> Mục #79 (API áp phích) đã được BE làm nhưng lệch hợp đồng: thay bằng **#82**.

### Nên có trước demo

| # | Việc | Vì sao | file:dòng |
|---|---|---|---|
| 81 | Huỷ QR bên PayOS khi thu tiền mặt, huỷ đơn chưa trả, hoặc QR hết hạn; khi QR hết hạn thì huỷ cả đơn (BR-30). Webhook về cho đơn đã trả tiền mặt (hiện `FAILED`, không khoản hoàn) phải tạo khoản hoàn `PENDING` + cảnh báo Manager | Khách quét QR rồi thu ngân đổi sang tiền mặt: tiền về mà hệ thống không ghi nhận | `counter-operations.service.ts:406` (`collectCash`), `:530` (`cancelUnpaid`), `payos-payment.service.ts:246,365`, `payment-expiry.worker.ts` |
| 82 | Áp phích theo đúng 20.4: đường dẫn `/posters` (hoặc xác nhận giữ `/display-posters` và cập nhật đặc tả), tối đa **6**, tên ≤ **50**, nhận `title` khi tải lên, `POST /posters/{id}/image` đổi ảnh, `PUT /posters/order {ids}`, phát `display.update` tới mọi quầy của chuỗi, audit log (thêm/đổi/xoá), thu ảnh ≤ 1920 điểm; `durationSeconds` của BE chỉ giữ nếu cập nhật đặc tả (cố định 8 giây) | Web Owner dựng trang theo hợp đồng; màn khách hiện chờ 60 giây mới thấy thay đổi | `display-posters.controller.ts`, `display-posters.service.ts:17`, `display-poster.dto.ts` |
| 83 | Hạ gói không chặn: bỏ 409 khi vượt hạn mức (và bỏ `tableCount` v7), chỉ chặn tạo mới tới khi về trong hạn mức (BR-11) | Demo 6.8 "Đổi gói" hạ gói bị 409 | `platform-admin.service.ts:470` |
| 84 | Thi hành cờ gói ở BE: chặn `PUT/POST/DELETE branding` khi `brandingEnabled = false`, chặn `revenue/comparison` khi `multiBranchComparisonEnabled = false`; gói Cơ bản `GET branding` luôn trả bộ mặc định (BR-08, BR-41) | Gói Cơ bản vẫn lưu được nhận diện qua API | `plan-quota.service.ts:30`, `branding.service.ts:77`, `reports.controller.ts:33` |
| 85 | Audit log đủ danh sách BR-06: đổi giá món/tuỳ chọn, Owner khoá/đổi chi nhánh Manager, đổi/gỡ nhận diện, áp phích, in lại (ghi vào bảng audit, không chỉ `PrintJob`) | BR-06 là điều khoản kiểm tra khi bảo vệ | `menu.service.ts:376`, `employees.service.ts`, `branding.service.ts:77` |
| 86 | Khoá ghép OTP sai 5 lần liên tiếp 5 phút theo quầy + audit (BR-45); đếm lưu CSDL hoặc Redis thay vì RAM; giới hạn tần suất đăng nhập | Dò mã 6 chữ số không bị giới hạn ở nhập mã | `stations.service.ts:346-420,476`, `auth.service.ts` |
| 87 | Job tự chuyển đơn `READY` sang hoàn tất sau 30 phút (6.11), gỡ số khỏi màn hình gọi số | Màn gọi số đầy số cũ khi thu ngân/pha chế quên bấm giao | (không có job); mẫu: `payment-expiry.worker.ts` |
| 88 | Email nhắc Owner trước hạn 7 ngày (6.8) | Đặc tả ghi rõ; web đã có dải trong ứng dụng (QĐ 134) | (chưa có) |
| 89 | Vận hành Render: gắn đĩa bền hoặc lưu trữ đối tượng cho `UPLOAD_DIR`; tài liệu/lệnh tạo Admin lần đầu không cần seed demo; đặt gói trả phí hoặc tăng nhịp giữ máy thức cho ngày demo; tắt Swagger công khai | Logo, áp phích mất sau mỗi lần khởi động lại; DB trống thì không có tài khoản nào | `render.yaml:5`, `branding-upload.ts:6`, README:139 |
| 90 | Gỡ hoặc hạn chế `GET /public/restaurant-chains`, `/public/branches`, `/public/branches/:id` (v7, liệt kê mọi doanh nghiệp) | BR-01 "không ngoại lệ"; lộ danh sách khách hàng của nền tảng | `public-branches.controller.ts:22` |
| 91 | Cho `BARISTA` đọc `GET /restaurant-chains/:id/branding` (hiện có `WAITER`, `KITCHEN` v7) | App pha chế không nhận được nhận diện (BR-41) | `branding.controller.ts:51` |
| 92 | Manager chỉ gửi `isAvailable`; `isEnabled` và `remainingPortions` (v7, đặc tả bỏ kho) gửi lên thì 403; bỏ `reservePortions` ở `checkout` | BR-12; đơn bị chặn "không đủ suất" ở quán không quản lý kho | `menu.dto.ts:216-230`, `counter-operations.service.ts:1204` |
| 93 | Test chạy được không cần DB: truy cập chéo doanh nghiệp (API + Socket.IO), webhook trùng/đồng thời, đua huỷ/xác nhận; script tải 10 × 2 quầy 15 phút | NFR mục 18 đòi 100% ca chéo bị chặn và số liệu đo | `test/`, `scripts/` |
| 94 | Báo cáo Owner theo hình thức thanh toán (trên `reports/revenue/*`), kèm đơn huỷ/hoàn (OW-08) | Owner không thấy "theo hình thức"; Manager có | `reports.controller.ts:33-70` |
| 95 | Đổi mật khẩu (`POST /auth/change-password` hoặc `PATCH /auth/me/password`) và cập nhật hồ sơ (CM-02) | Nút web đang khoá | `auth.controller.ts:140` |

### Chặn demo

| # | Việc | Vì sao | file:dòng |
|---|---|---|---|
| 89 | (như trên) — chỉ chặn khi demo chạy trên Render | CSDL trống không có Admin; logo/áp phích mất sau khi máy ngủ hoặc triển khai lại | `render.yaml:5`, `branding-upload.ts:6` |

### Sau demo

| # | Việc | file:dòng |
|---|---|---|
| 96 | (a) Gỡ route/role v7 (`waiter/*`, `kitchen/*`, `attendance`, `reservations`, `tables`, `invoices`, `users`); (b) tiền số nguyên đồng (BR-19, #21); (c) ghi log bảo mật khi webhook sai chữ ký (6.11); (d) kiểm tương phản màu chữ ở BE (BR-43); (e) GU-01 thêm số chi nhánh dự kiến và cảnh báo trùng MST (#9); (f) endpoint báo In thất bại (BR-21); (g) ràng buộc "thu ngân đã chọn đúng quầy" và log từ chối ở sự kiện giỏ (BR-48), bỏ ghi `cartSnapshot` vào DB hoặc ghi vào đặc tả (BR-46, #55); (h) Socket.IO adapter Redis nếu chạy nhiều instance; (i) cảnh báo Owner khi khoá PayOS lỗi | các mục nêu ở bảng 2–5 |

## 7. Phụ lục: những gì đã kiểm

| Hạng mục | Cách kiểm |
|---|---|
| Route và vai trò | liệt kê `@Controller`/`@Roles`/`@Public` của toàn bộ `src/**/*.controller.ts` ở `origin/main` |
| Quy tắc | đọc mã dịch vụ (`counter-operations`, `payments`, `payos`, `stations`, `realtime`, `platform-admin`, `branches`, `branding`, `menu`) + `git diff 7d7f2dc origin/main` |
| Test | 148/148 (danh sách `pnpm test`, ngoài cây BE); e2e và script tạo DB: không chạy |
| Không kiểm | thuật toán gom món chi tiết (BR-34), hành vi client (BR-42, 44, 47, 52), hiệu năng |
