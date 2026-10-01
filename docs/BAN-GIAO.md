# BÀN GIAO — Smart F&B Web (phiên agent mới)

> Đọc hết file này trước khi làm gì. Đặc tả chuẩn: `docs/Smart-FnB-Dac-ta-v9.md`.
> Kế hoạch: `docs/Smart-FnB-Ke-hoach-v9.md`. Khi file này, prompt và đặc tả mâu thuẫn: **đặc tả thắng**, và báo lại chỗ lệch.
> Cập nhật: 2026-10-01, sau khi xong Giai đoạn 1.

---

## 1. Dự án

**Smart F&B Chain Platform** (mã SP26SE123), đồ án tốt nghiệp FPT. SaaS multi-tenant cho chuỗi đồ uống gọi món và **trả tiền trước tại quầy** (cà phê, trà sữa, mang đi), 2–10 chi nhánh.

Dự án đã đổi nghiệp vụ từ v7 sang v9. Những gì v9 **đã bỏ hẳn**, không được dựng lại dưới bất kỳ hình thức nào:
sơ đồ bàn, phiên bàn, xếp/ghép bàn, đặt bàn, Waiter, Kitchen Staff, ca làm, check-in, ví doanh nghiệp, sổ cái, tạm giữ, quyết toán, rút tiền, nhập menu bằng ảnh, voucher, **quản lý kho** (kể cả trừ số suất).

Những gì v9 **mới có**: tuỳ chọn món có giá cộng thêm, 3 gói Cơ bản / Tiêu chuẩn / Nâng cao khác hạn mức và tính năng, liên kết PayOS (tiền về thẳng tài khoản Owner, nền tảng không giữ tiền), quầy + máy in + ghép màn hình bằng mã 6 số, đơn Cần xử lý, xác nhận chuyển khoản thủ công, huỷ đơn đã thanh toán, màn hình gọi số.

## 2. Phạm vi của web

Web chỉ gồm: **Platform Admin, Owner, Branch Manager, và màn hình gọi số chạy trên TV**.

POS thu ngân, màn hình phía khách và màn hình pha chế thuộc **app Android** (người khác làm), không làm trên web. Manager không đứng quầy (CC-08), nên web không có màn POS nào.

## 3. Môi trường

| Thứ | Giá trị |
|---|---|
| Repo web | `tienlvse182969/Smart_FnB_Web_Version` (repo của Tiến) — local: `FE_FnB/Smart_FnB_Web_Version` |
| Repo BE | `Raintostorm/SmartFnBBackend` — local: `BE_FnB/SmartFnBBackend`. **CHỈ ĐỌC** |
| Stack web | React 19 + Vite + Ant Design 6 + Zustand + React Router 7 |
| Stack BE | NestJS + Prisma + PostgreSQL, chạy Docker |
| BE local | `http://localhost:3100`, prefix `/api/v1`, Swagger `/api/docs`, JSON `/api/docs-json` |
| Tài khoản demo | Đọc từ `.env` của BE. **Không in mật khẩu ra báo cáo hay log** |
| Nhánh hiện tại | `refactor/v9-scope` (tạo từ `feat/real-tables-payments`) |

## 4. Quy tắc làm việc (bắt buộc)

1. **Khảo sát trước, sửa sau.** Bước nào có chữ "khảo sát" thì chỉ đọc và báo cáo, chờ duyệt.
2. **BE chỉ đọc.** Không sửa code BE, không chạy migration, không chạy seed.
3. **Git:** commit theo từng bước có message rõ ràng. `git add` theo đường dẫn cụ thể, **cấm `git add -A` / `git add .`**. **Không push, không merge.**
4. **Không đụng:** stash `pre-v9-wip`; 4 file LFS luôn hiện `M` (`HarmonyOS_Sans_Regular.ttf` và 3 file `.docx` trong `src/imports/`) — đây là lỗi LFS có từ trước, chủ repo sẽ xử lý.
5. **Không thêm thư viện** nếu chưa nêu lý do và được duyệt (ngoại lệ đã duyệt: Vitest, xem Giai đoạn 2).
6. **Báo cáo:** tiếng Việt, ngắn, có `file:dòng`. Không tự nhận "xong", "đẹp", "chạy ổn". Chỉ báo sự thật đã kiểm, chỗ không chắc ghi rõ là không chắc.
7. **Không tự mở rộng phạm vi.** Thấy việc ngoài phạm vi thì ghi vào báo cáo, không tự làm.
8. **Kiểm tra trên trình duyệt thật** (Chrome headless qua CDP đã dùng được ở Giai đoạn 1), không chỉ `tsc` và build.

