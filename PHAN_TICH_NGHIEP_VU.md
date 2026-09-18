# Phân tích nghiệp vụ & Hiện trạng Cài đặt — Smart FnB (đối chiếu Đặc tả v7)

> Tài liệu này mô tả **hiện trạng thật của mã nguồn** tại thời điểm rà soát, đối chiếu với `Smart-FnB-Dac-ta-v7 (1).md` (bản đặc tả duy nhất đang hiệu lực). Không còn so sánh với bất kỳ bản "v2" nào trước đó — mọi tham chiếu như vậy đã lỗi thời và bị bỏ khỏi tài liệu này.
>
> Trạng thái mỗi use case được xác nhận bằng cách đọc trực tiếp file cài đặt tương ứng trong `src/`, không suy đoán từ tên biến hay comment.

---

## 1. Kiến trúc hiện tại

Frontend-only: React 19 + TypeScript + Vite + Tailwind v4 + Ant Design v6 + Zustand (`src/store/index.ts`) + React Router v7. **Không có backend thật** — toàn bộ "API" là các hàm `async` trong `src/services/*.ts` (delay giả lập mạng 150–300ms) đọc/ghi trực tiếp vào một in-memory database duy nhất (`src/mock/db.ts`, seed ở `src/mock/seed.ts`). Đồng bộ nhiều tab qua `BroadcastChannel` (`src/store/broadcast.ts`). Vì không có backend, các ràng buộc "phải chặn ở backend" trong đặc tả (BR-13, BR-21, BR-23...) được hiện thực bằng các hàm `assert*` chạy ngay trong tầng service (`src/services/_guard.ts` và các file service riêng) — không chỉ ẩn nút ở UI.

---

## 2. Bảng đối chiếu theo mã use case (mục 13 đặc tả v7)

Chú thích trạng thái: **Đã làm** = có service/UI thật, chạy được end-to-end trên dữ liệu mock. **Mock** = có UI/dữ liệu hiển thị nhưng không có luồng thao tác thật, hoặc trả lời giả lập không nối "AI thật". **Chưa làm** = không có trong code.

### 2.1 Prospective Owner

| Mã | Use case | Trạng thái | Ghi chú |
|---|---|---|---|
| GU-01 | Nộp hồ sơ đăng ký Owner | Đã làm | `tenant.service.ts#submitRegistration`, UI ở `src/components/landing/` |

### 2.2 Platform Admin

| Mã | Use case | Trạng thái | Ghi chú |
|---|---|---|---|
| PA-01 | Xem/tìm hồ sơ chờ duyệt | Đã làm | `tenant.service.ts#listRegistrations`, UI `SignupRequests.tsx` |
| PA-02 | Duyệt hồ sơ (sinh tenant, branding mặc định, tài khoản Owner) | Đã làm | `tenant.service.ts#approveRegistration` — ví không cần khởi tạo riêng vì số dư luôn tính từ sổ cái (BR-34) |
| PA-03 | Từ chối hồ sơ, ghi lý do | Đã làm | `tenant.service.ts#rejectRegistration` (bắt buộc `rejectReason`, BR-04) |
| PA-04 | Xem danh sách/hồ sơ doanh nghiệp | Đã làm | `TenantsTable.tsx` + `listTenants` |
| PA-05 | Quản lý gói dịch vụ và hạn mức | Đã làm | `tenant.service.ts#createPlan/updatePlan`, UI `PlansTable.tsx` |
| PA-06 | Gia hạn, nâng/hạ gói, tạm ngưng, kích hoạt lại | Đã làm | `renewTenant`, `changeTenantPlan`, `setTenantStatus` |
| PA-07 | Đặt lại mật khẩu cho Owner | Đã làm | `auth.service.ts#resetPassword` |
| PA-09 | Cấu hình phí dịch vụ, thời gian tạm giữ, mức rút tối thiểu | Đã làm | `tenant.service.ts#updatePlatformConfig`, UI `PlatformSettings.tsx` |
| PA-10 | Duyệt/từ chối/xác nhận đã chuyển yêu cầu rút | Đã làm | `wallet.service.ts#approveWithdrawalRequest/rejectWithdrawalRequest/markWithdrawalPaid`, UI `Withdrawals.tsx` |
| PA-08 (GĐ2) | Xem audit log hệ thống | Mock/GĐ2 | Màn `AuditLog.tsx` có thật và đọc `db.auditLog` thật, nhưng ẩn khỏi nav bằng `FEATURE_FLAGS.auditLog = false` (`src/config.ts`) — xem mục 4 |
| PA-11 (GĐ2) | Xử lý giao dịch lệch, bút toán điều chỉnh | Chưa làm | Không có hàm nào trong `wallet.service.ts` cho loại bút toán "điều chỉnh" |

