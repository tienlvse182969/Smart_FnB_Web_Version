# Ma trận use case web v9 — 3 actor (Admin, Owner, Branch Manager)

> **Tài liệu chỉ đọc** (quyết định 98). Chụp ngày 2026-10-11 trên nhánh `feat/v9-orders` (HEAD tại lượt 7.4c, đã chứa `origin/main` `1fa44d9`), BE local `main` `d98b4c1`.
> Nguồn đặc tả: `docs/Smart-FnB-Dac-ta-v9.md` **commit `70a49fa`** (mục 4.3–4.5). Đặc tả chưa phải bản cuối: use case đổi thì cập nhật bảng này.
> Trạng thái chỉ dùng 1 trong 7 giá trị: **Xong (thật)** · **Xong (mock, chờ BE #…)** · **Một phần** · **Chưa làm** · **Hoãn theo quyết định** · **Ngoài phạm vi web** · **Thừa**.
> "Xong (thật)" = màn có và gọi BE thật bằng cờ module `real`; không có nghĩa đã kiểm với dữ liệu/tích hợp thật mọi nhánh (xem cột ghi chú).

## 1. Platform Admin (PA)

| Mã | Tên | Route / màn (file) | Module · cờ | Trạng thái | Phụ thuộc BE | Ghi chú |
|---|---|---|---|---|---|---|
| PA-01 | Xem hồ sơ chờ duyệt, tìm kiếm, mở chi tiết | `/admin/signups` · `roles/admin/SignupRequests.tsx` | `admin` · real | Xong (thật) | — | Gói công khai cho form đăng ký đọc `GET /public/service-plans` (main) |
| PA-02 | Duyệt hồ sơ (chọn gói, ngày hết hạn) | `/admin/signups` · `SignupRequests.tsx` | `admin` · real | Xong (thật) | #1 (email) đã có ở main | Tạo Owner/nhận diện mặc định do BE; email đăng nhập chỉ gửi thật khi `EMAIL_*` đặt; chưa kiểm gửi thư thật |
| PA-03 | Từ chối hồ sơ kèm lý do | `/admin/signups` · `SignupRequests.tsx` | `admin` · real | Xong (thật) | #1 | như trên |
| PA-04 | Quản lý gói (giá, trần chi nhánh/tài khoản, cờ tính năng) | `/admin/plans` · `roles/admin/PlansTable.tsx` | `admin` · real | Xong (thật) | #29 (`maxTables` v7 còn bắt buộc, web gửi 1 ẩn) | Gói 3 cấp suy từ mã gói (#30) |
| PA-05 | Quản lý doanh nghiệp (xem, gia hạn, đổi gói, tạm ngưng, kích hoạt lại, đặt lại mật khẩu Owner) | `/admin/tenants` · `roles/admin/TenantsTable.tsx` | `admin` · real | Xong (thật) | — | Chưa đối chiếu cột "tổng số đơn trong tháng" của 4.3; số ví không bao giờ hiện (BR-07) |

## 2. Owner (OW)

| Mã | Tên | Route / màn (file) | Module · cờ | Trạng thái | Phụ thuộc BE | Ghi chú |
|---|---|---|---|---|---|---|
| OW-01 | Chi nhánh: tạo, sửa, tạm ngưng, đóng; xem trạng thái mọi chi nhánh | `/owner/branches` · `roles/owner/Branches.tsx` (+ `BranchOperations.tsx` của nhóm: giờ theo ngày) | `branch` · real | Xong (thật) | — | Chặn vượt hạn mức chi nhánh kèm gợi ý nâng gói; nút ghi của `BranchOperations` khoá khi chỉ đọc (7.4c) |
| OW-02 | Danh mục và món (giá, ảnh, cờ gom món) | `/owner/menu`, `/owner/menu/categories` · `MenuTable.tsx`, `CategoriesTable.tsx` | `menu` · real | Xong (thật) | #17 đã có | |
| OW-03 | Nhóm và tuỳ chọn món, gắn vào món | `/owner/menu/options` · `OptionGroups.tsx` | `options` · real | Xong (thật) | #15 `isDefault` đã có | Trạng thái tuỳ chọn theo chi nhánh đọc qua `branch-states` (#41, main) |
| OW-04 | Gán món cho chi nhánh; bật/tắt món và tuỳ chọn ở cấp chuỗi | `/owner/menu` · `MenuTable.tsx`, `OptionGroups.tsx` | `menu`, `options` · real | Xong (thật) | #19 (Manager thấy món Owner đã tắt) | Cờ chuỗi tắt thì Manager không bật lại được (BR-12) — BE hiện vẫn lưu cờ chi nhánh (ghi ở "BE lệch") |
| OW-05 | Tạo Manager (qua email), khoá, đặt lại mật khẩu, chuyển chi nhánh; xem Cashier/Barista | `/owner/accounts` · `ManagerAccounts.tsx` | `account` · real | Xong (thật) | #23, #1 đã có | Tạo/mời thật chưa kiểm vì gửi thư thật (chỉ chặn ghi ở trình duyệt) |
| OW-06 | Liên kết PayOS (nhập khoá, xác minh, webhook, gỡ) | `/owner/payos` · `PayosLink.tsx` | `payos` · real | Xong (thật) | `PAYOS_MASTER_KEY`, `PAYOS_WEBHOOK_BASE_URL` ở BE | BE local chưa đặt nên `PUT` thật trả 503: chưa kiểm khoá thật |
| OW-07 | Nhận diện thương hiệu (logo, màu, tên hiển thị, khôi phục) | `/owner/branding` · `Branding.tsx` | `branding` · real | Xong (thật) | #39 (`isCustom`/`version`), #33 (chặn theo gói) | Web tự suy và tự khoá theo gói |
| OW-08 | Báo cáo đa chi nhánh (ngày/tuần/tháng, thanh toán, món, đơn huỷ; so sánh từ gói Tiêu chuẩn) | `/owner/reports` · `Reports.tsx` | `report` · real | Một phần | #47 (BE báo cáo Owner lọc `COMPLETED`, không đếm đơn quầy `DELIVERED`) | Số liệu Owner sai cho đơn quầy tới khi BE sửa; Manager (`manager_report`) đúng (BM-03). GĐ9 |
| OW-09 | Trợ lý AI hỏi đáp số liệu (Nâng cao) | `/owner/ai` · `AiAssistant.tsx` | `ai` · **mock** | Xong (mock, chờ BE OW-09) | BE chưa có endpoint | Mock đọc bộ đơn mock; khoá theo cờ gói; làm real ở GĐ9 |
| OW-11 | Poster màn hình sau của thu ngân (thêm, xoá, bật/tắt, tên, thời lượng, thứ tự) | `/owner/posters` · `Posters.tsx` | `posters` · real | Xong (thật) | BE `77526c3` đã có | Mã mới, chưa có trong đặc tả v9; BE chưa có đổi ảnh tại chỗ, sắp xếp hàng loạt, realtime (xem api-contract-plan.md) |
| OW-10 | Gói đang dùng, hạn, hạn mức, tính năng | `/owner/plan` · `MyPlan.tsx` | `plan` · real | Xong (thật) | #38 đã có | Không có nút gia hạn/đổi gói (đúng 4.4) |

## 3. Branch Manager (BM)

| Mã | Tên | Route / màn (file) | Module · cờ | Trạng thái | Phụ thuộc BE | Ghi chú |
|---|---|---|---|---|---|---|
| BM-01a | Tài khoản Cashier/Barista: tạo bằng email, sửa, gửi lại email, khoá/mở khoá | `/manager/staff` · `roles/branch/StaffTable.tsx`, `StaffReasonModal.tsx` | `account` · real | Xong (thật) | #24 đã có; #62 (không có `lastLoginAt`), #63 (không xoá được điện thoại), #64 (không phân biệt "chưa kích hoạt" với "ngừng") | Lý do 3–500 bắt buộc khi khoá/mở khoá/gửi lại; mã nhân viên bắt buộc (BE); tạo/mời/gửi thật chưa kiểm (gửi thư thật) |
| BM-01b | Quầy: tạo, đổi tên, ngừng dùng; xem và thu hồi màn hình đã ghép | `/manager/stations` · `Stations.tsx` | `stations` · real | Một phần | #27 (đổi tên, ngừng dùng, sửa máy in chưa có endpoint) | Tạo quầy, ghép/thu hồi màn hình khách và màn gọi số làm được |
| BM-02 | Bật/tắt món và tuỳ chọn tại chi nhánh | `/manager/menu` · `BranchMenu.tsx` | `menu`, `branch_options` · real | Xong (thật) | #19, #22 (suất v7) | Không gửi `isEnabled` (của Owner) |
| BM-03 | Báo cáo chi nhánh | `/manager/dashboard` · `ManagerDashboard.tsx` | `manager_report` · real | Xong (thật) | #47 chỉ ảnh hưởng báo cáo Owner | Kỳ ngày/tuần/tháng, top 10, giờ theo múi giờ chi nhánh |
| BM-04 | Tra cứu đơn, chi tiết đơn | `/manager/orders`, `/manager/orders/:id` · `OrderSearch.tsx`, `OrderDetail.tsx` | `order` · real | Xong (thật) | 7.7b: #48, #50, #73 đã dùng (khách đưa/tiền thối, hạn QR, tên người hoàn); #52 một phần (BE chỉ lưu quầy cho khoản QR) | Tự làm tươi qua socket (QĐ 74) |
| BM-05 | Xác nhận chuyển khoản thủ công (khoản chờ / lệch số tiền) | `/manager/orders/:id` · `OrderDetail.tsx`, `ConfirmTransferModal.tsx` | `order` · real | Một phần | 7.7b: #59 xong (QĐ 122: không khoá khi hết hạn), #60 xong (đọc mã `error`); 7.7c: #61/#75 xong (QĐ 127: xác nhận tay + huỷ cả đơn cho tiền về sau QR hết hạn); kiểm thật cần PayOS test | Có: hộp 2 bước, BR-28, lý do, "Cần xử lý"/"Lệch số tiền". Từ 7.5: route `/manager/orders/needs-attention` có danh sách thật (QĐ 99). Còn thiếu: kiểm thật với PayOS test; BE chưa đánh dấu loại "cần xử lý" khác (#67) |
| BM-06 | Huỷ đơn đã thanh toán (toàn bộ/từng dòng), lý do, hình thức hoàn | `/manager/orders/:id` (nút "Huỷ đơn và ghi hoàn tiền", thẻ "Khoản phải hoàn"), `/manager/orders/needs-attention` (khối chờ hoàn), `/manager/dashboard` (hoàn tiền) | `order` | **Xong (thật, 7.6)** | #43 đã vào BE `514c426`; còn #72–#74 (nhỏ) | QĐ 115–121; ghi thật 2 đơn + khoản hoàn, báo cáo trừ đúng |
| BM-W | Nhận cảnh báo: số tiền lệch, đơn chờ xác nhận, hết món khi còn đơn đã trả | Sidebar "Đơn cần xử lý" (số đếm) + thông báo nổi · `AttentionWatcher.tsx` | `order` (socket + tải 60 giây) | Một phần | 7.7b (QĐ 123–124): #51 một phần (checkout chưa phát), #65 một phần (lệch tiền chưa có `attentionAt`, #77), #67 một phần (còn loại QR chờ lâu); hết món và tiền về sau hết hạn đã có lý do riêng | Có (7.5, QĐ 100–101): số tiền lệch (socket) và hết món (thông báo dẫn tới Tra cứu). Thiếu: "đơn chờ xác nhận thủ công" và "tiền về sau khi đơn đã huỷ" — BE không phát/đánh dấu (#67) |

## 4. Màn chung của web (ngoài 3 actor)

| Màn | Route / file | Module · cờ | Trạng thái | Phụ thuộc BE | Ghi chú |
|---|---|---|---|---|---|
| Đăng nhập | `/login` · `auth/LoginScreen.tsx` | `auth` · real | Xong (thật) | — | Luôn nhận diện nền tảng (CC-04); chỉ Admin/Owner/Manager vào web |
| Kích hoạt / đặt mật khẩu qua email | `/setup-password` · `auth/SetupPasswordScreen.tsx` | `auth` · real | Xong (thật) | #1, #25 (link đầy đủ) | Token một lần; dùng cho Manager và Cashier/Barista mới |
| Đổi mật khẩu (người đã đăng nhập) | `auth/ChangePasswordModal.tsx` | `auth` | Một phần | BE chưa có endpoint | Nút đang khoá/chờ BE |
| Màn hình gọi số (TV/tablet) | `/display/call` · `display/CallScreen.tsx` | `callingDisplay.ts` (fetch thẳng, ngoài `defineApi`) | Một phần | #28 (danh sách thiết bị), ghép bằng mã 6 số | Mở được và hiện mã ghép; chưa kiểm ghép thiết bị thật; hiện `reason.message` thô của BE (bảng "cần nhóm xem" ở BAN-GIAO 7.4b). Điểm bắt đầu GĐ8 (QĐ 93) |
| Landing + form đăng ký | `/` · `components/landing/*` | `admin` (gói công khai) | Xong (thật) | `GET /public/service-plans` | Giá gói đọc từ API (không viết cứng) |

## 5. Thừa, hoãn, ngoài phạm vi

| Mục | File / route | Trạng thái | Lý do |
|---|---|---|---|
| Trang theo dõi đơn công khai `/t/:token` ("thẻ rung ảo") | `display/OrderTrackingScreen.tsx`, `api/modules/orderTracking.ts`; cờ `VITE_FEATURE_ORDER_TRACKING` (tắt) | Hoãn theo quyết định | QĐ 91: nhóm tạm hoãn 08–10/10; không có trong đặc tả v9 |
| Màn hình phía khách bản web `/display/customer` | `display/CustomerDisplayScreen.tsx`, `api/modules/customerDisplay.ts`; cờ `VITE_FEATURE_WEB_CUSTOMER_DISPLAY` (tắt) | Hoãn theo quyết định | QĐ 92: đặc tả giao FE-M (repo mobile backscreen), chờ nhóm chọn bản |
| Quét menu / AI bản cũ | — | Ngoài phạm vi web | Đặc tả ở commit `70a49fa` chỉ có trợ lý hỏi đáp số liệu (OW-09); không có "quét menu" nên không có gì để loại |
| POS thu ngân, pha chế, màn hình khách (app) | repo mobile | Ngoài phạm vi web | CS-01…05, màn pha chế, màn khách: do app Android/FE-M |
| `/admin/overview` Tổng quan Admin | `roles/admin/AdminOverview.tsx`, `Kpis.tsx` | Thừa | 4.3 chỉ nêu "Thấy gì", không là use case riêng; hỗ trợ PA-05 |
| `/manager/branch-info` Thông tin chi nhánh | `roles/branch/BranchInfo.tsx` | Thừa | Không có use case Manager xem/sửa thông tin chi nhánh trong 4.5 (OW-01 là của Owner) |
| Tab "Ngày đặc biệt" và "Khu vực" của BranchOperations | `roles/owner/BranchOperations.tsx` (main) | Thừa | OW-01 chỉ nêu giờ mở/đóng, tạm ngưng, đóng; khu vực/tầng (DINING, KITCHEN…) là dấu vết v7 (bàn/khu), 4.4 không có |
| Loại khu vực DINING/KITCHEN/BAR/PICKUP, `resource: "tables"` | `types/branch.ts:72, 110` | Thừa | Dấu vết v7 (bàn, bếp) |
| Vai trò `WAITER`, `KITCHEN` của BE | `types/auth.ts:45-46`, `api/modules/auth/real.ts:44` | Thừa | Không thuộc v9; web chặn không cho vào |
| Phương thức `CARD`, `E_WALLET`, `OTHER` | `api/modules/order/codes.ts` | Thừa (đã dọn 7.5b) | Dữ liệu v7 BE còn trả: giữ NHÃN tiếng Việt "Thẻ" / "Ví điện tử" / "Khác" (QĐ 103); không có trong ô lọc hay lựa chọn nào. Trạng thái `PARTIALLY_PAID`, `REFUNDED`, `PENDING`, `SERVED` vẫn hiện "Khác (<mã>)" (QĐ 70–71) |
| ~~Phiên bàn (`tableSession`), `createdByWaiter` trong chi tiết đơn~~ | `api/modules/order/mapper.ts` | **Đã gỡ 7.5b** | Mapper không còn đọc; đơn tra cứu luôn `COUNTER_PICKUP` |
| ~~`getCustomerTraffic` (`/reports/customers`, lượt bàn), `guestCount`/`sessionCount`~~ | `api/modules/report/*`, `types/report.ts` | **Đã gỡ 7.5b** | Endpoint đếm lượt bàn v7, không màn nào dùng |
| ~~Route `/branch/*`~~, ~~nhãn `maxTables` ở thông báo lỗi~~, `ApiPlan.maxTables` | `router/index.tsx`, `validationText.ts`, `types/branch.ts` | **Đã gỡ 7.5b** (QĐ 104) | Route v7 rơi về trang chủ như route lạ |
| `maxTables` trong thân `POST /admin/service-plans` | `api/modules/admin/real.ts:15,122` | Thừa (giữ) | BE còn bắt buộc `@Min(1)` (#29); không hiện ở giao diện |
| `/admin/overview`, `/manager/branch-info` | `AdminOverview.tsx`, `BranchInfo.tsx` | Thừa (giữ, chờ Khánh) | Không chứa khái niệm v7 (là tổng quan doanh nghiệp và thông tin chi nhánh); gỡ sẽ đổi trang đầu của Admin và nhiều script — chờ quyết định |
| Ví/số dư (`wallet`, `balance`, `heldBalance`) | `api/modules/admin/mapper.ts` | Thừa (bị chặn) | BR-07: mapper không bao giờ chép |

## 6. Tổng theo actor

| Actor | Xong (thật) | Xong (mock, chờ BE) | Một phần | Chưa làm | Hoãn | Ngoài phạm vi | Thừa | Tổng use case |
|---|---|---|---|---|---|---|---|---|
| Admin (PA) | 5 | 0 | 0 | 0 | 0 | 0 | 1 (`/admin/overview`) | 5 |
| Owner (OW) | 8 | 1 (OW-09) | 1 (OW-08) | 0 | 0 | 0 | 1 (tab Ngày đặc biệt/Khu vực) | 10 |
| Branch Manager (BM) | 4 (01a, 02, 03, 04) | 0 | 3 (01b, 05, cảnh báo) | 1 (06) | 0 | 0 | 1 (`branch-info`) | 8 (BM-01 tách 2; thêm "nhận cảnh báo") |
| Màn chung | 3 | 0 | 2 | 0 | 0 | 0 | — | 5 |
| Hoãn / ngoài phạm vi | — | — | — | — | 2 (`/t/:token`, màn khách web) | 2 | — | 4 |

Tổng use case 3 actor: **23** (5 + 10 + 8); Xong (thật) **18** (5 + 8 + 5, thêm BM-06 sau 7.6), Xong (mock) **1**, Một phần **4** (OW-08, BM-01b, BM-05, cảnh báo — sau 7.5), Chưa làm **0**.

## 7. Năm việc còn thiếu quan trọng nhất cho demo (tuần 7 của lịch)

| # | Việc | Use case | Vì sao | Lượt đề xuất |
|---|---|---|---|---|
| 1 | Huỷ đơn đã thanh toán, ghi lý do và hình thức hoàn | BM-06 | Use case duy nhất của Manager chưa có; rủi ro R5 (huỷ đơn đã trả) khi demo; cần BE #43 hoặc làm mock đủ luồng + khoá real (QĐ 65) | 7.6 |
| 2 | ~~Route danh sách và cảnh báo~~ **đã làm ở 7.5**; còn kiểm "Đơn cần xử lý" với PayOS test (webhook lệch thật) và các loại BE chưa đánh dấu (#67) | BM-05, BM-W | Kiểm thật cần khoá PayOS + URL công khai (R3) | nhờ nhóm cấp PayOS test; BE #67 |
| 3 | Màn hình gọi số chạy thật và an toàn: ghép thiết bị thật, đi qua `describeApiError`/refresh, quyết định giữ bản màn hình khách | màn chung `/display/call`, FE-M | Là điểm demo khu nhận món; mã main gọi `fetch` thẳng và hiện câu thô | 8 |
| 4 | Báo cáo Owner đúng số đơn quầy (BE lọc `COMPLETED`) và trợ lý AI thật | OW-08, OW-09 | Doanh thu Owner lệch so với Manager khi demo đa chi nhánh; AI còn mock | BE #47 rồi 9 |
| 5 | Nối nốt BE còn chặn nút: đổi tên/ngừng dùng quầy, xoá điện thoại, phân biệt "chưa kích hoạt", đổi mật khẩu | BM-01b, BM-01a, màn chung | Nhiều nút đang khoá kèm "Chờ BE"; giám khảo bấm vào sẽ thấy | nhờ BE #27, #63, #64; web 7.7 |

## 8. Cập nhật 7.8 (2026-10-13) — theo đặc tả 9.2 (33 use case, mục 14.1)

> Nguồn: `docs/Smart-FnB-Dac-ta-v9.2.md` (thay bản v9 ở đầu tài liệu). Mã use case đổi theo 14.1: CM-01/02 (mọi actor), GU-01, PA-01..05, OW-01..**11**, BM-01..06 (BM-01 gồm cả quầy và màn hình phía khách), CS-01..05, BA-01..03. "Nhận cảnh báo" không còn là use case riêng (chỉ ghi trong 4.5). BE local `7d7f2dc`. Bảng này **thay** các bảng 1–3 và 6 ở trên khi mâu thuẫn.

| Mã | Use case | Trạng thái | Ghi chú / phụ thuộc BE |
|---|---|---|---|
| CM-01 | Đăng nhập, đăng xuất | Xong (thật) | |
| CM-02 | Hồ sơ cá nhân và đổi mật khẩu | Một phần | BE chưa có endpoint đổi mật khẩu; nút khoá |
| GU-01 | Nộp hồ sơ đăng ký (landing) | Xong (thật) | `POST /registration-applications` |
| PA-01…PA-05 | Hồ sơ, duyệt, từ chối, gói, doanh nghiệp | Xong (thật) ×5 | #29 xong ở 7.7c (không gửi `maxTables`) |
| OW-01…OW-07 | Chi nhánh, menu, tuỳ chọn, gán món, Manager, PayOS, nhận diện | Xong (thật) ×7 | PayOS thật chưa kiểm (thiếu `PAYOS_MASTER_KEY`) |
| OW-08 | Báo cáo đa chi nhánh | **Xong (thật)** (9.2) | #47 đã sửa ở BE `7d7f2dc`. Từ 9.1 (QĐ 139): doanh thu sau hoàn, gộp, đã hoàn, chờ hoàn, đơn huỷ sau thanh toán. **Từ 9.2 (BE `8a315ad`, QĐ 141–143):** theo hình thức thanh toán (#94), topping bán chạy (#97), giá trị đơn TB ở tổng (#98), khoá/tách từng mục theo gói (#84); gói không có so sánh đa chi nhánh xem từng chi nhánh |
| OW-09 | Trợ lý AI | Xong (mock) | Nhóm chưa chốt; không làm, không đụng module `ai` |
| OW-10 | Gói đang dùng | Xong (thật) | Từ 7.8: dải sắp hết hạn 7 ngày (QĐ 134) |
| OW-11 | Áp phích màn hình phía khách | Xong (thật) | 7.9, QĐ 137: BE `4b81e48` `display-posters`; giới hạn BE 10/120 lệch đặc tả 6/50 (#82 chờ nhóm chốt, một hằng số `POSTER_LIMITS`) |
| BM-01 | Nhân sự (Cashier/Barista) và quầy, màn hình phía khách | Xong (thật) | #62–#64, #27, #28 xong ở 7.7c; hạn token ở 7.8 (QĐ 136) |
| BM-02 | Bật/tắt món và tuỳ chọn | Xong (thật) | |
| BM-03 | Báo cáo chi nhánh | Xong (thật) | #47/#76 sửa ở BE `7d7f2dc` |
| BM-04 | Tra cứu đơn | Xong (thật) | |
| BM-05 | Xác nhận chuyển khoản thủ công | Xong (thật) | #75 xong ở 7.7c; chưa kiểm webhook PayOS thật |
| BM-06 | Huỷ đơn đã thanh toán | Xong (thật) | QĐ 132 (tuỳ chọn, giá lúc bán, hao hụt); BR-49 phần "Owner thấy danh sách chờ hoàn" **đã có từ 9.2** (#99, QĐ 142; hiện vai trò người huỷ vì BE chưa trả tên, #100) |
| CS-01…CS-05 | Thu ngân | Ngoài phạm vi web | App Android |
| BA-01…BA-03 | Pha chế | Ngoài phạm vi web | App Android |

**Tổng 33 use case:** thuộc web **25** (CM 2, GU 1, PA 5, OW 11, BM 6) + ngoài phạm vi web **8** (CS 5, BA 3). Trong 25: **Xong (thật) 22** (thêm OW-11 ở 7.9) · **Xong (mock) 1** (OW-09) · **Một phần 2** (CM-02, OW-08) · **Chưa làm 0** · Hoãn 0.

Khép việc thiếu (mục 7): #1 BM-06 xong (7.6); #2 đã làm (7.5, 7.7b); #3 màn hình gọi số (8.1–8.2, 7.7c); #4 báo cáo Owner đúng số đơn quầy xong ở BE, còn "theo hình thức" và AI; #5 các nút "Chờ BE" đã mở ở 7.7c (còn đổi mật khẩu).