## 5. Quyết định đã chốt

| Chủ đề | Quyết định |
|---|---|
| Kho | **Không làm kho.** Chỉ có báo hết món / hết tuỳ chọn |
| Màn AuditLog | Xoá (đặc tả 14.2 cắt). BE vẫn ghi log |
| PlatformSettings | Xoá (không có use case) |
| Số dư ví ở Admin | Không bao giờ hiển thị, kể cả khi API trả (BR-07) |
| Trang đăng nhập | Luôn dùng nhận diện nền tảng, không theo tenant (CC-04) |
| Số liệu gói (giá, hạn mức) | Là cấu hình của Admin (CC-01). **Cấm viết cứng ở FE** |
| Tiền | BE trả lẫn `"995000.00"` và `"250000"`. Luôn đi qua `parseAmount` / `formatVnd` trong `services/reportFormat.ts` |
| Tên tỉnh | Ghi tên đầy đủ theo `constants/provinces.ts`; so khớp thì chuẩn hoá (`normalizeProvince`) |
| Màu | Tách **màu thương hiệu** (theo tenant) và **màu ngữ nghĩa** (cố định, không bao giờ bị thương hiệu đè — BR-42) |
| Màn bị khoá theo gói | Hiện thẻ khoá kèm tên gói cần nâng, **không ẩn hẳn** |
| CC-12 (thu phí gói qua hệ thống) | Chưa chốt. Không làm màn thanh toán gia hạn, nhưng thiết kế lớp API gói chừa chỗ |

## 6. Trạng thái sau Giai đoạn 1

### Commit trên `refactor/v9-scope`

| Commit | Nội dung |
|---|---|
| `8b3008f` | 1.1 Tách store thành slice (một `useAppStore` ghép slice) |
| `70a49fa` | docs: đặc tả + kế hoạch v9 dạng .md |
| `196d9f8` | AI mock: 3 hàm đọc dữ liệu v7 trả rỗng. **Tự nó không build được** (phụ thuộc commit sau) → squash khi merge |
| `5809859` | 1.2 Xoá v7 (44 file xoá, +573 / −9056 dòng toàn giai đoạn) |
| `3d892b2` | 1.3 Role: `RoleKey = admin \| owner \| manager \| cashier \| barista` ở `types/auth.ts` |
| `578f5f3` | 1.4 Route con, `routeConfig.tsx` là nguồn duy nhất cho route + sidebar, `RoleLayout` thay 3 file `*App.tsx` |
| `d768671` | 1.5 Kiểm tra trình duyệt + broadcast LOGOUT giữa các tab |

### Store

Một `useAppStore` ghép từ các slice: `auth`, `branding`, `plan`, `branches`, `menu`, `staff`. `loadScope` nạp: phạm vi (`chainId`/`chainIds` từ `/auth/me`), branding, gói, menu, nhân sự.

### Cây route

| Route | Mã | Trạng thái |
|---|---|---|
| `/admin/overview` | — | mock — BE có `/admin/*`, web CHƯA nối |
| `/admin/tenants` | PA-05 | mock — BE có endpoint, web CHƯA nối |
| `/admin/signups` | PA-01..03 | mock — BE có endpoint, web CHƯA nối |
| `/admin/plans` | PA-04 | mock — BE có `/admin/service-plans`, web CHƯA nối |
| `/owner/reports` | OW-08 | API thật + banner "chờ backend" |
| `/owner/branches` | OW-01 | API thật (chi nhánh) |
| `/owner/menu` | OW-02, OW-04 | mock — BE có endpoint, web CHƯA nối |
| `/owner/menu/options` | OW-03 | placeholder |
| `/owner/accounts` | OW-05 | mock — BE có endpoint, web CHƯA nối |
| `/owner/payos` | OW-06 | placeholder |
| `/owner/branding` | OW-07 | mock — BE có endpoint, web CHƯA nối |
| `/owner/ai` | OW-09 | mock, đang trả rỗng |
| `/owner/plan` | OW-10 | placeholder |
| `/manager/dashboard` | BM-03 | placeholder |
| `/manager/branch-info` | — | có |
| `/manager/menu` | BM-02 | mock — BE có endpoint bật/tắt món, web CHƯA nối; chưa có tuỳ chọn |
| `/manager/staff` | BM-01 | mock |
| `/manager/stations` | BM-01 | placeholder |
| `/manager/orders` | BM-04 | placeholder |
| `/manager/orders/needs-attention` | BM-05 | placeholder |
| `/manager/orders/:orderId` | BM-04, BM-06 | placeholder (ẩn khỏi sidebar) |
| `/display/call` | (không phải use case) | placeholder, công khai, không sidebar |