### 2.3 Owner

| Mã | Use case | Trạng thái | Ghi chú |
|---|---|---|---|
| OW-01 | Quản lý chi nhánh | Đã làm | `branch.service.ts#createBranch/updateBranch` (chặn vượt `maxBranches` — BR-23), UI `Branches.tsx` |
| OW-02 | Quản lý danh mục & món toàn chuỗi | Đã làm | `menu.service.ts#createMenuItem/updateMenuItem`, UI `MenuTable.tsx` |
| OW-04 | Gán món cho chi nhánh, bật/tắt cấp chuỗi | Đã làm | `menu.service.ts#setMenuItemPresence`, `activeChain` trên `MenuItem` |
| OW-05 | Quản lý tài khoản Branch Manager | Đã làm | `owner.service.ts#createManagerAccount`, UI `ManagerAccounts.tsx` |
| OW-06 | Chuyển Branch Manager sang chi nhánh khác | Đã làm | `auth.service.ts#reassignAccountBranch` |
| OW-07 | Dashboard so sánh doanh thu đa chi nhánh | **Mock** | `src/roles/owner/Kpis.tsx` và `RevenueChart.tsx` đọc từ `src/data.ts` (dữ liệu giả tính sẵn thời kỳ chưa có store thật) — **không** đọc `useAppStore`/service thật. Đây là quyết định có chủ đích chưa sửa, không phải bug quên |
| OW-08 | Khai báo tài khoản ngân hàng nhận tiền rút | Đã làm | `wallet.service.ts#createPayoutAccount/updatePayoutAccount`, UI tab "Tài khoản nhận tiền" trong `Wallet.tsx` |
| OW-11 | Cấu hình bộ nhận diện thương hiệu | Đã làm | `tenant.service.ts#updateBranding/resetBranding`, UI `Branding.tsx` — có kiểm tra tương phản khi lưu (`theme/index.ts#contrastRatio/pickReadableTextColor`, BR-31), có 8 bộ màu dựng sẵn (`BRAND_COLOR_PRESETS`), xem trước trực tiếp, nút khôi phục mặc định |
| OW-12 | Xem ví: số dư, sổ cái, lịch sử quyết toán | Đã làm | `wallet.service.ts#getWalletBalance/listLedger/listSettlementBatches`, UI tab "Tổng quan" trong `Wallet.tsx` |
| OW-13 | Tạo và huỷ yêu cầu rút tiền | Đã làm | `wallet.service.ts#createWithdrawalRequest/cancelWithdrawalRequest` |
| OW-14 | Hỏi đáp số liệu kinh doanh với trợ lý AI | **Mock** | `src/services/aiAssistant.ts` — so khớp câu hỏi theo từ khoá/mẫu thời gian (không gọi LLM thật) rồi tính THẬT trên dữ liệu mock, không bịa số (đúng tinh thần BR-50). Chỉ trả lời 3 dạng câu hỏi (doanh thu/top món/lượt khách) + từ chối đúng phạm vi ngoài scope. Đây là mock có chủ đích để chờ nối backend + mô hình thật, UI `AiAssistant.tsx` đã đủ hình dạng cuối (chat, bảng số, xem SQL minh hoạ, lịch sử) |
| OW-03 (GĐ2) | Nhập menu hàng loạt bằng ảnh (AI) | Chưa làm | Không có service/UI nào cho luồng tải ảnh → bảng nháp |
| OW-09 (GĐ2) | Xem audit log doanh nghiệp | Chưa làm | Không có màn Owner nào đọc `db.auditLog` |
| OW-10 (GĐ2) | Xem trạng thái tài khoản & lịch sử gói | Chưa làm | Không có UI lịch sử đổi gói |

