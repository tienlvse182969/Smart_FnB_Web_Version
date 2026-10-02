# PR: v9 Manager — trang đặt mật khẩu, Owner quản Manager (real)

Base: `feat/v9-menu` · Head: `feat/v9-manager`

## Nội dung (giai đoạn 5.2 và 5.3)
- **5.2** Trang công khai `/setup-password?token=` (BE `POST /auth/setup-password`), luật mật khẩu lấy từ DTO của BE; gỡ mật khẩu cứng (`DEFAULT_PASSWORD`) và `ForceChangePasswordModal` (BE không có cờ phải đổi mật khẩu); tạo/đặt lại tài khoản hiện "Đã xếp email đặt mật khẩu, hiệu lực tới …" như Admin.
- **5.3** Owner `ManagerAccounts` (OW-05) real qua `/employees`: danh sách phân trang/tìm kiếm/lọc, khoá/mở khoá, gửi lại email đặt mật khẩu, chuyển chi nhánh; mapper whitelist; mọi thao tác ghi có hộp xác nhận.
- Hợp đồng API #23–28 (việc cần BE cho giai đoạn 5).

## Cần biết khi review
- Cờ `account` mặc định **real một phần**: Manager real; **tạo Manager bị khoá** ở real (BE `POST /auth/managers` bắt buộc mật khẩu, #23); Cashier/Barista vẫn mock (BE chưa có endpoint, #24, làm ở 5.4). `account/real.ts` trỏ thẳng sang `accountMock` cho phần đó.
- Khoá tài khoản = `status: "SUSPENDED"` (BE: mọi trạng thái khác ACTIVE đều khoá và thu hồi phiên). Giả định chưa xác nhận với BE: dùng SUSPENDED thay vì INACTIVE.
- BE trả 401 chung cho token đặt mật khẩu sai/hết hạn/đã dùng: web giữ status 401, gắn mã `SETUP_TOKEN_INVALID`, và mã này không bị coi là hết phiên (không refresh, không đăng xuất, không toast toàn cục). `/setup-password` luôn dùng nhận diện nền tảng kể cả khi đang có phiên tenant.
- `email_outbox` không có tiến trình gửi (#1, CAO): email đặt mật khẩu có thể không bao giờ tới người nhận; web chỉ ghi "đã xếp email".
- Owner nhiều chuỗi: `GET /employees` lấy phạm vi từ token (mọi chuỗi được gán), web chưa lọc theo chuỗi hiện tại (demo chỉ có một chuỗi).

## Kiểm tra
- tsc, eslint, build sạch; vitest 163/163; không còn `demo1234` trong `dist`.
- `phase5.mjs` mock 31/31.
- `phase5.mjs` real (cổng 5173) 27/27, chỉ đọc: mọi request ghi bị chặn ở tầng CDP (`Fetch.failRequest`) trước khi rời trình duyệt; chỉ 3 request định trước bị chặn (khoá, gửi lại email, chuyển chi nhánh), đã so với DTO của BE; GET `/employees` sau đó không đổi. Không tải lại trang khi đang có phiên (tránh `POST /auth/refresh`).

## Bổ sung 5.3b — khớp BE `dfe8100` (BE local, không dùng Render)
- **Admin gói (PA-04):** tạo gói gửi hai cờ bắt buộc `brandingEnabled`, `multiBranchComparisonEnabled` (form đọc/ghi thật) và `maxTables = 1` (BE `@Min(1)`, ẩn khỏi form); sửa gói không gửi `maxTables`. Có hộp xác nhận trước khi lưu. Trước đó tạo/sửa gói thật đã sai từ lâu vì gửi `maxTables: 0` (chưa ai phát hiện vì cấm ghi).
- **Owner đọc 2 cờ gói** từ `GET /restaurant-chains` → `subscription.plan`, ưu tiên hơn suy từ mã gói; cờ AI và cấp vẫn suy từ mã (BE chưa có, #30). Panel dev vẫn ghi đè cấp.
- **Báo cáo:** bỏ banner "chờ BE" vì BE nay tính đơn đã trả (`PAID`) theo `paidAt`. **Không kiểm được số liệu khác 0:** DB không có đơn nào đã trả (cả 7/14/30/90 ngày đều `revenue 0, orderCount 0`); lịch sử bán do seed cũ không còn được tính nên báo cáo demo hiện 0.
- **Owner xem Cashier/Barista thật** (`GET /employees?role=CASHIER|BARISTA`), bỏ ghi chú "Dữ liệu mẫu".
- **Không làm:** Landing vẫn dùng giá mock (BE chỉ có 2 gói giá 0, chưa có BASIC/STANDARD/ADVANCED, #32).
- Tài liệu: `api-contract-plan` có bảng tình trạng #1–28 theo BE mới, #29–33, và mục "BE lệch đặc tả".

### Kiểm tra 5.3b
- tsc, eslint, build sạch; vitest 170/170.
- Mock: phase3 47/47, phase5 32/32.
- Real (cổng 5173, chặn mọi request ghi ở CDP; chỉ cho `POST /auth/login`): phase4 20/20, phase5 41/41 (có tạo/sửa gói bấm tới hết xác nhận, request định gửi khớp DTO, GET lại không đổi). phase2 31/37 và phase3 13/15 trượt do chặn ghi (phase2: `POST /auth/refresh` bị chặn nên reload mất phiên; phase3: form đăng ký gửi `POST /registration-applications`), không phải lỗi web hay BE. **Đã xử lý ở 5.5:** chặn ghi nay cho qua refresh/logout, phase3 real kiểm request đăng ký với DTO.

## Bổ sung 5.5 — quầy và máy in (BM-01)
- Màn `/manager/stations` real (`GET/POST /stations`), module `stations` riêng (quầy có vòng đời riêng, 5.6 mở rộng cùng module), cờ `VITE_API_STATIONS` mặc định real; mock cùng shape.
- Form thêm quầy: tên (báo trùng sớm), máy in NONE/WIFI/BLUETOOTH, **kiểm IPv4 (kèm cổng) và MAC ở web** vì BE chỉ kiểm không rỗng; hộp xác nhận trước khi tạo. Đổi tên, ngừng dùng, sửa máy in khoá, chú thích "Chờ BE (api-contract-plan #27)". Không giới hạn số quầy.
- Cần biết: (1) theo code, **trùng tên quầy trả 500** (BE không bắt `P2002`; chưa kiểm thật vì cấm ghi) → web báo trước, mock trả 409; (2) đặc tả 11.10 nói Bluetooth chọn trên tablet POS nhưng BE bắt buộc địa chỉ nên web tạm có ô nhập MAC; (3) quầy mới mặc định `ACTIVE`, khớp đặc tả. Chi tiết ở `api-contract-plan` #34, #35 (seed đơn đã trả để báo cáo demo có số).
- Kiểm tra: vitest 182/182; mock phase5 41/41; real phase5 47/47 (danh sách quầy rỗng hiển thị đúng; tạo quầy bấm tới hết xác nhận, `POST /stations {name, printerConnection, printerAddress}` bị chặn ở CDP và khớp `CreateStationDto`; GET lại không đổi); real phase2 40/40, phase3 15/15.