CM-02 (hồ sơ, đổi mật khẩu) là drawer/modal trong `RoleShell`, không có route riêng.

### Tồn đọng đã biết

| Chỗ | Xử lý ở |
|---|---|
| `theme/semantic.ts` còn `TABLE_STATUS_COLOR` | Giai đoạn 2 |
| `owner/Branding.tsx`: preview còn "Waiter", "Kitchen", "Bàn A1" | Giai đoạn 2 |
| 59 comment trích mã BR của v7 (v9 đã cấp lại mã, nhiều chỗ trỏ sai) | Giai đoạn 2 |
| `Reports.tsx` thẻ khách dùng `getCustomerTraffic` (đếm lượt bàn) | Giai đoạn 2: ẩn |
| Refresh token xoay vòng có thể xung đột khi nhiều tab cùng refresh | Giai đoạn 2 |
| Landing (Hero, HowItWorks, Pricing… còn "20 bàn mỗi chi nhánh", giá viết cứng) | Giai đoạn 3 (cùng PA-04) |
| `branchApi.ts`: `maxTables`; `authApi.ts`: `WAITER`, `KITCHEN` trong `BackendRole` | Giữ: phản ánh đúng JSON BE hiện tại |
| Màn Admin chưa gọi `/admin/*` (BE đã có) | Giai đoạn 3 |
| DB local thiếu tài khoản cashier/barista dù seed BE có | Người dùng tự xử lý, không phải việc của agent |

## 7. Backend: hiện trạng tóm tắt

Báo cáo đầy đủ đã gửi nhóm BE. Tóm tắt những gì ảnh hưởng web:

**Có thật, dùng được:** auth (`/auth/login`, refresh, `/auth/me`), PA-01..03, PA-05, `/admin/service-plans`, OW-01, OW-02, OW-04, OW-05, branding GET/PUT/DELETE, `/reports/*` (chỉ OWNER), bật/tắt món chi nhánh qua `PATCH /branches/:id/menu/items/:id`, `GET/POST /stations`, `POST /stations/pair-customer-display`, `DELETE /display-devices/{id}`.

**Chưa có → web phải mock:**

| Mã | Chức năng |
|---|---|
| OW-03 | CRUD nhóm tuỳ chọn, tuỳ chọn, gắn vào món, bật/tắt cấp chuỗi |
| OW-06 | Liên kết PayOS |
| OW-09 | Trợ lý AI |
| OW-10, PA-04 | Cờ tính năng của gói (hạn mức đọc được thật) |
| BM-01 | Tạo/sửa/khoá Cashier, Barista; sửa/ngừng quầy; danh sách thiết bị đã ghép |
| BM-02 | Manager bật/tắt tuỳ chọn (BE chỉ có `/barista/...`) |
| BM-03 | Báo cáo chi nhánh cho Manager (`/reports/*` chỉ OWNER) |
| BM-04 | Tra cứu đơn mọi ngày cho Manager |
| BM-05 | Đơn Cần xử lý, xác nhận thủ công |
| BM-06 | Huỷ đơn đã thanh toán, trạng thái hoàn |
| — | Màn hình gọi số: ghép, token thiết bị, event realtime (gateway hiện chỉ nhận JWT người dùng) |

**BE đang sai, web cần biết:** báo cáo không đếm đơn quầy (lọc `COMPLETED`, đơn quầy kết thúc ở `DELIVERED`); hết hạn gói thì BE chặn cả đọc (đặc tả là chỉ đọc); gói chưa có cờ tính năng.

## 8. Lộ trình

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| 1 | Dọn v7, route con theo v9 | ✅ xong |
| 2 | Nền móng: token màu, lớp API mock/thật, gói và quyền tính năng, test | ▶ tiếp theo |
| 3 | Admin nối API thật; gói 3 tier; Landing đọc giá từ API | |
| 4 | Owner menu: nhóm tuỳ chọn (OW-03), gán món | |
| 5 | Manager: tài khoản Cashier/Barista, quầy, máy in, thiết bị đã ghép, bật/tắt tuỳ chọn | |
| 6 | Owner: liên kết PayOS, nhận diện (bộ màu, tương phản, preview), gói của tôi | |
| 7 | Manager: tra cứu đơn, báo cáo chi nhánh, đơn Cần xử lý, xác nhận thủ công, huỷ đơn đã trả | |
| 8 | Màn hình gọi số trên TV | |
| 9 | Báo cáo đa chi nhánh, trợ lý AI, chế độ chỉ đọc khi hết hạn | |