### 2.4 Branch Manager

| Mã | Use case | Trạng thái | Ghi chú |
|---|---|---|---|
| BM-01 | Dashboard chi nhánh | Đã làm | `src/roles/branch/Kpis.tsx` + `RevenueChart.tsx` (chi nhánh) — đọc `useAppStore` thật, khác với bản Owner ở mục OW-07 |
| BM-02 | Xem bàn đang phục vụ, tổng tiền tạm tính | Đã làm | `Payment.tsx#Counter` tính `sessionTotal` từ `orderLines` thật |
| BM-03 | Mở hoá đơn phiên bàn, sinh mã QR | Đã làm | `payment.service.ts#createPayment` (method="qr"), chỉ role `manager` gọi được (`assertManager`, BR-13) |
| BM-04 | Ghi nhận tiền mặt, ghi người thu hộ | Đã làm | `createPayment` (method="cash", `collectedBy` bắt buộc) |
| BM-05 | Xác nhận thanh toán, in hoá đơn | Đã làm | `payment.service.ts#confirmPayment` — ghi bút toán `hold` nếu QR; "in hoá đơn" hiện là hiển thị mã hoá đơn/trạng thái trên UI, chưa có bản in riêng qua trình duyệt |
| BM-06 | Thiết kế sơ đồ bàn, khai báo bàn liền kề | Đã làm | `branch.service.ts#createTable/setAdjacent` (chỉ cùng khu vực, BR-25), UI `FloorPlan.tsx` |
| BM-07 | Bật/tắt món, đặt số suất còn lại (chi nhánh) | Đã làm | `menu.service.ts#toggleBranchMenuItem/updateRemaining`, UI `BranchMenu.tsx` |
| BM-08 | Quản lý tài khoản waiter/bếp | Đã làm | `staff.service.ts#createStaffAccount/setStaffActive`, UI `StaffTable.tsx` |
| BM-09 | Check-in/out, xác nhận lượt tự đóng | Đã làm | `shift.service.ts#checkIn/checkOut/autoCloseOverdueShifts/confirmAutoClosedWorkSession`, UI `ShiftCheckInOut.tsx` |
| BM-14 | Quản lý ca mẫu của chi nhánh | Đã làm | `shift.service.ts#createShiftTemplate/updateShiftTemplate`, UI `ShiftTemplates.tsx` |
| BM-15 | Phân ca nhân viên theo ngày | Đã làm | `shift.service.ts#assignShift/copyWeekAssignments`, UI `ShiftSchedule.tsx` |
| BM-10 (GĐ2) | Báo cáo chi nhánh theo tuần/tháng | Chưa làm | Không có màn báo cáo tổng hợp theo kỳ ngoài dashboard hiện tại |
| BM-11 (GĐ2) | Nhận và quản lý đặt bàn qua điện thoại | Chưa làm | Không có type/service/UI đặt bàn nào trong code |
| BM-12 (GĐ2) | Đối soát tay khi giao dịch lỗi | **Mock/GĐ2** | Tab "Đối soát tay" tồn tại trong `Payment.tsx` nhưng chỉ hiện `EmptyState`, ẩn khỏi Segmented control khi `FEATURE_FLAGS.manualReconciliation = false` — chưa có logic đối soát thật |
| BM-13 (GĐ2) | Xem audit log chi nhánh | Chưa làm | Không có màn Branch Manager nào đọc audit log |
| BM-16 (GĐ2) | Hoàn tiền giao dịch QR trong thời gian tạm giữ | **Mock/GĐ2** | `wallet.service.ts#refundHold` có logic thật (trừ đúng `held`, chặn hoàn quá số đã thu, chặn hoàn sau khi đã quyết toán) và có unit test (`wallet.service.test.ts`), nhưng **không có nút UI nào gọi hàm này** — Wallet.tsx/TenantsTable.tsx chỉ hiển thị cột "Đã hoàn (GĐ2)" nếu đã có dữ liệu hoàn sẵn trong sổ cái |

### 2.5 Waiter

| Mã | Use case | Trạng thái | Ghi chú |
|---|---|---|---|
| WT-01 | Xem sơ đồ bàn thời gian thực | Đã làm | `TableMap.tsx`, đọc `db.floorTables` qua store, đồng bộ qua BroadcastChannel |
| WT-02 | Mở phiên bàn với gợi ý xếp bàn (thuật toán) | Đã làm | `src/logic/tableArrangement.ts#suggestArrangements` (3 phương án, cắt tỉa theo khối liên thông, chấm điểm theo ghế thừa → số bàn → bảo toàn bàn lớn, đúng BR-24/25), có unit test `tableArrangement.test.ts`; gọi từ `TableMap.tsx` → `session.service.ts#openSession` |
| WT-03 | Ghi order trên tablet, gửi bếp | Đã làm | `order.service.ts#submitOrder` (kiểm tra `isSellable` + tồn kho trước khi chốt, trừ suất ngay — BR-06/07/08), UI `OrderScreen.tsx` |
| WT-04 | Gọi thêm món trong phiên | Đã làm | `submitOrder` gọi lại trên cùng `sessionId`, tạo `Order` mới |
| WT-05 | Nhận thông báo món xong, nhận việc | Đã làm | `order.service.ts#claimLine` — khoá bằng tìm `ServeTask` chưa ai nhận, người bấm sau nhận lỗi "Đã có người nhận" (BR-11), UI `ServingTasks.tsx` |
| WT-06 | Xác nhận đã phục vụ món | Đã làm | `order.service.ts#markLineServed` |
| WT-07 | Báo quầy, thu tiền mặt hộ, đóng phiên đã thanh toán | Đã làm | `session.service.ts#requestPayment/closeSession` (chỉ đóng được khi `status = paid`, BR-14), UI `Billing.tsx` |
| WT-08 (GĐ2) | Sửa/huỷ món theo yêu cầu khách | Mock/một phần | `order.service.ts#cancelLine` có thật nhưng chỉ huỷ được khi còn "Trong hàng đợi" (BR-09) — không có luồng UI dành riêng cho "khách đổi ý giữa chừng" như đặc tả GĐ2 mô tả |
| WT-09 (GĐ2) | Xử lý khi bếp báo hết món | Đã làm một phần | `order.service.ts#reportSoldOut` sinh `SoldOutAlert` cho Manager + mọi waiter (đã làm ở GĐ1 vì cần thiết cho vận hành cơ bản), nhưng luồng "đổi món khác/bỏ món khỏi hoá đơn" phía waiter (đúng như đặc tả GĐ2 mô tả) chưa có UI riêng |
| WT-10, WT-11 (GĐ2) | Xem/nhận đặt bàn trước | Chưa làm | Không có tính năng đặt bàn trong code (xem BM-11) |

### 2.6 Kitchen Staff

| Mã | Use case | Trạng thái | Ghi chú |
|---|---|---|---|
| KT-01 | Xem hàng đợi, lọc theo danh mục/trạng thái | Đã làm | `order.service.ts#kitchenQueue` (view tổng hợp, sắp theo thời gian chờ), UI `KitchenApp.tsx` có bộ lọc danh mục |
| KT-02 | Xem chi tiết order và ghi chú khách | Đã làm | `TicketCard.tsx` hiện ghi chú nổi bật, không hiện `unitPrice`/tổng tiền (đúng "Không thấy giá tiền" trong đặc tả) |
| KT-03 | Cập nhật trạng thái từng dòng món | Đã làm | `order.service.ts#updateLineStatus/markLineDone` — 4 trạng thái đúng đặc tả (chờ/đang làm/xong/hết món) |
| KT-04 | Báo hết món, cập nhật số suất | Đã làm | `reportSoldOut`, `menu.service.ts#toggleBranchMenuItem/updateRemaining` — Kitchen dùng chung quyền với Manager (`assertCanEditBranchAvailability`) |

---

## 3. Ghi nhận riêng — CM (chung mọi actor)

CM-01/02/03 (đăng nhập/đăng xuất, hồ sơ cá nhân, đổi mật khẩu): **Đã làm** — `auth.service.ts#login/changePassword`, `src/auth/LoginScreen.tsx`, `ChangePasswordModal.tsx`, `ForceChangePasswordModal.tsx` (bắt đổi mật khẩu ở lần đăng nhập đầu, đúng luồng 6.1).

---

## 4. Tính năng đã gỡ theo v7

- Trường `mrr` (Doanh thu thuê bao/MRR) — gỡ khỏi KPI Platform Admin (`src/roles/admin/Kpis.tsx`). Đặc tả v7 xác định phí thuê bao thu **ngoài hệ thống** (mục 1.2), nền tảng không quản lý số MRR.
- Trạng thái tenant `"trial"` — gỡ khỏi `TenantStatus` (`src/types/tenant.ts`, nay chỉ còn `"active" | "suspended" | "expired"`) và badge "Dùng thử" trong `TenantsTable.tsx`. Đặc tả v7 không có khái niệm dùng thử (mục 4.2: "Không tự kích hoạt, không chọn gói, không dùng thử").

## 5. Tính năng giai đoạn 2 (ẩn bằng feature flag)

Cấu hình tại `src/config.ts` (`FEATURE_FLAGS`), cả hai đang `false` — code vẫn giữ lại để bật lại sau, không xoá:

- **Nhật ký (Audit log), Platform Admin** — `src/roles/admin/AuditLog.tsx`, nav ẩn trong `AdminApp.tsx` khi `FEATURE_FLAGS.auditLog = false`. Bản thân màn hình đọc dữ liệu audit thật (`db.auditLog`, được nhiều service ghi vào qua `addAudit()`).
- **Đối soát tay, Branch Manager** — tab trong `src/roles/branch/Payment.tsx`, ẩn khỏi Segmented control khi `FEATURE_FLAGS.manualReconciliation = false`; hiện chỉ là `EmptyState`, chưa có logic đối soát.
- **Hoàn tiền QR (BM-16)** — `refundHold` trong `src/services/wallet.service.ts` có logic + unit test đầy đủ nhưng không có nút UI nào gọi tới; coi là mock GĐ2 chưa có luồng thao tác.
- Đặt bàn (BM-11/WT-10/WT-11): không có trong code — khác với hai mục trên, đây **không phải** tính năng GĐ2 bị ẩn, mà đơn giản là chưa làm.

## 6. Ngoài phạm vi đặc tả v7 — xác nhận không có trong code

Các mục sau được spec liệt vào "đã cắt hẳn" (mục 13.3) hoặc không thuộc GĐ1/GĐ2 — rà soát xác nhận đúng là không có trong code, không phải sót:

- Cấu hình webhook phía Owner (webhook chỉ được mô phỏng bằng nút "Giả lập webhook" trong `Payment.tsx`, không có màn cấu hình).
- Chatbot gợi ý món cho khách.
- QR dán bàn cho khách tự order qua điện thoại.
- Voucher / mã giảm giá.
- Giá theo chi nhánh (per-branch pricing) — `MenuItem.price` là một giá duy nhất toàn chuỗi (BR-19), khớp đặc tả.

## 7. Phân quyền (mục 14 đặc tả) — các chốt chặn ở tầng service

Ma trận quyền của đặc tả không chỉ được phản ánh qua việc ẩn/hiện menu, mà đã có chốt chặn thật trong service layer (ném lỗi nếu sai vai trò, tương đương "chặn ở backend" theo tinh thần BR-23):

- `src/services/payment.service.ts` — `assertManager`: chỉ Branch Manager được sinh QR (`createPayment`) và xác nhận thanh toán (`confirmPayment`) (BR-13).
- `src/services/menu.service.ts` — `assertCanEditBranchAvailability` (chỉ `manager`/`kitchen` sửa `isAvailable`/`remainingToday` cấp chi nhánh) và `assertNotAdmin` trên `listMenuItems` (Platform Admin không xem menu, BR-21).
- `src/services/order.service.ts` — `assertNotAdmin` trên `listBranchOrderLines` (Platform Admin không xem nội dung đơn hàng, BR-21).
- `src/services/wallet.service.ts` — `assertOwnerOrAdmin` (đọc ví: Owner xem ví mình, Admin xem mọi tenant chỉ để đối chiếu), `assertOwner` (thao tác ghi: tạo/huỷ yêu cầu rút, khai báo tài khoản nhận tiền), `assertAdmin` (duyệt/từ chối/xác nhận rút, chạy quyết toán) — Branch Manager/Waiter/Kitchen bị chặn hoàn toàn ở tầng này, không chỉ ẩn UI.
- Kitchen UI (`KitchenApp.tsx`, `TicketCard.tsx`) xác nhận không hiển thị `unitPrice`/tổng tiền — chỉ tên món, số lượng, ghi chú, trạng thái, đúng "Không thấy giá tiền" trong mục 4.7.

## 8. Nợ kỹ thuật đã biết

- **Mã màu cứng (hardcoded hex)**: rà soát phát hiện rất nhiều chỗ dùng trực tiếp `#0a0a0a`, `#71717a`, `#a1a1aa`, v.v. thay vì token trong `src/theme/`, trải khắp hầu hết `src/roles/**`, `src/layout/**`, `src/auth/**`, `src/components/bits.tsx`. Đây là nợ kỹ thuật đã tồn tại từ trước, không phải lỗi phát sinh mới, và **chưa được refactor** trong lần rà soát này — thay toàn bộ ~40 file là một refactor cơ học lớn, ngoài phạm vi.
- **Dashboard Owner dùng dữ liệu giả**: `src/roles/owner/Kpis.tsx` và `RevenueChart.tsx` vẫn đọc từ `src/data.ts` (dữ liệu tính sẵn thời kỳ trước khi có store thật) thay vì `useAppStore`/service thật — khác với bản Branch Manager (`src/roles/branch/Kpis.tsx`) đã dùng dữ liệu thật. Đây là quyết định có chủ đích không âm thầm sửa trong lần rà soát này, cần theo dõi riêng.
- **BR-31 (kiểm tra tương phản)**: đã cài đặt thật (`theme/index.ts#contrastRatio/pickReadableTextColor`, dùng trong `Branding.tsx`) — khác với ghi nhận cũ trong các bản trước của tài liệu này rằng mục này "chưa cài đặt". Cần cập nhật nhận thức nội bộ nhóm nếu tài liệu khác (SRS, slide) còn ghi ngược lại.
- **In hoá đơn (BR-15)**: hiện chỉ hiển thị mã hoá đơn/trạng thái trên UI web, chưa có bản in qua trình duyệt (`window.print`) hay template hoá đơn riêng.
